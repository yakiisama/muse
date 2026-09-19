import { create } from 'zustand'
import type { SearchResult, Song } from '@shared/types'
import { toMediaUrl } from '../lib/mediaUrl'

export interface DownloadTask {
  taskId: string
  result: SearchResult
  title: string
  artist: string
  thumbnail: string | null
  percent: number
  eta: string
  speed: string
  status: 'downloading' | 'done' | 'error' | 'canceled'
  message?: string
}

export interface NowPlaying {
  id: string
  title: string
  artist: string
  duration: number
  artworkUrl: string | null
  audioSrc: string
  isLibrary: boolean
}

function fromSong(song: Song): NowPlaying {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    duration: song.duration,
    artworkUrl: song.artworkPath ? toMediaUrl(song.artworkPath) : null,
    audioSrc: toMediaUrl(song.filePath),
    isLibrary: true
  }
}

interface PlayerState {
  library: Song[]
  downloads: DownloadTask[]
  queue: Song[]
  currentIndex: number
  nowPlaying: NowPlaying | null
  previewLoadingId: string | null
  previewError: { id: string; message: string } | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number

  loadLibrary: () => Promise<void>
  startDownload: (result: SearchResult) => Promise<void>
  retryDownload: (taskId: string) => Promise<void>
  removeDownloadTask: (taskId: string) => void
  clearFinishedDownloads: () => void
  updateDownloadProgress: (taskId: string, percent: number, eta: string, speed: string) => void
  completeDownload: (taskId: string, song: Song) => void
  failDownload: (taskId: string, message: string) => void
  cancelDownloadTask: (taskId: string) => void

  playSong: (song: Song, queue?: Song[]) => void
  playPreview: (result: SearchResult) => Promise<void>
  togglePlay: () => void
  setPlaying: (playing: boolean) => void
  setProgress: (currentTime: number, duration: number) => void
  next: () => void
  prev: () => void
  setVolume: (v: number) => void
  removeFromLibrary: (id: string) => Promise<void>
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  library: [],
  downloads: [],
  queue: [],
  currentIndex: -1,
  nowPlaying: null,
  previewLoadingId: null,
  previewError: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,

  loadLibrary: async () => {
    const library = await window.api.listLibrary()
    set({ library })
  },

  startDownload: async (result) => {
    const { taskId } = await window.api.startDownload(result)
    set((s) => ({
      downloads: [
        {
          taskId,
          result,
          title: result.title,
          artist: result.artist,
          thumbnail: result.thumbnail,
          percent: 0,
          eta: '',
          speed: '',
          status: 'downloading'
        },
        ...s.downloads
      ]
    }))
  },

  retryDownload: async (taskId) => {
    const task = get().downloads.find((d) => d.taskId === taskId)
    if (!task) return
    set((s) => ({ downloads: s.downloads.filter((d) => d.taskId !== taskId) }))
    await get().startDownload(task.result)
  },

  removeDownloadTask: (taskId) =>
    set((s) => ({ downloads: s.downloads.filter((d) => d.taskId !== taskId) })),

  clearFinishedDownloads: () =>
    set((s) => ({ downloads: s.downloads.filter((d) => d.status === 'downloading') })),

  updateDownloadProgress: (taskId, percent, eta, speed) =>
    set((s) => ({
      downloads: s.downloads.map((d) => (d.taskId === taskId ? { ...d, percent, eta, speed } : d))
    })),

  completeDownload: (taskId, song) =>
    set((s) => ({
      downloads: s.downloads.map((d) =>
        d.taskId === taskId ? { ...d, status: 'done', percent: 100 } : d
      ),
      library: [song, ...s.library.filter((x) => x.id !== song.id)]
    })),

  failDownload: (taskId, message) =>
    set((s) => ({
      downloads: s.downloads.map((d) =>
        d.taskId === taskId ? { ...d, status: 'error', message } : d
      )
    })),

  cancelDownloadTask: (taskId) =>
    set((s) => ({
      downloads: s.downloads.map((d) => (d.taskId === taskId ? { ...d, status: 'canceled' } : d))
    })),

  playSong: (song, queue) =>
    set((s) => {
      const nextQueue = queue ?? s.library
      return {
        nowPlaying: fromSong(song),
        queue: nextQueue,
        currentIndex: nextQueue.findIndex((x) => x.id === song.id),
        isPlaying: true,
        currentTime: 0
      }
    }),

  playPreview: async (result) => {
    set({ previewLoadingId: result.id, previewError: null })
    try {
      const { url } = await window.api.resolveStream(result.sourceUrl)
      set({
        nowPlaying: {
          id: result.id,
          title: result.title,
          artist: result.artist,
          duration: result.duration,
          artworkUrl: result.thumbnail,
          audioSrc: url,
          isLibrary: false
        },
        queue: [],
        currentIndex: -1,
        isPlaying: true,
        currentTime: 0
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('试听地址解析失败', err)
      set({ previewError: { id: result.id, message } })
    } finally {
      set({ previewLoadingId: null })
    }
  },

  togglePlay: () => set((s) => ({ isPlaying: s.nowPlaying ? !s.isPlaying : false })),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setProgress: (currentTime, duration) => set({ currentTime, duration }),

  next: () => {
    const { queue, currentIndex } = get()
    if (queue.length === 0) return
    const nextIndex = (currentIndex + 1) % queue.length
    set({
      nowPlaying: fromSong(queue[nextIndex]),
      currentIndex: nextIndex,
      isPlaying: true,
      currentTime: 0
    })
  },
  prev: () => {
    const { queue, currentIndex } = get()
    if (queue.length === 0) return
    const prevIndex = (currentIndex - 1 + queue.length) % queue.length
    set({
      nowPlaying: fromSong(queue[prevIndex]),
      currentIndex: prevIndex,
      isPlaying: true,
      currentTime: 0
    })
  },
  setVolume: (v) => set({ volume: v }),

  removeFromLibrary: async (id) => {
    await window.api.removeSong(id)
    set((s) => ({
      library: s.library.filter((x) => x.id !== id),
      nowPlaying: s.nowPlaying?.id === id && s.nowPlaying.isLibrary ? null : s.nowPlaying
    }))
  }
}))
