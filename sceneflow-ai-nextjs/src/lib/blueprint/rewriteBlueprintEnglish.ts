/**
 * One-click English rewrite of a stored blueprint that was authored in another
 * language (typically leftover Español from AR/refine following the UI locale).
 */

export const REWRITE_BLUEPRINT_ENGLISH_INTENT =
  'Re-author every section of this blueprint in English. Preserve plot, characters, structure, tone decisions, and meaning. Do not invent new story events or drop existing ones. Only the language of the text should change.'

const NON_LATIN =
  /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0900-\u097F\u0E00-\u0E7F\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF]/

const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/
const DEVANAGARI_SCRIPT = /[\u0900-\u097F]/
const HAN_SCRIPT = /[\u3400-\u4DBF\u4E00-\u9FFF]/

const PORTUGUESE_UNAMBIGUOUS =
  /\b(não|são|então|também|através|além|até|após|pelo|pela|pelos|pelas|numa|deste|desta|nesse|nessa|enquanto|embora|roteiro|personagem|personagens|sinopse|cenário|episódio|ficção|produção|direção|coração|ação|uma\s+\w{3,}|dos\s+\w{3,}|das\s+\w{3,}|nos\s+\w{3,}|nas\s+\w{3,})\b|[ãõç]/i

const UNAMBIGUOUS_NON_ENGLISH =
  /\b(está|según|también|também|guion|guión|roteiro|personaje|personagem|personagens|protagonista|antagonista|sinopsis|sinopse|configuración|audiencia|porque|además|além|después|após|cuando|quando|entre|sobre|desde|hacia|até|mediante|durante|dentro|través|através|não|são|então|pelo|pela|pelos|pelas|numa|enquanto|embora|cenário|episódio|ficção|produção|direção)\b|[¿¡ñãõç]/i

const SPANISH_FUNCTION_WORDS =
  /\b(una?\s+\w{3,}|uma\s+\w{3,}|del?\s+\w{3,}|dos\s+\w{3,}|das\s+\w{3,}|las?\s+\w{3,}|los?\s+\w{3,}|nos\s+\w{3,}|nas\s+\w{3,}|por\s+\w{3,}|para\s+\w{3,}|con\s+\w{3,}|com\s+\w{3,}|que\s+\w{3,}|como\s+\w{3,})\b/i

const ACCENTED_SPANISH_VOWELS =
  /\w[áéíóúâêôàãõç]\w/i

export function looksNonEnglishAuthorship(text: string | null | undefined): boolean {
  if (!text || !text.trim()) return false
  return (
    NON_LATIN.test(text) ||
    UNAMBIGUOUS_NON_ENGLISH.test(text) ||
    SPANISH_FUNCTION_WORDS.test(text) ||
    ACCENTED_SPANISH_VOWELS.test(text)
  )
}

/**
 * Detect which of the 5 target non-English locales (`es`, `pt`, `hi`, `zh-CN`, `ar`)
 * user-typed text is authored in, or `null` when it appears to be English.
 */
export function detectNonEnglishInputLocale(
  text: string | null | undefined
): 'es' | 'pt' | 'hi' | 'zh-CN' | 'ar' | null {
  if (!text || !text.trim()) return null
  if (ARABIC_SCRIPT.test(text)) return 'ar'
  if (DEVANAGARI_SCRIPT.test(text)) return 'hi'
  if (HAN_SCRIPT.test(text)) return 'zh-CN'
  if (!looksNonEnglishAuthorship(text)) return null
  if (PORTUGUESE_UNAMBIGUOUS.test(text)) return 'pt'
  return 'es'
}

export function blueprintNeedsEnglishRewrite(input: {
  sourceLocale?: string | null
  title?: string | null
  logline?: string | null
  synopsis?: string | null
  genre?: string | null
  arSummary?: string | null
}): boolean {
  if (input.sourceLocale && input.sourceLocale !== 'en') return true
  return looksNonEnglishAuthorship(
    [input.title, input.logline, input.synopsis, input.genre, input.arSummary].filter(Boolean).join('\n')
  )
}
