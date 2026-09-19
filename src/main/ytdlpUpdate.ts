import { spawn } from 'node:child_process'
import { chmodSync, mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { net } from 'electron'
import { getYtDlpOverridePath, getYtDlpPath } from './paths'

export function getYtDlpVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(getYtDlpPath(), ['--version'])
    let stdout = ''
    proc.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()))
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code !== 0 || !stdout.trim()) {
        reject(new Error('无法读取 yt-dlp 版本'))
        return
      }
      resolve(stdout.trim())
    })
  })
}

export interface LatestYtDlp {
  version: string
  downloadUrl: string
}

/** yt-dlp 每个 release 都会附带一个 macOS 独立可执行文件 yt-dlp_macos，不需要用户本机装 Python */
export async function getLatestYtDlp(): Promise<LatestYtDlp> {
  const res = await net.fetch('https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest')
  if (!res.ok) throw new Error(`GitHub 返回 ${res.status}`)
  const data = (await res.json()) as {
    tag_name?: string
    assets?: { name: string; browser_download_url: string }[]
  }
  const version = data.tag_name ?? ''
  const asset = data.assets?.find((a) => a.name === 'yt-dlp_macos')
  if (!version || !asset) throw new Error('未找到 macOS 版本的 yt-dlp 发布文件')
  return { version, downloadUrl: asset.browser_download_url }
}

export async function downloadYtDlpUpdate(downloadUrl: string): Promise<void> {
  const res = await net.fetch(downloadUrl)
  if (!res.ok) throw new Error(`下载 yt-dlp 失败 (${res.status})`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const target = getYtDlpOverridePath()
  mkdirSync(dirname(target), { recursive: true })
  const tmp = `${target}.download`
  writeFileSync(tmp, buffer)
  chmodSync(tmp, 0o755)
  renameSync(tmp, target)
}
