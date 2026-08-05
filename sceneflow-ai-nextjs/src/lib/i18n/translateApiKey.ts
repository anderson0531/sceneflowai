/**
 * One place to resolve the Google Cloud Translation API key.
 *
 * The codebase had drifted into two conventions — `/api/translate` accepted
 * `GOOGLE_TRANSLATE_API_KEY || GOOGLE_API_KEY` while `/api/translate/google`
 * only read `GOOGLE_API_KEY` — so the same deployment could have a working
 * batch endpoint and a broken single-text one. Both now go through here.
 */
export function resolveTranslateApiKey(): string | undefined {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_API_KEY
  return key?.trim() || undefined
}
