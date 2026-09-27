import { create } from 'zustand'
import { uid } from './utils'
import { playUiSound, type UiSound } from './sounds'

export type ToastTone = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: string
  title: string
  message?: string
  tone: ToastTone
}

// Each outcome sounds like itself; plain information stays quiet.
const TONE_SOUND: Partial<Record<ToastTone, UiSound>> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
}

interface ToastState {
  toasts: Toast[]
  show: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (t) => {
    const id = uid('toast')
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }))
    }, 4200)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))

/** `silent`: the caller plays its own sound for this (e.g. a case alert). */
export function toast({ silent, ...t }: Omit<Toast, 'id'> & { silent?: boolean }) {
  useToastStore.getState().show(t)
  const sound = TONE_SOUND[t.tone]
  if (sound && !silent) playUiSound(sound)
}
