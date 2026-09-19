import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { getDbPath, getDefaultDownloadDir } from './paths'
import type { AudioQuality, Song } from '@shared/types'

const DEFAULT_AUDIO_QUALITY: AudioQuality = '192K'

export type { Song }

export interface LyricsRow {
  songId: string
  plainLyrics: string | null
  syncedLyrics: string | null
  fetchedAt: number
}

interface StoreShape {
  songs: Song[]
  lyrics: Record<string, LyricsRow>
  settings: { downloadDir: string | null; audioQuality: AudioQuality }
}

function emptyStore(): StoreShape {
  return { songs: [], lyrics: {}, settings: { downloadDir: null, audioQuality: DEFAULT_AUDIO_QUALITY } }
}

let store: StoreShape | null = null

function load(): StoreShape {
  if (store) return store
  const path = getDbPath()
  if (existsSync(path)) {
    try {
      store = JSON.parse(readFileSync(path, 'utf-8')) as StoreShape
    } catch {
      store = emptyStore()
    }
  } else {
    store = emptyStore()
  }
  if (!store.settings) store.settings = { downloadDir: null, audioQuality: DEFAULT_AUDIO_QUALITY }
  if (!store.settings.audioQuality) store.settings.audioQuality = DEFAULT_AUDIO_QUALITY
  return store
}

function persist(): void {
  if (!store) return
  const path = getDbPath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(store, null, 2))
}

export function insertSong(song: Song): void {
  const s = load()
  s.songs = [song, ...s.songs.filter((x) => x.id !== song.id)]
  persist()
}

export function listSongs(): Song[] {
  return [...load().songs].sort((a, b) => b.addedAt - a.addedAt)
}

export function removeSong(id: string): void {
  const s = load()
  s.songs = s.songs.filter((x) => x.id !== id)
  persist()
}

export function getLyrics(songId: string): LyricsRow | undefined {
  return load().lyrics[songId]
}

export function saveLyrics(row: LyricsRow): void {
  const s = load()
  s.lyrics[row.songId] = row
  persist()
}

export function getDownloadDir(): string {
  return load().settings.downloadDir ?? getDefaultDownloadDir()
}

export function setDownloadDir(dir: string): void {
  const s = load()
  s.settings.downloadDir = dir
  persist()
}

export function getAudioQuality(): AudioQuality {
  return load().settings.audioQuality
}

export function setAudioQuality(quality: AudioQuality): void {
  const s = load()
  s.settings.audioQuality = quality
  persist()
}
