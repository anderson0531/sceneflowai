/**
 * Whether a generated still used the plates that were sent with it.
 *
 * An image coming back is not a match. Identity and picture-prop plates are
 * scored once, after upload, and the band is what the still light shows.
 * A parse failure is not evidence of a miss — the frame stays unchecked.
 */

import { generateWithVision } from '@/lib/vertexai/gemini'
import { safeParseJsonFromText } from '@/lib/safeJson'
import { classifyShotScale, type LikenessShotScale } from '@/lib/imagen/likenessMismatch'
import { isPictureProp } from '@/lib/imagen/pictureProp'
import { fetchReferenceImageAsBase64 } from '@/lib/storage/fetchReferenceImage'
import { LIKENESS_VALIDATION_MIN_RESERVE_MS } from '@/lib/scene/sceneImageTimeBudget'

export type ReferenceAdherenceBand = 'pass' | 'drift' | 'miss'

export interface ReferenceAdherenceResult {
  band: ReferenceAdherenceBand
  reason: string
}

export interface ReferenceAdherencePlate {
  role: 'identity' | 'picture'
  name: string
  imageUrl: string
}

const MAX_IDENTITY_PLATES = 1
const MAX_PICTURE_PLATES = 2

export const REFERENCE_ADHERENCE_VISION_OPTIONS = {
  temperature: 0.2,
  timeoutMs: LIKENESS_VALIDATION_MIN_RESERVE_MS,
  maxRetries: 0,
  thinkingLevel: 'minimal' as const,
}

const BANDS: ReferenceAdherenceBand[] = ['pass', 'drift', 'miss']

const BAND_ALIASES: Record<string, ReferenceAdherenceBand> = {
  match: 'pass',
  ok: 'pass',
  success: 'pass',
  partial: 'drift',
  yellow: 'drift',
  fail: 'miss',
  failed: 'miss',
  red: 'miss',
}

export function normalizeReferenceAdherenceBand(raw: unknown): ReferenceAdherenceBand | undefined {
  if (typeof raw !== 'string') return undefined
  const value = raw.trim().toLowerCase()
  if (!value) return undefined
  if ((BANDS as string[]).includes(value)) return value as ReferenceAdherenceBand
  return BAND_ALIASES[value]
}

/** Identity headshot plus photograph props. Furniture and wardrobe stay out. */
export function selectReferenceAdherencePlates(input: {
  identities?: Array<{ name?: string | null; imageUrl?: string | null }>
  objects?: Array<{ name?: string | null; description?: string | null; imageUrl?: string | null }>
}): ReferenceAdherencePlate[] {
  const plates: ReferenceAdherencePlate[] = []

  for (const identity of input.identities ?? []) {
    if (plates.filter((plate) => plate.role === 'identity').length >= MAX_IDENTITY_PLATES) break
    const name = identity.name?.trim()
    const imageUrl = identity.imageUrl?.trim()
    if (!name || !imageUrl) continue
    plates.push({ role: 'identity', name, imageUrl })
  }

  for (const object of input.objects ?? []) {
    if (plates.filter((plate) => plate.role === 'picture').length >= MAX_PICTURE_PLATES) break
    const name = object.name?.trim() || ''
    const imageUrl = object.imageUrl?.trim()
    if (!imageUrl || !isPictureProp(name, object.description)) continue
    plates.push({ role: 'picture', name: name || 'photograph', imageUrl })
  }

  return plates
}

function clipReason(reason: string, band: ReferenceAdherenceBand): string {
  const text = reason.replace(/\s+/g, ' ').trim()
  if (text) return text.slice(0, 240)
  if (band === 'miss') return 'A sent reference plate was not used.'
  if (band === 'drift') return 'A photograph in the still does not match its plate.'
  return 'The sent reference plates were used.'
}

export function parseReferenceAdherenceResponse(raw: unknown): ReferenceAdherenceResult | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const record = raw as Record<string, unknown>
  const band = normalizeReferenceAdherenceBand(record.band)
  if (!band) return undefined
  const reason = typeof record.reason === 'string' ? record.reason : ''
  return { band, reason: clipReason(reason, band) }
}

function scaleLine(scale: LikenessShotScale): string {
  if (scale === 'wide') {
    return 'SHOT SCALE: wide. The face may be too small to judge. Do not call the actor a different person unless skin tone alone proves it. Judge picture props normally.'
  }
  if (scale === 'close') {
    return 'SHOT SCALE: close-up. The face and any held photograph are large enough to judge.'
  }
  if (scale === 'medium') {
    return 'SHOT SCALE: medium. Face and held photographs are assessable. Do not require pore-level detail.'
  }
  return 'SHOT SCALE: unstated. Judge only what is visible. If the face is too small to compare, do not treat that as a miss.'
}

function buildAdherencePrompt(plates: ReferenceAdherencePlate[], shotType?: string | null): string {
  const lines = plates.map((plate, index) => {
    const imageNumber = index + 2
    if (plate.role === 'identity') {
      return `IMAGE ${imageNumber}: IDENTITY of ${plate.name}. The actor in the still must be this person.`
    }
    return `IMAGE ${imageNumber}: PICTURE PROP "${plate.name}". This is a photograph. The picture inside it must match this plate. Anyone shown belongs only inside that photograph, not as a person standing in the room.`
  })

  return `Compare IMAGE 1, the generated film still, with the reference plates that follow.

${lines.join('\n')}

${scaleLine(classifyShotScale(shotType))}

Choose exactly one band:
- "miss": the actor is plainly a different person, OR someone who belongs only inside a picture-prop plate is standing in the room, OR a held or displayed photograph is a different picture from its plate.
- "drift": the photograph object is present, but the picture inside it does not match the plate.
- "pass": every sent plate was used. The actor is the same person, and each picture matches its plate.

Hair, age, or wardrobe drift on the same face is "pass". An unreadable face on a wide shot is not a miss.

Respond in JSON only:
{
  "band": "pass" | "drift" | "miss",
  "reason": "one sentence"
}`
}

export async function scoreReferenceAdherence(input: {
  generatedImageUrl: string
  plates: ReferenceAdherencePlate[]
  shotType?: string | null
}): Promise<ReferenceAdherenceResult | null> {
  if (input.plates.length === 0) return null

  const [generated, ...plates] = await Promise.all([
    fetchReferenceImageAsBase64(input.generatedImageUrl, {
      label: 'generated frame',
      timeoutMs: LIKENESS_VALIDATION_MIN_RESERVE_MS,
    }),
    ...input.plates.map((plate) =>
      fetchReferenceImageAsBase64(plate.imageUrl, {
        label: plate.name,
        timeoutMs: LIKENESS_VALIDATION_MIN_RESERVE_MS,
      })
    ),
  ])

  const parts = [
    { inlineData: { data: generated.base64, mimeType: generated.mimeType } },
    ...plates.map((plate) => ({
      inlineData: { data: plate.base64, mimeType: plate.mimeType },
    })),
    { text: buildAdherencePrompt(input.plates, input.shotType) },
  ]

  const result = await generateWithVision(parts, REFERENCE_ADHERENCE_VISION_OPTIONS)
  let parsed: unknown
  try {
    parsed = safeParseJsonFromText(result.text)
  } catch (error) {
    console.error(
      '[Reference Adherence] could not parse validator response:',
      error instanceof Error ? error.message : error
    )
    return null
  }
  return parseReferenceAdherenceResponse(parsed) ?? null
}
