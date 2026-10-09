export type BodyDirectorRequest = {
  characterName: string
  characterRole?: string
  gender?: string
  age?: string | number
  ethnicity?: string
  genre?: string
  setting?: string
  tone?: string
  logline?: string
  visualStyle?: string
  currentAppearance?: string
  directorNotes?: string
  recommendMode?: boolean
}

export type BodyDirectorResult = {
  appearanceDescription: string
}

const RESPONSE_SCHEMA = `{
  "appearanceDescription": "1-2 sentences of standing physical identity for an image prompt: age band, ethnicity, build, face, standing hair and eyes. No clothing, accessories, makeup, injuries, plot, emotion, or performance."
}`

const SHARED_RULES = `INCLUDE:
- Age band, ethnicity, build/stature, face, standing hair, eye color
- Specific visual identity that stays stable across scenes

EXCLUDE:
- Clothing, wardrobe, jewelry, glasses, bags, hats
- Scene makeup, bruises, blood, dirt, sweat, bandages (those belong on wardrobe scene appearance)
- Plot, dialogue, emotion, and performance

GUARDRAILS:
- Keep the description concise and visually specific
- Never copy wardrobe or costume language into appearanceDescription

Return ONLY the JSON object, no additional text.`

const DIRECTOR_OVERRIDE_RULES = `DIRECTOR OVERRIDE:
- Director's notes outrank the current appearance and the character age, ethnicity, and gender lines wherever they conflict.
- Replace the conflicting detail. Do not keep both the old phrase and the new direction. Do not keep "oval face" alongside a new face direction.
- A qualitative face or body note (handsome, striking, weathered, rugged, delicate) is physical direction. Render it as visible features and drop the old face or build phrase it replaces.
- Keep age, ethnicity, build, hair, and eyes the notes do not mention.
- Character facts and screenplay context fill gaps. They do not restore a feature the notes just changed.`

function identityLines(request: BodyDirectorRequest): string {
  return [
    `- Name: ${request.characterName}`,
    request.characterRole ? `- Role: ${request.characterRole}` : '',
    request.gender ? `- Gender: ${request.gender}` : '',
    request.age != null && String(request.age).trim() ? `- Age: ${request.age}` : '',
    request.ethnicity ? `- Ethnicity: ${request.ethnicity}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function screenplayLines(request: BodyDirectorRequest): string {
  return [
    request.genre ? `- Genre: ${request.genre}` : '',
    request.tone ? `- Tone/Mood: ${request.tone}` : '',
    request.setting ? `- Setting/Era: ${request.setting}` : '',
    request.logline ? `- Story: ${request.logline}` : '',
    request.visualStyle ? `- Visual Style: ${request.visualStyle}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildBodyDirectorPrompt(request: BodyDirectorRequest): string {
  const current = request.currentAppearance?.trim()
  const identity = identityLines(request)
  const screenplay = screenplayLines(request)

  if (request.recommendMode) {
    const currentBlock = current
      ? `
CURRENT APPEARANCE (context only — recommend a fresh identity from the role and screenplay):
${current}
`
      : ''

    return `You are a casting director turning notes into a standing body description for film stills. The user is the director, not a prompt engineer.

CHARACTER:
${identity}

SCREENPLAY CONTEXT:
${screenplay || '- Not specified'}
${currentBlock}
TASK:
Recommend a specific physical identity that fits the character's role and screenplay. Do not describe clothing or wardrobe.

RESPONSE FORMAT (JSON):
${RESPONSE_SCHEMA}

${SHARED_RULES}`
  }

  const currentBlock = current
    ? `
CURRENT APPEARANCE (baseline — keep only the details the director's notes do not change):
${current}
`
    : ''

  return `You are a casting director turning notes into a standing body description for film stills. The user is the director, not a prompt engineer.

CHARACTER (defaults — yield to the director's notes on conflict):
${identity}
${screenplay ? `\nSCREENPLAY CONTEXT:\n${screenplay}\n` : ''}
${currentBlock}
DIRECTOR'S NOTES:
"${request.directorNotes || ''}"

TASK:
Apply the director's notes. They win over the current appearance and the character facts for any feature they name, including face and build. Translate qualitative notes such as handsome into specific visible features and drop the old phrase they replace. Keep details the notes do not mention. Do not describe clothing or wardrobe.

RESPONSE FORMAT (JSON):
${RESPONSE_SCHEMA}

${SHARED_RULES}

${DIRECTOR_OVERRIDE_RULES}`
}

export function parseBodyDirectorResponse(raw: string): BodyDirectorResult {
  const cleaned = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()
  const parsed = JSON.parse(cleaned) as Partial<BodyDirectorResult>
  const appearanceDescription =
    typeof parsed.appearanceDescription === 'string' ? parsed.appearanceDescription.trim() : ''
  if (!appearanceDescription) {
    throw new Error('Invalid body description structure')
  }
  return { appearanceDescription }
}
