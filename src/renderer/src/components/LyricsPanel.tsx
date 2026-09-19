import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { usePlayerStore } from '../store/player'
import { useLyrics } from '../hooks/useLyrics'

interface Props {
  onClose: () => void
}

export default function LyricsPanel({ onClose }: Props): React.JSX.Element {
  const nowPlaying = usePlayerStore((s) => s.nowPlaying)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const { lines, plain, loading, activeIndex } = useLyrics(nowPlaying, currentTime)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-line="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activeIndex])

  return (
    <div className="glass absolute inset-y-3 right-3 z-30 flex w-80 flex-col overflow-hidden rounded-[26px]">
      <div className="flex items-center justify-between border-b border-ink/8 px-4 py-3">
        <p className="text-sm font-medium text-ink/80">歌词</p>
        <button onClick={onClose} className="rounded-full p-1.5 transition-colors hover:bg-ink/10">
          <X className="size-4 text-ink/60" />
        </button>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-6">
        {loading && <p className="text-center text-sm text-ink/30">加载歌词中…</p>}
        {!loading && lines.length === 0 && plain && (
          <p className="whitespace-pre-line text-sm leading-7 text-ink/60">{plain}</p>
        )}
        {!loading && lines.length === 0 && !plain && (
          <p className="mt-10 text-center text-sm text-ink/30">暂无歌词</p>
        )}
        {lines.length > 0 && (
          <ul className="flex flex-col gap-4">
            {lines.map((line, i) => (
              <li
                key={i}
                data-line={i}
                className={`text-sm leading-relaxed transition-colors ${
                  i === activeIndex ? 'text-accent-soft font-medium' : 'text-ink/35'
                }`}
              >
                {line.text || '♪'}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
