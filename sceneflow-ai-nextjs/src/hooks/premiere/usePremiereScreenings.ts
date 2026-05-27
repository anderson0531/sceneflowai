'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

export type PremiereScreening = {
  id: string
  title: string
  streamId?: string
  streamLabel?: string
  locale?: string
  sourceType?: 'video' | 'animatic'
  videoUrl?: string
  thumbnail?: string
  shareUrl?: string
  createdAt: string
  updatedAt?: string
  status: 'draft' | 'active' | 'completed' | 'expired'
  reviewStatus?: 'open' | 'in_review' | 'resolved'
  owner?: string
  lastActionAt?: string
  viewerCount: number
  averageCompletion: number
  feedbackCount?: number
  avgRating?: number
  latestFeedbackAt?: string
  openItems?: number
  editable?: boolean
}

function inferStreamMetadata(streamName: string | undefined): {
  streamLabel?: string
  locale?: string
  sourceType: 'video' | 'animatic'
} {
  const label = (streamName || '').trim()
  const normalized = label.toLowerCase()
  let locale = 'en'
  if (normalized.includes('spanish')) locale = 'es'
  else if (normalized.includes('french')) locale = 'fr'
  else if (normalized.includes('portuguese')) locale = 'pt'
  else if (normalized.includes('german')) locale = 'de'
  const sourceType = normalized.includes('animatic') ? 'animatic' : 'video'
  return {
    streamLabel: label || undefined,
    locale,
    sourceType,
  }
}

function dedupeScreenings(items: PremiereScreening[]): PremiereScreening[] {
  const deduped: PremiereScreening[] = []
  const seenIds = new Set<string>()
  const bestByStreamAndUrl = new Map<string, PremiereScreening>()

  for (const item of items) {
    const id = item.id?.trim()
    if (!id || seenIds.has(id)) continue
    seenIds.add(id)
    const urlKey = (item.videoUrl || '').trim().toLowerCase()
    const streamKey = (item.streamId || item.streamLabel || 'unscoped').trim().toLowerCase()
    if (!urlKey) continue
    const dedupeKey = `${streamKey}::${urlKey}`

    const existing = bestByStreamAndUrl.get(dedupeKey)
    if (!existing) {
      bestByStreamAndUrl.set(dedupeKey, item)
      continue
    }

    const existingPersisted = existing.editable === true
    const itemPersisted = item.editable === true
    if (itemPersisted && !existingPersisted) {
      bestByStreamAndUrl.set(dedupeKey, item)
      continue
    }
    if (!itemPersisted && existingPersisted) {
      continue
    }

    const existingTime = new Date(existing.updatedAt || existing.createdAt).getTime()
    const itemTime = new Date(item.updatedAt || item.createdAt).getTime()
    if (itemTime >= existingTime) {
      bestByStreamAndUrl.set(dedupeKey, item)
    }
  }

  for (const item of bestByStreamAndUrl.values()) {
    deduped.push(item)
  }

  deduped.sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt).getTime() -
      new Date(a.updatedAt || a.createdAt).getTime()
  )
  return deduped
}

export interface UsePremiereScreeningsOptions {
  projectId?: string
  isDemo?: boolean
  projectMetadata?: unknown
  projectBillboard?: string
}

export function usePremiereScreenings({
  projectId,
  isDemo,
  projectMetadata,
  projectBillboard,
}: UsePremiereScreeningsOptions) {
  const [persistedScreenings, setPersistedScreenings] = useState<PremiereScreening[]>([])

  const refreshPersistedScreenings = useCallback(async () => {
    if (!projectId || isDemo) {
      setPersistedScreenings([])
      return
    }
    try {
      const res = await fetch(`/api/premiere/screenings?projectId=${encodeURIComponent(projectId)}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as { items?: PremiereScreening[] }
      setPersistedScreenings(
        Array.isArray(data.items)
          ? data.items.map((item) => ({
              ...item,
              editable: true,
              shareUrl: item.shareUrl || (item.id.startsWith('premiere-') ? `/s/${item.id}` : undefined),
            }))
          : []
      )
    } catch (error) {
      console.error('[Premiere] Failed loading persisted screenings:', error)
      setPersistedScreenings([])
    }
  }, [isDemo, projectId])

  useEffect(() => {
    void refreshPersistedScreenings()
  }, [refreshPersistedScreenings])

  const derivedFinalCutScreenings = useMemo<PremiereScreening[]>(() => {
    if (isDemo) {
      return [
        {
          id: 'demo-premiere-screening',
          title: 'Demo premiere cut',
          createdAt: new Date().toISOString(),
          status: 'active',
          viewerCount: 8,
          averageCompletion: 73,
        },
      ]
    }

    if (!projectId) return []

    const items: PremiereScreening[] = []
    const meta = projectMetadata as
      | {
          exportedVideoUrl?: string
          billboardUrl?: string
          billboardImageUrl?: string
          finalCutStreams?: Array<{
            id: string
            name?: string
            exports?: Array<{
              id: string
              outputUrl?: string
              status?: string
              completedAt?: string
              createdAt?: string
            }>
          }>
        }
      | undefined

    const billboard =
      (meta?.billboardUrl || meta?.billboardImageUrl || '')?.trim() || projectBillboard || undefined
    const exported = (meta?.exportedVideoUrl || '').trim()

    if (exported) {
      items.push({
        id: `project-export-${projectId}`,
        title: 'Latest project export',
        videoUrl: exported,
        thumbnail: billboard,
        createdAt: new Date().toISOString(),
        status: 'draft',
        viewerCount: 0,
        averageCompletion: 0,
      })
    }

    for (const stream of meta?.finalCutStreams || []) {
      for (const ex of stream.exports ?? []) {
        const url = (ex.outputUrl || '').trim()
        if (!url) continue
        items.push({
          id: ex.id,
          title: `Export · ${stream.name || 'Untitled stream'}`,
          streamId: stream.id,
          ...inferStreamMetadata(stream.name),
          videoUrl: url,
          thumbnail: billboard,
          createdAt: ex.completedAt || ex.createdAt || new Date().toISOString(),
          status: ex.status === 'complete' ? 'active' : 'draft',
          viewerCount: 0,
          averageCompletion: 0,
        })
      }
    }

    return items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [isDemo, projectBillboard, projectId, projectMetadata])

  const screenings = useMemo<PremiereScreening[]>(() => {
    const billboard =
      projectBillboard ||
      ((projectMetadata as { billboardUrl?: string; billboardImageUrl?: string } | undefined)
        ?.billboardUrl ||
        (projectMetadata as { billboardUrl?: string; billboardImageUrl?: string } | undefined)
          ?.billboardImageUrl ||
        '')?.trim() ||
      undefined

    return dedupeScreenings([
      ...persistedScreenings,
      ...derivedFinalCutScreenings.map((item) => ({ ...item, editable: false })),
    ]).map((item) => ({
      ...item,
      thumbnail: item.thumbnail || billboard,
      shareUrl:
        item.shareUrl || (item.id.startsWith('premiere-') ? `/s/${item.id}` : undefined),
    }))
  }, [derivedFinalCutScreenings, persistedScreenings, projectBillboard, projectMetadata])

  const masterVideoUrl = useMemo(() => {
    const exported = (
      (projectMetadata as { exportedVideoUrl?: string } | undefined)?.exportedVideoUrl || ''
    ).trim()
    if (exported) return exported
    const persisted = screenings.find((s) => s.id.startsWith('premiere-') && s.videoUrl)
    return persisted?.videoUrl || screenings.find((s) => s.videoUrl)?.videoUrl
  }, [projectMetadata, screenings])

  const activePremiereScreeningId = useMemo(
    () => screenings.find((s) => s.id.startsWith('premiere-'))?.id,
    [screenings]
  )

  return {
    screenings,
    persistedScreenings,
    masterVideoUrl,
    activePremiereScreeningId,
    refreshPersistedScreenings,
  }
}
