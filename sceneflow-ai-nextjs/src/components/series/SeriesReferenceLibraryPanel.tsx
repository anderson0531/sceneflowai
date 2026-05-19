'use client'

import React, { useMemo, useState } from 'react'
import {
  BookOpen,
  Users,
  MapPin,
  Package,
  Palette,
  Download,
  Share2,
  RefreshCw,
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
  ReferenceTransferDirection,
} from '@/types/series'
import type { SeriesProductionBible } from '@/types/series'

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
  const [subTab, setSubTab] = useState<RefSubTab>('cast')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferDirection, setTransferDirection] =
    useState<ReferenceTransferDirection>('project_to_series')

  const selectedEpisode = useMemo(
    () => episodeProjects.find((e) => e.projectId === selectedProjectId),
    [episodeProjects, selectedProjectId]
  )

  const openTransfer = (direction: ReferenceTransferDirection) => {
    if (!selectedProjectId) return
    setTransferDirection(direction)
    setTransferOpen(true)
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
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            {episodeProjects.length > 0 ? (
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-full sm:w-[220px] bg-gray-900 border-gray-700 text-sm">
                  <SelectValue placeholder="Select episode project…" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {episodeProjects.map((ep) => (
                    <SelectItem key={ep.projectId} value={ep.projectId}>
                      {ep.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-gray-500">Start an episode to import or export assets.</p>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedProjectId}
              onClick={() => openTransfer('project_to_series')}
              className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Import from episode
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedProjectId}
              onClick={() => openTransfer('series_to_project')}
              className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              Export to episode
            </Button>
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

      {selectedProjectId ? (
        <ReferenceTransferDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          seriesId={seriesId}
          projectId={selectedProjectId}
          seriesTitle={seriesTitle}
          projectTitle={selectedEpisode?.label}
          initialDirection={transferDirection}
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
          <p className="text-sm text-gray-500">Characters shared across all episodes</p>
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
        <EmptyState icon={<Users className="w-12 h-12" />} message="No cast in the library yet." />
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
          message="No props yet. Import from an episode project or add during production."
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
