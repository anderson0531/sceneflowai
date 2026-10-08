'use client'

import { useTranslations } from 'next-intl'

export function isHifiDialogueProvider(provider: unknown): boolean {
  return provider === 'veo'
}

/**
 * LOFI regenerates the TTS line. Generate clip opens shot video, whose audio
 * is what HIFI animatic playback uses for dialogue and effects.
 */
export function DialogueQualityToggle({
  disabled,
  lofiTitle = 'Gemini TTS preview',
  onLofi,
  onGenerateClip,
}: {
  disabled?: boolean
  lofiTitle?: string
  onLofi: () => void
  onGenerateClip: () => void
}) {
  const t = useTranslations('production.expressAudio')

  return (
    <div className="mt-2 inline-flex overflow-hidden rounded-md border border-violet-600/40">
      <button
        type="button"
        disabled={disabled}
        title={lofiTitle}
        onClick={(event) => {
          event.stopPropagation()
          onLofi()
        }}
        className="px-2 py-0.5 text-[10px] font-medium text-violet-200/80 transition-colors hover:bg-violet-900/30 disabled:opacity-50"
      >
        {t('qualityLofi')}
      </button>
      <button
        type="button"
        disabled={disabled}
        title="Generate this shot’s clip. HiFi animatic playback uses the clip’s audio."
        onClick={(event) => {
          event.stopPropagation()
          onGenerateClip()
        }}
        className="px-2 py-0.5 text-[10px] font-medium text-violet-200/80 transition-colors hover:bg-violet-900/30 disabled:opacity-50"
      >
        Generate clip
      </button>
    </div>
  )
}
