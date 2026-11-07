/**
 * Build a language-stream clip prompt.
 * Stage direction stays in English. Spoken dialogue is the translated line.
 */

import { parsePerformanceCue } from '@/lib/scene/performanceCues'

export interface StoredSceneLines {
  dialogue?: string[]
  dialogueByLineId?: Record<string, string>
  narration?: string
  beatsByBeatId?: Record<
    string,
    {
      overlayText?: string
      overlayEdited?: boolean
    }
  >
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

export function cleanSpokenLineText(raw: string | null | undefined): string {
  const trimmed = raw?.trim() || ''
  if (!trimmed) return ''
  return parsePerformanceCue(trimmed).spokenText.replace(/\s+/g, ' ').trim()
}

export function normalizeSpokenMatchKey(raw: string | null | undefined): string {
  const clean = cleanSpokenLineText(raw)
  if (!clean) return ''
  return clean
    .toLowerCase()
    .replace(/[.…!?,'";:—–-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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
  beatId?: string | null
  dialogue?: unknown[] | null
  englishLine: string
  isExcerpt?: boolean
}): string | undefined {
  if (args.kind === 'title') {
    const beatId = args.beatId?.trim()
    const overlay = beatId ? args.translation?.beatsByBeatId?.[beatId]?.overlayText?.trim() : undefined
    if (overlay) return overlay
  }
  if (args.kind === 'narration') {
    const narration = args.translation?.narration?.trim()
    if (!narration) return undefined
    return cleanSpokenLineText(narration) || narration
  }
  if (args.isExcerpt) return undefined
  const lineId = args.lineId?.trim()
  if (lineId && args.translation?.dialogueByLineId?.[lineId]?.trim()) {
    const byId = args.translation.dialogueByLineId[lineId].trim()
    return cleanSpokenLineText(byId) || byId
  }
  const english = args.englishLine.trim()
  const dialogue = args.dialogue ?? []
  let index = -1
  if (lineId) {
    index = dialogue.findIndex((entry) => dialogueLineId(entry) === lineId)
  }
  if (index < 0 && english) {
    index = dialogue.findIndex((entry) => dialogueLineText(entry) === english)
  }
  if (index < 0 && english) {
    const targetKey = normalizeSpokenMatchKey(english)
    if (targetKey) {
      index = dialogue.findIndex(
        (entry) => normalizeSpokenMatchKey(dialogueLineText(entry)) === targetKey
      )
    }
  }
  if (index < 0) return undefined
  const translated = args.translation?.dialogue?.[index]?.trim()
  if (!translated) return undefined
  return cleanSpokenLineText(translated) || translated
}

function quotedSpokenLine(translatedLine: string): string {
  const clean = cleanSpokenLineText(translatedLine) || translatedLine
  return clean.replace(/"/g, "'").trim()
}

/**
 * Extract the spoken line from a compiled beat video prompt or legacy lip-sync prompt.
 */
export function extractSpokenLineFromPrompt(sourcePrompt?: string | null): string | undefined {
  const source = sourcePrompt?.trim() || ''
  if (!source) return undefined
  const match = source.match(
    /(?:speaks with natural lip sync|speaks naturally|\bspeaks|Voiceover narration|The only spoken line is):\s*"([^"]+)"/i
  )
  return match?.[1]?.trim() || undefined
}

export function buildLanguageClipPrompt(
  sourcePrompt: string | null | undefined,
  translatedLine: string,
  character?: string | null,
  englishLine?: string | null
): string {
  const spoken = quotedSpokenLine(translatedLine)
  const source = sourcePrompt?.trim() || ''
  if (!spoken) return source

  let updated = source
  let replacedSpokenClause = false

  const spokenPrefixPatterns: RegExp[] = [
    /(speaks with natural lip sync:\s*)"[^"]*"/gi,
    /(speaks naturally:\s*)"[^"]*"/gi,
    /(Voiceover narration:\s*)"[^"]*"/gi,
    /(\bspeaks:\s*)"[^"]*"/gi,
    /(The only spoken line is:\s*)"[^"]*"/gi,
  ]

  for (const pattern of spokenPrefixPatterns) {
    if (pattern.test(updated)) {
      pattern.lastIndex = 0
      updated = updated.replace(pattern, `$1"${spoken}"`)
      replacedSpokenClause = true
    }
  }

  if (englishLine?.trim()) {
    const cleanEng = quotedSpokenLine(englishLine)
    const collapsedDotsEng = cleanEng.replace(/\.{2,}/g, '.')
    for (const candidate of [cleanEng, collapsedDotsEng]) {
      if (candidate && updated.includes(`"${candidate}"`)) {
        updated = updated.split(`"${candidate}"`).join(`"${spoken}"`)
        replacedSpokenClause = true
      }
    }
  }

  if (replacedSpokenClause) {
    return updated
  }

  const quoted = /"[^"]*"/
  if (quoted.test(source)) {
    return source.replace(quoted, `"${spoken}"`)
  }
  const who = character?.trim() || 'Character'
  if (!source) return `${who} speaks with natural lip sync: "${spoken}".`
  return `${who} speaks with natural lip sync: "${spoken}". ${source}`
}

/**
 * Extract visible signage, billboard, storefront, screen, or title copy from a shot prompt
 * (ignoring spoken lip-sync quotes).
 */
export function extractPromptSignageText(sourcePrompt?: string | null): string | undefined {
  const source = sourcePrompt?.trim() || ''
  if (!source) return undefined
  const stripped = source
    .replace(/speaks with natural lip sync:\s*"[^"]*"/gi, '')
    .replace(/speaks naturally:\s*"[^"]*"/gi, '')
    .replace(/\bspeaks:\s*"[^"]*"/gi, '')
    .replace(/Voiceover narration:\s*"[^"]*"/gi, '')
    .replace(/The only spoken line is:\s*"[^"]*"/gi, '')
    .replace(/Narration:\s*"[^"]*"/gi, '')
  const explicitSignage = stripped.match(
    /(?:sign|signage|billboard|banner|storefront|neon|screen|display|headline|poster|label|plaque|marquee|card|text|reads?|reading|titled?)\s*(?:that\s+says|reading|with\s+text|:)?\s*"([^"]+)"/i
  )
  if (explicitSignage?.[1]?.trim()) {
    return explicitSignage[1].trim()
  }
  const anyQuoted = stripped.match(/"([^"]+)"/)
  if (anyQuoted?.[1]?.trim()) {
    return anyQuoted[1].trim()
  }
  return undefined
}

export function composeLanguageClipPrompt(args: {
  sourcePrompt?: string | null
  guidePrompt?: string | null
  character?: string | null
  kind?: string | null
  englishLine?: string | null
  translatedLine?: string | null
  signageSourceText?: string | null
  signageTranslatedText?: string | null
}): { prompt: string; guidePrompt?: string } {
  const source = args.sourcePrompt?.trim() || ''
  const english = args.englishLine?.trim() || ''
  const cleanEnglish = cleanSpokenLineText(english) || english
  const rawTranslated = args.translatedLine?.trim() || ''
  const translated = cleanSpokenLineText(rawTranslated) || rawTranslated
  const signageOrig = args.signageSourceText?.trim() || ''
  const signageTrans = args.signageTranslatedText?.trim() || ''
  let guide = args.guidePrompt?.trim() || ''
  if (english && translated && guide.includes(english)) {
    guide = guide.split(english).join(translated)
  }
  if (cleanEnglish && translated && guide.includes(cleanEnglish)) {
    guide = guide.split(cleanEnglish).join(translated)
  }
  if (signageOrig && signageTrans && guide.includes(signageOrig)) {
    guide = guide.split(signageOrig).join(signageTrans)
  }
  const kind = args.kind || 'dialogue'
  if (kind === 'narration' && translated && !guide.includes(translated)) {
    guide = guide ? `${guide} Narration: "${quotedSpokenLine(translated)}".` : `Narration: "${quotedSpokenLine(translated)}".`
  }
  const hasCompiledNarrationClause =
    kind === 'narration' &&
    !!translated &&
    /(?:Voiceover narration|The only spoken line is):\s*"[^"]*"/i.test(source)
  const speakInPicture =
    (kind !== 'action' && kind !== 'narration' && kind !== 'title' && !!translated) ||
    hasCompiledNarrationClause
  let prompt =
    kind === 'title' && translated
      ? replacePromoOnScreenText(source, english, translated)
      : speakInPicture
        ? buildLanguageClipPrompt(source, translated, args.character, english)
        : source

  if (signageTrans && kind !== 'title') {
    prompt = replacePromoOnScreenText(prompt, signageOrig, signageTrans)
  }

  return {
    prompt,
    ...(guide ? { guidePrompt: guide } : {}),
  }
}

/** Put translated title or credit copy into the shot prompt without a lip-sync line. */
export function replacePromoOnScreenText(
  sourcePrompt: string,
  english: string,
  translated: string
): string {
  const spoken = translated.replace(/"/g, "'").trim()
  const source = sourcePrompt.trim()
  const original = english.trim()
  if (!spoken) return source
  if (original && source.includes(original)) return source.split(original).join(spoken)
  const quoted = source.match(/"([^"]*)"/)
  if (quoted && (!original || quoted[1] === original)) {
    return source.replace(/"([^"]*)"/, `"${spoken}"`)
  }
  const line = `On-screen text: "${spoken}".`
  return source ? `${source} ${line}` : line
}

/**
 * Determine whether a shot needs a localized video clip when running the Clips Agent
 * for a non-English language stream.
 *
 * Pure action shots and off-screen narrator voiceover shots without burned-in signage
 * retain the English master video clip (`double`) and get dubbed TTS audio in the Mixer.
 */
export function segmentNeedsLanguageClip(args: {
  beatKind?: string | null
  beatCharacter?: string | null
  beatLine?: string | null
  excerpt?: string | null
  dialogueLines?: Array<{ line?: string | null }> | null
  sourcePrompt?: string | null
  shotMethod?: 'double' | 'lipsync' | 'regenerate' | null
  customSignageText?: string | null
}): boolean {
  if (args.shotMethod === 'regenerate') return true
  if (args.shotMethod === 'double' || args.shotMethod === 'lipsync') return false
  const kind = args.beatKind?.trim().toLowerCase()
  if (kind === 'title') return true
  if (args.customSignageText?.trim()) return true
  if (extractPromptSignageText(args.sourcePrompt)) return true
  if (kind === 'action' || kind === 'narration') return false
  if (args.beatCharacter && /^narrator\b/i.test(args.beatCharacter.trim())) return false
  const spoken = englishSpokenLine({
    excerpt: args.excerpt,
    beatLine: args.beatLine,
    dialogueLines: args.dialogueLines,
  })
  return Boolean(spoken.trim())
}

