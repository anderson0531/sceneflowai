import type { BlueprintFixSection } from '@/lib/types/audienceResonance'
import {
  BLUEPRINT_FIELD_LABELS,
  type FieldDiff,
  MAX_BEATS,
  SECTION_FIELDS,
} from './blueprintRevisionTypes'

function fieldToSection(field: string): BlueprintFixSection {
  for (const [section, fields] of Object.entries(SECTION_FIELDS)) {
    if (fields.includes(field)) return section as BlueprintFixSection
  }
  return 'story'
}

/**
 * Beat sheets serialize every beat with its synopsis, so a long runtime needs
 * more room than a single field. This also feeds valuesEqual, so too small a
 * budget made edits past the cutoff invisible to change detection.
 */
const MAX_DIFF_DISPLAY = 6000

const MAX_PATCH_FIELD_LEN: Record<string, number> = {
  synopsis: 8000,
  content: 8000,
  logline: 600,
  setting: 2000,
  protagonist: 2000,
  antagonist: 2000,
  tone_description: 2000,
  scriptCraftNotes: 2000,
}

/** Cap LLM patch field sizes before merge/response. */
export function capPatchSize(patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...patch }
  for (const [key, max] of Object.entries(MAX_PATCH_FIELD_LEN)) {
    const v = out[key]
    if (typeof v === 'string' && v.length > max) {
      out[key] = `${v.slice(0, max)}…`
    }
  }
  if (Array.isArray(out.beats)) {
    out.beats = (out.beats as Array<Record<string, unknown>>).slice(0, MAX_BEATS)
  }
  if (Array.isArray(out.character_descriptions)) {
    out.character_descriptions = (out.character_descriptions as Array<Record<string, unknown>>).slice(
      0,
      8
    )
  }
  if (Array.isArray(out.scene_descriptions)) {
    out.scene_descriptions = (out.scene_descriptions as Array<Record<string, unknown>>).slice(
      0,
      8
    )
  }
  if (Array.isArray(out.prop_descriptions)) {
    out.prop_descriptions = (out.prop_descriptions as Array<Record<string, unknown>>).slice(
      0,
      8
    )
  }
  return out
}

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
        .slice(0, MAX_BEATS)
        .map((b, i) => `${i + 1}. ${b.title || 'Beat'}: ${b.synopsis || ''}`)
        .join('\n')
      return truncateForDiff(beats)
    }
    if (typeof value[0] === 'object' && value[0] !== null && 'name' in value[0]) {
      const items = (
        value as Array<{
          name?: string
          role?: string
          type?: string
          category?: string
          description?: string
          location?: string
        }>
      ).map((item, i) => {
        const tag = item.role || item.type || item.category || ''
        const detail = item.description || item.location || ''
        return `${i + 1}. ${item.name || 'Item'}${tag ? ` (${tag})` : ''}${detail ? `: ${detail}` : ''}`
      })
      return truncateForDiff(items.join('\n'))
    }
    return truncateForDiff(value.map(String).join(', '))
  }
  if (typeof value === 'object') return truncateForDiff(JSON.stringify(value))
  return truncateForDiff(String(value))
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
      before: serializeValue(bVal),
      after: serializeValue(aVal),
    })
  }

  return diffs
}

function mergeContinuityArray(
  originalArr: unknown,
  patchedArr: unknown
): Array<Record<string, unknown>> | undefined {
  if (!Array.isArray(patchedArr)) return undefined
  const origList = Array.isArray(originalArr)
    ? (originalArr as Array<Record<string, unknown>>)
    : []
  if (origList.length === 0) {
    return patchedArr as Array<Record<string, unknown>>
  }

  return (patchedArr as Array<Record<string, unknown>>).map((item, index) => {
    if (!item || typeof item !== 'object') return item
    const name = typeof item.name === 'string' ? item.name.trim().toLowerCase() : ''
    const byName = name
      ? origList.find(
          (o) =>
            o &&
            typeof o === 'object' &&
            typeof o.name === 'string' &&
            o.name.trim().toLowerCase() === name
        )
      : undefined
    const match = byName ?? origList[index]
    if (!match || typeof match !== 'object') return item
    return { ...match, ...item }
  })
}

export function mergeRevisionIntoVariant(
  original: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...original, ...patch, updatedAt: Date.now() }
  for (const key of ['character_descriptions', 'scene_descriptions', 'prop_descriptions'] as const) {
    if (Array.isArray(patch[key])) {
      const mergedArr = mergeContinuityArray(original[key], patch[key])
      if (mergedArr) merged[key] = mergedArr
    }
  }
  if (patch.narrative_reasoning && typeof patch.narrative_reasoning === 'object') {
    const prev =
      (original.narrative_reasoning as Record<string, unknown>) || {}
    merged.narrative_reasoning = {
      ...prev,
      ...(patch.narrative_reasoning as Record<string, unknown>),
    }
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
