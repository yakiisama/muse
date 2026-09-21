export interface SearchResult {
  id: string
  title: string
  artist: string
  duration: number
  thumbnail: string | null
  sourceUrl: string
}

export interface Song {
  id: string
  title: string
  artist: string
  duration: number
  filePath: string
  artworkPath: string | null
  sourceUrl: string
  addedAt: number
}

export interface DownloadProgress {
  percent: number
  eta: string
  speed: string
}

export interface DownloadProgressEvent extends DownloadProgress {
  taskId: string
}

export interface LyricsResult {
  plainLyrics: string | null
  syncedLyrics: string | null
}

export type AudioQuality = '128K' | '192K' | '320K'

export interface AppSettings {
  downloadDir: string
  audioQuality: AudioQuality
}

export interface UpdateCheckResult {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  releaseUrl: string
  /** release 里的 arm64 zip，有它才能应用内更新；null 时只能去网页下载 */
  zipUrl: string | null
  zipSize: number
}

export interface UpdateProgressEvent {
  phase: 'downloading' | 'installing'
  percent: number
}

export interface YtDlpUpdateCheckResult {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  downloadUrl: string
}
