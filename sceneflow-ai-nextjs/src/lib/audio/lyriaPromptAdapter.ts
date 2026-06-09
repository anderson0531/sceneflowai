/**
 * Adapts scene music descriptions for Google Lyria (lyria-002).
 * Lyria expects short instrumental prompts: [genre] + [mood] + [instruments] + [tempo].
 * Long visual-sync spotting sheets often trigger recitation (copyright-similarity) blocks.
 */

const MAX_LYRIA_WORDS = 30

const VISUAL_SYNC_PATTERNS = [
  /\bas the\b[^.]*\./gi,
  /\bwhen\b[^.]*\./gi,
  /\bduring the\b[^.]*\./gi,
  /\bthe music peaks as\b[^.]*\./gi,
  /\bslowly fading into\b[^.]*\./gi,
  /\bis revealed\b[^.]*\./gi,
  /\btakes over\b[^.]*\./gi,
]

const TITLE_PATTERNS = [
  /\btitle\s+['"][^'"]+['"]\s+appears\b/gi,
  /['"][^'"]{2,60}['"]/g,
  /\btitle\s+card\b/gi,
]

const MUSICAL_TERMS =
  /\b(synth|pad|pads|arpeggio|arpeggios|piano|guitar|strings|orchestral|orchestra|electronic|ambient|beat|beats|tempo|melody|melodies|crescendo|chord|chords|percussion|drums|bass|cello|violin|brass|woodwind|harp|organ|synthwave|techno|house|jazz|blues|rock|folk|classical|cinematic|ethereal|ominous|hopeful|warm|cold|dark|bright|upbeat|melancholic|suspenseful|driving|pulsing|rhythmic|layered|digital|atmospheric|resonant|shimmering|sustained|harmonious|moderate|fast|slow|building|swelling|intense|subtle|high-frequency|low-frequency)\b/gi

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return words.join(' ')
  return words.slice(0, maxWords).join(' ')
}

function stripVisualSyncNarrative(text: string): string {
  let result = text
  for (const pattern of VISUAL_SYNC_PATTERNS) {
    result = result.replace(pattern, ' ')
  }
  return result.replace(/\s+/g, ' ').trim()
}

function stripTitles(text: string): string {
  let result = text
  for (const pattern of TITLE_PATTERNS) {
    result = result.replace(pattern, ' ')
  }
  return result.replace(/\s+/g, ' ').trim()
}

function extractMusicalTokens(text: string): string[] {
  const matches = text.match(MUSICAL_TERMS) ?? []
  const seen = new Set<string>()
  const tokens: string[] = []
  for (const match of matches) {
    const lower = match.toLowerCase()
    if (!seen.has(lower)) {
      seen.add(lower)
      tokens.push(lower)
    }
  }
  return tokens
}

function ensureInstrumentalSuffix(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('instrumental') || lower.includes('no vocals') || lower.includes('no lyrics')) {
    return text
  }
  return `${text}, instrumental only`
}

function needsCinematicPrefix(text: string): boolean {
  const lower = text.toLowerCase()
  return !(
    lower.includes('cinematic') ||
    lower.includes('score') ||
    lower.includes('soundtrack') ||
    lower.includes('ambient') ||
    lower.includes('music')
  )
}

/**
 * Convert a long or narrative music description into a Lyria-friendly short prompt.
 */
export function adaptPromptForLyria(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    return 'Cinematic instrumental score, ambient electronic pads, moderate tempo, instrumental only'
  }

  // Already short and non-narrative — light touch only
  if (wordCount(trimmed) <= 22 && !/\b(as the|when|during the|peaks as)\b/i.test(trimmed)) {
    const cleaned = stripTitles(trimmed)
    const result = wordCount(cleaned) > 0 ? cleaned : trimmed
    return ensureInstrumentalSuffix(
      needsCinematicPrefix(result) ? `Cinematic instrumental score, ${result}` : result
    )
  }

  let working = stripTitles(trimmed)
  working = stripVisualSyncNarrative(working)

  const tokens = extractMusicalTokens(working)
  let core: string

  if (tokens.length >= 3) {
    const genre =
      tokens.find((t) =>
        ['electronic', 'orchestral', 'cinematic', 'ambient', 'classical', 'jazz', 'rock'].includes(t)
      ) ?? 'cinematic'
    const mood =
      tokens.find((t) =>
        [
          'ethereal',
          'ominous',
          'hopeful',
          'warm',
          'cold',
          'dark',
          'melancholic',
          'suspenseful',
          'upbeat',
          'intense',
        ].includes(t)
      ) ?? 'atmospheric'
    const instruments = tokens
      .filter((t) =>
        [
          'synth',
          'pad',
          'pads',
          'piano',
          'strings',
          'beat',
          'beats',
          'orchestra',
          'guitar',
          'drums',
          'bass',
          'arpeggio',
          'arpeggios',
        ].includes(t)
      )
      .slice(0, 4)
    const tempo =
      tokens.find((t) => ['fast', 'slow', 'moderate', 'driving', 'pulsing', 'building'].includes(t)) ??
      'moderate'

    const instrumentPhrase =
      instruments.length > 0 ? instruments.join(' and ') : 'layered synthesis'
    core = `Cinematic ${genre} score, ${mood} ${instrumentPhrase}, ${tempo} tempo`
  } else if (working.length > 0) {
    core = needsCinematicPrefix(working)
      ? `Cinematic instrumental score, ${working}`
      : working
  } else {
    core = 'Cinematic instrumental score, ethereal electronic pads and pulsing beat'
  }

  return ensureInstrumentalSuffix(truncateWords(core.replace(/\s+/g, ' ').trim(), MAX_LYRIA_WORDS))
}

/**
 * Progressive fallback prompts when Lyria blocks with recitation errors.
 */
export function buildLyriaFallbackPrompts(raw: string): string[] {
  const adapted = adaptPromptForLyria(raw)
  const tokens = extractMusicalTokens(raw)

  const genre =
    tokens.find((t) => ['electronic', 'orchestral', 'ambient', 'cinematic'].includes(t)) ?? 'electronic'
  const mood =
    tokens.find((t) => ['ethereal', 'hopeful', 'ominous', 'warm', 'cold', 'dark'].includes(t)) ??
    'atmospheric'

  const simplified = `Cinematic ${genre} instrumental, ${mood} mood, moderate tempo, instrumental only`
  const generic =
    'Cinematic instrumental score, ambient electronic pads, soft rhythmic pulse, moderate tempo, instrumental only'

  const fallbacks = [simplified, generic]
  return fallbacks.filter((p) => p !== adapted)
}

/** True when Vertex Lyria response indicates recitation / copyright-similarity block. */
export function isLyriaRecitationError(body: string): boolean {
  const lower = body.toLowerCase()
  return lower.includes('recitation') || lower.includes('blocked by recitation checks')
}

export const LYRIA_RECITATION_USER_MESSAGE =
  'Lyria blocked this music as too similar to existing copyrighted audio. Try a shorter, generic instrumental description (genre, mood, instruments, tempo).'

export const LYRIA_RECITATION_ERROR_CODE = 'LYRIA_RECITATION_BLOCKED'

/** Prompt guidance for LLMs that produce scene.music.description fields. */
export const LYRIA_MUSIC_PROMPT_RULES = `LYRIA MUSIC RULES (for scene.music.description):
- 10-20 words ONLY
- Instrumental only (no vocals/lyrics)
- Format: [genre], [mood], [instruments], [tempo]
- NO film titles, character names, or visual sync ("as the camera…")
- NO narrative arcs or timestamps`
