/**
 * Last-line defense against panel-routing language in beat still prompts.
 *
 * Combined character refs used to be 16:9 diptychs, and persisted beat prompts
 * still carry LEFT/RIGHT / diptych / NEVER-derive copy. Those phrases teach
 * the still model to emit a split frame. Strip them from positive text.
 *
 * Client-safe: string only, no sharp / Gemini / GCS.
 */

const STRUCTURAL_SENTENCE_PATTERNS: RegExp[] = [
  /NEVER derive face[^.]*\.?/gi,
  /NEVER derive clothing[^.]*\.?/gi,
  /NEVER derive identity[^.]*\.?/gi,
  /NEVER derive outfit[^.]*\.?/gi,
  /copy outfit from the RIGHT[^.]*\.?/gi,
  /use LEFT panel[^.]*\.?/gi,
  /LEFT panel =[^.]*\.?/gi,
  /RIGHT panel =[^.]*\.?/gi,
  /LEFT half =[^.]*\.?/gi,
  /RIGHT half =[^.]*\.?/gi,
  /identity source of truth[^.]*\.?/gi,
  /wardrobe source of truth[^.]*\.?/gi,
]

const STRUCTURAL_TOKEN_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bLEFT\s+(?:half|panel)\b/gi, replacement: '' },
  { pattern: /\bRIGHT\s+(?:half|panel)\b/gi, replacement: '' },
  { pattern: /\bLEFT=identity(?:\s+face)?\b/gi, replacement: '' },
  { pattern: /\bRIGHT=wardrobe(?:\s+outfit)?\b/gi, replacement: '' },
  { pattern: /\bdiptych\b/gi, replacement: '' },
  { pattern: /\btwo-panel(?:\s+layout)?\b/gi, replacement: '' },
  { pattern: /\bsplit-screen(?:\s+output)?\b/gi, replacement: '' },
  { pattern: /\bside-by-side(?:\s+panels?)?\b/gi, replacement: '' },
  { pattern: /\breference sheet collage\b/gi, replacement: '' },
  { pattern: /\bmulti-panel(?:\s+layout)?\b/gi, replacement: '' },
]

function tidyPrompt(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+,/g, ',')
    .replace(/,[ \t]*,/g, ',')
    .replace(/,\s*\./g, '.')
    .replace(/\s+\./g, '.')
    .replace(/:\s*:/g, ':')
    .replace(/—\s*—/g, '—')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '')
    .trim()
}

export function sanitizeBeatStillPrompt(prompt: string): string {
  if (!prompt) return prompt
  let next = prompt
  for (const pattern of STRUCTURAL_SENTENCE_PATTERNS) {
    next = next.replace(pattern, ' ')
  }
  for (const { pattern, replacement } of STRUCTURAL_TOKEN_PATTERNS) {
    next = next.replace(pattern, replacement)
  }
  return tidyPrompt(next)
}
