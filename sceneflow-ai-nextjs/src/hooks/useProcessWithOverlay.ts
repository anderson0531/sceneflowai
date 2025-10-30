import { useCallback } from 'react'
import { useOverlayStore } from '@/store/useOverlayStore'

interface ExecutionOptions {
  message: string
  estimatedDuration: number
}

export const useProcessWithOverlay = () => {
  const { show, hide } = useOverlayStore()

  const execute = useCallback(async <T>(fn: () => Promise<T>, options: ExecutionOptions): Promise<T> => {
    try {
      show(options.message, options.estimatedDuration)
      const res = await fn()
      return res
    } finally {
      hide()
    }
  }, [show, hide])

  return { execute }
}


