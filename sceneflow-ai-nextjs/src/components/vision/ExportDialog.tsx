'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { FileText, Image, Film } from 'lucide-react'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExportScript: () => void
  onExportStoryboard: () => void
  onExportSceneDirection: () => void
}

export function ExportDialog({
  open,
  onOpenChange,
  onExportScript,
  onExportStoryboard,
  onExportSceneDirection,
}: ExportDialogProps) {
  const handleExportScript = () => {
    onExportScript()
    onOpenChange(false)
  }

  const handleExportStoryboard = () => {
    onExportStoryboard()
    onOpenChange(false)
  }

  const handleExportSceneDirection = () => {
    onExportSceneDirection()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Document</DialogTitle>
          <DialogDescription>
            Choose which document to export:
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-3 py-4">
          {/* Script Option */}
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4 px-4 hover:bg-gray-800 hover:border-gray-600"
            onClick={handleExportScript}
          >
            <div className="flex items-start gap-3 w-full">
              <FileText className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-left flex-1">
                <div className="font-medium text-white">Script</div>
                <div className="text-sm text-gray-400 mt-0.5">
                  Professional Script format
                </div>
              </div>
            </div>
          </Button>

          {/* Storyboard Option */}
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4 px-4 hover:bg-gray-800 hover:border-gray-600"
            onClick={handleExportStoryboard}
          >
            <div className="flex items-start gap-3 w-full">
              <Image className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div className="text-left flex-1">
                <div className="font-medium text-white">Storyboard</div>
                <div className="text-sm text-gray-400 mt-0.5">
                  Visual storyboard with images
                </div>
              </div>
            </div>
          </Button>

          {/* Scene Direction Option */}
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4 px-4 hover:bg-gray-800 hover:border-gray-600"
            onClick={handleExportSceneDirection}
          >
            <div className="flex items-start gap-3 w-full">
              <Film className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <div className="text-left flex-1">
                <div className="font-medium text-white">Scene Direction</div>
                <div className="text-sm text-gray-400 mt-0.5">
                  Technical scene directions
                </div>
              </div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
