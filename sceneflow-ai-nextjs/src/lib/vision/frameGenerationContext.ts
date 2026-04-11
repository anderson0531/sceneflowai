/**
 * Resolve characters, locations, and objects for keyframe generation (Quick Generate + dialog defaults).
 * Uses Enhanced scene direction, heading location, and segment text — not "all project characters".
 */

import { findSceneCharacters, findSceneObjects } from '@/lib/character/matching'
import { extractLocation } from '@/lib/script/formatSceneHeading'
import type { LocationReference, VisualReference } from '@/types/visionReferences'

/** Flatten scene.sceneDirection (string or nested DetailedSceneDirection-like) for matching. */
export function buildSceneDirectionText(scene: any): string {
  if (!scene) return ''
  if (typeof scene.sceneDirectionText === 'string' && scene.sceneDirectionText.trim()) {
    return scene.sceneDirectionText.trim()
  }
  const dir = scene.sceneDirection ?? scene.detailedDirection
  if (!dir) return ''
  if (typeof dir === 'string') return dir.trim()

  const parts: string[] = []
  if (typeof dir.sceneDescription === 'string' && dir.sceneDescription.trim()) {
    parts.push(dir.sceneDescription.trim())
  }
  const pushVal = (label: string, val: unknown) => {
    if (val == null) return
    if (typeof val === 'string' && val.trim()) parts.push(`${label}: ${val.trim()}`)
    else if (typeof val === 'object') parts.push(`${label}: ${JSON.stringify(val)}`)
  }
  pushVal('scene', dir.scene)
  pushVal('camera', dir.camera)
  pushVal('lighting', dir.lighting)
  pushVal('talent', dir.talent)
  pushVal('audio', dir.audio)
  pushVal('atmosphere', dir.atmosphere)
  pushVal('keyProps', dir.keyProps)
  return parts.join('\n')
}

function talentTextFromScene(scene: any): string {
  const t = scene?.sceneDirection?.talent ?? scene?.detailedDirection?.talent
  if (!t) return ''
  if (typeof t === 'string') return t
  return [t.blocking, t.emotionalBeat, ...(Array.isArray(t.keyActions) ? t.keyActions : [])]
    .filter(Boolean)
    .join(' ')
}

/** Heuristic: scene has no on-screen talent (align with VisionPage handleGenerateSceneImage). */
export function isNoTalentSceneForFrames(scene: any): boolean {
  const talentText = talentTextFromScene(scene)
  if (!talentText.trim()) return false
  return /\b(n\/a|no\s+(live\s+)?actors?|no\s+talent|no\s+performers?|no\s+people|no\s+characters|no\s+human)\b/i.test(
    talentText
  )
}

export type ResolvedLocationForFrames = {
  id: string
  name: string
  imageUrl?: string
  description?: string
}

/**
 * Match project location references to this scene (heading slug + direction text).
 */
export function findMatchingLocationReferences(
  scene: any,
  locationRefs: LocationReference[]
): ResolvedLocationForFrames[] {
  if (!locationRefs?.length) return []
  const withImages = locationRefs.filter(r => r.imageUrl)
  if (!withImages.length) return []

  const heading = typeof scene?.heading === 'string' ? scene.heading : scene?.heading?.text || ''
  const fromHeading = extractLocation(heading)
  const directionBlob = `${buildSceneDirectionText(scene)} ${heading}`.toLowerCase()
  const headingLoc = (fromHeading || '').toUpperCase()

  const matches: LocationReference[] = []
  const seen = new Set<string>()

  for (const ref of withImages) {
    const loc = (ref.location || '').toUpperCase()
    const display = (ref.locationDisplay || '').toUpperCase()
    const desc = (ref.description || '').toLowerCase()

    let hit = false
    if (headingLoc && (loc === headingLoc || loc.includes(headingLoc) || headingLoc.includes(loc))) {
      hit = true
    }
    if (!hit && headingLoc && display.includes(headingLoc)) {
      hit = true
    }
    if (!hit && loc.length >= 4) {
      const words = loc.split(/[\s\-]+/).filter(w => w.length >= 4)
      hit = words.some(w => directionBlob.includes(w.toLowerCase()))
    }
    if (!hit && desc.length >= 6) {
      const descWords = desc.split(/\s+/).filter(w => w.length >= 5)
      hit = descWords.some(w => directionBlob.includes(w))
    }

    if (hit && !seen.has(ref.id)) {
      seen.add(ref.id)
      matches.push(ref)
    }
  }

  return matches.map(ref => ({
    id: ref.id,
    name: ref.location,
    imageUrl: ref.imageUrl,
    description: ref.description,
  }))
}

export type FrameGenerationCharacterPayload = {
  name: string
  appearance?: string
  referenceUrl?: string
  ethnicity?: string
  age?: string
  wardrobe?: string
}

export type ResolveFrameGenerationContextArgs = {
  scene: any
  segment: {
    userEditedPrompt?: string
    generatedPrompt?: string
    action?: string
    dialogueLines?: Array<{ character?: string; text?: string; line?: string }>
    segmentDirection?: { characters?: string[] | Array<{ name?: string }>; talentAction?: string; keyProps?: string[] }
  }
  /** Project characters (Vision store shape) */
  projectCharacters: any[]
  objectReferences: VisualReference[]
  locationReferences: LocationReference[]
}

export type ResolvedFrameGenerationContext = {
  /** Text used for findSceneCharacters / findSceneObjects */
  sceneMatchText: string
  charactersPayload: FrameGenerationCharacterPayload[]
  objectRefsForApi: Array<{
    name: string
    description?: string
    category: 'prop' | 'vehicle' | 'set-piece' | 'costume' | 'technology' | 'other'
    importance: 'critical' | 'important' | 'background'
    imageUrl?: string
  }>
  /** Library IDs for matched props (for UI selection) */
  matchedObjectRefIds: string[]
  locationRefsForApi: ResolvedLocationForFrames[]
}

function dialogueSpeakerFallback(segment: ResolveFrameGenerationContextArgs['segment'], projectCharacters: any[]) {
  const names = new Set<string>()
  for (const line of segment.dialogueLines || []) {
    const c = line.character?.trim()
    if (c) names.add(c)
  }
  const out: any[] = []
  for (const name of names) {
    const full = projectCharacters.find(
      pc => pc.name === name || pc.name?.toLowerCase() === name.toLowerCase()
    )
    if (full) out.push(full)
  }
  return out
}

/**
 * Resolve who/what/where to send to /api/production/generate-segment-frames when the user did not open the dialog.
 */
export function resolveFrameGenerationContext(args: ResolveFrameGenerationContextArgs): ResolvedFrameGenerationContext {
  const { scene, segment, projectCharacters, objectReferences, locationReferences } = args

  const segmentPrompt =
    segment.userEditedPrompt || segment.generatedPrompt || segment.action || ''
  const segDir = segment.segmentDirection
  const segDirChars = Array.isArray(segDir?.characters)
    ? segDir!.characters!.map(c => (typeof c === 'string' ? c : (c as { name?: string }).name || '')).join(' ')
    : ''
  const segDirText = [segDir?.talentAction, ...(segDir?.keyProps || [])].filter(Boolean).join(' ')

  const sceneMatchText = [
    segmentPrompt,
    scene?.action || '',
    scene?.visualDescription || '',
    scene?.narration || '',
    buildSceneDirectionText(scene),
    segDirChars,
    segDirText,
    ...(scene?.dialogue || []).map((d: any) => `${d.character || ''} ${d.text || d.line || ''}`),
    ...(segment.dialogueLines || []).map(d => {
      const t = 'text' in d && (d as { text?: string }).text != null ? (d as { text?: string }).text! : (d as { line?: string }).line || ''
      return `${d.character || ''} ${t}`
    }),
  ]
    .join(' ')
    .trim()

  const sceneNumber = typeof scene?.sceneNumber === 'number' ? scene.sceneNumber : undefined

  let matchedChars = isNoTalentSceneForFrames(scene)
    ? []
    : findSceneCharacters(sceneMatchText, projectCharacters as any[])

  if (!isNoTalentSceneForFrames(scene) && matchedChars.length === 0) {
    matchedChars = dialogueSpeakerFallback(segment, projectCharacters)
  }

  // Sort by role like VisionPage (protagonist first)
  const roleOrder: Record<string, number> = { protagonist: 0, main: 1, supporting: 2 }
  const sorted = [...matchedChars].sort((a, b) => {
    return (roleOrder[a.role || 'supporting'] ?? 2) - (roleOrder[b.role || 'supporting'] ?? 2)
  })

  const charactersPayload: FrameGenerationCharacterPayload[] = sorted.map(c => ({
    name: c.name,
    appearance: c.appearanceDescription || c.description,
    referenceUrl: c.referenceImage,
    ethnicity: c.ethnicity,
    age: c.age,
    wardrobe: c.defaultWardrobe || c.wardrobe,
  }))

  const detectedObjects = findSceneObjects(sceneMatchText, objectReferences as any[], sceneNumber)

  const objectRefsForApi = detectedObjects.map(obj => ({
    name: obj.name,
    description: obj.description,
    category: (obj.category || 'prop') as const,
    importance: (obj.importance || 'important') as const,
    imageUrl: obj.imageUrl,
  }))

  const matchedObjectRefIds = detectedObjects.map(o => o.id).filter(Boolean) as string[]

  const locationRefsForApi = findMatchingLocationReferences(scene, locationReferences)

  return {
    sceneMatchText,
    charactersPayload,
    objectRefsForApi,
    matchedObjectRefIds,
    locationRefsForApi,
  }
}
