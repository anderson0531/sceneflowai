import { toast } from 'sonner'
import { VIDEO_CREDITS } from '@/lib/credits/creditCosts'
import type { SfxDurationOverride } from '@/lib/elevenlabs/sfxDuration'
import { resolveSfxDuration } from '@/lib/elevenlabs/sfxDuration'
import { resolveExpressVeoSfxItems } from '@/lib/sfx/resolveExpressVeoSfxItems'

export interface DispatchExpressVeoSfxResult {
  success: number
  failed: number
  skipped: number
}

export function estimateExpressVeoSfxCredits(beatCount: number): number {
  return VIDEO_CREDITS.VEO_LITE * beatCount
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
