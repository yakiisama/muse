import {
  ListMusic,
  Maximize2,
  Music2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2
} from 'lucide-react'
import { usePlayerStore } from '../store/player'
import { formatTime } from '../lib/format'

interface Props {
  lyricsOpen: boolean
  onToggleLyrics: () => void
  onOpenImmersive: () => void
  seekTo: (value: number) => void
  seekBy: (delta: number) => void
}

export default function PlayerBar({
  lyricsOpen,
  onToggleLyrics,
  onOpenImmersive,
  seekTo,
  seekBy
}: Props): React.JSX.Element {
  const nowPlaying = usePlayerStore((s) => s.nowPlaying)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const volume = usePlayerStore((s) => s.volume)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const next = usePlayerStore((s) => s.next)
  const prev = usePlayerStore((s) => s.prev)

  return (
    <div className="glass relative mx-3 mb-3 flex h-20 shrink-0 items-center gap-4 rounded-[26px] px-5">
      <div className="flex w-52 min-w-0 items-center gap-3">
        <button
          onClick={onOpenImmersive}
          disabled={!nowPlaying}
          className="group relative shrink-0 disabled:cursor-default"
          title={nowPlaying ? '进入沉浸式播放' : undefined}
        >
          {nowPlaying?.artworkUrl ? (
            <img
              src={nowPlaying.artworkUrl}
              alt=""
              className="size-12 rounded-xl object-cover shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-xl bg-ink/10">
              <Music2 className="size-5 text-ink/30" />
            </div>
          )}
          {nowPlaying && (
            <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Maximize2 className="size-4 text-white" />
            </span>
          )}
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm text-ink/90">{nowPlaying?.title ?? '未在播放'}</p>
          <p className="truncate text-xs text-ink/40">
            {nowPlaying ? (nowPlaying.isLibrary ? nowPlaying.artist : `${nowPlaying.artist} · 试听`) : ''}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center gap-1.5">
        <div className="flex items-center gap-4">
          <button onClick={prev} className="text-ink/50 hover:text-ink" disabled={!nowPlaying}>
            <SkipBack className="size-4" />
          </button>
          <button onClick={() => seekBy(-10)} className="text-ink/50 hover:text-ink" disabled={!nowPlaying}>
            <RotateCcw className="size-4" />
          </button>
          <button
            onClick={togglePlay}
            disabled={!nowPlaying}
            className="flex size-9 items-center justify-center rounded-full bg-gradient-to-b from-accent to-accent-soft text-white shadow-[0_4px_18px_-2px_rgba(218,119,86,0.6)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-30 disabled:shadow-none"
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 translate-x-[1px]" />}
          </button>
          <button onClick={() => seekBy(10)} className="text-ink/50 hover:text-ink" disabled={!nowPlaying}>
            <RotateCw className="size-4" />
          </button>
          <button onClick={next} className="text-ink/50 hover:text-ink" disabled={!nowPlaying}>
            <SkipForward className="size-4" />
          </button>
        </div>
        <div className="flex w-full max-w-md items-center gap-2">
          <span className="w-9 text-right text-[11px] tabular-nums text-ink/30">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={Number.isFinite(duration) && duration > 0 ? duration : 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => seekTo(Number(e.target.value))}
            disabled={!nowPlaying}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-ink/15 accent-[#da7756]"
          />
          <span className="w-9 text-[11px] tabular-nums text-ink/30">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      <div className="flex w-40 items-center justify-end gap-3">
        <button
          onClick={onToggleLyrics}
          className={`rounded-full p-1.5 transition-colors ${lyricsOpen ? 'glass-pill text-accent-soft' : 'text-ink/50 hover:bg-ink/8 hover:text-ink'}`}
        >
          <ListMusic className="size-4" />
        </button>
        <Volume2 className="size-4 text-ink/40" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-ink/15 accent-[#da7756]"
        />
      </div>
    </div>
  )
}
