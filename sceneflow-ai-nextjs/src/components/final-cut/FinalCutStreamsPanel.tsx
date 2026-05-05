'use client'

import React, { useMemo } from 'react'
import {
  Clapperboard,
  Video as VideoIcon,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type {
  FinalCutSceneClip,
  FinalCutSelection,
  ProductionFormat,
  ProductionLanguage,
} from '@/lib/types/finalCut'
import { FLAG_EMOJIS, getLanguageName } from '@/constants/languages'

export interface FinalCutStreamsPanelProps {
  /** Active selection (format + language + per-scene overrides). */
  selection: FinalCutSelection
  /** Resolved per-scene clips for the current selection. */
  clips: FinalCutSceneClip[]
  /** Languages with at least one ready stream for the active format. */
  availableLanguages: string[]
  /** Update format ("animatic" | "video"). */
  onChangeFormat: (format: ProductionFormat) => void
  /** Update language. */
  onChangeLanguage: (language: ProductionLanguage) => void
  /** Set / clear a scene-level version override. Pass null to reset to global default. */
  onChangeSceneOverride: (sceneId: string, version: number | null) => void
  /** Disabled state (saving, demo mode). */
  disabled?: boolean
  /** Vision / Production hub for scene renders. */
  productionHref?: string
  showProductionLink?: boolean
  /** Embedded inside a section card — skip the duplicate border/padding. */
  embeddedInSection?: boolean
  /** Suppress the panel's title when the page provides a section header. */
  suppressOuterTitle?: boolean
}

function statusBadge(status: FinalCutSceneClip['status']) {
  if (status === 'ready') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Render in progress
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-rose-300">
      <AlertTriangle className="w-3.5 h-3.5" /> Not rendered
    </span>
  )
}

export function FinalCutStreamsPanel({
  selection,
  clips,
  availableLanguages,
  onChangeFormat,
  onChangeLanguage,
  onChangeSceneOverride,
  disabled = false,
  productionHref,
  showProductionLink = true,
  embeddedInSection = false,
  suppressOuterTitle = false,
}: FinalCutStreamsPanelProps) {
  const languages = useMemo(() => {
    const set = new Set(availableLanguages)
    set.add(selection.language)
    return Array.from(set).sort()
  }, [availableLanguages, selection.language])

  const readyCount = clips.filter((c) => c.status === 'ready').length
  const totalCount = clips.length
  const hasAnyStream = clips.some((c) => c.availableVersions.length > 0)

  return (
    <div
      className={cn(
        'space-y-4',
        embeddedInSection
          ? 'px-4 py-4 sm:px-5 sm:py-5'
          : 'rounded-xl border border-zinc-800/70 bg-zinc-950/45 backdrop-blur-md p-4 sm:p-5'
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {!suppressOuterTitle ? (
            <h2 className="text-sm font-semibold text-white tracking-tight">Production streams</h2>
          ) : null}
          <p className="text-xs text-zinc-500 mt-1 max-w-2xl leading-relaxed">
            Pick the format and language to preview. Scenes default to the latest ready render — pin a
            specific version per scene if you need to.
          </p>
        </div>
        {showProductionLink && productionHref ? (
          <Link href={productionHref} className="shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              className="border-purple-500/40 text-purple-200 hover:bg-purple-500/10"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Production
            </Button>
          </Link>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={selection.format}
          onValueChange={(v) => onChangeFormat(v as ProductionFormat)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full sm:w-auto sm:grid-cols-2 grid-cols-2 h-10 p-1 bg-zinc-950/80 border border-zinc-700/60 rounded-lg">
            <TabsTrigger
              value="animatic"
              className="gap-2 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=inactive]:text-zinc-400 rounded-md text-xs font-medium px-3"
              disabled={disabled}
            >
              <Clapperboard className="w-4 h-4" />
              Animatic
            </TabsTrigger>
            <TabsTrigger
              value="full-video"
              className="gap-2 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=inactive]:text-zinc-400 rounded-md text-xs font-medium px-3"
              disabled={disabled}
            >
              <VideoIcon className="w-4 h-4" />
              Video
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="uppercase tracking-wider text-zinc-500">Language</span>
          <select
            value={selection.language}
            disabled={disabled}
            onChange={(e) => onChangeLanguage(e.target.value as ProductionLanguage)}
            className="bg-zinc-900/80 text-zinc-200 text-xs rounded-md px-2 py-1.5 border border-zinc-700/80 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
          >
            {languages.map((code) => (
              <option key={code} value={code}>
                {(FLAG_EMOJIS[code] ?? '🌐') + ' ' + getLanguageName(code)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between gap-3 text-[11px] text-zinc-500">
        <span>
          {readyCount} of {totalCount} scenes ready
        </span>
        {!hasAnyStream && totalCount > 0 ? (
          <span className="text-amber-300">
            No production renders for{' '}
            {selection.format === 'animatic' ? 'Animatic' : 'Video'} · {getLanguageName(selection.language)}
          </span>
        ) : null}
      </div>

      {totalCount === 0 ? (
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-950/40 p-6 text-center text-sm text-zinc-400">
          No scenes found in this project. Add scenes in the script before previewing in Final Cut.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-800/80 rounded-lg border border-zinc-800/80 bg-zinc-950/40 overflow-hidden">
          {clips.map((clip) => {
            const override = selection.perSceneOverrides?.[clip.sceneId]?.streamVersion
            const usingOverride = typeof override === 'number'
            const versionList = clip.availableVersions
            return (
              <li key={clip.sceneId} className="px-3 py-3 sm:px-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-zinc-300 bg-zinc-900/80 border border-zinc-700/70 rounded px-1.5 py-0.5 tabular-nums shrink-0">
                      {clip.sceneNumber}
                    </span>
                    <p className="text-sm text-zinc-200 truncate">
                      {clip.heading || `Scene ${clip.sceneNumber}`}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    {statusBadge(clip.status)}
                    {clip.streamVersion ? (
                      <span className="text-[11px] text-zinc-500 tabular-nums">
                        Using v{clip.streamVersion}
                        {usingOverride ? ' (pinned)' : ''}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={usingOverride ? String(override) : ''}
                    disabled={disabled || versionList.length === 0}
                    onChange={(e) => {
                      const raw = e.target.value
                      if (raw === '') {
                        onChangeSceneOverride(clip.sceneId, null)
                      } else {
                        onChangeSceneOverride(clip.sceneId, Number(raw))
                      }
                    }}
                    className="bg-zinc-900/80 text-zinc-200 text-xs rounded-md px-2 py-1.5 border border-zinc-700/80 focus:outline-none focus:ring-1 focus:ring-violet-500/50 disabled:opacity-50"
                    aria-label={`Version override for scene ${clip.sceneNumber}`}
                  >
                    <option value="">Use latest</option>
                    {versionList.map((v) => (
                      <option key={v} value={v}>
                        v{v}
                      </option>
                    ))}
                  </select>
                  {usingOverride ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={disabled}
                      className="h-8 px-2 text-zinc-400 hover:text-zinc-200"
                      onClick={() => onChangeSceneOverride(clip.sceneId, null)}
                    >
                      Reset
                    </Button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
