/**
 * Default Microsoft Edge neural voices per language and gender.
 * Used when paid TTS (ElevenLabs / Google) quota is exhausted.
 */

export type EdgeVoiceGender = 'male' | 'female'

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

/** Resolve an Edge neural voice for a target language and optional character gender. */
export function resolveEdgeVoice(lang: string, gender?: string): string {
  const code = (lang || 'en').trim().toLowerCase().split('-')[0] || 'en'
  const voices = EDGE_VOICE_BY_LANG[code] ?? EDGE_VOICE_BY_LANG.en
  const inferred = inferGenderFromText(gender)
  if (inferred === 'female') return voices.female
  if (inferred === 'male') return voices.male
  return voices.male
}
