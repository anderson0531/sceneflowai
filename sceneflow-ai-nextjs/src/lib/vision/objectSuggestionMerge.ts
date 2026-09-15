/**
 * Update Objects must rebuild from the script's recurring key props, not
 * only from Gemini's extras. After Delete all the library is empty, but
 * those names still live on beats — union them with the model list, then
 * drop anything already in the current library and collapse synonyms.
 */

import type { ObjectBeatUsage } from '@/lib/vision/objectBeatUsage'
import { selectCanonicalNewObjects } from '@/lib/vision/objectDuplicateClusters'
import type {
  ObjectCategory,
  ObjectImportance,
  ObjectSuggestion,
} from '@/types/visionReferences'

/** After the user empties the object library, wait for Update Objects. */
export function shouldDeferObjectAutoAdd(
  previousCount: number,
  nextCount: number
): boolean {
  return previousCount > 0 && nextCount === 0
}

/**
 * Script inventory first, then model extras. Already-catalogued names and
 * synonym duplicates never become new rows.
 */
export function mergeNewObjectCandidates<T extends { name: string }>(
  scriptItems: T[],
  modelItems: T[],
  existingNames: string[]
): T[] {
  return selectCanonicalNewObjects([...scriptItems, ...modelItems], existingNames)
}

export function objectSuggestionFromUsage(
  usage: ObjectBeatUsage,
  extras?: Partial<ObjectSuggestion>
): ObjectSuggestion {
  const description =
    extras?.description?.trim() || `${usage.name} as handled in the script.`
  return {
    id: extras?.id ?? `script-${usage.key}`,
    name: extras?.name ?? usage.name,
    description,
    category: (extras?.category ?? 'prop') as ObjectCategory,
    importance: (extras?.importance ?? 'important') as ObjectImportance,
    suggestedPrompt: extras?.suggestedPrompt ?? description,
    sceneNumbers:
      extras?.sceneNumbers && extras.sceneNumbers.length > 0
        ? extras.sceneNumbers
        : usage.sceneNumbers,
    confidence: extras?.confidence ?? 1,
    beatRefs: extras?.beatRefs ?? usage.beatRefs,
    beatCount: extras?.beatCount ?? usage.beatCount,
  }
}

export function objectSuggestionsFromUsages(
  usages: ObjectBeatUsage[],
  extrasFor?: (usage: ObjectBeatUsage) => Partial<ObjectSuggestion>
): ObjectSuggestion[] {
  return usages.map((usage) => objectSuggestionFromUsage(usage, extrasFor?.(usage)))
}
