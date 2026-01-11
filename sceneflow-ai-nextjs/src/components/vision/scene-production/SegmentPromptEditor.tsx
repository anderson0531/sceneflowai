'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Camera,
  Film,
  Sparkles,
  Lock,
  Unlock,
  Eye,
  Volume2,
  MessageSquare,
  Palette,
  Move3d,
  Zap,
  Info,
  RefreshCw,
  Copy,
  Lightbulb,
} from 'lucide-react'
import type { SceneBible, ProposedSegment } from './SegmentBuilder'
import type { ValidationResult } from '@/lib/intelligence/SegmentValidation'

// ============================================================================
// Types & Interfaces
// ============================================================================

interface SegmentPromptEditorProps {
  segment: ProposedSegment
  sceneBible: SceneBible
  validation?: ValidationResult
  onPromptChange: (segmentId: string, newPrompt: string) => void
}

/**
 * Prompt structure for guided editing
 */
interface PromptComponents {
  // Locked (from Scene Bible) - user cannot edit
  setting: string      // Location, time of day
  characters: string   // Who is present
  dialogue: string     // Lines covered by this segment
  narration: string    // Narration text if any
  
  // Editable (cinematography & style)
  shotType: string
  cameraAngle: string
  cameraMovement: string
  lighting: string
  mood: string
  pacing: string
  additionalDirection: string
}

// ============================================================================
// Constants
// ============================================================================

const SHOT_TYPES = [
  { value: 'wide', label: 'Wide Shot', description: 'Full environment view' },
  { value: 'medium', label: 'Medium Shot', description: 'Waist-up framing' },
  { value: 'close-up', label: 'Close-Up', description: 'Face/detail focus' },
  { value: 'extreme-close-up', label: 'Extreme Close-Up', description: 'Eyes/specific detail' },
  { value: 'over-shoulder', label: 'Over the Shoulder', description: 'Dialogue framing' },
  { value: 'two-shot', label: 'Two Shot', description: 'Two characters together' },
  { value: 'establishing', label: 'Establishing Shot', description: 'Location context' },
]

const CAMERA_ANGLES = [
  { value: 'eye-level', label: 'Eye Level', description: 'Neutral perspective' },
  { value: 'low-angle', label: 'Low Angle', description: 'Subject appears powerful' },
  { value: 'high-angle', label: 'High Angle', description: 'Subject appears vulnerable' },
  { value: 'dutch-angle', label: 'Dutch Angle', description: 'Tilted, unsettling' },
  { value: 'birds-eye', label: "Bird's Eye", description: 'Directly above' },
  { value: 'worms-eye', label: "Worm's Eye", description: 'From ground looking up' },
]

const CAMERA_MOVEMENTS = [
  { value: 'static', label: 'Static', description: 'No camera movement' },
  { value: 'slow-push', label: 'Slow Push In', description: 'Gradual zoom toward subject' },
  { value: 'slow-pull', label: 'Slow Pull Back', description: 'Gradual zoom away' },
  { value: 'pan-left', label: 'Pan Left', description: 'Horizontal sweep left' },
  { value: 'pan-right', label: 'Pan Right', description: 'Horizontal sweep right' },
  { value: 'tilt-up', label: 'Tilt Up', description: 'Vertical sweep upward' },
  { value: 'tilt-down', label: 'Tilt Down', description: 'Vertical sweep downward' },
  { value: 'tracking', label: 'Tracking Shot', description: 'Follow subject movement' },
  { value: 'dolly', label: 'Dolly Shot', description: 'Camera moves on track' },
  { value: 'orbit', label: 'Orbit', description: 'Circle around subject' },
]

const LIGHTING_STYLES = [
  { value: 'natural', label: 'Natural Light' },
  { value: 'dramatic', label: 'Dramatic Shadows' },
  { value: 'soft', label: 'Soft/Diffused' },
  { value: 'high-key', label: 'High Key (Bright)' },
  { value: 'low-key', label: 'Low Key (Dark)' },
  { value: 'rim', label: 'Rim Lighting' },
  { value: 'silhouette', label: 'Silhouette' },
]

const MOOD_OPTIONS = [
  { value: 'tense', label: 'Tense' },
  { value: 'calm', label: 'Calm' },
  { value: 'energetic', label: 'Energetic' },
  { value: 'melancholic', label: 'Melancholic' },
  { value: 'hopeful', label: 'Hopeful' },
  { value: 'mysterious', label: 'Mysterious' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'comedic', label: 'Comedic' },
]

const PACING_OPTIONS = [
  { value: 'slow', label: 'Slow', description: 'Contemplative, lingering' },
  { value: 'moderate', label: 'Moderate', description: 'Natural rhythm' },
  { value: 'fast', label: 'Fast', description: 'Quick cuts, urgency' },
  { value: 'building', label: 'Building', description: 'Starts slow, accelerates' },
]

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract locked content from scene bible for this segment
 */
function extractLockedContent(segment: ProposedSegment, sceneBible: SceneBible): Partial<PromptComponents> {
  // Get dialogue lines covered by this segment
  const dialogueLines = sceneBible.dialogue.filter(d => 
    segment.dialogueLineIds.includes(d.id)
  )

  const dialogueText = dialogueLines.length > 0
    ? dialogueLines.map(d => `${d.character}: "${d.text}"`).join(' | ')
    : ''

  const characterNames = [...new Set(dialogueLines.map(d => d.character))]
  const charactersText = characterNames.length > 0
    ? characterNames.join(', ')
    : 'No speaking characters'

  return {
    setting: `${sceneBible.location} - ${sceneBible.timeOfDay}`,
    characters: charactersText,
    dialogue: dialogueText,
    narration: sceneBible.narration || '',
  }
}

/**
 * Parse AI-generated prompt to extract cinematography components
 */
function parsePromptComponents(prompt: string): Partial<PromptComponents> {
  // Simple heuristic parsing - in production this could be more sophisticated
  const components: Partial<PromptComponents> = {
    shotType: 'medium',
    cameraAngle: 'eye-level',
    cameraMovement: 'static',
    lighting: 'natural',
    mood: 'moderate',
    pacing: 'moderate',
    additionalDirection: '',
  }

  // Detect shot type
  if (prompt.toLowerCase().includes('close-up') || prompt.toLowerCase().includes('closeup')) {
    components.shotType = 'close-up'
  } else if (prompt.toLowerCase().includes('wide shot') || prompt.toLowerCase().includes('establishing')) {
    components.shotType = 'wide'
  } else if (prompt.toLowerCase().includes('over the shoulder') || prompt.toLowerCase().includes('over-shoulder')) {
    components.shotType = 'over-shoulder'
  }

  // Detect camera movement
  if (prompt.toLowerCase().includes('push in') || prompt.toLowerCase().includes('zoom in')) {
    components.cameraMovement = 'slow-push'
  } else if (prompt.toLowerCase().includes('pull back') || prompt.toLowerCase().includes('zoom out')) {
    components.cameraMovement = 'slow-pull'
  } else if (prompt.toLowerCase().includes('tracking') || prompt.toLowerCase().includes('follow')) {
    components.cameraMovement = 'tracking'
  } else if (prompt.toLowerCase().includes('orbit') || prompt.toLowerCase().includes('circle')) {
    components.cameraMovement = 'orbit'
  }

  // Detect mood
  if (prompt.toLowerCase().includes('tense') || prompt.toLowerCase().includes('tension')) {
    components.mood = 'tense'
  } else if (prompt.toLowerCase().includes('calm') || prompt.toLowerCase().includes('peaceful')) {
    components.mood = 'calm'
  }

  return components
}

/**
 * Compile prompt components back into a full prompt
 */
function compilePrompt(
  lockedContent: Partial<PromptComponents>,
  editableContent: Partial<PromptComponents>,
  originalPrompt: string
): string {
  const parts: string[] = []

  // Setting context (from locked content)
  if (lockedContent.setting) {
    parts.push(`Setting: ${lockedContent.setting}.`)
  }

  // Camera direction (editable)
  const shotLabel = SHOT_TYPES.find(s => s.value === editableContent.shotType)?.label || 'Medium Shot'
  const angleLabel = CAMERA_ANGLES.find(a => a.value === editableContent.cameraAngle)?.label || 'Eye Level'
  const movementLabel = CAMERA_MOVEMENTS.find(m => m.value === editableContent.cameraMovement)?.label || 'Static'
  
  parts.push(`${shotLabel}, ${angleLabel.toLowerCase()}, ${movementLabel.toLowerCase()}.`)

  // Lighting and mood (editable)
  const lightingLabel = LIGHTING_STYLES.find(l => l.value === editableContent.lighting)?.label || 'Natural Light'
  const moodLabel = MOOD_OPTIONS.find(m => m.value === editableContent.mood)?.label || 'Moderate'
  
  parts.push(`${lightingLabel}, ${moodLabel.toLowerCase()} atmosphere.`)

  // Characters and action (from original AI prompt, not editable)
  // We preserve the AI's character description and action since those are scene bible derived
  const actionMatch = originalPrompt.match(/(?:action|movement|expression|gesture)[:\s]+([^.]+)/i)
  if (actionMatch) {
    parts.push(actionMatch[1].trim() + '.')
  }

  // Additional direction (editable)
  if (editableContent.additionalDirection) {
    parts.push(editableContent.additionalDirection)
  }

  return parts.join(' ').trim()
}

// ============================================================================
// Locked Content Display Component
// ============================================================================

interface LockedContentProps {
  label: string
  value: string
  icon: React.ReactNode
}

function LockedContent({ label, value, icon }: LockedContentProps) {
  if (!value) return null

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-amber-500">{label}</span>
        <Lock className="w-3 h-3 text-amber-500/50" />
      </div>
      <div className="bg-amber-950/20 border border-amber-500/20 rounded px-2 py-1">
        <p className="text-xs text-foreground/80">{value}</p>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function SegmentPromptEditor({
  segment,
  sceneBible,
  validation,
  onPromptChange,
}: SegmentPromptEditorProps) {
  const [activeTab, setActiveTab] = useState<'guided' | 'advanced'>('guided')
  const [advancedPrompt, setAdvancedPrompt] = useState(
    segment.userEditedPrompt || segment.generatedPrompt
  )

  // Extract locked content from scene bible
  const lockedContent = useMemo(
    () => extractLockedContent(segment, sceneBible),
    [segment, sceneBible]
  )

  // Parse current prompt into editable components
  const [editableContent, setEditableContent] = useState<Partial<PromptComponents>>(() => 
    parsePromptComponents(segment.generatedPrompt)
  )

  // Compile full prompt from components
  const compiledPrompt = useMemo(
    () => compilePrompt(lockedContent, editableContent, segment.generatedPrompt),
    [lockedContent, editableContent, segment.generatedPrompt]
  )

  // Check for guardrail violations in advanced mode
  const guardrailWarnings = useMemo(() => {
    const warnings: string[] = []
    const prompt = advancedPrompt.toLowerCase()

    // Check for new characters not in scene bible
    const bibleCharacters = sceneBible.characters.map(c => c.name.toLowerCase())
    const commonNames = ['john', 'jane', 'michael', 'sarah', 'david', 'emma', 'alex', 'sam']
    commonNames.forEach(name => {
      if (prompt.includes(name) && !bibleCharacters.some(c => c.includes(name))) {
        warnings.push(`Character "${name}" not found in scene. Did you mean to add a new character?`)
      }
    })

    // Check for location changes
    const locationKeywords = ['moves to', 'arrives at', 'enters the', 'walks into', 'new location']
    locationKeywords.forEach(keyword => {
      if (prompt.includes(keyword)) {
        warnings.push(`Prompt suggests location change. Scene location is: ${sceneBible.location}`)
      }
    })

    // Check for dialogue rewrites
    if (prompt.includes('"') && sceneBible.dialogue.length > 0) {
      const quotedText = prompt.match(/"([^"]+)"/g)
      if (quotedText) {
        const bibleDialogue = sceneBible.dialogue.map(d => d.text.toLowerCase())
        quotedText.forEach(qt => {
          const cleanQuote = qt.replace(/"/g, '').toLowerCase()
          if (!bibleDialogue.some(d => d.includes(cleanQuote.substring(0, 20)))) {
            warnings.push(`Dialogue "${cleanQuote.substring(0, 30)}..." doesn't match scene script.`)
          }
        })
      }
    }

    return warnings
  }, [advancedPrompt, sceneBible])

  // Handle editable component changes
  const handleEditableChange = useCallback((key: keyof PromptComponents, value: string) => {
    setEditableContent(prev => ({ ...prev, [key]: value }))
  }, [])

  // Apply changes from guided mode
  const handleApplyGuided = useCallback(() => {
    onPromptChange(segment.id, compiledPrompt)
  }, [segment.id, compiledPrompt, onPromptChange])

  // Apply changes from advanced mode
  const handleApplyAdvanced = useCallback(() => {
    onPromptChange(segment.id, advancedPrompt)
  }, [segment.id, advancedPrompt, onPromptChange])

  // Reset to AI-generated prompt
  const handleReset = useCallback(() => {
    setAdvancedPrompt(segment.generatedPrompt)
    setEditableContent(parsePromptComponents(segment.generatedPrompt))
  }, [segment.generatedPrompt])

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Segment {segment.sequenceIndex + 1} Prompt</CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {segment.generationMethod}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {validation && (
              <Badge
                variant={validation.isValid ? 'default' : 'destructive'}
                className="text-[10px]"
              >
                {validation.isValid ? (
                  <><CheckCircle2 className="w-3 h-3 mr-1" /> Valid</>
                ) : (
                  <><AlertCircle className="w-3 h-3 mr-1" /> Issues</>
                )}
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RefreshCw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs">
          Edit cinematography and style. Scene content is locked to maintain script integrity.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'guided' | 'advanced')} className="flex-1 flex flex-col">
          <TabsList className="mb-3">
            <TabsTrigger value="guided" className="text-xs">
              <Lightbulb className="w-3 h-3 mr-1" />
              Guided Mode
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs">
              <Unlock className="w-3 h-3 mr-1" />
              Advanced Mode
            </TabsTrigger>
          </TabsList>

          {/* Guided Mode */}
          <TabsContent value="guided" className="flex-1 overflow-y-auto space-y-4">
            {/* Locked Content Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-500">Scene Bible (Read-Only)</span>
              </div>
              <div className="grid gap-2 p-3 bg-amber-950/10 rounded-lg border border-amber-500/20">
                <LockedContent
                  label="Setting"
                  value={lockedContent.setting || ''}
                  icon={<Eye className="w-3 h-3 text-muted-foreground" />}
                />
                <LockedContent
                  label="Characters"
                  value={lockedContent.characters || ''}
                  icon={<MessageSquare className="w-3 h-3 text-muted-foreground" />}
                />
                {lockedContent.dialogue && (
                  <LockedContent
                    label="Dialogue"
                    value={lockedContent.dialogue}
                    icon={<MessageSquare className="w-3 h-3 text-muted-foreground" />}
                  />
                )}
              </div>
            </div>

            <Separator />

            {/* Editable Content Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Unlock className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Cinematography (Editable)</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Shot Type */}
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Camera className="w-3 h-3" /> Shot Type
                  </Label>
                  <Select
                    value={editableContent.shotType}
                    onValueChange={(v) => handleEditableChange('shotType', v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHOT_TYPES.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Camera Angle */}
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Move3d className="w-3 h-3" /> Camera Angle
                  </Label>
                  <Select
                    value={editableContent.cameraAngle}
                    onValueChange={(v) => handleEditableChange('cameraAngle', v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMERA_ANGLES.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Camera Movement */}
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Film className="w-3 h-3" /> Camera Movement
                  </Label>
                  <Select
                    value={editableContent.cameraMovement}
                    onValueChange={(v) => handleEditableChange('cameraMovement', v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMERA_MOVEMENTS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Lighting */}
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Lighting
                  </Label>
                  <Select
                    value={editableContent.lighting}
                    onValueChange={(v) => handleEditableChange('lighting', v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LIGHTING_STYLES.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Mood */}
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Palette className="w-3 h-3" /> Mood
                  </Label>
                  <Select
                    value={editableContent.mood}
                    onValueChange={(v) => handleEditableChange('mood', v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOOD_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pacing */}
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Pacing
                  </Label>
                  <Select
                    value={editableContent.pacing}
                    onValueChange={(v) => handleEditableChange('pacing', v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PACING_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Additional Direction */}
              <div className="space-y-1">
                <Label className="text-xs">Additional Direction (Optional)</Label>
                <Textarea
                  value={editableContent.additionalDirection || ''}
                  onChange={(e) => handleEditableChange('additionalDirection', e.target.value)}
                  placeholder="Add specific visual direction (e.g., 'rack focus to background', 'silhouette against window')"
                  className="h-16 text-xs resize-none"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Compiled Prompt Preview</Label>
              <div className="bg-muted/30 rounded p-2 text-xs text-foreground/80 max-h-20 overflow-y-auto">
                {compiledPrompt}
              </div>
            </div>

            {/* Apply Button */}
            <Button onClick={handleApplyGuided} className="w-full" size="sm">
              <Check className="w-3 h-3 mr-1" />
              Apply Changes
            </Button>
          </TabsContent>

          {/* Advanced Mode */}
          <TabsContent value="advanced" className="flex-1 overflow-y-auto space-y-4">
            {/* Guardrail Warnings */}
            {guardrailWarnings.length > 0 && (
              <Alert variant="default" className="border-yellow-500/50 bg-yellow-950/20">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <AlertDescription className="text-xs">
                  <p className="font-medium text-yellow-500 mb-1">Guardrail Warnings:</p>
                  <ul className="list-disc list-inside space-y-1 text-foreground/80">
                    {guardrailWarnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Scene Bible Reference */}
            <div className="p-2 bg-amber-950/10 rounded border border-amber-500/20">
              <div className="flex items-center gap-1 mb-1">
                <Info className="w-3 h-3 text-amber-500" />
                <span className="text-[10px] text-amber-500 font-medium">Scene Bible Reference</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                <strong>Location:</strong> {sceneBible.location} • <strong>Time:</strong> {sceneBible.timeOfDay}
              </p>
              {sceneBible.dialogue.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  <strong>Characters:</strong> {[...new Set(sceneBible.dialogue.map(d => d.character))].join(', ')}
                </p>
              )}
            </div>

            {/* Free-form Prompt Editor */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Video Generation Prompt</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-[9px] cursor-help">
                        <AlertTriangle className="w-2 h-2 mr-1" />
                        Soft Guardrails
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Advanced mode allows free editing but will warn if your prompt 
                        introduces elements not in the scene script. The scene description, 
                        narration, and dialogue should not be changed here.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Textarea
                value={advancedPrompt}
                onChange={(e) => setAdvancedPrompt(e.target.value)}
                placeholder="Enter your video generation prompt..."
                className="min-h-[150px] text-xs font-mono resize-none"
              />
              <p className="text-[10px] text-muted-foreground">
                Focus on cinematography, camera movement, and visual style. 
                Do not change scene content, dialogue, or characters.
              </p>
            </div>

            {/* Apply Button */}
            <Button 
              onClick={handleApplyAdvanced} 
              className="w-full" 
              size="sm"
              variant={guardrailWarnings.length > 0 ? 'outline' : 'default'}
            >
              {guardrailWarnings.length > 0 ? (
                <>
                  <AlertTriangle className="w-3 h-3 mr-1 text-yellow-500" />
                  Apply with Warnings
                </>
              ) : (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Apply Changes
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default SegmentPromptEditor
