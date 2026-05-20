'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Users,
  MapPin,
  Package,
  Palette,
  Share2,
  RefreshCw,
  Upload,
} from 'lucide-react'
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
} from '@/types/series'
import type { SeriesProductionBible } from '@/types/series'
import { useSession } from 'next-auth/react'

interface EpisodeProjectOption {
  projectId: string
  label: string
}

interface SeriesReferenceLibraryPanelProps {
  seriesId: string
  seriesTitle: string
  bible: SeriesProductionBible | null | undefined
  episodeProjects: EpisodeProjectOption[]
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
  episodeProjects,
  onRegenerateCharacters,
  onRegenerateLocations,
  isGenerating,
  onRefresh,
}: SeriesReferenceLibraryPanelProps) {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [subTab, setSubTab] = useState<RefSubTab>('cast')
  const [selectedEpisodeProjectId, setSelectedEpisodeProjectId] = useState<string>('')
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [userProjects, setUserProjects] = useState<Array<{ id: string; title: string }>>([])
  const [loadingProjects, setLoadingProjects] = useState(false)

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

  const subTabs: { key: RefSubTab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'cast', label: 'Cast', icon: <Users className="w-3.5 h-3.5" />, count: bible?.characters?.length || 0 },
    {
      key: 'locations',
      label: 'Locations',
      icon: <MapPin className="w-3.5 h-3.5" />,
      count: bible?.locations?.length || 0,
    },
    { key: 'props', label: 'Props', icon: <Package className="w-3.5 h-3.5" />, count: bible?.props?.length || 0 },
    { key: 'settings', label: 'Settings', icon: <Palette className="w-3.5 h-3.5" />, count: bible?.aesthetic ? 1 : 0 },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5 p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Reference Library</h2>
              <p className="text-sm text-gray-400">{seriesTitle}</p>
              <p className="text-xs text-gray-500 mt-1">
                {bible?.version ? `v${bible.version}` : 'v1.0.0'}
                {lastUpdated ? ` · Updated ${lastUpdated}` : ''}
              </p>
              <p className="text-xs text-gray-500 mt-2 max-w-xl">
                Import cast (image, wardrobe, voice), locations, props, and visual settings from any of
                your projects. Assets are stored on this series and flow into new episodes.
              </p>
            </div>
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
      </div>

      <div className="flex items-center border-b border-gray-700/50 overflow-x-auto">
        {subTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSubTab(tab.key)}
            className={`relative px-4 py-2 text-sm font-medium rounded-t-lg transition-all mr-1 flex-shrink-0 flex items-center gap-2 ${
              subTab === tab.key
                ? 'bg-gray-800 text-amber-300 border-t border-x border-gray-600/50 -mb-px'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/80">{tab.count}</span>
          </button>
        ))}
      </div>

      {subTab === 'cast' && (
        <SeriesCastSection
          characters={bible?.characters || []}
          onRegenerate={onRegenerateCharacters}
          isGenerating={isGenerating}
        />
      )}
      {subTab === 'locations' && (
        <SeriesLocationsSection
          locations={bible?.locations || []}
          onRegenerate={onRegenerateLocations}
          isGenerating={isGenerating}
        />
      )}
      {subTab === 'props' && <SeriesPropsSection props={bible?.props || []} />}
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

function SeriesCastSection({
  characters,
  onRegenerate,
  isGenerating,
}: {
  characters: SeriesCharacterResponse[]
  onRegenerate: () => void
  isGenerating: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Cast</h3>
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
          {characters.map((char) => (
            <div
              key={char.id}
              className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex gap-4"
            >
              {char.referenceImageUrl ? (
                <img
                  src={char.referenceImageUrl}
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
          ))}
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
  onRegenerate,
  isGenerating,
}: {
  locations: SeriesLocationResponse[]
  onRegenerate: () => void
  isGenerating: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Locations</h3>
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
          {locations.map((loc) => (
            <div key={loc.id} className="bg-gray-800 rounded-xl border border-gray-700 p-5">
              <h4 className="font-semibold text-white mb-1">{loc.name}</h4>
              <p className="text-sm text-gray-400">{loc.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<MapPin className="w-12 h-12" />} message="No locations yet." />
      )}
    </div>
  )
}

function SeriesPropsSection({ props }: { props: SeriesProp[] }) {
  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white">Props</h3>
        <p className="text-sm text-gray-500">Named objects with cross-episode continuity</p>
      </div>
      {props.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {props.map((prop) => (
            <div key={prop.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex gap-4">
              {prop.referenceImageUrl ? (
                <img src={prop.referenceImageUrl} alt="" className="w-12 h-12 rounded object-cover" />
              ) : (
                <div className="w-12 h-12 rounded bg-gray-700 flex items-center justify-center">
                  <Package className="w-5 h-5 text-gray-500" />
                </div>
              )}
              <div>
                <h4 className="font-semibold text-white">{prop.name}</h4>
                <p className="text-sm text-gray-400 line-clamp-2">{prop.description}</p>
              </div>
            </div>
          ))}
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

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center text-gray-500">
      <div className="mx-auto mb-4 opacity-40">{icon}</div>
      <p className="text-sm">{message}</p>
    </div>
  )
}
