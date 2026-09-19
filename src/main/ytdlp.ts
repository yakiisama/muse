import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { getFfmpegPath, getYtDlpPath } from './paths'
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

function runYtDlpJsonLines(args: string[]): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const proc = spawn(getYtDlpPath(), args)
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
  const raw = await runYtDlpJsonLines([
    '--no-warnings',
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
export function resolveStreamUrl(sourceUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(getYtDlpPath(), ['--no-warnings', '-f', 'bestaudio/best', '-g', sourceUrl])
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

export function downloadTrack(
  sourceUrl: string,
  videoId: string,
  outputPath: string,
  quality: AudioQuality,
  onProgress: (progress: DownloadProgress) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(getYtDlpPath(), [
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
    ])

    let filePath: string | null = null
    let buffer = ''
    let stderr = ''

    proc.stdout.on('data', (chunk: Buffer) => {
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
    proc.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()))
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code !== 0 || !filePath) {
        reject(new Error(stderr.trim() || `下载失败 (yt-dlp exit ${code})，videoId=${videoId}`))
        return
      }
      resolve(filePath)
    })
  })
}
