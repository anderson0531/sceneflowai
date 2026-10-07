'use client'

import { useTranslations } from 'next-intl'
import { HIFI_CREDIT_HINT } from '@/lib/sfx/clientGenerateVeoSfx'

export function isHifiDialogueProvider(provider: unknown): boolean {
  return provider === 'veo'
}

export function DialogueQualityToggle({
  provider,
  hasAudio,
  disabled,
  onLofi,
  onHifi,
}: {
  provider?: string
  hasAudio: boolean
  disabled?: boolean
  onLofi: () => void
  onHifi: () => void
}) {
  const t = useTranslations('production.expressAudio')
  const hifiActive = hasAudio && isHifiDialogueProvider(provider)
  const lofiActive = hasAudio && !hifiActive

  return (
    <div className="mt-2 inline-flex overflow-hidden rounded-md border border-violet-600/40">
      <button
        type="button"
        disabled={disabled}
        title="Gemini TTS"
        onClick={(event) => {
          event.stopPropagation()
          onLofi()
        }}
        className={`px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-50 ${
          lofiActive ? 'bg-violet-600 text-white' : 'text-violet-200/80 hover:bg-violet-900/30'
        }`}
      >
        {t('qualityLofi')}
      </button>
      <button
        type="button"
        disabled={disabled}
        title={HIFI_CREDIT_HINT}
        onClick={(event) => {
          event.stopPropagation()
          onHifi()
        }}
        className={`px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-50 ${
          hifiActive ? 'bg-violet-600 text-white' : 'text-violet-200/80 hover:bg-violet-900/30'
        }`}
      >
        {t('qualityHifi')}
      </button>
    </div>
  )
}
