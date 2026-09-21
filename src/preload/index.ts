import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppSettings,
  AudioQuality,
  DownloadProgressEvent,
  LyricsResult,
  SearchResult,
  Song,
  UpdateCheckResult,
  UpdateProgressEvent,
  YtDlpUpdateCheckResult
} from '@shared/types'

const api = {
  search: (query: string): Promise<SearchResult[]> => ipcRenderer.invoke('search:query', query),

  resolveStream: (sourceUrl: string): Promise<{ url: string }> =>
    ipcRenderer.invoke('stream:resolve', sourceUrl),

  startDownload: (result: SearchResult): Promise<{ taskId: string }> =>
    ipcRenderer.invoke('download:start', result),

  onDownloadProgress: (cb: (e: DownloadProgressEvent) => void) => {
    const listener = (_: unknown, payload: DownloadProgressEvent): void => cb(payload)
    ipcRenderer.on('download:progress', listener)
    return () => ipcRenderer.removeListener('download:progress', listener)
  },
  onDownloadDone: (cb: (e: { taskId: string; song: Song }) => void) => {
    const listener = (_: unknown, payload: { taskId: string; song: Song }): void => cb(payload)
    ipcRenderer.on('download:done', listener)
    return () => ipcRenderer.removeListener('download:done', listener)
  },
  onDownloadError: (cb: (e: { taskId: string; message: string }) => void) => {
    const listener = (_: unknown, payload: { taskId: string; message: string }): void =>
      cb(payload)
    ipcRenderer.on('download:error', listener)
    return () => ipcRenderer.removeListener('download:error', listener)
  },
  onDownloadCanceled: (cb: (e: { taskId: string }) => void) => {
    const listener = (_: unknown, payload: { taskId: string }): void => cb(payload)
    ipcRenderer.on('download:canceled', listener)
    return () => ipcRenderer.removeListener('download:canceled', listener)
  },
  cancelDownload: (taskId: string): Promise<void> => ipcRenderer.invoke('download:cancel', taskId),

  listLibrary: (): Promise<Song[]> => ipcRenderer.invoke('library:list'),
  removeSong: (id: string): Promise<void> => ipcRenderer.invoke('library:remove', id),

  getLyrics: (songId: string, title: string, artist: string): Promise<LyricsResult | null> =>
    ipcRenderer.invoke('lyrics:get', songId, title, artist),

  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  chooseDownloadDir: (): Promise<AppSettings> => ipcRenderer.invoke('settings:chooseDownloadDir'),
  openDownloadDir: (): Promise<void> => ipcRenderer.invoke('settings:openDownloadDir'),
  setAudioQuality: (quality: AudioQuality): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:setAudioQuality', quality),

  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('app:openExternal', url),
  checkForUpdates: (): Promise<UpdateCheckResult> => ipcRenderer.invoke('update:check'),
  installUpdate: (zipUrl: string): Promise<void> => ipcRenderer.invoke('update:install', zipUrl),
  onUpdateProgress: (cb: (e: UpdateProgressEvent) => void) => {
    const listener = (_: unknown, payload: UpdateProgressEvent): void => cb(payload)
    ipcRenderer.on('update:progress', listener)
    return () => ipcRenderer.removeListener('update:progress', listener)
  },

  getYtDlpVersion: (): Promise<string> => ipcRenderer.invoke('ytdlp:getVersion'),
  onYtDlpWarmup: (cb: (e: { state: 'start' | 'done' }) => void) => {
    const listener = (_: unknown, payload: { state: 'start' | 'done' }): void => cb(payload)
    ipcRenderer.on('ytdlp:warmup', listener)
    return () => ipcRenderer.removeListener('ytdlp:warmup', listener)
  },
  checkYtDlpUpdate: (): Promise<YtDlpUpdateCheckResult> => ipcRenderer.invoke('ytdlp:checkUpdate'),
  updateYtDlp: (downloadUrl: string): Promise<{ version: string }> =>
    ipcRenderer.invoke('ytdlp:update', downloadUrl)
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
