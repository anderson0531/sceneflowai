/**
 * Match a library prop label against prose that talks about the object.
 *
 * A prop catalog is written the way a set decorator writes one — "Thirty-Inch
 * Iron Rail Spanner" — and a script is written the way a person talks: "the
 * spanner". Both directions of that mismatch have shipped bugs. Counting the
 * label's decorations as evidence attached props to beats that had none of them
 * in frame; demanding the full label dropped the reference for a prop the frame
 * genuinely holds, leaving the model an image with no instruction attached.
 *
 * The object's own noun is the deciding term either way.
 */

const PROP_MATCH_STOP_WORDS = new Set([
  'that',
  'this',
  'their',
  'with',
  'from',
  'into',
  'onto',
  'inch',
  'inches',
  'foot',
  'feet',
])

/**
 * Material, colour, size, and condition words that dress a prop label without
 * naming the object. Scene prose is full of them too, which is why they carry
 * no weight on their own.
 */
const PROP_DECORATOR_WORDS = new Set([
  // material
  'iron', 'steel', 'brass', 'copper', 'bronze', 'chrome', 'zinc', 'wood', 'wooden',
  'leather', 'canvas', 'cotton', 'linen', 'wool', 'silk', 'velvet', 'glass', 'plastic',
  'rubber', 'ceramic', 'porcelain', 'paper', 'cardboard', 'silver', 'gold', 'golden',
  'stone', 'concrete', 'enamel', 'lacquer',
  // colour
  'black', 'white', 'grey', 'gray', 'brown', 'green', 'blue', 'yellow', 'orange', 'pink',
  'violet', 'purple', 'crimson', 'scarlet', 'amber', 'ochre', 'olive', 'beige', 'ivory',
  'navy', 'teal', 'cyan', 'magenta', 'maroon', 'sepia', 'slate',
  // size and quantity
  'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'large', 'small', 'heavy', 'light',
  'thick', 'wide', 'narrow', 'giant', 'tiny', 'oversized', 'miniature', 'standard',
  // condition
  'rusted', 'rusty', 'worn', 'battered', 'damaged', 'cracked', 'chipped', 'faded',
  'tarnished', 'polished', 'antique', 'vintage', 'salvaged', 'scuffed',
])

function labelWords(propName: string): string[] {
  return propName.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
}

/** Words of a prop label that identify the object rather than describe it. */
export function propSignificantWords(propName: string): string[] {
  return labelWords(propName).filter(
    (word) =>
      word.length >= 4 && !PROP_MATCH_STOP_WORDS.has(word) && !PROP_DECORATOR_WORDS.has(word)
  )
}

/**
 * The noun a prop label ends on, which is the object itself. Decorators are
 * kept here: a prop can be named for its material ("Heavy Iron") and still
 * needs some noun to be recognized by.
 */
export function propHeadNoun(propName: string): string {
  const words = labelWords(propName).filter(
    (word) => word.length >= 3 && !PROP_MATCH_STOP_WORDS.has(word)
  )
  return words[words.length - 1] ?? ''
}

/** Whether text uses a word, allowing a plural or other suffix but not a prefix. */
export function mentionsWord(text: string, word: string): boolean {
  if (!word) return false
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(text)
}
