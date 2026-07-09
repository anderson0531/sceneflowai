/**
 * Shared character naming guidance for Series, Blueprint, and Script generation.
 * Reduces repetitive LLM-default names (Elara, Vance, Lyra, etc.) and enforces originality.
 */

export const BANNED_AI_CHARACTER_NAMES = [
  'Elara',
  'Vance',
  'Lyra',
  'Kael',
  'Thorne',
  'Aria',
  'Zephyr',
  'Luna Snow',
  'Marcus Thorne',
  'Elena Vance',
  'Kai',
  'Nova',
  'Seraphina',
  'Orion',
  'Cassian',
] as const

/** Compact block for Series bible / episode prompts */
export const SERIES_CHARACTER_NAMING_BLOCK = `
CHARACTER NAMING — MANDATORY:
- Invent original, specific, memorable FULL names (first + last) that fit culture, era, genre, and setting
- Names must be unique within the cast and pronounceable for text-to-speech
- Prefer grounded, distinctive names over fantasy-catalog or celebrity-adjacent names
- If the user's input already names characters, preserve those EXACT names
- NEVER reuse these overused LLM defaults: ${BANNED_AI_CHARACTER_NAMES.join(', ')}
- Avoid single-name-only protagonists unless culturally appropriate (e.g., mononyms in documentary subjects)`

/** Extended block for Blueprint / film treatment */
export const BLUEPRINT_CHARACTER_IDENTITY_BLOCK = `
CHARACTER IDENTITY — MANDATORY:
- Extract nationality, ethnicity, and cultural clues from the user's input
- Character names MUST be culturally authentic to their ethnicity and the story's setting
- If input mentions "Thai woman" → use authentic Thai names (e.g., Niran, Somchai, Malai)
- If input mentions "Japanese" → use Japanese names (e.g., Yuki, Haruto, Kenji, Sakura)
- If input mentions "Mexican" → use Spanish/Latin names (e.g., María, Diego, Carmen)
- NEVER use generic Western names for non-Western characters unless explicitly stated
- The ethnicity field must EXACTLY match what's implied in the input
- Invent original, specific, memorable FULL names — not stock fantasy or AI-catalog names
- If the user's input already names characters, preserve those EXACT names; otherwise invent fresh ones
- NEVER reuse these overused LLM defaults: ${BANNED_AI_CHARACTER_NAMES.join(', ')}
- Each character needs a distinct voice, want/need/flaw, and clear relationship to the protagonist — not interchangeable archetypes`

/** For V2 BlueprintService and similar */
export const BLUEPRINT_NAMING_REQUIREMENTS = `
CHARACTER NAMING REQUIREMENTS (CRITICAL):
- Use FULL character names in Title Case
- NO abbreviations or nicknames as primary names
- Be consistent: use exact same spelling throughout
- Include suffixes if applicable (Sr, Jr, III)
- Avoid ALL CAPS or lowercase
- Character names must be unique and clearly identify each person
- Invent original names — NEVER reuse: ${BANNED_AI_CHARACTER_NAMES.join(', ')}
- If user input names characters, preserve those exact names`

/**
 * Build dynamic dialogue examples from the character whitelist (avoids anchoring to stock names).
 */
export function buildCharacterDialogueExamples(characters: Array<{ name?: string }>): string {
  const names = characters
    .map((c) => c.name?.trim())
    .filter((n): n is string => Boolean(n))
    .slice(0, 3)

  if (names.length === 0) {
    return `CHARACTER NAME RULES (CRITICAL):
1. **In the "character" field**: Use EXACT full names from the character whitelist
   - Example: {"character": "Morgan Ellis", "line": "..."}
2. **In the "line" field**: Use natural, contextual address (first names, titles, relationship terms)
   - Example: {"character": "Morgan Ellis", "line": "[calmly] Jordan, we need to talk."}`
  }

  const primary = names[0]
  const secondary = names[1] || names[0]
  const primaryFirst = primary.split(/\s+/)[0] || primary
  const secondaryFirst = secondary.split(/\s+/)[0] || secondary

  return `CHARACTER NAME RULES (CRITICAL):
1. **In the "character" field**: Use EXACT full names from the whitelist
   - Example: {"character": "${primary}", "line": "..."}
2. **In the "line" field**: Use NATURAL, CONTEXTUAL names
   - Example: {"character": "${primary}", "line": "[calmly] ${secondaryFirst}, it's been a while."}
   - Example: {"character": "${secondary}", "line": "[dryly] ${primaryFirst}, what are you doing here?"}
3. **Addressing naturally**: Family (first names, Dad/Mom), professional (Dr./Mr. + last name), peers (first names)
DO NOT force full character names into dialogue text unnaturally.`
}
