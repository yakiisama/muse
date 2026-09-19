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

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0
  const progress = safeDuration ? (Math.min(currentTime, safeDuration) / safeDuration) * 100 : 0
  const iconBtn = 'text-ink/55 transition-colors hover:text-ink disabled:hover:text-ink/55'

  return (
    <div className="panel relative flex h-20 shrink-0 items-center gap-4 border-t border-ink/10 px-4">
      <div className="flex w-56 min-w-0 items-center gap-3">
        <button
          onClick={onOpenImmersive}
          disabled={!nowPlaying}
          className="group relative shrink-0"
          title={nowPlaying ? '进入沉浸式播放' : undefined}
        >
          {nowPlaying?.artworkUrl ? (
            <img
              src={nowPlaying.artworkUrl}
              alt=""
              className="size-12 rounded-md object-cover ring-1 ring-ink/10"
            />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-md bg-ink/6 ring-1 ring-ink/8">
              <Music2 className="size-5 text-ink/30" />
            </div>
          )}
          {nowPlaying && (
            <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
              <Maximize2 className="size-4 text-white" />
            </span>
          )}
        </button>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-ink/90">{nowPlaying?.title ?? '未在播放'}</p>
          <p className="truncate text-xs text-ink/45">
            {nowPlaying ? (nowPlaying.isLibrary ? nowPlaying.artist : `${nowPlaying.artist}（试听）`) : ''}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center gap-1">
        <div className="flex items-center gap-4">
          <button onClick={prev} aria-label="上一首" className={iconBtn} disabled={!nowPlaying}>
            <SkipBack className="size-4" />
          </button>
          <button onClick={() => seekBy(-10)} aria-label="后退 10 秒" className={iconBtn} disabled={!nowPlaying}>
            <RotateCcw className="size-4" />
          </button>
          <button
            onClick={togglePlay}
            disabled={!nowPlaying}
            aria-label={isPlaying ? '暂停' : '播放'}
            className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-fg transition-[transform,background-color] duration-300 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 translate-x-[1px]" />}
          </button>
          <button onClick={() => seekBy(10)} aria-label="前进 10 秒" className={iconBtn} disabled={!nowPlaying}>
            <RotateCw className="size-4" />
          </button>
          <button onClick={next} aria-label="下一首" className={iconBtn} disabled={!nowPlaying}>
            <SkipForward className="size-4" />
          </button>
        </div>
        <div className="flex w-full max-w-md items-center gap-2">
          <span className="w-9 text-right text-[11px] tabular-nums text-ink/40">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            aria-label="播放进度"
            min={0}
            max={safeDuration}
            step={0.1}
            value={Math.min(currentTime, safeDuration)}
            onChange={(e) => seekTo(Number(e.target.value))}
            disabled={!nowPlaying}
            style={{ '--p': `${progress}%` } as React.CSSProperties}
            className="flex-1 cursor-pointer"
          />
          <span className="w-9 text-[11px] tabular-nums text-ink/40">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex w-44 items-center justify-end gap-3">
        <button
          onClick={onToggleLyrics}
          aria-label="歌词"
          aria-pressed={lyricsOpen}
          className={`rounded-md p-1.5 transition-colors ${
            lyricsOpen ? 'bg-ink/8 text-accent' : 'text-ink/55 hover:bg-ink/8 hover:text-ink'
          }`}
        >
          <ListMusic className="size-4" />
        </button>
        <Volume2 className="size-4 text-ink/45" />
        <input
          type="range"
          aria-label="音量"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          style={{ '--p': `${volume * 100}%` } as React.CSSProperties}
          className="w-20 cursor-pointer"
        />
      </div>
    </div>
  )
}
