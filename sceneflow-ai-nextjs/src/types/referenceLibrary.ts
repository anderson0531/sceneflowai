/**
 * User-scoped Global Reference Library types.
 * Assets are linked to projects/series via reference_asset_links.
 */

export type ReferenceAssetKind = 'character' | 'wardrobe' | 'location' | 'prop'

export type ReferenceLinkAddedBy = 'auto' | 'user' | 'series'

/** Kind-specific fields stored in reference_assets.attributes JSONB */
export interface ReferenceAssetAttributes {
  appearance?: string
  voiceId?: string
  voiceLabel?: string
  lockedPromptTokens?: string[]
  klingElementId?: string
  headshotUrl?: string
  fullBodyUrl?: string
  category?: string
  importance?: 'critical' | 'important' | 'minor'
  alwaysInclude?: boolean
  role?: string
  aliases?: string[]
  locationDisplay?: string
  generationPrompt?: string
  /** Legacy project/series id before library migration */
  legacyId?: string
  [key: string]: unknown
}

export interface ReferenceAssetRecord {
  id: string
  userId: string
  kind: ReferenceAssetKind
  parentAssetId?: string | null
  name: string
  canonicalName: string
  description?: string | null
  referenceImageUrl?: string | null
  attributes: ReferenceAssetAttributes
  tags: string[]
  originProjectId?: string | null
  originSeriesId?: string | null
  useCount: number
  lastUsedAt?: string | null
  archivedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface ReferenceAssetLinkRecord {
  id: string
  assetId: string
  projectId?: string | null
  seriesId?: string | null
  addedBy: ReferenceLinkAddedBy
  createdAt: string
}

/** Compact catalog entry for generator prompts */
export interface ReferenceCatalogEntry {
  id: string
  kind: ReferenceAssetKind
  name: string
  description?: string
  parentAssetId?: string
  referenceImageUrl?: string
  attributes?: ReferenceAssetAttributes
}

export interface ReferenceCatalog {
  characters: ReferenceCatalogEntry[]
  locations: ReferenceCatalogEntry[]
  props: ReferenceCatalogEntry[]
  wardrobes: ReferenceCatalogEntry[]
}

export interface ReferenceAssetListQuery {
  kind?: ReferenceAssetKind
  q?: string
  tags?: string[]
  linkedToProjectId?: string
  linkedToSeriesId?: string
  includeArchived?: boolean
  limit?: number
  cursor?: string
}

export interface ReferenceAssetListResult {
  assets: ReferenceAssetRecord[]
  nextCursor?: string
  total?: number
}

/** Generator output asset proposal before user confirmation */
export interface ProposedReferenceAsset {
  tempId: string
  kind: ReferenceAssetKind
  name: string
  description?: string
  parentAssetId?: string
  matchedLibraryAssetId?: string
  matchConfidence?: 'exact' | 'canonical' | 'fuzzy' | 'none'
  attributes?: ReferenceAssetAttributes
}

export interface ReferenceReconcileManifest {
  reuse: Array<{
    proposed: ProposedReferenceAsset
    libraryAssetId: string
    libraryAssetName: string
  }>
  create: ProposedReferenceAsset[]
  unmatched: ProposedReferenceAsset[]
}

export interface ReferenceReconcileRequest {
  projectId?: string
  seriesId?: string
  proposed: ProposedReferenceAsset[]
  confirmedReuseIds?: string[]
  confirmedCreateTempIds?: string[]
}

export interface ReferenceReconcileResult {
  linkedAssetIds: string[]
  createdAssetIds: string[]
  visionPhaseUpdates?: Record<string, unknown>
}
