/**
 * Microsoft Edge neural voices for quota-exhausted TTS fallback.
 */

import type { EdgeVoiceConfig } from '@/types/vision'

export type EdgeVoiceGender = 'male' | 'female'

export type EdgeVoice = {
  id: string
  name: string
  gender: EdgeVoiceGender
  language: string
  description?: string
}

/** Default male/female pair per language for auto-selection. */
export const EDGE_VOICE_BY_LANG: Record<
  string,
  { male: string; female: string }
> = {
  en: { male: 'en-US-GuyNeural', female: 'en-US-JennyNeural' },
  hi: { male: 'hi-IN-MadhurNeural', female: 'hi-IN-SwaraNeural' },
  ar: { male: 'ar-SA-HamedNeural', female: 'ar-SA-ZariyahNeural' },
  es: { male: 'es-ES-AlvaroNeural', female: 'es-ES-ElviraNeural' },
  th: { male: 'th-TH-NiwatNeural', female: 'th-TH-PremwadeeNeural' },
  ja: { male: 'ja-JP-KeitaNeural', female: 'ja-JP-NanamiNeural' },
  zh: { male: 'zh-CN-YunxiNeural', female: 'zh-CN-XiaoxiaoNeural' },
}

/** Curated catalog for manual Edge fallback voice selection. */
export const EDGE_VOICES: EdgeVoice[] = [
  // English
  { id: 'en-US-GuyNeural', name: 'Guy (US)', gender: 'male', language: 'en', description: 'Warm, conversational American male.' },
  { id: 'en-US-JennyNeural', name: 'Jenny (US)', gender: 'female', language: 'en', description: 'Friendly, natural American female.' },
  { id: 'en-US-AriaNeural', name: 'Aria (US)', gender: 'female', language: 'en', description: 'Expressive American female, good for dialogue.' },
  { id: 'en-US-DavisNeural', name: 'Davis (US)', gender: 'male', language: 'en', description: 'Calm, steady American male.' },
  { id: 'en-US-AmberNeural', name: 'Amber (US)', gender: 'female', language: 'en', description: 'Bright, youthful American female.' },
  { id: 'en-US-AndrewNeural', name: 'Andrew (US)', gender: 'male', language: 'en', description: 'Confident American male.' },
  { id: 'en-GB-RyanNeural', name: 'Ryan (UK)', gender: 'male', language: 'en', description: 'British English male.' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia (UK)', gender: 'female', language: 'en', description: 'British English female.' },
  // Hindi
  { id: 'hi-IN-MadhurNeural', name: 'Madhur (Hindi)', gender: 'male', language: 'hi', description: 'Natural Hindi male voice.' },
  { id: 'hi-IN-SwaraNeural', name: 'Swara (Hindi)', gender: 'female', language: 'hi', description: 'Natural Hindi female voice.' },
  { id: 'hi-IN-AaravNeural', name: 'Aarav (Hindi)', gender: 'male', language: 'hi', description: 'Young Hindi male voice.' },
  { id: 'hi-IN-AnanyaNeural', name: 'Ananya (Hindi)', gender: 'female', language: 'hi', description: 'Young Hindi female voice.' },
  // Arabic
  { id: 'ar-SA-HamedNeural', name: 'Hamed (Arabic)', gender: 'male', language: 'ar', description: 'Saudi Arabic male.' },
  { id: 'ar-SA-ZariyahNeural', name: 'Zariyah (Arabic)', gender: 'female', language: 'ar', description: 'Saudi Arabic female.' },
  { id: 'ar-EG-ShakirNeural', name: 'Shakir (Egyptian)', gender: 'male', language: 'ar', description: 'Egyptian Arabic male.' },
  { id: 'ar-EG-SalmaNeural', name: 'Salma (Egyptian)', gender: 'female', language: 'ar', description: 'Egyptian Arabic female.' },
  // Spanish
  { id: 'es-ES-AlvaroNeural', name: 'Alvaro (Spain)', gender: 'male', language: 'es', description: 'Castilian Spanish male.' },
  { id: 'es-ES-ElviraNeural', name: 'Elvira (Spain)', gender: 'female', language: 'es', description: 'Castilian Spanish female.' },
  { id: 'es-MX-DaliaNeural', name: 'Dalia (Mexico)', gender: 'female', language: 'es', description: 'Mexican Spanish female.' },
  { id: 'es-MX-JorgeNeural', name: 'Jorge (Mexico)', gender: 'male', language: 'es', description: 'Mexican Spanish male.' },
  // Thai
  { id: 'th-TH-NiwatNeural', name: 'Niwat (Thai)', gender: 'male', language: 'th', description: 'Thai male voice.' },
  { id: 'th-TH-PremwadeeNeural', name: 'Premwadee (Thai)', gender: 'female', language: 'th', description: 'Thai female voice.' },
  // Japanese
  { id: 'ja-JP-KeitaNeural', name: 'Keita (Japanese)', gender: 'male', language: 'ja', description: 'Japanese male voice.' },
  { id: 'ja-JP-NanamiNeural', name: 'Nanami (Japanese)', gender: 'female', language: 'ja', description: 'Japanese female voice.' },
  { id: 'ja-JP-DaichiNeural', name: 'Daichi (Japanese)', gender: 'male', language: 'ja', description: 'Alternative Japanese male.' },
  { id: 'ja-JP-ShioriNeural', name: 'Shiori (Japanese)', gender: 'female', language: 'ja', description: 'Alternative Japanese female.' },
  // Chinese
  { id: 'zh-CN-YunxiNeural', name: 'Yunxi (Chinese)', gender: 'male', language: 'zh', description: 'Mandarin male voice.' },
  { id: 'zh-CN-XiaoxiaoNeural', name: 'Xiaoxiao (Chinese)', gender: 'female', language: 'zh', description: 'Mandarin female voice.' },
  { id: 'zh-CN-YunjianNeural', name: 'Yunjian (Chinese)', gender: 'male', language: 'zh', description: 'Alternative Mandarin male.' },
  { id: 'zh-CN-XiaoyiNeural', name: 'Xiaoyi (Chinese)', gender: 'female', language: 'zh', description: 'Alternative Mandarin female.' },
]

const FEMALE_HINTS =
  /\b(female|woman|girl|she|her|mother|daughter|sister|wife|mrs|ms|miss|lady|queen|actress|narrator\s+female)\b/i
const MALE_HINTS =
  /\b(male|man|boy|he|him|father|son|brother|husband|mr|sir|gentleman|king|actor|narrator\s+male)\b/i

function inferGenderFromText(gender?: string): EdgeVoiceGender | null {
  if (!gender || typeof gender !== 'string') return null
  const g = gender.trim().toLowerCase()
  if (!g) return null
  if (FEMALE_HINTS.test(g) || g === 'f' || g.startsWith('female')) return 'female'
  if (MALE_HINTS.test(g) || g === 'm' || g.startsWith('male')) return 'male'
  return null
}

function normalizeLangCode(lang?: string): string {
  return (lang || 'en').trim().toLowerCase().split('-')[0] || 'en'
}

/** Resolve an Edge neural voice for a target language and optional character gender. */
export function resolveEdgeVoice(
  lang: string,
  gender?: string | EdgeVoiceGender
): string {
  const code = normalizeLangCode(lang)
  const voices = EDGE_VOICE_BY_LANG[code] ?? EDGE_VOICE_BY_LANG.en
  if (gender === 'female') return voices.female
  if (gender === 'male') return voices.male
  const inferred = inferGenderFromText(gender)
  if (inferred === 'female') return voices.female
  if (inferred === 'male') return voices.male
  return voices.male
}

/** Infer gender from a stored voice display name, e.g. "Jenny (US)". */
function inferGenderFromEdgeVoiceName(voiceName?: string): EdgeVoiceGender | undefined {
  if (!voiceName?.trim()) return undefined
  const lower = voiceName.trim().toLowerCase()
  const fromCatalog = EDGE_VOICES.find((v) => {
    const token = v.name.toLowerCase().split(/\s+/)[0]
    return lower.includes(token)
  })
  return fromCatalog?.gender
}

export function getEdgeVoiceById(voiceId: string): EdgeVoice | undefined {
  return EDGE_VOICES.find((v) => v.id === voiceId)
}

export function getEdgeVoiceName(voiceId: string): string {
  return getEdgeVoiceById(voiceId)?.name ?? voiceId
}

export function listEdgeVoices(filters?: {
  lang?: string
  gender?: EdgeVoiceGender | 'all'
}): EdgeVoice[] {
  let result = [...EDGE_VOICES]
  if (filters?.lang) {
    const code = normalizeLangCode(filters.lang)
    result = result.filter((v) => v.language === code)
  }
  if (filters?.gender && filters.gender !== 'all') {
    result = result.filter((v) => v.gender === filters.gender)
  }
  return result
}

/** Parse language code from an Edge neural voice id, e.g. hi-IN-SwaraNeural → hi */
export function getEdgeVoiceLanguageFromId(voiceId: string): string | undefined {
  const trimmed = voiceId?.trim()
  if (!trimmed) return undefined
  const fromCatalog = getEdgeVoiceById(trimmed)?.language
  if (fromCatalog) return fromCatalog
  const match = trimmed.match(/^([a-z]{2})-[A-Z]{2}-/i)
  return match?.[1]?.toLowerCase()
}

export type EdgeVoiceCharacterLike = {
  edgeVoiceConfigByLang?: Record<string, EdgeVoiceConfig>
  /** @deprecated legacy single-language config — treated as en */
  edgeVoiceConfig?: EdgeVoiceConfig
}

/** Resolve stored Edge voice config for a target generation language. */
export function getEdgeVoiceConfigForLang(
  char: EdgeVoiceCharacterLike | null | undefined,
  lang: string
): EdgeVoiceConfig | undefined {
  if (!char) return undefined
  const code = normalizeLangCode(lang)
  const byLang = char.edgeVoiceConfigByLang?.[code]
  if (byLang?.voiceId?.trim()) {
    return {
      voiceId: byLang.voiceId.trim(),
      voiceName: byLang.voiceName?.trim() || getEdgeVoiceName(byLang.voiceId.trim()),
    }
  }
  if (code === 'en' && char.edgeVoiceConfig?.voiceId?.trim()) {
    return {
      voiceId: char.edgeVoiceConfig.voiceId.trim(),
      voiceName:
        char.edgeVoiceConfig.voiceName?.trim() ||
        getEdgeVoiceName(char.edgeVoiceConfig.voiceId.trim()),
    }
  }
  return undefined
}

/**
 * Best Edge voice config for synthesis: exact language first, then en, then any
 * stored voice (used for gender/locale swap when target lang has no explicit pick).
 */
export function getEdgeVoiceConfigForResolution(
  char: EdgeVoiceCharacterLike | null | undefined,
  lang: string
): EdgeVoiceConfig | undefined {
  const exact = getEdgeVoiceConfigForLang(char, lang)
  if (exact) return exact

  const byLang = char?.edgeVoiceConfigByLang
  if (byLang) {
    const enCfg = byLang.en
    if (enCfg?.voiceId?.trim()) {
      return {
        voiceId: enCfg.voiceId.trim(),
        voiceName: enCfg.voiceName?.trim() || getEdgeVoiceName(enCfg.voiceId.trim()),
      }
    }
    for (const cfg of Object.values(byLang)) {
      if (cfg?.voiceId?.trim()) {
        return {
          voiceId: cfg.voiceId.trim(),
          voiceName: cfg.voiceName?.trim() || getEdgeVoiceName(cfg.voiceId.trim()),
        }
      }
    }
  }

  if (char?.edgeVoiceConfig?.voiceId?.trim()) {
    return {
      voiceId: char.edgeVoiceConfig.voiceId.trim(),
      voiceName:
        char.edgeVoiceConfig.voiceName?.trim() ||
        getEdgeVoiceName(char.edgeVoiceConfig.voiceId.trim()),
    }
  }

  return undefined
}

function genderHintFromVoiceId(voiceId: string): EdgeVoiceGender | undefined {
  return getEdgeVoiceById(voiceId)?.gender
}

/** Prefer explicit character edgeVoiceConfig when locale matches; else auto-resolve. */
export function resolveEdgeVoiceForCharacter(params: {
  edgeVoiceConfig?: EdgeVoiceConfig | null
  gender?: string
  lang?: string
}): string {
  const targetLang = normalizeLangCode(params.lang)
  const explicit = params.edgeVoiceConfig?.voiceId?.trim()
  if (explicit) {
    const voiceLang = getEdgeVoiceLanguageFromId(explicit)
    if (voiceLang === targetLang) return explicit
    const genderHint: EdgeVoiceGender | undefined =
      genderHintFromVoiceId(explicit) ||
      inferGenderFromEdgeVoiceName(params.edgeVoiceConfig?.voiceName) ||
      inferGenderFromText(params.gender) ||
      undefined
    if (genderHint) return resolveEdgeVoice(targetLang, genderHint)
    return resolveEdgeVoice(targetLang, params.gender)
  }
  return resolveEdgeVoice(targetLang, params.gender)
}

export function resolveEdgeVoiceConfigForCharacter(params: {
  edgeVoiceConfig?: EdgeVoiceConfig | null
  gender?: string
  lang?: string
}): EdgeVoiceConfig {
  const voiceId = resolveEdgeVoiceForCharacter(params)
  const explicit = params.edgeVoiceConfig?.voiceId?.trim()
  const explicitLang = explicit ? getEdgeVoiceLanguageFromId(explicit) : undefined
  const targetLang = normalizeLangCode(params.lang)
  const voiceName =
    explicit && explicitLang === targetLang && params.edgeVoiceConfig?.voiceName?.trim()
      ? params.edgeVoiceConfig.voiceName.trim()
      : getEdgeVoiceName(voiceId)
  return { voiceId, voiceName }
}
