import { pickGeminiBaseVoice } from '@/lib/tts/pickGeminiBaseVoice'
import type { AcousticVoiceDnaPayload } from '@/models/ClientAssetSubmission'

const REGISTER_ORDER = ['low', 'low-mid', 'mid', 'mid-high', 'high'] as const
const WEIGHT_ORDER = ['light', 'medium', 'heavy'] as const

export interface ParsedEraCharacter {
  baseName: string
  age: number | null
}

/**
 * Parses era-tagged character names such as:
 *   "Robert (Age 74)" -> { baseName: "Robert", age: 74 }
 *   "Elena (Age 22)"  -> { baseName: "Elena", age: 22 }
 *   "Young Robert"    -> { baseName: "Robert", age: 22 }
 *   "Older Robert"    -> { baseName: "Robert", age: 68 }
 */
export function parseCharacterNameAndAge(
  rawName: string,
  explicitAge?: string | number | null
): ParsedEraCharacter {
  const cleaned = String(rawName || '').trim()
  let age: number | null = null

  const parenMatch = cleaned.match(/\(\s*(?:age\s*)?(\d{1,3})\s*(?:yrs?|years?)?\s*\)/i)
  if (parenMatch) {
    const parsed = Number(parenMatch[1])
    if (Number.isFinite(parsed) && parsed > 0 && parsed < 120) age = parsed
  }

  let baseName = cleaned
    .replace(/\(\s*(?:age\s*)?\d{1,3}\s*(?:yrs?|years?)?\s*\)/gi, '')
    .replace(/\(\s*(?:young|older|elderly|child|teen|adult|senior|present\s*day|19\d{2}s?|20\d{2}s?)\s*\)/gi, '')
    .replace(/^(?:young|older|elderly|little|teen|adult|senior)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (age === null && explicitAge !== undefined && explicitAge !== null) {
    const numMatch = String(explicitAge).match(/(\d{1,3})/)
    if (numMatch) {
      const parsed = Number(numMatch[1])
      if (Number.isFinite(parsed) && parsed > 0 && parsed < 120) age = parsed
    }
  }

  if (age === null) {
    if (/\b(?:child|kid|little)\b/i.test(cleaned)) age = 9
    else if (/\b(?:teen|teenage)\b/i.test(cleaned)) age = 16
    else if (/\b(?:young)\b/i.test(cleaned)) age = 24
    else if (/\b(?:elderly|senior|older)\b/i.test(cleaned)) age = 70
  }

  if (!baseName) baseName = cleaned
  return { baseName, age }
}

function ageBucketLabel(age: number): string {
  if (age < 13) return `child (~${age})`
  if (age < 20) return `late teens (~${age})`
  if (age < 30) return `mid 20s (~${age})`
  if (age < 40) return `30s (~${age})`
  if (age < 50) return `40s (~${age})`
  if (age < 62) return `50s (~${age})`
  if (age < 74) return `late 60s (~${age})`
  return `70s+ (~${age})`
}

function shiftRegister(
  current: AcousticVoiceDnaPayload['vocalAttributes']['register'],
  delta: number
): AcousticVoiceDnaPayload['vocalAttributes']['register'] {
  const idx = REGISTER_ORDER.indexOf(current)
  if (idx === -1) return current
  const next = Math.min(REGISTER_ORDER.length - 1, Math.max(0, idx + delta))
  return REGISTER_ORDER[next]
}

function shiftWeight(
  current: AcousticVoiceDnaPayload['vocalAttributes']['vocalWeight'],
  delta: number
): AcousticVoiceDnaPayload['vocalAttributes']['vocalWeight'] {
  const idx = WEIGHT_ORDER.indexOf(current)
  if (idx === -1) return current
  const next = Math.min(WEIGHT_ORDER.length - 1, Math.max(0, idx + delta))
  return WEIGHT_ORDER[next]
}

/**
 * Derives an era-calibrated Acoustic Voice DNA variant from a recorded master voice
 * (e.g., Grandpa Robert at Age 74 -> Robert at Age 25 for 1970s Veo & Gemini reenactments)
 * while strictly preserving the real subject's accent, warmth, and family identity.
 * Consumes ZERO saved provider voice slots!
 */
export function deriveEraAdjustedVoiceDna(input: {
  sourceDna: AcousticVoiceDnaPayload
  sourceAge: number | null
  targetAge: number | null
  targetName: string
}): AcousticVoiceDnaPayload {
  const { sourceDna, sourceAge, targetAge, targetName } = input
  const baseAttr = sourceDna.vocalAttributes

  const sAge = sourceAge ?? 68
  const tAge = targetAge ?? sAge
  const ageDelta = tAge - sAge // negative = younger variant, positive = older variant

  let register = baseAttr.register
  let vocalWeight = baseAttr.vocalWeight
  let wpm = baseAttr.wpm
  let timbre = baseAttr.timbre
  let cadence = baseAttr.cadence

  if (ageDelta <= -15) {
    // Younger reenactment variant (e.g., 74 -> 25): clearer, lighter, slightly brisker, zero aging rasp
    const step = ageDelta <= -35 ? 2 : 1
    register = shiftRegister(register, step)
    vocalWeight = shiftWeight(vocalWeight, -1)
    wpm = Math.min(185, Math.round(wpm * (ageDelta <= -35 ? 1.14 : 1.08)))
    timbre = timbre
      .replace(/\b(?:gravelly|weathered|raspy|aged|elderly|creaky|hoarse)\b/gi, 'clear')
      .replace(/\s+/g, ' ')
      .trim()
    if (!/youthful|clear|fresh|smooth/i.test(timbre)) {
      timbre = `clearer, youthful ${timbre}`
    }
    cadence = cadence.replace(/\b(?:slow|unhurried|deliberate)\b/gi, 'lively, natural').trim()
  } else if (ageDelta >= 15) {
    // Older variant (e.g., 30 -> 70): gently deeper, warmer, slightly more measured
    register = shiftRegister(register, -1)
    vocalWeight = shiftWeight(vocalWeight, 1)
    wpm = Math.max(95, Math.round(wpm * 0.92))
    if (!/warm|seasoned|weathered|resonant/i.test(timbre)) {
      timbre = `warmer, seasoned ${timbre}`
    }
  }

  const targetAgeLabel = ageBucketLabel(tAge)
  const vocalAttributes: AcousticVoiceDnaPayload['vocalAttributes'] = {
    ...baseAttr,
    register,
    vocalWeight,
    timbre: timbre.slice(0, 140),
    cadence: cadence.slice(0, 120),
    wpm,
  }

  const voiceDesignPrompt = [
    `${targetAgeLabel} ${sourceDna.gender || 'adult'},`,
    `${register} register, ${vocalWeight} vocal weight,`,
    `${vocalAttributes.timbre}, ${vocalAttributes.accent} accent,`,
    `${vocalAttributes.cadence} (~${wpm} WPM), ${vocalAttributes.tone}.`,
  ]
    .join(' ')
    .slice(0, 285)

  const veoVoiceCue =
    `${targetAgeLabel} ${sourceDna.gender || 'speaker'} with ${vocalAttributes.timbre}, ` +
    `${vocalAttributes.accent} accent, ${vocalAttributes.cadence} (~${wpm} WPM), preserving the narrator's family accent and warmth.`

  let recommendedGeminiBaseVoice = sourceDna.recommendedGeminiBaseVoice
  try {
    const picked = pickGeminiBaseVoice(voiceDesignPrompt, {
      gender: sourceDna.gender,
      age: tAge,
      name: targetName,
      vocalAttributes,
    })
    recommendedGeminiBaseVoice = picked.voiceId
  } catch {
    // Keep source base voice fallback
  }

  return {
    summary: `${targetAgeLabel} era-matched · ${vocalAttributes.timbre} · ${vocalAttributes.accent} · ~${wpm} WPM`.slice(
      0,
      160
    ),
    gender: sourceDna.gender,
    apparentAge: targetAgeLabel,
    vocalAttributes,
    voiceDesignPrompt,
    veoVoiceCue: veoVoiceCue.slice(0, 240),
    recommendedGeminiBaseVoice,
  }
}

/**
 * Given a promoted master character voice (e.g. "Robert (Age 74)"), propagates
 * era-calibrated Acoustic Voice DNA to all sibling age variants in `characters`
 * (e.g. "Robert (Age 25)", "Robert (Age 45)") that do not already have their own
 * recorded voice sample.
 */
export function propagateEraVoiceDnaToSiblingCharacters(
  characters: Array<Record<string, any>>,
  sourceCharacterIndex: number,
  sourceDna: AcousticVoiceDnaPayload
): { characters: Array<Record<string, any>>; updatedSiblingNames: string[] } {
  const sourceChar = characters[sourceCharacterIndex]
  if (!sourceChar) return { characters, updatedSiblingNames: [] }

  const sourceParsed = parseCharacterNameAndAge(String(sourceChar.name || ''), sourceChar.age)
  if (!sourceParsed.baseName) return { characters, updatedSiblingNames: [] }

  const sourceKey = sourceParsed.baseName.toLowerCase()
  const updatedSiblingNames: string[] = []

  const nextChars = characters.map((char, idx) => {
    if (idx === sourceCharacterIndex) return char
    // Never overwrite a character that already has its own direct voice recording or custom clone
    if (char.googleVoiceCloningKey || char.voiceReferenceAudioUrl) return char

    const parsed = parseCharacterNameAndAge(String(char.name || ''), char.age)
    if (parsed.baseName.toLowerCase() !== sourceKey) return char

    const derived = deriveEraAdjustedVoiceDna({
      sourceDna,
      sourceAge: sourceParsed.age,
      targetAge: parsed.age,
      targetName: String(char.name || sourceParsed.baseName),
    })

    updatedSiblingNames.push(String(char.name || parsed.baseName))
    return {
      ...char,
      voiceAcousticDna: derived,
      voiceDesignPrompt: derived.voiceDesignPrompt,
      veoVoiceCue: derived.veoVoiceCue,
      voiceDescription: char.voiceDescription || derived.summary,
      vocalAttributes: derived.vocalAttributes,
      voiceProvider: 'google',
      voiceId: derived.recommendedGeminiBaseVoice || char.voiceId,
      voiceName: `${String(char.name || parsed.baseName)} (Era Voice DNA)`,
      voiceDerivedFromCharacterId: String(sourceChar.id || ''),
    }
  })

  return { characters: nextChars, updatedSiblingNames }
}
