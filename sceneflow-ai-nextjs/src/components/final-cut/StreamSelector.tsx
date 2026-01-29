'use client'

import React, { useState } from 'react'
import {
  Globe,
  Plus,
  Film,
  ImagePlay,
  ChevronDown,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { 
  FinalCutStream,
  ProductionLanguage,
  ProductionFormat
} from '@/lib/types/finalCut'
import { LANGUAGE_CONFIGS, FORMAT_CONFIGS } from '@/lib/types/finalCut'

// ============================================================================
// Types
// ============================================================================

export interface StreamSelectorProps {
  /** Available streams */
  streams: FinalCutStream[]
  /** Currently selected stream ID */
  selectedStreamId: string | null
  /** Callback when stream selection changes */
  onStreamSelect: (streamId: string) => void
  /** Callback to create a new stream */
  onCreateStream: (language: ProductionLanguage, format: ProductionFormat) => Promise<void>
  /** Whether creation is disabled */
  disabled?: boolean
}

// ============================================================================
// Constants
// ============================================================================

const FLAG_EMOJIS: Record<ProductionLanguage, string> = {
  en: '🇺🇸',
  th: '🇹🇭',
  ja: '🇯🇵',
  ko: '🇰🇷',
  zh: '🇨🇳',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  pt: '🇧🇷',
  hi: '🇮🇳',
  ar: '🇸🇦',
  ru: '🇷🇺'
}

// ============================================================================
// StreamSelector Component
// ============================================================================

export function StreamSelector({
  streams,
  selectedStreamId,
  onStreamSelect,
  onCreateStream,
  disabled = false
}: StreamSelectorProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newStreamLanguage, setNewStreamLanguage] = useState<ProductionLanguage>('en')
  const [newStreamFormat, setNewStreamFormat] = useState<ProductionFormat>('full-video')
  const [isCreating, setIsCreating] = useState(false)
  
  const selectedStream = streams.find(s => s.id === selectedStreamId)
  
  const handleCreateStream = async () => {
    setIsCreating(true)
    try {
      await onCreateStream(newStreamLanguage, newStreamFormat)
      setShowCreateDialog(false)
    } catch (error) {
      console.error('Failed to create stream:', error)
    } finally {
      setIsCreating(false)
    }
  }
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className="min-w-[200px] justify-between bg-gray-800 border-gray-700 hover:bg-gray-700"
          >
            <span className="flex items-center gap-2">
              {selectedStream ? (
                <>
                  <span className="text-lg">{FLAG_EMOJIS[selectedStream.language]}</span>
                  <span>{selectedStream.name}</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  <span>Select Stream</span>
                </>
              )}
            </span>
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-64 bg-gray-800 border-gray-700">
          <DropdownMenuLabel className="text-gray-400">
            Production Streams
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-700" />
          
          {streams.length === 0 ? (
            <div className="px-2 py-4 text-center text-gray-500 text-sm">
              No streams yet. Create one to get started.
            </div>
          ) : (
            streams.map((stream) => (
              <DropdownMenuItem
                key={stream.id}
                onClick={() => onStreamSelect(stream.id)}
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  selectedStreamId === stream.id && "bg-gray-700"
                )}
              >
                <span className="text-lg">{FLAG_EMOJIS[stream.language]}</span>
                <div className="flex-1">
                  <div className="text-gray-200">{stream.name}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    {stream.format === 'full-video' ? (
                      <Film className="w-3 h-3" />
                    ) : (
                      <ImagePlay className="w-3 h-3" />
                    )}
                    <span>
                      {stream.format === 'full-video' ? 'Video' : 'Animatic'}
                    </span>
                    <span>• {stream.scenes.length} scenes</span>
                  </div>
                </div>
                {selectedStreamId === stream.id && (
                  <Check className="w-4 h-4 text-green-400" />
                )}
              </DropdownMenuItem>
            ))
          )}
          
          <DropdownMenuSeparator className="bg-gray-700" />
          
          <DropdownMenuItem
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 cursor-pointer text-blue-400"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Stream</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Create Stream Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle>Create Production Stream</DialogTitle>
            <DialogDescription>
              Create a new language and format combination for your project.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Language Selection */}
            <div className="space-y-2">
              <Label>Language</Label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(LANGUAGE_CONFIGS) as ProductionLanguage[]).map((lang) => {
                  const config = LANGUAGE_CONFIGS[lang]
                  return (
                    <button
                      key={lang}
                      onClick={() => setNewStreamLanguage(lang)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors",
                        newStreamLanguage === lang
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-gray-700 hover:border-gray-600 bg-gray-800"
                      )}
                    >
                      <span className="text-2xl">{FLAG_EMOJIS[lang]}</span>
                      <span className="text-xs text-gray-400">{config.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            
            {/* Format Selection */}
            <div className="space-y-2">
              <Label>Format</Label>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(FORMAT_CONFIGS) as ProductionFormat[]).map((format) => {
                  const config = FORMAT_CONFIGS[format]
                  return (
                    <button
                      key={format}
                      onClick={() => setNewStreamFormat(format)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors text-left",
                        newStreamFormat === format
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-gray-700 hover:border-gray-600 bg-gray-800"
                      )}
                    >
                      {format === 'full-video' ? (
                        <Film className="w-6 h-6 text-purple-400" />
                      ) : (
                        <ImagePlay className="w-6 h-6 text-cyan-400" />
                      )}
                      <div>
                        <div className="font-medium text-gray-200">{config.name}</div>
                        <div className="text-xs text-gray-500">{config.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            
            {/* Preview */}
            <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
              <Label className="text-xs text-gray-500">Stream Name</Label>
              <p className="text-gray-200">
                {LANGUAGE_CONFIGS[newStreamLanguage].name} ({FORMAT_CONFIGS[newStreamFormat].name})
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateStream}
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Stream'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
