/**
 * Narration chunking, kept free of Node built-ins.
 *
 * The studio player runs this in the browser to decide how many TTS requests a
 * narration needs, while the share pipeline runs it on the server. It lives
 * apart from `sectionNarrationText.ts` because that module hashes with
 * `node:crypto`, which a client bundle cannot import.
 */

/**
 * Split long narration at paragraph and sentence boundaries when possible.
 *
 * Boundaries matter for more than tidiness: a chunk that ends mid-word is also
 * a chunk the speech model reads with the wrong prosody, and the seam is
 * audible when the next clip starts.
 */
export function chunkNarrationText(text: string, maxLen = 1200): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  if (trimmed.length <= maxLen) return [trimmed]

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
      if (`${current} ${piece}`.trim().length > maxLen) {
        flush()
        if (piece.length > maxLen) {
          let cursor = 0
          while (cursor < piece.length) {
            chunks.push(piece.slice(cursor, cursor + maxLen))
            cursor += maxLen
          }
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

  return chunks.length > 0 ? chunks : [trimmed.slice(0, maxLen)]
}
