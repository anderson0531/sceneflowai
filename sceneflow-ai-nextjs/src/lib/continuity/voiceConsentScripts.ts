/**
 * Client-safe constants & helpers for Google Chirp 3 Instant Custom Voice
 * spoken consent scripts and BCP-47 locale resolution.
 *
 * NOTE: Google Cloud TTS `voices:generateVoiceCloningKey` requires the speaker
 * to read Google's mandated consent script in the matching language.
 */

export const GOOGLE_VOICE_CLONE_CONSENT_SCRIPT_BY_LOCALE: Record<
  string,
  { languageCode: string; script: string }
> = {
  en: {
    languageCode: 'en-US',
    script:
      'I am the owner of this voice and I consent to Google using this voice to create a synthetic voice model.',
  },
  es: {
    languageCode: 'es-ES',
    script:
      'Soy el propietario de esta voz y doy mi consentimiento para que Google utilice esta voz para crear un modelo de voz sintético.',
  },
  pt: {
    languageCode: 'pt-BR',
    script:
      'Eu sou o proprietário desta voz e concordo que o Google use esta voz para criar um modelo de voz sintética.',
  },
  fr: {
    languageCode: 'fr-FR',
    script:
      'Je suis le propriétaire de cette voix et je consens à ce que Google utilise cette voix pour créer un modèle de voix synthétique.',
  },
  de: {
    languageCode: 'de-DE',
    script:
      'Ich bin der Eigentümer dieser Stimme und stimme zu, dass Google diese Stimme verwendet, um ein synthetisches Stimmmodell zu erstellen.',
  },
  th: {
    languageCode: 'th-TH',
    script:
      'I am the owner of this voice and I consent to Google using this voice to create a synthetic voice model.',
  },
  ar: {
    languageCode: 'ar-XA',
    script:
      'I am the owner of this voice and I consent to Google using this voice to create a synthetic voice model.',
  },
  ja: {
    languageCode: 'ja-JP',
    script:
      '私はこの声の所有者であり、Googleがこの声を使用して合成音声モデルを作成することに同意します。',
  },
  ko: {
    languageCode: 'ko-KR',
    script:
      '저는 이 목소리의 소유자이며, Google이 이 목소리를 사용하여 합성 음성 모델을 만드는 데 동의합니다.',
  },
  zh: {
    languageCode: 'cmn-CN',
    script: '我是此声音的所有者，我同意 Google 使用此声音创建合成语音模型。',
  },
}

export function getGoogleVoiceCloneConsentForLocale(localeOrLang?: string | null): {
  languageCode: string
  script: string
} {
  const raw = (localeOrLang || 'en').trim().toLowerCase()
  const base = raw.split(/[-_]/)[0] || 'en'
  return (
    GOOGLE_VOICE_CLONE_CONSENT_SCRIPT_BY_LOCALE[base] ||
    GOOGLE_VOICE_CLONE_CONSENT_SCRIPT_BY_LOCALE.en
  )
}

export function resolveGoogleVoiceCloneLanguageCode(localeOrLang?: string | null): string {
  const raw = (localeOrLang || '').trim()
  if (/^[a-z]{2,3}-[A-Z]{2}$/.test(raw)) return raw
  return getGoogleVoiceCloneConsentForLocale(raw).languageCode
}
