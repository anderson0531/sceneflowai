export type WardrobeDirectorRequest = {
  characterName: string
  characterRole?: string
  appearanceDescription?: string
  wardrobeDescription?: string
  genre?: string
  setting?: string
  tone?: string
  logline?: string
  visualStyle?: string
  recommendMode?: boolean
  currentOutfit?: string
  currentAccessories?: string
  currentAppearanceNotes?: string
}

export type WardrobeDirectorResult = {
  defaultWardrobe: string
  wardrobeAccessories: string
  wardrobeName?: string
  appearanceNotes: string
}

const RESPONSE_SCHEMA = `{
  "wardrobeName": "A short name for this look (2-3 words max), e.g., 'Office Attire', 'Casual Home', 'Formal Event'",
  "defaultWardrobe": "Clothing only: garments, colors, materials, fit. 1-2 sentences for an image prompt. No jewelry, bags, makeup, hair state, injuries, body identity, plot, or emotion.",
  "wardrobeAccessories": "Carry items and worn extras: jewelry, glasses, watches, bags, hats. Empty string if none.",
  "appearanceNotes": "Makeup, hair state, visible injuries or marks for scene continuity. Empty string if none. Not emotion or performance."
}`

const SHARED_RULES = `SPLIT RULES:
- Clothing (shirt, jacket, trousers, dress, shoes, coat) → defaultWardrobe
- Jewelry, glasses, watches, bags, hats, worn extras → wardrobeAccessories
- Makeup, hair, bruises, blood, dirt, sweat, bandages → appearanceNotes
- Never put body identity (age, ethnicity, face, body shape) into any field
- Never write plot beats, dialogue, or emotion as wardrobe
- Wardrobe is not a substitute for performance or facial expression

GUARDRAILS:
- Keep each field concise and visually specific (colors, materials, fit)
- Do NOT include bags, satchels, backpacks, or other casual carry items if the scene is a formal event, public debate, or stage performance
- On stage / debate / public event, accessories may include glasses, watch, ring — not satchel or backpack
- If a field does not apply, return an empty string

Return ONLY the JSON object, no additional text.`

function currentLookBlock(request: WardrobeDirectorRequest): string {
  const outfit = request.currentOutfit?.trim()
  const accessories = request.currentAccessories?.trim()
  const look = request.currentAppearanceNotes?.trim()
  if (!outfit && !accessories && !look) return ''

  return `
CURRENT LOOK (update this; do not invent a replacement unless the director asks to start over):
${outfit ? `- Outfit: ${outfit}` : ''}
${accessories ? `- Accessories: ${accessories}` : ''}
${look ? `- Scene appearance: ${look}` : ''}
`
}

export function buildWardrobeDirectorPrompt(request: WardrobeDirectorRequest): string {
  const isRecommendMode = request.recommendMode === true
  const currentLook = currentLookBlock(request)

  if (isRecommendMode) {
    return `You are a costume designer turning director notes into a film wardrobe breakdown. The user is the director, not a prompt engineer.

CHARACTER PROFILE:
- Name: ${request.characterName}
${request.characterRole ? `- Role in Story: ${request.characterRole}` : ''}
${request.appearanceDescription ? `- Physical Appearance (identity context only — do not copy into wardrobe fields): ${request.appearanceDescription}` : ''}

SCREENPLAY CONTEXT:
${request.genre ? `- Genre: ${request.genre}` : '- Genre: Not specified'}
${request.tone ? `- Tone/Mood: ${request.tone}` : ''}
${request.setting ? `- Setting/Era: ${request.setting}` : ''}
${request.logline ? `- Story: ${request.logline}` : ''}
${request.visualStyle ? `- Visual Style: ${request.visualStyle}` : ''}
${currentLook}
TASK:
Recommend a signature wardrobe that matches the character's role and screenplay. Split the result into clothing, accessories, and scene appearance.

RESPONSE FORMAT (JSON):
${RESPONSE_SCHEMA}

${SHARED_RULES}`
  }

  return `You are a costume designer turning director notes into a film wardrobe breakdown. The user is the director, not a prompt engineer.

CHARACTER CONTEXT:
- Name: ${request.characterName}
${request.characterRole ? `- Role: ${request.characterRole}` : ''}
${request.appearanceDescription ? `- Appearance (identity context only — do not copy into wardrobe fields): ${request.appearanceDescription}` : ''}
${request.genre ? `- Genre: ${request.genre}` : ''}
${request.setting ? `- Setting/Era: ${request.setting}` : ''}
${currentLook}
DIRECTOR'S NOTES:
"${request.wardrobeDescription || ''}"

TASK:
Apply the director's notes. If a current look is provided, treat the notes as a change to that look. Split the result into clothing, accessories, and scene appearance. Be specific about colors, materials, and fit.

RESPONSE FORMAT (JSON):
${RESPONSE_SCHEMA}

${SHARED_RULES}`
}

export function parseWardrobeDirectorResponse(raw: string): WardrobeDirectorResult {
  const cleaned = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()
  const parsed = JSON.parse(cleaned) as Partial<WardrobeDirectorResult>
  const defaultWardrobe = typeof parsed.defaultWardrobe === 'string' ? parsed.defaultWardrobe.trim() : ''
  if (!defaultWardrobe) {
    throw new Error('Invalid wardrobe structure')
  }
  return {
    defaultWardrobe,
    wardrobeAccessories:
      typeof parsed.wardrobeAccessories === 'string' ? parsed.wardrobeAccessories.trim() : '',
    wardrobeName: typeof parsed.wardrobeName === 'string' ? parsed.wardrobeName.trim() : undefined,
    appearanceNotes:
      typeof parsed.appearanceNotes === 'string' ? parsed.appearanceNotes.trim() : '',
  }
}
