import { useEffect, useState } from 'react'
import { Download, Loader2, Pause, Play, Search as SearchIcon } from 'lucide-react'
import type { SearchResult } from '@shared/types'
import { usePlayerStore } from '../store/player'
import { formatTime } from '../lib/format'

const DEFAULT_QUERY = '周杰伦'

export default function SearchView(): React.JSX.Element {
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set())
  const addDownloadTask = usePlayerStore((s) => s.addDownloadTask)
  const nowPlaying = usePlayerStore((s) => s.nowPlaying)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const previewLoadingId = usePlayerStore((s) => s.previewLoadingId)
  const previewError = usePlayerStore((s) => s.previewError)
  const playPreview = usePlayerStore((s) => s.playPreview)
  const togglePlay = usePlayerStore((s) => s.togglePlay)

  async function runSearch(q: string = query): Promise<void> {
    const trimmed = q.trim()
    if (!trimmed) return
    setLoading(true)
    try {
      const res = await window.api.search(trimmed)
      setResults(res)
    } finally {
      setLoading(false)
    }
  }

  // 首次进入搜索页时自动跑一次默认搜索，不用用户先手动搜一次才有内容看
  useEffect(() => {
    runSearch(DEFAULT_QUERY)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleDownload(result: SearchResult): Promise<void> {
    setRequestedIds((prev) => new Set(prev).add(result.id))
    const { taskId } = await window.api.startDownload(result)
    addDownloadTask({
      taskId,
      title: result.title,
      artist: result.artist,
      thumbnail: result.thumbnail,
      percent: 0,
      eta: '',
      speed: '',
      status: 'downloading'
    })
  }

  return (
    <div className="flex h-full flex-col px-8 pt-10">
      <div className="panel-sm flex items-center gap-2 rounded-lg px-4 py-3 transition-colors focus-within:border-accent/50">
        <SearchIcon className="size-4 text-ink/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          placeholder="搜索歌曲、歌手…"
          className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink/35 outline-none"
        />
        {loading && <Loader2 className="size-4 animate-spin text-ink/40" />}
      </div>

      <div className="mt-6 flex-1 overflow-y-auto pb-6">
        {results.length === 0 && !loading && (
          <p className="mt-16 text-center text-sm text-ink/30">输入关键词并回车开始搜索</p>
        )}
        <ul className="flex flex-col">
          {results.map((r) => {
            const requested = requestedIds.has(r.id)
            const isPreviewing = nowPlaying?.id === r.id && !nowPlaying.isLibrary
            const previewLoading = previewLoadingId === r.id
            return (
              <li
                key={r.id}
                className="hairline-b group flex items-center gap-3 px-2.5 py-2.5 transition-colors hover:bg-ink/[0.05]"
              >
                <button
                  onClick={() => (isPreviewing ? togglePlay() : playPreview(r))}
                  disabled={previewLoading}
                  className="relative size-11 shrink-0 overflow-hidden rounded-xl"
                >
                  {r.thumbnail ? (
                    <img src={r.thumbnail} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="size-full bg-ink/10" />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    {previewLoading ? (
                      <Loader2 className="size-4 animate-spin text-white" />
                    ) : isPreviewing && isPlaying ? (
                      <Pause className="size-4 text-white" />
                    ) : (
                      <Play className="size-4 text-white" />
                    )}
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm ${isPreviewing ? 'text-accent' : 'text-ink/90'}`}
                  >
                    {r.title}
                  </p>
                  {previewError?.id === r.id ? (
                    <p className="truncate text-xs text-red-500" title={previewError.message}>
                      试听失败：{previewError.message}
                    </p>
                  ) : (
                    <p className="truncate text-xs text-ink/40">{r.artist}</p>
                  )}
                </div>
                <span className="text-xs tabular-nums text-ink/30">
                  {formatTime(r.duration)}
                </span>
                <button
                  onClick={() => handleDownload(r)}
                  disabled={requested}
                  className={`ml-2 flex items-center gap-1 rounded-md border border-ink/15 px-3 py-1.5 text-xs text-ink/70 transition-colors hover:border-brass hover:text-brass ${requested ? 'opacity-60' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <Download className="size-3.5" />
                  {requested ? '已加入' : '下载'}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
