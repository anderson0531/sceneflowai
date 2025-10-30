import { create } from 'zustand'

interface OverlayState {
  isVisible: boolean
  message: string
  estimatedDuration: number
  startTime: number | null
  show: (message: string, estimatedDuration: number) => void
  hide: () => void
}

export const useOverlayStore = create<OverlayState>((set) => ({
  isVisible: false,
  message: 'Processing...',
  estimatedDuration: 0,
  startTime: null,
  show: (message: string, estimatedDuration: number) =>
    set({ isVisible: true, message, estimatedDuration, startTime: Date.now() }),
  hide: () =>
    set({ isVisible: false, message: 'Processing...', estimatedDuration: 0, startTime: null })
}))


