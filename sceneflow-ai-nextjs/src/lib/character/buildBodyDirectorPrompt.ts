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
- Age band, ethnicity, build/stature, face shape, standing hair, eye color
- Specific visual identity that stays stable across scenes

EXCLUDE:
- Clothing, wardrobe, jewelry, glasses, bags, hats
- Scene makeup, bruises, blood, dirt, sweat, bandages (those belong on wardrobe scene appearance)
- Plot, dialogue, emotion, performance, or personality as a substitute for looks

GUARDRAILS:
- Keep the description concise and visually specific
- If current appearance is provided and the director gave a change, update that identity — do not invent a replacement unless they ask to start over
- Never copy wardrobe or costume language into appearanceDescription

Return ONLY the JSON object, no additional text.`

export function buildBodyDirectorPrompt(request: BodyDirectorRequest): string {
  const current = request.currentAppearance?.trim()
  const currentBlock = current
    ? `
CURRENT APPEARANCE (update this; do not invent a replacement unless the director asks to start over):
${current}
`
    : ''

  const identityLines = [
    `- Name: ${request.characterName}`,
    request.characterRole ? `- Role: ${request.characterRole}` : '',
    request.gender ? `- Gender: ${request.gender}` : '',
    request.age != null && String(request.age).trim() ? `- Age: ${request.age}` : '',
    request.ethnicity ? `- Ethnicity: ${request.ethnicity}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const screenplay = [
    request.genre ? `- Genre: ${request.genre}` : '',
    request.tone ? `- Tone/Mood: ${request.tone}` : '',
    request.setting ? `- Setting/Era: ${request.setting}` : '',
    request.logline ? `- Story: ${request.logline}` : '',
    request.visualStyle ? `- Visual Style: ${request.visualStyle}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  if (request.recommendMode) {
    return `You are a casting director turning notes into a standing body description for film stills. The user is the director, not a prompt engineer.

CHARACTER:
${identityLines}

SCREENPLAY CONTEXT:
${screenplay || '- Not specified'}
${currentBlock}
TASK:
Recommend a specific physical identity that fits the character's role and screenplay. Do not describe clothing or wardrobe.

RESPONSE FORMAT (JSON):
${RESPONSE_SCHEMA}

${SHARED_RULES}`
  }

  return `You are a casting director turning notes into a standing body description for film stills. The user is the director, not a prompt engineer.

CHARACTER:
${identityLines}
${screenplay ? `\nSCREENPLAY CONTEXT:\n${screenplay}\n` : ''}
${currentBlock}
DIRECTOR'S NOTES:
"${request.directorNotes || ''}"

TASK:
Apply the director's notes to the standing body description. If current appearance is provided, treat the notes as a change. Be specific about age, ethnicity, build, face, hair, and eyes. Do not describe clothing or wardrobe.

RESPONSE FORMAT (JSON):
${RESPONSE_SCHEMA}

${SHARED_RULES}`
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
