import { useEffect, useRef } from 'react'
import {
  Music2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  X
} from 'lucide-react'
import { usePlayerStore } from '../store/player'
import { useLyrics } from '../hooks/useLyrics'
import { formatTime } from '../lib/format'

interface Props {
  onClose: () => void
  seekTo: (value: number) => void
  seekBy: (delta: number) => void
}

export default function ImmersivePlayer({ onClose, seekTo, seekBy }: Props): React.JSX.Element | null {
  const nowPlaying = usePlayerStore((s) => s.nowPlaying)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const volume = usePlayerStore((s) => s.volume)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const next = usePlayerStore((s) => s.next)
  const prev = usePlayerStore((s) => s.prev)
  const { lines, plain, loading, activeIndex } = useLyrics(nowPlaying, currentTime)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-line="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activeIndex])

  if (!nowPlaying) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden text-white"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {/* 背景：模糊放大的专辑封面，营造沉浸氛围 */}
      <div className="absolute inset-0">
        {nowPlaying.artworkUrl ? (
          <img
            src={nowPlaying.artworkUrl}
            alt=""
            className="size-full scale-125 object-cover blur-3xl"
          />
        ) : (
          <div className="size-full bg-gradient-to-br from-[#4a3324] to-[#1c130d]" />
        )}
        <div className="absolute inset-0 bg-black/55" />
      </div>

      <button
        onClick={onClose}
        className="absolute right-8 top-8 z-20 rounded-full bg-white/10 p-2.5 backdrop-blur transition-colors hover:bg-white/20"
      >
        <X className="size-5" />
      </button>

      <div className="relative z-10 flex flex-1 items-center justify-center gap-16 overflow-hidden px-16 pt-14">
        <div className="flex w-full max-w-md shrink-0 flex-col items-center gap-6">
          {nowPlaying.artworkUrl ? (
            <img
              src={nowPlaying.artworkUrl}
              alt=""
              className="aspect-square w-full rounded-3xl object-cover shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-3xl bg-white/10">
              <Music2 className="size-16 text-white/40" />
            </div>
          )}
          <div className="w-full text-center">
            <p className="truncate px-2 text-2xl font-semibold">{nowPlaying.title}</p>
            <p className="mt-2 truncate px-2 text-white/60">
              {nowPlaying.isLibrary ? nowPlaying.artist : `${nowPlaying.artist} · 试听`}
            </p>
          </div>
        </div>

        <div
          ref={listRef}
          className="hidden max-h-full w-full max-w-sm overflow-y-auto py-10 md:block"
        >
          {loading && <p className="text-center text-white/40">加载歌词中…</p>}
          {!loading && lines.length === 0 && plain && (
            <p className="whitespace-pre-line text-center leading-8 text-white/60">{plain}</p>
          )}
          {!loading && lines.length === 0 && !plain && (
            <p className="text-center text-white/30">暂无歌词</p>
          )}
          {lines.length > 0 && (
            <ul className="flex flex-col gap-5 text-center">
              {lines.map((line, i) => (
                <li
                  key={i}
                  data-line={i}
                  className={`text-lg leading-relaxed transition-colors ${
                    i === activeIndex ? 'text-accent-soft font-semibold' : 'text-white/40'
                  }`}
                >
                  {line.text || '♪'}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-3 px-16 pb-12">
        <div className="flex w-full max-w-xl items-center gap-3">
          <span className="w-10 text-right text-xs tabular-nums text-white/50">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={Number.isFinite(duration) && duration > 0 ? duration : 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => seekTo(Number(e.target.value))}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-[var(--color-accent-soft)]"
          />
          <span className="w-10 text-xs tabular-nums text-white/50">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center gap-7">
          <button onClick={prev} className="text-white/70 transition-colors hover:text-white">
            <SkipBack className="size-6" />
          </button>
          <button
            onClick={() => seekBy(-10)}
            className="text-white/70 transition-colors hover:text-white"
          >
            <RotateCcw className="size-6" />
          </button>
          <button
            onClick={togglePlay}
            className="flex size-16 items-center justify-center rounded-full bg-accent-soft text-white transition-transform hover:scale-105 active:scale-95"
          >
            {isPlaying ? (
              <Pause className="size-7" />
            ) : (
              <Play className="size-7 translate-x-[2px]" />
            )}
          </button>
          <button
            onClick={() => seekBy(10)}
            className="text-white/70 transition-colors hover:text-white"
          >
            <RotateCw className="size-6" />
          </button>
          <button onClick={next} className="text-white/70 transition-colors hover:text-white">
            <SkipForward className="size-6" />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Volume2 className="size-4 text-white/50" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="h-1 w-28 cursor-pointer appearance-none rounded-full bg-white/20 accent-[var(--color-accent-soft)]"
          />
        </div>
      </div>
    </div>
  )
}
