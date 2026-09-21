import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { randomUUID } from 'node:crypto'
import {
  getAudioQuality,
  getDownloadDir,
  getLyrics,
  insertSong,
  listSongs,
  removeSong,
  saveLyrics,
  setAudioQuality,
  setDownloadDir,
  type Song
} from './db'
import type { AudioQuality } from '@shared/types'
import {
  buildOutputPath,
  DownloadCanceledError,
  downloadTrack,
  resolveStreamUrl,
  searchYoutube,
  type SearchResult
} from './ytdlp'
import { fetchLyrics } from './lyrics'
import { extractArtwork } from './artwork'
import { downloadYtDlpUpdate, getLatestYtDlp, getYtDlpVersion } from './ytdlpUpdate'
import { checkForUpdate, installUpdate } from './appUpdate'

const downloadCancelers = new Map<string, () => void>()

export function registerIpcHandlers(win: BrowserWindow): void {
  ipcMain.handle('search:query', async (_event, query: string) => {
    if (!query.trim()) return []
    return searchYoutube(query)
  })

  ipcMain.handle('stream:resolve', async (_event, sourceUrl: string) => {
    return { url: await resolveStreamUrl(sourceUrl) }
  })

  ipcMain.handle('library:list', () => listSongs())

  ipcMain.handle('library:remove', (_event, id: string) => {
    removeSong(id)
  })

  ipcMain.handle('lyrics:get', async (_event, songId: string, title: string, artist: string) => {
    const cached = getLyrics(songId)
    if (cached) return { plainLyrics: cached.plainLyrics, syncedLyrics: cached.syncedLyrics }

    const result = await fetchLyrics(title, artist)
    saveLyrics({
      songId,
      plainLyrics: result?.plainLyrics ?? null,
      syncedLyrics: result?.syncedLyrics ?? null,
      fetchedAt: Date.now()
    })
    return result
  })

  ipcMain.handle('settings:get', () => ({
    downloadDir: getDownloadDir(),
    audioQuality: getAudioQuality()
  }))

  ipcMain.handle('settings:setAudioQuality', (_event, quality: AudioQuality) => {
    setAudioQuality(quality)
    return { downloadDir: getDownloadDir(), audioQuality: quality }
  })

  ipcMain.handle('settings:chooseDownloadDir', async () => {
    const res = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: getDownloadDir()
    })
    if (!res.canceled && res.filePaths.length > 0) setDownloadDir(res.filePaths[0])
    return { downloadDir: getDownloadDir(), audioQuality: getAudioQuality() }
  })

  ipcMain.handle('settings:openDownloadDir', () => {
    shell.openPath(getDownloadDir())
  })

  ipcMain.handle('app:getVersion', () => app.getVersion())

  ipcMain.handle('app:openExternal', (_event, url: string) => {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('github.com')) {
      throw new Error('不支持打开该链接')
    }
    return shell.openExternal(url)
  })

  ipcMain.handle('update:check', () => checkForUpdate())

  ipcMain.handle('update:install', (_event, zipUrl: string) =>
    installUpdate(zipUrl, (e) => {
      if (!win.isDestroyed()) win.webContents.send('update:progress', e)
    })
  )

  ipcMain.handle('download:start', (_event, result: SearchResult) => {
    const taskId = randomUUID()
    const outputPath = buildOutputPath(getDownloadDir(), result.title, result.artist, result.id)
    const quality = getAudioQuality()

    const { promise, cancel } = downloadTrack(
      result.sourceUrl,
      result.id,
      outputPath,
      quality,
      (progress) => {
        win.webContents.send('download:progress', { taskId, ...progress })
      }
    )
    downloadCancelers.set(taskId, cancel)

    promise
      .then((filePath) => {
        const artworkPath = extractArtwork(filePath, result.id)
        const song: Song = {
          id: result.id,
          title: result.title,
          artist: result.artist,
          duration: result.duration,
          filePath,
          artworkPath,
          sourceUrl: result.sourceUrl,
          addedAt: Date.now()
        }
        insertSong(song)
        win.webContents.send('download:done', { taskId, song })
      })
      .catch((err: Error) => {
        if (err instanceof DownloadCanceledError) {
          win.webContents.send('download:canceled', { taskId })
        } else {
          win.webContents.send('download:error', { taskId, message: err.message })
        }
      })
      .finally(() => {
        downloadCancelers.delete(taskId)
      })

    return { taskId }
  })

  ipcMain.handle('download:cancel', (_event, taskId: string) => {
    downloadCancelers.get(taskId)?.()
  })

  ipcMain.handle('ytdlp:getVersion', () => getYtDlpVersion())

  ipcMain.handle('ytdlp:checkUpdate', async () => {
    const currentVersion = await getYtDlpVersion().catch(() => '')
    const latest = await getLatestYtDlp()
    return {
      currentVersion,
      latestVersion: latest.version,
      hasUpdate: currentVersion !== latest.version,
      downloadUrl: latest.downloadUrl
    }
  })

  ipcMain.handle('ytdlp:update', async (_event, downloadUrl: string) => {
    await downloadYtDlpUpdate(downloadUrl)
    return { version: await getYtDlpVersion() }
  })
}
