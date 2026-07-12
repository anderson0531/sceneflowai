'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { X, Play, Layers, Upload, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { readFinalCutSelection } from '@/hooks/final-cut/useFinalCutSelection'
import { ScreeningRoomV2 } from '@/components/vision/ScreeningRoomV2'
import { ScreeningRoomAssemblePanel } from './ScreeningRoomAssemblePanel'
import { ScreeningRoomPublishPanel } from './ScreeningRoomPublishPanel'
import { UnifiedPlayerFeedbackPanel } from './UnifiedPlayerFeedbackPanel'

export type ScreeningRoomTab = 'preview' | 'assemble' | 'publish' | 'feedback'

export interface ProductionScreeningRoomShellProps {
  script: any
  characters: Array<{ name: string; description?: string }>
  onClose: () => void
  projectId?: string
  scriptEditedAt?: number
  sceneProductionState?: Record<string, any>
  storedTranslations?: Record<string, Record<number, { narration?: string; dialogue?: string[] }>>
  initialTab?: ScreeningRoomTab
  isDemo?: boolean
  backButtonLabel?: string
  /** Standalone page mode shows tab bar; overlay mode can start fullscreen on preview */
  variant?: 'page' | 'overlay'
}

const TABS: Array<{ id: ScreeningRoomTab; label: string; icon: React.ReactNode }> = [
  { id: 'preview', label: 'Preview', icon: <Play className="w-4 h-4" /> },
  { id: 'assemble', label: 'Assemble', icon: <Layers className="w-4 h-4" /> },
  { id: 'publish', label: 'Publish', icon: <Upload className="w-4 h-4" /> },
  { id: 'feedback', label: 'Feedback', icon: <MessageSquare className="w-4 h-4" /> },
]

export function ProductionScreeningRoomShell({
  script,
  characters,
  onClose,
  projectId,
  scriptEditedAt,
  sceneProductionState,
  storedTranslations,
  initialTab = 'preview',
  isDemo = false,
  backButtonLabel,
  variant = 'overlay',
}: ProductionScreeningRoomShellProps) {
  const [activeTab, setActiveTab] = useState<ScreeningRoomTab>(initialTab)
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false)
  const currentProject = useStore((s) => s.currentProject)
  const finalCutSelection = useMemo(
    () => readFinalCutSelection(currentProject?.metadata),
    [currentProject?.metadata]
  )

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    const handlers: Record<string, () => void> = {
      'screening-room:preview': () => setActiveTab('preview'),
      'screening-room:assemble': () => setActiveTab('assemble'),
      'screening-room:create-screening': () => setActiveTab('publish'),
      'screening-room:publish': () => setActiveTab('publish'),
    }

    const onEvent = (event: Event) => {
      const name = (event as CustomEvent).type
      handlers[name]?.()
    }

    Object.keys(handlers).forEach((name) => {
      window.addEventListener(name, onEvent)
    })
    return () => {
      Object.keys(handlers).forEach((name) => {
        window.removeEventListener(name, onEvent)
      })
    }
  }, [])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  if (activeTab === 'preview' && variant === 'overlay') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black">
        <div className="absolute top-3 right-3 z-[60] flex items-center gap-2">
          {TABS.filter((t) => t.id !== 'preview').map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/10"
            >
              {tab.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowFeedbackPanel((v) => !v)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-lg border text-white',
              showFeedbackPanel ? 'bg-emerald-600/30 border-emerald-500/40' : 'bg-white/10 border-white/10 hover:bg-white/20'
            )}
          >
            Feedback
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
            aria-label="Close Screening Room"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 min-w-0">
            <ScreeningRoomV2
              script={script}
              characters={characters}
              onClose={handleClose}
              backButtonLabel={backButtonLabel}
              scriptEditedAt={scriptEditedAt}
              sceneProductionState={sceneProductionState}
              projectId={projectId}
              storedTranslations={storedTranslations}
              finalCutSelection={finalCutSelection}
            />
          </div>
          {showFeedbackPanel && (
            <UnifiedPlayerFeedbackPanel
              mode="triage"
              sceneIndex={0}
              className="w-80 shrink-0"
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-950/95">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base font-semibold truncate">Screening Room</h1>
          <span className="text-xs text-zinc-500 hidden sm:inline">Preview · Assemble · Publish</span>
        </div>
        <div className="flex items-center gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                activeTab === tab.id
                  ? 'bg-violet-600/20 border-violet-500/50 text-violet-100'
                  : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300"
            aria-label="Close Screening Room"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'preview' && (
          <ScreeningRoomV2
            script={script}
            characters={characters}
            onClose={handleClose}
            backButtonLabel={backButtonLabel}
            scriptEditedAt={scriptEditedAt}
            sceneProductionState={sceneProductionState}
            projectId={projectId}
            storedTranslations={storedTranslations}
            finalCutSelection={finalCutSelection}
          />
        )}

        {activeTab === 'assemble' && (
          <ScreeningRoomAssemblePanel
            projectId={projectId}
            isDemo={isDemo}
            onMasterRendered={() => setActiveTab('publish')}
          />
        )}

        {activeTab === 'publish' && (
          <ScreeningRoomPublishPanel projectId={projectId} isDemo={isDemo} />
        )}

        {activeTab === 'feedback' && (
          <div className="h-full max-w-3xl mx-auto p-6">
            <UnifiedPlayerFeedbackPanel mode="triage" sceneIndex={0} className="h-full rounded-xl border border-zinc-800" />
          </div>
        )}
      </main>
    </div>
  )
}

export default ProductionScreeningRoomShell
