/**
 * Video Director — rewrite a clip's Veo/F2V prompt (client-safe).
 *
 * Frame Direction patches beat stills and then refreshes video prompts.
 * This path writes only the production video prompt so stills stay put.
 */

export type VideoDirectorMode = 'optimize' | 'rewrite'

export function resolveCurrentVideoPrompt(segment: {
  userEditedPrompt?: string | null
  generatedPrompt?: string
  videoPrompt?: string | null
}): string {
  return (
    segment.userEditedPrompt?.trim() ||
    segment.generatedPrompt?.trim() ||
    segment.videoPrompt?.trim() ||
    ''
  )
}

export function applyVideoDirectorPromptToSegment<
  T extends {
    userEditedPrompt?: string | null
    generatedPrompt?: string
    videoPrompt?: string | null
  },
>(segment: T, videoPrompt: string): T {
  const prompt = videoPrompt.trim()
  return {
    ...segment,
    userEditedPrompt: prompt,
    generatedPrompt: prompt,
    videoPrompt: prompt,
  }
}

export function applyVideoDirectorPromptToProduction<
  T extends {
    segmentId: string
    userEditedPrompt?: string | null
    generatedPrompt?: string
    videoPrompt?: string | null
  },
>(segments: T[], segmentId: string, videoPrompt: string): T[] {
  return segments.map((segment) =>
    segment.segmentId === segmentId
      ? applyVideoDirectorPromptToSegment(segment, videoPrompt)
      : segment
  )
}

export function parseVideoDirectorPrompt(text: string): string {
  return text
    .trim()
    .replace(/^```[\w]*\n?/gm, '')
    .replace(/\n?```$/gm, '')
    .replace(/^["']|["']$/g, '')
    .trim()
}

export function buildVideoDirectorSystemPrompt(): string {
  return `You are a cinematographer rewriting a Veo / frame-to-video prompt so the clip plays the beat on the first attempt.

The current prompt is the motion instruction for one short clip that starts on a locked still. Rewrite it so a video model can animate that still without drifting the story, the faces, or the set.

HARD RULES:
1. Do not change the story beat. Do not invent people, props, or locations. Keep exact character and prop names.
2. Describe motion, camera, pacing, and performance. Do not freeze the scene into a still photograph.
3. Honor the start frame: keep composition, wardrobe, and who is on screen unless the user asks otherwise.
4. Never ask for music, score, soundtrack, lyrics, SFX, foley, or audible dialogue. Score is mixed under the clip separately. Carry any scored-moment feeling only as pacing and performance.
5. Do not write beatDirection JSON, still Action/Framing, lighting essays, style suffixes, or negative-prompt lists — code owns those.
6. Output ONLY the rewritten video prompt. No quotes, no markdown, no preamble.`
}

export function buildVideoDirectorUserPrompt(options: {
  mode: VideoDirectorMode
  currentPrompt: string
  userDirection?: string
  beatLabel?: string
  actionFraming?: string
  scoreSteer?: string
}): string {
  const parts: string[] = []
  if (options.mode === 'rewrite') {
    parts.push(
      'Rewrite the video prompt so camera, action, and pacing are unambiguous. Honor USER NOTES; they override conflicting motion but not the story beat or library labels.'
    )
  } else {
    parts.push(
      'Optimize the video prompt for first-try motion. Keep the story beat. Thicken camera move, action beats, and start-frame continuity.'
    )
  }
  if (options.beatLabel?.trim()) {
    parts.push(`BEAT: ${options.beatLabel.trim()}`)
  }
  if (options.actionFraming?.trim()) {
    parts.push(`STILL ACTION/FRAMING (locked start frame — do not rewrite this still): ${options.actionFraming.trim()}`)
  }
  if (options.scoreSteer?.trim()) {
    parts.push(options.scoreSteer.trim())
  }
  if (options.userDirection?.trim()) {
    parts.push(`USER NOTES:\n${options.userDirection.trim()}`)
  }
  parts.push(`CURRENT VIDEO PROMPT:\n${options.currentPrompt.trim() || '(empty)'}`)
  parts.push('Output ONLY the rewritten video prompt.')
  return parts.join('\n\n')
}
