'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { 
  Wand2, 
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Image as ImageIcon,
  Video,
  ChevronDown,
  ChevronUp,
  Layers,
  RefreshCw,
  Copy,
  ClipboardPaste,
  Sparkles,
  Film
} from 'lucide-react'
import { artStylePresets, type ArtStylePreset } from '@/constants/artStylePresets'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { SegmentPairCard } from './SegmentPairCard'
import { FramePromptDialog, type FrameGenerationOptions } from './FramePromptDialog'
import type { 
  SceneSegment, 
  AnchorStatus 
} from './types'
import type { DetailedSceneDirection } from '@/types/scene-direction'

// ============================================================================
// Types
// ============================================================================

export interface SegmentFrameTimelineProps {
  segments: SceneSegment[]
  sceneId: string
  sceneNumber: number
  sceneImageUrl?: string | null
  selectedSegmentIndex: number | null
  onSelectSegment: (index: number) => void
  onGenerateFrames: (segmentId: string, frameType: 'start' | 'end' | 'both', options?: {
    customPrompt?: string
    negativePrompt?: string
    usePreviousEndFrame?: boolean
    previousEndFrameUrl?: string
  }) => Promise<void>
  onGenerateAllFrames: () => Promise<void>
  onGenerateVideo: (segmentId: string) => void
  onOpenDirectorConsole?: () => void
  onEditFrame?: (segmentId: string, frameType: 'start' | 'end', frameUrl: string) => void
  onUploadFrame?: (segmentId: string, frameType: 'start' | 'end', file: File) => void
  /** Update segment animatic settings for Screening Room (duration) */
  onSegmentAnimaticSettingsChange?: (segmentId: string, settings: { imageDuration?: number }) => void
  isGenerating: boolean
  generatingSegmentId?: string | null
  generatingPhase?: 'start' | 'end' | 'video'
  characters?: Array<{
    name: string
    appearance?: string
    referenceUrl?: string
  }>
  /** Scene direction for intelligent prompt building */
  sceneDirection?: DetailedSceneDirection | null
  /** Callback to trigger segment regeneration - optionally accepts pre-parsed segments */
  onResegment?: (segments?: any[]) => void
  /** 
   * TEMPORARY WORKAROUND: Scene data for copy prompt functionality
   * TODO: Remove when Vertex AI billing is resolved and direct API calls work
   */
  sceneNarration?: string
  sceneDialogue?: Array<{ character?: string; speaker?: string; line?: string; text?: string; duration?: number }>
  targetSegmentDuration?: number
  /** Audio duration for narration track (seconds) */
  narrationAudioDuration?: number
  /** Audio durations for each dialogue line (seconds) */
  dialogueAudioDurations?: Array<{ character?: string; duration: number }>
  /** Scene heading (e.g., "INT. APARTMENT - NIGHT") */
  sceneHeading?: string
  /** Visual description/action of the scene */
  sceneVisualDescription?: string
  /** Art style preset ID for prompt generation (default: 'photorealistic') */
  artStyle?: string
  /** Transition delay between audio clips in seconds (default: 2.0) */
  audioTransitionDelay?: number
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateTimelineStats(segments: SceneSegment[]) {
  const total = segments.length
  const fullyAnchored = segments.filter(s => 
    (s.anchorStatus === 'fully-anchored') || 
    (s.startFrameUrl && s.endFrameUrl) ||
    (s.references?.startFrameUrl && s.references?.endFrameUrl)
  ).length
  const startLocked = segments.filter(s => 
    s.anchorStatus === 'start-locked' || 
    s.anchorStatus === 'end-pending' ||
    (s.startFrameUrl || s.references?.startFrameUrl) && !(s.endFrameUrl || s.references?.endFrameUrl)
  ).length
  const pending = total - fullyAnchored - startLocked
  
  const totalDuration = segments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0)
  const anchoredDuration = segments
    .filter(s => s.anchorStatus === 'fully-anchored' || (s.startFrameUrl && s.endFrameUrl))
    .reduce((sum, s) => sum + (s.endTime - s.startTime), 0)
  
  const progressPercent = total > 0 ? (fullyAnchored / total) * 100 : 0
  
  return {
    total,
    fullyAnchored,
    startLocked,
    pending,
    totalDuration,
    anchoredDuration,
    progressPercent
  }
}

// ============================================================================
// SegmentFrameTimeline Component
// ============================================================================

export function SegmentFrameTimeline({
  segments,
  sceneId,
  sceneNumber,
  sceneImageUrl,
  selectedSegmentIndex,
  onSelectSegment,
  onGenerateFrames,
  onGenerateAllFrames,
  onGenerateVideo,
  onOpenDirectorConsole,
  onEditFrame,
  onUploadFrame,
  onSegmentAnimaticSettingsChange,
  isGenerating,
  generatingSegmentId,
  generatingPhase,
  characters = [],
  sceneDirection,
  // TEMPORARY WORKAROUND: Props for copy prompt functionality
  // TODO: Remove when Vertex AI billing is resolved
  onResegment,
  sceneNarration,
  sceneDialogue,
  targetSegmentDuration = 8,
  narrationAudioDuration,
  dialogueAudioDurations,
  sceneHeading,
  sceneVisualDescription,
  artStyle = 'photorealistic',
  audioTransitionDelay = 2.0
}: SegmentFrameTimelineProps) {
  // Calculate stats first to determine initial expanded state
  const stats = useMemo(() => calculateTimelineStats(segments), [segments])
  
  // Get the style preset for prompt generation
  const stylePreset = useMemo(() => {
    const preset = artStylePresets.find(s => s.id === artStyle)
    return preset || artStylePresets.find(s => s.id === 'photorealistic')!
  }, [artStyle])
  
  // Auto-collapse when status is "All Ready" or "FTV Mode Ready"
  const isAllReady = stats.fullyAnchored === stats.total && stats.total > 0
  const [isExpanded, setIsExpanded] = useState(!isAllReady)

  // ============================================================================
  // TEMPORARY WORKAROUND: Copy Prompt Functionality
  // TODO: Remove this entire section when Vertex AI billing is resolved
  // ============================================================================
  const buildSegmentationPrompt = useCallback(() => {
    // Build dialogue text with durations
    const dialogueWithDurations = sceneDialogue && sceneDialogue.length > 0
      ? sceneDialogue.map((d, i) => {
          const char = d.character || d.speaker || 'Unknown'
          const text = d.line || d.text || ''
          const duration = dialogueAudioDurations?.[i]?.duration || d.duration
          return duration 
            ? `${i + 1}. ${char}: "${text}" (${duration.toFixed(1)}s audio)`
            : `${i + 1}. ${char}: "${text}"`
        }).join('\n')
      : 'No dialogue'
    
    // Build character descriptions with wardrobe details for optimized prompts
    const characterDescriptions = characters && characters.length > 0
      ? characters.map(c => {
          const parts: string[] = [`- ${c.name}:`]
          
          // Physical appearance
          const appearanceParts: string[] = []
          if (c.ethnicity) appearanceParts.push(c.ethnicity)
          if (c.age) appearanceParts.push(c.age)
          if (c.build) appearanceParts.push(c.build)
          if (c.hairStyle && c.hairColor) appearanceParts.push(`${c.hairColor} ${c.hairStyle} hair`)
          else if (c.hairColor) appearanceParts.push(`${c.hairColor} hair`)
          if (c.eyeColor) appearanceParts.push(`${c.eyeColor} eyes`)
          if (c.expression) appearanceParts.push(c.expression)
          if (c.keyFeature) appearanceParts.push(c.keyFeature)
          
          if (appearanceParts.length > 0) {
            parts.push(`  Appearance: ${appearanceParts.join(', ')}`)
          } else if (c.appearance) {
            parts.push(`  Appearance: ${c.appearance}`)
          }
          
          // Wardrobe/costume details (critical for visual consistency)
          const wardrobeParts: string[] = []
          if (c.defaultWardrobe) wardrobeParts.push(c.defaultWardrobe)
          if (c.wardrobeAccessories) wardrobeParts.push(c.wardrobeAccessories)
          if (wardrobeParts.length > 0) {
            parts.push(`  Wardrobe: ${wardrobeParts.join(', ')}`)
          }
          
          // Reference image indicator
          if (c.referenceUrl || c.referenceImage) {
            parts.push(`  [HAS REFERENCE IMAGE - use for identity lock]`)
          }
          
          return parts.join('\n')
        }).join('\n')
      : 'No character information'
    
    // Build scene direction context
    let sceneDirectionContext = ''
    if (sceneDirection) {
      sceneDirectionContext = `
CINEMATOGRAPHY DIRECTION:
- Camera: ${sceneDirection.camera?.shots?.join(', ') || 'Not specified'} | ${sceneDirection.camera?.movement || 'Static'}
- Lighting: ${sceneDirection.lighting?.overallMood || 'Not specified'} | ${sceneDirection.lighting?.timeOfDay || 'Day'}
- Location: ${sceneDirection.scene?.location || 'Not specified'}
- Key Props: ${sceneDirection.scene?.keyProps?.join(', ') || 'None specified'}
- Atmosphere: ${sceneDirection.scene?.atmosphere || 'Not specified'}
- Talent Blocking: ${sceneDirection.talent?.blocking || 'Not specified'}
- Emotional Beat: ${sceneDirection.talent?.emotionalBeat || 'Not specified'}`
    }
    
    // Calculate total durations
    const totalDialogueDuration = dialogueAudioDurations?.reduce((sum, d) => sum + d.duration, 0) || 0
    const narrationDuration = narrationAudioDuration || 0
    const numDialogueLines = dialogueAudioDurations?.length || 0
    
    // Calculate number of transitions (gaps between audio clips)
    // Transition after narration (if exists) + transitions between dialogue lines
    const numTransitions = (narrationDuration > 0 ? 1 : 0) + Math.max(0, numDialogueLines - 1)
    const totalTransitionTime = numTransitions * audioTransitionDelay
    
    // IMPORTANT: Audio plays SEQUENTIALLY - narration first, then dialogue lines in order
    // Total scene duration = narration + all dialogue + transition gaps (NOT parallel)
    const totalSceneDuration = (narrationDuration + totalDialogueDuration + totalTransitionTime) || stats.totalDuration
    
    // Build timeline breakdown showing sequential audio structure with transition gaps
    let timelineBreakdown = ''
    let currentTime = 0
    if (narrationDuration > 0) {
      const narrationEnd = currentTime + narrationDuration
      timelineBreakdown += `${currentTime.toFixed(1)}s - ${narrationEnd.toFixed(1)}s: NARRATION (${narrationDuration.toFixed(1)}s)\n`
      currentTime = narrationEnd
      // Add transition gap after narration if dialogue follows
      if (numDialogueLines > 0) {
        const gapEnd = currentTime + audioTransitionDelay
        timelineBreakdown += `${currentTime.toFixed(1)}s - ${gapEnd.toFixed(1)}s: [TRANSITION GAP]\n`
        currentTime = gapEnd
      }
    }
    if (dialogueAudioDurations && dialogueAudioDurations.length > 0) {
      dialogueAudioDurations.forEach((d, i) => {
        const endTime = currentTime + d.duration
        const speaker = sceneDialogue?.[i]?.character || 'Unknown'
        timelineBreakdown += `${currentTime.toFixed(1)}s - ${endTime.toFixed(1)}s: ${speaker} dialogue (${d.duration.toFixed(1)}s)\n`
        currentTime = endTime
        // Add transition gap between dialogue lines (not after the last one)
        if (i < dialogueAudioDurations.length - 1) {
          const gapEnd = currentTime + audioTransitionDelay
          timelineBreakdown += `${currentTime.toFixed(1)}s - ${gapEnd.toFixed(1)}s: [TRANSITION GAP]\n`
          currentTime = gapEnd
        }
      })
    }
    
    // Calculate minimum segments needed based on duration
    const minSegmentsForDuration = Math.ceil(totalSceneDuration / targetSegmentDuration)
    
    // ALSO: Each dialogue line may need its own visual coverage (emotional beat)
    const dialogueLineCount = sceneDialogue?.length || 0
    
    // Recommended segments = MAX(duration-based, dialogue-line-based + 1 for establishing shot)
    const recommendedSegments = Math.max(minSegmentsForDuration, dialogueLineCount > 0 ? dialogueLineCount + 1 : 3)
    
    return `You are an expert film editor and visual storyteller creating segments for AI video generation.

=== SCENE INFORMATION ===
Scene ${sceneNumber}: ${sceneHeading || 'Untitled Scene'}
Visual Description: ${sceneVisualDescription || sceneNarration || 'No description provided'}
${sceneDirectionContext}

=== CHARACTERS IN SCENE ===
${characterDescriptions}
Note: Reference images will be used to ensure character consistency in keyframe generation.

=== AUDIO CONTENT ===
NARRATION (voiceover): 
${sceneNarration || 'No narration'}
Duration: ${narrationDuration.toFixed(1)}s

DIALOGUE (sync to characters on screen):
${dialogueWithDurations}
Total Dialogue Duration: ${totalDialogueDuration.toFixed(1)}s

=== AUDIO TIMELINE (SEQUENTIAL PLAYBACK) ===
${timelineBreakdown || 'No audio timeline available'}

=== REQUIRED SEGMENT SYNC POINTS ===
${(() => {
  // Generate explicit sync points for AI to follow
  let syncPoints = ''
  let dialogueStartTime = narrationDuration + (narrationDuration > 0 && numDialogueLines > 0 ? audioTransitionDelay : 0)
  
  if (numDialogueLines > 0) {
    dialogueAudioDurations?.forEach((d, i) => {
      const speaker = sceneDialogue?.[i]?.character || 'Unknown'
      syncPoints += `- Dialogue ${i + 1} (${speaker}): Segment MUST START at ${dialogueStartTime.toFixed(1)}s\n`
      dialogueStartTime += d.duration + (i < numDialogueLines - 1 ? audioTransitionDelay : 0)
    })
  }
  
  return syncPoints || '- No dialogue sync points'
})()}

=== TIMING REQUIREMENTS ===
- Total Scene Duration: ${totalSceneDuration.toFixed(1)}s (narration + dialogue sequential)
- Maximum Segment Duration: ${targetSegmentDuration}s (Veo 3.1 limit)
- Minimum Segments for Duration: ${minSegmentsForDuration}
- Dialogue Lines Requiring Visual Coverage: ${dialogueLineCount}
- RECOMMENDED SEGMENTS: ${recommendedSegments}+

IMPORTANT: Segments MUST cover the FULL ${totalSceneDuration.toFixed(1)}s duration. The last segment should end at ${totalSceneDuration.toFixed(1)}s.

=== SEGMENTATION RULES ===
1. Each segment MUST be ≤ ${targetSegmentDuration} seconds
2. Create at least ONE SEGMENT PER DIALOGUE LINE to visually cover the speaker's emotion/action
3. Narration plays over ALL segments - describe visuals that illustrate the narration
4. **CRITICAL AUDIO-TO-SEGMENT ALIGNMENT:**
   - Dialogue segments MUST START at the EXACT dialogue audio start time (see AUDIO TIMELINE above)
   - Transition gaps (${audioTransitionDelay}s) are ABSORBED INTO the preceding segment's end time
   - The gap time is used for camera movement, reaction shots, or establishing beats
   - Example using the timeline above:
     * If narration ends at 19.6s and dialogue 1 starts at 21.6s:
       - Narration segment(s) should END at 21.6s (absorbing the 2s gap)
       - Dialogue 1 segment MUST START at exactly 21.6s (sync with audio)
     * If dialogue 1 ends at 26.0s and dialogue 2 starts at 28.0s:
       - Dialogue 1 segment should END at 28.0s (absorbing the 2s gap)
       - Dialogue 2 segment MUST START at exactly 28.0s
   - This ensures video renders sync perfectly with audio playback
5. Place segment breaks at:
   - Dialogue line boundaries (new speaker = potential new shot)
   - Emotional beats or action changes
   - Camera angle changes
6. First segment should establish the scene (wide shot or environmental context)
7. Each segment needs START and END keyframes that define the video motion

=== OUTPUT FORMAT ===
Generate a JSON array. Each segment MUST include:
- startTime/endTime: Timing in seconds
- label: Short descriptive name
- shotType: wide/medium/close-up/extreme-close-up/over-shoulder
- cameraMovement: static/pan-left/pan-right/dolly-in/dolly-out/crane-up/crane-down
- transitionType: FADE/CUT/DISSOLVE/CONTINUE
- startFramePrompt: Detailed image generation prompt for the START keyframe
- endFramePrompt: Detailed image generation prompt for the END keyframe  
- videoPrompt: Motion description for video generation using start→end frames

=== IMAGE PROMPT GUIDELINES (CRITICAL FOR QUALITY) ===
Generate DETAILED, PROFESSIONAL prompts for startFramePrompt and endFramePrompt:

**IMPORTANT: REFERENCE IMAGE HANDLING (Identity Lock)**
When a character has [HAS REFERENCE IMAGE], the model extracts face, age, ethnicity, hair, and body type from the image.
DO NOT re-describe physical attributes in text - this creates conflicts between pixel data and text tokens.
Use the "Trigger + Wardrobe + Action" pattern instead:

1. CHARACTER DETAILS (Required):
   - Use FULL character name as the identity trigger (e.g., "Dr. Benjamin Anderson")
   - For characters WITH [HAS REFERENCE IMAGE]: ONLY describe wardrobe, pose, and emotional expression
     * DO NOT include: age, ethnicity, build, hair color/style, facial features (e.g., "gaunt", "salt-and-pepper hair")
     * DO include: clothing, accessories, body language, emotional state
   - For characters WITHOUT reference images: Include full physical description
   - Always include emotional state matching the dialogue/narration beat

2. ENVIRONMENT DETAILS (Required):
   - Specify exact location from scene heading (e.g., "INT. HOME OFFICE - NIGHT")
   - Include key props with realistic detail (e.g., "standard-height wooden desk covered with stacks of paper, coffee mugs, scattered wires")
   - Describe lighting conditions precisely (e.g., "dim warm glow of desk lamp contrasting with bright blue holographic light")
   - Add atmospheric elements (e.g., "bookshelf-lined walls, rain-streaked window")

3. TECHNICAL REQUIREMENTS (Required):
   - Include proportion statement: "proportionally correct to the environment" or "realistic human scale"
   - Specify shot composition clearly (e.g., "over-the-shoulder shot from behind")
   - Add depth/focus guidance (e.g., "shallow depth of field", "sharp foreground silhouette")

4. STYLE SUFFIX (Required - ADD TO END OF EVERY PROMPT):
   - End EVERY image prompt with: "${stylePreset.promptSuffix}, cinematic lighting, film grain"

5. VIDEO PROMPT REQUIREMENTS:
   - Describe smooth, continuous motion
   - Include character movement AND camera movement
   - Add quality descriptors: "smooth continuous motion, photorealistic movement, cinematic pacing"

Example segments showing CORRECT timing alignment (physical descriptions OMITTED for characters with reference images):
NOTE: Dialogue 1 starts at 21.6s in audio timeline, so segment 3 ends at 21.6s and segment 4 starts at 21.6s
[
  {
    "startTime": 0.0,
    "endTime": 7.0,
    "label": "Establishing - Grief's Solitude",
    "shotType": "wide",
    "cameraMovement": "slow-dolly-in",
    "transitionType": "FADE",
    "audioAlignment": "Covers narration 0-7s, establishing shot",
    "startFramePrompt": "Cinematic wide shot, INT. HOME OFFICE - NIGHT. Dr. Benjamin Anderson, wearing a slightly rumpled tweed jacket over a worn dress shirt and dark trousers, sits alone at a standard-height wooden desk covered with realistic clutter. Rain streaks the dark window behind him. Low-key lighting with warm desk lamp glow contrasting cold blue moonlight. He holds a small framed photo, head bowed in profound grief. Floor-to-ceiling bookshelves. Proportionally correct. ${stylePreset.promptSuffix}, cinematic lighting, film grain.",
    "endFramePrompt": "Medium-wide shot, camera has dollied closer to Dr. Benjamin Anderson. The cluttered desk is more visible. He is still looking down at the framed photo, posture heavy with grief. Blue light from holographic monitor rims his silhouette. Proportionally correct. ${stylePreset.promptSuffix}, cinematic lighting, film grain.",
    "videoPrompt": "Slow dolly-in towards Dr. Benjamin Anderson, establishing isolation. Rain on window provides subtle movement. Photorealistic movement, cinematic pacing."
  },
  {
    "startTime": 14.0,
    "endTime": 21.6,
    "label": "Narration End + Transition",
    "shotType": "extreme-close-up",
    "cameraMovement": "static",
    "transitionType": "DISSOLVE",
    "audioAlignment": "Covers narration 14-19.6s PLUS 2s transition gap before dialogue 1",
    "startFramePrompt": "Extreme close-up on Dr. Benjamin Anderson's trembling hands holding framed photo. Weathered hands, slightly faded photo behind glass. Dim lighting. Proportionally correct. ${stylePreset.promptSuffix}, cinematic lighting, film grain.",
    "endFramePrompt": "Same framing, teardrop on glass of picture frame. Hands shaking more visibly. Lighting flickers faintly from off-camera holographic screen. Proportionally correct. ${stylePreset.promptSuffix}, cinematic lighting, film grain.",
    "videoPrompt": "Static shot on trembling hands. Tear falls onto frame during transition gap. Lighting flickers. Photorealistic movement, cinematic pacing."
  },
  {
    "startTime": 21.6,
    "endTime": 28.0,
    "label": "Dialogue 1 - Whispered Regret",  
    "shotType": "close-up",
    "cameraMovement": "static",
    "transitionType": "CUT",
    "audioAlignment": "EXACT SYNC: Dialogue 1 starts at 21.6s - 'Elara... I tried to warn you' (4.4s) + 2s gap",
    "startFramePrompt": "Close-up of Dr. Benjamin Anderson, INT. HOME OFFICE - NIGHT. Wearing rumpled tweed jacket. Expression of grief-stricken anguish, eyes wet with tears. Chiaroscuro lighting from desk lamp and holographic light. Lips parting to speak. Shallow depth of field. Proportionally correct. ${stylePreset.promptSuffix}, cinematic lighting, film grain.",
    "endFramePrompt": "Same close-up. Expression shifted to guilt and deep regret. Eyes cast downward, tear track on cheek. Trembling hands at edge of frame. Proportionally correct. ${stylePreset.promptSuffix}, cinematic lighting, film grain.",
    "videoPrompt": "Static close-up, subtle facial acting as Dr. Benjamin Anderson whispers with grief. Eye movement, lip trembling, tear forming. Photorealistic movement, cinematic pacing."
  }
]

Generate ${recommendedSegments}+ segments now:`
  }, [
    sceneNumber,
    sceneHeading,
    sceneVisualDescription,
    sceneNarration, 
    sceneDialogue, 
    characters,
    sceneDirection,
    stats.totalDuration, 
    targetSegmentDuration, 
    narrationAudioDuration, 
    dialogueAudioDurations,
    stylePreset,
    audioTransitionDelay
  ])

  const handleCopyPrompt = useCallback(() => {
    const prompt = buildSegmentationPrompt()
    navigator.clipboard.writeText(prompt)
    toast.success('Segmentation prompt copied to clipboard')
  }, [buildSegmentationPrompt])

  // Regeneration dialog state
  const [showResegmentDialog, setShowResegmentDialog] = useState(false)
  const [showPasteDialog, setShowPasteDialog] = useState(false)
  const [pastedJson, setPastedJson] = useState('')
  const [isProcessingPaste, setIsProcessingPaste] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState(false)

  const handleCopyPromptInDialog = useCallback(() => {
    const prompt = buildSegmentationPrompt()
    navigator.clipboard.writeText(prompt)
    setCopiedPrompt(true)
    toast.success('Segmentation prompt copied to clipboard')
    setTimeout(() => setCopiedPrompt(false), 2000)
  }, [buildSegmentationPrompt])

  const handleProcessPastedResults = useCallback(async () => {
    if (!pastedJson.trim() || !onResegment) return

    setIsProcessingPaste(true)
    try {
      // Try to extract JSON from the pasted content
      let jsonContent = pastedJson.trim()
      
      // Handle markdown code blocks
      const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim()
      }
      
      // Parse the JSON
      let parsed: any
      try {
        parsed = JSON.parse(jsonContent)
      } catch (parseError) {
        // Try to find JSON array in the content
        const arrayMatch = jsonContent.match(/\[\s*\{[\s\S]*\}\s*\]/)
        if (arrayMatch) {
          parsed = JSON.parse(arrayMatch[0])
        } else {
          throw new Error('Could not find valid JSON in the pasted content')
        }
      }
      
      // Extract segments array
      const segments = Array.isArray(parsed) ? parsed : parsed.segments
      if (!Array.isArray(segments) || segments.length === 0) {
        throw new Error('No segments found in the pasted JSON')
      }
      
      // Transform to expected format - include ALL required SceneSegment fields
      const transformedSegments = segments.map((seg: any, idx: number) => ({
        // Required fields for SceneSegment interface
        segmentId: seg.segmentId || `segment-${idx}`,
        sequenceIndex: idx,
        startTime: seg.startTime || 0,
        endTime: seg.endTime || (seg.startTime || 0) + (seg.duration || 5),
        status: 'DRAFT' as const,
        assetType: 'IMAGE' as const,
        references: {
          startFrameUrl: null,
          endFrameUrl: null,
          startFrameDescription: seg.startFramePrompt || '',
          endFrameDescription: seg.endFramePrompt || '',
        },
        takes: [], // Empty takes array - required field
        
        // Optional metadata
        label: seg.label || seg.description || `Segment ${idx + 1}`,
        
        // Prompts - for keyframe generation dialog
        generatedPrompt: seg.startFramePrompt || seg.videoPrompt || seg.prompt || seg.description || '',
        actionPrompt: seg.videoPrompt || seg.prompt || '',
        startFramePrompt: seg.startFramePrompt || '',
        endFramePrompt: seg.endFramePrompt || '',
        videoPrompt: seg.videoPrompt || seg.prompt || '',
        
        // Shot and camera info
        shotType: seg.shotType || 'medium',
        cameraMovement: seg.cameraMovement || 'static',
        transitionType: seg.transitionType || (idx === 0 ? 'FADE' : 'CUT'),
        
        // Audio alignment info
        audioAlignment: seg.audioAlignment || '',
        
        // Keyframe state machine
        anchorStatus: 'pending' as const,
      }))
      
      // Call onResegment with the parsed segments
      await onResegment(transformedSegments)
      
      toast.success(`Created ${transformedSegments.length} segments from pasted results`)
      setShowPasteDialog(false)
      setShowResegmentDialog(false)
      setPastedJson('')
    } catch (error: any) {
      console.error('Error processing pasted results:', error)
      toast.error(error.message || 'Failed to process pasted results')
    } finally {
      setIsProcessingPaste(false)
    }
  }, [pastedJson, onResegment])
  // ============================================================================
  // END TEMPORARY WORKAROUND
  // ============================================================================
  
  // Frame prompt dialog state
  const [framePromptDialogOpen, setFramePromptDialogOpen] = useState(false)
  const [dialogSegment, setDialogSegment] = useState<SceneSegment | null>(null)
  const [dialogSegmentIndex, setDialogSegmentIndex] = useState(0)
  const [dialogFrameType, setDialogFrameType] = useState<'start' | 'end' | 'both'>('both')
  const [dialogPreviousEndFrame, setDialogPreviousEndFrame] = useState<string | null>(null)
  
  // Get previous segment's end frame for each segment (for CONTINUE transitions)
  const getPreviousEndFrame = useCallback((index: number): string | null => {
    if (index === 0) return null
    const prevSegment = segments[index - 1]
    return prevSegment?.endFrameUrl || prevSegment?.references?.endFrameUrl || null
  }, [segments])
  
  // Open the frame prompt dialog instead of generating directly
  const openFramePromptDialog = useCallback((
    segment: SceneSegment,
    segmentIndex: number,
    frameType: 'start' | 'end' | 'both'
  ) => {
    setDialogSegment(segment)
    setDialogSegmentIndex(segmentIndex)
    setDialogFrameType(frameType)
    setDialogPreviousEndFrame(getPreviousEndFrame(segmentIndex))
    setFramePromptDialogOpen(true)
  }, [getPreviousEndFrame])
  
  // Handle generation from dialog
  const handleDialogGenerate = useCallback(async (options: FrameGenerationOptions) => {
    setFramePromptDialogOpen(false)
    
    await onGenerateFrames(options.segmentId, options.frameType, {
      customPrompt: options.customPrompt,
      negativePrompt: options.negativePrompt,
      usePreviousEndFrame: options.usePreviousEndFrame,
      previousEndFrameUrl: options.previousEndFrameUrl || undefined,
    })
  }, [onGenerateFrames])

  if (segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <Layers className="w-12 h-12 mb-3 opacity-30" />
        <span className="text-sm font-medium">No segments generated</span>
        <p className="text-xs opacity-60 mt-1">Generate segments in the Call Action step first</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Compact Header with Status Bar */}
      <div className="bg-gray-900/50 rounded-xl border border-cyan-500/30 overflow-hidden">
        <div className="px-4 sm:px-5 py-4 bg-cyan-900/20 border-b border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-3 text-left hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Keyframe State Machine</h3>
                <Badge variant="secondary" className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                  {stats.fullyAnchored}/{stats.total} ready
                </Badge>
              </div>
              <p className="text-xs text-gray-400">Anchor start and end frames for video generation</p>
            </div>
          </button>
          
          <div className="flex items-center gap-3">
            {/* Progress Bar - Compact */}
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${stats.progressPercent}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 w-10">{Math.round(stats.progressPercent)}%</span>
            </div>
            
            {/* Batch Generate Button */}
            {stats.pending > 0 || stats.startLocked > 0 ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={onGenerateAllFrames}
                disabled={isGenerating}
                className="h-7 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/30"
              >
                <Wand2 className="w-3 h-3 mr-1.5" />
                Generate All Frames
              </Button>
            ) : stats.fullyAnchored === stats.total && stats.total > 0 ? (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 h-7 px-3">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                All Ready
              </Badge>
            ) : null}
            
            {/* TEMPORARY WORKAROUND: Copy Prompt + Resegment buttons */}
            {/* TODO: Remove when Vertex AI billing is resolved */}
            {stats.total > 0 && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyPrompt}
                  className="h-7 text-xs text-slate-400 hover:text-white hover:bg-slate-700/50"
                  title="Copy segmentation prompt for AI Studio"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Prompt
                </Button>
                {onResegment && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowResegmentDialog(true)}
                    className="h-7 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 border border-amber-500/30"
                    title="Regenerate segments (opens generation dialog)"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Regenerate Segments
                  </Button>
                )}
              </>
            )}
            {/* END TEMPORARY WORKAROUND */}
          </div>
        </div>
        
        {/* Stats Row - Inline */}
        {isExpanded && (
        <div className="flex items-center gap-4 px-4 py-2 text-xs border-t border-cyan-500/10 bg-gray-900/30">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            {stats.totalDuration.toFixed(1)}s total
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {stats.fullyAnchored} anchored
          </span>
          {stats.startLocked > 0 && (
            <>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <ImageIcon className="w-3.5 h-3.5" />
                {stats.startLocked} partial
              </span>
            </>
          )}
          {stats.pending > 0 && (
            <>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <AlertCircle className="w-3.5 h-3.5" />
                {stats.pending} pending
              </span>
            </>
          )}
        </div>
        )}
      </div>
        
      {/* Segment Cards with Shot Grouping */}
      {isExpanded && (
        <div className="space-y-2">
          {segments.map((segment, index) => {
            const isContinuationGroup = segment.transitionType === 'CONTINUE'
            const nextIsContinuation = segments[index + 1]?.transitionType === 'CONTINUE'
            const isFirstInGroup = !isContinuationGroup
            const isLastInGroup = !nextIsContinuation
            
            return (
              <div key={segment.segmentId}>
                {/* Shot Change Divider */}
                {segment.transitionType === 'CUT' && index > 0 && (
                  <div className="flex items-center gap-2 py-2 px-3 my-1">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                    <span className="text-[10px] uppercase tracking-wider text-amber-500/60 font-medium">
                      Shot Change
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                  </div>
                )}
                
                {/* Segment Card with Continuation Border */}
                <div className={`${isContinuationGroup ? 'border-l-2 border-blue-500/30 pl-2 ml-1' : ''}`}>
                  <SegmentPairCard
                    segment={segment}
                    segmentIndex={index}
                    isSelected={selectedSegmentIndex === index}
                    onSelect={() => onSelectSegment(index)}
                    onGenerateStartFrame={() => openFramePromptDialog(segment, index, 'start')}
                    onGenerateEndFrame={() => openFramePromptDialog(segment, index, 'end')}
                    onGenerateBothFrames={() => openFramePromptDialog(segment, index, 'both')}
                    onGenerateVideo={() => onGenerateVideo(segment.segmentId)}
                    onOpenDirectorConsole={onOpenDirectorConsole}
                    onEditFrame={onEditFrame ? (frameType, frameUrl) => onEditFrame(segment.segmentId, frameType, frameUrl) : undefined}
                    onUploadFrame={onUploadFrame ? (frameType, file) => onUploadFrame(segment.segmentId, frameType, file) : undefined}
                    onAnimaticSettingsChange={onSegmentAnimaticSettingsChange ? (settings) => onSegmentAnimaticSettingsChange(segment.segmentId, settings) : undefined}
                    isGenerating={isGenerating && generatingSegmentId === segment.segmentId}
                    generatingPhase={generatingSegmentId === segment.segmentId ? generatingPhase : undefined}
                    previousSegmentEndFrame={getPreviousEndFrame(index)}
                    sceneImageUrl={sceneImageUrl}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
      
      {/* FTV Mode Ready Banner */}
      {stats.fullyAnchored > 0 && (
        <div className="p-3 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <Video className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <p className="text-emerald-300 font-medium">FTV Mode Ready</p>
              <p className="text-emerald-400/70 mt-0.5">
                {stats.fullyAnchored} segment{stats.fullyAnchored > 1 ? 's are' : ' is'} anchored. 
                Frame-to-Video generation will use both frames to constrain video output.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Frame Prompt Dialog */}
      <FramePromptDialog
        open={framePromptDialogOpen}
        onOpenChange={setFramePromptDialogOpen}
        segment={dialogSegment}
        segmentIndex={dialogSegmentIndex}
        frameType={dialogFrameType}
        previousEndFrameUrl={dialogPreviousEndFrame}
        sceneImageUrl={sceneImageUrl}
        onGenerate={handleDialogGenerate}
        isGenerating={isGenerating}
        sceneDirection={sceneDirection}
        characters={characters?.map(c => ({
          name: c.name,
          appearance: c.appearance,
        }))}
      />

      {/* Regenerate Segments Dialog */}
      <Dialog open={showResegmentDialog} onOpenChange={setShowResegmentDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Film className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <DialogTitle className="text-left">Regenerate Segments</DialogTitle>
                <DialogDescription className="text-left">
                  Use the manual workaround to regenerate segments via external AI.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <h4 className="text-sm font-medium text-amber-300 mb-2">Manual Workflow</h4>
              <ol className="text-xs text-amber-200/80 space-y-2 list-decimal list-inside">
                <li>Click <strong>Copy Prompt</strong> to copy the segmentation prompt</li>
                <li>Paste into <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="underline text-amber-400 hover:text-amber-300">Google AI Studio</a> or ChatGPT</li>
                <li>Copy the JSON response from the AI</li>
                <li>Click <strong>Paste Results</strong> to import the segments</li>
              </ol>
            </div>
          </div>
          
          <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
            <div className="flex gap-2 mr-auto">
              <Button 
                type="button"
                variant="outline" 
                size="sm"
                onClick={handleCopyPromptInDialog}
                className="text-xs"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                {copiedPrompt ? 'Copied!' : 'Copy Prompt'}
              </Button>
              <Button 
                type="button"
                variant="outline" 
                size="sm"
                onClick={() => setShowPasteDialog(true)}
                className="text-xs"
              >
                <ClipboardPaste className="w-3.5 h-3.5 mr-1.5" />
                Paste Results
              </Button>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => setShowResegmentDialog(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paste Results Dialog */}
      <Dialog open={showPasteDialog} onOpenChange={setShowPasteDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <ClipboardPaste className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <DialogTitle className="text-left">Paste AI Results</DialogTitle>
                <DialogDescription className="text-left">
                  Paste the JSON response from Gemini or ChatGPT to create segments.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">JSON Response</Label>
              <Textarea
                placeholder='Paste the JSON response here...

Example format:
[
  {
    "startTime": 0.0,
    "endTime": 7.5,
    "description": "Opening shot...",
    "transitionType": "FADE"
  }
]'
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                className="min-h-[200px] font-mono text-xs"
              />
            </div>
            
            <p className="text-xs text-gray-500">
              Supports JSON arrays or objects with a "segments" property. 
              Markdown code blocks are automatically extracted.
            </p>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowPasteDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleProcessPastedResults} 
              disabled={isProcessingPaste || !pastedJson.trim()}
            >
              {isProcessingPaste ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Segments
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SegmentFrameTimeline
