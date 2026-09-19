import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useToastStore, type ToastType } from '../store/toast'

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info
}

const EDGE_COLORS: Record<ToastType, string> = {
  success: 'border-l-emerald-500',
  error: 'border-l-red-500',
  info: 'border-l-accent'
}

const ICON_COLORS: Record<ToastType, string> = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-accent'
}

export default function Toaster(): React.JSX.Element | null {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed left-1/2 top-12 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.type]
        return (
          <div
            key={t.id}
            role="status"
            className={`popover pointer-events-auto flex max-w-md items-center gap-2 rounded-lg border-l-4 py-2 pl-3 pr-2 text-sm text-ink/85 ${EDGE_COLORS[t.type]}`}
          >
            <Icon className={`size-4 shrink-0 ${ICON_COLORS[t.type]}`} />
            <span className="min-w-0 flex-1 truncate">{t.message}</span>
            {t.actionLabel && t.onAction && (
              <button
                onClick={() => {
                  t.onAction?.()
                  dismiss(t.id)
                }}
                className="shrink-0 rounded-md border border-accent/50 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
              >
                {t.actionLabel}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              aria-label="关闭"
              className="shrink-0 rounded-md p-1 text-ink/40 transition-colors hover:bg-ink/10 hover:text-ink/70"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
