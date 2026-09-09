/**
 * Client-safe library ↔ visionPhase converters.
 * Keep this module free of server-only / referenceTransfer imports.
 */

import type { LocationReference, VisualReference } from '@/types/visionReferences'
import type { VisionCharacter } from '@/types/vision'
import type { ReferenceAssetRecord } from '@/types/referenceLibrary'

export type ProjectCharacter = VisionCharacter & {
  libraryAssetId?: string
  referenceUrl?: string
  appearance?: string
  voiceId?: string
  lockedPromptTokens?: string[]
}

export function libraryAssetToCharacter(asset: ReferenceAssetRecord): ProjectCharacter {
  const attrs = asset.attributes || {}
  return {
    id: (attrs.legacyId as string) || asset.id,
    libraryAssetId: asset.id,
    name: asset.name,
    description: asset.description || '',
    role: (attrs.role as ProjectCharacter['role']) || 'supporting',
    referenceImage: asset.referenceImageUrl || undefined,
    referenceUrl: asset.referenceImageUrl || undefined,
    klingElementId: attrs.klingElementId,
    appearanceDescription: attrs.appearance,
    appearance: attrs.appearance,
    voiceConfig: attrs.voiceId ? { voiceId: attrs.voiceId } : undefined,
    voiceId: attrs.voiceId,
    lockedPromptTokens: attrs.lockedPromptTokens,
    wardrobes: Array.isArray(attrs.wardrobes) ? (attrs.wardrobes as ProjectCharacter['wardrobes']) : undefined,
  }
}

export function libraryAssetToLocation(asset: ReferenceAssetRecord): LocationReference {
  const attrs = asset.attributes || {}
  const now = new Date().toISOString()
  return {
    id: (attrs.legacyId as string) || asset.id,
    libraryAssetId: asset.id,
    location: asset.name,
    locationDisplay: attrs.locationDisplay || asset.name,
    imageUrl: asset.referenceImageUrl || '',
    sourceSceneIndex: 0,
    sourceSceneHeading: asset.name,
    pinnedAt: now,
    description: asset.description || undefined,
    klingElementId: attrs.klingElementId,
    generationPrompt: attrs.generationPrompt,
  }
}

export function libraryAssetToProp(asset: ReferenceAssetRecord): VisualReference {
  const attrs = asset.attributes || {}
  return {
    id: (attrs.legacyId as string) || asset.id,
    libraryAssetId: asset.id,
    type: 'object',
    name: asset.name,
    description: asset.description,
    imageUrl: asset.referenceImageUrl,
    category: attrs.category || 'prop',
    importance: attrs.importance,
    alwaysInclude: attrs.alwaysInclude,
    klingElementId: attrs.klingElementId,
  }
}
