import { Music2, Pause, Play, Trash2 } from 'lucide-react'
import { usePlayerStore } from '../store/player'
import { useToastStore } from '../store/toast'
import { toMediaUrl } from '../lib/mediaUrl'
import { formatTime } from '../lib/format'
import type { Song } from '@shared/types'

export default function LibraryView(): React.JSX.Element {
  const library = usePlayerStore((s) => s.library)
  const nowPlaying = usePlayerStore((s) => s.nowPlaying)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const playSong = usePlayerStore((s) => s.playSong)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const removeFromLibrary = usePlayerStore((s) => s.removeFromLibrary)
  const pushToast = useToastStore((s) => s.push)

  async function handleRemove(song: Song): Promise<void> {
    try {
      await removeFromLibrary(song.id)
      pushToast({ type: 'info', message: `已从音乐库移除《${song.title}》` })
    } catch {
      pushToast({ type: 'error', message: '移除失败，请重试' })
    }
  }

  if (library.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-ink/45">
        <Music2 className="size-8" />
        <p className="text-sm">音乐库还是空的，去搜索页下载点音乐吧</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-8 pt-10 pb-6">
      <h1 className="mb-5 text-2xl font-bold tracking-tight text-ink">音乐库</h1>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {library.map((song) => {
          const isCurrent = nowPlaying?.id === song.id && nowPlaying.isLibrary
          return (
            <div
              key={song.id}
              className="group relative flex flex-col gap-2 rounded-md p-2 transition-colors hover:bg-ink/[0.04]"
            >
              <div className="relative aspect-square overflow-hidden rounded-lg bg-ink/6 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.45)] ring-1 ring-ink/8">
                {song.artworkPath ? (
                  <img
                    src={toMediaUrl(song.artworkPath)}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <Music2 className="size-8 text-ink/20" />
                  </div>
                )}
                <button
                  onClick={() =>
                    isCurrent ? togglePlay() : playSong(song, library)
                  }
                  className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  {isCurrent && isPlaying ? (
                    <Pause className="size-8 text-white" />
                  ) : (
                    <Play className="size-8 text-white" />
                  )}
                </button>
                <button
                  onClick={() => handleRemove(song)}
                  aria-label="从音乐库移除"
                  className="absolute right-1.5 top-1.5 rounded-md bg-black/55 p-1 opacity-0 transition-colors hover:bg-red-500 group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <Trash2 className="size-3.5 text-white" />
                </button>
              </div>
              <div className="min-w-0 px-0.5">
                <p
                  className={`truncate text-sm ${isCurrent ? 'text-accent font-medium' : 'text-ink/85'}`}
                >
                  {song.title}
                </p>
                <p className="truncate text-xs text-ink/45">
                  {song.artist}　{formatTime(song.duration)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
