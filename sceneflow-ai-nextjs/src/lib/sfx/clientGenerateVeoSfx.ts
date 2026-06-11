import { toast } from 'sonner'
import { VIDEO_CREDITS } from '@/lib/credits/creditCosts'
import type { SfxDurationOverride } from '@/lib/elevenlabs/sfxDuration'
import type { VeoSfxPromptMode } from '@/lib/sfx/veoSfx'
import { resolveVeoSfxDuration } from '@/lib/sfx/veoSfxDuration'

export interface GenerateVeoSfxClientParams {
  projectId: string
  text: string
  sfxId?: string
  sfxIndex: number
  segmentDurationSeconds?: number
  durationOverride?: SfxDurationOverride
  hasExistingAudio?: boolean
  promptMode?: VeoSfxPromptMode
}

export interface GenerateVeoSfxClientResult {
  url: string
  clipDurationSeconds: number
  attribution: {
    source: 'veo'
    clipDurationSeconds: number
    veoQuality: 'fast'
    promptMode?: VeoSfxPromptMode
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
    promptMode = 'ambient',
  } = params

  const clipDurationSeconds = resolveVeoSfxDuration({
    segmentDurationSeconds,
    override: durationOverride,
  })

  const isActionBeat = promptMode === 'actionBeat'
  const toastId = toast.loading(
    hasExistingAudio
      ? isActionBeat
        ? 'Re-generating action beat SFX...'
        : 'Re-generating Veo ambient SFX...'
      : isActionBeat
        ? 'Generating action beat SFX...'
        : 'Generating Veo ambient SFX...'
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
        promptMode,
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
      throw new Error(
        (typeof payload?.error === 'string'
          ? payload.error
          : payload?.error != null
            ? JSON.stringify(payload.error)
            : null) || `Veo SFX generation failed (HTTP ${response.status})`
      )
    }

    const data = await response.json()
    const url: string | undefined = data?.url
    if (!url) {
      throw new Error('Veo SFX response missing audio URL')
    }

    const resolvedClipDuration = data?.clipDurationSeconds ?? clipDurationSeconds
    const resolvedPromptMode = (data?.promptMode as VeoSfxPromptMode | undefined) ?? promptMode
    toast.success(
      hasExistingAudio
        ? isActionBeat
          ? 'Action beat SFX re-generated.'
          : 'Veo ambient SFX re-generated.'
        : isActionBeat
          ? 'Action beat SFX generated.'
          : 'Veo ambient SFX generated.',
      { id: toastId }
    )

    return {
      url,
      clipDurationSeconds: resolvedClipDuration,
      attribution: {
        source: 'veo',
        clipDurationSeconds: resolvedClipDuration,
        veoQuality: 'fast',
        promptMode: resolvedPromptMode,
      },
    }
  } catch (error) {
    if ((error as Error)?.message !== 'Insufficient credits') {
      const label = isActionBeat ? 'action beat SFX' : 'Veo ambient SFX'
      toast.error(`Failed to generate ${label}: ${(error as Error)?.message || 'Unknown error'}`, {
        id: toastId,
      })
    }
    throw error
  }
}

export const VEO_SFX_CREDIT_HINT = `~${VIDEO_CREDITS.VEO_FAST} credits · up to 8s continuous`
