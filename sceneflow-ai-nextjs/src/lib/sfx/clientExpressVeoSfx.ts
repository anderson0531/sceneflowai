import { toast } from 'sonner'
import { VIDEO_CREDITS } from '@/lib/credits/creditCosts'
import type { SfxDurationOverride } from '@/lib/elevenlabs/sfxDuration'
import type { ExpressVeoSfxAttribution, ExpressVeoSfxEvent } from '@/lib/sfx/expressVeoSfxTypes'
import { resolveSfxDuration } from '@/lib/elevenlabs/sfxDuration'
import { resolveExpressVeoSfxItems } from '@/lib/sfx/resolveExpressVeoSfxItems'
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

  const toastId = toast.loading(`HiFi sound effects: starting ${beatIds.length} shot${beatIds.length === 1 ? '' : 's'}...`)
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
      throw new Error(errText.slice(0, 200) || `HiFi sound effects failed (HTTP ${response.status})`)
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
            toast.loading(`HiFi sound effects: 0/${total} complete`, { id: toastId })
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
            toast.loading(`HiFi sound effects: ${completed}/${total} complete`, { id: toastId })
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
            toast.loading(`HiFi sound effects paused (${event.max} at a time)...`, { id: toastId })
            break
        }
      }
    }

    if (success > 0 && failed === 0) {
      toast.success(`HiFi sound effects complete (${success} shot${success === 1 ? '' : 's'}).`, {
        id: toastId,
      })
    } else if (success > 0) {
      toast.warning(`HiFi sound effects: ${success} succeeded, ${failed} failed.`, { id: toastId })
    } else {
      toast.error(`HiFi sound effects failed (${failed} failed${skipped ? `, ${skipped} skipped` : ''}).`, {
        id: toastId,
      })
    }

    return { success, failed, skipped }
  } catch (error) {
    toast.error(`HiFi sound effects failed: ${(error as Error)?.message || 'Unknown error'}`, {
      id: toastId,
    })
    throw error
  }
}

export async function dispatchExpressElevenLabsSfx(params: {
  projectId: string
  scene: Record<string, unknown>
  beatIds: string[]
  segmentDurationSeconds?: number
  durationOverride?: SfxDurationOverride
  regenerate?: boolean
  onItemStart?: (beatId: string) => void
  onItemDone?: (payload: { beatId: string; sfxIndex: number; url: string }) => void | Promise<void>
  onItemError?: (beatId: string, error: string) => void
}): Promise<DispatchExpressVeoSfxResult> {
  const resolved = resolveExpressVeoSfxItems(params.scene, params.beatIds, {
    regenerate: params.regenerate,
  })
  if (resolved.errors.length > 0) {
    throw new Error(resolved.errors.join('; '))
  }
  const durationSeconds = resolveSfxDuration({
    segmentDurationSeconds: params.segmentDurationSeconds,
    override: params.durationOverride ?? 'auto',
  })
  let success = 0
  let failed = 0
  const toastId = toast.loading(
    `ElevenLabs sound effects: starting ${resolved.items.length} shot${resolved.items.length === 1 ? '' : 's'}...`
  )
  for (const item of resolved.items) {
    params.onItemStart?.(item.beatId)
    try {
      const response = await fetch('/api/tts/elevenlabs/sound-effects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: params.projectId,
          sfxId: item.sfxId,
          sfxIndex: item.sfxIndex,
          text: item.text,
          durationSeconds,
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || `Sound effect failed (HTTP ${response.status})`)
      }
      const data = await response.json()
      if (!data?.url) throw new Error('Sound effect response missing audio URL')
      await params.onItemDone?.({ beatId: item.beatId, sfxIndex: item.sfxIndex, url: data.url })
      success++
      toast.loading(`ElevenLabs sound effects: ${success}/${resolved.items.length} complete`, {
        id: toastId,
      })
    } catch (error) {
      failed++
      params.onItemError?.(item.beatId, (error as Error)?.message || 'Sound effect failed')
    }
  }
  if (success > 0 && failed === 0) {
    toast.success(`ElevenLabs sound effects complete (${success}).`, { id: toastId })
  } else if (failed > 0) {
    toast.error(`ElevenLabs sound effects: ${success} succeeded, ${failed} failed.`, { id: toastId })
  } else {
    toast.dismiss(toastId)
  }
  return { success, failed, skipped: resolved.skipped.length }
}
