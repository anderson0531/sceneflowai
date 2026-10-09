export type LocationSceneExcerpt = {
  sceneNumber?: number
  heading?: string
  action?: string
  location?: string
  atmosphere?: string
}

export type LocationDescriptionDirectorRequest = {
  locationName: string
  intExt?: string
  timeOfDay?: string
  genre?: string
  tone?: string
  setting?: string
  logline?: string
  visualStyle?: string
  currentDescription?: string
  directorNotes?: string
  recommendMode?: boolean
  scenes?: LocationSceneExcerpt[]
}

export type LocationDescriptionDirectorResult = {
  description: string
}

const RESPONSE_SCHEMA = `{
  "description": "2-4 sentences of standing place identity for an establishing still: architecture, materials, light, era, and atmosphere. No plot, performance, or a different location."
}`

const SHARED_RULES = `INCLUDE:
- Architecture, materials, scale, light, time of day, and era
- Standing place details that stay true across scenes in this location

EXCLUDE:
- Plot, dialogue, emotion, and performance
- Characters, wardrobe, and hand props
- A different place than the named location

GUARDRAILS:
- Stay aligned with the screenplay scenes for this location
- Do not invent a new setting when the scenes already describe one
- Keep the description concise and visually specific

Return ONLY the JSON object, no additional text.`

const DIRECTOR_OVERRIDE_RULES = `DIRECTOR OVERRIDE:
- Director's notes outrank the current description and the scene excerpts wherever they conflict.
- Replace the conflicting detail. Do not keep both the old phrase and the new direction.
- Keep architecture, materials, light, and era the notes do not mention.
- Screenplay scenes fill gaps. They do not restore a detail the notes just changed.`

function placeLines(request: LocationDescriptionDirectorRequest): string {
  return [
    `- Name: ${request.locationName}`,
    request.intExt ? `- Interior/Exterior: ${request.intExt}` : '',
    request.timeOfDay ? `- Time of day: ${request.timeOfDay}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function screenplayLines(request: LocationDescriptionDirectorRequest): string {
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

function sceneBlock(scenes: LocationSceneExcerpt[] | undefined): string {
  const rows = (scenes || [])
    .map((scene) => {
      const bits = [
        scene.sceneNumber != null ? `Scene ${scene.sceneNumber}` : '',
        scene.heading?.trim() || '',
        scene.location?.trim() ? `Place: ${scene.location.trim()}` : '',
        scene.atmosphere?.trim() ? `Atmosphere: ${scene.atmosphere.trim()}` : '',
        scene.action?.trim() ? `Action: ${scene.action.trim()}` : '',
      ].filter(Boolean)
      return bits.join(' — ')
    })
    .filter(Boolean)
  if (rows.length === 0) return ''
  return rows.map((row) => `- ${row}`).join('\n')
}

export function buildLocationDescriptionDirectorPrompt(
  request: LocationDescriptionDirectorRequest
): string {
  const current = request.currentDescription?.trim()
  const place = placeLines(request)
  const screenplay = screenplayLines(request)
  const scenes = sceneBlock(request.scenes)

  if (request.recommendMode) {
    const currentBlock = current
      ? `
CURRENT DESCRIPTION (context only — recommend a fresh place identity from the scenes):
${current}
`
      : ''

    return `You are a production designer turning a screenplay into a standing location description for an establishing still. The user is the director, not a prompt engineer.

LOCATION:
${place}

SCREENPLAY CONTEXT:
${screenplay || '- Not specified'}

SCENES IN THIS LOCATION:
${scenes || '- Not specified'}
${currentBlock}
TASK:
Recommend a specific visual description of this place from the scenes above. Stay with this location. Do not describe plot or performance.

RESPONSE FORMAT (JSON):
${RESPONSE_SCHEMA}

${SHARED_RULES}`
  }

  const currentBlock = current
    ? `
CURRENT DESCRIPTION (baseline — keep only the details the director's notes do not change):
${current}
`
    : ''

  return `You are a production designer turning notes into a standing location description for an establishing still. The user is the director, not a prompt engineer.

LOCATION (defaults — yield to the director's notes on conflict):
${place}
${screenplay ? `\nSCREENPLAY CONTEXT:\n${screenplay}\n` : ''}
SCENES IN THIS LOCATION:
${scenes || '- Not specified'}
${currentBlock}
DIRECTOR'S NOTES:
"${request.directorNotes || ''}"

TASK:
Apply the director's notes. They win over the current description and the scene excerpts for any place detail they name. Keep details the notes do not mention. Stay with this location. Do not describe plot or performance.

RESPONSE FORMAT (JSON):
${RESPONSE_SCHEMA}

${SHARED_RULES}

${DIRECTOR_OVERRIDE_RULES}`
}

export function parseLocationDescriptionDirectorResponse(
  raw: string
): LocationDescriptionDirectorResult {
  const cleaned = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()
  const parsed = JSON.parse(cleaned) as Partial<LocationDescriptionDirectorResult>
  const description = typeof parsed.description === 'string' ? parsed.description.trim() : ''
  if (!description) {
    throw new Error('Invalid location description structure')
  }
  return { description }
}
