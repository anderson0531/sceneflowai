/**
 * One-click English rewrite of a stored blueprint that was authored in another
 * language (typically leftover Español from AR/refine following the UI locale).
 */

export const REWRITE_BLUEPRINT_ENGLISH_INTENT =
  'Re-author every section of this blueprint in English. Preserve plot, characters, structure, tone decisions, and meaning. Do not invent new story events or drop existing ones. Only the language of the text should change.'

const NON_LATIN =
  /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF]/

const UNAMBIGUOUS_NON_ENGLISH =
  /\b(está|según|también|guion|guión|personaje|protagonista|antagonista|sinopsis|configuración|audiencia|porque|además|después)\b|[¿¡]/i

export function looksNonEnglishAuthorship(text: string | null | undefined): boolean {
  if (!text || !text.trim()) return false
  return NON_LATIN.test(text) || UNAMBIGUOUS_NON_ENGLISH.test(text)
}

export function blueprintNeedsEnglishRewrite(input: {
  sourceLocale?: string | null
  title?: string | null
  logline?: string | null
  synopsis?: string | null
  arSummary?: string | null
}): boolean {
  if (input.sourceLocale && input.sourceLocale !== 'en') return true
  return looksNonEnglishAuthorship(
    [input.title, input.logline, input.synopsis, input.arSummary].filter(Boolean).join('\n')
  )
}
