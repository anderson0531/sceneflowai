import { toast } from 'sonner'
import { VIDEO_CREDITS } from '@/lib/credits/creditCosts'
import type { SfxDurationOverride } from '@/lib/elevenlabs/sfxDuration'
import { resolveVeoSfxDuration } from '@/lib/sfx/veoSfxDuration'

export interface GenerateVeoSfxClientParams {
  projectId: string
  text: string
  sfxId?: string
  sfxIndex: number
  segmentDurationSeconds?: number
  durationOverride?: SfxDurationOverride
  hasExistingAudio?: boolean
}

export interface GenerateVeoSfxClientResult {
  url: string
  clipDurationSeconds: number
  attribution: {
    source: 'veo'
    clipDurationSeconds: number
    veoQuality: 'fast'
  }
}

export async function dispatchGenerateVeoSfx(
  params: GenerateVeoSfxClientParams
): Promise<GenerateVeoSfxClientResult> {
  const {
    projectId,
    text,
    sfxId,
    sfxIndex,
    segmentDurationSeconds,
    durationOverride = 'auto',
    hasExistingAudio = false,
  } = params

  const clipDurationSeconds = resolveVeoSfxDuration({
    segmentDurationSeconds,
    override: durationOverride,
  })

  const toastId = toast.loading(
    hasExistingAudio ? 'Re-generating Veo ambient SFX...' : 'Generating Veo ambient SFX...'
  )

  try {
    const response = await fetch('/api/sfx/generate-veo-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        sfxId,
        sfxIndex,
        text,
        durationSeconds: clipDurationSeconds,
      }),
    })

    if (!response.ok) {
      let payload: any = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
      if (response.status === 402) {
        const need = payload?.creditsRequired ?? VIDEO_CREDITS.VEO_FAST
        const have = payload?.creditsAvailable
        toast.error(
          `Insufficient credits for Veo ambient SFX. Need ${need} credits${
            typeof have === 'number' ? ` (available: ${have})` : ''
          }.`,
          { id: toastId }
        )
        throw new Error('Insufficient credits')
      }
      throw new Error(payload?.error || `Veo SFX generation failed (HTTP ${response.status})`)
    }

    const data = await response.json()
    const url: string | undefined = data?.url
    if (!url) {
      throw new Error('Veo SFX response missing audio URL')
    }

    const resolvedClipDuration = data?.clipDurationSeconds ?? clipDurationSeconds
    toast.success(hasExistingAudio ? 'Veo ambient SFX re-generated.' : 'Veo ambient SFX generated.', {
      id: toastId,
    })

    return {
      url,
      clipDurationSeconds: resolvedClipDuration,
      attribution: {
        source: 'veo',
        clipDurationSeconds: resolvedClipDuration,
        veoQuality: 'fast',
      },
    }
  } catch (error) {
    if ((error as Error)?.message !== 'Insufficient credits') {
      toast.error(`Failed to generate Veo ambient SFX: ${(error as Error)?.message || 'Unknown error'}`, {
        id: toastId,
      })
    }
    throw error
  }
}

export const VEO_SFX_CREDIT_HINT = `~${VIDEO_CREDITS.VEO_FAST} credits · up to 8s continuous`
