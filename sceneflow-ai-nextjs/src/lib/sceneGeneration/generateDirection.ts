/**
 * Pure (non-DB-writing) helper that produces a fully-shaped
 * DetailedSceneDirection for a single scene.
 *
 * Lifted from `[api/scene/generate-direction/route.ts]` so both the
 * per-scene route and the Storyboard Express orchestrator can share
 * the same Gemini call + JSON repair + defaults pipeline without
 * duplicating logic.
 */

import {
  DetailedSceneDirection,
  SceneSegmentPromptBundleEntry,
} from '../../types/scene-direction'
import { generateSceneContentHash } from '../../lib/utils/contentHash'
import { generateText } from '@/lib/vertexai/gemini'
import type { SceneDirectionResult } from './types'

export interface GenerateSceneDirectionParams {
  scene: {
    heading?: string | { text: string }
    action?: string
    visualDescription?: string
    narration?: string
    dialogue?: Array<{ character: string; text?: string; line?: string }>
    characters?: string[]
    [key: string]: any
  }
  /** Used only for log breadcrumbs. */
  sceneIndex?: number
}

async function callGemini(
  prompt: string
): Promise<{ text: string; finishReason?: string }> {
  const result = await generateText(prompt, {
    model: 'gemini-3.1-pro-preview',
    temperature: 0.7,
    topP: 0.95,
    maxOutputTokens: 12000,
    responseMimeType: 'application/json',
  })
  return { text: result.text, finishReason: result.finishReason }
}

function extractJsonFromResponse(responseText: string): string {
  let text = responseText.trim()
  const codeBlockMatch = text.match(/```(?:json|JSON)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim()
  } else {
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\s*\n?/, '').replace(/\n?\s*```\s*$/, '')
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\s*\n?/, '').replace(/\n?\s*```\s*$/, '')
    }
  }
  if (!text.startsWith('{')) {
    const firstBrace = text.indexOf('{')
    if (firstBrace >= 0) {
      text = text.substring(firstBrace)
    }
  }
  return text
}

function repairTruncatedJson(text: string): string {
  try {
    JSON.parse(text)
    return text
  } catch {}
  let repaired = text
  const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length
  if (quoteCount % 2 !== 0) repaired += '"'
  let braces = 0,
    brackets = 0
  let inString = false
  for (let i = 0; i < repaired.length; i++) {
    const ch = repaired[i]
    if (ch === '"' && (i === 0 || repaired[i - 1] !== '\\')) {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '{') braces++
    else if (ch === '}') braces--
    else if (ch === '[') brackets++
    else if (ch === ']') brackets--
  }
  repaired = repaired.replace(/,\s*$/, '')
  while (brackets > 0) {
    repaired += ']'
    brackets--
  }
  while (braces > 0) {
    repaired += '}'
    braces--
  }
  return repaired
}

function fillDirectionDefaults(direction: any): DetailedSceneDirection {
  if (!direction.camera) {
    direction.camera = {
      shots: ['Medium Shot'],
      angle: 'Eye-Level',
      movement: 'Static',
      lensChoice: 'Standard (50mm)',
      focus: 'Deep Focus',
    }
  }
  if (!direction.lighting) {
    direction.lighting = {
      overallMood: 'Natural',
      timeOfDay: 'Day',
      keyLight: 'Soft key from camera left',
      fillLight: 'Ambient fill',
      backlight: 'Rim light for separation',
      practicals: 'None',
      colorTemperature: 'Neutral',
    }
  }
  if (!direction.scene) {
    direction.scene = {
      location: 'Interior',
      keyProps: [],
      atmosphere: 'Neutral',
    }
  }
  if (!direction.talent) {
    direction.talent = {
      blocking: 'Standard positioning',
      keyActions: ['Perform dialogue as written'],
      emotionalBeat: 'As scripted',
    }
  }
  if (!direction.audio) {
    direction.audio = {
      priorities: 'Clean dialogue capture',
      considerations: 'Standard set protocols',
    }
  }
  if (!direction.sceneDescription) direction.sceneDescription = ''
  if (!Array.isArray(direction.segmentPromptBundle)) {
    direction.segmentPromptBundle = []
  }
  return direction as DetailedSceneDirection
}

function splitNarrationSentences(text: string): string[] {
  const raw = String(text || '').trim()
  if (!raw) return []
  return raw
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

interface TimelineRow {
  timelineIndex: number
  kind: 'narration' | 'dialogue'
  dialogueIndex?: number
  character: string
  lineText: string
}

function buildSegmentPromptTimeline(
  scene: GenerateSceneDirectionParams['scene']
): TimelineRow[] {
  const timeline: TimelineRow[] = []
  const narrationLines = splitNarrationSentences(scene.narration || '')
  narrationLines.forEach((lineText) => {
    timeline.push({
      timelineIndex: timeline.length,
      kind: 'narration',
      character: 'NARRATOR',
      lineText,
    })
  })
  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  dialogue.forEach((d, idx) => {
    const lineText = String(d?.line || d?.text || '').trim()
    if (!lineText) return
    timeline.push({
      timelineIndex: timeline.length,
      kind: 'dialogue',
      dialogueIndex: idx,
      character: String(d?.character || 'UNKNOWN'),
      lineText,
    })
  })
  return timeline
}

function fallbackPromptBundle(
  scene: GenerateSceneDirectionParams['scene']
): SceneSegmentPromptBundleEntry[] {
  const timeline = buildSegmentPromptTimeline(scene)
  const visualBase = String(scene.visualDescription || scene.action || '').trim()
  return timeline.map((line) => ({
    timelineIndex: line.timelineIndex,
    kind: line.kind,
    dialogueIndex: line.dialogueIndex,
    character: line.character,
    lineText: line.lineText,
    segmentDirectionSummary: `${line.character}: ${line.lineText}`.slice(0, 240),
    startFramePrompt: visualBase || `Opening visual for ${line.character} line`,
    endFramePrompt: `End state after this beat: ${line.lineText}`.slice(0, 320),
    videoPrompt: `Cinematic continuation for ${line.character}: ${line.lineText}`.slice(
      0,
      480
    ),
  }))
}

function normalizePromptBundle(
  scene: GenerateSceneDirectionParams['scene'],
  direction: DetailedSceneDirection
): SceneSegmentPromptBundleEntry[] {
  const timeline = buildSegmentPromptTimeline(scene)
  const source = Array.isArray(direction.segmentPromptBundle)
    ? direction.segmentPromptBundle
    : []
  const byTimeline = new Map<number, any>()
  for (const row of source) {
    if (typeof row?.timelineIndex === 'number' && row.timelineIndex >= 0) {
      byTimeline.set(row.timelineIndex, row)
    }
  }
  return timeline.map((line) => {
    const row = byTimeline.get(line.timelineIndex)
    return {
      timelineIndex: line.timelineIndex,
      kind: line.kind,
      dialogueIndex: line.dialogueIndex,
      character: line.character,
      lineText: line.lineText,
      segmentDirectionSummary: String(
        row?.segmentDirectionSummary || `${line.character}: ${line.lineText}`
      ).trim(),
      startFramePrompt: String(
        row?.startFramePrompt || row?.startFrameDescription || ''
      ).trim(),
      endFramePrompt: String(
        row?.endFramePrompt || row?.endFrameDescription || ''
      ).trim(),
      videoPrompt: String(row?.videoPrompt || row?.f2vPrompt || '').trim(),
    }
  })
}

function buildSceneDirectionPrompt(
  scene: GenerateSceneDirectionParams['scene']
): string {
  const heading =
    typeof scene.heading === 'string' ? scene.heading : scene.heading?.text || ''
  const action = scene.action || ''
  const visualDescription = scene.visualDescription || ''
  const narration = scene.narration || ''
  const dialogue = scene.dialogue || []
  const characters = scene.characters || []

  const dialogueText = dialogue
    .map((d, idx) => `[${idx}] ${d.character}: ${d.line || d.text || ''}`)
    .join('\n')
  const charactersList =
    characters.length > 0 ? `\nCharacters in scene: ${characters.join(', ')}\n` : ''

  const dialogueLinesList = dialogue.map((d, idx) => ({
    index: idx,
    character: d.character,
    line: d.line || d.text || '',
  }))
  const segmentPromptTimeline = buildSegmentPromptTimeline(scene)

  return `You are a world-class film director and cinematographer. Your task is to generate detailed, professional-grade technical instructions for a live-action film crew based on the following scene information.

SCENE INFORMATION:
${heading ? `Heading: ${heading}\n` : ''}${charactersList}${action ? `Action: ${action}\n` : ''}${visualDescription ? `Visual Description: ${visualDescription}\n` : ''}${narration ? `Narration: ${narration}\n` : ''}${dialogueText ? `Dialogue:\n${dialogueText}\n` : ''}
CRITICAL TALENT RULE:
- The talent blocking MUST reference ONLY the characters listed above
- DO NOT invent new characters or add characters not in this scene
- Reference characters by name exactly as listed

CINEMATIC PERFORMANCE DIRECTION:
For each dialogue line, provide specific, actionable performance direction that elevates the acting to cinematic quality. Follow these principles:
1. CINEMATIC SETUP: Describe the shot composition and physical context (e.g., "Cinematic Close-up: She sits at a mahogany desk under a single warm lamp")
2. MICRO-EXPRESSIONS: Add subtle facial transitions (e.g., "eyes widen with recognition, lower lip trembles imperceptibly")
3. PHYSICAL ACTION: Describe movements with weight and texture (e.g., "pulls the faded photograph into the light, fingers trembling")
4. EMOTIONAL TRANSITION: Map the emotional arc (e.g., "Recognition → Grief → Comfort")
5. SUBTEXT: The character's inner motivation beneath the words
6. PHYSIOLOGICAL: Breathing patterns, swallowing, tension (e.g., "breathing becomes shallow and heavy")

Generate comprehensive technical direction suitable for professional film production crews. Return ONLY valid JSON with this exact structure:

{
  "sceneDescription": "A clear, plain-language narrative summary (2-4 sentences) of what happens in this scene. Describe the intent, action, and emotional arc in accessible terms that anyone can understand without film jargon. Focus on WHO does WHAT, WHY, and how the emotional tone shifts.",
  "camera": {
    "shots": ["array of shot types, e.g., 'Wide Shot', 'Medium Close-Up', 'Insert Shot'"],
    "angle": "camera angle, e.g., 'Eye-Level', 'Low Angle', 'High Angle', 'Over-the-Shoulder'",
    "movement": "camera movement, e.g., 'Static', 'Handheld', 'Steadicam', 'Dolly In', 'Pan Left', 'Jib Up'",
    "lensChoice": "lens specification, e.g., 'Wide-Angle (24mm) for depth', 'Standard (50mm)', 'Telephoto (85mm) for compression'",
    "focus": "focus description, e.g., 'Deep Focus', 'Shallow Depth-of-Field', 'Rack Focus from [Prop] to [Actor]'"
  },
  "lighting": {
    "overallMood": "lighting mood, e.g., 'High-Key', 'Low-Key', 'Soft & Natural', 'Hard & Dramatic', 'Film Noir'",
    "timeOfDay": "time of day, e.g., 'Golden Hour', 'Mid-day', 'Night', 'Twilight'",
    "keyLight": "key light setup, e.g., 'Hard light from camera left'",
    "fillLight": "fill light setup, e.g., 'Soft fill from camera right, 50% power'",
    "backlight": "backlight/rim light, e.g., 'To create separation from the background'",
    "practicals": "practical lights, e.g., 'Desk lamp ON', 'TV screen as primary source'",
    "colorTemperature": "color temperature, e.g., 'Warm (Tungsten)', 'Cool (Daylight)', 'Stylized (e.g., blue/orange)'"
  },
  "scene": {
    "location": "location description, e.g., 'Messy apartment living room', 'Sterile office environment'",
    "keyProps": ["array of key props, e.g., 'A steaming coffee mug', 'A flickering neon sign', 'A specific document on the desk'"],
    "atmosphere": "atmospheric description, e.g., 'Hazy/Smoky', 'Clean & Minimalist', 'Cluttered & Chaotic'"
  },
  "talent": {
    "blocking": "actor blocking, e.g., 'Actor A starts at the window, walks to the desk on [line]', 'Actor B enters from screen left'",
    "keyActions": ["array of key actions, e.g., 'Slams the phone down', 'Looks away wistfully', 'Taps fingers impatiently'"],
    "emotionalBeat": "emotional beat, e.g., 'Convey anxiety', 'A moment of realization', 'Suppressed anger'"
  },
  "audio": {
    "priorities": "audio priorities, e.g., 'Capture clean dialogue', 'Prioritize environmental sounds', 'Silence on set'",
    "considerations": "audio considerations, e.g., 'Be aware of HVAC noise', 'Room tone needed for this location'"
  },
  "dialogueTalentDirections": [
    ${dialogueLinesList
      .map(
        (d) => `{
      "character": "${d.character}",
      "lineText": "${d.line.replace(/"/g, '\\"').substring(0, 100)}${d.line.length > 100 ? '...' : ''}",
      "cinematicSetup": "Describe the shot composition and physical context for this line",
      "microExpression": "Subtle facial transitions during this line",
      "physicalAction": "Physical movement with weight and texture",
      "emotionalTransition": "Emotional arc during this line, e.g., 'Hope → Doubt → Resignation'",
      "subtextMotivation": "What the character is really feeling beneath the words",
      "physiologicalCues": "Breathing, tension, and physical responses"
    }`
      )
      .join(',\n    ')}
  ],
  "segmentPromptBundle": [
    ${segmentPromptTimeline
      .map(
        (line) => `{
      "timelineIndex": ${line.timelineIndex},
      "kind": "${line.kind}",
      ${typeof line.dialogueIndex === 'number' ? `"dialogueIndex": ${line.dialogueIndex},` : ''}
      "character": "${line.character.replace(/"/g, '\\"')}",
      "lineText": "${line.lineText.replace(/"/g, '\\"').substring(0, 180)}${line.lineText.length > 180 ? '...' : ''}",
      "segmentDirectionSummary": "One concise sentence describing this segment's visual beat.",
      "startFramePrompt": "Detailed start frame prompt for this line's segment.",
      "endFramePrompt": "Detailed end frame prompt showing the changed end state.",
      "videoPrompt": "F2V cinematic motion prompt for this exact line."
    }`
      )
      .join(',\n    ')}
  ]
}

IMPORTANT:
- Use professional film terminology
- Be specific and actionable for crew members
- Consider the emotional tone and narrative context
- Ensure all arrays contain at least one item
- For dialogueTalentDirections, provide SPECIFIC direction for each line - avoid generic descriptions
- Make each dialogue direction cinematic and evocative, not just descriptive
- segmentPromptBundle is MANDATORY and must include exactly one object per timeline line provided
- Do not reuse the same summary/start/end/video prompts for all rows; each row must reflect its own line and beat
- Return ONLY valid JSON, no markdown formatting, no explanations`
}

/**
 * Generate a DetailedSceneDirection for one scene.
 *
 * Throws on hard failures (e.g. unparseable AI response). The caller is
 * responsible for converting thrown errors into the appropriate transport
 * (HTTP / SSE event).
 */
export async function generateSceneDirection(
  params: GenerateSceneDirectionParams
): Promise<SceneDirectionResult> {
  const { scene, sceneIndex } = params
  const prompt = buildSceneDirectionPrompt(scene)

  console.log('[generateSceneDirection] Calling Gemini for scene', sceneIndex)
  const { text: responseText, finishReason } = await callGemini(prompt)

  if (finishReason === 'MAX_TOKENS') {
    console.warn(
      '[generateSceneDirection] Response may be truncated (MAX_TOKENS) for scene',
      sceneIndex
    )
  }

  let sceneDirection: DetailedSceneDirection
  const cleanedText = extractJsonFromResponse(responseText)
  try {
    sceneDirection = JSON.parse(cleanedText)
  } catch (firstParseError) {
    if (finishReason === 'MAX_TOKENS' || !cleanedText.endsWith('}')) {
      console.warn('[generateSceneDirection] Attempting JSON repair for truncated response')
      const repaired = repairTruncatedJson(cleanedText)
      sceneDirection = JSON.parse(repaired)
    } else {
      throw firstParseError
    }
  }

  sceneDirection = fillDirectionDefaults(sceneDirection)
  sceneDirection.segmentPromptBundle = normalizePromptBundle(scene, sceneDirection)
  if (sceneDirection.segmentPromptBundle.length === 0) {
    sceneDirection.segmentPromptBundle = fallbackPromptBundle(scene)
  }
  sceneDirection.generatedAt = new Date().toISOString()
  sceneDirection.basedOnContentHash = generateSceneContentHash(scene)

  return { sceneDirection }
}
