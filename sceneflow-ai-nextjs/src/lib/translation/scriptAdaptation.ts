import { generateText } from '@/lib/vertexai/gemini'
import { translateWithVertexAI } from '@/lib/vertexai/translate'
import {
  TIMED_DIALOGUE_ADAPTATION_SYSTEM_INSTRUCTION,
  analyzeDialogueCadence,
  buildTimedDialogueUserPrompt,
  computeTargetSyllableWindow,
  estimateSyllables,
  extractLeadingPerformanceCue,
  isStoredTranslationTimedForShot,
  isTruncatedTimedTranslation,
  preserveLeadingPerformanceCue,
  type DialogueCadenceAnalysis,
  type DialogueCadenceKind,
  type TargetSyllableWindow,
} from './timedDialogueMetrics'

export {
  TIMED_DIALOGUE_ADAPTATION_SYSTEM_INSTRUCTION,
  analyzeDialogueCadence,
  buildTimedDialogueUserPrompt,
  computeTargetSyllableWindow,
  estimateSyllables,
  extractLeadingPerformanceCue,
  isStoredTranslationTimedForShot,
  isTruncatedTimedTranslation,
  preserveLeadingPerformanceCue,
  type DialogueCadenceAnalysis,
  type DialogueCadenceKind,
  type TargetSyllableWindow,
}

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

export interface TimedDialogueTranslationOptions {
  sourceText: string
  targetLanguage: string
  sourceLanguage?: string
  targetDurationSeconds?: number
  sourceDurationSeconds?: number
  maxTargetSyllables?: number
}

export interface TimedDialogueTranslationResult {
  translatedText: string
  diagnostics: AdaptationDiagnostics
}

const DEFAULT_TOLERANCE_PERCENT = 0.18

function isWithinTolerance(value: number, target: number, tolerancePercent: number): boolean {
  if (target <= 0) return true
  const delta = Math.abs(value - target)
  return delta <= Math.max(1, Math.round(target * tolerancePercent))
}

function cleanLlmLine(raw: string): string {
  return raw
    .trim()
    .replace(/^(?:output|translated\s+dialogue|finalized\s+line)\s*:\s*/i, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
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
    maxOutputTokens: 2048,
    responseMimeType: 'text/plain',
    thinkingBudget: 256,
    timeoutMs: 12000,
    maxRetries: 1,
  })

  return cleanLlmLine(result.text || '')
}

export async function adaptScriptForTranslationTiming(
  options: AdaptScriptOptions
): Promise<AdaptationResult> {
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

/**
 * Translate and adapt a spoken dialogue line into `targetLanguage` using
 * Timed Dialogue Adaptation & Translation (semantic condensation + emotional
 * & subtext fidelity + performance cue preservation within the shot's duration).
 */
export async function translateAndAdaptTimedDialogue(
  options: TimedDialogueTranslationOptions
): Promise<TimedDialogueTranslationResult> {
  const {
    sourceText,
    targetLanguage,
    sourceLanguage = 'en',
    targetDurationSeconds = 10.0,
    sourceDurationSeconds,
    maxTargetSyllables,
  } = options

  const source = sourceText?.trim() || ''
  const targetLang = targetLanguage?.trim() || 'en'
  const sourceSyllables = estimateSyllables(source, sourceLanguage)
  const { prompt, window, languageName } = buildTimedDialogueUserPrompt({
    sourceText: source,
    targetLanguage: targetLang,
    targetDurationSeconds,
    sourceDurationSeconds,
    maxTargetSyllables,
  })

  if (!source || targetLang.toLowerCase() === sourceLanguage.toLowerCase()) {
    return {
      translatedText: sourceText,
      diagnostics: {
        enabled: true,
        strategy: 'passthrough',
        usedFallback: false,
        sourceSyllables,
        adaptedSyllables: sourceSyllables,
        targetSyllableBudget: window.maxSyllables,
        tolerancePercent: DEFAULT_TOLERANCE_PERCENT,
        withinTolerance: true,
      },
    }
  }

  try {
    // IMPORTANT: In Vertex AI Gemini 2.5, `max_output_tokens` caps `thoughtsTokenCount + candidatesTokenCount`
    // combined, and `gemini.ts` omits `thinking_config` when `thinkingBudget: 0` (triggering default dynamic
    // thinking). Always pass a generous `maxOutputTokens` (4096) with an explicit non-zero `thinkingBudget`
    // (512) so internal thinking never starves the visible translation output.
    const firstPass = await generateText(prompt, {
      model: 'gemini-2.5-flash',
      systemInstruction: TIMED_DIALOGUE_ADAPTATION_SYSTEM_INSTRUCTION,
      temperature: 0.25,
      maxOutputTokens: 4096,
      responseMimeType: 'text/plain',
      thinkingBudget: 512,
      timeoutMs: 15000,
      maxRetries: 1,
    })

    let adapted = cleanLlmLine(firstPass.text || '')
    if (adapted) {
      adapted = preserveLeadingPerformanceCue(source, adapted)
      let adaptedSyllables = estimateSyllables(adapted, targetLang)
      const firstPassTruncated =
        firstPass.finishReason === 'MAX_TOKENS' ||
        isTruncatedTimedTranslation(source, adapted, targetLang)

      // If the first pass was truncated OR significantly exceeds the syllable ceiling, run a second pass
      if (
        firstPassTruncated ||
        (sourceSyllables >= 12 && adaptedSyllables > window.maxSyllables + 4)
      ) {
        try {
          const secondPassPrompt = firstPassTruncated
            ? [
                prompt,
                '',
                `Previous draft was incomplete/cut off: "${adapted}"`,
                `Translate and adapt the ENTIRE source line from start to finish into ${languageName} within ${window.minSyllables}–${window.maxSyllables} syllables. Keep all emotional beats, metaphors, ellipses, and bracketed performance cues intact. Never stop after the first word or clause. Return only the finalized line.`,
              ].join('\n')
            : [
                prompt,
                '',
                `Draft translation (${adaptedSyllables} syllables — exceeds maximum of ${window.maxSyllables} syllables):`,
                `"${adapted}"`,
                '',
                `Condense the entire line in ${languageName} to ${window.minSyllables}–${window.maxSyllables} syllables maximum while keeping all emotional beats, metaphors, ellipses, and bracketed performance cues intact. Never drop the second half of the thought. Return only the finalized line.`,
              ].join('\n')

          const secondPass = await generateText(secondPassPrompt, {
            model: 'gemini-2.5-flash',
            systemInstruction: TIMED_DIALOGUE_ADAPTATION_SYSTEM_INSTRUCTION,
            temperature: 0.2,
            maxOutputTokens: 4096,
            responseMimeType: 'text/plain',
            thinkingBudget: 256,
            timeoutMs: 12000,
            maxRetries: 0,
          })
          const tightened = cleanLlmLine(secondPass.text || '')
          if (tightened) {
            const candidate = preserveLeadingPerformanceCue(source, tightened)
            const candidateSyllables = estimateSyllables(candidate, targetLang)
            const candidateTruncated =
              secondPass.finishReason === 'MAX_TOKENS' ||
              isTruncatedTimedTranslation(source, candidate, targetLang)
            if (
              !candidateTruncated &&
              candidateSyllables > 0 &&
              (firstPassTruncated || candidateSyllables < adaptedSyllables)
            ) {
              adapted = candidate
              adaptedSyllables = candidateSyllables
            }
          }
        } catch {
          // Handled by completeness validation below
        }
      }

      // Only return the LLM adaptation if it is complete (never return a truncated 1-word fragment like "Ella")
      if (!isTruncatedTimedTranslation(source, adapted, targetLang)) {
        return {
          translatedText: adapted,
          diagnostics: {
            enabled: true,
            strategy: 'llm-rewrite',
            usedFallback: false,
            sourceSyllables,
            adaptedSyllables,
            targetSyllableBudget: window.maxSyllables,
            tolerancePercent: DEFAULT_TOLERANCE_PERCENT,
            withinTolerance: adaptedSyllables <= window.maxSyllables + 2,
          },
        }
      }

      console.warn(
        `[Timed Dialogue Adaptation] Rejecting truncated LLM output for ${targetLang} ("${adapted.slice(0, 40)}"), falling back to Vertex translation.`
      )
    }
  } catch (llmError: any) {
    console.warn(
      `[Timed Dialogue Adaptation] LLM adaptation failed for ${targetLang}, falling back to Vertex translation:`,
      llmError?.message || llmError
    )
  }

  // Fallback: translate spoken body via Vertex AI and preserve leading performance cue
  const { body: sourceBody } = extractLeadingPerformanceCue(source)
  const fallbackResult = await translateWithVertexAI({
    text: sourceBody || source,
    targetLanguage: targetLang,
    sourceLanguage,
  })
  const fallbackText = preserveLeadingPerformanceCue(
    source,
    cleanLlmLine(fallbackResult.translatedText || sourceBody || source)
  )
  const fallbackSyllables = estimateSyllables(fallbackText, targetLang)

  return {
    translatedText: fallbackText,
    diagnostics: {
      enabled: true,
      strategy: 'fallback',
      usedFallback: true,
      sourceSyllables,
      adaptedSyllables: fallbackSyllables,
      targetSyllableBudget: window.maxSyllables,
      tolerancePercent: DEFAULT_TOLERANCE_PERCENT,
      withinTolerance: fallbackSyllables <= window.maxSyllables + 2,
    },
  }
}
