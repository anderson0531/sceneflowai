import { useCallback } from 'react'
import { useOverlayStore, OperationType } from '@/store/useOverlayStore'

interface ExecutionOptions {
  message: string
  estimatedDuration: number
  operationType?: OperationType
}

/**
 * Hook for executing async operations with animated processing overlay
 * 
 * @global Use this hook consistently across the app for processing operations
 * 
 * @example
 * ```tsx
 * const { execute } = useProcessWithOverlay()
 * 
 * // For script review/audience resonance
 * await execute(async () => {
 *   const response = await fetch('/api/vision/review-script', ...)
 *   return response.json()
 * }, { 
 *   message: 'Analyzing audience resonance...', 
 *   estimatedDuration: 25,
 *   operationType: 'script-review'
 * })
 * 
 * // For script generation
 * await execute(async () => { ... }, {
 *   message: 'Writing your script...',
 *   estimatedDuration: 60,
 *   operationType: 'script-generation'
 * })
 * 
 * // For image generation
 * await execute(async () => { ... }, {
 *   message: 'Generating images...',
 *   estimatedDuration: 30,
 *   operationType: 'image-generation'
 * })
 * ```
 * 
 * Available operation types:
 * - 'script-review' - Audience resonance analysis (audience animation)
 * - 'script-generation' - Writing/generating script (typing animation)
 * - 'script-optimization' - Optimizing/revising script (typing animation)
 * - 'image-generation' - Generating images (reveal animation)
 * - 'video-generation' - Generating video (film strip animation)
 * - 'audio-generation' - Generating audio/TTS (waveform animation)
 * - 'character-generation' - Creating characters (reveal animation)
 * - 'analysis' - General analysis (spinner)
 * - 'export' - Exporting content (spinner)
 * - 'default' - Generic processing (spinner)
 */
export const useProcessWithOverlay = () => {
  const { show, hide } = useOverlayStore()

  const execute = useCallback(async <T>(
    fn: () => Promise<T>, 
    options: ExecutionOptions
  ): Promise<T> => {
    try {
      show(options.message, options.estimatedDuration, options.operationType)
      const res = await fn()
      return res
    } finally {
      hide()
    }
  }, [show, hide])

  return { execute }
}


