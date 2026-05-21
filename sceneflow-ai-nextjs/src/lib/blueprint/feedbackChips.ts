import type { BlueprintFixSection } from '@/lib/types/audienceResonance'
import type { BlueprintFeedbackSection } from '@/lib/blueprint/shareTypes'

export type FeedbackChipPolarity = 'strength' | 'concern' | 'suggestion'

export type FeedbackChip = {
  id: string
  label: string
  polarity: FeedbackChipPolarity
}

export const GLOBAL_FEEDBACK_CHIPS: FeedbackChip[] = [
  { id: 'strong-concept', label: 'Strong concept', polarity: 'strength' },
  { id: 'needs-clarity', label: 'Needs clarity', polarity: 'concern' },
  { id: 'wrong-tone', label: 'Wrong tone for audience', polarity: 'concern' },
  { id: 'compelling-hook', label: 'Compelling hook', polarity: 'strength' },
  { id: 'ready-to-produce', label: 'Ready to produce', polarity: 'strength' },
]

export const SECTION_FEEDBACK_CHIPS: Partial<Record<BlueprintFixSection, FeedbackChip[]>> = {
  core: [
    { id: 'core-clear-logline', label: 'Clear logline', polarity: 'strength' },
    { id: 'core-weak-hook', label: 'Weak hook', polarity: 'concern' },
    { id: 'core-genre-fit', label: 'Genre fits well', polarity: 'strength' },
  ],
  story: [
    { id: 'story-strong-arc', label: 'Strong story arc', polarity: 'strength' },
    { id: 'story-confusing', label: 'Story confusing', polarity: 'concern' },
    { id: 'story-stakes', label: 'Raise the stakes', polarity: 'suggestion' },
  ],
  characters: [
    { id: 'char-compelling', label: 'Compelling characters', polarity: 'strength' },
    { id: 'char-flat', label: 'Flat character arc', polarity: 'concern' },
    { id: 'char-motivation', label: 'Unclear motivation', polarity: 'concern' },
  ],
  beats: [
    { id: 'beats-pacing', label: 'Pacing drags', polarity: 'concern' },
    { id: 'beats-midpoint', label: 'Missing midpoint', polarity: 'concern' },
    { id: 'beats-structure', label: 'Solid structure', polarity: 'strength' },
  ],
  tone: [
    { id: 'tone-consistent', label: 'Tone consistent', polarity: 'strength' },
    { id: 'tone-off', label: 'Tone feels off', polarity: 'concern' },
    { id: 'tone-visual', label: 'Visual style unclear', polarity: 'suggestion' },
  ],
}

export function chipsForSection(section: BlueprintFixSection): FeedbackChip[] {
  return [...GLOBAL_FEEDBACK_CHIPS.slice(0, 2), ...(SECTION_FEEDBACK_CHIPS[section] || [])]
}

const ALL_CHIPS: FeedbackChip[] = [
  ...GLOBAL_FEEDBACK_CHIPS,
  ...Object.values(SECTION_FEEDBACK_CHIPS).flatMap((c) => c || []),
]

export function chipLabelById(id: string): string {
  return ALL_CHIPS.find((c) => c.id === id)?.label ?? id.replace(/-/g, ' ')
}

const POLARITY_FIELD: Record<FeedbackChipPolarity, keyof BlueprintFeedbackSection> = {
  strength: 'strengths',
  concern: 'concerns',
  suggestion: 'suggestions',
}

export function applyChipToSection(
  section: BlueprintFeedbackSection,
  chip: FeedbackChip,
  selected: boolean
): BlueprintFeedbackSection {
  const tags = new Set(section.tags || [])
  const field = POLARITY_FIELD[chip.polarity]
  const existing = (section[field] as string | undefined) || ''
  const lines = existing
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  if (selected) {
    tags.add(chip.id)
    if (!lines.includes(chip.label)) lines.push(chip.label)
  } else {
    tags.delete(chip.id)
    const idx = lines.indexOf(chip.label)
    if (idx >= 0) lines.splice(idx, 1)
  }

  return {
    ...section,
    tags: Array.from(tags),
    [field]: lines.length ? lines.join('\n') : undefined,
  }
}

export type ShareFeedbackDraft = {
  overallScore?: number
  preferred?: boolean
  sections?: Partial<Record<BlueprintFixSection, BlueprintFeedbackSection>>
  freeformNotes?: string
}

export function feedbackDraftKey(token: string, participantId: string): string {
  return `sf_share_feedback_${token}_${participantId}`
}

export function loadFeedbackDraft(token: string, participantId: string): ShareFeedbackDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(feedbackDraftKey(token, participantId))
    return raw ? (JSON.parse(raw) as ShareFeedbackDraft) : null
  } catch {
    return null
  }
}

export function saveFeedbackDraft(
  token: string,
  participantId: string,
  draft: ShareFeedbackDraft
): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(feedbackDraftKey(token, participantId), JSON.stringify(draft))
  } catch {
    /* ignore */
  }
}

export function countRatedSections(draft: ShareFeedbackDraft): number {
  const sections = draft.sections || {}
  return Object.values(sections).filter((s) => s.score && s.score >= 1).length
}

export function hasAnyFeedback(draft: ShareFeedbackDraft): boolean {
  if (draft.overallScore && draft.overallScore >= 1) return true
  if (draft.freeformNotes?.trim()) return true
  const sections = draft.sections || {}
  return Object.values(sections).some(
    (s) =>
      (s.score && s.score >= 1) ||
      (s.tags && s.tags.length > 0) ||
      s.strengths?.trim() ||
      s.concerns?.trim() ||
      s.suggestions?.trim()
  )
}
