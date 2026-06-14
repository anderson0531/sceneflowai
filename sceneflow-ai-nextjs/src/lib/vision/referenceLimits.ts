export const MAX_VERTEX_GEMINI_REFERENCE_IMAGES = 8

export type ReferencePriorityRole =
  | 'identity'
  | 'wardrobe'
  | 'location'
  | 'prop-critical'
  | 'prop-important'
  | 'prop-other'

export interface PrioritizedReferenceImage {
  imageUrl: string
  name: string
  role: ReferencePriorityRole
  importance?: string
}

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

export function buildCharacterReferenceEntries(
  imageReferences: Array<{ imageUrl: string; refRole: 'identity' | 'wardrobe'; characterName: string }>,
  characterReferences: Array<{ name: string; hasDualReferences?: boolean }>,
  buildIdentityLabel: (name: string, index: number) => string,
  buildWardrobeLabel: (name: string, index: number) => string,
  startIndex: number
): PrioritizedReferenceImage[] {
  const entries: PrioritizedReferenceImage[] = []
  let refImageIndex = startIndex

  for (const ref of imageReferences) {
    refImageIndex++
    const matchingCharRef = characterReferences.find((cr) => cr.name === ref.characterName)
    let label: string
    if (ref.refRole === 'identity') {
      label = buildIdentityLabel(ref.characterName, refImageIndex)
    } else if (matchingCharRef?.hasDualReferences) {
      label = buildWardrobeLabel(ref.characterName, refImageIndex)
    } else {
      label = `Character reference ${refImageIndex}: ${ref.characterName} (mannequin outfit sheet)`
    }
    entries.push({
      imageUrl: ref.imageUrl,
      name: label,
      role: ref.refRole === 'identity' ? 'identity' : 'wardrobe',
    })
  }

  return entries
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
  return {
    imageUrl: location.imageUrl,
    name: `Location reference ${refImageIndex}: ${location.location || location.name || 'Location'}`,
    role: 'location',
  }
}
