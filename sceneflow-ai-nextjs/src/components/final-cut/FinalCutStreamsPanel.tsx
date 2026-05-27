'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import {
  Clapperboard,
  Video as VideoIcon,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { RenderFinalCutButton } from './RenderFinalCutButton'
import { cn } from '@/lib/utils'
import type {
  FinalCutAssemblyPresetId,
  FinalCutSceneClip,
  FinalCutSelection,
  ProductionLanguage,
} from '@/lib/types/finalCut'
import { FINAL_CUT_PRESETS } from '@/lib/final-cut/finalCutPresets'
import { FLAG_EMOJIS, getLanguageName } from '@/constants/languages'

export interface FinalCutStreamsPanelProps {
  selection: FinalCutSelection
  clips: FinalCutSceneClip[]
  availableLanguages: string[]
  onApplyPreset: (presetId: FinalCutAssemblyPresetId) => void
  onChangeSceneOverride: (
    sceneId: string,
    patch: {
      streamType?: 'animatic' | 'video' | null
      language?: ProductionLanguage | null
      streamVersion?: number | null
    }
  ) => void
  disabled?: boolean
  productionHref?: string
  projectId?: string
  embeddedInSection?: boolean
  suppressOuterTitle?: boolean
  renderButtonProps?: {
    projectId: string | undefined
    filenameLabel?: string
    onRendered?: (url: string) => Promise<void> | void
    lastRenderUrl?: string | null
    onOpenPremiere?: () => void
  }
  isMixedFormat?: boolean
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
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Rendering
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-rose-300">
      <AlertTriangle className="w-3.5 h-3.5" /> Missing
    </span>
  )
}

export function FinalCutStreamsPanel({
  selection,
  clips,
  availableLanguages,
  onApplyPreset,
  onChangeSceneOverride,
  disabled = false,
  productionHref,
  projectId,
  embeddedInSection = false,
  suppressOuterTitle = false,
  renderButtonProps,
  isMixedFormat = false,
}: FinalCutStreamsPanelProps) {
  const readyCount = clips.filter((c) => c.status === 'ready').length
  const totalCount = clips.length
  const activePreset = selection.presetId ?? 'all-video'
  const isCustom = activePreset === 'custom'

  const globalLanguages = useMemo(() => {
    const set = new Set(availableLanguages)
    set.add(selection.language)
    return Array.from(set).sort()
  }, [availableLanguages, selection.language])

  return (
    <div
      className={cn(
        'space-y-5',
        embeddedInSection
          ? 'px-4 py-4 sm:px-5 sm:py-5'
          : 'rounded-xl border border-zinc-800/70 bg-zinc-950/45 backdrop-blur-md p-4 sm:p-5'
      )}
    >
      {renderButtonProps && (
        <div className="pb-4 border-b border-zinc-800/80 space-y-3">
          <RenderFinalCutButton
            clips={clips}
            projectId={renderButtonProps.projectId}
            filenameLabel={renderButtonProps.filenameLabel}
            onRendered={renderButtonProps.onRendered}
            onOpenPremiere={renderButtonProps.onOpenPremiere}
            disabled={disabled}
            className="w-full"
          />
          {renderButtonProps.lastRenderUrl ? (
            <a
              href={renderButtonProps.lastRenderUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300 hover:text-emerald-200"
            >
              Open last master export
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : null}
        </div>
      )}

      {!suppressOuterTitle ? (
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-white tracking-tight">Assembly</h2>
        </div>
      ) : null}

      <div className="space-y-2">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
          Preset
        </span>
        <div className="grid grid-cols-2 gap-2">
          {FINAL_CUT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => onApplyPreset(preset.id)}
              className={cn(
                'rounded-lg border px-3 py-2 text-left transition-colors',
                activePreset === preset.id
                  ? 'border-violet-500/50 bg-violet-500/15 text-white'
                  : 'border-zinc-700/80 bg-zinc-900/50 text-zinc-300 hover:border-zinc-600'
              )}
            >
              <span className="text-xs font-medium block">{preset.label}</span>
              <span className="text-[10px] text-zinc-500 line-clamp-2">{preset.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-zinc-500">
          {readyCount} of {totalCount} scenes ready
        </span>
        {isMixedFormat ? (
          <span className="text-violet-300 bg-violet-500/10 border border-violet-500/30 rounded px-2 py-0.5">
            Mixed Animatic + Video
          </span>
        ) : null}
      </div>

      {totalCount === 0 ? (
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-950/40 p-6 text-center text-sm text-zinc-400">
          No scenes found. Add scenes in Production before assembling.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-800/80 rounded-lg border border-zinc-800/80 bg-zinc-950/40 overflow-hidden max-h-[min(50vh,420px)] overflow-y-auto">
          {clips.map((clip) => {
            const override = selection.perSceneOverrides?.[clip.sceneId]
            const streamType =
              override?.streamType ?? clip.streamType ?? (selection.format === 'animatic' ? 'animatic' : 'video')
            const language = (override?.language ?? clip.language ?? selection.language) as ProductionLanguage
            const versionOverride = override?.streamVersion
            const versionList = clip.availableVersions
            const langOptions =
              clip.availableLanguages && clip.availableLanguages.length > 0
                ? clip.availableLanguages
                : globalLanguages
            const typeOptions =
              clip.availableStreamTypes && clip.availableStreamTypes.length > 0
                ? clip.availableStreamTypes
                : (['animatic', 'video'] as const)
            const fullHeading = (clip.heading || `Scene ${clip.sceneNumber}`).trim()
            const sceneProductionHref =
              productionHref && clip.status !== 'ready'
                ? `${productionHref}${productionHref.includes('?') ? '&' : '?'}scene=${clip.sceneId}&tab=action`
                : productionHref

            return (
              <li
                key={clip.sceneId}
                data-assembly-scene={clip.sceneId}
                className="px-3 py-3 sm:px-4 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium text-zinc-300 bg-zinc-900/80 border border-zinc-700/70 rounded px-1.5 py-0.5 tabular-nums shrink-0">
                    {clip.sceneNumber}
                  </span>
                  <p className="text-sm text-zinc-200 truncate min-w-0 flex-1">{fullHeading}</p>
                  {statusBadge(clip.status)}
                </div>

                {(isCustom || override) && (
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={streamType}
                      disabled={disabled || clip.status === 'ready' && typeOptions.length === 0}
                      onChange={(e) =>
                        onChangeSceneOverride(clip.sceneId, {
                          streamType: e.target.value as 'animatic' | 'video',
                        })
                      }
                      className="bg-zinc-900/80 text-zinc-200 text-[11px] rounded-md px-2 py-1.5 border border-zinc-700/80"
                      aria-label={`Format for scene ${clip.sceneNumber}`}
                    >
                      {typeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t === 'animatic' ? 'Animatic' : 'Video'}
                        </option>
                      ))}
                    </select>
                    <select
                      value={language}
                      disabled={disabled}
                      onChange={(e) =>
                        onChangeSceneOverride(clip.sceneId, {
                          language: e.target.value as ProductionLanguage,
                        })
                      }
                      className="bg-zinc-900/80 text-zinc-200 text-[11px] rounded-md px-2 py-1.5 border border-zinc-700/80"
                      aria-label={`Language for scene ${clip.sceneNumber}`}
                    >
                      {langOptions.map((code) => (
                        <option key={code} value={code}>
                          {(FLAG_EMOJIS[code] ?? '🌐') + ' ' + getLanguageName(code)}
                        </option>
                      ))}
                    </select>
                    <select
                      value={versionOverride != null ? String(versionOverride) : ''}
                      disabled={disabled || versionList.length === 0}
                      onChange={(e) => {
                        const raw = e.target.value
                        onChangeSceneOverride(clip.sceneId, {
                          streamVersion: raw === '' ? null : Number(raw),
                        })
                      }}
                      className="bg-zinc-900/80 text-zinc-200 text-[11px] rounded-md px-2 py-1.5 border border-zinc-700/80"
                      aria-label={`Version for scene ${clip.sceneNumber}`}
                    >
                      <option value="">Latest</option>
                      {versionList.map((v) => (
                        <option key={v} value={v}>
                          v{v}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {!isCustom && !override && clip.status === 'ready' && (
                  <p className="text-[10px] text-zinc-500">
                    {streamType === 'animatic' ? 'Animatic' : 'Video'} · {getLanguageName(language)}
                    {clip.streamVersion ? ` · v${clip.streamVersion}` : ''}
                  </p>
                )}

                {clip.status !== 'ready' && sceneProductionHref ? (
                  <Link
                    href={sceneProductionHref}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                  >
                    Render in Production
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {productionHref && (
        <Link
          href={productionHref}
          className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-200"
        >
          Open Production Mixer
          <ExternalLink className="w-3 h-3" />
        </Link>
      )}
    </div>
  )
}
