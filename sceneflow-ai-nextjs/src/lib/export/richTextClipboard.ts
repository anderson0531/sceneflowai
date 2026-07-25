/**
 * Clipboard helpers for rich-text export.
 *
 * Writing `text/html` alongside `text/plain` is what lets a paste into Google Docs,
 * Word, or Notion arrive as real headings and tables rather than a wall of markdown.
 * Firefox does not implement ClipboardItem writes, so plain text is the fallback.
 */

export type RichTextPayload = {
  html: string
  text: string
}

export function supportsRichTextClipboard(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof ClipboardItem !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.clipboard?.write === 'function'
  )
}

/** Resolves to the flavor actually written, so callers can tailor their confirmation. */
export async function copyRichText({
  html,
  text,
}: RichTextPayload): Promise<'rich' | 'plain'> {
  if (supportsRichTextClipboard()) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ])
      return 'rich'
    } catch {
      // Permission denied or an unsupported MIME combination — fall through to plain.
    }
  }

  await copyPlainText(text)
  return 'plain'
}

export async function copyPlainText(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  throw new Error('Clipboard is unavailable in this browser')
}
