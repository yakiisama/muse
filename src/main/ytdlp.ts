import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { getFfmpegPath } from './paths'
import { spawnYtDlp } from './ytdlpRuntime'
import { cleanTrackTitle } from './titleClean'
import type { AudioQuality, DownloadProgress, SearchResult } from '@shared/types'

export type { SearchResult, DownloadProgress }

// 文件系统保留字符 + yt-dlp 输出模板里的 % 字段前缀，全部替换掉，避免路径出错或被当成模板解析
function sanitizeFilenamePart(s: string): string {
  return s
    .replace(/[/\\:*?"<>|%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

function uniqueOutputPath(dir: string, baseName: string): string {
  let candidate = join(dir, `${baseName}.mp3`)
  let n = 2
  while (existsSync(candidate)) {
    candidate = join(dir, `${baseName} (${n}).mp3`)
    n += 1
  }
  return candidate
}

/** "歌曲名-歌手" 格式的下载文件名；标题/歌手都拿不到有效内容时回退到 videoId，保证不会写出空文件名 */
export function buildOutputPath(
  dir: string,
  rawTitle: string,
  artist: string,
  videoId: string
): string {
  mkdirSync(dir, { recursive: true })
  const title = sanitizeFilenamePart(cleanTrackTitle(rawTitle, artist)) || sanitizeFilenamePart(rawTitle)
  const cleanArtist = sanitizeFilenamePart(artist)
  const base = [title, cleanArtist].filter(Boolean).join('-') || videoId
  return uniqueOutputPath(dir, base)
}

async function runYtDlpJsonLines(args: string[]): Promise<unknown[]> {
  const proc = await spawnYtDlp(args)
  return new Promise((resolve, reject) => {
    let buffer = ''
    const results: unknown[] = []
    proc.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          results.push(JSON.parse(line))
        } catch {
          // 非 JSON 行（警告/日志），忽略
        }
      }
    })
    let stderr = ''
    proc.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()))
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code !== 0 && results.length === 0) {
        reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`))
        return
      }
      resolve(results)
    })
  })
}

export async function searchYoutube(query: string, limit = 20): Promise<SearchResult[]> {
  // 搜索只需要 innertube API 的结果，跳过 youtube.com 首页那次请求（省 1 秒多），结果数不受影响
  const raw = await runYtDlpJsonLines([
    '--no-warnings',
    '--extractor-args',
    'youtubetab:skip=webpage',
    '--dump-json',
    '--flat-playlist',
    `ytsearch${limit}:${query}`
  ])

  return (raw as Record<string, unknown>[])
    .filter((entry) => {
      // YouTube 搜索结果偶尔会混入频道/播放列表卡片而不是视频（比如只搜歌手名时置顶的
      // 频道主页），它们的 id 不是标准 11 位视频 ID，点了会因为不是有效视频链接而报错。
      const id = entry?.id
      return typeof id === 'string' && id.length === 11 && entry.ie_key !== 'YoutubeTab'
    })
    .map((entry) => {
      const id = String(entry.id)
      const thumbnails = Array.isArray(entry.thumbnails)
        ? (entry.thumbnails as { url: string }[])
        : []
      const thumbnail =
        (entry.thumbnail as string | undefined) ??
        thumbnails[thumbnails.length - 1]?.url ??
        null
      return {
        id,
        title: String(entry.title ?? '未知曲目'),
        artist: String(entry.uploader ?? entry.channel ?? '未知艺术家'),
        duration: Number(entry.duration ?? 0),
        thumbnail,
        sourceUrl: `https://www.youtube.com/watch?v=${id}`
      }
    })
}

/** 试听：只解析出可直接播放的音频直链，不落盘，供搜索结果"试听"按钮使用 */
export async function resolveStreamUrl(sourceUrl: string): Promise<string> {
  // 试听只要一条音频直链，跳过 HLS/DASH 清单的下载能省 1 秒多，拿到的仍是同一个 bestaudio 格式
  const proc = await spawnYtDlp([
    '--no-warnings',
    '--extractor-args',
    'youtube:skip=hls,dash',
    '-f',
    'bestaudio/best',
    '-g',
    sourceUrl
  ])
  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()))
    proc.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()))
    proc.on('error', reject)
    proc.on('close', (code) => {
      const url = stdout.trim().split('\n')[0]
      if (code !== 0 || !url) {
        reject(new Error(stderr.trim() || `无法解析播放地址 (yt-dlp exit ${code})`))
        return
      }
      resolve(url)
    })
  })
}

export class DownloadCanceledError extends Error {
  constructor() {
    super('下载已取消')
    this.name = 'DownloadCanceledError'
  }
}

export interface DownloadHandle {
  promise: Promise<string>
  cancel: () => void
}

export function downloadTrack(
  sourceUrl: string,
  videoId: string,
  outputPath: string,
  quality: AudioQuality,
  onProgress: (progress: DownloadProgress) => void
): DownloadHandle {
  let canceled = false
  let proc: ChildProcessWithoutNullStreams | null = null
  const args = [
    '--no-warnings',
    '-f',
    'bestaudio/best',
    '-x',
    '--audio-format',
    'mp3',
    '--audio-quality',
    quality,
    '--embed-thumbnail',
    '--add-metadata',
    '--ffmpeg-location',
    getFfmpegPath(),
    '--progress',
    '--newline',
    '--progress-template',
    'download:{"percent":%(progress._percent)f,"eta":"%(progress._eta_str)s","speed":"%(progress._speed_str)s"}',
    '--print',
    'after_move:FILEPATH::%(filepath)s',
    '-o',
    outputPath,
    sourceUrl
  ]

  const promise = (async (): Promise<string> => {
    const p = await spawnYtDlp(args)
    // 等预热的这段时间里用户可能已经点了取消
    if (canceled) {
      p.kill()
      throw new DownloadCanceledError()
    }
    proc = p
    return new Promise<string>((resolve, reject) => {
      let filePath: string | null = null
      let buffer = ''
      let stderr = ''

      p.stdout.on('data', (chunk: Buffer) => {
        buffer += chunk.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          if (trimmed.startsWith('FILEPATH::')) {
            filePath = trimmed.slice('FILEPATH::'.length)
            continue
          }
          try {
            const progress = JSON.parse(trimmed) as DownloadProgress
            if (typeof progress.percent === 'number') onProgress(progress)
          } catch {
            // 忽略非进度/非文件路径的日志行
          }
        }
      })
      p.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()))
      p.on('error', reject)
      p.on('close', (code) => {
        if (canceled) {
          reject(new DownloadCanceledError())
          return
        }
        if (code !== 0 || !filePath) {
          reject(new Error(stderr.trim() || `下载失败 (yt-dlp exit ${code})，videoId=${videoId}`))
          return
        }
        resolve(filePath)
      })
    })
  })()

  return {
    promise,
    cancel: () => {
      canceled = true
      proc?.kill()
    }
  }
}
