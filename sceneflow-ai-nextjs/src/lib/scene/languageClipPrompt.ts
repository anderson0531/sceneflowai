/**
 * Build a language-stream clip prompt.
 * Stage direction stays in English. Spoken dialogue is the translated line.
 */

import { getLanguageName } from '@/constants/languages'
import { parsePerformanceCue } from '@/lib/scene/performanceCues'

export interface StoredSceneLines {
  dialogue?: string[]
  dialogueByLineId?: Record<string, string>
  narration?: string
  signageByText?: Record<string, string>
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
  const beatLine = args.beatLine?.trim()
  if (beatLine) return beatLine
  const excerpt = args.excerpt?.trim()
  if (excerpt) return excerpt
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
 * Preserve ALL-CAPS typography when translating uppercase signage, stencils, or chalk formulas
 * (e.g. "RESONANCE FLUX = 0" -> "FLUJO DE RESONANCIA = 0").
 */
export function preserveSignageCaseAndFormulaStyle(
  sourceText: string,
  translatedText: string
): string {
  const src = sourceText.trim()
  const trans = translatedText.trim()
  if (!src || !trans) return trans
  const hasLetters = /[A-Za-z]/.test(src)
  if (hasLetters && src === src.toUpperCase() && src !== src.toLowerCase()) {
    return trans.toUpperCase()
  }
  return trans
}

function stripSpokenAndPerformanceClausesForSignage(
  sourcePrompt: string,
  englishSpoken?: string | null
): string {
  let stripped = sourcePrompt
    .replace(/speaks with natural lip sync:\s*"[^"]*"/gi, '')
    .replace(/speaks naturally:\s*"[^"]*"/gi, '')
    .replace(/\bspeaks:\s*"[^"]*"/gi, '')
    .replace(/Voiceover narration:\s*"[^"]*"/gi, '')
    .replace(/The only spoken line is:\s*"[^"]*"/gi, '')
    .replace(/Narration:\s*"[^"]*"/gi, '')
    .replace(
      /All visible signage and significant writing must (?:be rendered in [^:]+|read):\s*"[^"]*"(?:\s*,\s*"[^"]*")*\.?/gi,
      ''
    )
    .replace(
      /Include clear on-screen captions(?:\s+in\s+[A-Za-z\s()-]+)?(?::\s*"[^"]*")?\.?/gi,
      ''
    )
    .replace(
      /\bPerformance:\s*[\s\S]*?(?=\s+(?:Coverage|Lens|Space|Shot|Angle|Camera|Blocking|Emotion|Gaze|Prop interaction|Props|Lighting|End on|Only these people|The only action):|$)/gi,
      ' '
    )

  if (englishSpoken?.trim()) {
    const cleanEng = cleanSpokenLineText(englishSpoken)
    if (cleanEng) {
      stripped = stripped.split(`"${cleanEng}"`).join('')
      stripped = stripped.split(`'${cleanEng}'`).join('')
    }
  }
  return stripped
}

/**
 * Extract all visible signage, billboard, storefront, screen, title, chalkboard/slate formula,
 * or significant writing strings from a shot prompt (ignoring spoken lip-sync and performance quotes).
 */
export function extractPromptSignageTexts(
  sourcePrompt?: string | null,
  englishSpoken?: string | null
): string[] {
  const source = sourcePrompt?.trim() || ''
  if (!source) return []
  const stripped = stripSpokenAndPerformanceClausesForSignage(source, englishSpoken)
  const spokenNorm = englishSpoken ? normalizeSpokenMatchKey(englishSpoken) : ''
  const results: string[] = []
  const seen = new Set<string>()

  const pushCandidate = (raw: string | undefined) => {
    const candidate = raw?.trim()
    if (!candidate || candidate.length < 2) return
    const norm = normalizeSpokenMatchKey(candidate)
    if (spokenNorm && norm && spokenNorm.includes(norm) && candidate.length < spokenNorm.length) {
      return
    }
    if (seen.has(candidate)) return
    seen.add(candidate)
    results.push(candidate)
  }

  // 1. Keyword before double-quoted or single-quoted text/formula/signage
  const beforeQuoteRegex =
    /\b(?:sign|signage|billboard|banner|storefront|neon|screen|monitor|display|displaying|headline|masthead|poster|label|labeled|plaque|placard|marquee|card|title|titled|text|formula|equation|inscription|inscribed|writing|written|chalk|slate|board|chalkboard|blackboard|whiteboard|graffiti|note|notebook|letter|document|page|ledger|blueprint|newspaper|journal|book|engraving|engraved|carved|stenciled|painted|printed|stamped|marked|reads?|reading|says?|saying|bearing|showing|words?|caption|subtitle|chyron)\b(?:\s+(?:on|in|across|beside|above|below|over|under|from|at|near)\s+[^"'\n]{1,35}?)?\s*(?:that\s+(?:says|reads)|reading|saying|with\s+(?:the\s+)?(?:struck-through\s+)?(?:text|words|formula|equation|title|inscription|label)|inscribed\s+with|written\s+as|labeled|titled|:)?\s*(?:"([^"\n]{2,140})"|(?<![A-Za-z0-9])'([^'\n]{2,140})'(?![A-Za-z0-9]))/gi

  let match: RegExpExecArray | null
  while ((match = beforeQuoteRegex.exec(stripped)) !== null) {
    pushCandidate(match[1] ?? match[2])
  }

  // 2. Quoted text/formula/signage followed by surface/writing descriptor
  const afterQuoteRegex =
    /(?:"([^"\n]{2,140})"|(?<![A-Za-z0-9])'([^'\n]{2,140})'(?![A-Za-z0-9]))\s*(?:written|inscribed|scrawled|chalked|painted|printed|stenciled|carved|engraved|stamped|displayed|shown|on\s+the\s+(?:sign|billboard|banner|storefront|screen|monitor|display|poster|plaque|marquee|card|slate|board|chalkboard|blackboard|whiteboard|wall|note|letter|document|page|ledger|blueprint|newspaper))/gi

  while ((match = afterQuoteRegex.exec(stripped)) !== null) {
    pushCandidate(match[1] ?? match[2])
  }

  return results
}

/**
 * Extract the primary visible signage or significant writing string from a shot prompt.
 */
export function extractPromptSignageText(
  sourcePrompt?: string | null,
  englishSpoken?: string | null
): string | undefined {
  return extractPromptSignageTexts(sourcePrompt, englishSpoken)[0]
}

/**
 * True when a shot prompt references in-scene signage or significant visible writing
 * (even when the writing is not enclosed in quotes).
 */
export function promptHasSignageOrSignificantWriting(
  sourcePrompt?: string | null,
  englishSpoken?: string | null
): boolean {
  if (extractPromptSignageTexts(sourcePrompt, englishSpoken).length > 0) {
    return true
  }
  const source = sourcePrompt?.trim() || ''
  if (!source) return false
  return /\b(?:signage|billboard|storefront\s+sign|neon\s+sign|marquee|placard|plaque|headline|newspaper|chalkboard|blackboard|whiteboard|slate\s+(?:wall|board)|struck-through\s+(?:text|formula|equation)|written\s+on|inscribed\s+on|chalk\s+(?:text|formula|writing|equation)|handwritten|graffiti|banner\s+reading|sign\s+reading|text\s+reading)\b/i.test(
    source
  )
}

function injectSignageModelInstruction(
  prompt: string,
  translatedSignageList: string[],
  targetLanguage?: string | null,
  hasUnquotedSignageSurface?: boolean
): string {
  const cleanList = translatedSignageList
    .map((item) => item.replace(/"/g, "'").trim())
    .filter(Boolean)
  const langCode = targetLanguage?.trim()
  const langName =
    langCode && langCode.toLowerCase() !== 'en' ? getLanguageName(langCode) : undefined

  let directive = ''
  if (cleanList.length > 0) {
    const formattedQuotes = cleanList.map((text) => `"${text}"`).join(', ')
    directive = langName
      ? `All visible signage and significant writing must be rendered in ${langName}: ${formattedQuotes}`
      : `All visible signage and significant writing must read: ${formattedQuotes}`
  } else if (langName && hasUnquotedSignageSurface) {
    directive = `Translate and render any visible signage and significant writing in ${langName}`
  }

  if (!directive) return prompt
  if (prompt.includes(directive)) return prompt

  // Place right after `The only spoken line is: "..."` or `No spoken dialogue` in compiled prompts
  const spokenCloseRegex = /(The only spoken line is:\s*"[^"]*"\.?)/i
  if (spokenCloseRegex.test(prompt)) {
    return prompt.replace(spokenCloseRegex, (match) => {
      const base = match.endsWith('.') ? match : `${match}.`
      return `${base} ${directive}.`
    })
  }

  const silentCloseRegex = /(\bNo spoken dialogue\.?)/i
  if (silentCloseRegex.test(prompt)) {
    return prompt.replace(silentCloseRegex, (match) => {
      const base = match.endsWith('.') ? match : `${match}.`
      return `${base} ${directive}.`
    })
  }

  // Append to non-compiled prompts when targetLanguage was explicitly specified
  if (langName && (cleanList.length > 0 || hasUnquotedSignageSurface)) {
    const trimmed = prompt.replace(/\.+$/, '')
    return `${trimmed}. ${directive}.`
  }

  return prompt
}

export const NO_CAPTIONS_PROMPT_DIRECTIVE =
  'Do not render subtitles, captions, or on-screen dialogue text'

export function applyClipCaptionsDirective(
  prompt: string,
  options?: {
    includeCaptions?: boolean
    spokenLine?: string | null
    targetLanguage?: string | null
    kind?: string | null
  }
): string {
  const trimmedPrompt = prompt?.trim() || ''
  if (!trimmedPrompt) return ''
  const kind = options?.kind?.trim().toLowerCase()
  if (kind === 'title') return trimmedPrompt

  const includeCaptions = options?.includeCaptions === true
  const langCode = options?.targetLanguage?.trim()
  const langName =
    langCode && langCode.toLowerCase() !== 'en' ? getLanguageName(langCode) : undefined
  const rawSpoken = options?.spokenLine?.trim() || ''
  const cleanSpoken = cleanSpokenLineText(rawSpoken) || rawSpoken
  const quotedSpoken = cleanSpoken ? quotedSpokenLine(cleanSpoken) : ''

  let working = trimmedPrompt
    .replace(/\s*Do not render subtitles, captions, or on-screen dialogue text\.?/gi, '')
    .replace(
      /\s*Include clear on-screen captions(?:\s+in\s+[A-Za-z\s()-]+)?(?::\s*"[^"]*")?\.?/gi,
      ''
    )
    .trim()

  if (includeCaptions) {
    working = working.replace(/,\s*no on-screen dialogue text\b/gi, '').trim()
  }

  const directive = includeCaptions
    ? quotedSpoken
      ? `Include clear on-screen captions${langName ? ` in ${langName}` : ''}: "${quotedSpoken}"`
      : `Include clear on-screen captions${langName ? ` in ${langName}` : ''}`
    : NO_CAPTIONS_PROMPT_DIRECTIVE

  if (working.includes(directive)) return working

  const signageDirectiveRegex =
    /(All visible signage and significant writing must (?:be rendered in [^:]+|read):\s*"[^"]*"(?:\s*,\s*"[^"]*")*\.?|Translate and render any visible signage and significant writing in [A-Za-z\s()-]+\.?)/i
  if (signageDirectiveRegex.test(working)) {
    return working.replace(signageDirectiveRegex, (match) => {
      const base = match.endsWith('.') ? match : `${match}.`
      return `${base} ${directive}.`
    })
  }

  const spokenCloseRegex = /(The only spoken line is:\s*"[^"]*"\.?)/i
  if (spokenCloseRegex.test(working)) {
    return working.replace(spokenCloseRegex, (match) => {
      const base = match.endsWith('.') ? match : `${match}.`
      return `${base} ${directive}.`
    })
  }

  const silentCloseRegex = /(\bNo spoken dialogue\.?)/i
  if (silentCloseRegex.test(working)) {
    return working.replace(silentCloseRegex, (match) => {
      const base = match.endsWith('.') ? match : `${match}.`
      return `${base} ${directive}.`
    })
  }

  const base = working.replace(/\.+$/, '')
  return `${base}. ${directive}.`
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
  signageTranslations?: Record<string, string> | null
  targetLanguage?: string | null
  includeCaptions?: boolean
}): { prompt: string; guidePrompt?: string } {
  const source = args.sourcePrompt?.trim() || ''
  const english = args.englishLine?.trim() || ''
  const cleanEnglish = cleanSpokenLineText(english) || english
  const rawTranslated = args.translatedLine?.trim() || ''
  const translated = cleanSpokenLineText(rawTranslated) || rawTranslated
  const signagePairs: Array<[string, string]> = []
  if (args.signageTranslations) {
    for (const [orig, trans] of Object.entries(args.signageTranslations)) {
      if (orig.trim() && trans?.trim()) {
        signagePairs.push([
          orig.trim(),
          preserveSignageCaseAndFormulaStyle(orig, trans),
        ])
      }
    }
  }
  const singleOrig = args.signageSourceText?.trim() || ''
  const singleTrans = args.signageTranslatedText?.trim() || ''
  if (singleOrig && singleTrans && !signagePairs.some(([o]) => o === singleOrig)) {
    signagePairs.push([
      singleOrig,
      preserveSignageCaseAndFormulaStyle(singleOrig, singleTrans),
    ])
  } else if (!singleOrig && singleTrans && signagePairs.length === 0) {
    signagePairs.push(['', singleTrans])
  }

  let guide = args.guidePrompt?.trim() || ''
  if (english && translated && guide.includes(english)) {
    guide = guide.split(english).join(translated)
  }
  if (cleanEnglish && translated && guide.includes(cleanEnglish)) {
    guide = guide.split(cleanEnglish).join(translated)
  }
  for (const [orig, trans] of signagePairs) {
    if (orig && trans && guide.includes(orig)) {
      guide = guide.split(orig).join(trans)
    }
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

  const appliedSignageTranslations: string[] = []
  if (kind !== 'title') {
    for (const [orig, trans] of signagePairs) {
      if (!trans) continue
      prompt = replacePromoOnScreenText(prompt, orig, trans)
      appliedSignageTranslations.push(trans)
    }
  }

  const hasUnquotedSignageSurface =
    kind === 'action' && promptHasSignageOrSignificantWriting(source, english)

  prompt = injectSignageModelInstruction(
    prompt,
    appliedSignageTranslations,
    args.targetLanguage,
    hasUnquotedSignageSurface
  )

  const isNonEnglishTarget = Boolean(
    args.targetLanguage && args.targetLanguage.trim().toLowerCase() !== 'en'
  )
  const shouldApplyCaptionDirective =
    kind !== 'title' &&
    (args.includeCaptions !== undefined ||
      (isNonEnglishTarget &&
        (speakInPicture ||
          Boolean(translated) ||
          appliedSignageTranslations.length > 0 ||
          hasUnquotedSignageSurface)))
  if (shouldApplyCaptionDirective && prompt) {
    prompt = applyClipCaptionsDirective(prompt, {
      includeCaptions: args.includeCaptions === true,
      spokenLine: translated || cleanEnglish,
      targetLanguage: args.targetLanguage,
      kind,
    })
  }

  return {
    prompt,
    ...(guide ? { guidePrompt: guide } : {}),
  }
}

/** Put translated title, signage, or significant writing copy into the shot prompt without a lip-sync line. */
export function replacePromoOnScreenText(
  sourcePrompt: string,
  english: string,
  translated: string
): string {
  const spoken = preserveSignageCaseAndFormulaStyle(
    english,
    translated.replace(/"/g, "'").trim()
  )
  const source = sourcePrompt.trim()
  const original = english.trim()
  if (!spoken) return source
  if (original && source.includes(`'${original}'`)) {
    return source.split(`'${original}'`).join(`'${spoken}'`)
  }
  if (original && source.includes(`"${original}"`)) {
    return source.split(`"${original}"`).join(`"${spoken}"`)
  }
  if (original && source.includes(original)) {
    return source.split(original).join(spoken)
  }
  const quoted = source.match(/"([^"]*)"/)
  if (quoted && (!original || quoted[1] === original)) {
    return source.replace(/"([^"]*)"/, `"${spoken}"`)
  }
  const singleQuoted = source.match(/(?<![A-Za-z0-9])'([^'\n]*)'(?![A-Za-z0-9])/)
  if (singleQuoted && (!original || singleQuoted[1] === original)) {
    return source.replace(/(?<![A-Za-z0-9])'([^'\n]*)'(?![A-Za-z0-9])/, `'${spoken}'`)
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
  const spoken = englishSpokenLine({
    excerpt: args.excerpt,
    beatLine: args.beatLine,
    dialogueLines: args.dialogueLines,
  })
  if (promptHasSignageOrSignificantWriting(args.sourcePrompt, spoken)) return true
  if (kind === 'action' || kind === 'narration') return false
  if (args.beatCharacter && /^narrator\b/i.test(args.beatCharacter.trim())) return false
  return Boolean(spoken.trim())
}

