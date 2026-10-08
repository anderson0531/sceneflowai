import { resolveCharacterId } from '@/lib/vision/updateCharacterReference'
import { referenceExpressItemKey } from '@/lib/vision/referenceExpress/types'

export type LibraryAgentScopeMode = 'missing' | 'regenerate'

export type LibraryAgentBaseKind = 'cast' | 'location' | 'prop'

export type LibraryAgentChecklistRow = {
  key: string
  kind: LibraryAgentBaseKind
  name: string
  sceneNumbers: number[]
  hasImage: boolean
}

type CastRow = {
  id?: string
  name?: string
  type?: string
  referenceImage?: string
  sceneNumbers?: number[]
}

type LocationRow = {
  id?: string
  location?: string
  locationDisplay?: string
  imageUrl?: string
  sceneNumbers?: number[]
}

type PropRow = {
  id?: string
  name?: string
  imageUrl?: string
  sceneNumbers?: number[]
}

const hasImage = (url?: string): boolean => Boolean(url && url.trim())

function sceneNumbersOf(value: number[] | undefined): number[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((scene) => typeof scene === 'number' && scene > 0))].sort(
    (a, b) => a - b
  )
}

function matchesScope(mode: LibraryAgentScopeMode, drawn: boolean): boolean {
  return mode === 'regenerate' ? drawn : !drawn
}

/**
 * Base stills Library Agent can draw: cast identity, location bases, and props.
 * Wardrobe looks and set versions stay on Cast Agent and Location Agent.
 */
export function libraryAgentChecklist(
  input: {
    characters?: CastRow[]
    locations?: LocationRow[]
    props?: PropRow[]
  },
  mode: LibraryAgentScopeMode
): LibraryAgentChecklistRow[] {
  const rows: LibraryAgentChecklistRow[] = []

  ;(input.characters ?? []).forEach((character, index) => {
    if (character.type === 'narrator') return
    const drawn = hasImage(character.referenceImage)
    if (!matchesScope(mode, drawn)) return
    const targetId = resolveCharacterId(character, index)
    rows.push({
      key: referenceExpressItemKey({ kind: 'cast', targetId }),
      kind: 'cast',
      name: character.name?.trim() || `Character ${index + 1}`,
      sceneNumbers: sceneNumbersOf(character.sceneNumbers),
      hasImage: drawn,
    })
  })

  for (const location of input.locations ?? []) {
    if (!location.id) continue
    const drawn = hasImage(location.imageUrl)
    if (!matchesScope(mode, drawn)) continue
    rows.push({
      key: referenceExpressItemKey({ kind: 'location', targetId: location.id }),
      kind: 'location',
      name: location.location?.trim() || location.locationDisplay?.trim() || 'Location',
      sceneNumbers: sceneNumbersOf(location.sceneNumbers),
      hasImage: drawn,
    })
  }

  for (const prop of input.props ?? []) {
    if (!prop.id) continue
    const drawn = hasImage(prop.imageUrl)
    if (!matchesScope(mode, drawn)) continue
    rows.push({
      key: referenceExpressItemKey({ kind: 'prop', targetId: prop.id }),
      kind: 'prop',
      name: prop.name?.trim() || 'Prop',
      sceneNumbers: sceneNumbersOf(prop.sceneNumbers),
      hasImage: drawn,
    })
  }

  return rows
}
