import { create } from 'zustand'
import { uid } from './utils'
import { playDingSound } from './alertSound'
import { useStore } from './store'

export type ToastTone = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: string
  title: string
  message?: string
  tone: ToastTone
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
    // Sound feedback is reserved for staff (1669/rescue/hospital) working an
    // active case load -- public-facing pages (reporting a case, taking
    // photos, etc.) stay silent, same policy as Button's click sound.
    const role = useStore.getState().currentUser?.role
    const isStaff = role !== undefined && role !== 'public'
    if (t.tone === 'success' && isStaff) playDingSound()
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }))
    }, 4200)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))

export function toast(t: Omit<Toast, 'id'>) {
  useToastStore.getState().show(t)
}
