/**
 * Narration chunking, kept free of Node built-ins.
 *
 * The studio player runs this in the browser to decide how many TTS requests a
 * narration needs, while the share pipeline runs it on the server. It lives
 * apart from `sectionNarrationText.ts` because that module hashes with
 * node crypto, which a client bundle cannot import.
 */

const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null

/**
 * UTF-8 length, which is the unit the speech API actually limits.
 *
 * Counting `String.length` instead is how a Thai or Chinese narration silently
 * became a 400: three bytes per character means 1,500 characters is 4,500 bytes,
 * well past the 4,000-byte ceiling on `input.text`.
 */
export function narrationByteLength(text: string): number {
  if (encoder) return encoder.encode(text).length
  // Node before TextEncoder is global, and the test environment.
  return Buffer.byteLength(text, 'utf8')
}

/** Split on code points so a multi-byte character is never cut in half. */
function sliceByBytes(text: string, maxBytes: number): string[] {
  const out: string[] = []
  let current = ''
  let currentBytes = 0

  for (const char of text) {
    const charBytes = narrationByteLength(char)
    if (currentBytes + charBytes > maxBytes && current) {
      out.push(current)
      current = ''
      currentBytes = 0
    }
    current += char
    currentBytes += charBytes
  }
  if (current) out.push(current)

  return out
}

/**
 * Split long narration at paragraph and sentence boundaries when possible.
 *
 * `maxBytes` is a UTF-8 budget, not a character count, because that is the limit
 * the speech API enforces. For ASCII the two are identical, so English callers
 * see the behaviour they always had.
 *
 * Boundaries matter for more than tidiness: a chunk that ends mid-sentence is
 * also a chunk the speech model reads with the wrong prosody, and the seam is
 * audible when the next clip starts.
 */
export function chunkNarrationText(text: string, maxBytes = 1200): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  if (narrationByteLength(trimmed) <= maxBytes) return [trimmed]

  const chunks: string[] = []
  const paragraphs = trimmed.split(/\n\n+/)
  let current = ''

  const flush = () => {
    if (current.trim()) chunks.push(current.trim())
    current = ''
  }

  for (const para of paragraphs) {
    const sentences = para.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [para]
    for (const sentence of sentences) {
      const piece = sentence.trim()
      if (!piece) continue
      if (narrationByteLength(`${current} ${piece}`.trim()) > maxBytes) {
        flush()
        if (narrationByteLength(piece) > maxBytes) {
          // One sentence larger than the budget: no boundary to use, so fall
          // back to byte-safe slicing.
          chunks.push(...sliceByBytes(piece, maxBytes))
        } else {
          current = piece
        }
      } else {
        current = current ? `${current} ${piece}` : piece
      }
    }
    flush()
  }
  flush()

  return chunks.length > 0 ? chunks : sliceByBytes(trimmed, maxBytes)
}
