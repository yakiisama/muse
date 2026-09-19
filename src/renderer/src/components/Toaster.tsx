import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useToastStore, type ToastType } from '../store/toast'

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info
}

const ICON_COLORS: Record<ToastType, string> = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-accent-soft'
}

export default function Toaster(): React.JSX.Element | null {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.type]
        return (
          <div
            key={t.id}
            className="glass pointer-events-auto flex max-w-md items-center gap-2 rounded-full py-2 pl-3.5 pr-2 text-sm text-ink/85"
          >
            <Icon className={`size-4 shrink-0 ${ICON_COLORS[t.type]}`} />
            <span className="min-w-0 flex-1 truncate">{t.message}</span>
            {t.actionLabel && t.onAction && (
              <button
                onClick={() => {
                  t.onAction?.()
                  dismiss(t.id)
                }}
                className="shrink-0 rounded-full bg-ink/10 px-2.5 py-1 text-xs font-medium text-accent-soft transition-colors hover:bg-ink/15"
              >
                {t.actionLabel}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-full p-1 text-ink/30 transition-colors hover:bg-ink/10 hover:text-ink/60"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
