import type { NextRequest } from 'next/server'

import { DEFAULT_LOCALE, isLocale, UI_LOCALE_COOKIE } from '@/i18n/locale'
import {
  resolveStoryLocale,
  type ResolvedStoryLocale,
  type ResolveStoryLocaleOptions,
} from '@/i18n/server/storyLocale'

/**
 * Request-aware story language for routes that receive user-typed text.
 *
 * The two seams in this module exist so a creator can type in their own
 * language from any dialog without the ~55 dialogs (and ~116 client files that
 * call `fetch` directly) each having to remember to send a locale. The
 * interface locale already rides along on every same-origin request as the
 * `sf-locale` cookie, so the server can recover it even when the caller sends
 * nothing.
 *
 * Resolution stays server-authoritative: the cookie is consulted only after
 * {@link resolveStoryLocale} has exhausted explicit -> project -> series ->
 * account, so a project written in one language is never overridden by whatever
 * language the reader happens to be browsing in.
 */
export async function resolveRequestStoryLocale(
  request: NextRequest,
  options: ResolveStoryLocaleOptions = {}
): Promise<ResolvedStoryLocale> {
  const resolved = await resolveStoryLocale(options)
  if (resolved.source !== 'default') return resolved

  const cookieLocale = request.cookies.get(UI_LOCALE_COOKIE)?.value
  if (!isLocale(cookieLocale)) return resolved

  return { ...resolved, storyLocale: cookieLocale, source: 'cookie' }
}

/**
 * Render user-entered text into English for the generation models.
 *
 * Imagen, Veo and Kling produce markedly worse output from non-English
 * prompts, and the damage is invisible — the render just gets worse, with
 * nothing pointing back at a language setting. So creative *direction* stays in
 * the creator's language (the text models read it natively and
 * `localeDirective` makes them answer in it), while anything that ends up in a
 * generation prompt is normalized here first.
 *
 * A no-op for English, so English requests keep byte-identical prompts. On
 * provider failure the source text is returned rather than throwing: a
 * mistranslated prompt is recoverable, a failed render is not.
 */
export async function englishForModel(
  text: string | null | undefined,
  storyLocale: string,
  glossary: readonly string[] = []
): Promise<string> {
  if (!text || !text.trim()) return text ?? ''
  if (storyLocale === DEFAULT_LOCALE) return text

  const [translated] = await englishForModelBatch([text], storyLocale, glossary)
  return translated ?? text
}

/**
 * Batch form of {@link englishForModel}, preserving input order.
 *
 * Prefer this when a route normalizes several prompt fields: the translator
 * deduplicates and caches per string, so one call keeps the provider round
 * trips to a single batch.
 */
export async function englishForModelBatch(
  texts: readonly (string | null | undefined)[],
  storyLocale: string,
  glossary: readonly string[] = []
): Promise<string[]> {
  const normalized = texts.map((text) => text ?? '')
  if (storyLocale === DEFAULT_LOCALE) return normalized
  if (!normalized.some((text) => text.trim())) return normalized

  try {
    const { translateStrings } = await import('@/lib/i18n/contentTranslator')
    const { translations } = await translateStrings({
      texts: normalized.filter((text) => text.trim()),
      targetLocale: DEFAULT_LOCALE,
      sourceLocale: storyLocale,
      glossary,
    })
    return normalized.map((text) => translations.get(text) ?? text)
  } catch (error) {
    console.warn('[englishForModel] translation failed:', (error as Error)?.message)
    return normalized
  }
}
