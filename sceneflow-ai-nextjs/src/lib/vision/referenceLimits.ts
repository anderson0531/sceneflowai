import {
  buildIdentityReferenceLabel,
  buildWardrobeDiptychReferenceLabel,
  buildWardrobeReferenceLabel,
} from '@/lib/character/characterReferenceAssembly'
import { buildLocationReferenceLabel } from '@/lib/vision/locationReferencePrompts'

export const MAX_VERTEX_GEMINI_REFERENCE_IMAGES = 8
export const MAX_REFERENCE_IMAGES_ECO = 3
export const MAX_REFERENCE_IMAGES_PRO = 14

export type VertexImageTier = 'eco' | 'designer' | 'director'

export function getMaxReferenceImagesForTier(tier: VertexImageTier): number {
  return tier === 'eco' ? MAX_REFERENCE_IMAGES_ECO : MAX_REFERENCE_IMAGES_PRO
}

/**
 * Auto-upgrade eco to designer when any reference images are needed.
 * Reference-bearing generations use gemini-3-pro-image-preview (14 refs), not eco (3 refs).
 */
export function resolveEffectiveImageTier(args: {
  modelTier?: VertexImageTier
  distinctCharacterCount: number
  totalWantedRefs: number
}): VertexImageTier {
  const baseTier = args.modelTier ?? 'designer'
  if (
    baseTier === 'eco' &&
    (args.totalWantedRefs > 0 || args.distinctCharacterCount >= 1)
  ) {
    return 'designer'
  }
  return baseTier
}

export function buildSubjectCountGuardrail(
  entries: Array<{ characterName: string; subjectOrdinal: number }>
): string {
  if (entries.length < 2) return ''
  const peopleList = entries
    .map((entry) => `person [${entry.subjectOrdinal}] (${entry.characterName})`)
    .join(' and ')
  return (
    `SUBJECT COUNT: EXACTLY ${entries.length} people in this image - ${peopleList}. ` +
    `Do NOT add, invent, or duplicate any other people. ` +
    `Wardrobe, prop, and location reference images are NOT additional people.`
  )
}

export type ReferencePriorityRole =
  | 'identity'
  | 'wardrobe'
  | 'location'
  | 'prop-critical'
  | 'prop-important'
  | 'prop-other'

export type CharacterRefRole = 'identity' | 'wardrobe' | 'wardrobe-diptych'

export interface PrioritizedReferenceImage {
  imageUrl: string
  name: string
  role: ReferencePriorityRole
  importance?: string
  /** 1-based index assigned during assembly (embedded in labels before cap). */
  provisionalIndex?: number
  /** 1-based index in final multimodal send order (matches prompt Reference image N). */
  sendIndex?: number
  characterName?: string
  refRole?: CharacterRefRole
  propName?: string
  locationName?: string
  originalOrder?: number
}

export type ReferenceIndexMap = Map<number, number | null>

const ROLE_PRIORITY: Record<ReferencePriorityRole, number> = {
  identity: 0,
  wardrobe: 1,
  location: 2,
  'prop-critical': 3,
  'prop-important': 4,
  'prop-other': 5,
}

function propRole(importance?: string): ReferencePriorityRole {
  if (importance === 'critical') return 'prop-critical'
  if (importance === 'important') return 'prop-important'
  return 'prop-other'
}

export function prioritizeReferenceImages(
  refs: PrioritizedReferenceImage[],
  maxCount: number = MAX_VERTEX_GEMINI_REFERENCE_IMAGES
): { selected: PrioritizedReferenceImage[]; dropped: PrioritizedReferenceImage[] } {
  const sorted = [...refs].sort((a, b) => {
    const roleDiff = ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role]
    if (roleDiff !== 0) return roleDiff
    return a.name.localeCompare(b.name)
  })

  return {
    selected: sorted.slice(0, maxCount),
    dropped: sorted.slice(maxCount),
  }
}

function applySendIndexLabel(
  ref: PrioritizedReferenceImage,
  sendIndex: number,
  labelOptions?: {
    buildIdentityLabel?: (name: string, index: number) => string
    buildWardrobeLabel?: (name: string, index: number) => string
    buildDiptychLabel?: (name: string) => string
  }
): string {
  const buildIdentity = labelOptions?.buildIdentityLabel ?? buildIdentityReferenceLabel
  const buildWardrobe = labelOptions?.buildWardrobeLabel ?? buildWardrobeReferenceLabel
  const buildDiptych = labelOptions?.buildDiptychLabel ?? buildWardrobeDiptychReferenceLabel

  if (ref.refRole === 'wardrobe-diptych' && ref.characterName) {
    return buildDiptych(ref.characterName)
  }
  if (ref.refRole === 'identity' && ref.characterName) {
    return buildIdentity(ref.characterName, sendIndex)
  }
  if (ref.refRole === 'wardrobe' && ref.characterName) {
    return buildWardrobe(ref.characterName, sendIndex)
  }
  if (ref.propName) {
    return `Prop reference ${sendIndex}: ${ref.propName}`
  }
  if (ref.locationName) {
    return buildLocationReferenceLabel(ref.locationName, sendIndex)
  }
  return ref.name
}

/**
 * Priority-cap reference images but preserve original assembly order for multimodal send.
 * Renumbers survivors to sendIndex 1..N so prompt labels match image positions.
 */
export function selectReferenceImagesInOrder(
  refs: PrioritizedReferenceImage[],
  maxCount: number = MAX_VERTEX_GEMINI_REFERENCE_IMAGES,
  labelOptions?: {
    buildIdentityLabel?: (name: string, index: number) => string
    buildWardrobeLabel?: (name: string, index: number) => string
    buildDiptychLabel?: (name: string) => string
    /** When true, group survivors by role (identity, wardrobe, location, props) for contiguous person tokens. */
    groupByRole?: boolean
  }
): {
  selected: PrioritizedReferenceImage[]
  dropped: PrioritizedReferenceImage[]
  indexMap: ReferenceIndexMap
} {
  const tagged = refs.map((ref, originalOrder) => ({ ...ref, originalOrder }))
  const { selected: priorityKept, dropped: priorityDropped } = prioritizeReferenceImages(
    tagged,
    maxCount
  )
  const keptUrls = new Set(priorityKept.map((r) => r.imageUrl))

  const selected = tagged
    .filter((r) => keptUrls.has(r.imageUrl))
    .sort((a, b) => {
      if (labelOptions?.groupByRole) {
        const roleDiff = ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role]
        if (roleDiff !== 0) return roleDiff
      }
      return (a.originalOrder ?? 0) - (b.originalOrder ?? 0)
    })
    .map((ref, idx) => {
      const sendIndex = idx + 1
      return {
        ...ref,
        sendIndex,
        name: applySendIndexLabel(ref, sendIndex, labelOptions),
      }
    })

  const dropped = tagged.filter((r) => !keptUrls.has(r.imageUrl))

  const indexMap: ReferenceIndexMap = new Map()
  for (const ref of tagged) {
    if (ref.provisionalIndex == null) continue
    const survivor = selected.find((s) => s.imageUrl === ref.imageUrl)
    indexMap.set(ref.provisionalIndex, survivor?.sendIndex ?? null)
  }

  return { selected, dropped, indexMap }
}

/**
 * Remap reference number tokens in scene prompts after cap/renumber.
 * Maps old provisional indices to new send indices; drops mentions of removed refs.
 */
export function remapReferenceNumbersInPrompt(
  text: string,
  indexMap: ReferenceIndexMap
): string {
  if (!text || indexMap.size === 0) return text

  const remapNumber = (oldNum: number): string | null => {
    const mapped = indexMap.get(oldNum)
    if (mapped == null) return null
    return String(mapped)
  }

  let result = text

  // person [N] tokens are stable subject ordinals — do not remap them with image send indices
  result = result.replace(
    /(?:Reference image|Ref [Ii]mage)\s*(\d+)/g,
    (match, n) => {
      const remapped = remapNumber(parseInt(n, 10))
      return remapped == null ? '' : match.replace(n, remapped)
    }
  )

  result = result.replace(/\bRefs?\s+([\d,\s\-and]+)/gi, (match, group: string) => {
    const numbers = new Set<number>()
    const rangeParts = group.split(/,|\band\b/i)
    for (const part of rangeParts) {
      const trimmed = part.trim()
      const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/)
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10)
        const end = parseInt(rangeMatch[2], 10)
        for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
          numbers.add(i)
        }
      } else {
        const single = parseInt(trimmed, 10)
        if (Number.isFinite(single)) numbers.add(single)
      }
    }

    const remapped = [...numbers]
      .map((n) => remapNumber(n))
      .filter((n): n is string => n != null)
      .map((n) => parseInt(n, 10))
      .sort((a, b) => a - b)

    if (remapped.length === 0) return ''
    return `Refs ${remapped.join(', ')}`
  })

  const droppedIndices = [...indexMap.entries()]
    .filter(([, mapped]) => mapped == null)
    .map(([old]) => old)

  if (droppedIndices.length > 0) {
    console.warn(
      `[Scene Image] Dropped reference indices from prompt after tier cap: ${droppedIndices.join(', ')}`
    )
    const droppedPattern = new RegExp(
      `(?:Ref(?:erence)?\\s*[Ii]mage\\s*\\[?(${droppedIndices.join('|')})\\]?|person\\s*\\[(${droppedIndices.join('|')})\\])`,
      'i'
    )
    result = result
      .split('\n')
      .filter((line) => !droppedPattern.test(line))
      .join('\n')
  }

  return result
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.])/g, '$1')
    .replace(/,\s*,/g, ',')
    .trim()
}

export function buildCharacterReferenceEntries(
  imageReferences: Array<{
    imageUrl: string
    refRole: CharacterRefRole
    characterName: string
  }>,
  characterReferences: Array<{ name: string; hasDualReferences?: boolean; hasWardrobeDiptych?: boolean }>,
  buildIdentityLabel: (name: string, index: number) => string,
  buildWardrobeLabel: (name: string, index: number) => string,
  startIndex: number,
  buildDiptychLabel?: (name: string) => string
): PrioritizedReferenceImage[] {
  const entries: PrioritizedReferenceImage[] = []
  let refImageIndex = startIndex

  for (const ref of imageReferences) {
    refImageIndex++
    const matchingCharRef = characterReferences.find((cr) => cr.name === ref.characterName)
    let label: string
    if (ref.refRole === 'wardrobe-diptych') {
      label = buildDiptychLabel
        ? buildDiptychLabel(ref.characterName)
        : `Diptych ref: ${ref.characterName} — LEFT=identity face, RIGHT=wardrobe outfit`
    } else if (ref.refRole === 'identity') {
      label = buildIdentityLabel(ref.characterName, refImageIndex)
    } else if (matchingCharRef?.hasDualReferences) {
      label = buildWardrobeLabel(ref.characterName, refImageIndex)
    } else {
      label = `Character reference ${refImageIndex}: ${ref.characterName} (mannequin outfit sheet)`
    }
    entries.push({
      imageUrl: ref.imageUrl,
      name: label,
      role: ref.refRole === 'identity' || ref.refRole === 'wardrobe-diptych' ? 'identity' : 'wardrobe',
      provisionalIndex: refImageIndex,
      characterName: ref.characterName,
      refRole: ref.refRole,
    })
  }

  return entries
}

export function buildPropReferenceMappingLines(
  props: Array<{ propName?: string; sendIndex?: number }>
): string {
  const valid = props.filter((p) => p.propName && p.sendIndex)
  if (!valid.length) return ''
  const lines = valid
    .map(
      (p) =>
        `- PROP REFERENCE (Ref Image [${p.sendIndex}]): ${p.propName} — Extract shape, material, color, and design of the named prop only. Do not add unrelated objects.`
    )
    .join('\n')
  return `PROP REFERENCES (${valid.length}):\n${lines}\n\n`
}

export function buildPropReferenceEntries(
  objectImageReferences: Array<{ imageUrl: string; name: string; importance?: string }>,
  startIndex: number
): PrioritizedReferenceImage[] {
  const entries: PrioritizedReferenceImage[] = []
  let refImageIndex = startIndex

  for (const obj of objectImageReferences) {
    refImageIndex++
    entries.push({
      imageUrl: obj.imageUrl,
      name: `Prop reference ${refImageIndex}: ${obj.name}`,
      role: propRole(obj.importance),
      importance: obj.importance,
      provisionalIndex: refImageIndex,
      propName: obj.name,
    })
  }

  return entries
}

export function buildLocationReferenceEntry(
  location: { imageUrl: string; location?: string; name?: string } | null | undefined,
  startIndex: number
): PrioritizedReferenceImage | null {
  if (!location?.imageUrl) return null
  const refImageIndex = startIndex + 1
  const locationName = location.location || location.name || 'Location'
  return {
    imageUrl: location.imageUrl,
    name: buildLocationReferenceLabel(locationName, refImageIndex),
    role: 'location',
    provisionalIndex: refImageIndex,
    locationName,
  }
}
