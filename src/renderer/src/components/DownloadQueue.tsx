import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { usePlayerStore } from '../store/player'

export default function DownloadQueue(): React.JSX.Element | null {
  const downloads = usePlayerStore((s) => s.downloads)
  if (downloads.length === 0) return null

  return (
    <div className="glass absolute right-3 top-3 z-20 flex w-72 flex-col gap-2 rounded-[22px] p-3">
      <p className="px-1 text-xs font-medium text-ink/50">下载队列</p>
      <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
        {downloads.map((d) => (
          <li key={d.taskId} className="glass-pill rounded-xl px-2.5 py-2">
            <div className="flex items-center gap-2">
              {d.status === 'downloading' && (
                <Loader2 className="size-3.5 shrink-0 animate-spin text-accent-soft" />
              )}
              {d.status === 'done' && (
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
              )}
              {d.status === 'error' && (
                <XCircle className="size-3.5 shrink-0 text-red-400" />
              )}
              <p className="truncate text-xs text-ink/80">{d.title}</p>
            </div>
            {d.status === 'downloading' && (
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink/10">
                <div
                  className="h-full rounded-full bg-accent transition-[width]"
                  style={{ width: `${Math.min(100, Math.max(0, d.percent))}%` }}
                />
              </div>
            )}
            {d.status === 'error' && (
              <p
                className="mt-1 line-clamp-4 break-words text-[11px] leading-snug text-red-400/80"
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
