'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import {
  VisionReferencesSidebar,
  type VisionReferencesSidebarProps,
} from './VisionReferencesSidebar'

export type ReferenceLibraryTab = 'cast' | 'locations' | 'object'

export interface ReferenceLibraryDeepLink {
  tab: ReferenceLibraryTab
  characterId?: string
  wardrobeId?: string
  locationId?: string
  versionId?: string
  objectId?: string
  nonce?: number
}

export interface ReferenceLibraryDialogProps extends VisionReferencesSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTab?: ReferenceLibraryTab
  deepLink?: ReferenceLibraryDeepLink | null
  topContent?: React.ReactNode
}

export function ReferenceLibraryDialog({
  open,
  onOpenChange,
  initialTab,
  deepLink,
  topContent,
  ...sidebarProps
}: ReferenceLibraryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden px-6 pt-5 pb-6 flex flex-col gap-3">
          {topContent}
          <VisionReferencesSidebar
            {...sidebarProps}
            layout="dialog"
            initialTab={initialTab}
            deepLink={deepLink}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
