/**
 * Helpers for script location-version analysis — formats scene + beat
 * content and extracts lasting set-state changes (destruction, redress,
 * reversible set-piece transitions such as a door shutting, and a
 * wall-mounted instrument cracking or pegging).
 */

import { extractLocationResidentInstrumentPhrases } from '@/lib/vision/locationResidentInstruments'

export interface LocationAnalysisBeatInput {
  beatId?: string
  kind?: string
  actionDescription?: string
  description?: string
  action?: string
  line?: string
  frozenMoment?: string
  propInteraction?: string
  lightingAccent?: string
  blocking?: string
}

export interface LocationAnalysisSceneInput {
  sceneNumber: number
  heading?: string
  action?: string
  visualDescription?: string
  locationDescription?: string
  atmosphere?: string
  beats?: LocationAnalysisBeatInput[]
  segments?: Array<{
    segmentDirection?: { action?: string; visualDescription?: string }
    startFrameDescription?: string
    endFrameDescription?: string
  }>
}

/** Verbs/adjectives that indicate a lasting physical change to the set. */
export const LOCATION_STATE_KEYWORD_PATTERN =
  /\b(explod(?:e|es|ed|ing|sion)?|blast(?:ed|ing)?|shatter(?:s|ed|ing)?|collapse(?:s|d|ing)?|smash(?:es|ed|ing)?|wreck(?:s|ed|ing)?|destroy(?:s|ed|ing)?|demolish(?:es|ed|ing)?|flood(?:s|ed|ing)?|burn(?:s|ed|ing)?|engulf(?:s|ed|ing)?|debris|rubble|boarded(?:\s+up)?|overturn(?:s|ed|ing)?|cave[- ]?in|crater|blown(?:\s+(?:out|apart|open))?|implode(?:s|d|ing)?|scorch(?:ed|ing)?|charred|gutted|bullet[- ]?holes?|smash(?:ed)?\s+through)\b/i

/** Set-piece nouns so "explodes with anger" does not count as a location change. */
export const SET_PIECE_NOUN_PATTERN =
  /\b(doors?|windows?|walls?|ceilings?|roofs?|furniture|sofa|couch|table|chairs?|lights?|lamps?|chandeliers?|glass|pillars?|columns?|staircases?|stairs|fireplace|floors?|rooms?|set|building|house|storefront|facade|balcony|railing|beam|support|gates?)\b/i

const APERTURE_NOUN = '(?:doors?|windows?|gates?|hatches?)'
const APERTURE_ADJ = '(?:damn\\s+|goddamn\\s+|bloody\\s+|front\\s+|back\\s+|side\\s+|heavy\\s+)*'

/**
 * Door / window / gate opening or shutting — lasting set state, including
 * spoken commands ("Shut the damn door") that never use explode/shatter.
 */
export const REVERSIBLE_APERTURE_PATTERN = new RegExp(
  String.raw`\b(?:(?:shut|clos(?:e|es|ed|ing)|slam(?:s|med|ming)?|lock(?:s|ed|ing)?|unlock(?:s|ed|ing)?|open(?:s|ed|ing)?|swing(?:s|ing)?)\s+(?:the\s+)?${APERTURE_ADJ}${APERTURE_NOUN}|(?:the\s+)?${APERTURE_ADJ}${APERTURE_NOUN}\s+(?:is|are|stays?|remain(?:s)?)?\s*(?:shut|closed|open(?:ed)?|locked|unlocked|slammed))\b`,
  'i'
)

const LIGHT_NOUN = '(?:lights?|lamps?|chandeliers?)'
const LIGHT_ADJ = '(?:vault\\s+|room\\s+|house\\s+|practical\\s+|overhead\\s+|table\\s+)*'

/**
 * Practical fixtures going on/off. Mood "lighting" adjectives are not a match,
 * and a bare "light on" fragment is not a lasting change.
 */
export const PRACTICAL_LIGHTS_PATTERN = new RegExp(
  String.raw`\b(?:(?:kill|cut|douse|switch(?:es|ed)?\s+off)\s+(?:the\s+)?${LIGHT_ADJ}${LIGHT_NOUN}|(?:the\s+)?${LIGHT_ADJ}${LIGHT_NOUN}\s+(?:go(?:es|ne)?\s+(?:on|off|out)|(?:out|die|dies|died|dying|dead|blown)|switch(?:es|ed)?\s+(?:on|off)))\b`,
  'i'
)

const INSTRUMENT_NOUN = '(?:gauges?|galvanometers?|manometers?|barometers?|dials?)'

/**
 * A mounted instrument's glass cracking, or its needle pegging into the red.
 * "Cracked" is not a general destruction keyword — a cracked smile, or the
 * shattered glass of a framed photograph, is not this.
 */
export const INSTRUMENT_DAMAGE_PATTERN = new RegExp(
  String.raw`\b((?:the\s+)?(?:glass\s+face\s+of\s+(?:a\s+|an\s+|the\s+)?)?(?:(?:vintage|antique|brass|bronze|copper|steel|iron)\s+){0,3}(?:pressure\s+|steam\s+|vacuum\s+)?${INSTRUMENT_NOUN}(?:\s+glass)?(?:\s+(?!is\b|was\b|gets?\b|becomes?\b|cracked\b|cracks?\b)\S+){0,14}\s+(?:is\s+|was\s+|gets?\s+|becomes?\s+)?cracked(?:\s+down\s+the\s+middle)?|(?:the\s+)?(?:pressure\s+|steam\s+|vacuum\s+)?${INSTRUMENT_NOUN}\s+glass\s+cracks?(?:\s+down\s+the\s+middle)?)\b`,
  'i'
)

export const INSTRUMENT_NEEDLE_RED_PATTERN =
  /\b(needle\s+(?:pegs?|pegged|pins?|pinned)\s+into\s+the\s+red(?:\s+compression\s+arc)?)\b/i

const PHOTO_GLASS_NOUN = /\b(?:photos?|photographs?|pictures?|portraits?|snapshots?|framed\s+photo)\b/i
const ARCHITECTURAL_DAMAGE_NOUN = /\b(?:doors?|windows?|walls?|hatches?|gates?|floors?|ceilings?)\b/i

export function resolveBeatActionText(beat: LocationAnalysisBeatInput): string {
  return (
    beat.actionDescription?.trim() ||
    beat.description?.trim() ||
    beat.action?.trim() ||
    ''
  )
}

export function beatSetStateText(beat: LocationAnalysisBeatInput): string {
  return [
    resolveBeatActionText(beat),
    beat.line,
    beat.frozenMoment,
    beat.propInteraction,
    beat.blocking,
    beat.lightingAccent,
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ')
}

/** Shattered glass of a photograph is a handheld prop, not the set. */
export function isHandheldPhotoGlassDamage(text: string): boolean {
  const trimmed = (text || '').trim()
  if (!trimmed || !PHOTO_GLASS_NOUN.test(trimmed)) return false
  if (extractLocationResidentInstrumentPhrases(trimmed).length > 0) return false
  if (ARCHITECTURAL_DAMAGE_NOUN.test(trimmed)) return false
  return true
}

export function beatHasInstrumentDamage(text: string): boolean {
  const trimmed = (text || '').trim()
  if (!trimmed) return false
  if (INSTRUMENT_DAMAGE_PATTERN.test(trimmed)) return true
  return (
    INSTRUMENT_NEEDLE_RED_PATTERN.test(trimmed) &&
    extractLocationResidentInstrumentPhrases(trimmed).length > 0
  )
}

export function beatHasLocationStateChange(text: string): boolean {
  const trimmed = (text || '').trim()
  if (!trimmed) return false
  if (beatHasInstrumentDamage(trimmed)) return true
  if (REVERSIBLE_APERTURE_PATTERN.test(trimmed) || PRACTICAL_LIGHTS_PATTERN.test(trimmed)) {
    return true
  }
  if (isHandheldPhotoGlassDamage(trimmed)) return false
  return LOCATION_STATE_KEYWORD_PATTERN.test(trimmed) && SET_PIECE_NOUN_PATTERN.test(trimmed)
}

export function formatSceneForLocationVersionAnalysis(
  scene: LocationAnalysisSceneInput,
  locationName: string
): string {
  const parts: string[] = []
  parts.push(`Scene ${scene.sceneNumber}:`)
  if (scene.heading) parts.push(`Heading: ${scene.heading}`)
  parts.push(`Location: ${locationName}`)
  if (scene.locationDescription) parts.push(`Set description: ${scene.locationDescription}`)
  if (scene.atmosphere) parts.push(`Atmosphere: ${scene.atmosphere}`)
  if (scene.action) parts.push(`Action: ${scene.action}`)
  if (scene.visualDescription) parts.push(`Visual: ${scene.visualDescription}`)

  const beats = scene.beats
  if (Array.isArray(beats) && beats.length > 0) {
    parts.push('Beats (in order — lasting set changes in an earlier beat must persist in later beats):')
    beats.forEach((beat, index) => {
      const action = resolveBeatActionText(beat)
      const line = beat.line?.trim()
      const frozen = beat.frozenMoment?.trim()
      const props = beat.propInteraction?.trim()
      const lighting = beat.lightingAccent?.trim()
      const chunks = [
        action ? `action: ${action}` : '',
        line ? `line: ${line}` : '',
        frozen ? `frozenMoment: ${frozen}` : '',
        props ? `propInteraction: ${props}` : '',
        lighting ? `lightingAccent: ${lighting}` : '',
      ].filter(Boolean)
      if (chunks.length === 0) return
      const id = beat.beatId ? ` id=${beat.beatId}` : ''
      parts.push(`[Beat ${index}${id}] ${chunks.join(' | ')}`)
    })
  }

  const segments = scene.segments
  if (Array.isArray(segments) && segments.length > 0) {
    for (const seg of segments) {
      const segParts = [
        seg.segmentDirection?.action,
        seg.segmentDirection?.visualDescription,
        seg.startFrameDescription,
        seg.endFrameDescription,
      ].filter(Boolean) as string[]
      for (const part of segParts) {
        parts.push(`[Segment] ${part.trim()}`)
      }
    }
  }

  return parts.join('\n')
}

export interface LocationStateBeatHit {
  sceneNumber: number
  beatIndex: number
  beatId?: string
  notes: string
}

/** Beats whose action, dialogue, or frozen moment describe a lasting set-piece change. */
export function extractLocationStateHitsFromScene(
  scene: LocationAnalysisSceneInput
): LocationStateBeatHit[] {
  const hits: LocationStateBeatHit[] = []
  const beats = scene.beats ?? []
  beats.forEach((beat, beatIndex) => {
    const text = beatSetStateText(beat)
    if (!beatHasLocationStateChange(text)) return
    const distilled = distillLocationStateNotesFromText(text)
    if (!distilled) return
    hits.push({
      sceneNumber: scene.sceneNumber,
      beatIndex,
      beatId: beat.beatId,
      notes: distilled,
    })
  })
  return hits
}

/** Distill set-state phrases from raw beat text for image generation. */
export function distillLocationStateNotesFromText(text: string): string | undefined {
  if (!text?.trim() || !beatHasLocationStateChange(text)) return undefined

  const phrases: string[] = []
  const patterns: Array<{ re: RegExp }> = [
    { re: INSTRUMENT_DAMAGE_PATTERN },
    { re: INSTRUMENT_NEEDLE_RED_PATTERN },
    { re: /(?:the\s+)?(?:front\s+)?doors?\s+(?:explod(?:e|es|ed)|blast(?:s|ed)|blow(?:s|n)\s+(?:out|apart|open)|shatter(?:s|ed))/i },
    { re: /(?:the\s+)?windows?\s+(?:shatter(?:s|ed)|explod(?:e|es|ed)|blow(?:s|n)\s+out)/i },
    { re: /(?:the\s+)?walls?\s+(?:collapse(?:s|d)|explod(?:e|es|ed)|cave[- ]?in)/i },
    { re: /(?:the\s+)?(?:room|set|building|house|storefront)\s+(?:is\s+)?(?:flooded|burning|burned|engulfed|gutted|wrecked|destroyed)/i },
    { re: /debris|rubble|boarded(?:\s+up)?|overturned\s+furniture|scorch(?:ed)?|charred|bullet[- ]?holes?/i },
    { re: REVERSIBLE_APERTURE_PATTERN },
    { re: PRACTICAL_LIGHTS_PATTERN },
  ]

  for (const { re } of patterns) {
    if (
      re === INSTRUMENT_NEEDLE_RED_PATTERN &&
      extractLocationResidentInstrumentPhrases(text).length === 0
    ) {
      continue
    }
    const match = text.match(re)
    if (match) phrases.push((match[1] || match[0]).trim())
  }

  if (phrases.length === 0) {
    const sentences = text.split(/[.!?]+/).filter((s) => beatHasLocationStateChange(s))
    phrases.push(...sentences.map((s) => s.trim()).filter(Boolean))
  }

  const unique = [...new Set(phrases.map((p) => p.trim()).filter(Boolean))]
  return unique.length > 0 ? unique.join('; ') : undefined
}
