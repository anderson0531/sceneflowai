'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Users,
  MapPin,
  Package,
  Palette,
  Share2,
  RefreshCw,
  Upload,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { ProductTabList, ProductEmptyState } from '@/components/product'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ReferenceTransferDialog } from './ReferenceTransferDialog'
import type {
  SeriesCharacterResponse,
  SeriesLocationResponse,
  SeriesProp,
  EpisodeBlueprintResponse,
} from '@/types/series'
import type { SeriesProductionBible } from '@/types/series'
import {
  getCharacterUsageEpisodes,
  getLocationUsageEpisodes,
  resolveAssetAuthorProjectId,
} from '@/lib/series/seriesHealth'
import {
  resolveLibraryImage,
  selectEpisodeReferences,
  type DisplayReference,
  type ReferenceGroups,
} from '@/lib/series/referenceTransfer'

interface EpisodeProjectOption {
  projectId: string
  label: string
}

import { useSession } from 'next-auth/react'

interface SeriesReferenceLibraryPanelProps {
  seriesId: string
  seriesTitle: string
  bible: SeriesProductionBible | null | undefined
  episodeBlueprints?: EpisodeBlueprintResponse[]
  episodeProjects: EpisodeProjectOption[]
  initialSection?: RefSubTab
  onRegenerateCharacters: () => void
  onRegenerateLocations: () => void
  isGenerating: boolean
  onRefresh: () => void
}

type RefSubTab = 'cast' | 'locations' | 'props' | 'settings'

export function SeriesReferenceLibraryPanel({
  seriesId,
  seriesTitle,
  bible,
  episodeBlueprints = [],
  episodeProjects,
  initialSection = 'cast',
  onRegenerateCharacters,
  onRegenerateLocations,
  isGenerating,
  onRefresh,
}: SeriesReferenceLibraryPanelProps) {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [subTab, setSubTab] = useState<RefSubTab>(initialSection)
  const [selectedEpisodeProjectId, setSelectedEpisodeProjectId] = useState<string>('')
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [userProjects, setUserProjects] = useState<Array<{ id: string; title: string }>>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const emptyGroups = useMemo<ReferenceGroups>(
    () => ({ characters: [], locations: [], props: [] }),
    []
  )
  const [libraryGroups, setLibraryGroups] = useState<ReferenceGroups>(emptyGroups)
  const [productionByProject, setProductionByProject] = useState<Record<string, ReferenceGroups>>({})
  const [selectedEpisodeId, setSelectedEpisodeId] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/series/${seriesId}/production-references`)
      .then((response) => response.json())
      .then((data) => {
        if (cancelled || !data.success) return
        setLibraryGroups(data.library || emptyGroups)
        setProductionByProject(data.byProjectId || {})
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [seriesId, emptyGroups])

  const orderedEpisodes = useMemo(
    () => [...episodeBlueprints].sort((a, b) => a.episodeNumber - b.episodeNumber),
    [episodeBlueprints]
  )

  useEffect(() => {
    if (!selectedEpisodeId && orderedEpisodes[0]) {
      setSelectedEpisodeId(orderedEpisodes[0].id)
    }
  }, [orderedEpisodes, selectedEpisodeId])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setLoadingProjects(true)
    fetch(`/api/projects?userId=${encodeURIComponent(userId)}&pageSize=50`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data.success) return
        const list = (data.projects || []).map((p: { id: string; title: string }) => ({
          id: p.id,
          title: p.title || 'Untitled project',
        }))
        setUserProjects(list)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingProjects(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    if (initialSection) setSubTab(initialSection)
  }, [initialSection])

  const importProjectOptions = useMemo(() => {
    const byId = new Map<string, string>()
    for (const p of userProjects) byId.set(p.id, p.title)
    for (const ep of episodeProjects) {
      if (!byId.has(ep.projectId)) {
        byId.set(ep.projectId, ep.label)
      }
    }
    return Array.from(byId.entries())
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [userProjects, episodeProjects])

  const selectedEpisode = useMemo(
    () => episodeProjects.find((e) => e.projectId === selectedEpisodeProjectId),
    [episodeProjects, selectedEpisodeProjectId]
  )

  const openExport = () => {
    if (!selectedEpisodeProjectId) return
    setExportOpen(true)
  }

  const lastUpdated = bible?.lastUpdated
    ? new Date(bible.lastUpdated).toLocaleDateString()
    : null

  const selectedBlueprint =
    orderedEpisodes.find((episode) => episode.id === selectedEpisodeId) || orderedEpisodes[0]
  const seriesGroups = useMemo<ReferenceGroups>(
    () => ({
      characters: (bible?.characters || []).map((character) => ({
        id: character.id,
        name: character.name,
        role: character.role,
        description: character.description,
        imageUrl: character.referenceImageUrl,
      })),
      locations: (bible?.locations || []).map((location) => ({
        id: location.id,
        name: location.name,
        description: location.description,
        imageUrl: location.referenceImageUrl,
      })),
      props: (bible?.props || []).map((prop) => ({
        id: prop.id,
        name: prop.name,
        description: prop.description,
        imageUrl: prop.referenceImageUrl,
      })),
    }),
    [bible]
  )
  const episodeView = useMemo(
    () =>
      selectEpisodeReferences({
        production: selectedBlueprint?.projectId
          ? productionByProject[selectedBlueprint.projectId] || emptyGroups
          : emptyGroups,
        library: libraryGroups,
        series: seriesGroups,
        episodeCharacterIds: (selectedBlueprint?.characters || []).map((character) => character.characterId),
      }),
    [selectedBlueprint, productionByProject, libraryGroups, seriesGroups, emptyGroups]
  )
  const castForEpisode = episodeView.characters.map(toSeriesCharacter)
  const locationsForEpisode = episodeView.locations.map(toSeriesLocation)
  const propsForEpisode = episodeView.props.map(toSeriesProp)

  const subTabs: { key: RefSubTab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'cast', label: 'Cast', icon: <Users className="w-3.5 h-3.5" />, count: castForEpisode.length },
    {
      key: 'locations',
      label: 'Locations',
      icon: <MapPin className="w-3.5 h-3.5" />,
      count: locationsForEpisode.length,
    },
    { key: 'props', label: 'Objects', icon: <Package className="w-3.5 h-3.5" />, count: propsForEpisode.length },
    { key: 'settings', label: 'Settings', icon: <Palette className="w-3.5 h-3.5" />, count: bible?.aesthetic ? 1 : 0 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-sm font-bold text-white">Reference Library</h2>
          <p className="mt-1 text-sm text-gray-400">
            {seriesTitle}
            {bible?.version ? ` · v${bible.version}` : ''}
            {lastUpdated ? ` · Updated ${lastUpdated}` : ''}
          </p>
        </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center shrink-0">
            <Button
              onClick={() => setImportOpen(true)}
              disabled={loadingProjects || importProjectOptions.length === 0}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
            >
              <Upload className="w-4 h-4 mr-1.5" />
              Reference Library Import
            </Button>
            {episodeProjects.length > 0 ? (
              <>
                <Select
                  value={selectedEpisodeProjectId}
                  onValueChange={setSelectedEpisodeProjectId}
                >
                  <SelectTrigger className="w-full sm:w-[200px] bg-gray-900 border-gray-700 text-sm">
                    <SelectValue placeholder="Episode project…" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    {episodeProjects.map((ep) => (
                      <SelectItem key={ep.projectId} value={ep.projectId}>
                        {ep.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!selectedEpisodeProjectId}
                  onClick={openExport}
                  className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
                >
                  <Share2 className="w-4 h-4 mr-1.5" />
                  Export to episode
                </Button>
              </>
            ) : null}
          </div>
      </div>

      {orderedEpisodes.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {orderedEpisodes.map((episode) => {
            const active = episode.id === (selectedBlueprint?.id || '')
            return (
              <button
                key={episode.id}
                type="button"
                onClick={() => setSelectedEpisodeId(episode.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
                  active
                    ? 'border-amber-400 bg-amber-500/15 text-amber-100'
                    : 'border-white/15 text-gray-300 hover:border-white/30'
                }`}
              >
                EP {episode.episodeNumber}
              </button>
            )
          })}
        </div>
      ) : null}

      <ProductTabList
        tabs={subTabs.map((t) => ({
          key: t.key,
          label: t.label,
          icon: t.icon,
          count: t.count,
        }))}
        activeKey={subTab}
        onChange={(key) => setSubTab(key as RefSubTab)}
        accent="series"
      />

      {subTab === 'cast' && (
        <SeriesCastSection
          characters={castForEpisode}
          episodeBlueprints={episodeBlueprints}
          productionImages={{}}
          onRegenerate={onRegenerateCharacters}
          isGenerating={isGenerating}
        />
      )}
      {subTab === 'locations' && (
        <SeriesLocationsSection
          locations={locationsForEpisode}
          episodeBlueprints={episodeBlueprints}
          productionImages={{}}
          onRegenerate={onRegenerateLocations}
          isGenerating={isGenerating}
        />
      )}
      {subTab === 'props' && (
        <SeriesPropsSection
          props={propsForEpisode}
          episodeBlueprints={episodeBlueprints}
          productionImages={{}}
        />
      )}
      {subTab === 'settings' && (
        <SeriesSettingsSection
          aesthetic={bible?.aesthetic}
          toneGuidelines={bible?.toneGuidelines}
          visualGuidelines={bible?.visualGuidelines}
        />
      )}

      <ReferenceTransferDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        seriesId={seriesId}
        seriesTitle={seriesTitle}
        initialDirection="project_to_series"
        lockDirection
        importMode
        projects={importProjectOptions}
        onComplete={onRefresh}
      />

      {selectedEpisodeProjectId ? (
        <ReferenceTransferDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          seriesId={seriesId}
          projectId={selectedEpisodeProjectId}
          seriesTitle={seriesTitle}
          projectTitle={selectedEpisode?.label}
          initialDirection="series_to_project"
          lockDirection
          onComplete={onRefresh}
        />
      ) : null}
    </div>
  )
}

function toSeriesCharacter(asset: DisplayReference): SeriesCharacterResponse {
  return {
    id: asset.id,
    name: asset.name,
    role: (asset.role as SeriesCharacterResponse['role']) || 'supporting',
    description: asset.description || '',
    appearance: '',
    referenceImageUrl: asset.imageUrl,
    createdAt: '',
    updatedAt: '',
  }
}

function toSeriesLocation(asset: DisplayReference): SeriesLocationResponse {
  return {
    id: asset.id,
    name: asset.name,
    description: asset.description || '',
    referenceImageUrl: asset.imageUrl,
    createdAt: '',
    updatedAt: '',
  }
}

function toSeriesProp(asset: DisplayReference): SeriesProp {
  return {
    id: asset.id,
    name: asset.name,
    description: asset.description || '',
    referenceImageUrl: asset.imageUrl,
    createdAt: '',
    updatedAt: '',
  }
}

function SeriesCastSection({
  characters,
  episodeBlueprints,
  productionImages,
  onRegenerate,
  isGenerating,
}: {
  characters: SeriesCharacterResponse[]
  episodeBlueprints: EpisodeBlueprintResponse[]
  productionImages: Record<string, string>
  onRegenerate: () => void
  isGenerating: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-white">Cast</h3>
          <p className="text-sm text-gray-500">
            Characters with reference image, wardrobe, and voice
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={isGenerating}
          className="border-purple-600/50 text-purple-400"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
          Regenerate
        </Button>
      </div>
      {characters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {characters.map((char) => {
            const imageUrl = resolveLibraryImage(char.name, char.referenceImageUrl, productionImages)
            return (
            <div
              key={char.id}
              className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex gap-4"
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="w-14 h-14 rounded-lg object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-gray-700 flex items-center justify-center">
                  <Users className="w-6 h-6 text-gray-500" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-white">{char.name}</h4>
                <p className="text-xs text-gray-500">{char.role}</p>
                <AssetUsageMeta
                  usageEpisodes={getCharacterUsageEpisodes(char.id, episodeBlueprints)}
                  authorProjectId={resolveAssetAuthorProjectId(char.id, episodeBlueprints, (ep) =>
                    (ep.characters ?? []).some((c) => c.characterId === char.id)
                  )}
                />
                {char.voiceId ? (
                  <p className="text-xs text-cyan-400 mt-1">Voice assigned</p>
                ) : null}
                {char.wardrobes && char.wardrobes.length > 0 ? (
                  <p className="text-xs text-gray-500 mt-1">
                    {char.wardrobes.length} wardrobe{char.wardrobes.length !== 1 ? 's' : ''}
                  </p>
                ) : null}
              </div>
            </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Users className="w-12 h-12" />}
          message="No cast in the library yet. Use Reference Library Import to bring assets from a project."
        />
      )}
    </div>
  )
}

function SeriesLocationsSection({
  locations,
  episodeBlueprints,
  productionImages,
  onRegenerate,
  isGenerating,
}: {
  locations: SeriesLocationResponse[]
  episodeBlueprints: EpisodeBlueprintResponse[]
  productionImages: Record<string, string>
  onRegenerate: () => void
  isGenerating: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-white">Locations</h3>
          <p className="text-sm text-gray-500">Recurring environments in the series</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={isGenerating}
          className="border-green-600/50 text-green-400"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
          Regenerate
        </Button>
      </div>
      {locations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {locations.map((loc) => {
            const imageUrl = resolveLibraryImage(loc.name, loc.referenceImageUrl, productionImages)
            return (
            <div key={loc.id} className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex gap-4">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-700">
                  <MapPin className="h-6 w-6 text-gray-500" />
                </div>
              )}
              <div className="min-w-0">
              <h4 className="font-semibold text-white mb-1">{loc.name}</h4>
              <p className="text-sm text-gray-400">{loc.description}</p>
              <AssetUsageMeta
                usageEpisodes={getLocationUsageEpisodes(loc.name, episodeBlueprints)}
                authorProjectId={resolveAssetAuthorProjectId(loc.id, episodeBlueprints, (ep) => {
                  const text = `${ep.synopsis ?? ''} ${ep.logline ?? ''}`.toLowerCase()
                  return text.includes(loc.name.toLowerCase())
                })}
              />
              </div>
            </div>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={<MapPin className="w-12 h-12" />} message="No locations yet." />
      )}
    </div>
  )
}

function SeriesPropsSection({
  props,
  episodeBlueprints,
  productionImages,
}: {
  props: SeriesProp[]
  episodeBlueprints: EpisodeBlueprintResponse[]
  productionImages: Record<string, string>
}) {
  return (
    <div>
      <div className="mb-6">
        <h3 className="text-sm font-bold text-white">Objects</h3>
        <p className="text-sm text-gray-500">Named objects with cross-episode continuity</p>
      </div>
      {props.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {props.map((prop) => {
            const imageUrl = resolveLibraryImage(prop.name, prop.referenceImageUrl, productionImages)
            return (
            <div key={prop.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex gap-4">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="w-12 h-12 rounded object-cover" />
              ) : (
                <div className="w-12 h-12 rounded bg-gray-700 flex items-center justify-center">
                  <Package className="w-5 h-5 text-gray-500" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-white">{prop.name}</h4>
                <p className="text-sm text-gray-400 line-clamp-2">{prop.description}</p>
                <AssetUsageMeta
                  usageEpisodes={
                    prop.ownerCharacterId
                      ? getCharacterUsageEpisodes(prop.ownerCharacterId, episodeBlueprints)
                      : []
                  }
                  authorProjectId={resolveAssetAuthorProjectId(prop.id, episodeBlueprints, () => false)}
                />
              </div>
            </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Package className="w-12 h-12" />}
          message="No props yet. Import from a project reference library."
        />
      )}
    </div>
  )
}

function SeriesSettingsSection({
  aesthetic,
  toneGuidelines,
  visualGuidelines,
}: {
  aesthetic?: SeriesProductionBible['aesthetic']
  toneGuidelines?: string
  visualGuidelines?: string
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Palette className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">Visual style</h3>
        </div>
        {aesthetic?.visualStyle || visualGuidelines ? (
          <div className="space-y-3 text-sm text-gray-300">
            {aesthetic?.visualStyle ? <p>{aesthetic.visualStyle}</p> : null}
            {aesthetic?.cinematography ? (
              <p>
                <span className="text-gray-500">Cinematography: </span>
                {aesthetic.cinematography}
              </p>
            ) : null}
            {visualGuidelines ? <p>{visualGuidelines}</p> : null}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No visual style defined.</p>
        )}
      </div>
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="font-semibold text-white mb-4">Tone & audio</h3>
        {toneGuidelines ? (
          <p className="text-sm text-gray-300">{toneGuidelines}</p>
        ) : (
          <p className="text-gray-500 text-sm">No tone guidelines defined.</p>
        )}
      </div>
    </div>
  )
}

function AssetUsageMeta({
  usageEpisodes,
  authorProjectId,
}: {
  usageEpisodes: number[]
  authorProjectId: string | null
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {usageEpisodes.length > 0 ? (
        <span className="text-xs text-gray-500">
          Used in EP {usageEpisodes.slice(0, 5).join(', ')}
          {usageEpisodes.length > 5 ? ` +${usageEpisodes.length - 5}` : ''}
        </span>
      ) : (
        <span className="text-xs text-gray-600">Not referenced in episode blueprints yet</span>
      )}
      {authorProjectId ? (
        <Link
          href={`/dashboard/studio/${authorProjectId}`}
          className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
        >
          Edit in Production
          <ExternalLink className="w-3 h-3" />
        </Link>
      ) : null}
    </div>
  )
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center text-gray-500">
      <div className="mx-auto mb-4 opacity-40">{icon}</div>
      <p className="text-sm">{message}</p>
    </div>
  )
}
