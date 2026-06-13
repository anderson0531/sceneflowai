/**
 * Diff and selective revert for Scene Edit preview confirmation.
 */

export type SceneChangeKey =
  | 'heading'
  | 'visualDescription'
  | 'action'
  | 'narration'
  | 'music'
  | 'sfx'
  | `dialogue:${number}`

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function headingText(scene: any): string {
  if (!scene?.heading) return ''
  if (typeof scene.heading === 'string') return scene.heading.trim()
  return String(scene.heading?.text ?? '').trim()
}

function dialogueLineText(line: any): string {
  if (!line) return ''
  return normalizeText(line.line ?? line.text)
}

function musicComparable(music: unknown): string {
  if (!music) return ''
  if (typeof music === 'string') return music.trim()
  if (typeof music === 'object' && music !== null) {
    return normalizeText((music as { description?: unknown }).description)
  }
  return JSON.stringify(music)
}

function sfxComparable(sfx: unknown): string {
  if (!Array.isArray(sfx)) return ''
  return sfx
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object') {
        return normalizeText(
          (item as { description?: unknown; text?: unknown }).description ??
            (item as { text?: unknown }).text
        )
      }
      return ''
    })
    .join('\0')
}

/** Build effective candidate scene using local description/narration overrides. */
export function buildEffectiveCandidateScene(
  previewScene: any,
  overrides?: { visualDescription?: string; narration?: string }
): any {
  const candidate = { ...previewScene }
  if (overrides?.visualDescription !== undefined) {
    candidate.visualDescription = overrides.visualDescription
  }
  if (overrides?.narration !== undefined) {
    candidate.narration = overrides.narration
  }
  return candidate
}

/** List stable change keys between original and candidate scenes. */
export function diffSceneChanges(originalScene: any, candidateScene: any): SceneChangeKey[] {
  const changes: SceneChangeKey[] = []

  if (headingText(originalScene) !== headingText(candidateScene)) {
    changes.push('heading')
  }
  if (normalizeText(originalScene?.visualDescription) !== normalizeText(candidateScene?.visualDescription)) {
    changes.push('visualDescription')
  }
  if (normalizeText(originalScene?.action) !== normalizeText(candidateScene?.action)) {
    changes.push('action')
  }
  if (normalizeText(originalScene?.narration) !== normalizeText(candidateScene?.narration)) {
    changes.push('narration')
  }
  if (musicComparable(originalScene?.music) !== musicComparable(candidateScene?.music)) {
    changes.push('music')
  }
  if (sfxComparable(originalScene?.sfx) !== sfxComparable(candidateScene?.sfx)) {
    changes.push('sfx')
  }

  const previewDialogue = Array.isArray(candidateScene?.dialogue) ? candidateScene.dialogue : []
  const originalDialogue = Array.isArray(originalScene?.dialogue) ? originalScene.dialogue : []
  const maxLines = Math.max(previewDialogue.length, originalDialogue.length)
  for (let i = 0; i < maxLines; i++) {
    const origLine = originalDialogue[i]
    const newLine = previewDialogue[i]
    const origText = dialogueLineText(origLine)
    const newText = dialogueLineText(newLine)
    const origChar = normalizeText(origLine?.character)
    const newChar = normalizeText(newLine?.character)
    if (!origLine || !newLine || origText !== newText || origChar !== newChar) {
      if (newLine || origLine) {
        changes.push(`dialogue:${i}` as SceneChangeKey)
      }
    }
  }

  return changes
}

/** Revert deselected changes back to original scene values. */
export function applyDeselectedSceneChanges(
  originalScene: any,
  candidateScene: any,
  deselectedChanges: Set<string>
): any {
  if (deselectedChanges.size === 0) return candidateScene

  const next = { ...candidateScene }

  if (deselectedChanges.has('heading')) {
    next.heading = originalScene.heading
  }
  if (deselectedChanges.has('visualDescription')) {
    next.visualDescription = originalScene.visualDescription
  }
  if (deselectedChanges.has('action')) {
    next.action = originalScene.action
  }
  if (deselectedChanges.has('narration')) {
    next.narration = originalScene.narration
  }
  if (deselectedChanges.has('music')) {
    next.music = originalScene.music
  }
  if (deselectedChanges.has('sfx')) {
    next.sfx = originalScene.sfx
  }

  const previewDialogue = Array.isArray(next.dialogue) ? [...next.dialogue] : []
  const originalDialogue = Array.isArray(originalScene?.dialogue) ? originalScene.dialogue : []
  let dialogueTouched = false

  for (const key of deselectedChanges) {
    if (!key.startsWith('dialogue:')) continue
    const idx = Number(key.slice('dialogue:'.length))
    if (!Number.isFinite(idx) || idx < 0) continue
    dialogueTouched = true
    if (originalDialogue[idx]) {
      previewDialogue[idx] = { ...originalDialogue[idx] }
    } else {
      previewDialogue.splice(idx, 1)
    }
  }

  if (dialogueTouched) {
    next.dialogue = previewDialogue
  }

  return next
}

export function countSelectedChanges(
  allChanges: SceneChangeKey[],
  deselectedChanges: Set<string>
): { selected: number; total: number } {
  const total = allChanges.length
  const selected = allChanges.filter((key) => !deselectedChanges.has(key)).length
  return { selected, total }
}
