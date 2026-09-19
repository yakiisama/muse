import { useEffect, useState } from 'react'
import { activeLyricIndex, parseLrc, type LyricLine } from '../lib/lrc'
import type { NowPlaying } from '../store/player'

export interface LyricsState {
  lines: LyricLine[]
  plain: string | null
  loading: boolean
  activeIndex: number
}

export function useLyrics(nowPlaying: NowPlaying | null, currentTime: number): LyricsState {
  const [lines, setLines] = useState<LyricLine[]>([])
  const [plain, setPlain] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!nowPlaying) {
      setLines([])
      setPlain(null)
      return
    }
    let cancelled = false
    setLoading(true)
    window.api
      .getLyrics(nowPlaying.id, nowPlaying.title, nowPlaying.artist)
      .then((res) => {
        if (cancelled) return
        if (res?.syncedLyrics) {
          setLines(parseLrc(res.syncedLyrics))
          setPlain(null)
        } else if (res?.plainLyrics) {
          setLines([])
          setPlain(res.plainLyrics)
        } else {
          setLines([])
          setPlain(null)
        }
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [nowPlaying?.id])

  return { lines, plain, loading, activeIndex: activeLyricIndex(lines, currentTime) }
}
