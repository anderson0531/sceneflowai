'use client'

import React from 'react'
import Link from 'next/link'
import { SlidersHorizontal, Layers, ChevronDown, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import type { FinalCutStream } from '@/lib/types/finalCut'

export interface FinalCutInspectorPanelProps {
  selectedStream: FinalCutStream | null
  selectedSceneId: string | null
  masterVolume: number
  isProcessing?: boolean
  productionVisionHref?: string
  onStreamSettingsChange?: (updates: { masterVolume?: number }) => void
  formatTime: (seconds: number) => string
  inspectorAdvancedOpen: boolean
  onInspectorAdvancedOpenChange: (open: boolean) => void
  onOpenTransitionPanel: () => void
  onOpenOverlayEditor: () => void
}

export function FinalCutInspectorPanel({
  selectedStream,
  selectedSceneId,
  masterVolume,
  isProcessing = false,
  productionVisionHref,
  onStreamSettingsChange,
  formatTime,
  inspectorAdvancedOpen,
  onInspectorAdvancedOpenChange,
  onOpenTransitionPanel,
  onOpenOverlayEditor,
}: FinalCutInspectorPanelProps) {
  return (
    <div
      className={cn(
        'shrink-0 w-full sm:max-w-none lg:w-64 xl:w-72 border-white/[0.06] bg-zinc-900/30 overflow-y-auto',
        'border-t lg:border-t-0 lg:border-l max-h-[40vh] lg:max-h-none'
      )}
    >
      <div className="p-3 sm:p-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Inspector</h3>

        {!selectedStream ? (
          <p className="text-sm text-zinc-500">Select a stream in the library to use the mixer.</p>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2 pb-4 border-b border-zinc-800">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                Assembly output level
              </label>
              <Slider
                value={[masterVolume]}
                min={0}
                max={100}
                step={1}
                disabled={!onStreamSettingsChange || isProcessing}
                onValueChange={(v) => {
                  const n = v[0] ?? 100
                  onStreamSettingsChange?.({ masterVolume: n })
                }}
                className="py-1"
              />
              <p className="text-[11px] text-zinc-600 leading-snug">
                Affects preview playback and export mix for this assembly stream. Save the project to persist.
              </p>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              Transitions, overlays, and segment edits —{' '}
              {productionVisionHref ? (
                <Link
                  href={productionVisionHref}
                  className="text-violet-400 hover:text-violet-300 inline-flex items-center gap-1 font-medium"
                >
                  Open in Production
                  <ExternalLink className="w-3 h-3 opacity-80" aria-hidden />
                </Link>
              ) : (
                <span className="text-zinc-600">use Production (Vision) for this project.</span>
              )}
            </p>

            {selectedSceneId ? (
              (() => {
                const scene = selectedStream.scenes.find((s) => s.id === selectedSceneId)
                if (!scene) return null
                return (
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-white">Selected scene</p>
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Scene</label>
                      <p className="text-sm text-zinc-100 mt-0.5">Scene {scene.sceneNumber}</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Duration</label>
                      <p className="text-sm text-zinc-100 mt-0.5 tabular-nums">
                        {formatTime(scene.durationMs / 1000)}
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Heading</label>
                      <p className="text-sm text-zinc-200 mt-0.5 leading-snug">{scene.heading || 'No heading'}</p>
                    </div>

                    <div className="pt-2 border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={() => onInspectorAdvancedOpenChange(!inspectorAdvancedOpen)}
                        className="flex items-center justify-between w-full text-left text-xs font-medium text-zinc-400 hover:text-zinc-200 py-1"
                        aria-expanded={inspectorAdvancedOpen}
                      >
                        Advanced…
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 transition-transform',
                            inspectorAdvancedOpen && 'rotate-180'
                          )}
                          aria-hidden
                        />
                      </button>
                      {inspectorAdvancedOpen ? (
                        <div className="space-y-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onOpenTransitionPanel}
                            className="w-full border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-100"
                          >
                            <SlidersHorizontal className="w-4 h-4 mr-2" />
                            Edit transition
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onOpenOverlayEditor}
                            className="w-full border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-100"
                          >
                            <Layers className="w-4 h-4 mr-2" />
                            Add overlay
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })()
            ) : (
              <p className="text-sm text-zinc-500">Select a scene on the timeline for details.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
