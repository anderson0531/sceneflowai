/**
 * Canonical Continuity Manifest Contract
 *
 * Bridges Blueprint -> Continuity Library -> Reference Express -> Production Script Gen V2
 * with immutable canonical IDs (`char_01`, `loc_01`, `prop_01`), voice fingerprints,
 * visual silhouettes, and relational friction links so downstream automation never breaks
 * on display-name edits and preserves First-Take originality end-to-end.
 */

import { stripAgeStageSuffix } from '@/lib/character/nameEntropyGuard'

export interface CanonicalCharacterEntry {
  canonicalId: string
  name: string
  role: string
  voiceFingerprint?: string
  visualSilhouette?: string
  defaultWardrobe?: string
  externalGoal?: string
  internalNeed?: string
  fatalFlaw?: string
}

export interface CanonicalLocationEntry {
  canonicalId: string
  name: string
  intExt: 'INT' | 'EXT'
  visualAnchor: string
  atmosphere: string
}

export interface CanonicalPropEntry {
  canonicalId: string
  name: string
  category: string
  significance: string
  importance: string
}

export interface ContinuityManifest {
  version: 1
  generatedAt: string
  characters: CanonicalCharacterEntry[]
  locations: CanonicalLocationEntry[]
  props: CanonicalPropEntry[]
}

function padIndex(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Assign stable canonical IDs (`char_01`, `loc_01`, `prop_01`) onto a Blueprint treatment
 * and emit a structured `ContinuityManifest` stored alongside the variant.
 */
export function attachContinuityManifestToTreatment<T extends Record<string, any>>(
  treatment: T
): { treatment: T & { continuityManifest: ContinuityManifest }; manifest: ContinuityManifest } {
  const chars = Array.isArray(treatment?.character_descriptions)
    ? treatment.character_descriptions
    : []
  const scenes = Array.isArray(treatment?.scene_descriptions)
    ? treatment.scene_descriptions
    : []
  const props = Array.isArray(treatment?.prop_descriptions)
    ? treatment.prop_descriptions
    : []

  const manifestChars: CanonicalCharacterEntry[] = []
  const updatedChars = chars.map((c: any, idx: number) => {
    const canonicalId =
      typeof c?.canonicalId === 'string' && c.canonicalId.trim()
        ? c.canonicalId.trim()
        : `char_${padIndex(idx + 1)}`
    const voiceFingerprint =
      typeof c?.voiceFingerprint === 'string' && c.voiceFingerprint.trim()
        ? c.voiceFingerprint.trim()
        : undefined
    const visualSilhouette = [c?.build, c?.keyFeature, c?.hairStyle]
      .filter((v) => typeof v === 'string' && v.trim())
      .join('; ') || undefined

    manifestChars.push({
      canonicalId,
      name: String(c?.name || `Character ${idx + 1}`),
      role: String(c?.role || 'supporting'),
      voiceFingerprint,
      visualSilhouette,
      defaultWardrobe: typeof c?.defaultWardrobe === 'string' ? c.defaultWardrobe : undefined,
      externalGoal: typeof c?.externalGoal === 'string' ? c.externalGoal : undefined,
      internalNeed: typeof c?.internalNeed === 'string' ? c.internalNeed : undefined,
      fatalFlaw: typeof c?.fatalFlaw === 'string' ? c.fatalFlaw : undefined,
    })

    return {
      ...c,
      canonicalId,
      ...(voiceFingerprint ? { voiceFingerprint } : {}),
    }
  })

  const manifestLocs: CanonicalLocationEntry[] = []
  const updatedScenes = scenes.map((s: any, idx: number) => {
    const canonicalId =
      typeof s?.canonicalId === 'string' && s.canonicalId.trim()
        ? s.canonicalId.trim()
        : `loc_${padIndex(idx + 1)}`
    const intExt = String(s?.type || '').toUpperCase().includes('EXT') ? 'EXT' : 'INT'
    const visualAnchor = [s?.location, s?.furniture_props]
      .filter((v) => typeof v === 'string' && v.trim())
      .join(' — ')
    manifestLocs.push({
      canonicalId,
      name: String(s?.name || `Location ${idx + 1}`),
      intExt,
      visualAnchor,
      atmosphere: String(s?.atmosphere || ''),
    })
    return { ...s, canonicalId }
  })

  const manifestProps: CanonicalPropEntry[] = []
  const updatedProps = props.map((p: any, idx: number) => {
    const canonicalId =
      typeof p?.canonicalId === 'string' && p.canonicalId.trim()
        ? p.canonicalId.trim()
        : `prop_${padIndex(idx + 1)}`
    manifestProps.push({
      canonicalId,
      name: String(p?.name || `Prop ${idx + 1}`),
      category: String(p?.category || 'prop'),
      significance: String(p?.significance || p?.description || ''),
      importance: String(p?.importance || 'medium'),
    })
    return { ...p, canonicalId }
  })

  const manifest: ContinuityManifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    characters: manifestChars,
    locations: manifestLocs,
    props: manifestProps,
  }

  return {
    treatment: {
      ...treatment,
      character_descriptions: updatedChars,
      scene_descriptions: updatedScenes,
      prop_descriptions: updatedProps,
      continuityManifest: manifest,
    },
    manifest,
  }
}

/**
 * Format compact Voice Fingerprints + Canonical IDs for Script Gen V2 prompt injection
 * so every character sounds unmistakably distinct across 60+ minute scripts.
 */
export function buildVoiceFingerprintPromptBlock(
  characters: Array<{
    canonicalId?: string
    name?: string
    voiceFingerprint?: string
    description?: string
  }>
): string {
  const lines: string[] = []
  for (const c of characters || []) {
    const name = (c?.name || '').trim()
    if (!name) continue
    const { baseName } = stripAgeStageSuffix(name)
    const fp = (c?.voiceFingerprint || '').trim()
    if (!fp) continue
    const tag = c.canonicalId ? `[${c.canonicalId}] ` : ''
    lines.push(`- ${tag}${baseName}: ${fp}`)
  }
  if (lines.length === 0) return ''
  return `\nCHARACTER VOICE FINGERPRINTS (KEEP EACH SPEAKER UNMISTAKABLY DISTINCT IN DIALOGUE):\n${lines.join('\n')}\n`
}
