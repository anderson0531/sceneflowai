'use client'

import { useTranslations } from 'next-intl'

export function isHifiDialogueProvider(provider: unknown): boolean {
  return provider === 'veo'
}

/**
 * LOFI regenerates the TTS / ElevenLabs preview line. When a shot clip exists,
 * Extract clip MP3 pulls the MP3 audio track from the shot's video clip MP4 and
 * updates the shot audio slot. Generate clip opens the shot video tab.
 */
export function DialogueQualityToggle({
  disabled,
  lofiDisabled,
  lofiTitle = 'Gemini TTS preview',
  hasClip = false,
  isExtractingClipAudio = false,
  isClipAudioActive = false,
  onLofi,
  onExtractClipAudio,
  onGenerateClip,
}: {
  disabled?: boolean
  lofiDisabled?: boolean
  lofiTitle?: string
  hasClip?: boolean
  isExtractingClipAudio?: boolean
  isClipAudioActive?: boolean
  onLofi: () => void
  onExtractClipAudio?: () => void
  onGenerateClip: () => void
}) {
  const t = useTranslations('production.expressAudio')
  const extractEnabled = Boolean(hasClip && onExtractClipAudio)

  return (
    <div className="mt-2 inline-flex flex-wrap overflow-hidden rounded-md border border-violet-600/40">
      <button
        type="button"
        disabled={disabled || lofiDisabled || isExtractingClipAudio}
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
        disabled={disabled || !extractEnabled || isExtractingClipAudio}
        aria-disabled={disabled || !extractEnabled || isExtractingClipAudio}
        title={
          extractEnabled
            ? 'Extract MP3 audio from this shot’s video clip MP4 and update shot audio'
            : 'Generate a video clip for this shot first to extract its MP3 audio'
        }
        onClick={(event) => {
          event.stopPropagation()
          if (extractEnabled) {
            onExtractClipAudio?.()
          }
        }}
        className={
          extractEnabled
            ? isClipAudioActive
              ? 'border-l border-violet-600/40 bg-emerald-600/30 px-2 py-0.5 text-[10px] font-medium text-emerald-100 transition-colors hover:bg-emerald-600/40 disabled:opacity-50'
              : 'border-l border-violet-600/40 bg-violet-600/25 px-2 py-0.5 text-[10px] font-medium text-violet-100 transition-colors hover:bg-violet-600/40 disabled:opacity-50'
            : 'border-l border-violet-600/40 px-2 py-0.5 text-[10px] font-medium text-violet-200/50 transition-colors disabled:cursor-not-allowed disabled:opacity-40'
        }
      >
        {isExtractingClipAudio ? 'Extracting MP3...' : 'Extract clip MP3'}
      </button>
      <button
        type="button"
        disabled={disabled || isExtractingClipAudio}
        title="Open the Clips tab for this shot to generate or update its video clip."
        onClick={(event) => {
          event.stopPropagation()
          onGenerateClip()
        }}
        className="border-l border-violet-600/40 px-2 py-0.5 text-[10px] font-medium text-violet-200/80 transition-colors hover:bg-violet-900/30 disabled:opacity-50"
      >
        Generate clip
      </button>
    </div>
  )
}
