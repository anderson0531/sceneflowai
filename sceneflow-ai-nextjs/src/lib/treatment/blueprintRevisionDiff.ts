import type { BlueprintFixSection } from '@/lib/types/audienceResonance'
import { syncBlueprintDurationFields } from '@/lib/treatment/duration'
import {
  BLUEPRINT_FIELD_LABELS,
  type FieldDiff,
  SECTION_FIELDS,
} from './blueprintRevisionTypes'

function fieldToSection(field: string): BlueprintFixSection {
  for (const [section, fields] of Object.entries(SECTION_FIELDS)) {
    if (fields.includes(field)) return section as BlueprintFixSection
  }
  return 'story'
}

const MAX_DIFF_DISPLAY = 1200

function truncateForDiff(text: string): string {
  return text.length <= MAX_DIFF_DISPLAY ? text : `${text.slice(0, MAX_DIFF_DISPLAY)}…`
}

function serializeValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return truncateForDiff(value)
  if (Array.isArray(value)) {
    if (value.length === 0) return ''
    if (typeof value[0] === 'object' && value[0] !== null && 'title' in value[0]) {
      const beats = (value as Array<{ title?: string; synopsis?: string }>)
        .slice(0, 8)
        .map((b, i) => `${i + 1}. ${b.title || 'Beat'}: ${b.synopsis || ''}`)
        .join('\n')
      return truncateForDiff(beats)
    }
    return truncateForDiff(value.map(String).join(', '))
  }
  if (typeof value === 'object') return truncateForDiff(JSON.stringify(value))
  return truncateForDiff(String(value))
}

function serializeFieldValue(field: string, value: unknown): string {
  if (field === 'total_duration_seconds' && typeof value === 'number') {
    const minutes = Math.max(1, Math.round(value / 60))
    return truncateForDiff(`${minutes} min (${value} sec)`)
  }
  return serializeValue(value)
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return serializeValue(a) === serializeValue(b)
}

export function buildFieldDiffs(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): FieldDiff[] {
  const diffs: FieldDiff[] = []
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])

  for (const field of keys) {
    if (field === 'narrative_reasoning' || field === 'id' || field === 'updatedAt') {
      continue
    }
    const bVal = before[field]
    const aVal = after[field]
    if (valuesEqual(bVal, aVal)) continue

    diffs.push({
      field,
      label: BLUEPRINT_FIELD_LABELS[field] || field,
      section: fieldToSection(field),
      before: serializeFieldValue(field, bVal),
      after: serializeFieldValue(field, aVal),
    })
  }

  return diffs
}

export function mergeRevisionIntoVariant(
  original: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  let merged = { ...original, ...patch, updatedAt: Date.now() }
  if (patch.narrative_reasoning && typeof patch.narrative_reasoning === 'object') {
    const prev =
      (original.narrative_reasoning as Record<string, unknown>) || {}
    merged.narrative_reasoning = {
      ...prev,
      ...(patch.narrative_reasoning as Record<string, unknown>),
    }
  }
  if (patch.beats !== undefined || Array.isArray(merged.beats)) {
    merged = syncBlueprintDurationFields(merged)
  }
  return merged
}

export function detectMissingBalanceSections(
  planSections: BlueprintFixSection[],
  patch: Record<string, unknown>
): BlueprintFixSection[] {
  const missing: BlueprintFixSection[] = []
  if (planSections.includes('characters')) {
    if (!patch.synopsis && !patch.protagonist) missing.push('story')
    if (!patch.beats) missing.push('beats')
  }
  if (planSections.includes('story') && !patch.beats) {
    missing.push('beats')
  }
  return [...new Set(missing)]
}
