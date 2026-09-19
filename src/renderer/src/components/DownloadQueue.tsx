import { CheckCircle2, Loader2, RotateCcw, SlashIcon, X, XCircle } from 'lucide-react'
import { usePlayerStore } from '../store/player'

export default function DownloadQueue(): React.JSX.Element | null {
  const downloads = usePlayerStore((s) => s.downloads)
  const retryDownload = usePlayerStore((s) => s.retryDownload)
  const removeDownloadTask = usePlayerStore((s) => s.removeDownloadTask)
  const clearFinishedDownloads = usePlayerStore((s) => s.clearFinishedDownloads)
  if (downloads.length === 0) return null

  const hasFinished = downloads.some((d) => d.status !== 'downloading')

  return (
    <div className="popover absolute right-4 top-12 z-20 flex w-72 flex-col gap-2 rounded-xl p-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-medium text-ink/60">下载队列</p>
        {hasFinished && (
          <button
            onClick={clearFinishedDownloads}
            className="text-xs text-ink/50 transition-colors hover:text-ink/80"
          >
            清空已完成
          </button>
        )}
      </div>
      <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
        {downloads.map((d) => (
          <li key={d.taskId} className="panel-2 rounded-lg px-2.5 py-2">
            <div className="flex items-center gap-2">
              {d.status === 'downloading' && (
                <Loader2 className="size-3.5 shrink-0 animate-spin text-accent" />
              )}
              {d.status === 'done' && (
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-700" />
              )}
              {d.status === 'error' && <XCircle className="size-3.5 shrink-0 text-red-500" />}
              {d.status === 'canceled' && (
                <SlashIcon className="size-3.5 shrink-0 text-ink/40" />
              )}
              <p className="min-w-0 flex-1 truncate text-xs text-ink/80">{d.title}</p>

              {d.status === 'downloading' && (
                <button
                  onClick={() => window.api.cancelDownload(d.taskId)}
                  title="取消下载"
                  className="shrink-0 rounded p-0.5 text-ink/45 transition-colors hover:bg-ink/10 hover:text-ink/80"
                >
                  <X className="size-3.5" />
                </button>
              )}
              {(d.status === 'error' || d.status === 'canceled') && (
                <button
                  onClick={() => retryDownload(d.taskId)}
                  title="重试"
                  className="shrink-0 rounded p-0.5 text-ink/45 transition-colors hover:bg-ink/10 hover:text-accent"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              )}
              {d.status !== 'downloading' && (
                <button
                  onClick={() => removeDownloadTask(d.taskId)}
                  title="从列表移除"
                  className="shrink-0 rounded p-0.5 text-ink/45 transition-colors hover:bg-ink/10 hover:text-ink/80"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            {d.status === 'downloading' && (
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink/12">
                <div
                  className="h-full rounded-full bg-accent transition-[width]"
                  style={{ width: `${Math.min(100, Math.max(0, d.percent))}%` }}
                />
              </div>
            )}
            {d.status === 'error' && (
              <p
                className="mt-1 line-clamp-4 break-words text-[11px] leading-snug text-red-500/85"
                title={d.message}
              >
                {d.message}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
