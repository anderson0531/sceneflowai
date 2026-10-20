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
  /\b(explod(?:e|es|ed|ing|sion)?|blast(?:ed|ing)?|shatter(?:s|ed|ing)?|collapse(?:s|d|ing)?|smash(?:es|ed|ing)?|wreck(?:s|ed|ing)?|destroy(?:s|ed|ing)?|demolish(?:es|ed|ing)?|flood(?:s|ed|ing)?|burn(?:s|ed|ing)?|engulf(?:s|ed|ing)?|debris|rubble|boarded(?:\s+up)?|overturn(?:s|ed|ing)?|cave[- ]?in|crater|blown(?:\s+(?:out|apart|open))?|implode(?:s|d|ing)?|scorch(?:ed|ing)?|charred|gutted|bullet[- ]?holes?|smash(?:ed)?\s+through|slash(?:es|ed)?|scratch(?:es|ed)?|shear(?:s|ed)?(?:\s+open)?|coal\s+silt|thick\s+layer\s+of\s+(?:black\s+)?(?:coal\s+)?(?:silt|soot|ash|debris|mud|dust)|rivets?\s+broken|broken\s+rivets?)\b/i

/** Set-piece nouns so "explodes with anger" does not count as a location change. */
export const SET_PIECE_NOUN_PATTERN =
  /\b(doors?|windows?|walls?|ceilings?|roofs?|furniture|sofa|couch|table|chairs?|lights?|lamps?|chandeliers?|glass|pillars?|columns?|staircases?|stairs|fireplace|floors?|rooms?|set|building|house|storefront|facade|balcony|railing|beam|support|gates?|slate\s+boards?|chalkboards?|blackboards?|seismographs?|hatch(?:es)?|chutes?)\b/i

const APERTURE_NOUN = '(?:doors?|windows?|gates?|hatch(?:es)?)'
const APERTURE_ADJ =
  '(?:damn\\s+|goddamn\\s+|bloody\\s+|front\\s+|back\\s+|side\\s+|heavy\\s+|overhead\\s+|eighteen[- ]inch\\s+|pneumatic\\s+|mail\\s+|dispatch\\s+|cast[- ]iron\\s+)*'

/**
 * Door / window / gate / hatch opening or shutting — lasting set state, including
 * spoken commands ("Shut the damn door") that never use explode/shatter.
 */
export const REVERSIBLE_APERTURE_PATTERN = new RegExp(
  String.raw`\b(?:(?:shut|clos(?:e|es|ed|ing)|slam(?:s|med|ming)?|lock(?:s|ed|ing)?|unlock(?:s|ed|ing)?|open(?:s|ed|ing)?|swing(?:s|ing)?|shear(?:s|ed)?\s+open)\s+(?:the\s+)?${APERTURE_ADJ}${APERTURE_NOUN}|(?:the\s+)?${APERTURE_ADJ}${APERTURE_NOUN}\s+(?:is|are|stays?|remain(?:s)?)?\s*(?:sheared\s+open|shut|closed|open(?:ed)?|locked|unlocked|slammed))\b`,
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

const INSTRUMENT_NOUN =
  '(?:gauges?|galvanometers?|manometers?|barometers?|dials?|seismographs?|telegraphs?|oscilloscopes?|switchboards?)'

/**
 * A mounted instrument's glass cracking, smoked-paper drum scratching, or its needle pegging into the red.
 * "Cracked" is not a general destruction keyword — a cracked smile, or the
 * shattered glass of a framed photograph, is not this.
 */
export const INSTRUMENT_DAMAGE_PATTERN = new RegExp(
  String.raw`\b((?:the\s+)?(?:glass\s+face\s+of\s+(?:a\s+|an\s+|the\s+)?)?(?:(?:wall[- ]mounted|chute[- ]mounted|mounted|vintage|antique|brass|bronze|copper|steel|iron|acoustic|pneumatic)\s+){0,3}(?:pressure\s+|steam\s+|vacuum\s+|acoustic\s+)?${INSTRUMENT_NOUN}(?:'s\s+(?:smoked[- ]paper\s+)?drum|\s+glass)?(?:\s+(?!is\b|was\b|gets?\b|becomes?\b|cracked\b|cracks?\b|scratched\b)\S+){0,14}\s+(?:is\s+|was\s+|gets?\s+|becomes?\s+)?(?:heavily\s+)?(?:cracked(?:\s+down\s+the\s+middle)?|scratched(?:\s+with\s+[^.;]+)?)|(?:the\s+)?(?:pressure\s+|steam\s+|vacuum\s+|acoustic\s+)?${INSTRUMENT_NOUN}\s+glass\s+cracks?(?:\s+down\s+the\s+middle)?)\b`,
  'i'
)

export const INSTRUMENT_NEEDLE_RED_PATTERN =
  /\b(needle\s+(?:pegs?|pegged|pins?|pinned)\s+into\s+the\s+red(?:\s+compression\s+arc)?)\b/i

const PHOTO_GLASS_NOUN = /\b(?:photos?|photographs?|pictures?|portraits?|snapshots?|framed\s+photo)\b/i
const ARCHITECTURAL_DAMAGE_NOUN =
  /\b(?:doors?|windows?|walls?|hatch(?:es)?|gates?|floors?|ceilings?|slate\s+boards?|chalkboards?|seismographs?)\b/i

/**
 * Metaphorical character emotion / body expressions and human posture phrases
 * that mention "burning" or "floor/wall" without altering the physical set.
 * E.g. "Piper leaning forward from the floor, arm outstretched with the canister, eyes burning with intensity"
 */
const CHARACTER_METAPHOR_PATTERN =
  /\b(?:(?:eyes?|gaze|stare|cheeks?|face|skin|chest|lungs?|heart|voice|breath|muscles?|veins?|mind|soul|spirit|anger|rage|fury|intensity)\s+(?:is\s+|are\s+|were\s+|was\s+)?(?:burning|burns|burned|blazing|exploding|explodes|shattering|shattered|collapsing|cracking|on\s+fire)|(?:burning|exploding|blazing|shattering)\s+with\s+(?:intensity|anger|rage|fear|grief|determination|panic|fever|desperation|passion))\b/gi

const HUMAN_POSTURE_ON_SET_PATTERN =
  /\b(?:leaning|leant|rising|pushing|pulling|getting|standing|kneeling|sitting|crouching|lying|sprawled|crawling|rolling|stepping|walking|running|backing|slumping|falling|picking\s+up|reaching)\s+(?:[a-z]+\s+){0,3}(?:from|off|on|onto|across|against|toward|towards|near|by|at)\s+(?:the\s+|a\s+|an\s+)?(?:damp\s+|stone\s+|flagstone\s+|wooden\s+|concrete\s+|dirt\s+|cold\s+)*(?:floor|floors|wall|walls|door|doorway|ground|stairs|steps|table|desk|bench|chair)\b/gi

const CHARACTER_BLOCKING_CLAUSE_PATTERN =
  /\b(?:arm\s+outstretched|hand\s+outstretched|eyes\s+burning|with\s+the\s+canister|clutches\s+the|holding\s+the\s+canister|leaning\s+forward\s+from\s+the\s+floor)\b/i

export function stripCharacterMetaphorsAndPosture(text: string): string {
  if (!text) return ''
  return text
    .replace(CHARACTER_METAPHOR_PATTERN, ' ')
    .replace(HUMAN_POSTURE_ON_SET_PATTERN, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function resolveBeatActionText(beat: LocationAnalysisBeatInput): string {
  return (
    beat.actionDescription?.trim() ||
    beat.description?.trim() ||
    beat.action?.trim() ||
    ''
  )
}

/**
 * Only scan beat fields that can describe set state (action, dialogue commands,
 * frozenMoment, lightingAccent). Never scan `blocking` or `propInteraction`,
 * which describe character posture and handheld props.
 */
export function beatSetStateText(beat: LocationAnalysisBeatInput): string {
  return [
    resolveBeatActionText(beat),
    beat.line,
    beat.frozenMoment,
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
  const raw = (text || '').trim()
  if (!raw) return false
  const trimmed = stripCharacterMetaphorsAndPosture(raw)
  if (!trimmed) return false
  if (beatHasInstrumentDamage(trimmed)) return true
  if (REVERSIBLE_APERTURE_PATTERN.test(trimmed) || PRACTICAL_LIGHTS_PATTERN.test(trimmed)) {
    return true
  }
  if (isHandheldPhotoGlassDamage(trimmed)) return false
  if (
    CHARACTER_BLOCKING_CLAUSE_PATTERN.test(raw) &&
    !ARCHITECTURAL_DAMAGE_NOUN.test(trimmed)
  ) {
    return false
  }
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
    { re: /(?:the\s+)?(?:room|set|building|house|storefront|floor)\s+(?:is\s+)?(?:flooded|burning|burned|engulfed|gutted|wrecked|destroyed)/i },
    { re: /(?:(?:glass|splinters)\s+and\s+)?(?:debris|rubble|splinters)\s+(?:fills?|covers?|litters?|blankets?|across|on)\s+(?:the\s+)?[a-z]+(?:\s+[a-z]+)?/i },
    { re: /(?:windows?\s+(?:are\s+|is\s+)?boarded(?:\s+up)?|boarded(?:\s+up)?\s+windows?|overturned\s+furniture|furniture\s+(?:is\s+)?overturned|bullet[- ]?holes?\s+(?:in|across)\s+(?:the\s+)?[a-z]+)/i },
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

  // Never emit bare single-word fragments such as "debris" or "rubble".
  const unique = [
    ...new Set(
      phrases
        .map((p) => p.trim().replace(/^[.!;,\s]+|[.!;,\s]+$/g, ''))
        .filter((p) => Boolean(p) && /\s/.test(p))
    ),
  ]
  return unique.length > 0 ? unique.join('; ') : undefined
}
