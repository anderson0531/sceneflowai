/**
 * Post-generation scene consolidation.
 *
 * Only two things are worth merging: empty stubs left by a bad parse, and scenes
 * the model genuinely emitted twice. Consecutive scenes decomposed from one
 * Blueprint beat legitimately share a location and a cast, so heading or speaker
 * similarity alone must never be treated as duplication — doing so collapsed a
 * decomposed beat back into a single scene.
 */

export interface ConsolidatableScene {
  sceneNumber?: number
  heading?: string
  action?: string
  narration?: string
  visualDescription?: string
  dialogue?: Array<Record<string, unknown>>
  beats?: Array<Record<string, unknown>>
  characters?: string[]
  duration?: number
  cinematicType?: string
  blueprintBeatIndex?: number
  scenePartIndex?: number
  [key: string]: unknown
}

/**
 * A scene is "degenerate" when it carries essentially no content — a parsing
 * artifact or empty stub rather than a deliberate creative beat.
 */
export function isDegenerateScene(scene: any): boolean {
  const hasBeats = Array.isArray(scene?.beats) && scene.beats.length > 0
  const hasDialogue = Array.isArray(scene?.dialogue) && scene.dialogue.length > 0
  const hasAction = typeof scene?.action === 'string' && scene.action.trim().length > 0
  const triviallyShort = (scene?.duration || 0) < 8
  return triviallyShort && !hasBeats && !hasDialogue && !hasAction
}

/** Scenes that must survive consolidation regardless of how similar they look. */
export function isMergeProtectedScene(scene: any): boolean {
  // Continuation parts produced by splitOversizedScenes are deliberate splits.
  if (typeof scene?.scenePartIndex === 'number') return true
  // Bookends are structural, never merge candidates.
  if (scene?.cinematicType === 'title' || scene?.cinematicType === 'outro') return true
  return false
}

/** Word overlap in the action text above which two scenes read as the same text. */
const DUPLICATE_ACTION_OVERLAP = 0.9

/**
 * Two adjacent scenes are near-duplicates only when the heading, the spoken
 * lines, AND the action text all line up — i.e. the model genuinely emitted the
 * same scene twice.
 *
 * Matching on the speaker *list* alone was the bug: a two-hander decomposed into
 * five scenes has the same speakers in all five, so every one of them merged.
 * Duplication means the same lines, not the same cast.
 */
export function areNearDuplicateScenes(a: any, b: any): boolean {
  if (isMergeProtectedScene(a) || isMergeProtectedScene(b)) return false

  // Different Blueprint beats are different story units by construction.
  const beatOf = (s: any) =>
    typeof s?.blueprintBeatIndex === 'number' ? s.blueprintBeatIndex : null
  if (beatOf(a) !== beatOf(b)) return false

  const normHeading = (s: any) => String(s?.heading || '').trim().toLowerCase()
  if (!normHeading(a) || normHeading(a) !== normHeading(b)) return false

  const dialogueSignature = (s: any) =>
    (Array.isArray(s?.dialogue) ? s.dialogue : [])
      .map((d: any) => {
        const speaker = String(d?.character || d?.speaker || '').trim().toLowerCase()
        const line = String(d?.line || d?.text || '').trim().toLowerCase()
        return `${speaker}:${line}`
      })
      .join('|')
  const signatureA = dialogueSignature(a)
  const signatureB = dialogueSignature(b)
  const sameLines = signatureA !== '' && signatureA === signatureB
  const bothSilent = signatureA === '' && signatureB === ''
  if (!sameLines && !bothSilent) return false

  const actionA = String(a?.action || '').toLowerCase().split(/\s+/).filter(Boolean)
  const actionB = new Set(String(b?.action || '').toLowerCase().split(/\s+/).filter(Boolean))
  const overlap = actionA.length > 0
    ? actionA.filter((w: string) => actionB.has(w)).length / actionA.length
    : 0

  return overlap > DUPLICATE_ACTION_OVERLAP
}

/**
 * Merge two scenes into one.
 *
 * Spreads the first scene so identity and provenance (`id`, `blueprintBeatIndex`,
 * `cinematicType`, `creditLines`, asset ids) survive, and concatenates `beats`.
 * Returning a hand-built object dropped all of that and left the merged scene
 * without a beat timeline, which was then re-derived at a lower beat count.
 */
export function mergeScenes(scene1: any, scene2: any): any {
  const beats = [
    ...(Array.isArray(scene1.beats) ? scene1.beats : []),
    ...(Array.isArray(scene2.beats) ? scene2.beats : []),
  ]
  const joinText = (a: unknown, b: unknown, sep: string) =>
    [a, b].map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean).join(sep)

  return {
    ...scene1,
    sceneNumber: scene1.sceneNumber,
    heading: scene1.heading, // Keep first scene's heading
    characters: [...new Set([...(scene1.characters || []), ...(scene2.characters || [])])],
    action: joinText(scene1.action, scene2.action, '\n\n'),
    narration: scene1.narration || scene2.narration, // Keep first non-empty
    dialogue: [...(scene1.dialogue || []), ...(scene2.dialogue || [])],
    ...(beats.length > 0
      ? { beats: beats.map((beat: any, idx: number) => ({ ...beat, sequenceIndex: idx })) }
      : {}),
    visualDescription: joinText(scene1.visualDescription, scene2.visualDescription, ' '),
    duration: (scene1.duration || 0) + (scene2.duration || 0),
    sfx: [...(scene1.sfx || []), ...(scene2.sfx || [])],
    music: scene1.music || scene2.music,
    isExpanded: true,
  }
}

/**
 * Consolidate ONLY degenerate stubs and true near-duplicate scenes.
 *
 * We intentionally do not merge every sub-45s scene: intentional quick beats
 * (a silent reaction, a hard cut, a punchy establishing shot) are legitimate
 * storytelling and must survive to preserve pacing and rhythm.
 */
export function consolidateFragmentedScenes(scenes: any[]): any[] {
  if (scenes.length <= 1) return scenes

  const consolidated: any[] = []
  let currentScene: any = null

  for (const scene of scenes) {
    if (!currentScene) {
      currentScene = { ...scene }
      continue
    }

    const mergeDegenerate =
      isDegenerateScene(currentScene) && !isMergeProtectedScene(currentScene)

    if (mergeDegenerate || areNearDuplicateScenes(currentScene, scene)) {
      console.log(
        `[Consolidate] Merging redundant scene ${currentScene.sceneNumber} into scene ${scene.sceneNumber}`
      )
      currentScene = mergeScenes(currentScene, scene)
    } else {
      consolidated.push(currentScene)
      currentScene = { ...scene }
    }
  }

  if (currentScene) {
    consolidated.push(currentScene)
  }

  return consolidated.map((s, idx) => ({
    ...s,
    sceneNumber: idx + 1,
  }))
}

/** Force consolidation to a target count by merging the shortest adjacent scenes. */
export function consolidateToTargetCount(scenes: any[], targetCount: number): any[] {
  if (scenes.length <= targetCount) return scenes

  let result = [...scenes]

  while (result.length > targetCount) {
    let shortestIdx = 0
    let shortestDuration = Infinity

    for (let i = 0; i < result.length - 1; i++) {
      if (result[i].duration < shortestDuration) {
        shortestDuration = result[i].duration
        shortestIdx = i
      }
    }

    const merged = mergeScenes(result[shortestIdx], result[shortestIdx + 1])
    result = [
      ...result.slice(0, shortestIdx),
      merged,
      ...result.slice(shortestIdx + 2),
    ]

    console.log(
      `[Consolidate] Merged scenes ${shortestIdx + 1} and ${shortestIdx + 2}, now have ${result.length} scenes`
    )
  }

  return result.map((s, idx) => ({
    ...s,
    sceneNumber: idx + 1,
  }))
}
