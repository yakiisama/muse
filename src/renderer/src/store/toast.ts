import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  actionLabel?: string
  onAction?: () => void
}

interface PushOptions {
  duration?: number
  sticky?: boolean
}

interface ToastState {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>, options?: PushOptions) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push: (toast, options) => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    if (!options?.sticky) {
      setTimeout(() => get().dismiss(id), options?.duration ?? 3200)
    }
  },

  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}))
