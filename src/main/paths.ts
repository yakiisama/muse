import { app } from 'electron'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import ffmpegStatic from 'ffmpeg-static'

const isDev = !app.isPackaged

/** 「检查更新」在设置里下载的新版 yt-dlp 存放位置，优先于打包内置的版本 */
export function getYtDlpOverridePath(): string {
  return join(app.getPath('userData'), 'bin', 'yt-dlp')
}

/**
 * yt-dlp 的 universal2 macOS 二进制路径。YouTube 经常改版，静态打包的 yt-dlp 过几个月
 * 可能会失效，所以设置里可以下载新版本存到 userData（打包的 .app 本身不可写），
 * 存在就优先用它；没有就回退到打包内置的版本（打包内 resources/bin/mac，开发态回退到仓库内同一份文件）。
 */
export function getYtDlpPath(): string {
  const override = getYtDlpOverridePath()
  if (existsSync(override)) return override
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
