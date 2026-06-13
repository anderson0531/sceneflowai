import type { CharacterWardrobe } from '@/types/vision'
import type { ScreenplayContext } from '@/lib/voiceRecommendation'
import { normalizeGender } from '@/lib/voiceRecommendation'

export type WardrobeVoiceGender = 'male' | 'female'

export interface WardrobeVoiceCharacterInput {
  wardrobes?: CharacterWardrobe[]
  defaultWardrobe?: string
  wardrobeAccessories?: string
}

export interface WardrobeVoiceAnalysisResult {
  gender: WardrobeVoiceGender
  apparentAge: string
  ethnicity?: string
  voiceDescription: string
  audioProfile: string
  confidence: 'vision'
}

/** Resolve wardrobes list including legacy defaultWardrobe synthesis. */
export function resolveCharacterWardrobes(
  character: WardrobeVoiceCharacterInput,
): CharacterWardrobe[] {
  if (character.wardrobes && character.wardrobes.length > 0) {
    return character.wardrobes
  }
  if (character.defaultWardrobe?.trim()) {
    return [
      {
        id: 'legacy-wardrobe',
        name: 'Default Outfit',
        description: character.defaultWardrobe,
        accessories: character.wardrobeAccessories,
        isDefault: true,
        createdAt: new Date().toISOString(),
      },
    ]
  }
  return []
}

/** Default wardrobe used for voice analysis (isDefault flag, else first with fullBodyUrl). */
export function getDefaultWardrobeForVoice(
  character: WardrobeVoiceCharacterInput,
): CharacterWardrobe | null {
  const wardrobes = resolveCharacterWardrobes(character)
  if (wardrobes.length === 0) return null

  const explicitDefault = wardrobes.find((w) => w.isDefault)
  if (explicitDefault) return explicitDefault

  const withTurnaround = wardrobes.find((w) => getWardrobeVoiceImageUrl(w))
  return withTurnaround ?? wardrobes[0] ?? null
}

/** Voice analysis requires the 2-row turnaround sheet URL. */
export function getWardrobeVoiceImageUrl(wardrobe: CharacterWardrobe | null | undefined): string | null {
  const url = wardrobe?.fullBodyUrl?.trim()
  return url && url.startsWith('http') ? url : null
}

export function getWardrobeVoiceImageForCharacter(
  character: WardrobeVoiceCharacterInput,
): { wardrobe: CharacterWardrobe; imageUrl: string } | null {
  const wardrobe = getDefaultWardrobeForVoice(character)
  if (!wardrobe) return null
  const imageUrl = getWardrobeVoiceImageUrl(wardrobe)
  if (!imageUrl) return null
  return { wardrobe, imageUrl }
}

export function buildWardrobeVoiceAnalysisPrompt(
  characterName: string,
  options?: {
    screenplayContext?: ScreenplayContext
    characterDescription?: string
  },
): string {
  const screenplay = options?.screenplayContext
  const screenplayLines: string[] = []
  if (screenplay?.genre) screenplayLines.push(`Genre: ${screenplay.genre}`)
  if (screenplay?.tone) screenplayLines.push(`Tone: ${screenplay.tone}`)
  if (screenplay?.setting) screenplayLines.push(`Setting: ${screenplay.setting}`)
  if (screenplay?.title) screenplayLines.push(`Project: ${screenplay.title}`)

  return `You are an expert voice casting director analyzing a character portrait reference image.

IMAGE:
The attached image is a single character portrait (identity reference). Infer voice, gender, age, and ethnicity from the FACE only — ignore clothing for vocal qualities.

CHARACTER: ${characterName}
${options?.characterDescription ? `Script context (disambiguation only): ${options.characterDescription}` : ''}
${screenplayLines.length > 0 ? `\nPRODUCTION CONTEXT:\n${screenplayLines.join('\n')}` : ''}

TASK:
From the portrait, infer how this character should sound in Gemini TTS and return a single JSON object.

REQUIREMENTS:
1. "gender" must be exactly "male" or "female" based on visible presentation in the portrait.
2. "apparentAge" — short phrase (e.g. "late 40s", "mid 20s").
3. "ethnicity" — optional, brief (e.g. "African American", "East Asian").
4. "voiceDescription" — 200–600 characters describing vocal casting for voice matching. Use archetype vocabulary: authoritative, corporate, warm, gravelly, crisp, professional, resonant, confident, articulate, steady, polished, engaging, deep, bright, gentle, energetic, etc.
5. "audioProfile" — 4–5 sentences, Director's Note / Audio Profile for Gemini TTS. Focus on tone, pitch, cadence, accent, texture, emotional delivery. Do NOT write dialogue.

OUTPUT: Return ONLY valid JSON, no markdown:
{
  "gender": "male",
  "apparentAge": "late 40s",
  "ethnicity": "optional string",
  "voiceDescription": "casting brief paragraph",
  "audioProfile": "Director's Note paragraph"
}`
}

export function parseWardrobeVoiceAnalysisJson(raw: string): WardrobeVoiceAnalysisResult | null {
  let cleaned = raw.trim()
  cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>
    const gender = normalizeGender(String(parsed.gender ?? ''))
    if (gender !== 'male' && gender !== 'female') return null

    const voiceDescription = String(parsed.voiceDescription ?? '').trim()
    const audioProfile = String(parsed.audioProfile ?? '').trim()
    if (voiceDescription.length < 20 || audioProfile.length < 20) return null

    const apparentAge = String(parsed.apparentAge ?? '').trim() || 'adult'
    const ethnicity = String(parsed.ethnicity ?? '').trim() || undefined

    return {
      gender,
      apparentAge,
      ethnicity,
      voiceDescription: voiceDescription.slice(0, 900),
      audioProfile: audioProfile.slice(0, 1200),
      confidence: 'vision',
    }
  } catch {
    return null
  }
}
