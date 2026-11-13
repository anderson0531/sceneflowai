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
CHARACTER NAMING, LOCALIZATION & FAMILY CONSISTENCY — MANDATORY:
- Invent original, specific, memorable FULL names (first + last) that fit culture, era, genre, and setting
- Names, ethnicities, ages, and styling MUST be culturally authentic to the story's setting, locations, and target audience
- Names must be unique within the cast and pronounceable for text-to-speech
- Prefer grounded, distinctive names over fantasy-catalog or celebrity-adjacent names
- If the user's input already names characters, preserve those EXACT names
- When inventing names, avoid well-known public-figure given names (e.g. Winston, Alexander)
- NEVER reuse these overused LLM defaults: ${BANNED_AI_CHARACTER_NAMES.join(', ')}
- Avoid single-name-only protagonists unless culturally appropriate (e.g., mononyms in documentary subjects)
- FAMILY & KINSHIP GENETICS:
  * Biological relatives sharing the same parental lineage MUST share the exact same ethnicity, compatible skin undertone, hair/eye genetics, and subtle familial facial structure.
  * When biological parents have DIFFERENT ethnicities, their biological children MUST explicitly have "Mixed [Parent A] and [Parent B] heritage" with blended physical traits from both parents.
  * Enforce biologically plausible generational age gaps (parents 20–38 years older than children; grandparents 45–68 years older than grandchildren).
- INDIVIDUALS ONLY — NEVER GROUPS:
  * Every character MUST be a single named individual — NEVER a plural or collective group ("John's Friends", "Neighbors", "The Brothers", "Factory Workers", "Parents").
- MULTI-AGE / MULTI-ERA LIFE STAGES = SEPARATE CHARACTERS:
  * Production Stage locks ONE base face reference per character card and uses Wardrobes ONLY for outfit changes at that same age.
  * When a person appears at meaningfully different ages/decades (e.g. childhood, youth, midlife, senior — >= 10 years apart), create SEPARATE character entries named "Full Name (Age NN)" (e.g. "John Miller (Age 16)", "John Miller (Age 32)", "John Miller (Age 62)") sharing identical ethnicity, eyeColor, and bone structure.`

/** Extended block for Blueprint / film treatment */
export const BLUEPRINT_CHARACTER_IDENTITY_BLOCK = `
CHARACTER IDENTITY, LOCALIZATION & FAMILY CONSISTENCY — MANDATORY:
- Extract nationality, ethnicity, region, and cultural clues from the user's input, setting, locations, and audience signals
- Character names, ethnicities, grooming, and default wardrobes MUST be culturally authentic to their heritage and the story's setting
- If input or setting indicates Thailand → use authentic Thai names & ethnicity (e.g., Niran Phan, Somchai, Malai)
- If input or setting indicates Japan → use authentic Japanese names & ethnicity (e.g., Yuki Sato, Haruto, Kenji)
- If input or setting indicates Mexico/Latin America → use authentic Spanish/Latin names & ethnicity (e.g., María Morales, Diego, Carmen)
- NEVER use generic Western names or default Western demographics for non-Western settings unless explicitly stated as an outsider/expat
- Invent original, specific, memorable FULL names — not stock fantasy or AI-catalog names
- If the user's input already names characters, preserve those EXACT names; otherwise invent fresh ones
- When inventing names, avoid well-known public-figure given names (e.g. Winston, Alexander)
- NEVER reuse these overused LLM defaults: ${BANNED_AI_CHARACTER_NAMES.join(', ')}
- FAMILY & KINSHIP GENETICS (CRITICAL):
  * Declare family links in "familyRelationships" (relation: "parent_of" | "child_of" | "sibling_of" | "grandparent_of" | "grandchild_of" | "spouse_of", biological: true/false).
  * SAME-ETHNICITY PARENTS: Biological children and full siblings MUST share the exact same ethnicity and compatible eye/hair/facial genetics.
  * MIXED-ETHNICITY PARENTS: When biological parents have DIFFERENT ethnicities (e.g. Japanese mother + African-American father), their biological children MUST be set to "Mixed [Parent A] and [Parent B] heritage" with blended physical features from both parents.
  * AGE CONSISTENCY: Give every character a concrete "age" (e.g. "45" or "mid-40s"). Biological parents MUST be 20–38 years older than their children; grandparents 45–68 years older than grandchildren.
- ENGAGING STORY BASELINE: Include every pivotal or speaking character from the beat sheet in character_descriptions with a distinct voice, playable contradiction, want/need/flaw, and vivid 2-3 sentence standing physical "appearance" aligned with the locations, props, and wardrobes.
- INDIVIDUALS ONLY — NEVER COLLECTIVE GROUPS (CRITICAL):
  * Every entry in character_descriptions and every beat's "characters" list MUST be a single named individual human — NEVER a plural or collective group ("John's Friends", "The Brothers", "Neighbors", "Classmates", "Parents", "Factory Workers"). Split couples ("Arthur & Elena Lin") into two individual character entries.
- MULTI-AGE / MULTI-ERA LIFE STAGES = SEPARATE "(Age NN)" CHARACTERS (CRITICAL FOR VIDEO MEMOIRS & FLASHBACKS):
  * Production Stage creates ONE base facial reference portrait per character card and uses Wardrobes ONLY to change outfits on that same base age/face.
  * Therefore, NEVER model a character who spans multiple life stages/decades (e.g. childhood, teen, young adult, senior — >= 10 years apart) as one character with era wardrobes!
  * Instead, create SEPARATE individual entries in character_descriptions named "Full Name (Age NN)" — e.g. "John Miller (Age 16)", "John Miller (Age 32)", "John Miller (Age 62)" — sharing identical ethnicity, gender, eyeColor, and facial bone structure while specifying each stage's exact biological "age", age-accurate hair/skin in "appearance", and period-authentic "defaultWardrobe".`

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
- When inventing names, avoid well-known public-figure given names (e.g. Winston, Alexander)
- If user input names characters, preserve those exact names
- INDIVIDUALS ONLY: Every character must be a single individual, NEVER a plural/group ("Friends", "Neighbors", "Workers")
- MULTI-AGE STAGES: If the same person appears across distinct decades/life stages, create separate characters named "Full Name (Age NN)" (e.g. "John Miller (Age 16)", "John Miller (Age 32)", "John Miller (Age 62)")`

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
