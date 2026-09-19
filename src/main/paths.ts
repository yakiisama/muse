import { app } from 'electron'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import ffmpegStatic from 'ffmpeg-static'

const isDev = !app.isPackaged

/** yt-dlp 的 universal2 macOS 二进制路径（打包内 resources/bin/mac，开发态回退到仓库内同一份文件） */
export function getYtDlpPath(): string {
  const packaged = join(process.resourcesPath, 'bin', 'mac', 'yt-dlp')
  if (!isDev && existsSync(packaged)) return packaged
  return join(app.getAppPath(), 'resources', 'bin', 'mac', 'yt-dlp')
}

/** ffmpeg 可执行文件路径，来自 ffmpeg-static，打包时通过 extraResources 一并带上 */
export function getFfmpegPath(): string {
  const packaged = join(process.resourcesPath, 'bin', 'mac', 'ffmpeg')
  if (!isDev && existsSync(packaged)) return packaged
  return (ffmpegStatic as unknown as string) ?? 'ffmpeg'
}

/** 默认下载目录，用户可在设置里改到别的位置（见 db.ts 的 settings.downloadDir） */
export function getDefaultDownloadDir(): string {
  return join(app.getPath('music'), 'Muse')
}

export function getArtworkDir(): string {
  return join(app.getPath('userData'), 'artwork')
}

export function getDbPath(): string {
  return join(app.getPath('userData'), 'library.json')
}
