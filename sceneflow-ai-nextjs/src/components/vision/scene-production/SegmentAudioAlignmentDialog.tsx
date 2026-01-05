'use client'

/**
 * Segment Audio Alignment Dialog
 * 
 * A focused dialog for aligning video segments with audio tracks.
 * Provides controls for:
 * - Dialogue line assignment (which lines this segment covers)
 * - Duration adjustment with audio preview
 * - Link to specific audio clip (for sync reference)
 * - Character/object focus hints
 * 
 * This complements the SegmentPromptBuilder which handles visual/prompt settings.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import {
  Mic,
  MessageSquare,
  Clock,
  Link2,
  Users,
  Check,
  X,
  AlertCircle,
  Play,
  Pause,
  Volume2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SceneSegment, AudioTrackClipV2 } from './types'

// ============================================================================
// Types
// ============================================================================

interface DialogueLine {
  id: string
  character: string
  line: string
  audioUrl?: string
  duration?: number
  startTime?: number // Timeline position if assigned
}

interface SegmentAudioAlignmentDialogProps {
  open: boolean
  onClose: () => void
  segment: SceneSegment
  segmentIndex: number
  
  // Scene dialogue data
  dialogueLines: DialogueLine[]
  
  // Current audio clips for reference
  narrationClip?: AudioTrackClipV2 | null
  dialogueClips: AudioTrackClipV2[]
  
  // Callbacks
  onSave: (updates: SegmentAlignmentUpdates) => void
  onFitToDialogue: () => void
}

export interface SegmentAlignmentUpdates {
  segmentId: string
  startTime?: number
  endTime?: number
  dialogueLineIds?: string[]
  linkedAudioClipId?: string
  characterFocus?: string[]
}

// ============================================================================
// Component
// ============================================================================

export function SegmentAudioAlignmentDialog({
  open,
  onClose,
  segment,
  segmentIndex,
  dialogueLines,
  narrationClip,
  dialogueClips,
  onSave,
  onFitToDialogue,
}: SegmentAudioAlignmentDialogProps) {
  // Local state for edits
  const [startTime, setStartTime] = useState(segment.startTime)
  const [endTime, setEndTime] = useState(segment.endTime)
  const [selectedDialogueIds, setSelectedDialogueIds] = useState<Set<string>>(
    new Set(segment.dialogueLineIds || [])
  )
  const [linkedAudioClipId, setLinkedAudioClipId] = useState<string | undefined>()
  
  // Audio preview state
  const [isPlayingPreview, setIsPlayingPreview] = useState(false)
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null)
  
  // Sync local state when segment changes
  useEffect(() => {
    setStartTime(segment.startTime)
    setEndTime(segment.endTime)
    setSelectedDialogueIds(new Set(segment.dialogueLineIds || []))
  }, [segment])
  
  // Calculate duration
  const duration = useMemo(() => endTime - startTime, [startTime, endTime])
  
  // Calculate total dialogue duration for selected lines
  const selectedDialogueDuration = useMemo(() => {
    return dialogueLines
      .filter(line => selectedDialogueIds.has(line.id))
      .reduce((total, line) => total + (line.duration || 2), 0)
  }, [dialogueLines, selectedDialogueIds])
  
  // Alignment status - compare segment duration to dialogue duration
  const alignmentStatus = useMemo(() => {
    if (selectedDialogueIds.size === 0) return 'no-dialogue'
    const diff = Math.abs(duration - selectedDialogueDuration)
    if (diff < 0.3) return 'aligned'
    if (diff < 1) return 'close'
    return 'misaligned'
  }, [duration, selectedDialogueDuration, selectedDialogueIds.size])
  
  // Toggle dialogue line selection
  const toggleDialogueLine = useCallback((lineId: string) => {
    setSelectedDialogueIds(prev => {
      const next = new Set(prev)
      if (next.has(lineId)) {
        next.delete(lineId)
      } else {
        next.add(lineId)
      }
      return next
    })
  }, [])
  
  // Play audio preview
  const playPreview = useCallback((url: string) => {
    if (isPlayingPreview && previewAudioUrl === url) {
      setIsPlayingPreview(false)
      setPreviewAudioUrl(null)
    } else {
      setPreviewAudioUrl(url)
      setIsPlayingPreview(true)
    }
  }, [isPlayingPreview, previewAudioUrl])
  
  // Handle save
  const handleSave = useCallback(() => {
    onSave({
      segmentId: segment.segmentId,
      startTime,
      endTime,
      dialogueLineIds: Array.from(selectedDialogueIds),
      linkedAudioClipId,
    })
    onClose()
  }, [segment.segmentId, startTime, endTime, selectedDialogueIds, linkedAudioClipId, onSave, onClose])
  
  // Get alignment status color
  const getAlignmentColor = () => {
    switch (alignmentStatus) {
      case 'aligned': return 'text-green-500'
      case 'close': return 'text-yellow-500'
      case 'misaligned': return 'text-red-500'
      default: return 'text-gray-400'
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-cyan-500" />
            Segment {segmentIndex + 1} Audio Alignment
          </DialogTitle>
          <DialogDescription>
            Align this segment with dialogue and audio tracks for precise timing.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Timing Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-500" />
                  Segment Timing
                </h4>
                <Badge variant="outline" className={getAlignmentColor()}>
                  {alignmentStatus === 'aligned' && 'Aligned'}
                  {alignmentStatus === 'close' && 'Nearly Aligned'}
                  {alignmentStatus === 'misaligned' && 'Misaligned'}
                  {alignmentStatus === 'no-dialogue' && 'No Dialogue'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Start Time</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step={0.1}
                      min={0}
                      value={startTime.toFixed(1)}
                      onChange={(e) => setStartTime(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="h-8 text-sm"
                    />
                    <span className="text-xs text-gray-400">s</span>
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-gray-500">End Time</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step={0.1}
                      min={startTime + 0.5}
                      value={endTime.toFixed(1)}
                      onChange={(e) => setEndTime(Math.max(startTime + 0.5, parseFloat(e.target.value) || 0))}
                      className="h-8 text-sm"
                    />
                    <span className="text-xs text-gray-400">s</span>
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-gray-500">Duration</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      readOnly
                      value={duration.toFixed(1)}
                      className="h-8 text-sm bg-gray-100 dark:bg-gray-800"
                    />
                    <span className="text-xs text-gray-400">s</span>
                  </div>
                </div>
              </div>
              
              {/* Fit to Dialogue button */}
              {selectedDialogueIds.size > 0 && alignmentStatus !== 'aligned' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-900/20"
                  onClick={() => {
                    // Auto-fit to selected dialogue duration
                    setEndTime(startTime + selectedDialogueDuration)
                  }}
                >
                  <Mic className="w-3.5 h-3.5 mr-2" />
                  Fit to Dialogue Duration ({selectedDialogueDuration.toFixed(1)}s)
                </Button>
              )}
            </div>
            
            {/* Dialogue Assignment Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-500" />
                Dialogue Coverage
              </h4>
              <p className="text-xs text-gray-500">
                Select which dialogue lines this segment should cover. This helps with timing and character focus.
              </p>
              
              {dialogueLines.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No dialogue lines in this scene</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dialogueLines.map((line, index) => (
                    <div
                      key={line.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                        selectedDialogueIds.has(line.id)
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      )}
                      onClick={() => toggleDialogueLine(line.id)}
                    >
                      <Checkbox
                        checked={selectedDialogueIds.has(line.id)}
                        onCheckedChange={() => toggleDialogueLine(line.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                            {line.character}
                          </span>
                          {line.duration && (
                            <Badge variant="outline" className="text-[10px] h-4">
                              {line.duration.toFixed(1)}s
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">
                          "{line.line}"
                        </p>
                      </div>
                      {line.audioUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            playPreview(line.audioUrl!)
                          }}
                        >
                          {isPlayingPreview && previewAudioUrl === line.audioUrl ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Narration Link Section */}
            {narrationClip && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-green-500" />
                  Narration Audio
                </h4>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Scene narration: {narrationClip.duration?.toFixed(1) || '?'}s
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Starts at {narrationClip.startTime.toFixed(1)}s
                    </p>
                  </div>
                  {narrationClip.url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => playPreview(narrationClip.url!)}
                    >
                      {isPlayingPreview && previewAudioUrl === narrationClip.url ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            {/* Alignment Tips */}
            <div className="p-3 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-cyan-600 dark:text-cyan-400 mt-0.5 shrink-0" />
                <div className="text-xs text-cyan-700 dark:text-cyan-300">
                  <p className="font-medium">Alignment Tips:</p>
                  <ul className="mt-1 space-y-0.5 list-disc list-inside text-cyan-600 dark:text-cyan-400">
                    <li>Assign dialogue lines that should be visible during this segment</li>
                    <li>Use "Fit to Dialogue" to match segment duration to audio</li>
                    <li>Enable "Snap" in timeline to align segment edges to audio boundaries</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
        
        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700 text-white">
            <Check className="w-4 h-4 mr-2" />
            Save Alignment
          </Button>
        </DialogFooter>
        
        {/* Hidden audio element for preview */}
        {previewAudioUrl && (
          <audio
            key={previewAudioUrl}
            autoPlay={isPlayingPreview}
            onEnded={() => {
              setIsPlayingPreview(false)
              setPreviewAudioUrl(null)
            }}
            src={previewAudioUrl}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default SegmentAudioAlignmentDialog
