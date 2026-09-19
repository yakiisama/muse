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

// 全屏浮层盖住了 App 顶部的拖拽条，所以这一层自己整体设为可拖拽，
// 再把按钮 / 滑块 / 可滚动的歌词列表单独标成 no-drag，否则点不到。
const DRAG = { WebkitAppRegion: 'drag' } as React.CSSProperties
const NO_DRAG = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

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

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0
  const progress = safeDuration ? (Math.min(currentTime, safeDuration) / safeDuration) * 100 : 0

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#1c1c1e] text-white"
      style={DRAG}
    >
      {/* 背景：模糊放大的封面 + 封面主色的渐变，没封面时只剩渐变 */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,var(--color-accent),transparent_60%)] opacity-60 transition-colors duration-700" />
        {nowPlaying.artworkUrl && (
          <img
            src={nowPlaying.artworkUrl}
            alt=""
            className="size-full scale-125 object-cover opacity-70 blur-3xl"
          />
        )}
        <div className="absolute inset-0 bg-black/50" />
      </div>

      <button
        onClick={onClose}
        aria-label="退出沉浸式播放"
        style={NO_DRAG}
        className="absolute right-6 top-6 z-20 rounded-full border border-white/15 bg-white/10 p-2.5 transition-colors hover:bg-white/20"
      >
        <X className="size-5" />
      </button>

      <div className="relative z-10 flex flex-1 items-center justify-center gap-16 overflow-hidden px-16 pt-14">
        <div className="flex w-full max-w-[min(26rem,48vh)] shrink-0 flex-col items-center gap-6">
          {nowPlaying.artworkUrl ? (
            <img
              src={nowPlaying.artworkUrl}
              alt=""
              className="aspect-square w-full rounded-xl object-cover shadow-[0_30px_60px_-24px_rgba(0,0,0,0.8)] ring-1 ring-white/10"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-white/10">
              <Music2 className="size-16 text-white/40" />
            </div>
          )}
          <div className="w-full text-center">
            <p className="truncate px-2 text-2xl font-semibold leading-tight">{nowPlaying.title}</p>
            <p className="mt-2 truncate px-2 text-white/60">
              {nowPlaying.isLibrary ? nowPlaying.artist : `${nowPlaying.artist}（试听）`}
            </p>
          </div>
        </div>

        <div
          ref={listRef}
          style={NO_DRAG}
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
                  className={`text-lg leading-relaxed transition-colors duration-300 ${
                    i === activeIndex ? 'font-semibold text-white' : 'text-white/35'
                  }`}
                >
                  {line.text || '♪'}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-3 px-16 pb-12" style={NO_DRAG}>
        <div className="flex w-full max-w-xl items-center gap-3">
          <span className="w-10 text-right text-xs tabular-nums text-white/50">
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
            style={{ '--p': `${progress}%` } as React.CSSProperties}
            className="range-light flex-1 cursor-pointer"
          />
          <span className="w-10 text-xs tabular-nums text-white/50">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center gap-7">
          <button onClick={prev} aria-label="上一首" className="text-white/70 transition-colors hover:text-white">
            <SkipBack className="size-6" />
          </button>
          <button
            onClick={() => seekBy(-10)}
            aria-label="后退 10 秒"
            className="text-white/70 transition-colors hover:text-white"
          >
            <RotateCcw className="size-6" />
          </button>
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? '暂停' : '播放'}
            className="flex size-16 items-center justify-center rounded-full bg-white text-[#1c1c1e] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] transition-transform hover:scale-105 active:scale-95"
          >
            {isPlaying ? (
              <Pause className="size-7" />
            ) : (
              <Play className="size-7 translate-x-[2px]" />
            )}
          </button>
          <button
            onClick={() => seekBy(10)}
            aria-label="前进 10 秒"
            className="text-white/70 transition-colors hover:text-white"
          >
            <RotateCw className="size-6" />
          </button>
          <button onClick={next} aria-label="下一首" className="text-white/70 transition-colors hover:text-white">
            <SkipForward className="size-6" />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Volume2 className="size-4 text-white/50" />
          <input
            type="range"
            aria-label="音量"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            style={{ '--p': `${volume * 100}%` } as React.CSSProperties}
            className="range-light w-28 cursor-pointer"
          />
        </div>
      </div>
    </div>
  )
}
