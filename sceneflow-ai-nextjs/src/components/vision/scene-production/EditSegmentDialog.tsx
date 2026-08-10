'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
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
import { MAX_VEO_VIDEO_CLIP_SECONDS } from '@/lib/config/modelConfig'

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

const SHOT_TYPE_VALUES = [
  'extreme-wide',
  'wide',
  'medium-wide',
  'medium',
  'medium-close',
  'close-up',
  'extreme-close',
  'two-shot',
  'over-shoulder',
  'pov',
] as const

const CAMERA_MOVEMENT_VALUES = [
  'static',
  'push-in',
  'pull-out',
  'pan-left',
  'pan-right',
  'tilt-up',
  'tilt-down',
  'tracking',
  'handheld',
  'crane',
] as const

const SHOT_TYPE_LABELS: Record<(typeof SHOT_TYPE_VALUES)[number], string> = {
  'extreme-wide': 'Extreme Wide',
  wide: 'Wide Shot',
  'medium-wide': 'Medium Wide',
  medium: 'Medium Shot',
  'medium-close': 'Medium Close-up',
  'close-up': 'Close-up',
  'extreme-close': 'Extreme Close-up',
  'two-shot': 'Two Shot',
  'over-shoulder': 'Over the Shoulder',
  pov: 'POV',
}

const CAMERA_MOVEMENT_LABELS: Record<(typeof CAMERA_MOVEMENT_VALUES)[number], string> = {
  static: 'Static',
  'push-in': 'Push In',
  'pull-out': 'Pull Out',
  'pan-left': 'Pan Left',
  'pan-right': 'Pan Right',
  'tilt-up': 'Tilt Up',
  'tilt-down': 'Tilt Down',
  tracking: 'Tracking',
  handheld: 'Handheld',
  crane: 'Crane/Jib',
}

// Helper to get value from label
function getShotTypeValue(label: string | undefined): string {
  if (!label) return 'medium'
  const found = (Object.entries(SHOT_TYPE_LABELS) as Array<[string, string]>).find(
    ([, l]) => l === label
  )
  return found?.[0] || 'medium'
}

function getCameraMovementValue(label: string | undefined): string {
  if (!label) return 'static'
  const found = (Object.entries(CAMERA_MOVEMENT_LABELS) as Array<[string, string]>).find(
    ([, l]) => l === label
  )
  return found?.[0] || 'static'
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
  const t = useTranslations('production.segments')
  const tc = useTranslations('common')

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
            {t('edit.title')}
            <Badge variant="outline" className="ml-2 text-xs">
              {t('edit.badge', {
                sceneNumber,
                beatNumber: segment.sequenceIndex + 1,
              })}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {t('edit.description')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Shot Configuration */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" />
                {t('common.shotConfiguration')}
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t('common.shotType')}</Label>
                  <Select value={shotType} onValueChange={setShotType}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHOT_TYPE_VALUES.map(value => (
                        <SelectItem key={value} value={value}>
                          <span className="font-medium">{t(`shotTypes.${value}.label`)}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {t(`shotTypes.${value}.description`)}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t('common.cameraMovement')}</Label>
                  <Select value={cameraMovement} onValueChange={setCameraMovement}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMERA_MOVEMENT_VALUES.map(value => (
                        <SelectItem key={value} value={value}>
                          <span className="font-medium">{t(`cameraMovements.${value}.label`)}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {t(`cameraMovements.${value}.description`)}
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
                {t('edit.generationPrompt')}
              </h3>
              <Textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                placeholder={t('edit.promptPlaceholder')}
                className="min-h-[150px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {t('edit.promptHint')}
              </p>
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                {t('common.duration')}
              </h3>
              <div className="flex items-center gap-4">
                <Slider
                  value={[duration]}
                  onValueChange={([val]) => setDuration(val)}
                  min={4}
                  max={MAX_VEO_VIDEO_CLIP_SECONDS}
                  step={1}
                  className="flex-1"
                />
                <Badge variant="secondary" className="min-w-[60px] justify-center">
                  {duration}s
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('edit.durationHint')}
              </p>
            </div>

            {/* Generation Method */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Film className="w-4 h-4 text-purple-400" />
                {t('edit.generationMethod')}
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
                  {t('edit.t2v')}
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
                  {t('edit.i2v')}
                </button>
              </div>
              {generationMethod === 'I2V' && sceneFrameUrl && (
                <p className="text-xs text-muted-foreground">
                  {t('edit.i2vHint')}
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
            {tc('actions.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {tc('actions.saveChanges')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
