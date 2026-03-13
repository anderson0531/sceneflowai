'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Check,
  ChevronRight,
  Film,
  Clock,
  MessageSquare,
  BookOpen,
  Layers,
  Settings2,
  Lock,
  ArrowRight,
  RefreshCw,
  Wand2,
  Play,
  Eye,
  Edit3,
  AlertTriangle,
  Users,
  MapPin,
  FileText,
  Volume2,
  CheckCircle2,
  Clapperboard,
  Camera,
  Video,
  Plus,
  GripVertical,
  Mic,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react'
import {
  SceneSegment,
  SceneProductionData,
  SceneProductionReferences,
  ValidationResult,
  SceneBible,
  ProposedDirection,
  ProposedSegment,
  BuilderPhase,
} from './types'
import { SegmentPreviewTimeline } from './SegmentPreviewTimeline'
import { SegmentPromptEditor } from './SegmentPromptEditor'
// SegmentValidation is dynamically imported to avoid circular dependency TDZ
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ============================================================================
// Dynamic Import Helper - Avoids TDZ circular dependency
// ============================================================================

/**
 * Lazily loads SegmentValidation class to avoid circular dependency TDZ error.
 * The validation module imports types from ./types, and we import from ./types too.
 * Static imports would cause bundler to evaluate both before either is ready.
 */
const getSegmentValidation = async () => {
  const { SegmentValidation } = await import('@/lib/intelligence/SegmentValidation')
  return SegmentValidation
}

// ============================================================================
// Segment Direction Card Component
// ============================================================================

interface SegmentDirectionCardProps {
  direction: ProposedDirection
  index: number
  dialogueLines: Array<{ id: string; character: string; text: string }>
  isSelected: boolean
  onSelect: () => void
  onEdit: (updates: Partial<ProposedDirection>) => void
  onApprove: () => void
  onDelete: () => void
  onAiAssist?: (instruction: string) => void
  isAiAssistLoading?: boolean
  narrationText?: string
  onGeneratePrompt: () => void
}

function SegmentDirectionCard({
  direction,
  index,
  dialogueLines,
  isSelected,
  onSelect,
  onEdit,
  onApprove,
  onDelete,
  onAiAssist,
  isAiAssistLoading,
  narrationText,
  onGeneratePrompt,
}: SegmentDirectionCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [aiInstruction, setAiInstruction] = useState('')
  
  // Get dialogue lines for this segment
  const segmentDialogue = dialogueLines.filter(d => 
    direction.dialogueLineIds.includes(d.id)
  )

  // Detect narration lines (voiceover indices)
  const hasNarrationLines = direction.dialogueLineIds.some(id => {
    const idx = parseInt(id.replace('dialogue-', ''))
    // Narration lines are typically lower indices added before dialogue
    return !dialogueLines.find(d => d.id === id)
  })
  
  const methodColors: Record<string, string> = {
    'I2V': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    'T2V': 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    'EXT': 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    'FTV': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  }

  const methodIcons: Record<string, string> = {
    'I2V': '🖼️',
    'T2V': '✏️',
    'EXT': '➡️',
    'FTV': '🎬',
  }
  
  const confidenceColor = direction.confidence >= 80 
    ? 'text-emerald-400' 
    : direction.confidence >= 60 
    ? 'text-amber-400' 
    : 'text-red-400'

  // Card border accent color based on state
  const cardBorderClass = direction.isApproved
    ? 'border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.08)]'
    : direction.isNoTalent
    ? 'border-indigo-500/40'
    : isSelected
    ? 'border-sf-primary/60'
    : 'border-sf-border hover:border-sf-border-strong'
  
  return (
    <Card 
      className={cn(
        "transition-all duration-200 cursor-pointer bg-sf-surface",
        cardBorderClass,
        isSelected && "ring-2 ring-sf-primary/40",
        direction.isApproved && "bg-emerald-950/15",
      )}
      onClick={onSelect}
    >
      <CardContent className="p-0">
        {/* Header Row — Colored top bar */}
        <div className={cn(
          "flex items-start justify-between px-4 py-3 rounded-t-lg border-b",
          direction.isApproved
            ? 'bg-emerald-950/30 border-emerald-500/20'
            : 'bg-sf-surface-light/60 border-sf-border/50'
        )}>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono bg-sf-background/50 border-sf-border-strong text-sf-text-primary">
              {index + 1}
            </Badge>
            <Badge className={cn('border', methodColors[direction.generationMethod] || '')}>
              {methodIcons[direction.generationMethod] || ''} {direction.generationMethod}
            </Badge>
            {direction.isNoTalent && (
              <Badge variant="outline" className="text-indigo-300 border-indigo-500/40 bg-indigo-500/10">
                No Talent
              </Badge>
            )}
            {direction.isUserEdited && (
              <Badge variant="outline" className="text-amber-300 border-amber-500/40 bg-amber-500/10">
                <Edit3 className="w-3 h-3 mr-1" />
                Edited
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-mono", confidenceColor)}>
              {direction.confidence}% conf
            </span>
            <Badge variant="outline" className="font-mono text-xs bg-sf-background/50 border-sf-border">
              ~{direction.estimatedDuration}s
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-sf-text-secondary hover:text-sf-text-primary"
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded) }}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {/* Collapsed summary — show key info inline when card is collapsed */}
        {!isExpanded && !isEditing && (
          <div className="px-4 py-2 space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Camera className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span className="font-medium text-sf-text-primary">{direction.shotType}</span>
              <span className="text-sf-text-disabled">•</span>
              <span className="text-sf-text-secondary">{direction.cameraMovement}</span>
              <span className="text-sf-text-disabled">•</span>
              <span className="text-sf-text-secondary">{direction.cameraAngle}</span>
              {direction.lens && (
                <>
                  <span className="text-sf-text-disabled">•</span>
                  <span className="text-xs font-mono text-blue-400">{direction.lens}</span>
                </>
              )}
            </div>
            {direction.talentAction && (
              <p className="text-xs text-sf-text-disabled truncate pl-5">
                {direction.talentAction.substring(0, 100)}{direction.talentAction.length > 100 ? '...' : ''}
              </p>
            )}
          </div>
        )}

        {/* Card Body — Expanded or Editing */}
        {(isExpanded || isEditing) && (
        <div className="px-4 py-3">
        
        {/* Direction Details */}
        {isEditing ? (
          <div className="space-y-3" onClick={e => e.stopPropagation()}>
            {/* Shot Type / Camera / Angle Row */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Shot Type</label>
                <Select
                  value={direction.shotType}
                  onValueChange={v => onEdit({ shotType: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Wide Shot">Wide Shot</SelectItem>
                    <SelectItem value="Medium Shot">Medium Shot</SelectItem>
                    <SelectItem value="Medium Close-Up">Medium Close-Up</SelectItem>
                    <SelectItem value="Close-Up">Close-Up</SelectItem>
                    <SelectItem value="Extreme Close-Up">Extreme Close-Up</SelectItem>
                    <SelectItem value="Two Shot">Two Shot</SelectItem>
                    <SelectItem value="Over-the-Shoulder">Over-the-Shoulder</SelectItem>
                    <SelectItem value="Insert Shot">Insert Shot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Camera</label>
                <Select
                  value={direction.cameraMovement}
                  onValueChange={v => onEdit({ cameraMovement: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Static">Static</SelectItem>
                    <SelectItem value="Dolly In">Dolly In</SelectItem>
                    <SelectItem value="Dolly Out">Dolly Out</SelectItem>
                    <SelectItem value="Pan Left">Pan Left</SelectItem>
                    <SelectItem value="Pan Right">Pan Right</SelectItem>
                    <SelectItem value="Tilt Up">Tilt Up</SelectItem>
                    <SelectItem value="Tilt Down">Tilt Down</SelectItem>
                    <SelectItem value="Handheld">Handheld</SelectItem>
                    <SelectItem value="Steadicam">Steadicam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Angle</label>
                <Select
                  value={direction.cameraAngle}
                  onValueChange={v => onEdit({ cameraAngle: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Eye-Level">Eye-Level</SelectItem>
                    <SelectItem value="Low Angle">Low Angle</SelectItem>
                    <SelectItem value="High Angle">High Angle</SelectItem>
                    <SelectItem value="Dutch Angle">Dutch Angle</SelectItem>
                    <SelectItem value="Bird's Eye">Bird's Eye</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lens / Transition Row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Lens / Focal Length</label>
                <Select
                  value={direction.lens || '50mm'}
                  onValueChange={v => onEdit({ lens: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24mm f/2.8">24mm f/2.8 — Wide, deep DOF</SelectItem>
                    <SelectItem value="35mm f/1.8">35mm f/1.8 — Natural, moderate DOF</SelectItem>
                    <SelectItem value="50mm">50mm — Standard</SelectItem>
                    <SelectItem value="50mm f/1.4">50mm f/1.4 — Shallow DOF, natural</SelectItem>
                    <SelectItem value="85mm f/1.2">85mm f/1.2 — Portrait, beautiful bokeh</SelectItem>
                    <SelectItem value="135mm f/2.0">135mm f/2.0 — Compressed, dreamy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Transition In</label>
                <Select
                  value={direction.transitionIn || 'cut'}
                  onValueChange={v => onEdit({ transitionIn: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cut">Hard Cut</SelectItem>
                    <SelectItem value="dissolve">Dissolve</SelectItem>
                    <SelectItem value="match cut">Match Cut</SelectItem>
                    <SelectItem value="j-cut">J-Cut (audio leads)</SelectItem>
                    <SelectItem value="l-cut">L-Cut (audio trails)</SelectItem>
                    <SelectItem value="whip pan">Whip Pan</SelectItem>
                    <SelectItem value="fade from black">Fade from Black</SelectItem>
                    <SelectItem value="smash cut">Smash Cut</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Talent Action */}
            <div>
              <label className="text-xs text-muted-foreground">Talent Action</label>
              <Textarea
                value={direction.talentAction}
                onChange={e => onEdit({ talentAction: e.target.value })}
                placeholder="What the talent does in this segment..."
                className="h-16 text-xs resize-none"
              />
            </div>
            
            {/* Emotional Beat */}
            <div>
              <label className="text-xs text-muted-foreground">Emotional Beat</label>
              <Input
                value={direction.emotionalBeat}
                onChange={e => onEdit({ emotionalBeat: e.target.value })}
                placeholder="e.g., Tension building, Moment of realization"
                className="h-8 text-xs"
              />
            </div>

            {/* Frame Descriptions — Colorized edit areas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                  <Play className="w-3 h-3" /> Start Frame
                </label>
                <Textarea
                  value={direction.startFrameDescription || ''}
                  onChange={e => onEdit({ startFrameDescription: e.target.value })}
                  placeholder="Opening frame description for continuity..."
                  className="h-24 text-sm resize-none bg-emerald-950/15 border-emerald-500/30 focus:border-emerald-500/60 placeholder:text-emerald-900/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-rose-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> End Frame
                </label>
                <Textarea
                  value={direction.endFrameDescription || ''}
                  onChange={e => onEdit({ endFrameDescription: e.target.value })}
                  placeholder="Closing frame description for next segment..."
                  className="h-24 text-sm resize-none bg-rose-950/15 border-rose-500/30 focus:border-rose-500/60 placeholder:text-rose-900/50"
                />
              </div>
            </div>

            {/* Continuity Notes */}
            <div>
              <label className="text-xs text-muted-foreground">Continuity Notes</label>
              <Input
                value={direction.continuityNotes || ''}
                onChange={e => onEdit({ continuityNotes: e.target.value })}
                placeholder="Wardrobe, props, lighting consistency notes..."
                className="h-8 text-xs"
              />
            </div>
            
            {/* No Talent Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={direction.isNoTalent ? "default" : "outline"}
                size="sm"
                onClick={() => onEdit({ isNoTalent: !direction.isNoTalent, characters: direction.isNoTalent ? [] : direction.characters })}
                className="h-7 text-xs"
              >
                {direction.isNoTalent ? '✓ No Talent' : 'Mark as No Talent'}
              </Button>
              <span className="text-xs text-muted-foreground">
                (for abstract/title/establishing shots)
              </span>
            </div>

            {/* AI Direction Assistant */}
            <div className="border-t border-sf-border/40 pt-3 mt-1">
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="w-3.5 h-3.5 text-sf-accent" />
                <span className="text-xs font-medium text-sf-text-secondary">AI Direction Assistant</span>
              </div>
              
              {/* Assigned audio lines preview */}
              <div className="mb-2">
                <p className="text-[10px] text-sf-text-disabled mb-1">Assigned Audio Lines ({direction.dialogueLineIds.length})</p>
                <div className="flex flex-wrap gap-1">
                  {direction.dialogueLineIds.length > 0 ? direction.dialogueLineIds.map(id => {
                    const idx = parseInt(id.replace('dialogue-', ''))
                    const narrationSentences = narrationText
                      ?.split(/(?<=[.!?])\s+/)
                      .map(s => s.trim())
                      .filter(s => s.length > 0) || []
                    const isNarration = idx < narrationSentences.length
                    const lineText = isNarration 
                      ? narrationSentences[idx]?.substring(0, 40) + '...'
                      : dialogueLines.find(d => d.id === id)?.text?.substring(0, 40) || `Line ${idx}`
                    return (
                      <Badge key={id} variant="outline" className={cn(
                        "text-[10px] h-5 max-w-[200px] truncate",
                        isNarration ? "border-amber-500/40 text-amber-300" : "border-blue-500/40 text-blue-300"
                      )}>
                        {isNarration ? '🎙️' : '🗣️'} #{idx}: {lineText}
                      </Badge>
                    )
                  }) : (
                    <span className="text-[10px] text-amber-400">No audio lines assigned</span>
                  )}
                </div>
              </div>
              
              {/* AI instruction input */}
              <div className="flex gap-2">
                <Input
                  value={aiInstruction}
                  onChange={e => setAiInstruction(e.target.value)}
                  placeholder="e.g., 'Make it more dramatic' or 'Focus on the gym environment'"
                  className="h-8 text-xs bg-sf-surface border-sf-border/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && aiInstruction.trim() && onAiAssist) {
                      onAiAssist(aiInstruction)
                      setAiInstruction('')
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-sf-accent/40 text-sf-accent hover:bg-sf-accent/10 whitespace-nowrap"
                  disabled={isAiAssistLoading || !aiInstruction.trim()}
                  onClick={() => {
                    if (aiInstruction.trim() && onAiAssist) {
                      onAiAssist(aiInstruction)
                      setAiInstruction('')
                    }
                  }}
                >
                  {isAiAssistLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}
                  {isAiAssistLoading ? 'Generating...' : 'Generate'}
                </Button>
              </div>
              <p className="text-[10px] text-sf-text-disabled mt-1">Describe what you want — AI will generate talent action, frames, and cinematography</p>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {/* Section 1: Camera & Shot Info — Blue accent */}
            <div className="flex items-center gap-2 text-sm py-2">
              <Camera className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span className="font-medium text-sf-text-primary">{direction.shotType}</span>
              <span className="text-sf-text-disabled">•</span>
              <span className="text-sf-text-secondary">{direction.cameraMovement}</span>
              <span className="text-sf-text-disabled">•</span>
              <span className="text-sf-text-secondary">{direction.cameraAngle}</span>
              {direction.lens && (
                <>
                  <span className="text-sf-text-disabled">•</span>
                  <span className="text-xs font-mono text-blue-400">{direction.lens}</span>
                </>
              )}
            </div>

            {/* Transition */}
            {direction.transitionIn && direction.transitionIn !== 'cut' && (
              <div className="flex items-center gap-2 text-sm pb-2">
                <ArrowRight className="w-3 h-3 text-purple-400" />
                <span className="text-purple-300 text-xs capitalize">{direction.transitionIn}</span>
              </div>
            )}

            {/* Section 2: Talent Action — Separated with border */}
            {direction.talentAction && (
              <div className="border-t border-sf-border/40 py-2.5">
                <div className="flex items-start gap-2">
                  <Users className="w-3.5 h-3.5 text-sf-text-secondary mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-sf-text-secondary leading-relaxed">{direction.talentAction}</p>
                </div>
              </div>
            )}
            
            {/* Section 3: Emotional Beat — Amber accent */}
            {direction.emotionalBeat && (
              <div className="border-t border-sf-border/40 py-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="text-sm text-amber-300">{direction.emotionalBeat}</span>
                </div>
              </div>
            )}
            
            {/* Section 4: Characters */}
            {direction.characters.length > 0 && (
              <div className="border-t border-sf-border/40 py-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Users className="w-3 h-3 text-sf-text-disabled flex-shrink-0" />
                  {direction.characters.map(char => (
                    <Badge key={char} variant="secondary" className="text-xs bg-sf-surface-light border-sf-border">
                      {char}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Section 5: Frame Descriptions — Colorized with stronger backgrounds */}
            {(direction.startFrameDescription || direction.endFrameDescription) && (
              <div className="border-t border-sf-border/40 pt-3 pb-2">
                <div className="grid grid-cols-2 gap-3">
                  {direction.startFrameDescription && (
                    <div className="p-3 rounded-lg bg-emerald-950/25 border border-emerald-500/30">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Play className="w-3 h-3 text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Start Frame</span>
                      </div>
                      <p className="text-sm text-emerald-100/80 leading-relaxed">{direction.startFrameDescription}</p>
                    </div>
                  )}
                  {direction.endFrameDescription && (
                    <div className="p-3 rounded-lg bg-rose-950/25 border border-rose-500/30">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Lock className="w-3 h-3 text-rose-400" />
                        <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">End Frame</span>
                      </div>
                      <p className="text-sm text-rose-100/80 leading-relaxed">{direction.endFrameDescription}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 6: Continuity Notes — Cyan accent */}
            {direction.continuityNotes && (
              <div className="border-t border-sf-border/40 py-2.5">
                <div className="flex items-start gap-2 p-2.5 rounded-md bg-cyan-950/20 border border-cyan-500/20">
                  <Eye className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-cyan-200/80">{direction.continuityNotes}</span>
                </div>
              </div>
            )}
            
            {/* Section 7: Dialogue Preview — Distinct panel */}
            {segmentDialogue.length > 0 && (
              <div className="border-t border-sf-border/40 py-2.5">
                <div className="p-3 rounded-lg bg-sf-surface-light/50 border border-sf-border">
                  <div className="flex items-center gap-1.5 mb-2">
                    <MessageSquare className="w-3.5 h-3.5 text-sf-primary" />
                    <span className="text-xs font-medium text-sf-text-secondary">
                      {segmentDialogue.length} dialogue line{segmentDialogue.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {segmentDialogue.slice(0, 3).map((d, i) => (
                      <p key={i} className="text-sm text-sf-text-secondary">
                        <span className="font-semibold text-sf-text-primary">{d.character}:</span>{' '}
                        <span className="italic">"{d.text.substring(0, 60)}{d.text.length > 60 ? '...' : ''}"</span>
                      </p>
                    ))}
                    {segmentDialogue.length > 3 && (
                      <p className="text-xs text-sf-text-disabled">+{segmentDialogue.length - 3} more</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Section 8: Trigger Reason — Subtle footer */}
            <div className="border-t border-sf-border/40 pt-2.5">
              <p className="text-xs text-sf-text-disabled italic">
                <span className="text-sf-text-secondary not-italic">Cut:</span> {direction.triggerReason}
              </p>
            </div>
          </div>
        )}
        
        </div>
        )}

        {/* Action Buttons — Clean bottom bar */}
        <div className={cn("flex items-center justify-between pt-3 border-t border-sf-border/50 px-4 pb-3", isExpanded && "mt-3")} onClick={e => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setIsEditing(!isEditing); if (!isEditing) setIsExpanded(true) }}
            className="h-7 text-xs text-sf-text-secondary hover:text-sf-text-primary"
          >
            <Edit3 className="w-3 h-3 mr-1" />
            {isEditing ? 'Done' : 'Edit'}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="h-7 text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
              title="Delete segment"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
            <Button
              variant={direction.isApproved ? "default" : "outline"}
              size="sm"
              onClick={onApprove}
              className={cn(
                "h-7 text-xs transition-all",
                direction.isApproved 
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20" 
                  : "border-sf-border hover:border-emerald-500/50 hover:text-emerald-400"
              )}
            >
              <Check className="w-3 h-3 mr-1" />
              {direction.isApproved ? 'Approved' : 'Approve'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Movie Set Production Overlay
// ============================================================================

const PRODUCTION_STAGES = [
  { id: 'setup', label: 'Setting up the scene...', icon: 'clapperboard', duration: 1500 },
  { id: 'lighting', label: 'Adjusting lights...', icon: 'lightbulb', duration: 1500 },
  { id: 'camera', label: 'Positioning camera...', icon: 'camera', duration: 1500 },
  { id: 'rolling', label: 'Rolling camera...', icon: 'video', duration: 2000 },
  { id: 'action', label: 'Action! Capturing takes...', icon: 'film', duration: 3000 },
  { id: 'processing', label: 'Processing footage...', icon: 'sparkles', duration: 0 }, // 0 = until complete
]

function ProductionOverlay({ isVisible, currentStage }: { isVisible: boolean; currentStage: number }) {
  if (!isVisible) return null

  const stage = PRODUCTION_STAGES[Math.min(currentStage, PRODUCTION_STAGES.length - 1)]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="relative flex flex-col items-center gap-8 p-12">
        {/* Animated spotlight effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-radial from-amber-500/10 via-transparent to-transparent animate-pulse" />
          <div className="absolute top-0 left-1/4 w-2 h-32 bg-gradient-to-b from-amber-400/50 to-transparent rotate-12 animate-[pulse_2s_ease-in-out_infinite]" />
          <div className="absolute top-0 right-1/4 w-2 h-32 bg-gradient-to-b from-amber-400/50 to-transparent -rotate-12 animate-[pulse_2s_ease-in-out_infinite_0.5s]" />
        </div>

        {/* Clapperboard animation */}
        <div className="relative">
          <div className="relative w-32 h-32">
            {/* Clapper base */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-lg border-2 border-zinc-700 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_10px,rgba(255,255,255,0.03)_10px,rgba(255,255,255,0.03)_20px)]" />
              <Film className="w-10 h-10 text-amber-500/60" />
            </div>
            {/* Clapper top (animated) */}
            <div 
              className={cn(
                "absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-zinc-700 to-zinc-800 rounded-t-lg border-2 border-zinc-600 origin-bottom transition-transform duration-300",
                currentStage >= 3 ? "animate-[clap_0.3s_ease-in-out]" : ""
              )}
              style={{
                background: 'repeating-linear-gradient(45deg, #18181b, #18181b 8px, #27272a 8px, #27272a 16px)'
              }}
            />
          </div>
        </div>

        {/* Stage indicator */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 text-amber-400">
            {stage.icon === 'clapperboard' && <Clapperboard className="w-6 h-6 animate-bounce" />}
            {stage.icon === 'lightbulb' && <div className="w-6 h-6 rounded-full bg-amber-400 animate-pulse shadow-[0_0_20px_rgba(251,191,36,0.6)]" />}
            {stage.icon === 'camera' && <Camera className="w-6 h-6 animate-[wiggle_0.5s_ease-in-out_infinite]" />}
            {stage.icon === 'video' && <Video className="w-6 h-6 text-red-500 animate-pulse" />}
            {stage.icon === 'film' && <Film className="w-6 h-6 animate-spin" style={{ animationDuration: '3s' }} />}
            {stage.icon === 'sparkles' && <Sparkles className="w-6 h-6 animate-pulse" />}
            <span className="text-xl font-semibold tracking-wide">{stage.label}</span>
          </div>

          {/* Progress bar */}
          <div className="w-64 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500 ease-out"
              style={{ width: `${((currentStage + 1) / PRODUCTION_STAGES.length) * 100}%` }}
            />
          </div>

          {/* Stage dots */}
          <div className="flex items-center gap-2">
            {PRODUCTION_STAGES.map((s, idx) => (
              <div
                key={s.id}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  idx < currentStage ? "bg-amber-500" :
                  idx === currentStage ? "bg-amber-400 scale-150 animate-pulse" :
                  "bg-zinc-700"
                )}
              />
            ))}
          </div>
        </div>

        {/* Production quote */}
        <p className="text-zinc-500 text-sm italic mt-4">
          "Quiet on set... and... ACTION!"
        </p>
      </div>

      <style jsx>{`
        @keyframes clap {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-25deg); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// Component Props (types imported from ./types to avoid circular dependency)
// ============================================================================

interface SegmentBuilderProps {
  sceneId: string
  sceneNumber: number
  scene: any // Full scene object from script.script.scenes
  productionData?: SceneProductionData | null
  references: SceneProductionReferences
  projectId: string
  onSegmentsGenerated: (segments: SceneSegment[]) => void
  onSegmentsFinalized: (segments: SceneSegment[]) => void
  onClose?: () => void
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a content hash for staleness detection
 */
function generateContentHash(scene: any): string {
  const content = JSON.stringify({
    heading: scene.heading,
    visualDescription: scene.visualDescription || scene.action,
    narration: scene.narration,
    dialogue: scene.dialogue?.map((d: any) => ({
      character: d.character,
      text: d.text || d.dialogue || d.line,
    })),
  })
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

/**
 * Extract Scene Bible from scene data
 */
function extractSceneBible(scene: any, sceneNumber: number, characters: any[]): SceneBible {
  const headingText = typeof scene.heading === 'string' 
    ? scene.heading 
    : scene.heading?.text || 'UNKNOWN LOCATION'
  
  // Parse heading for location and time
  const headingMatch = headingText.match(/^(INT\.|EXT\.|INT\/EXT\.?)\s*(.+?)(?:\s*[-–]\s*(DAY|NIGHT|MORNING|EVENING|DAWN|DUSK|CONTINUOUS|LATER|MOMENTS LATER))?$/i)
  const location = headingMatch ? headingMatch[2].trim() : headingText
  const timeOfDay = headingMatch ? (headingMatch[3] || 'DAY') : 'DAY'

  // Map dialogue with IDs
  const dialogue = (scene.dialogue || []).map((d: any, idx: number) => ({
    id: d.id || `dialogue-${idx}`,
    character: d.character || d.name || 'UNKNOWN',
    text: d.text || d.dialogue || d.line || '',
    emotion: d.emotion || d.mood || undefined,
  }))

  // Map characters present in scene
  const sceneCharacterNames = new Set(dialogue.map((d: { character: string }) => d.character.toUpperCase()))
  const sceneCharacters = characters
    .filter(c => sceneCharacterNames.has(c.name?.toUpperCase()))
    .map(c => ({
      id: c.id || c.name,
      name: c.name,
      description: c.description,
      appearanceDescription: c.appearance || c.appearanceDescription,
      referenceImageUrl: c.referenceImage || c.referenceImageUrl,
    }))

  return {
    sceneId: scene.id || `scene-${sceneNumber}`,
    sceneNumber,
    heading: headingText,
    location,
    timeOfDay,
    visualDescription: scene.visualDescription || scene.action || scene.summary || '',
    narration: scene.narration || null,
    dialogue,
    characters: sceneCharacters,
    sceneFrameUrl: scene.imageUrl || scene.sceneImageUrl || null,
    contentHash: generateContentHash(scene),
  }
}

/**
 * Extract audio metadata from scene for intelligent segmentation
 * This includes narration duration and dialogue timing for audio-aligned segments
 */
function extractAudioMetadata(scene: any, selectedLanguage = 'en-US'): {
  narrationDurationSeconds: number | null
  narrationText: string | null
  narrationAudioUrl: string | null
  dialogueDurations: Array<{ character: string; text: string; durationSeconds: number }>
  totalAudioDurationSeconds: number
} {
  // Extract narration metadata
  const narrationAudio = scene.narrationAudio?.[selectedLanguage] || scene.narrationAudio?.['en-US'] || {}
  const narrationDurationSeconds = scene.narrationDuration 
    || narrationAudio.duration 
    || (scene.narrationUrl && 10) // Default estimate if URL exists but no duration
    || null
  const narrationText = scene.narration || null
  const narrationAudioUrl = scene.narrationUrl || narrationAudio.url || null

  // Extract dialogue durations
  const dialogueAudioArray = Array.isArray(scene.dialogueAudio)
    ? scene.dialogueAudio
    : (scene.dialogueAudio?.[selectedLanguage] || [])
  
  const dialogueDurations = (scene.dialogue || []).map((d: any, idx: number) => {
    const audioData = dialogueAudioArray[idx] || {}
    const text = d.text || d.dialogue || d.line || ''
    // Estimate: ~2.5 words per second if no duration available
    const estimatedDuration = text.split(/\s+/).length / 2.5
    return {
      character: d.character || d.name || 'UNKNOWN',
      text,
      durationSeconds: audioData.duration || estimatedDuration,
    }
  })

  // Calculate total audio duration
  const totalDialogueDuration = dialogueDurations.reduce((acc: number, d) => acc + d.durationSeconds, 0)
  const totalAudioDurationSeconds = Math.max(
    narrationDurationSeconds || 0,
    totalDialogueDuration
  ) + 2 // Buffer for gaps between dialogue

  return {
    narrationDurationSeconds,
    narrationText,
    narrationAudioUrl,
    dialogueDurations,
    totalAudioDurationSeconds,
  }
}

// ============================================================================
// Scene Bible Panel Component
// ============================================================================

interface SceneBiblePanelProps {
  bible: SceneBible
}

function SceneBiblePanel({ bible }: SceneBiblePanelProps) {
  return (
    <Card className="border-amber-500/30 bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-500" />
          <CardTitle className="text-sm text-amber-500">Scene Bible</CardTitle>
          <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-400">
            Read-Only During Segmentation
          </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Edit the scene in the Script tab if changes are needed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Heading */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Scene Heading</span>
          </div>
          <p className="text-sm font-mono bg-background/50 px-2 py-1 rounded border border-border/50">
            {bible.heading}
          </p>
        </div>

        {/* Visual Description */}
        {bible.visualDescription && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Eye className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Visual Description</span>
            </div>
            <ScrollArea className="h-20">
              <p className="text-xs text-foreground/80 bg-background/50 px-2 py-1 rounded border border-border/50">
                {bible.visualDescription}
              </p>
            </ScrollArea>
          </div>
        )}

        {/* Narration */}
        {bible.narration && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Volume2 className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Narration</span>
            </div>
            <ScrollArea className="h-16">
              <p className="text-xs italic text-foreground/80 bg-background/50 px-2 py-1 rounded border border-border/50">
                "{bible.narration}"
              </p>
            </ScrollArea>
          </div>
        )}

        {/* Dialogue */}
        {bible.dialogue.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Dialogue ({bible.dialogue.length} lines)
              </span>
            </div>
            <ScrollArea className="h-24">
              <div className="space-y-1">
                {bible.dialogue.map((line, idx) => (
                  <div
                    key={line.id}
                    className="text-xs bg-background/50 px-2 py-1 rounded border border-border/50"
                  >
                    <span className="font-semibold text-primary">{line.character}:</span>{' '}
                    <span className="text-foreground/80">"{line.text}"</span>
                    {line.emotion && (
                      <span className="text-muted-foreground ml-1">({line.emotion})</span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Characters */}
        {bible.characters.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Characters ({bible.characters.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {bible.characters.map(char => (
                <Badge key={char.id} variant="secondary" className="text-[10px]">
                  {char.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Workflow Phase Indicator
// ============================================================================

interface PhaseIndicatorProps {
  currentPhase: BuilderPhase
  onPhaseClick: (phase: BuilderPhase) => void
  canAdvance: { directions: boolean; review: boolean; finalize: boolean }
}

function PhaseIndicator({ currentPhase, onPhaseClick, canAdvance }: PhaseIndicatorProps) {
  const phases: { id: BuilderPhase; label: string; icon: React.ReactNode }[] = [
    { id: 'analyze', label: 'Analysis', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'directions', label: 'Review Directions', icon: <Eye className="w-4 h-4" /> },
    { id: 'review', label: 'Review Prompts', icon: <Edit3 className="w-4 h-4" /> },
    { id: 'finalize', label: 'Finalize', icon: <Check className="w-4 h-4" /> },
  ]

  const getPhaseStatus = (phase: BuilderPhase) => {
    const phaseOrder = ['analyze', 'directions', 'review', 'finalize']
    const currentIndex = phaseOrder.indexOf(currentPhase)
    const phaseIndex = phaseOrder.indexOf(phase)
    
    if (phaseIndex < currentIndex) return 'complete'
    if (phaseIndex === currentIndex) return 'current'
    return 'pending'
  }

  const canClickPhase = (phase: BuilderPhase) => {
    if (phase === 'analyze') return true
    if (phase === 'directions') return canAdvance.directions
    if (phase === 'review') return canAdvance.review
    if (phase === 'finalize') return canAdvance.finalize
    return false
  }

  return (
    <div className="flex items-center gap-2">
      {phases.map((phase, idx) => {
        const status = getPhaseStatus(phase.id)
        const canClick = canClickPhase(phase.id)
        
        return (
          <React.Fragment key={phase.id}>
            <button
              onClick={() => canClick && onPhaseClick(phase.id)}
              disabled={!canClick}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium',
                status === 'current' && 'bg-sf-primary text-white shadow-md shadow-sf-primary/20',
                status === 'complete' && 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
                status === 'pending' && 'text-sf-text-disabled',
                canClick && status !== 'current' && 'hover:bg-sf-surface-light cursor-pointer',
                !canClick && 'opacity-50 cursor-not-allowed'
              )}
            >
              {status === 'complete' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                phase.icon
              )}
              <span>{phase.label}</span>
            </button>
            {idx < phases.length - 1 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function SegmentBuilder({
  sceneId,
  sceneNumber,
  scene,
  productionData,
  references,
  projectId,
  onSegmentsGenerated,
  onSegmentsFinalized,
  onClose,
}: SegmentBuilderProps) {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  const [phase, setPhase] = useState<BuilderPhase>('analyze')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  // NEW: Phase 1 - Proposed directions for user review
  const [proposedDirections, setProposedDirections] = useState<ProposedDirection[]>([])
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false)
  
  // Phase 2 - Proposed segments with full prompts
  const [proposedSegments, setProposedSegments] = useState<ProposedSegment[]>([])
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)
  const [selectedDirectionId, setSelectedDirectionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Production overlay state
  const [showProductionOverlay, setShowProductionOverlay] = useState(false)
  const [productionStage, setProductionStage] = useState(0)
  
  // Generation options
  const [targetDuration, setTargetDuration] = useState(6) // 4-8 seconds
  const [narrationDriven, setNarrationDriven] = useState(false)
  const [totalDurationTarget, setTotalDurationTarget] = useState<number | null>(null) // null = let AI decide
  const [segmentCountTarget, setSegmentCountTarget] = useState<number | null>(null) // null = let AI decide
  const [focusMode, setFocusMode] = useState<'balanced' | 'dialogue-focused' | 'action-focused'>('balanced')
  const [customInstructions, setCustomInstructions] = useState('')
  
  // Regeneration dialog state
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)
  const [regenerationConfig, setRegenerationConfig] = useState({
    targetDuration: 6,
    narrationDriven: false,
    preserveManualEdits: false,
  })
  
  // Add Segment dialog state
  const [showAddSegmentDialog, setShowAddSegmentDialog] = useState(false)
  const [addSegmentType, setAddSegmentType] = useState<'narration' | 'dialogue' | 'custom'>('narration')
  const [addSegmentPosition, setAddSegmentPosition] = useState<number>(0) // Insert after this index
  
  // Drag-to-reorder state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  
  // AI assist state
  const [aiAssistLoading, setAiAssistLoading] = useState<string | null>(null)
  
  // Track scene bible hash for staleness
  const [lastGeneratedHash, setLastGeneratedHash] = useState<string | null>(null)
  
  // Validation results (loaded asynchronously to avoid TDZ)
  const [allValidations, setAllValidations] = useState<Array<{ segmentId: string; validation: ValidationResult }>>([])
  
  // Track if we have existing finalized segments
  const existingSegments = productionData?.segments || []
  const hasExistingSegments = existingSegments.length > 0
  const hasExistingVideoAssets = existingSegments.some(
    seg => seg.activeAssetUrl || (seg.takes && seg.takes.length > 0)
  )

  // -------------------------------------------------------------------------
  // Derived State
  // -------------------------------------------------------------------------
  
  // Extract Scene Bible (immutable during segmentation)
  const sceneBible = useMemo(() => {
    return extractSceneBible(scene, sceneNumber, references.characters)
  }, [scene, sceneNumber, references.characters])

  // Extract audio metadata for intelligent segmentation
  const audioMetadata = useMemo(() => {
    return extractAudioMetadata(scene)
  }, [scene])

  // Auto-enable narration-driven mode if scene has narration audio
  useEffect(() => {
    if (audioMetadata.narrationDurationSeconds && audioMetadata.narrationDurationSeconds > 0) {
      setNarrationDriven(true)
    }
  }, [audioMetadata.narrationDurationSeconds])

  // Selected segment for editing
  const selectedSegment = useMemo(() => {
    return proposedSegments.find(s => s.id === selectedSegmentId) || null
  }, [proposedSegments, selectedSegmentId])

  // Validation for all segments (loaded asynchronously to avoid TDZ)
  useEffect(() => {
    if (proposedSegments.length === 0 || !sceneBible) {
      setAllValidations([])
      return
    }
    
    // Dynamically import and run validation
    const runValidation = async () => {
      const SegmentValidation = await getSegmentValidation()
      const results = proposedSegments.map(seg => ({
        segmentId: seg.id,
        validation: SegmentValidation.validateSegment(seg, sceneBible),
      }))
      setAllValidations(results)
    }
    
    runValidation()
  }, [proposedSegments, sceneBible])

  // Check if can advance to next phase
  const canAdvance = useMemo(() => {
    const hasDirections = proposedDirections.length > 0
    const allDirectionsApproved = proposedDirections.every(d => d.isApproved)
    const hasSegments = proposedSegments.length > 0
    const allValid = allValidations.every(v => v.validation.isValid)
    
    return {
      directions: hasDirections, // Can go to directions phase once we have them
      review: hasSegments, // Can go to review phase once we have segments with prompts
      finalize: hasSegments && allValid,
    }
  }, [proposedDirections, proposedSegments, allValidations])
  
  // Count approved directions
  const approvedDirectionCount = useMemo(() => {
    return proposedDirections.filter(d => d.isApproved).length
  }, [proposedDirections])

  // Total estimated duration from directions
  const totalDirectionsDuration = useMemo(() => {
    return proposedDirections.reduce((sum, d) => sum + d.estimatedDuration, 0)
  }, [proposedDirections])

  // Total estimated duration from segments
  const totalDuration = useMemo(() => {
    return proposedSegments.reduce((sum, seg) => sum + seg.duration, 0)
  }, [proposedSegments])
  
  // Check if scene has direction
  const hasSceneDirection = useMemo(() => {
    const dir = scene?.sceneDirection
    if (!dir) return false
    // Check if any meaningful direction exists
    return !!(dir.camera || dir.lighting || dir.scene || dir.talent || dir.audio)
  }, [scene?.sceneDirection])
  
  // Staleness detection - check if scene content changed since last generation
  const isStale = useMemo(() => {
    if (!lastGeneratedHash) return false
    return sceneBible.contentHash !== lastGeneratedHash
  }, [sceneBible.contentHash, lastGeneratedHash])
  
  // Check if existing segments are stale (for post-finalization view)
  const existingSegmentsStale = useMemo(() => {
    if (!hasExistingSegments) return false
    const firstSegment = existingSegments[0]
    const savedHash = firstSegment.promptContext?.visualDescriptionHash
    if (!savedHash) return false
    return savedHash !== sceneBible.contentHash
  }, [hasExistingSegments, existingSegments, sceneBible.contentHash])

  // -------------------------------------------------------------------------
  // Narration Coverage Validation
  // -------------------------------------------------------------------------
  
  // Check if narration lines are properly covered by segments
  const narrationCoverage = useMemo(() => {
    if (!sceneBible.narration || !narrationDriven) return null
    
    // Split narration into sentences to count expected coverage
    const narrationSentences = sceneBible.narration
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    if (narrationSentences.length === 0) return null
    
    // Check which audio timeline indices are narration-type
    // Narration lines are at the beginning of dialogueLineIds (dialogue-0, dialogue-1, etc.)
    // but they don't appear in sceneBible.dialogue (which only has actual dialogue)
    const allAssignedIds = new Set(proposedDirections.flatMap(d => d.dialogueLineIds))
    
    // Count how many narration-range IDs are assigned
    const totalAudioLines = narrationSentences.length + sceneBible.dialogue.length
    const narrationLineIds = narrationSentences.map((_, idx) => `dialogue-${idx}`)
    const coveredNarrationIds = narrationLineIds.filter(id => allAssignedIds.has(id))
    
    // Also check if any directions mention narration/voiceover context
    const directionsWithNarration = proposedDirections.filter(d => 
      d.dialogueLineIds.some(id => {
        const idx = parseInt(id.replace('dialogue-', ''))
        return idx < narrationSentences.length
      })
    )
    
    return {
      totalNarrationSentences: narrationSentences.length,
      coveredCount: coveredNarrationIds.length,
      uncoveredIds: narrationLineIds.filter(id => !allAssignedIds.has(id)),
      isFullyCovered: coveredNarrationIds.length >= narrationSentences.length,
      directionsWithNarration: directionsWithNarration.length,
    }
  }, [sceneBible.narration, sceneBible.dialogue, narrationDriven, proposedDirections])

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  // Progress through production stages
  const runProductionAnimation = useCallback(async () => {
    setShowProductionOverlay(true)
    setProductionStage(0)
    
    for (let i = 0; i < PRODUCTION_STAGES.length - 1; i++) {
      await new Promise(resolve => setTimeout(resolve, PRODUCTION_STAGES[i].duration))
      setProductionStage(i + 1)
    }
    // Stay on final stage until generation completes
  }, [])

  // Phase 1: Generate segment directions for user review
  const handleAnalyze = useCallback(async () => {
    // Check for scene direction requirement
    if (!hasSceneDirection) {
      toast.error('Scene direction required', {
        description: 'Please generate scene direction first before creating segments.',
      })
      return
    }
    
    setIsAnalyzing(true)
    setError(null)
    
    // Start production animation
    runProductionAnimation()

    try {
      // NEW: Phase 1 - Get directions only (faster, user reviews before prompts)
      const response = await fetch(`/api/scenes/${sceneId}/generate-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredDuration: targetDuration,
          projectId,
          focusMode,
          narrationDriven,
          narrationDurationSeconds: audioMetadata.narrationDurationSeconds,
          narrationText: audioMetadata.narrationText,
          narrationAudioUrl: audioMetadata.narrationAudioUrl,
          totalAudioDurationSeconds: audioMetadata.totalAudioDurationSeconds,
          // Scope controls
          totalDurationTarget: totalDurationTarget || undefined,
          segmentCountTarget: segmentCountTarget || undefined,
          customInstructions: customInstructions.trim() || undefined,
          // NEW: Request directions phase only
          phase: 'directions',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze scene')
      }

      const data = await response.json()
      
      // Transform API directions to ProposedDirections
      const directions: ProposedDirection[] = data.directions.map((dir: any, idx: number) => ({
        id: `dir_${sceneId}_${idx + 1}`,
        sequenceIndex: idx,
        estimatedDuration: dir.estimatedDuration || targetDuration,
        shotType: dir.shotType || 'Medium Shot',
        cameraMovement: dir.cameraMovement || 'Static',
        cameraAngle: dir.cameraAngle || 'Eye-Level',
        lens: dir.lens || '50mm',
        talentAction: dir.talentAction || '',
        emotionalBeat: dir.emotionalBeat || '',
        characters: dir.characters || [],
        isNoTalent: dir.isNoTalent || false,
        lightingMood: dir.lightingMood,
        keyProps: dir.keyProps || [],
        dialogueLineIds: dir.dialogueLineIds || [],
        generationMethod: dir.generationMethod || 'FTV',
        triggerReason: dir.triggerReason || 'AI-determined cut point',
        confidence: dir.confidence || 75,
        transitionIn: dir.transitionIn || 'cut',
        startFrameDescription: dir.startFrameDescription || '',
        endFrameDescription: dir.endFrameDescription || '',
        continuityNotes: dir.continuityNotes || '',
        // Phase 8: Keyframe-specific direction fields
        keyframeStartDescription: dir.keyframeStartDescription || '',
        keyframeEndDescription: dir.keyframeEndDescription || '',
        environmentDescription: dir.environmentDescription || '',
        colorPalette: dir.colorPalette || '',
        depthOfField: dir.depthOfField || '',
        isApproved: false, // User must approve
        isUserEdited: false,
      }))

      setProposedDirections(directions)
      setPhase('directions') // Go to directions review phase
      setLastGeneratedHash(sceneBible.contentHash)
      
      if (directions.length > 0) {
        setSelectedDirectionId(directions[0].id)
      }

      toast.success(`AI proposed ${directions.length} segment directions`, {
        description: 'Review and approve directions before generating prompts.',
      })
    } catch (err: any) {
      console.error('[SegmentBuilder] Analysis error:', err)
      setError(err.message || 'Failed to analyze scene')
      toast.error('Failed to analyze scene')
    } finally {
      setIsAnalyzing(false)
      setShowProductionOverlay(false)
      setProductionStage(0)
    }
  }, [sceneId, projectId, targetDuration, narrationDriven, totalDurationTarget, segmentCountTarget, focusMode, customInstructions, audioMetadata, sceneBible.contentHash, hasSceneDirection, runProductionAnimation])

  // Phase 2: Generate prompts from approved directions
  const handleGeneratePrompts = useCallback(async () => {
    const approvedDirs = proposedDirections.filter(d => d.isApproved)
    
    if (approvedDirs.length === 0) {
      toast.error('No directions approved', {
        description: 'Please approve at least one segment direction.',
      })
      return
    }
    
    setIsGeneratingPrompts(true)
    setError(null)

    try {
      // Convert ProposedDirections to API format
      const apiDirections = approvedDirs.map(dir => ({
        shotType: dir.shotType,
        cameraMovement: dir.cameraMovement,
        cameraAngle: dir.cameraAngle,
        lens: dir.lens,
        talentAction: dir.talentAction,
        emotionalBeat: dir.emotionalBeat,
        characters: dir.characters,
        isNoTalent: dir.isNoTalent,
        lightingMood: dir.lightingMood,
        keyProps: dir.keyProps,
        dialogueLineIds: dir.dialogueLineIds,
        isApproved: dir.isApproved,
        isUserEdited: dir.isUserEdited,
        generationMethod: dir.generationMethod,
        triggerReason: dir.triggerReason,
        confidence: dir.confidence,
        transitionIn: dir.transitionIn,
        startFrameDescription: dir.startFrameDescription,
        endFrameDescription: dir.endFrameDescription,
        continuityNotes: dir.continuityNotes,
      }))

      const response = await fetch(`/api/scenes/${sceneId}/generate-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredDuration: targetDuration,
          projectId,
          narrationDriven,
          narrationDurationSeconds: audioMetadata.narrationDurationSeconds,
          narrationText: audioMetadata.narrationText,
          narrationAudioUrl: audioMetadata.narrationAudioUrl,
          totalAudioDurationSeconds: audioMetadata.totalAudioDurationSeconds,
          // Phase 2: Generate prompts from approved directions
          phase: 'prompts',
          approvedDirections: apiDirections,
          previewMode: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate prompts')
      }

      const data = await response.json()
      
      // Transform to ProposedSegments
      const proposed: ProposedSegment[] = data.segments.map((seg: any, idx: number) => ({
        id: seg.segmentId,
        sequenceIndex: seg.sequenceIndex,
        startTime: seg.startTime,
        endTime: seg.endTime,
        duration: seg.endTime - seg.startTime,
        triggerReason: seg.triggerReason || 'AI-determined cut point',
        generationMethod: seg.generationMethod || 'FTV',
        generatedPrompt: seg.generatedPrompt || '',
        emotionalBeat: seg.emotionalBeat || '',
        dialogueLineIds: seg.dialogueLineIds || [],
        confidence: seg.generationPlan?.confidence || 75,
        isAdjusted: false,
        userEditedPrompt: null,
        directionId: approvedDirs[idx]?.id,
      }))

      setProposedSegments(proposed)
      setPhase('review')
      
      if (proposed.length > 0) {
        setSelectedSegmentId(proposed[0].id)
      }

      toast.success(`Generated ${proposed.length} segment prompts`)
    } catch (err: any) {
      console.error('[SegmentBuilder] Prompt generation error:', err)
      setError(err.message || 'Failed to generate prompts')
      toast.error('Failed to generate prompts')
    } finally {
      setIsGeneratingPrompts(false)
    }
  }, [sceneId, projectId, targetDuration, narrationDriven, audioMetadata, proposedDirections])

  // Generate prompt for a single direction
  const handleGenerateSinglePrompt = useCallback(async (directionId: string) => {
    const direction = proposedDirections.find(d => d.id === directionId)
    if (!direction) return
    
    // Mark as approved and generate
    setProposedDirections(prev => prev.map(d => 
      d.id === directionId ? { ...d, isApproved: true } : d
    ))
    
    toast.info('Generating prompt...', { description: `For segment ${direction.sequenceIndex + 1}` })
    
    // For now, just mark it approved - user can click "Generate All Prompts" 
    // A future enhancement could generate just this one segment's prompt
  }, [proposedDirections])

  // Direction editing handlers
  const handleDirectionEdit = useCallback((directionId: string, updates: Partial<ProposedDirection>) => {
    setProposedDirections(prev => prev.map(d => {
      if (d.id !== directionId) return d
      return { ...d, ...updates, isUserEdited: true }
    }))
  }, [])

  const handleDirectionApprove = useCallback((directionId: string) => {
    setProposedDirections(prev => prev.map(d => {
      if (d.id !== directionId) return d
      return { ...d, isApproved: !d.isApproved }
    }))
  }, [])

  const handleApproveAll = useCallback(() => {
    setProposedDirections(prev => prev.map(d => ({ ...d, isApproved: true })))
    toast.success('All directions approved')
  }, [])

  // Legacy: Full segment generation (backwards compatible)
  const handleLegacyAnalyze = useCallback(async () => {
    if (!hasSceneDirection) {
      toast.error('Scene direction required')
      return
    }
    
    setIsAnalyzing(true)
    setError(null)
    runProductionAnimation()

    try {
      const response = await fetch(`/api/scenes/${sceneId}/generate-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredDuration: targetDuration,
          projectId,
          focusMode: 'balanced',
          narrationDriven,
          narrationDurationSeconds: audioMetadata.narrationDurationSeconds,
          narrationText: audioMetadata.narrationText,
          narrationAudioUrl: audioMetadata.narrationAudioUrl,
          totalAudioDurationSeconds: audioMetadata.totalAudioDurationSeconds,
          previewMode: true,
          // No phase = legacy full generation
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze scene')
      }

      const data = await response.json()
      
      const proposed: ProposedSegment[] = data.segments.map((seg: any) => ({
        id: seg.segmentId,
        sequenceIndex: seg.sequenceIndex,
        startTime: seg.startTime,
        endTime: seg.endTime,
        duration: seg.endTime - seg.startTime,
        triggerReason: seg.triggerReason || 'AI-determined cut point',
        generationMethod: seg.generationMethod || 'FTV',
        generatedPrompt: seg.generatedPrompt || '',
        emotionalBeat: seg.emotionalBeat || '',
        dialogueLineIds: seg.dialogueLineIds || [],
        confidence: seg.generationPlan?.confidence || 75,
        isAdjusted: false,
        userEditedPrompt: null,
      }))

      setProposedSegments(proposed)
      setPhase('review')
      
      // Save the content hash for staleness detection
      setLastGeneratedHash(sceneBible.contentHash)
      
      // Select first segment
      if (proposed.length > 0) {
        setSelectedSegmentId(proposed[0].id)
      }

      toast.success(`AI generated ${proposed.length} segments`)
    } catch (err: any) {
      console.error('[SegmentBuilder] Analysis error:', err)
      setError(err.message || 'Failed to analyze scene')
      toast.error('Failed to analyze scene')
    } finally {
      setIsAnalyzing(false)
      setShowProductionOverlay(false)
      setProductionStage(0)
    }
  }, [sceneId, projectId, targetDuration, narrationDriven, audioMetadata, sceneBible.contentHash, hasSceneDirection, runProductionAnimation])

  const handlePromptEdit = useCallback((segmentId: string, newPrompt: string) => {
    setProposedSegments(prev => prev.map(seg => {
      if (seg.id !== segmentId) return seg
      return {
        ...seg,
        userEditedPrompt: newPrompt,
        isAdjusted: true,
      }
    }))
  }, [])

  const handleSegmentAdjust = useCallback((
    segmentId: string,
    changes: Partial<Pick<ProposedSegment, 'startTime' | 'endTime' | 'duration'>>
  ) => {
    setProposedSegments(prev => prev.map(seg => {
      if (seg.id !== segmentId) return seg
      
      const newStartTime = changes.startTime ?? seg.startTime
      const newEndTime = changes.endTime ?? seg.endTime
      const newDuration = newEndTime - newStartTime
      
      return {
        ...seg,
        startTime: newStartTime,
        endTime: newEndTime,
        duration: newDuration,
        isAdjusted: true,
      }
    }))
  }, [])

  // Open regeneration dialog with current settings
  const handleOpenRegenerateDialog = useCallback(() => {
    setRegenerationConfig({
      targetDuration,
      narrationDriven,
      preserveManualEdits: false,
    })
    setShowRegenerateDialog(true)
  }, [targetDuration, narrationDriven])
  
  // Unified reset — clears all builder state back to analyze phase
  const resetToAnalyze = useCallback(() => {
    setPhase('analyze')
    setError(null)
    setProposedDirections([])
    setProposedSegments([])
    setSelectedSegmentId(null)
    setSelectedDirectionId(null)
  }, [])

  // Confirm regeneration from dialog
  const handleConfirmRegenerate = useCallback(() => {
    // Apply config to generation options
    setTargetDuration(regenerationConfig.targetDuration)
    setNarrationDriven(regenerationConfig.narrationDriven)
    
    // Store current user-edited prompts if preserving
    const preservedEdits = regenerationConfig.preserveManualEdits
      ? proposedSegments
          .filter(s => s.userEditedPrompt)
          .map(s => ({ sequenceIndex: s.sequenceIndex, prompt: s.userEditedPrompt }))
      : []
    
    // Reset state for new generation (uses unified reset + dialog dismiss)
    resetToAnalyze()
    setShowRegenerateDialog(false)
    
    toast.info('Ready for regeneration - click Generate Segments')
  }, [regenerationConfig, proposedSegments, resetToAnalyze])
  
  // Quick regenerate (no dialog, same settings)
  const handleQuickRegenerate = useCallback(() => {
    resetToAnalyze()
  }, [resetToAnalyze])

  // -------------------------------------------------------------------------
  // Add Segment Handlers
  // -------------------------------------------------------------------------
  
  const handleOpenAddSegment = useCallback((insertAfterIndex?: number) => {
    setAddSegmentPosition(insertAfterIndex ?? proposedDirections.length - 1)
    setAddSegmentType(sceneBible.narration ? 'narration' : 'dialogue')
    setShowAddSegmentDialog(true)
  }, [proposedDirections.length, sceneBible.narration])

  const handleAddSegment = useCallback(() => {
    const insertIdx = addSegmentPosition + 1

    // Build narration text preview for narration segments
    const narrationPreview = sceneBible.narration
      ? sceneBible.narration.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ').substring(0, 100)
      : ''

    const newDirection: ProposedDirection = {
      id: `dir_${sceneId}_added_${Date.now()}`,
      sequenceIndex: insertIdx,
      estimatedDuration: targetDuration,
      shotType: addSegmentType === 'narration' ? 'Wide Shot' : 'Medium Shot',
      cameraMovement: addSegmentType === 'narration' ? 'Slow dolly in' : 'Static',
      cameraAngle: 'Eye-Level',
      lens: addSegmentType === 'narration' ? '24mm f/2.8' : '50mm f/1.4',
      talentAction: addSegmentType === 'narration' 
        ? `Atmospheric backdrop visuals illustrating: "${narrationPreview}..."`
        : '',
      emotionalBeat: addSegmentType === 'narration' ? 'Contemplative, atmospheric' : '',
      characters: addSegmentType === 'dialogue' 
        ? sceneBible.characters.slice(0, 1).map(c => c.name) 
        : [],
      isNoTalent: addSegmentType === 'narration',
      lightingMood: undefined,
      keyProps: [],
      dialogueLineIds: [],
      generationMethod: 'FTV',
      triggerReason: addSegmentType === 'narration' 
        ? 'User-added narration visual segment' 
        : addSegmentType === 'dialogue'
        ? 'User-added dialogue segment'
        : 'User-added custom segment',
      confidence: 100,
      transitionIn: insertIdx === 0 ? 'cut' : 'dissolve',
      startFrameDescription: addSegmentType === 'narration'
        ? `Establishing wide shot of ${sceneBible.location || sceneBible.heading}. Cinematic atmosphere.`
        : '',
      endFrameDescription: '',
      continuityNotes: '',
      isApproved: false,
      isUserEdited: true,
    }

    // Insert at position and re-index
    setProposedDirections(prev => {
      const updated = [...prev]
      updated.splice(insertIdx, 0, newDirection)
      // Re-index sequenceIndex
      return updated.map((d, idx) => ({ ...d, sequenceIndex: idx }))
    })

    setSelectedDirectionId(newDirection.id)
    setShowAddSegmentDialog(false)
    toast.success(`Added ${addSegmentType} segment at position ${insertIdx + 1}`)
  }, [addSegmentPosition, addSegmentType, sceneId, targetDuration, sceneBible])

  // -------------------------------------------------------------------------
  // Drag-to-Reorder Handlers
  // -------------------------------------------------------------------------
  
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }, [])

  const handleDragEnd = useCallback(() => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      setProposedDirections(prev => {
        const updated = [...prev]
        const [removed] = updated.splice(draggedIndex, 1)
        updated.splice(dragOverIndex, 0, removed)
        // Re-index sequenceIndex
        return updated.map((d, idx) => ({ ...d, sequenceIndex: idx, isUserEdited: true }))
      })
      toast.success(`Moved segment ${draggedIndex + 1} to position ${dragOverIndex + 1}`)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [draggedIndex, dragOverIndex])

  const handleMoveDirection = useCallback((fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
    if (toIndex < 0 || toIndex >= proposedDirections.length) return
    
    setProposedDirections(prev => {
      const updated = [...prev]
      const [removed] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, removed)
      return updated.map((d, idx) => ({ ...d, sequenceIndex: idx }))
    })
  }, [proposedDirections.length])

  const handleDeleteDirection = useCallback((directionId: string) => {
    setProposedDirections(prev => {
      const updated = prev.filter(d => d.id !== directionId)
      return updated.map((d, idx) => ({ ...d, sequenceIndex: idx }))
    })
    toast.success('Segment removed')
  }, [])

  // AI-assisted direction editing
  const handleAiAssistDirection = useCallback(async (directionId: string, instruction: string) => {
    const direction = proposedDirections.find(d => d.id === directionId)
    if (!direction) return

    setAiAssistLoading(directionId)
    try {
      // Build context from assigned audio lines
      const narrationSentences = sceneBible.narration
        ?.split(/(?<=[.!?])\s+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0) || []

      const assignedAudioText = direction.dialogueLineIds.map(id => {
        const idx = parseInt(id.replace('dialogue-', ''))
        if (idx < narrationSentences.length) {
          return `[Narration] ${narrationSentences[idx]}`
        }
        const dialogueIdx = idx - narrationSentences.length
        const dialogueLine = sceneBible.dialogue[dialogueIdx]
        if (dialogueLine) {
          return `[${dialogueLine.character}] ${dialogueLine.text}`
        }
        return null
      }).filter(Boolean).join('\n')

      const response = await fetch(`/api/scenes/${sceneId}/generate-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          preferredDuration: targetDuration,
          phase: 'assist-direction',
          directionContext: {
            currentDirection: direction,
            assignedAudioText,
            instruction,
            sceneHeading: sceneBible.heading,
            sceneDescription: sceneBible.visualDescription,
            characters: sceneBible.characters.map(c => c.name),
          },
        }),
      })

      if (!response.ok) {
        throw new Error('AI assist failed')
      }

      const data = await response.json()
      if (data.direction) {
        handleDirectionEdit(directionId, {
          ...data.direction,
          isUserEdited: true,
        })
        toast.success('AI updated segment direction')
      }
    } catch (err) {
      console.error('[SegmentBuilder] AI assist error:', err)
      toast.error('AI assist failed — try again')
    } finally {
      setAiAssistLoading(null)
    }
  }, [proposedDirections, sceneBible, sceneId, projectId, targetDuration, handleDirectionEdit])

  const handleFinalize = useCallback(() => {
    // Transform ProposedSegments to SceneSegments
    const finalSegments: SceneSegment[] = proposedSegments.map(seg => ({
      segmentId: seg.id,
      sequenceIndex: seg.sequenceIndex,
      startTime: seg.startTime,
      endTime: seg.endTime,
      status: 'READY' as const,
      generatedPrompt: seg.generatedPrompt,
      userEditedPrompt: seg.userEditedPrompt,
      activeAssetUrl: null,
      assetType: null,
      generationMethod: seg.generationMethod,
      triggerReason: seg.triggerReason,
      emotionalBeat: seg.emotionalBeat,
      dialogueLineIds: seg.dialogueLineIds,
      references: {
        startFrameUrl: null,
        endFrameUrl: null,
        useSceneFrame: seg.sequenceIndex === 0,
        characterRefs: [],
        characterIds: [],
        sceneRefIds: [],
        objectRefIds: [],
      },
      takes: [],
      // Prompt context for staleness detection
      promptContext: {
        dialogueHash: '',
        visualDescriptionHash: sceneBible.contentHash,
        generatedAt: new Date().toISOString(),
        sceneNumber: sceneBible.sceneNumber,
      },
      isStale: false,
    }))

    onSegmentsFinalized(finalSegments)
    toast.success(`Finalized ${finalSegments.length} segments - Ready for Key Frames`)
    
    if (onClose) {
      onClose()
    }
  }, [proposedSegments, sceneBible, onSegmentsFinalized, onClose])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Production Overlay */}
      <ProductionOverlay isVisible={showProductionOverlay} currentStage={productionStage} />
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-gray-900/60">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Segment Builder</h2>
          </div>
          <Badge variant="outline" className="border-gray-600 text-gray-400">Scene {sceneNumber}</Badge>
        </div>
        <PhaseIndicator
          currentPhase={phase}
          onPhaseClick={setPhase}
          canAdvance={canAdvance}
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-w-0 overflow-hidden">
        {/* Left Panel: Scene Bible (Read-Only) */}
        <div className="w-64 flex-shrink-0 border-r border-gray-700/50 bg-gray-900/40 p-4 overflow-y-auto">
          <SceneBiblePanel bible={sceneBible} />
        </div>

        {/* Center Panel: Timeline & Segments */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Phase: Analyze */}
          {phase === 'analyze' && (
            <div className="flex-1 flex items-center justify-center p-8">
              <Card className="w-full max-w-md bg-gray-900/60 border-gray-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    Scene Analysis
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Generate intelligent segments based on scene content (narration, dialogue, and scene changes)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Existing Segments Warning */}
                  {hasExistingSegments && (
                    <Alert className={cn(
                      "border",
                      existingSegmentsStale 
                        ? "border-amber-500/50 bg-amber-950/20" 
                        : "border-blue-500/50 bg-blue-950/20"
                    )}>
                      <div className="flex items-start gap-2">
                        {existingSegmentsStale ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                        ) : (
                          <Layers className="w-4 h-4 text-blue-500 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={cn(
                            "text-sm font-medium",
                            existingSegmentsStale ? "text-amber-400" : "text-blue-400"
                          )}>
                            {existingSegments.length} Existing Segments
                            {existingSegmentsStale && " (Scene Changed)"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {hasExistingVideoAssets ? (
                              <>
                                <span className="text-red-400 font-medium">Warning:</span> Regenerating will discard {existingSegments.filter(s => s.activeAssetUrl || s.takes?.length).length} generated video assets.
                              </>
                            ) : (
                              "Regenerating will replace current segment configuration."
                            )}
                          </p>
                        </div>
                      </div>
                    </Alert>
                  )}

                  {/* Duration Setting */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Target Segment Duration</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={4}
                        max={8}
                        step={1}
                        value={targetDuration}
                        onChange={e => setTargetDuration(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-12">{targetDuration}s</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Segments will be up to {targetDuration} seconds (Veo 3.1 optimal range: 4-8s)
                    </p>
                  </div>

                  {/* Narration-Driven Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-300">Narration-Driven</p>
                      <p className="text-xs text-gray-500">
                        Prioritize narration timing for segment boundaries
                      </p>
                    </div>
                    <Button
                      variant={narrationDriven ? 'default' : 'outline'}
                      size="sm"
                      className={narrationDriven ? 'bg-cyan-600 text-white hover:bg-cyan-500' : 'border-gray-600 text-gray-400 hover:bg-gray-800'}
                      onClick={() => setNarrationDriven(!narrationDriven)}
                    >
                      {narrationDriven ? 'On' : 'Off'}
                    </Button>
                  </div>

                  {/* Total Scene Duration Target */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300">Total Scene Duration</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-gray-500 hover:text-gray-300"
                        onClick={() => setTotalDurationTarget(null)}
                      >
                        {totalDurationTarget ? 'Clear' : 'Auto'}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={10}
                        max={120}
                        step={5}
                        value={totalDurationTarget ?? 30}
                        onChange={e => setTotalDurationTarget(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-16 text-right">
                        {totalDurationTarget ? `~${totalDurationTarget}s` : 'Auto'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {totalDurationTarget
                        ? `AI will target approximately ${totalDurationTarget}s total (may adjust ±10% for better cut points)`
                        : 'Let AI determine total duration based on content'}
                    </p>
                  </div>

                  {/* Segment Count Target */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300">Segment Count</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-gray-500 hover:text-gray-300"
                        onClick={() => setSegmentCountTarget(null)}
                      >
                        {segmentCountTarget ? 'Clear' : 'Auto'}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={2}
                        max={12}
                        step={1}
                        value={segmentCountTarget ?? 5}
                        onChange={e => setSegmentCountTarget(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-16 text-right">
                        {segmentCountTarget ? `${segmentCountTarget}` : 'Auto'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {segmentCountTarget
                        ? `AI will aim for ${segmentCountTarget} segments`
                        : 'Let AI determine optimal segment count'}
                    </p>
                  </div>

                  {/* Focus Mode */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Focus Mode</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['balanced', 'dialogue-focused', 'action-focused'] as const).map(mode => (
                        <Button
                          key={mode}
                          variant={focusMode === mode ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            'text-xs capitalize',
                            focusMode === mode
                              ? 'bg-cyan-600 text-white hover:bg-cyan-500 border-cyan-600'
                              : 'border-gray-600 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                          )}
                          onClick={() => setFocusMode(mode)}
                        >
                          {mode.replace('-', ' ')}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      {focusMode === 'balanced' && 'Balance dialogue and visual action in segments'}
                      {focusMode === 'dialogue-focused' && 'Prioritize dialogue coverage — combine visual beats'}
                      {focusMode === 'action-focused' && 'Prioritize visual action — combine dialogue lines'}
                    </p>
                  </div>

                  {/* Custom Instructions */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Director Notes (Optional)</label>
                    <textarea
                      value={customInstructions}
                      onChange={e => setCustomInstructions(e.target.value)}
                      placeholder="e.g., 'Emphasize the opening reveal' or 'Keep the pacing tight'"
                      className="w-full h-16 px-3 py-2 text-xs rounded-md border border-gray-700/50 bg-gray-800/50 text-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50 placeholder:text-gray-600"
                      maxLength={300}
                    />
                    <p className="text-xs text-gray-500">
                      {customInstructions.length}/300 — Free-form direction for the AI
                    </p>
                  </div>

                  {/* Scene Direction Requirement Warning */}
                  {!hasSceneDirection && (
                    <Alert className="border-amber-500/50 bg-amber-950/20">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <AlertDescription className="text-amber-200">
                        <strong>Scene direction required.</strong> Generate scene direction first to ensure segments follow your creative vision.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Error Display */}
                  {error && (
                    <div className="space-y-2">
                      <Alert variant="destructive">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetToAnalyze}
                        className="w-full"
                      >
                        <RefreshCw className="w-3 h-3 mr-2" />
                        Clear Error & Try Again
                      </Button>
                    </div>
                  )}

                  {/* Generate Button */}
                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !hasSceneDirection}
                    className={cn(
                      'w-full',
                      !hasExistingVideoAssets && 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20'
                    )}
                    size="lg"
                    variant={hasExistingVideoAssets ? 'destructive' : 'default'}
                    title={!hasSceneDirection ? 'Generate scene direction first' : undefined}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing Scene...
                      </>
                    ) : hasExistingSegments ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Regenerate Segments
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate Segments
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Phase: Directions Review */}
          {phase === 'directions' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Directions Header \u2014 Design-token aligned */}
              <div className="px-4 py-3 border-b border-sf-border bg-sf-surface/80">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium flex items-center gap-2 text-sf-text-primary">
                      <Eye className="w-4 h-4 text-sf-primary" />
                      Review Segment Directions
                    </h3>
                    <p className="text-xs text-sf-text-secondary mt-1">
                      Review and approve each segment's direction before generating video prompts
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-sf-primary border-sf-primary/30 bg-sf-primary/5">
                      {approvedDirectionCount}/{proposedDirections.length} Approved
                    </Badge>
                    <Badge variant="outline" className="border-sf-border text-sf-text-secondary bg-sf-surface-light/30">
                      ~{Math.round(totalDirectionsDuration)}s total
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Narration Coverage Warning */}
              {narrationCoverage && !narrationCoverage.isFullyCovered && (
                <div className="mx-4 mt-3">
                  <Alert className="border-amber-500/50 bg-amber-950/20">
                    <div className="flex items-start gap-2">
                      <Mic className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-300">
                          Narration Not Fully Covered
                        </p>
                        <p className="text-xs text-amber-200/70 mt-1">
                          {narrationCoverage.coveredCount} of {narrationCoverage.totalNarrationSentences} narration sentences 
                          are assigned to segments. {narrationCoverage.uncoveredIds.length} sentence{narrationCoverage.uncoveredIds.length > 1 ? 's' : ''} may 
                          not have visual accompaniment.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 h-7 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                          onClick={() => handleOpenAddSegment(proposedDirections.length - 1)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Narration Segment
                        </Button>
                      </div>
                    </div>
                  </Alert>
                </div>
              )}

              {/* Directions List with drag-to-reorder */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {proposedDirections.map((direction, idx) => (
                    <div 
                      key={direction.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "relative group",
                        dragOverIndex === idx && draggedIndex !== idx && "before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-sf-primary before:rounded-full before:z-10"
                      )}
                    >
                      {/* Drag handle + reorder controls */}
                      <div className="absolute -left-0 top-3 z-10 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveDirection(idx, 'up') }}
                          disabled={idx === 0}
                          className="p-0.5 text-sf-text-disabled hover:text-sf-text-secondary disabled:opacity-30"
                          title="Move up"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <GripVertical className="w-3.5 h-3.5 text-sf-text-disabled cursor-grab active:cursor-grabbing" />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveDirection(idx, 'down') }}
                          disabled={idx === proposedDirections.length - 1}
                          className="p-0.5 text-sf-text-disabled hover:text-sf-text-secondary disabled:opacity-30"
                          title="Move down"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="ml-5">
                        <SegmentDirectionCard
                          direction={direction}
                          index={idx}
                          dialogueLines={sceneBible.dialogue}
                          isSelected={selectedDirectionId === direction.id}
                          onSelect={() => setSelectedDirectionId(direction.id)}
                          onEdit={(updates) => handleDirectionEdit(direction.id, updates)}
                          onApprove={() => handleDirectionApprove(direction.id)}
                          onDelete={() => handleDeleteDirection(direction.id)}
                          onAiAssist={(instruction) => handleAiAssistDirection(direction.id, instruction)}
                          isAiAssistLoading={aiAssistLoading === direction.id}
                          narrationText={sceneBible.narration || undefined}
                          onGeneratePrompt={() => handleGenerateSinglePrompt(direction.id)}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Add Segment Button at bottom */}
                  <button
                    onClick={() => handleOpenAddSegment(proposedDirections.length - 1)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 border-dashed border-sf-border hover:border-sf-primary/50 hover:bg-sf-surface-light/30 text-sf-text-disabled hover:text-sf-primary transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add Segment</span>
                  </button>
                </div>
              </ScrollArea>

              {/* Actions Bar \u2014 Design-token aligned */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-sf-border bg-sf-surface/80">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApproveAll}
                    className="border-sf-border hover:border-emerald-500/50"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Approve All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetToAnalyze}
                    className="text-sf-text-secondary hover:text-sf-text-primary"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Start Over
                  </Button>
                </div>
                <Button
                  onClick={handleGeneratePrompts}
                  disabled={approvedDirectionCount === 0 || isGeneratingPrompts}
                  size="lg"
                  className="bg-gradient-to-r from-sf-primary to-sf-accent hover:from-sf-primary-dark hover:to-sf-accent text-white shadow-lg shadow-sf-primary/20"
                >
                  {isGeneratingPrompts ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Prompts...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate Prompts ({approvedDirectionCount})
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Phase: Review */}
          {phase === 'review' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Timeline Preview */}
              <div className="h-48 border-b border-gray-700/50 p-4 overflow-hidden">
                <SegmentPreviewTimeline
                  segments={proposedSegments}
                  sceneBible={sceneBible}
                  selectedSegmentId={selectedSegmentId}
                  onSelectSegment={setSelectedSegmentId}
                  onAdjustSegment={handleSegmentAdjust}
                  totalDuration={totalDuration}
                />
              </div>

              {/* Segment Editor */}
              <div className="flex-1 overflow-y-auto p-4">
                {selectedSegment ? (
                  <SegmentPromptEditor
                    segment={selectedSegment}
                    sceneBible={sceneBible}
                    validation={allValidations.find(v => v.segmentId === selectedSegment.id)?.validation}
                    onPromptChange={handlePromptEdit}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p>Select a segment to edit</p>
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50 bg-gray-900/40">
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="font-medium text-white">{proposedSegments.length}</span>{' '}
                    <span className="text-gray-400">segments</span>
                  </div>
                  <div className="text-sm">
                    <Clock className="w-3 h-3 inline mr-1" />
                    <span className="font-mono text-white">{totalDuration.toFixed(1)}s</span>{' '}
                    <span className="text-gray-400">total</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Staleness Warning */}
                  {isStale && (
                    <Badge variant="outline" className="text-amber-500 border-amber-500/50 gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Scene Changed
                    </Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={handleQuickRegenerate}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Quick Regen
                  </Button>
                  <Button variant="outline" onClick={handleOpenRegenerateDialog}>
                    <Settings2 className="w-4 h-4 mr-2" />
                    Regenerate...
                  </Button>
                  <Button
                    onClick={() => setPhase('finalize')}
                    disabled={!canAdvance.finalize}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20"
                  >
                    Continue to Finalize
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Phase: Finalize */}
          {phase === 'finalize' && (
            <div className="flex-1 flex items-center justify-center p-8">
              <Card className="w-full max-w-lg bg-gray-900/60 border-gray-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Check className="w-5 h-5 text-emerald-400" />
                    Ready to Finalize
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Review your segments before proceeding to Key Frame generation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary */}
                  <div className="bg-gray-800/50 rounded-lg p-4 space-y-2 border border-gray-700/30">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Total Segments:</span>
                      <span className="font-medium text-white">{proposedSegments.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Total Duration:</span>
                      <span className="font-medium font-mono text-white">{totalDuration.toFixed(1)}s</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Dialogue Lines Covered:</span>
                      <span className="font-medium text-white">
                        {new Set(proposedSegments.flatMap(s => s.dialogueLineIds)).size} / {sceneBible.dialogue.length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">User Adjusted:</span>
                      <span className="font-medium text-white">
                        {proposedSegments.filter(s => s.isAdjusted).length} segments
                      </span>
                    </div>
                  </div>

                  {/* Validation Warnings */}
                  {allValidations.some(v => !v.validation.isValid) && (
                    <Alert variant="destructive">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription>
                        Some segments have validation issues. Please review before finalizing.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPhase('review')}
                      className="flex-1"
                    >
                      Back to Review
                    </Button>
                    <Button
                      onClick={handleFinalize}
                      className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Finalize & Proceed
                    </Button>
                  </div>

                  <p className="text-xs text-center text-gray-500">
                    After finalizing, proceed to the Frame tab to generate key frames for each segment
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Regeneration Configuration Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              Regenerate Segments
            </DialogTitle>
            <DialogDescription>
              Configure options for segment regeneration. Current proposals will be discarded.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Staleness Warning */}
            {isStale && (
              <Alert className="border-amber-500/50 bg-amber-950/20">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <AlertDescription className="text-amber-400">
                  Scene content has changed since last generation. Regeneration recommended.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Duration Setting */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Segment Duration</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={4}
                  max={8}
                  step={1}
                  value={regenerationConfig.targetDuration}
                  onChange={e => setRegenerationConfig(prev => ({
                    ...prev,
                    targetDuration: parseInt(e.target.value)
                  }))}
                  className="flex-1"
                />
                <span className="text-sm font-mono w-12">{regenerationConfig.targetDuration}s</span>
              </div>
            </div>

            {/* Narration-Driven Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Narration-Driven</p>
                <p className="text-xs text-muted-foreground">
                  Prioritize narration timing for segment boundaries
                </p>
              </div>
              <Button
                variant={regenerationConfig.narrationDriven ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRegenerationConfig(prev => ({
                  ...prev,
                  narrationDriven: !prev.narrationDriven
                }))}
              >
                {regenerationConfig.narrationDriven ? 'On' : 'Off'}
              </Button>
            </div>

            {/* Preserve Manual Edits Toggle */}
            {proposedSegments.some(s => s.userEditedPrompt) && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Preserve Manual Edits</p>
                  <p className="text-xs text-muted-foreground">
                    Attempt to reapply your prompt edits to matching segments
                  </p>
                </div>
                <Button
                  variant={regenerationConfig.preserveManualEdits ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRegenerationConfig(prev => ({
                    ...prev,
                    preserveManualEdits: !prev.preserveManualEdits
                  }))}
                >
                  {regenerationConfig.preserveManualEdits ? 'Yes' : 'No'}
                </Button>
              </div>
            )}

            {/* Warning about discarding current work */}
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                {proposedSegments.filter(s => s.isAdjusted).length > 0 
                  ? `${proposedSegments.filter(s => s.isAdjusted).length} adjusted segment(s) will be discarded.`
                  : 'Current segment proposals will be discarded.'}
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowRegenerateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRegenerate}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Segment Dialog */}
      <Dialog open={showAddSegmentDialog} onOpenChange={setShowAddSegmentDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-sf-primary" />
              Add Segment
            </DialogTitle>
            <DialogDescription>
              Add a new segment direction. Choose a preset type or create a custom one.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Segment Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-sf-text-primary">Segment Type</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setAddSegmentType('narration')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-center',
                    addSegmentType === 'narration'
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                      : 'border-sf-border hover:border-sf-border-strong text-sf-text-secondary'
                  )}
                >
                  <Mic className="w-5 h-5" />
                  <span className="text-sm font-medium">Narration Visual</span>
                  <span className="text-xs opacity-70">Backdrop for voiceover</span>
                </button>
                <button
                  onClick={() => setAddSegmentType('dialogue')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-center',
                    addSegmentType === 'dialogue'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                      : 'border-sf-border hover:border-sf-border-strong text-sf-text-secondary'
                  )}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-sm font-medium">Dialogue</span>
                  <span className="text-xs opacity-70">Character speaking</span>
                </button>
                <button
                  onClick={() => setAddSegmentType('custom')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-center',
                    addSegmentType === 'custom'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                      : 'border-sf-border hover:border-sf-border-strong text-sf-text-secondary'
                  )}
                >
                  <Film className="w-5 h-5" />
                  <span className="text-sm font-medium">Custom</span>
                  <span className="text-xs opacity-70">B-roll, title, etc.</span>
                </button>
              </div>
            </div>

            {/* Insert Position */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-sf-text-primary">Insert After</label>
              <Select
                value={addSegmentPosition.toString()}
                onValueChange={v => setAddSegmentPosition(parseInt(v))}
              >
                <SelectTrigger className="h-9 text-sm bg-sf-surface border-sf-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-1">At the beginning</SelectItem>
                  {proposedDirections.map((d, idx) => (
                    <SelectItem key={d.id} value={idx.toString()}>
                      Segment {idx + 1}: {d.shotType} — {d.triggerReason.substring(0, 40)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Narration Preview (if narration type selected) */}
            {addSegmentType === 'narration' && sceneBible.narration && (
              <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-medium text-indigo-300 uppercase tracking-wider">Scene Narration</span>
                </div>
                <p className="text-sm text-indigo-200/80 italic leading-relaxed">
                  &ldquo;{sceneBible.narration.substring(0, 200)}{sceneBible.narration.length > 200 ? '...' : ''}&rdquo;
                </p>
                <p className="text-xs text-indigo-400/60 mt-2">
                  The AI will generate atmospheric backdrop visuals to illustrate this narration.
                </p>
              </div>
            )}

            {/* Info about what gets created */}
            <div className="p-3 rounded-lg bg-sf-surface-light border border-sf-border">
              <p className="text-xs text-sf-text-secondary">
                {addSegmentType === 'narration' && (
                  <>A <strong>no-talent backdrop segment</strong> will be created with wide-shot establishing visuals. You can edit the direction after adding it.</>
                )}
                {addSegmentType === 'dialogue' && (
                  <>A <strong>dialogue segment</strong> will be created. Edit it to assign specific dialogue lines and set the speaking character.</>
                )}
                {addSegmentType === 'custom' && (
                  <>A <strong>blank segment</strong> will be created. Fill in all direction fields manually for full control.</>
                )}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowAddSegmentDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddSegment}
              className="bg-sf-primary hover:bg-sf-primary-dark text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Segment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SegmentBuilder
