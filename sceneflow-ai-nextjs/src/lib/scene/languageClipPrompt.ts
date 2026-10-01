/**
 * Build a language-stream clip prompt.
 * Stage direction stays in English. Spoken dialogue is the translated line.
 */

export interface StoredSceneLines {
  dialogue?: string[]
  narration?: string
}

function dialogueLineText(entry: unknown): string {
  if (typeof entry === 'string') return entry.trim()
  if (!entry || typeof entry !== 'object') return ''
  const row = entry as { line?: unknown; text?: unknown }
  return String(row.line ?? row.text ?? '').trim()
}

function dialogueLineId(entry: unknown): string {
  if (!entry || typeof entry !== 'object') return ''
  const row = entry as { lineId?: unknown; id?: unknown }
  return String(row.lineId ?? row.id ?? '').trim()
}

export function englishSpokenLine(args: {
  excerpt?: string | null
  beatLine?: string | null
  dialogueLines?: Array<{ line?: string | null }> | null
}): string {
  const excerpt = args.excerpt?.trim()
  if (excerpt) return excerpt
  const beatLine = args.beatLine?.trim()
  if (beatLine) return beatLine
  const joined = (args.dialogueLines ?? [])
    .map((line) => line.line?.trim())
    .filter((line): line is string => !!line)
    .join(' ')
  return joined
}

/**
 * Use a stored scene translation when it matches this shot's full line.
 * Split excerpts are translated on their own so a long line is not spoken whole.
 */
export function preferStoredSpokenTranslation(args: {
  translation?: StoredSceneLines | null
  kind?: string | null
  lineId?: string | null
  dialogue?: unknown[] | null
  englishLine: string
  isExcerpt?: boolean
}): string | undefined {
  if (args.kind === 'narration') {
    const narration = args.translation?.narration?.trim()
    return narration || undefined
  }
  if (args.isExcerpt) return undefined
  const english = args.englishLine.trim()
  const dialogue = args.dialogue ?? []
  let index = -1
  const lineId = args.lineId?.trim()
  if (lineId) {
    index = dialogue.findIndex((entry) => dialogueLineId(entry) === lineId)
  }
  if (index < 0 && english) {
    index = dialogue.findIndex((entry) => dialogueLineText(entry) === english)
  }
  if (index < 0) return undefined
  const translated = args.translation?.dialogue?.[index]?.trim()
  return translated || undefined
}

function quotedSpokenLine(translatedLine: string): string {
  return translatedLine.replace(/"/g, "'").trim()
}

export function buildLanguageClipPrompt(
  sourcePrompt: string | null | undefined,
  translatedLine: string,
  character?: string | null
): string {
  const spoken = quotedSpokenLine(translatedLine)
  const source = sourcePrompt?.trim() || ''
  if (!spoken) return source
  const lipSync = /speaks with natural lip sync:\s*"[^"]*"/
  if (lipSync.test(source)) {
    return source.replace(lipSync, `speaks with natural lip sync: "${spoken}"`)
  }
  const quoted = /"[^"]*"/
  if (quoted.test(source)) {
    return source.replace(quoted, `"${spoken}"`)
  }
  const who = character?.trim() || 'Character'
  if (!source) return `${who} speaks with natural lip sync: "${spoken}".`
  return `${who} speaks with natural lip sync: "${spoken}". ${source}`
}

export function composeLanguageClipPrompt(args: {
  sourcePrompt?: string | null
  guidePrompt?: string | null
  character?: string | null
  kind?: string | null
  englishLine?: string | null
  translatedLine?: string | null
}): { prompt: string; guidePrompt?: string } {
  const source = args.sourcePrompt?.trim() || ''
  const english = args.englishLine?.trim() || ''
  const translated = args.translatedLine?.trim() || ''
  let guide = args.guidePrompt?.trim() || ''
  if (english && translated && guide.includes(english)) {
    guide = guide.split(english).join(translated)
  }
  const kind = args.kind || 'dialogue'
  if (kind === 'narration' && translated && !guide.includes(translated)) {
    guide = guide ? `${guide} Narration: "${quotedSpokenLine(translated)}".` : `Narration: "${quotedSpokenLine(translated)}".`
  }
  const speakInPicture = kind !== 'action' && kind !== 'narration' && !!translated
  return {
    prompt: speakInPicture ? buildLanguageClipPrompt(source, translated, args.character) : source,
    ...(guide ? { guidePrompt: guide } : {}),
  }
}
