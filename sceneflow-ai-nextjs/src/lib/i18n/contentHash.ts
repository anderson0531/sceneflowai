import { createHash } from 'crypto'

/**
 * Cache key for a source string.
 *
 * Whitespace is normalized so trivially-different strings share an entry, but
 * the text is otherwise hashed verbatim: a real wording change must miss the
 * cache, which is what removes the need for any invalidation logic.
 *
 * Kept free of database imports so it can be used (and tested) without
 * connection configuration.
 */
export function sourceHash(text: string, sourceLocale: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  return createHash('sha256').update(`${sourceLocale}\u0000${normalized}`).digest('hex')
}
