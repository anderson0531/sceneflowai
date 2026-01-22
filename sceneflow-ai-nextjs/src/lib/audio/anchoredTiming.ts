/**
 * Anchored Timing Calculator
 * 
 * Automatically calculates segment display timing based on audio anchors.
 * Eliminates manual duration math for aligning keyframes with audio.
 * 
 * Usage:
 * 1. Set audioAnchor on a segment to link it to an audio clip
 * 2. Set durationMode to control how duration is calculated
 * 3. Call calculateAnchoredTiming() to get computed display times
 * 
 * Example: 14s narration, 2 keyframes, next dialogue at 20s
 * - Keyframe 1: audioAnchor={type:'narration', position:'start'}, durationMode:'split-even'
 * - Keyframe 2: audioAnchor={type:'narration', position:'start'}, durationMode:'split-even'
 * - Both keyframes automatically get 7s each, extending to fill the gap before dialogue
 */

import type { 
  SceneSegment, 
  AudioAnchor, 
  DurationMode,
  AudioTracksData,
  AudioTrackClip
} from '@/components/vision/scene-production/types'

// ============================================================================
// Types
// ============================================================================

export interface CalculatedTiming {
  segmentId: string
  displayStartTime: number  // When to show this keyframe (seconds from scene start)
  displayDuration: number   // How long to show this keyframe (seconds)
  anchorSource?: string     // Human-readable anchor description (e.g., "Narration start")
  isAnchored: boolean       // Whether timing was calculated from an anchor
}

export interface AudioClipReference {
  type: AudioAnchor['type']
  index?: number
  characterName?: string
  startTime: number
  duration: number
  label?: string
}

// ============================================================================
// Audio Clip Lookup
// ============================================================================

/**
 * Find an audio clip matching the anchor specification
 */
function findAnchoredAudioClip(
  anchor: AudioAnchor,
  audioTracks: AudioTracksData
): AudioClipReference | null {
  const clips: AudioTrackClip[] = (() => {
    switch (anchor.type) {
      case 'narration':
        // Narration is typically in voiceover track with 'narration' label
        return (audioTracks.voiceover || []).filter(v => 
          v.label?.toLowerCase().includes('narration')
        )
      case 'description':
        // Description is typically in voiceover track with 'description' label
        return (audioTracks.voiceover || []).filter(v => 
          v.label?.toLowerCase().includes('description')
        )
      case 'dialogue':
        // Dialogue can be filtered by character name or index
        if (anchor.characterName) {
          return (audioTracks.dialogue || []).filter(d => 
            d.label?.toLowerCase() === anchor.characterName?.toLowerCase()
          )
        }
        if (anchor.trackIndex !== undefined) {
          const clip = audioTracks.dialogue?.[anchor.trackIndex]
          return clip ? [clip] : []
        }
        return audioTracks.dialogue || []
      case 'sfx':
        if (anchor.trackIndex !== undefined) {
          const clip = audioTracks.sfx?.[anchor.trackIndex]
          return clip ? [clip] : []
        }
        return audioTracks.sfx || []
      case 'music':
        if (anchor.trackIndex !== undefined) {
          const clip = audioTracks.music?.[anchor.trackIndex]
          return clip ? [clip] : []
        }
        return audioTracks.music || []
      default:
        return []
    }
  })()
  
  if (clips.length === 0) return null
  
  // For indexed anchors, use that specific clip; otherwise use first match
  const clip = clips[0]
  if (!clip) return null
  
  return {
    type: anchor.type,
    index: anchor.trackIndex,
    characterName: anchor.characterName,
    startTime: clip.startTime,
    duration: clip.duration,
    label: clip.label
  }
}

/**
 * Calculate anchor point time (start or end of audio + offset)
 */
function calculateAnchorTime(
  clip: AudioClipReference,
  anchor: AudioAnchor
): number {
  const baseTime = anchor.position === 'start' 
    ? clip.startTime 
    : clip.startTime + clip.duration
  return Math.max(0, baseTime + (anchor.offsetSeconds || 0))
}

// ============================================================================
// Duration Calculation Helpers
// ============================================================================

/**
 * Find the next anchor boundary for fill-to-next mode
 */
function findNextBoundary(
  currentIndex: number,
  segments: SceneSegment[],
  audioTracks: AudioTracksData,
  sceneDuration: number
): number {
  // Look for next segment with an anchor
  for (let i = currentIndex + 1; i < segments.length; i++) {
    const seg = segments[i]
    if (seg.audioAnchor) {
      const clip = findAnchoredAudioClip(seg.audioAnchor, audioTracks)
      if (clip) {
        return calculateAnchorTime(clip, seg.audioAnchor)
      }
    }
  }
  // No next anchor found - extend to scene end
  return sceneDuration
}

/**
 * Count segments anchored to the same audio clip (for split-even mode)
 * Returns the total count and this segment's index among siblings
 */
function countSiblingsOnSameAudio(
  segment: SceneSegment,
  allSegments: SceneSegment[],
  audioTracks: AudioTracksData
): { total: number; index: number; anchorTime: number } {
  if (!segment.audioAnchor) return { total: 1, index: 0, anchorTime: 0 }
  
  // Find all segments with matching anchor (same type, index, character)
  const siblings = allSegments.filter(s => {
    if (!s.audioAnchor) return false
    if (s.audioAnchor.type !== segment.audioAnchor!.type) return false
    if (s.audioAnchor.trackIndex !== segment.audioAnchor!.trackIndex) return false
    if (s.audioAnchor.characterName !== segment.audioAnchor!.characterName) return false
    // Only count segments that also use split-even mode
    if (s.durationMode !== 'split-even') return false
    return true
  })
  
  const index = siblings.findIndex(s => s.segmentId === segment.segmentId)
  
  // Get the anchor time for the group
  const clip = findAnchoredAudioClip(segment.audioAnchor, audioTracks)
  const anchorTime = clip ? calculateAnchorTime(clip, segment.audioAnchor) : 0
  
  return { 
    total: siblings.length, 
    index: Math.max(0, index),
    anchorTime
  }
}

// ============================================================================
// Main Calculation Function
// ============================================================================

/**
 * Calculate display timing for all segments based on audio anchors
 * 
 * For segments with audioAnchor set, timing is automatically calculated:
 * - displayStartTime comes from the anchor position + offset
 * - displayDuration depends on durationMode:
 *   - 'manual': Uses imageDuration or default calculation
 *   - 'match-audio': Matches the anchored audio clip's duration
 *   - 'fill-to-next': Extends to next anchor or scene end
 *   - 'split-even': Splits available time with sibling segments on same audio
 * 
 * For segments without anchors, uses existing timing values.
 * 
 * @param segments - Scene segments with optional audio anchors
 * @param audioTracks - Audio track data with timing info
 * @param sceneDuration - Total scene duration (for fill-to-next fallback)
 * @returns Array of calculated timing for each segment
 */
export function calculateAnchoredTiming(
  segments: SceneSegment[],
  audioTracks: AudioTracksData,
  sceneDuration: number
): CalculatedTiming[] {
  const results: CalculatedTiming[] = []
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    
    // Default timing (non-anchored)
    let displayStartTime = segment.startTime
    let displayDuration = segment.imageDuration ?? ((segment.endTime - segment.startTime) * 2)
    let anchorSource: string | undefined
    let isAnchored = false
    
    // If segment has audio anchor, calculate timing from it
    if (segment.audioAnchor) {
      const clip = findAnchoredAudioClip(segment.audioAnchor, audioTracks)
      
      if (clip) {
        isAnchored = true
        displayStartTime = calculateAnchorTime(clip, segment.audioAnchor)
        
        // Build human-readable anchor description
        const typeLabel = segment.audioAnchor.type.charAt(0).toUpperCase() + segment.audioAnchor.type.slice(1)
        const charLabel = clip.characterName || clip.label || ''
        const posLabel = segment.audioAnchor.position
        anchorSource = `${typeLabel}${charLabel ? ` (${charLabel})` : ''} ${posLabel}`
        
        // Calculate duration based on mode
        const mode = segment.durationMode || 'manual'
        
        switch (mode) {
          case 'match-audio':
            // Duration matches the audio clip's duration
            displayDuration = clip.duration
            break
            
          case 'fill-to-next':
            // Extend to next anchor boundary or scene end
            const nextBoundary = findNextBoundary(i, segments, audioTracks, sceneDuration)
            displayDuration = Math.max(0.5, nextBoundary - displayStartTime)
            break
            
          case 'split-even':
            // Split available time evenly with siblings on same audio
            const { total, index, anchorTime } = countSiblingsOnSameAudio(segment, segments, audioTracks)
            
            // Find the boundary that all siblings fill to
            const siblingEndBoundary = findNextBoundary(
              // Start searching from the last sibling
              segments.findIndex(s => 
                s.audioAnchor?.type === segment.audioAnchor?.type &&
                s.audioAnchor?.trackIndex === segment.audioAnchor?.trackIndex &&
                s.audioAnchor?.characterName === segment.audioAnchor?.characterName &&
                s.durationMode === 'split-even'
              ),
              segments,
              audioTracks,
              sceneDuration
            )
            
            // Calculate total available time and split it
            const totalAvailableTime = siblingEndBoundary - anchorTime
            const splitDuration = totalAvailableTime / Math.max(1, total)
            
            displayDuration = splitDuration
            // Offset start time for this sibling's position in the group
            displayStartTime = anchorTime + (index * splitDuration)
            break
            
          case 'manual':
          default:
            // Use imageDuration or default calculation
            displayDuration = segment.imageDuration ?? ((segment.endTime - segment.startTime) * 2)
            break
        }
      }
    }
    
    results.push({
      segmentId: segment.segmentId,
      displayStartTime,
      displayDuration,
      anchorSource,
      isAnchored
    })
  }
  
  return results
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a human-readable summary of anchor settings
 */
export function describeAnchor(anchor: AudioAnchor): string {
  const type = anchor.type.charAt(0).toUpperCase() + anchor.type.slice(1)
  const position = anchor.position === 'start' ? 'start' : 'end'
  const character = anchor.characterName ? ` (${anchor.characterName})` : ''
  const trackIdx = anchor.trackIndex !== undefined ? ` #${anchor.trackIndex + 1}` : ''
  const offset = anchor.offsetSeconds 
    ? ` ${anchor.offsetSeconds > 0 ? '+' : ''}${anchor.offsetSeconds.toFixed(1)}s`
    : ''
  return `${type}${character}${trackIdx} ${position}${offset}`
}

/**
 * Get a human-readable description of duration mode
 */
export function describeDurationMode(mode: DurationMode): string {
  switch (mode) {
    case 'manual': return 'Manual duration'
    case 'fill-to-next': return 'Fill to next anchor'
    case 'match-audio': return 'Match audio length'
    case 'split-even': return 'Split evenly'
    default: return 'Manual'
  }
}

/**
 * Check if any segments in the array have audio anchors configured
 */
export function hasAudioAnchors(segments: SceneSegment[]): boolean {
  return segments.some(s => s.audioAnchor != null)
}

/**
 * Get all unique anchor types used in segments
 */
export function getUsedAnchorTypes(segments: SceneSegment[]): AudioAnchor['type'][] {
  const types = new Set<AudioAnchor['type']>()
  segments.forEach(s => {
    if (s.audioAnchor) {
      types.add(s.audioAnchor.type)
    }
  })
  return Array.from(types)
}

// ============================================================================
// Intelligent Default Alignment
// ============================================================================

/**
 * Automatically assigns audio anchors to keyframes based on available audio.
 * 
 * Strategy:
 * 1. First keyframe anchors to narration start (if narration exists) or first dialogue
 * 2. Subsequent keyframes anchor to dialogue clips in sequence
 * 3. If more keyframes than dialogue, remaining keyframes use 'split-even' on narration
 * 4. Uses 'fill-to-next' duration mode so each keyframe extends to next anchor
 * 
 * This creates a natural flow where keyframes transition at audio boundaries.
 * 
 * @param segments - Scene segments to apply defaults to
 * @param audioTracks - Audio track data to anchor to
 * @returns Segments with audioAnchor and durationMode applied
 */
export function applyIntelligentDefaults(
  segments: SceneSegment[],
  audioTracks: AudioTracksData
): SceneSegment[] {
  if (segments.length === 0) return segments
  
  // Collect available audio clips with their timing
  const narrationClips = (audioTracks.voiceover || []).filter(v => 
    v.label?.toLowerCase().includes('narration')
  )
  const descriptionClips = (audioTracks.voiceover || []).filter(v => 
    v.label?.toLowerCase().includes('description')
  )
  const dialogueClips = audioTracks.dialogue || []
  
  // Sort by start time
  const sortedDialogue = [...dialogueClips].sort((a, b) => a.startTime - b.startTime)
  
  // Determine anchor strategy
  const hasNarration = narrationClips.length > 0
  const hasDescription = descriptionClips.length > 0
  const hasDialogue = sortedDialogue.length > 0
  
  // If no audio at all, return segments unchanged
  if (!hasNarration && !hasDescription && !hasDialogue) {
    return segments
  }
  
  const result: SceneSegment[] = []
  let dialogueIndex = 0
  
  for (let i = 0; i < segments.length; i++) {
    const segment = { ...segments[i] }
    
    if (i === 0) {
      // First keyframe: anchor to narration/description start, or first dialogue
      if (hasNarration) {
        segment.audioAnchor = {
          type: 'narration',
          position: 'start',
          offsetSeconds: 0
        }
        segment.durationMode = hasDialogue ? 'fill-to-next' : (segments.length > 1 ? 'split-even' : 'match-audio')
      } else if (hasDescription) {
        segment.audioAnchor = {
          type: 'description',
          position: 'start',
          offsetSeconds: 0
        }
        segment.durationMode = hasDialogue ? 'fill-to-next' : (segments.length > 1 ? 'split-even' : 'match-audio')
      } else if (hasDialogue) {
        // Anchor to first dialogue
        segment.audioAnchor = {
          type: 'dialogue',
          position: 'start',
          trackIndex: 0,
          characterName: sortedDialogue[0].label,
          offsetSeconds: 0
        }
        segment.durationMode = sortedDialogue.length > 1 ? 'fill-to-next' : 'match-audio'
        dialogueIndex = 1 // Next keyframe starts at second dialogue
      }
    } else if (dialogueIndex < sortedDialogue.length) {
      // Subsequent keyframes: anchor to dialogue clips in sequence
      const dialogueClip = sortedDialogue[dialogueIndex]
      segment.audioAnchor = {
        type: 'dialogue',
        position: 'start',
        trackIndex: dialogueIndex,
        characterName: dialogueClip.label,
        offsetSeconds: 0
      }
      segment.durationMode = dialogueIndex < sortedDialogue.length - 1 ? 'fill-to-next' : 'match-audio'
      dialogueIndex++
    } else if (hasNarration) {
      // More keyframes than dialogue: split evenly across narration
      segment.audioAnchor = {
        type: 'narration',
        position: 'start',
        offsetSeconds: 0
      }
      segment.durationMode = 'split-even'
    } else if (hasDescription) {
      // Fall back to description if no narration
      segment.audioAnchor = {
        type: 'description',
        position: 'start',
        offsetSeconds: 0
      }
      segment.durationMode = 'split-even'
    }
    // If we've exhausted all anchor options, segment keeps its original timing
    
    result.push(segment)
  }
  
  return result
}
