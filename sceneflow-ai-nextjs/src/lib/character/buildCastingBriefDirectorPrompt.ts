export type CastingBriefDirectorRequest = {
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
  appearanceDescription?: string
  currentBrief?: string
  directorNotes?: string
  recommendMode?: boolean
  hasPortrait?: boolean
}

export type CastingBriefDirectorResult = {
  voiceDescription: string
}

const RESPONSE_SCHEMA = `{
  "voiceDescription": "One paragraph (200–600 characters) that is both the matching brief and the Gemini TTS voice profile. Combine standing physical identity with casting role: age band, ethnicity, build/face cues that affect the voice, plus role, demeanor, cadence, register, texture, and accent."
}`

const SHARED_RULES = `INCLUDE:
- Standing physical identity that affects the voice: age band, ethnicity, build, face, standing hair
- Casting role: function in the story, demeanor, cadence, register, texture, accent
- Specific acoustic cues (baritone/alto, gravel, measured, unhurried) when the look or role implies them

EXCLUDE:
- Clothing, wardrobe, jewelry, glasses, bags, hats
- Plot beats, backstory events, and dialogue / sample lines
- Scene makeup, bruises, blood, dirt (those belong on wardrobe)

GUARDRAILS:
- The brief must be a combination of detailed physical appearance and casting role — not role-only adjectives
- If current brief is provided and the director gave a change, rewrite the whole brief to match the new direction
- Never copy wardrobe or costume language into voiceDescription

Return ONLY the JSON object, no additional text.`

function identityLines(request: CastingBriefDirectorRequest): string {
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

function screenplayLines(request: CastingBriefDirectorRequest): string {
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

export function buildCastingBriefDirectorPrompt(request: CastingBriefDirectorRequest): string {
  const appearance = request.appearanceDescription?.trim()
  const appearanceBlock = appearance
    ? `
PHYSICAL IDENTITY (from Body Description — use this; do not invent a different face or age):
${appearance}
`
    : ''

  const current = request.currentBrief?.trim()
  const currentBlock = current
    ? `
CURRENT CASTING BRIEF (replace this with a full rewrite):
${current}
`
    : ''

  const portraitLine = request.hasPortrait
    ? '\nA character portrait informed the physical identity above. Trust that identity over generic role stereotypes.'
    : ''

  const identity = identityLines(request)
  const screenplay = screenplayLines(request)

  if (request.recommendMode) {
    return `You are a voice casting director writing a Casting Brief for Gemini TTS. The user is the director, not a prompt engineer.

CHARACTER:
${identity}

SCREENPLAY CONTEXT:
${screenplay || '- Not specified'}
${appearanceBlock}${currentBlock}${portraitLine}

TASK:
Recommend a full Casting Brief that combines the character's physical identity with their casting role. Do not describe clothing or wardrobe. Do not write dialogue.

RESPONSE FORMAT (JSON):
${RESPONSE_SCHEMA}

${SHARED_RULES}`
  }

  return `You are a voice casting director writing a Casting Brief for Gemini TTS. The user is the director, not a prompt engineer.

CHARACTER:
${identity}
${screenplay ? `\nSCREENPLAY CONTEXT:\n${screenplay}\n` : ''}
${appearanceBlock}${currentBlock}${portraitLine}

DIRECTOR'S NOTES:
"${request.directorNotes || ''}"

TASK:
Apply the director's notes and rewrite the entire Casting Brief. Combine physical identity with casting role. Do not describe clothing or wardrobe. Do not write dialogue.

RESPONSE FORMAT (JSON):
${RESPONSE_SCHEMA}

${SHARED_RULES}`
}

export function parseCastingBriefDirectorResponse(raw: string): CastingBriefDirectorResult {
  const cleaned = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()
  const parsed = JSON.parse(cleaned) as Partial<CastingBriefDirectorResult>
  const voiceDescription =
    typeof parsed.voiceDescription === 'string' ? parsed.voiceDescription.trim() : ''
  if (!voiceDescription) {
    throw new Error('Invalid casting brief structure')
  }
  return { voiceDescription }
}
