export type StoryboardFeedbackChipPolarity = 'strength' | 'concern' | 'suggestion'

export type SceneFeedbackState = {
  rating: number
  comment: string
  tags: string[]
}

export const EMPTY_SCENE_FEEDBACK: SceneFeedbackState = {
  rating: 0,
  comment: '',
  tags: [],
}

export type StoryboardFeedbackChip = {
  id: string
  label: string
  polarity: StoryboardFeedbackChipPolarity
}

export const STORYBOARD_FEEDBACK_CHIPS: StoryboardFeedbackChip[] = [
  { id: 'strong-visuals', label: 'Strong visuals', polarity: 'strength' },
  { id: 'ready-as-is', label: 'Ready as-is', polarity: 'strength' },
  { id: 'clear-dialogue', label: 'Clear dialogue', polarity: 'strength' },
  { id: 'audio-sync-off', label: 'Audio sync off', polarity: 'concern' },
  { id: 'dialogue-unclear', label: 'Dialogue unclear', polarity: 'concern' },
  { id: 'voice-mismatch', label: 'Character voice mismatch', polarity: 'concern' },
  { id: 'frame-cut-timing', label: 'Frame cut timing off', polarity: 'concern' },
  { id: 'pacing-slow', label: 'Pacing too slow', polarity: 'suggestion' },
  { id: 'pacing-fast', label: 'Pacing too fast', polarity: 'suggestion' },
  { id: 'needs-rerecord', label: 'Needs re-record', polarity: 'suggestion' },
]

export function chipLabelById(id: string): string {
  return STORYBOARD_FEEDBACK_CHIPS.find((c) => c.id === id)?.label ?? id.replace(/-/g, ' ')
}

export function toggleChipInTags(tags: string[], chipId: string): string[] {
  const set = new Set(tags)
  if (set.has(chipId)) set.delete(chipId)
  else set.add(chipId)
  return Array.from(set)
}

export function syncCommentWithTags(comment: string, tags: string[]): string {
  const chipLabels = new Set(tags.map(chipLabelById))
  const manualLines = comment
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((line) => !STORYBOARD_FEEDBACK_CHIPS.some((c) => c.label === line))

  const chipLines = tags.map(chipLabelById)
  const merged = [...manualLines]
  for (const label of chipLines) {
    if (!merged.includes(label)) merged.push(label)
  }
  return merged.join('\n')
}

export function sceneFeedbackHasContent(entry?: {
  rating?: number
  comment?: string
  tags?: string[]
}): boolean {
  if (!entry) return false
  if (entry.rating && entry.rating > 0) return true
  if (entry.tags && entry.tags.length > 0) return true
  return Boolean(entry.comment?.trim())
}
