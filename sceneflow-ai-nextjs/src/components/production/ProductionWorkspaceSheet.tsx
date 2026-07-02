'use client'

import React from 'react'
import { X, Film, Upload, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ProductionRenderPanel } from './ProductionRenderPanel'
import { ProductionPublishPanel } from './ProductionPublishPanel'
import { cn } from '@/lib/utils'

export type ProductionWorkspaceTab = 'render' | 'publish' | 'screening'

export interface ProductionWorkspaceSheetProps {
  open: boolean
  tab: ProductionWorkspaceTab
  onTabChange: (tab: ProductionWorkspaceTab) => void
  onClose: () => void
  projectId: string
  userId?: string
  projectTitle?: string
  metadata: unknown
  exportedVideoUrl?: string | null
  onOpenScreeningRoom: () => void
}

export function ProductionWorkspaceSheet({
  open,
  tab,
  onTabChange,
  onClose,
  projectId,
  userId,
  projectTitle,
  metadata,
  exportedVideoUrl,
  onOpenScreeningRoom,
}: ProductionWorkspaceSheetProps) {
  if (!open) return null

  const tabs: { id: ProductionWorkspaceTab; label: string; icon: React.ReactNode }[] = [
    { id: 'render', label: 'Production Render', icon: <Film className="w-4 h-4" /> },
    { id: 'screening', label: 'Screening Room', icon: <Play className="w-4 h-4" /> },
    { id: 'publish', label: 'Publish', icon: <Upload className="w-4 h-4" /> },
  ]

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close workspace"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col max-h-full overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-white">Production Workspace</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-1 px-4 pt-3 border-b border-zinc-800/80 pb-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                if (t.id === 'screening') {
                  onOpenScreeningRoom()
                  onClose()
                  return
                }
                onTabChange(t.id)
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                tab === t.id
                  ? 'bg-sf-primary/20 text-sf-primary'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'render' ? (
            <ProductionRenderPanel
              projectId={projectId}
              projectTitle={projectTitle}
              metadata={metadata}
            />
          ) : null}
          {tab === 'publish' ? (
            <ProductionPublishPanel
              projectId={projectId}
              userId={userId}
              videoUrl={exportedVideoUrl}
              projectTitle={projectTitle}
              metadata={metadata}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
