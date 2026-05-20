'use client'

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import {
  ArrowRight,
  Download,
  Upload,
  Users,
  MapPin,
  Package,
  Settings2,
  Loader2,
  Search,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { useReferenceTransfer } from '@/hooks/useSeries'
import type {
  ReferenceTransferDirection,
  ReferenceTransferMergeStrategy,
  ReferenceAssetSelection,
} from '@/types/series'
import type { ReferenceTransferDiff } from '@/lib/series/referenceTransfer'
import { toast } from 'sonner'

type CategoryKey = 'characters' | 'locations' | 'props' | 'settings'

export interface ReferenceImportProjectOption {
  id: string
  title: string
}

interface ReferenceTransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  seriesId: string
  /** Required unless `projects` is provided (picker step). */
  projectId?: string
  seriesTitle?: string
  projectTitle?: string
  initialDirection: ReferenceTransferDirection
  lockDirection?: boolean
  /** Import from any user project into the series library (project picker + full asset catalog). */
  importMode?: boolean
  /** When set, user picks a project before selecting assets. */
  projects?: ReferenceImportProjectOption[]
  condensed?: boolean
  condensedTitle?: string
  onComplete?: () => void
  onSkip?: () => void
}

const MERGE_STORAGE_KEY = 'sceneflow-reference-transfer-merge'

export function ReferenceTransferDialog({
  open,
  onOpenChange,
  seriesId,
  projectId: projectIdProp,
  seriesTitle,
  projectTitle: projectTitleProp,
  initialDirection,
  lockDirection = false,
  importMode = false,
  projects,
  condensed = false,
  condensedTitle,
  onComplete,
  onSkip,
}: ReferenceTransferDialogProps) {
  const {
    isTransferring,
    catalog,
    pendingDiff,
    loadCatalog,
    previewTransfer,
    applyTransfer,
    clearPendingDiff,
  } = useReferenceTransfer(seriesId)

  const needsProjectPicker = useMemo(
    () => importMode && !!projects?.length && !projectIdProp,
    [importMode, projects, projectIdProp]
  )
  const [resolvedProjectId, setResolvedProjectId] = useState(projectIdProp || '')
  const [resolvedProjectTitle, setResolvedProjectTitle] = useState(projectTitleProp || '')
  const activeProjectId = resolvedProjectId || projectIdProp || ''

  const [step, setStep] = useState<'project' | 'select' | 'preview'>(
    needsProjectPicker ? 'project' : 'select'
  )
  const [direction, setDirection] = useState<ReferenceTransferDirection>(initialDirection)
  const [mergeStrategy, setMergeStrategy] = useState<ReferenceTransferMergeStrategy>(() => {
    if (typeof window === 'undefined') return 'add_new_only'
    return (localStorage.getItem(MERGE_STORAGE_KEY) as ReferenceTransferMergeStrategy) || 'add_new_only'
  })
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('characters')
  const [selectedCharIds, setSelectedCharIds] = useState<Set<string>>(new Set())
  const [selectedLocIds, setSelectedLocIds] = useState<Set<string>>(new Set())
  const [selectedPropIds, setSelectedPropIds] = useState<Set<string>>(new Set())
  const [selectedWardrobeKeys, setSelectedWardrobeKeys] = useState<Set<string>>(new Set())
  const [includeSettings, setIncludeSettings] = useState(false)
  const [loadingCatalog, setLoadingCatalog] = useState(false)

  const isPull = direction === 'series_to_project'
  const sourceLabel = isPull
    ? seriesTitle || 'Series'
    : resolvedProjectTitle || projectTitleProp || 'Project'
  const targetLabel = isPull
    ? resolvedProjectTitle || projectTitleProp || 'Project'
    : seriesTitle || 'Series'

  const wasOpenRef = useRef(false)
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false
      return
    }
    const justOpened = !wasOpenRef.current
    wasOpenRef.current = true
    if (!justOpened) return

    setDirection(initialDirection)
    setResolvedProjectId(projectIdProp || '')
    setResolvedProjectTitle(projectTitleProp || '')
    setStep(needsProjectPicker ? 'project' : 'select')
    clearPendingDiff()
    setSearch('')
    setSelectedCharIds(new Set())
    setSelectedLocIds(new Set())
    setSelectedPropIds(new Set())
    setSelectedWardrobeKeys(new Set())
    setIncludeSettings(false)
  }, [
    open,
    initialDirection,
    clearPendingDiff,
    needsProjectPicker,
    projectIdProp,
    projectTitleProp,
  ])

  useEffect(() => {
    if (!open || !activeProjectId || step === 'project') return
    let cancelled = false
    setLoadingCatalog(true)
    loadCatalog(activeProjectId, { importMode })
      .then((cat) => {
        if (cancelled || !cat) return
        if (condensed && initialDirection === 'series_to_project') {
          const rec = new Set(cat.episodeCharacterIds)
          const chars = cat.characters.filter(
            (c) => rec.has(c.id) || c.provenance === 'series'
          )
          setSelectedCharIds(new Set(chars.map((c) => c.id)))
          setSelectedLocIds(new Set())
          setSelectedPropIds(new Set())
        }
      })
      .catch((e) => toast.error(e.message))
      .finally(() => {
        if (!cancelled) setLoadingCatalog(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, activeProjectId, step, loadCatalog, condensed, initialDirection, importMode])

  const selectAllFromCatalog = useCallback(() => {
    if (!catalog) return
    setSelectedCharIds(new Set(catalog.characters.map((c) => c.id)))
    setSelectedLocIds(new Set(catalog.locations.map((l) => l.id)))
    setSelectedPropIds(new Set(catalog.props.map((p) => p.id)))
    setSelectedWardrobeKeys(
      new Set(catalog.characters.flatMap((c) => c.wardrobes.map((w) => w.key)))
    )
    if (catalog.hasSettings) setIncludeSettings(true)
  }, [catalog])

  const handlePickProject = (id: string) => {
    const picked = projects?.find((p) => p.id === id)
    setResolvedProjectId(id)
    setResolvedProjectTitle(picked?.title || '')
    setStep('select')
  }

  const buildSelection = useCallback((): ReferenceAssetSelection => {
    return {
      characterIds: Array.from(selectedCharIds),
      locationIds: Array.from(selectedLocIds),
      propIds: Array.from(selectedPropIds),
      wardrobeKeys: Array.from(selectedWardrobeKeys),
      includeSettings,
    }
  }, [selectedCharIds, selectedLocIds, selectedPropIds, selectedWardrobeKeys, includeSettings])

  const totalSelected =
    selectedCharIds.size +
    selectedLocIds.size +
    selectedPropIds.size +
    selectedWardrobeKeys.size +
    (includeSettings ? 1 : 0)

  const filteredCharacters = useMemo(() => {
    if (!catalog) return []
    const q = search.toLowerCase()
    return catalog.characters.filter((c) => !q || c.name.toLowerCase().includes(q))
  }, [catalog, search])

  const filteredLocations = useMemo(() => {
    if (!catalog) return []
    const q = search.toLowerCase()
    return catalog.locations.filter((l) => !q || l.name.toLowerCase().includes(q))
  }, [catalog, search])

  const filteredProps = useMemo(() => {
    if (!catalog) return []
    const q = search.toLowerCase()
    return catalog.props.filter((p) => !q || p.name.toLowerCase().includes(q))
  }, [catalog, search])

  const selectEpisodeCast = () => {
    if (!catalog) return
    setSelectedCharIds(new Set(catalog.episodeCharacterIds))
  }

  const selectAllInCategory = (cat: CategoryKey, on: boolean) => {
    if (!catalog) return
    if (cat === 'characters') {
      setSelectedCharIds(on ? new Set(filteredCharacters.map((c) => c.id)) : new Set())
    } else if (cat === 'locations') {
      setSelectedLocIds(on ? new Set(filteredLocations.map((l) => l.id)) : new Set())
    } else if (cat === 'props') {
      setSelectedPropIds(on ? new Set(filteredProps.map((p) => p.id)) : new Set())
    } else if (cat === 'settings') {
      setIncludeSettings(on)
    }
  }

  const handlePreview = async () => {
    if (totalSelected === 0) {
      toast.error('Select at least one asset')
      return
    }
    try {
      localStorage.setItem(MERGE_STORAGE_KEY, mergeStrategy)
      await previewTransfer({
        projectId: activeProjectId,
        direction,
        selection: buildSelection(),
        mergeStrategy,
      })
      setStep('preview')
    } catch {
      /* toast from hook */
    }
  }

  const handleApply = async () => {
    try {
      await applyTransfer({
        projectId: activeProjectId,
        direction,
        selection: buildSelection(),
        mergeStrategy,
      })
      toast.success(
        isPull
          ? 'Imported into episode library'
          : importMode
            ? 'Imported into series reference library'
            : 'Added to series reference library'
      )
      onComplete?.()
      onOpenChange(false)
    } catch {
      /* toast */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-3xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-800 shrink-0">
          <DialogTitle className="text-lg">
            {condensed && condensedTitle
              ? condensedTitle
              : importMode
                ? 'Reference Library Import'
                : 'Share Reference Library'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {step === 'project' ? (
              'Choose a project to import characters, locations, props, and settings into this series.'
            ) : (
              <>
                {sourceLabel}
                <ArrowRight className="inline w-3.5 h-3.5 mx-1.5" />
                {targetLabel}
              </>
            )}
            {catalog?.seriesOutOfSync ? (
              <span className="ml-2 text-amber-400 text-xs">Series updated since last sync</span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {step === 'project' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar min-h-[280px]">
            {projects?.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePickProject(p.id)}
                className="w-full flex items-center justify-between gap-3 p-4 rounded-lg border border-gray-700 bg-gray-800/50 hover:border-amber-500/40 hover:bg-amber-500/5 text-left transition-colors"
              >
                <span className="font-medium text-white truncate">{p.title}</span>
                <ArrowRight className="w-4 h-4 text-gray-500 shrink-0" />
              </button>
            ))}
          </div>
        ) : step === 'select' ? (
          <>
            {!lockDirection && !importMode && (
              <div className="px-6 py-3 border-b border-gray-800 flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setDirection('series_to_project')}
                  className={cn(
                    'flex-1 min-w-[140px] rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    direction === 'series_to_project'
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  )}
                >
                  <Download className="w-4 h-4 mb-1" />
                  Import into episode
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('project_to_series')}
                  className={cn(
                    'flex-1 min-w-[140px] rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    direction === 'project_to_series'
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-200'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  )}
                >
                  <Upload className="w-4 h-4 mb-1" />
                  Add to series library
                </button>
              </div>
            )}

            <div className="flex flex-1 min-h-0 overflow-hidden">
              <div className="w-40 shrink-0 border-r border-gray-800 p-2 space-y-1">
                {(
                  [
                    ['characters', Users, catalog?.characters.length],
                    ['locations', MapPin, catalog?.locations.length],
                    ['props', Package, catalog?.props.length],
                    ['settings', Settings2, catalog?.hasSettings ? 1 : 0],
                  ] as const
                ).map(([key, Icon, count]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveCategory(key)}
                    className={cn(
                      'w-full flex items-center justify-between gap-1 rounded-lg px-2 py-2 text-xs',
                      activeCategory === key
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:bg-gray-800/50'
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" />
                      {key === 'settings' ? 'Settings' : key.charAt(0).toUpperCase() + key.slice(1)}
                    </span>
                    <span className="text-gray-500">{count ?? 0}</span>
                  </button>
                ))}
              </div>

              <div className="flex-1 flex flex-col min-w-0">
                <div className="p-3 border-b border-gray-800 flex flex-wrap gap-2 items-center">
                  <div className="relative flex-1 min-w-[120px]">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search…"
                      className="pl-8 h-8 text-xs bg-gray-950 border-gray-700"
                    />
                  </div>
                  {importMode ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-amber-500/40 text-amber-300"
                      onClick={selectAllFromCatalog}
                      disabled={!catalog || loadingCatalog}
                    >
                      Import all
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => selectAllInCategory(activeCategory, true)}
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={() => selectAllInCategory(activeCategory, false)}
                  >
                    Clear
                  </Button>
                  {activeCategory === 'characters' && catalog?.episodeCharacterIds.length ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-cyan-400"
                      onClick={selectEpisodeCast}
                    >
                      Episode cast
                    </Button>
                  ) : null}
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                  {loadingCatalog ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                    </div>
                  ) : activeCategory === 'settings' ? (
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-700 cursor-pointer">
                      <Checkbox
                        checked={includeSettings}
                        onCheckedChange={(v) => setIncludeSettings(!!v)}
                      />
                      <div>
                        <p className="text-sm font-medium">Visual style & generation settings</p>
                        <p className="text-xs text-gray-500">Aspect ratio, image style, color palette</p>
                      </div>
                    </label>
                  ) : activeCategory === 'characters' ? (
                    filteredCharacters.map((c) => (
                      <AssetRow
                        key={c.id}
                        name={c.name}
                        meta={[c.role, c.voiceId ? 'voice ✓' : null, c.provenance].filter(Boolean).join(' · ')}
                        imageUrl={c.referenceImageUrl}
                        checked={selectedCharIds.has(c.id)}
                        badge={c.provenance === 'series' ? 'Series' : 'Project'}
                        onCheckedChange={(on) => {
                          setSelectedCharIds((prev) => {
                            const next = new Set(prev)
                            if (on) next.add(c.id)
                            else next.delete(c.id)
                            return next
                          })
                        }}
                      >
                        {c.wardrobes.length > 0 ? (
                          <div className="mt-2 ml-7 space-y-1 border-l border-gray-700 pl-3">
                            {c.wardrobes.map((w) => (
                              <label
                                key={w.key}
                                className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer"
                              >
                                <Checkbox
                                  checked={selectedWardrobeKeys.has(w.key)}
                                  onCheckedChange={(v) => {
                                    setSelectedWardrobeKeys((prev) => {
                                      const next = new Set(prev)
                                      if (v) next.add(w.key)
                                      else next.delete(w.key)
                                      return next
                                    })
                                  }}
                                />
                                {w.name}
                              </label>
                            ))}
                          </div>
                        ) : null}
                      </AssetRow>
                    ))
                  ) : activeCategory === 'locations' ? (
                    filteredLocations.map((l) => (
                      <AssetRow
                        key={l.id}
                        name={l.name}
                        meta={l.provenance}
                        imageUrl={l.referenceImageUrl}
                        checked={selectedLocIds.has(l.id)}
                        badge={l.provenance === 'series' ? 'Series' : 'Project'}
                        onCheckedChange={(on) => {
                          setSelectedLocIds((prev) => {
                            const next = new Set(prev)
                            if (on) next.add(l.id)
                            else next.delete(l.id)
                            return next
                          })
                        }}
                      />
                    ))
                  ) : (
                    filteredProps.map((p) => (
                      <AssetRow
                        key={p.id}
                        name={p.name}
                        meta={p.category || p.provenance}
                        imageUrl={p.referenceImageUrl}
                        checked={selectedPropIds.has(p.id)}
                        badge={p.provenance === 'series' ? 'Series' : 'Project'}
                        onCheckedChange={(on) => {
                          setSelectedPropIds((prev) => {
                            const next = new Set(prev)
                            if (on) next.add(p.id)
                            else next.delete(p.id)
                            return next
                          })
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>

            {!condensed && (
              <div className="px-6 py-3 border-t border-gray-800 shrink-0">
                <p className="text-xs text-gray-500 mb-2">If assets already exist in the target</p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['add_new_only', 'Add new only'],
                      ['merge', 'Update matching'],
                      ['replace', 'Replace category'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMergeStrategy(value)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs border',
                        mergeStrategy === value
                          ? 'border-violet-500/50 bg-violet-500/10 text-violet-200'
                          : 'border-gray-700 text-gray-400'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="px-6 py-4 border-t border-gray-800 shrink-0">
              {importMode && projects?.length ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (step === 'select') setStep('project')
                    else onOpenChange(false)
                  }}
                >
                  {step === 'select' ? 'Change project' : 'Cancel'}
                </Button>
              ) : condensed ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    onSkip?.()
                    onOpenChange(false)
                  }}
                >
                  Skip — empty library
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              )}
              {!isPull || mergeStrategy === 'replace' ? (
                <Button onClick={handlePreview} disabled={isTransferring || totalSelected === 0}>
                  {isTransferring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Review changes ({totalSelected})
                </Button>
              ) : (
                <Button onClick={handleApply} disabled={isTransferring || totalSelected === 0}>
                  {isTransferring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Import {totalSelected} assets
                </Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
              <TransferDiffView diff={pendingDiff} />
            </div>
            <DialogFooter className="px-6 py-4 border-t border-gray-800 shrink-0">
              <Button variant="ghost" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button onClick={handleApply} disabled={isTransferring}>
                {isTransferring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirm transfer
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function AssetRow({
  name,
  meta,
  imageUrl,
  checked,
  badge,
  onCheckedChange,
  children,
}: {
  name: string
  meta?: string
  imageUrl?: string
  checked: boolean
  badge?: string
  onCheckedChange: (on: boolean) => void
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-gray-800 p-2 hover:bg-gray-800/30">
      <label className="flex items-center gap-3 cursor-pointer">
        <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(!!v)} />
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-10 h-10 rounded object-cover bg-gray-800" />
        ) : (
          <div className="w-10 h-10 rounded bg-gray-800" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          {meta ? <p className="text-xs text-gray-500 truncate">{meta}</p> : null}
        </div>
        {badge ? (
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded uppercase',
              badge === 'Series' ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'
            )}
          >
            {badge}
          </span>
        ) : null}
      </label>
      {children}
    </div>
  )
}

function TransferDiffView({ diff }: { diff: ReferenceTransferDiff | null }) {
  if (!diff) return <p className="text-gray-500 text-sm">No preview available.</p>

  const hasChanges =
    diff.characters.added.length +
      diff.characters.updated.length +
      diff.locations.added.length +
      diff.locations.updated.length +
      diff.props.added.length +
      diff.props.updated.length >
    0

  if (!hasChanges && !diff.aesthetic) {
    return (
      <p className="text-gray-400 text-sm flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-green-400" />
        No changes — selected assets already match the target.
      </p>
    )
  }

  return (
    <div className="space-y-4 text-sm">
      <p className="text-gray-400">
        Adding {diff.summary.addedCount}, updating {diff.summary.updatedCount} asset(s).
      </p>
      {diff.characters.added.length > 0 && (
        <DiffSection title="Characters added" count={diff.characters.added.length}>
          {diff.characters.added.map((c) => (
            <li key={c.id}>{c.name}</li>
          ))}
        </DiffSection>
      )}
      {diff.characters.updated.length > 0 && (
        <DiffSection title="Characters updated" count={diff.characters.updated.length}>
          {diff.characters.updated.map((u) => (
            <li key={u.id}>
              {u.id}: {u.fields.join(', ')}
            </li>
          ))}
        </DiffSection>
      )}
      {diff.locations.added.length > 0 && (
        <DiffSection title="Locations added" count={diff.locations.added.length}>
          {diff.locations.added.map((l) => (
            <li key={l.id}>{l.name}</li>
          ))}
        </DiffSection>
      )}
      {diff.props.added.length > 0 && (
        <DiffSection title="Props added" count={diff.props.added.length}>
          {diff.props.added.map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </DiffSection>
      )}
      {mergeStrategyWarning(diff)}
    </div>
  )
}

function DiffSection({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <div>
      <h4 className="text-green-400 text-xs font-medium mb-1">
        + {title} ({count})
      </h4>
      <ul className="text-gray-300 text-xs space-y-0.5 list-disc list-inside">{children}</ul>
    </div>
  )
}

function mergeStrategyWarning(diff: ReferenceTransferDiff) {
  if (diff.characters.updated.length > 0) {
    return (
      <p className="text-amber-400/90 text-xs flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        Updates will change series canon for all episodes using these characters.
      </p>
    )
  }
  return null
}
