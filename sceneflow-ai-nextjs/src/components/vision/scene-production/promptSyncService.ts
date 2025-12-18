/**
 * Prompt Sync Service
 * 
 * Detects when segment prompts become stale due to script changes
 * and provides utilities to refresh prompts while preserving user edits.
 * 
 * Key features:
 * - Staleness detection via content hashing
 * - Batch refresh capability
 * - User edit preservation
 */

import { SceneSegment, PromptContext, GenerationPlan, GenerationPrerequisite, VideoGenerationMethod } from './types'
import { 
  hashString, 
  refreshSegmentPrompt, 
  SceneContextData, 
  CharacterData,
  buildMethodSpecificPrompt,
  MethodPromptBuilderConfig
} from './methodPromptBuilder'

// ============================================================================
// Types
// ============================================================================

export interface StalenessCheckResult {
  segmentId: string
  isStale: boolean
  reasons: string[]
  dialogueChanged: boolean
  visualDescriptionChanged: boolean
  dialogueMismatch?: {
    expected: number[]
    current: number[]
  }
}

export interface BatchRefreshResult {
  refreshed: number
  skipped: number
  errors: string[]
  segments: SceneSegment[]
}

export interface SceneDataForSync {
  heading: string
  visualDescription: string
  narration?: string
  dialogue: Array<{
    character: string
    text: string
    emotion?: string
    index: number
  }>
  sceneDirection?: {
    camera?: string
    lighting?: string
    scene?: string
    talent?: string
    audio?: string
  }
  sceneImageUrl?: string
}

// ============================================================================
// Staleness Detection
// ============================================================================

/**
 * Check if a single segment's prompt is stale compared to current scene data
 */
export function checkSegmentStaleness(
  segment: SceneSegment,
  currentSceneData: SceneDataForSync
): StalenessCheckResult {
  const reasons: string[] = []
  let dialogueChanged = false
  let visualDescriptionChanged = false
  
  const result: StalenessCheckResult = {
    segmentId: segment.segmentId,
    isStale: false,
    reasons,
    dialogueChanged,
    visualDescriptionChanged,
  }
  
  // If no prompt context, we can't determine staleness (assume fresh)
  if (!segment.promptContext) {
    return result
  }
  
  // Check dialogue hash
  const assignedIndices = (segment.dialogueLineIds || [])
    .map(id => {
      const match = id.match(/dialogue-(\d+)/)
      return match ? parseInt(match[1], 10) : -1
    })
    .filter(idx => idx >= 0)
  
  const assignedDialogue = currentSceneData.dialogue
    .filter(d => assignedIndices.includes(d.index))
  
  const currentDialogueText = assignedDialogue
    .map(d => `${d.character}:${d.text}`)
    .join('|')
  const currentDialogueHash = hashString(currentDialogueText)
  
  if (segment.promptContext.dialogueHash !== currentDialogueHash) {
    dialogueChanged = true
    reasons.push('Dialogue text has changed')
    result.dialogueMismatch = {
      expected: assignedIndices,
      current: assignedDialogue.map(d => d.index),
    }
  }
  
  // Check visual description hash
  const currentVisualHash = hashString(currentSceneData.visualDescription || '')
  if (segment.promptContext.visualDescriptionHash !== currentVisualHash) {
    visualDescriptionChanged = true
    reasons.push('Visual description has changed')
  }
  
  // Check if dialogue lines have been deleted
  if (assignedIndices.length > 0 && assignedDialogue.length < assignedIndices.length) {
    dialogueChanged = true
    reasons.push('Some assigned dialogue lines no longer exist')
  }
  
  result.isStale = dialogueChanged || visualDescriptionChanged
  result.dialogueChanged = dialogueChanged
  result.visualDescriptionChanged = visualDescriptionChanged
  
  return result
}

/**
 * Check staleness for all segments in a scene
 */
export function detectStaleSegments(
  segments: SceneSegment[],
  currentSceneData: SceneDataForSync
): StalenessCheckResult[] {
  return segments.map(segment => checkSegmentStaleness(segment, currentSceneData))
}

/**
 * Get summary of staleness for a scene's segments
 */
export function getStalenesseSummary(
  segments: SceneSegment[],
  currentSceneData: SceneDataForSync
): {
  totalSegments: number
  staleCount: number
  stalePercentage: number
  staleSegmentIds: string[]
} {
  const results = detectStaleSegments(segments, currentSceneData)
  const staleResults = results.filter(r => r.isStale)
  
  return {
    totalSegments: segments.length,
    staleCount: staleResults.length,
    stalePercentage: segments.length > 0 
      ? Math.round((staleResults.length / segments.length) * 100)
      : 0,
    staleSegmentIds: staleResults.map(r => r.segmentId),
  }
}

// ============================================================================
// Prompt Refresh
// ============================================================================

/**
 * Refresh a single segment's prompt while preserving user edits
 */
export function refreshSingleSegmentPrompt(
  segment: SceneSegment,
  sceneData: SceneContextData,
  characters: CharacterData[],
  options?: {
    preserveUserEdit?: boolean  // If true, only update generatedPrompt, not userEditedPrompt
    forceMethod?: VideoGenerationMethod
  }
): SceneSegment {
  const method = options?.forceMethod || segment.generationMethod || 'T2V'
  
  const { prompt, promptContext } = refreshSegmentPrompt(
    segment,
    sceneData,
    characters,
    method
  )
  
  return {
    ...segment,
    generatedPrompt: prompt,
    promptContext,
    isStale: false,
    // Only clear userEditedPrompt if not preserving
    ...(options?.preserveUserEdit ? {} : { userEditedPrompt: null }),
  }
}

/**
 * Refresh all stale segments in a batch
 */
export function refreshAllStaleSegments(
  segments: SceneSegment[],
  sceneData: SceneContextData,
  characters: CharacterData[],
  options?: {
    onlyStale?: boolean  // Only refresh segments flagged as stale
    preserveUserEdits?: boolean
  }
): BatchRefreshResult {
  const result: BatchRefreshResult = {
    refreshed: 0,
    skipped: 0,
    errors: [],
    segments: [],
  }
  
  for (const segment of segments) {
    try {
      // Check if we should skip this segment
      if (options?.onlyStale && !segment.isStale) {
        result.skipped++
        result.segments.push(segment)
        continue
      }
      
      // Skip if user has edited and we're preserving
      if (options?.preserveUserEdits && segment.userEditedPrompt) {
        result.skipped++
        result.segments.push({
          ...segment,
          isStale: false, // Clear stale flag even if not refreshing
        })
        continue
      }
      
      const refreshedSegment = refreshSingleSegmentPrompt(
        segment,
        sceneData,
        characters,
        { preserveUserEdit: options?.preserveUserEdits }
      )
      
      result.refreshed++
      result.segments.push(refreshedSegment)
    } catch (error) {
      result.errors.push(`Failed to refresh segment ${segment.segmentId}: ${error}`)
      result.segments.push(segment)
    }
  }
  
  return result
}

// ============================================================================
// Generation Plan Builder
// ============================================================================

/**
 * Build a generation plan for a segment based on available assets
 */
export function buildGenerationPlan(
  segment: SceneSegment,
  segmentIndex: number,
  totalSegments: number,
  context: {
    sceneImageUrl?: string
    previousSegmentAssetUrl?: string
    previousSegmentVeoRef?: string
    previousSegmentLastFrame?: string
    characterRefImages: Array<{ name: string; imageUrl: string }>
  }
): GenerationPlan {
  const prerequisites: GenerationPrerequisite[] = []
  const warnings: string[] = []
  
  // Check scene image availability
  const hasSceneImage = !!context.sceneImageUrl
  prerequisites.push({
    type: 'scene-image',
    label: 'Scene keyframe image',
    met: hasSceneImage,
    required: segmentIndex === 0,
    assetUrl: context.sceneImageUrl,
  })
  
  // Check previous segment assets
  const hasPreviousFrame = !!context.previousSegmentLastFrame
  const hasPreviousVeoRef = !!context.previousSegmentVeoRef
  
  if (segmentIndex > 0) {
    prerequisites.push({
      type: 'previous-frame',
      label: 'Previous segment last frame',
      met: hasPreviousFrame,
      required: false,
      assetUrl: context.previousSegmentLastFrame,
    })
    
    prerequisites.push({
      type: 'veo-ref',
      label: 'Veo video reference (for extension)',
      met: hasPreviousVeoRef,
      required: false,
      assetUrl: context.previousSegmentVeoRef,
    })
  }
  
  // Check character reference images
  const hasCharacterRefs = context.characterRefImages.length > 0
  prerequisites.push({
    type: 'character-ref',
    label: 'Character reference images',
    met: hasCharacterRefs,
    required: false,
  })
  
  // Determine recommended method
  let recommendedMethod: VideoGenerationMethod = 'T2V'
  let confidence = 50
  let reasoning = ''
  let fallbackMethod: VideoGenerationMethod | undefined
  let fallbackReason: string | undefined
  
  if (segmentIndex === 0) {
    // First segment
    if (hasSceneImage) {
      recommendedMethod = 'I2V'
      confidence = 90
      reasoning = 'First segment with scene image available - I2V provides best visual continuity'
      fallbackMethod = 'T2V'
      fallbackReason = 'Use T2V if I2V produces unwanted motion'
    } else if (hasCharacterRefs) {
      recommendedMethod = 'REF'
      confidence = 75
      reasoning = 'No scene image but character refs available - REF ensures character consistency'
      fallbackMethod = 'T2V'
      fallbackReason = 'Use T2V if reference matching is poor'
    } else {
      recommendedMethod = 'T2V'
      confidence = 60
      reasoning = 'No starting assets - T2V with detailed prompt is the best option'
      warnings.push('Consider generating a scene image first for better results')
    }
  } else {
    // Subsequent segments
    if (hasPreviousVeoRef && !segment.triggerReason?.includes('angle change')) {
      recommendedMethod = 'EXT'
      confidence = 85
      reasoning = 'Continuing from previous Veo video - EXT maintains perfect continuity'
      fallbackMethod = 'I2V'
      fallbackReason = 'Use I2V with last frame if extension produces drift'
      
      if (segment.triggerReason?.includes('speaker change')) {
        warnings.push('Speaker change detected - consider I2V for better cut control')
        confidence = 70
      }
    } else if (hasPreviousFrame) {
      recommendedMethod = 'I2V'
      confidence = 80
      reasoning = 'Using previous frame as starting point for visual continuity'
      fallbackMethod = 'T2V'
      fallbackReason = 'Use T2V if previous frame is not suitable'
    } else if (hasCharacterRefs) {
      recommendedMethod = 'REF'
      confidence = 65
      reasoning = 'No previous frame but character refs maintain consistency'
      fallbackMethod = 'T2V'
      fallbackReason = 'Use T2V for faster iteration'
    } else {
      recommendedMethod = 'T2V'
      confidence = 50
      reasoning = 'No continuity assets available - detailed T2V prompt needed'
      warnings.push('Visual continuity may be inconsistent without starting assets')
    }
  }
  
  // Override with segment's explicit method if set by user
  if (segment.generationMethod) {
    recommendedMethod = segment.generationMethod
    reasoning = `Using user-specified method: ${segment.generationMethod}`
    confidence = 95
  }
  
  // Calculate quality estimate
  const qualityEstimate = Math.min(100, Math.max(30, 
    confidence + 
    (hasSceneImage ? 10 : 0) + 
    (hasPreviousFrame ? 10 : 0) + 
    (hasCharacterRefs ? 5 : 0)
  ))
  
  // Calculate batch priority (lower = higher priority)
  let batchPriority = segmentIndex
  if (recommendedMethod === 'I2V' && segmentIndex === 0) {
    batchPriority = -1 // Generate first
  } else if (recommendedMethod === 'EXT') {
    batchPriority = segmentIndex + 100 // Generate after dependencies
  }
  
  return {
    recommendedMethod,
    confidence,
    reasoning,
    fallbackMethod,
    fallbackReason,
    prerequisites,
    batchPriority,
    qualityEstimate,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

/**
 * Build generation plans for all segments in a scene
 */
export function buildAllGenerationPlans(
  segments: SceneSegment[],
  sceneImageUrl?: string,
  characterRefImages: Array<{ name: string; imageUrl: string }> = []
): SceneSegment[] {
  return segments.map((segment, index) => {
    // Get previous segment's assets
    const previousSegment = index > 0 ? segments[index - 1] : undefined
    const previousAsset = previousSegment?.activeAssetUrl
    const previousVeoRef = previousSegment?.takes?.find(t => t.veoVideoRef)?.veoVideoRef
    
    // For now, use the previous segment's asset URL as last frame
    // In real implementation, this would be extracted from the video
    const previousLastFrame = previousAsset
    
    const plan = buildGenerationPlan(segment, index, segments.length, {
      sceneImageUrl,
      previousSegmentAssetUrl: previousAsset || undefined,
      previousSegmentVeoRef: previousVeoRef,
      previousSegmentLastFrame: previousLastFrame || undefined,
      characterRefImages,
    })
    
    return {
      ...segment,
      generationPlan: plan,
    }
  })
}

// ============================================================================
// Scene Data Extraction
// ============================================================================

/**
 * Extract scene context data from a raw scene object
 */
export function extractSceneContextData(scene: any): SceneContextData {
  const heading = typeof scene.heading === 'string' 
    ? scene.heading 
    : scene.heading?.text || 'UNKNOWN LOCATION'
  
  const visualDescription = scene.visualDescription || scene.action || scene.summary || ''
  
  const narration = scene.narration || undefined
  
  const dialogue = (scene.dialogue || []).map((d: any, idx: number) => ({
    character: d.character || d.name || 'UNKNOWN',
    text: d.text || d.dialogue || d.line || '',
    emotion: d.emotion || d.mood || undefined,
    index: idx,
  }))
  
  const dir = scene.sceneDirection || {}
  const sceneDirection = {
    camera: typeof dir.camera === 'string' ? dir.camera : undefined,
    lighting: typeof dir.lighting === 'string' ? dir.lighting : undefined,
    scene: typeof dir.scene === 'string' ? dir.scene : undefined,
    talent: typeof dir.talent === 'string' ? dir.talent : undefined,
    audio: typeof dir.audio === 'string' ? dir.audio : undefined,
  }
  
  return {
    heading,
    visualDescription,
    narration,
    dialogue,
    sceneDirection,
  }
}

/**
 * Extract character data from raw character objects
 */
export function extractCharacterData(characters: any[]): CharacterData[] {
  return (characters || []).map(c => ({
    name: c.name || 'Unknown',
    description: c.description,
    appearanceDescription: c.appearanceDescription,
    hasReferenceImage: !!(c.referenceImageUrl || c.imageUrl || c.referenceImage),
  }))
}
