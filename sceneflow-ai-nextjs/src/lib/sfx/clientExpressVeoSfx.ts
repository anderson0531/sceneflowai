import { toast } from 'sonner'
import { VIDEO_CREDITS } from '@/lib/credits/creditCosts'
import type { SfxDurationOverride } from '@/lib/elevenlabs/sfxDuration'
import type { ExpressVeoSfxAttribution, ExpressVeoSfxEvent } from '@/lib/sfx/expressVeoSfxTypes'
import { resolveVeoSfxDuration } from '@/lib/sfx/veoSfxDuration'

export interface DispatchExpressVeoSfxParams {
  projectId: string
  sceneIndex: number
  beatIds: string[]
  segmentDurationSeconds?: number
  durationOverride?: SfxDurationOverride
  regenerate?: boolean
  onItemStart?: (beatId: string) => void
  onItemDone?: (payload: {
    beatId: string
    sfxIndex: number
    url: string
    attribution: ExpressVeoSfxAttribution
  }) => void | Promise<void>
  onItemError?: (beatId: string, error: string) => void
  onProgress?: (completed: number, total: number) => void
}

export interface DispatchExpressVeoSfxResult {
  success: number
  failed: number
  skipped: number
}

export function estimateExpressVeoSfxCredits(beatCount: number): number {
  return VIDEO_CREDITS.VEO_LITE * beatCount
}

export async function dispatchExpressVeoSfx(
  params: DispatchExpressVeoSfxParams
): Promise<DispatchExpressVeoSfxResult> {
  const {
    projectId,
    sceneIndex,
    beatIds,
    segmentDurationSeconds,
    durationOverride = 'auto',
    regenerate = false,
    onItemStart,
    onItemDone,
    onItemError,
    onProgress,
  } = params

  const clipDurationSeconds = resolveVeoSfxDuration({
    segmentDurationSeconds,
    override: durationOverride,
  })

  const toastId = toast.loading(`Express Veo SFX: starting ${beatIds.length} beat(s)...`)
  let completed = 0
  let total = beatIds.length

  try {
    const response = await fetch('/api/sfx/express-veo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        sceneIndex,
        beatIds,
        durationSeconds: clipDurationSeconds,
        durationOverride,
        regenerate,
      }),
    })

    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => '')
      throw new Error(errText.slice(0, 200) || `Express Veo SFX failed (HTTP ${response.status})`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let success = 0
    let failed = 0
    let skipped = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        let event: ExpressVeoSfxEvent
        try {
          event = JSON.parse(line.slice(6)) as ExpressVeoSfxEvent
        } catch {
          continue
        }

        switch (event.type) {
          case 'start':
            total = event.total
            skipped = event.skipped
            toast.loading(`Express Veo SFX: 0/${total} complete`, { id: toastId })
            break
          case 'item-start':
            onItemStart?.(event.beatId)
            break
          case 'item-done':
            completed++
            onProgress?.(completed, total)
            await onItemDone?.({
              beatId: event.beatId,
              sfxIndex: event.sfxIndex,
              url: event.url,
              attribution: event.attribution,
            })
            toast.loading(`Express Veo SFX: ${completed}/${total} complete`, { id: toastId })
            break
          case 'item-error':
            onItemError?.(event.beatId, event.error)
            break
          case 'complete':
            success = event.success
            failed = event.failed
            skipped = event.skipped
            break
          case 'error':
            throw new Error(event.error)
          case 'throttle':
            toast.loading(`Express Veo SFX throttled (${event.max} concurrent)...`, { id: toastId })
            break
        }
      }
    }

    if (success > 0 && failed === 0) {
      toast.success(`Express Veo SFX complete (${success} beat${success === 1 ? '' : 's'}).`, {
        id: toastId,
      })
    } else if (success > 0) {
      toast.warning(`Express Veo SFX: ${success} succeeded, ${failed} failed.`, { id: toastId })
    } else {
      toast.error(`Express Veo SFX failed (${failed} failed${skipped ? `, ${skipped} skipped` : ''}).`, {
        id: toastId,
      })
    }

    return { success, failed, skipped }
  } catch (error) {
    toast.error(`Express Veo SFX failed: ${(error as Error)?.message || 'Unknown error'}`, {
      id: toastId,
    })
    throw error
  }
}
