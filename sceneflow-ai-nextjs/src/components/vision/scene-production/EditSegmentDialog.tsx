'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  Pencil,
  Camera,
  Clock,
  Sparkles,
  Film,
  Save,
} from 'lucide-react'
import { SceneSegment, VideoGenerationMethod } from './types'

// ============================================================================
// Types
// ============================================================================

export interface EditSegmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  segment: SceneSegment | null
  sceneId: string
  sceneNumber: number
  sceneFrameUrl: string | null
  // Use existing handlers
  onPromptChange?: (sceneId: string, segmentId: string, prompt: string) => void
  onSegmentResize?: (sceneId: string, segmentId: string, changes: { startTime?: number; duration?: number }) => void
}

// ============================================================================
// Shot Types & Lens Presets (mirrored from AddSegmentDialog)
// ============================================================================

const SHOT_TYPES = [
  { value: 'extreme-wide', label: 'Extreme Wide', description: 'Full environment, tiny subjects' },
  { value: 'wide', label: 'Wide Shot', description: 'Full body, environmental context' },
  { value: 'medium-wide', label: 'Medium Wide', description: 'Knee to head, some environment' },
  { value: 'medium', label: 'Medium Shot', description: 'Waist up, conversational' },
  { value: 'medium-close', label: 'Medium Close-up', description: 'Chest up, emotional focus' },
  { value: 'close-up', label: 'Close-up', description: 'Face only, intense emotion' },
  { value: 'extreme-close', label: 'Extreme Close-up', description: 'Eyes, mouth, or detail' },
  { value: 'two-shot', label: 'Two Shot', description: 'Two characters framed together' },
  { value: 'over-shoulder', label: 'Over the Shoulder', description: 'Perspective from behind one character' },
  { value: 'pov', label: 'POV', description: 'Point of view shot' },
] as const

const CAMERA_MOVEMENTS = [
  { value: 'static', label: 'Static', description: 'Locked-off, no movement' },
  { value: 'push-in', label: 'Push In', description: 'Slow dolly toward subject' },
  { value: 'pull-out', label: 'Pull Out', description: 'Slow dolly away from subject' },
  { value: 'pan-left', label: 'Pan Left', description: 'Camera pivots left' },
  { value: 'pan-right', label: 'Pan Right', description: 'Camera pivots right' },
  { value: 'tilt-up', label: 'Tilt Up', description: 'Camera angles upward' },
  { value: 'tilt-down', label: 'Tilt Down', description: 'Camera angles downward' },
  { value: 'tracking', label: 'Tracking', description: 'Following subject movement' },
  { value: 'handheld', label: 'Handheld', description: 'Slight shake, documentary feel' },
  { value: 'crane', label: 'Crane/Jib', description: 'Vertical movement, sweeping' },
] as const

// Helper to get value from label
function getShotTypeValue(label: string | undefined): string {
  if (!label) return 'medium'
  const found = SHOT_TYPES.find(s => s.label === label)
  return found?.value || 'medium'
}

function getCameraMovementValue(label: string | undefined): string {
  if (!label) return 'static'
  const found = CAMERA_MOVEMENTS.find(m => m.label === label)
  return found?.value || 'static'
}

// ============================================================================
// Main Component
// ============================================================================

export function EditSegmentDialog({
  open,
  onOpenChange,
  segment,
  sceneId,
  sceneNumber,
  sceneFrameUrl,
  onPromptChange,
  onSegmentResize,
}: EditSegmentDialogProps) {
  // -------------------------------------------------------------------------
  // State - initialized from segment when dialog opens
  // -------------------------------------------------------------------------
  
  const [shotType, setShotType] = useState('medium')
  const [cameraMovement, setCameraMovement] = useState('static')
  const [editedPrompt, setEditedPrompt] = useState('')
  const [duration, setDuration] = useState(6)
  const [generationMethod, setGenerationMethod] = useState<VideoGenerationMethod>('T2V')

  // -------------------------------------------------------------------------
  // Effects - sync state when segment changes or dialog opens
  // -------------------------------------------------------------------------
  
  useEffect(() => {
    if (segment && open) {
      setShotType(getShotTypeValue(segment.shotType))
      setCameraMovement(getCameraMovementValue(segment.cameraMovement))
      setEditedPrompt(segment.userEditedPrompt || segment.generatedPrompt || '')
      setDuration(segment.endTime - segment.startTime)
      setGenerationMethod(segment.generationMethod || 'T2V')
    }
  }, [segment, open])

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  
  const handleSave = useCallback(() => {
    if (!segment) return
    
    // Update prompt if changed
    const originalPrompt = segment.userEditedPrompt || segment.generatedPrompt || ''
    if (editedPrompt !== originalPrompt && onPromptChange) {
      onPromptChange(sceneId, segment.segmentId, editedPrompt)
    }
    
    // Update duration if changed
    const originalDuration = segment.endTime - segment.startTime
    if (duration !== originalDuration && onSegmentResize) {
      onSegmentResize(sceneId, segment.segmentId, { duration })
    }
    
    console.log('[EditSegmentDialog] Saved changes')
    onOpenChange(false)
  }, [segment, sceneId, editedPrompt, duration, onPromptChange, onSegmentResize, onOpenChange])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!segment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-amber-400" />
            Edit Segment
            <Badge variant="outline" className="ml-2 text-xs">
              Scene {sceneNumber} • Segment {segment.sequenceIndex + 1}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Modify the segment's prompt, duration, and generation settings.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Shot Configuration */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" />
                Shot Configuration
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Shot Type</Label>
                  <Select value={shotType} onValueChange={setShotType}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHOT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <span className="font-medium">{type.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {type.description}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Camera Movement</Label>
                  <Select value={cameraMovement} onValueChange={setCameraMovement}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMERA_MOVEMENTS.map(mov => (
                        <SelectItem key={mov.value} value={mov.value}>
                          <span className="font-medium">{mov.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {mov.description}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Prompt Editor */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Generation Prompt
              </h3>
              <Textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                placeholder="Enter the video generation prompt..."
                className="min-h-[150px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Edit the prompt that will be sent to Veo 3.1 for video generation.
              </p>
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Duration
              </h3>
              <div className="flex items-center gap-4">
                <Slider
                  value={[duration]}
                  onValueChange={([val]) => setDuration(val)}
                  min={4}
                  max={8}
                  step={1}
                  className="flex-1"
                />
                <Badge variant="secondary" className="min-w-[60px] justify-center">
                  {duration}s
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Veo 3.1 supports 4-8 second clips
              </p>
            </div>

            {/* Generation Method */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Film className="w-4 h-4 text-purple-400" />
                Generation Method
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setGenerationMethod('T2V')}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                    generationMethod === 'T2V'
                      ? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
                      : "border-border hover:border-muted-foreground/50 text-muted-foreground"
                  )}
                >
                  Text-to-Video
                </button>
                <button
                  onClick={() => setGenerationMethod('I2V')}
                  disabled={!sceneFrameUrl}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                    generationMethod === 'I2V'
                      ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                      : "border-border hover:border-muted-foreground/50 text-muted-foreground",
                    !sceneFrameUrl && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Image-to-Video
                </button>
              </div>
              {generationMethod === 'I2V' && sceneFrameUrl && (
                <p className="text-xs text-muted-foreground">
                  Will use scene frame as the starting image
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
