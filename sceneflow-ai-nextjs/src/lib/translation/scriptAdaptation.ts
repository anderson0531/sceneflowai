import { generateText } from '@/lib/vertexai/gemini'

export type AdaptationStrategy = 'passthrough' | 'llm-rewrite' | 'fallback'

export interface AdaptScriptOptions {
  sourceText: string
  targetLanguage: string
  targetSyllableBudget?: number
  tolerancePercent?: number
  mode?: 'llm'
}

export interface AdaptationDiagnostics {
  enabled: boolean
  strategy: AdaptationStrategy
  usedFallback: boolean
  sourceSyllables: number
  adaptedSyllables: number
  targetSyllableBudget: number
  tolerancePercent: number
  withinTolerance: boolean
  error?: string
}

export interface AdaptationResult {
  adaptedText: string
  diagnostics: AdaptationDiagnostics
}

const DEFAULT_TOLERANCE_PERCENT = 0.18

export function estimateSyllables(text: string, language: string = 'en'): number {
  const normalized = text.trim()
  if (!normalized) return 0

  // Basic fallback for CJK languages where syllable splitting by words is not reliable.
  if (/^(zh|ja|ko)/i.test(language)) {
    const cjkChars = (normalized.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/g) || []).length
    return Math.max(1, Math.round(cjkChars * 0.9))
  }

  const words = normalized
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return 0

  let syllables = 0
  for (const rawWord of words) {
    const word = rawWord.replace(/^-+|-+$/g, '')
    if (!word) continue
    if (word.length <= 3) {
      syllables += 1
      continue
    }

    const cleaned = word
      .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
      .replace(/^y/, '')

    const matches = cleaned.match(/[aeiouy]{1,2}/g)
    syllables += Math.max(1, matches ? matches.length : 1)
  }

  return syllables
}

function isWithinTolerance(value: number, target: number, tolerancePercent: number): boolean {
  if (target <= 0) return true
  const delta = Math.abs(value - target)
  return delta <= Math.max(1, Math.round(target * tolerancePercent))
}

function cleanLlmLine(raw: string): string {
  return raw
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\s+/g, ' ')
}

async function rewriteEnglishForTiming(
  sourceText: string,
  targetLanguage: string,
  targetSyllableBudget: number
): Promise<string> {
  const prompt = [
    'Rewrite the following English line so it is easier to translate while preserving original meaning, tone, and intent.',
    `Target language for upcoming translation: ${targetLanguage}.`,
    `Target syllable budget: about ${targetSyllableBudget} English syllables.`,
    'Rules:',
    '- Keep it in English.',
    '- Prefer concise synonyms and shorter phrasing when possible.',
    '- Keep names, facts, and scene intent unchanged.',
    '- Return exactly one rewritten line and no commentary.',
    '',
    `Original line: ${sourceText}`,
  ].join('\n')

  const result = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    temperature: 0.2,
    maxOutputTokens: 180,
    responseMimeType: 'text/plain',
    thinkingLevel: 'minimal',
    timeoutMs: 12000,
    maxRetries: 1,
  })

  return cleanLlmLine(result.text || '')
}

export async function adaptScriptForTranslationTiming(options: AdaptScriptOptions): Promise<AdaptationResult> {
  const {
    sourceText,
    targetLanguage,
    targetSyllableBudget,
    tolerancePercent = DEFAULT_TOLERANCE_PERCENT,
  } = options

  const enabled = process.env.ENABLE_PRETRANSLATION_ADAPTATION !== 'false'
  const source = sourceText?.trim() || ''
  const sourceSyllables = estimateSyllables(source, 'en')
  const budget = Math.max(1, targetSyllableBudget ?? sourceSyllables)

  if (!enabled || !source || targetLanguage === 'en') {
    return {
      adaptedText: sourceText,
      diagnostics: {
        enabled,
        strategy: 'passthrough',
        usedFallback: false,
        sourceSyllables,
        adaptedSyllables: sourceSyllables,
        targetSyllableBudget: budget,
        tolerancePercent,
        withinTolerance: true,
      },
    }
  }

  if (isWithinTolerance(sourceSyllables, budget, tolerancePercent)) {
    return {
      adaptedText: source,
      diagnostics: {
        enabled,
        strategy: 'passthrough',
        usedFallback: false,
        sourceSyllables,
        adaptedSyllables: sourceSyllables,
        targetSyllableBudget: budget,
        tolerancePercent,
        withinTolerance: true,
      },
    }
  }

  try {
    const rewritten = await rewriteEnglishForTiming(source, targetLanguage, budget)
    if (!rewritten) {
      return {
        adaptedText: source,
        diagnostics: {
          enabled,
          strategy: 'fallback',
          usedFallback: true,
          sourceSyllables,
          adaptedSyllables: sourceSyllables,
          targetSyllableBudget: budget,
          tolerancePercent,
          withinTolerance: isWithinTolerance(sourceSyllables, budget, tolerancePercent),
          error: 'LLM rewrite returned empty text',
        },
      }
    }

    const adaptedSyllables = estimateSyllables(rewritten, 'en')
    return {
      adaptedText: rewritten,
      diagnostics: {
        enabled,
        strategy: 'llm-rewrite',
        usedFallback: false,
        sourceSyllables,
        adaptedSyllables,
        targetSyllableBudget: budget,
        tolerancePercent,
        withinTolerance: isWithinTolerance(adaptedSyllables, budget, tolerancePercent),
      },
    }
  } catch (error: any) {
    return {
      adaptedText: source,
      diagnostics: {
        enabled,
        strategy: 'fallback',
        usedFallback: true,
        sourceSyllables,
        adaptedSyllables: sourceSyllables,
        targetSyllableBudget: budget,
        tolerancePercent,
        withinTolerance: isWithinTolerance(sourceSyllables, budget, tolerancePercent),
        error: error?.message || 'Unknown adaptation error',
      },
    }
  }
}
