/**
 * Audio Track Builder V2
 * 
 * Single source of truth for deriving audio tracks from scene data.
 * Supports multi-language audio and provides proper null handling to avoid stale URLs.
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

import {
  AudioTrackClipV2,
  AudioTracksDataV2,
  MultiLanguageAudioTracks,
  TimelineAudioState,
  AudioClipSource,
} from './types'

/**
 * Generate a hash of all audio URLs for change detection.
 * When the hash changes, React should re-render the timeline.
 */
export function hashAudioUrls(tracks: AudioTracksDataV2 | null): string {
  if (!tracks) return 'empty'
  
  const urls: string[] = []
  
  if (tracks.voiceover?.url) urls.push(tracks.voiceover.url)
  if (tracks.description?.url) urls.push(tracks.description.url)
  if (tracks.music?.url) urls.push(tracks.music.url)
  
  tracks.dialogue.forEach(d => {
    if (d.url) urls.push(d.url)
  })
  
  tracks.sfx.forEach(s => {
    if (s.url) urls.push(s.url)
  })
  
  // Simple hash function
  const urlString = urls.join('|')
  let hash = 0
  for (let i = 0; i < urlString.length; i++) {
    const char = urlString.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Detect available languages in scene audio data
 */
export function detectAvailableLanguages(scene: any): string[] {
  const languages = new Set<string>()
  
  // Check narration audio languages
  if (scene?.narrationAudio && typeof scene.narrationAudio === 'object') {
    Object.keys(scene.narrationAudio).forEach(lang => {
      if (scene.narrationAudio[lang]?.url) {
        languages.add(lang)
      }
    })
  }
  
  // Check description audio languages
  if (scene?.descriptionAudio && typeof scene.descriptionAudio === 'object') {
    Object.keys(scene.descriptionAudio).forEach(lang => {
      if (scene.descriptionAudio[lang]?.url) {
        languages.add(lang)
      }
    })
  }
  
  // Check dialogue audio languages
  if (scene?.dialogueAudio && typeof scene.dialogueAudio === 'object') {
    Object.keys(scene.dialogueAudio).forEach(lang => {
      if (Array.isArray(scene.dialogueAudio[lang]) && scene.dialogueAudio[lang].length > 0) {
        languages.add(lang)
      }
    })
  }
  
  // Default to English if no languages detected
  if (languages.size === 0) {
    languages.add('en')
  }
  
  return Array.from(languages).sort()
}

/**
 * Build audio tracks from scene data for a specific language.
 * Returns null for missing audio instead of stale URLs.
 */
export function buildAudioTracksForLanguage(
  scene: any,
  language: string = 'en'
): AudioTracksDataV2 {
  const emptyTracks: AudioTracksDataV2 = {
    voiceover: null,
    description: null,
    dialogue: [],
    music: null,
    sfx: [],
  }
  
  if (!scene) return emptyTracks
  
  const tracks: AudioTracksDataV2 = { ...emptyTracks }
  
  // Build voiceover/narration track
  const narrationAudio = scene.narrationAudio?.[language] || scene.narrationAudio?.en
  const narrationUrl = narrationAudio?.url || scene.narrationAudioUrl
  
  if (narrationUrl && typeof narrationUrl === 'string' && narrationUrl.trim()) {
    tracks.voiceover = {
      id: 'vo-scene',
      url: narrationUrl,
      startTime: 0, // Narration always starts at 0 seconds
      duration: narrationAudio?.duration || scene.narrationDuration || 0,
      label: 'Narration',
      volume: 1,
      language,
      source: 'scene' as AudioClipSource,
      scenePropertyPath: `narrationAudio.${language}.url`,
    }
  }
  
  // Description track removed - description is scene context for user, not production audio
  // Users who want scene description narrated can include it in their narration text
  
  // Build dialogue tracks - check multiple sources
  // Use AUDIO_ALIGNMENT_BUFFERS for consistent timing with segment generation
  const { NARRATION_BUFFER, INTER_CLIP_BUFFER } = AUDIO_ALIGNMENT_BUFFERS
  const dialogueClips: AudioTrackClipV2[] = []
  let currentTime = tracks.voiceover 
    ? (tracks.voiceover.startTime + tracks.voiceover.duration + NARRATION_BUFFER) 
    : 0
  
  // Get current dialogue lines for validation
  const currentDialogue: any[] = Array.isArray(scene.dialogue) ? scene.dialogue : []
  
  // Helper to check if audio entry matches a valid dialogue line
  // Returns null if valid, or a stale reason string if mismatched
  const getStaleReason = (audio: any, fallbackIdx: number): string | null => {
    // If no current dialogue, audio is stale
    if (currentDialogue.length === 0) return 'No dialogue lines in script'
    
    // Check if dialogueIndex is valid
    const targetIdx = audio.dialogueIndex ?? fallbackIdx
    if (targetIdx >= 0 && targetIdx < currentDialogue.length) {
      // Index is valid - check if character matches (loose validation)
      const dialogueLine = currentDialogue[targetIdx]
      const audioChar = (audio.character || audio.speaker || audio.characterName || '').toLowerCase().trim()
      const dialogueChar = (dialogueLine?.character || '').toLowerCase().trim()
      
      // If characters match or audio doesn't have character info, it's valid
      if (!audioChar || !dialogueChar || audioChar === dialogueChar) {
        return null
      }
    }
    
    // Fallback: check if any dialogue line has matching character
    // This helps when indices are out of sync but content matches
    const audioChar = (audio.character || audio.speaker || audio.characterName || '').toLowerCase().trim()
    if (audioChar) {
      const hasMatch = currentDialogue.some(d => 
        (d?.character || '').toLowerCase().trim() === audioChar
      )
      if (hasMatch) return null
      return `Character "${audioChar}" not found in current dialogue`
    }
    
    // No way to validate
    return 'Dialogue line may have been modified'
  }
  
  // Source 1: dialogueAudio[language] array (preferred)
  const dialogueAudioArray = scene.dialogueAudio?.[language] || scene.dialogueAudio?.en
  if (Array.isArray(dialogueAudioArray)) {
    dialogueAudioArray.forEach((audio: any, idx: number) => {
      const url = audio?.audioUrl || audio?.url
      if (url && typeof url === 'string' && url.trim()) {
        // Check if dialogue audio matches current script - mark as stale if not
        const staleReason = getStaleReason(audio, idx)
        if (staleReason) {
          console.warn(`[audioTrackBuilder] Stale dialogue audio at index ${idx}: ${staleReason}`)
        }
        
        const duration = audio.duration || 3
        dialogueClips.push({
          id: `dialogue-${idx}`,
          url,
          startTime: audio.startTime ?? currentTime,
          duration,
          label: audio.character || audio.speaker || audio.characterName || `Line ${idx + 1}`,
          volume: 1,
          language,
          source: 'scene' as AudioClipSource,
          scenePropertyPath: `dialogueAudio.${language}[${idx}].url`,
          characterName: audio.character || audio.speaker || audio.characterName,
          dialogueIndex: audio.dialogueIndex ?? idx,
          isStale: !!staleReason,
          staleReason: staleReason || undefined,
        })
        currentTime += duration + INTER_CLIP_BUFFER
      }
    })
  }
  
  // Source 2: scene.dialogue[].audioUrl (fallback for legacy data)
  if (dialogueClips.length === 0 && Array.isArray(scene.dialogue)) {
    scene.dialogue.forEach((d: any, idx: number) => {
      const url = d.audioUrl || d.url
      if (url && typeof url === 'string' && url.trim()) {
        const duration = d.audioDuration || d.duration || 3
        dialogueClips.push({
          id: `dialogue-${idx}`,
          url,
          startTime: d.startTime ?? currentTime,
          duration,
          label: d.character || `Line ${idx + 1}`,
          volume: 1,
          language,
          source: 'scene' as AudioClipSource,
          scenePropertyPath: `dialogue[${idx}].audioUrl`,
          characterName: d.character,
          dialogueIndex: idx,
        })
        currentTime += duration + INTER_CLIP_BUFFER
      }
    })
  }
  
  tracks.dialogue = dialogueClips
  
  // Build music track
  const musicUrl = scene.musicAudio || scene.music?.url || scene.musicUrl
  if (musicUrl && typeof musicUrl === 'string' && musicUrl.trim()) {
    tracks.music = {
      id: 'music-scene',
      url: musicUrl,
      startTime: scene.musicStartTime || 0,
      duration: scene.musicDuration || 60, // Default to 60s for background music
      label: scene.music?.name || 'Background Music',
      volume: 0.6,
      language: 'all', // Music is language-independent
      source: 'scene' as AudioClipSource,
      scenePropertyPath: 'musicAudio',
    }
  }
  
  // Build SFX tracks
  // SFX should start after narration ends (same anchor as dialogue)
  // This ensures consistent timing behavior across all audio types
  const sfxAnchorTime = tracks.voiceover 
    ? tracks.voiceover.startTime + tracks.voiceover.duration + AUDIO_ALIGNMENT_BUFFERS.NARRATION_BUFFER
    : 0  // Fallback to scene start if no narration
  
  if (Array.isArray(scene.sfxAudio)) {
    scene.sfxAudio.forEach((sfxUrl: string, idx: number) => {
      if (sfxUrl && typeof sfxUrl === 'string' && sfxUrl.trim()) {
        const sfxDef = scene.sfx?.[idx]
        // Use explicit time if set (from user edits), otherwise position relative to anchor
        // Note: VisionPage writes to 'time' property, so we read from that
        const explicitStartTime = sfxDef?.time ?? sfxDef?.startTime // Support both for backwards compatibility
        const defaultStartTime = sfxAnchorTime + (idx * AUDIO_ALIGNMENT_BUFFERS.INTER_CLIP_BUFFER) // Space SFX apart using buffer
        
        tracks.sfx.push({
          id: `sfx-${idx}`,
          url: sfxUrl,
          startTime: explicitStartTime ?? defaultStartTime,
          duration: sfxDef?.duration || 2,
          label: sfxDef?.name || sfxDef?.description || `SFX ${idx + 1}`,
          volume: 0.8,
          language: 'all', // SFX is language-independent
          source: 'scene' as AudioClipSource,
          scenePropertyPath: `sfxAudio[${idx}]`,
        })
      }
    })
  }
  
  return tracks
}

/**
 * Determine the baseline language for audio timing.
 * 
 * Priority:
 * 1. English ('en') if it has audio
 * 2. First available language with audio
 * 3. Fallback to 'en'
 */
export function determineBaselineLanguage(scene: any): string {
  const available = detectAvailableLanguages(scene)
  
  // Prefer English if available
  if (available.includes('en')) {
    return 'en'
  }
  
  // Otherwise use first available language
  return available[0] || 'en'
}

/**
 * Build audio tracks using baseline language timing with target language URLs.
 * 
 * SMART SEGMENT-ALIGNED TIMING:
 * - Uses target language's actual audio durations
 * - When narration is longer than baseline, shifts dialogue start times
 * - Stores delta information for segment extension (freeze-frame on longer audio)
 * 
 * Example: English narration is 19.6s spanning 3 segments. Thai narration is 24s.
 * The third segment will be extended (freeze-frame) until Thai narration completes.
 * 
 * @param scene - The scene object containing audio data
 * @param targetLanguage - The language to get audio URLs from
 * @param baselineLanguage - The language to use for timing reference (default: 'en' or first available)
 * @returns AudioTracksDataV2 with smart timing and target language URLs
 */
export function buildAudioTracksWithBaselineTiming(
  scene: any,
  targetLanguage: string = 'en',
  baselineLanguage?: string
): AudioTracksDataV2 {
  const emptyTracks: AudioTracksDataV2 = {
    voiceover: null,
    description: null,
    dialogue: [],
    music: null,
    sfx: [],
  }
  
  if (!scene) return emptyTracks
  
  // Determine baseline language if not specified
  const effectiveBaseline = baselineLanguage || determineBaselineLanguage(scene)
  
  // If target is same as baseline, just build normally
  if (targetLanguage === effectiveBaseline) {
    return buildAudioTracksForLanguage(scene, targetLanguage)
  }
  
  // Build baseline tracks first (for timing reference)
  const baselineTracks = buildAudioTracksForLanguage(scene, effectiveBaseline)
  
  // Build target tracks (for URLs and actual durations)
  const targetTracks = buildAudioTracksForLanguage(scene, targetLanguage)
  
  // Calculate narration duration delta
  const baselineNarrationDuration = baselineTracks.voiceover?.duration || 0
  const targetNarrationDuration = targetTracks.voiceover?.duration || 0
  const narrationDurationDelta = targetNarrationDuration - baselineNarrationDuration
  
  // When target narration is longer, shift dialogue/sfx start times
  const dialogueShift = Math.max(0, narrationDurationDelta)
  
  // Create result with smart timing
  const result: AudioTracksDataV2 = {
    voiceover: null,
    description: null,
    dialogue: [],
    music: baselineTracks.music,  // Music is language-independent
    sfx: [],
  }
  
  // Voiceover: Use target URL and ACTUAL duration (allows freeze-frame on segment)
  if (targetTracks.voiceover?.url) {
    result.voiceover = {
      ...targetTracks.voiceover,              // Use target's actual timing
      startTime: 0,                            // Narration always starts at 0
      language: targetLanguage,
      // Store delta info for segment extension calculation
      baselineDuration: baselineNarrationDuration,
      durationDelta: narrationDurationDelta,
      actualDuration: targetNarrationDuration,
    }
  } else if (baselineTracks.voiceover && !targetTracks.voiceover?.url) {
    // Baseline has voiceover but target doesn't - this is unusual but handle gracefully
    result.voiceover = null
  }
  
  // Description: Same pattern as voiceover
  if (targetTracks.description?.url) {
    const baselineDescDuration = baselineTracks.description?.duration || 0
    const targetDescDuration = targetTracks.description.duration
    result.description = {
      ...targetTracks.description,
      language: targetLanguage,
      baselineDuration: baselineDescDuration,
      durationDelta: targetDescDuration - baselineDescDuration,
      actualDuration: targetDescDuration,
    }
  }
  
  // Dialogue: Use baseline positions but SHIFT by narration delta + use actual durations
  const { NARRATION_BUFFER, INTER_CLIP_BUFFER } = AUDIO_ALIGNMENT_BUFFERS
  const targetDialogueMap = new Map<number, typeof targetTracks.dialogue[0]>()
  targetTracks.dialogue.forEach(clip => {
    if (clip.dialogueIndex !== undefined) {
      targetDialogueMap.set(clip.dialogueIndex, clip)
    }
  })
  
  // Running cursor for dialogue positioning (starts after narration + buffer + shift)
  let dialogueCursor = targetNarrationDuration > 0 
    ? targetNarrationDuration + NARRATION_BUFFER 
    : (baselineNarrationDuration > 0 ? baselineNarrationDuration + NARRATION_BUFFER : 0)
  
  baselineTracks.dialogue.forEach((baselineClip, idx) => {
    const targetClip = targetDialogueMap.get(baselineClip.dialogueIndex ?? idx)
    
    if (targetClip?.url) {
      const baselineDuration = baselineClip.duration
      const targetDuration = targetClip.duration
      const durationDelta = targetDuration - baselineDuration
      
      result.dialogue.push({
        ...baselineClip,                      // Keep baseline metadata
        url: targetClip.url,                  // Use target language URL
        startTime: dialogueCursor,            // Position sequentially after shift
        duration: targetDuration,             // Use ACTUAL target duration
        language: targetLanguage,
        baselineDuration,
        durationDelta,
        actualDuration: targetDuration,
      })
      
      // Advance cursor by target duration + buffer
      dialogueCursor += targetDuration + INTER_CLIP_BUFFER
    }
  })
  
  // Handle extra dialogue clips in target that don't exist in baseline
  targetTracks.dialogue.forEach(targetClip => {
    const existsInResult = result.dialogue.some(
      d => d.dialogueIndex === targetClip.dialogueIndex
    )
    if (!existsInResult && targetClip.url) {
      result.dialogue.push({
        ...targetClip,
        startTime: dialogueCursor,
        language: targetLanguage,
        baselineDuration: 0,  // No baseline reference
        durationDelta: targetClip.duration,  // Entire duration is "extra"
      })
      dialogueCursor += targetClip.duration + INTER_CLIP_BUFFER
    }
  })
  
  // SFX: Shift by narration delta (SFX anchors to post-narration)
  baselineTracks.sfx.forEach((sfxClip) => {
    result.sfx.push({
      ...sfxClip,
      startTime: sfxClip.startTime + dialogueShift,  // Shift by narration delta
    })
  })
  
  return result
}

/**
 * Segment timing result with extension info for freeze-frame
 */
export interface SegmentTimingResult {
  segmentIndex: number
  startTime: number
  endTime: number
  baseDuration: number      // Original segment duration
  displayDuration: number   // Actual display duration (may be extended)
  isExtended: boolean       // True if segment was extended for longer audio
  extensionReason?: 'narration' | 'dialogue'
}

/**
 * Calculate segment display timing for a specific language.
 * 
 * This function determines when each segment should display, extending
 * the last segment of an audio section when the audio is longer than baseline.
 * 
 * Example: English narration covers segments 0-2 (19.6s). Thai narration is 24s.
 * Segment 2's displayDuration will be extended by 4.4s (freeze-frame effect).
 * 
 * @param segments - Array of scene segments with baselineDuration
 * @param audioTracks - Audio tracks from buildAudioTracksWithBaselineTiming
 * @returns Array of segment timings with extension info
 */
export function calculateSegmentTimingForLanguage(
  segments: Array<{ duration: number; segmentIndex?: number }>,
  audioTracks: AudioTracksDataV2
): SegmentTimingResult[] {
  const results: SegmentTimingResult[] = []
  
  if (!segments || segments.length === 0) {
    return results
  }
  
  // Get narration delta (if narration is longer than baseline)
  const narrationDelta = audioTracks.voiceover?.durationDelta || 0
  const narrationDuration = audioTracks.voiceover?.duration || 0
  const baselineNarrationDuration = audioTracks.voiceover?.baselineDuration || narrationDuration
  
  // Calculate cumulative segment times from baseline
  let cumulativeTime = 0
  const segmentTimes: Array<{ start: number; end: number; baseDuration: number }> = []
  
  segments.forEach((seg) => {
    const baseDuration = seg.duration || 0
    segmentTimes.push({
      start: cumulativeTime,
      end: cumulativeTime + baseDuration,
      baseDuration,
    })
    cumulativeTime += baseDuration
  })
  
  // Find which segment the baseline narration ends in
  let narrationEndSegmentIndex = -1
  if (baselineNarrationDuration > 0) {
    for (let i = 0; i < segmentTimes.length; i++) {
      const seg = segmentTimes[i]
      if (baselineNarrationDuration <= seg.end) {
        narrationEndSegmentIndex = i
        break
      }
    }
    // If narration extends beyond all segments, last segment is the anchor
    if (narrationEndSegmentIndex === -1 && segmentTimes.length > 0) {
      narrationEndSegmentIndex = segmentTimes.length - 1
    }
  }
  
  // Calculate display timing for each segment
  let displayCursor = 0
  
  segments.forEach((seg, idx) => {
    const baseDuration = seg.duration || 0
    let displayDuration = baseDuration
    let isExtended = false
    let extensionReason: 'narration' | 'dialogue' | undefined
    
    // If this segment is where baseline narration ends, AND target narration is longer,
    // extend this segment by the delta (freeze-frame until narration completes)
    if (idx === narrationEndSegmentIndex && narrationDelta > 0) {
      displayDuration = baseDuration + narrationDelta
      isExtended = true
      extensionReason = 'narration'
    }
    
    results.push({
      segmentIndex: seg.segmentIndex ?? idx,
      startTime: displayCursor,
      endTime: displayCursor + displayDuration,
      baseDuration,
      displayDuration,
      isExtended,
      extensionReason,
    })
    
    displayCursor += displayDuration
  })
  
  // Handle dialogue extensions (for segments that contain dialogue)
  // Each dialogue clip is associated with a segment (dialogueIndex + narration segments offset)
  // If dialogue is longer than baseline, extend that segment
  audioTracks.dialogue.forEach((dialogueClip) => {
    const durationDelta = dialogueClip.durationDelta || 0
    if (durationDelta > 0 && dialogueClip.dialogueIndex !== undefined) {
      // Dialogue segments typically start after narration segments
      // The mapping is: segment (narrationEndSegmentIndex + 1 + dialogueIndex)
      // But this depends on scene structure. For now, we extend based on timing.
      
      const dialogueStart = dialogueClip.startTime
      
      // Find which segment this dialogue starts in
      for (let i = 0; i < results.length; i++) {
        const segResult = results[i]
        // Check if dialogue starts within this segment's display window
        if (dialogueStart >= segResult.startTime && dialogueStart < segResult.endTime) {
          // Extend this segment by the dialogue delta (if not already extended more)
          if (!segResult.isExtended) {
            segResult.displayDuration += durationDelta
            segResult.endTime += durationDelta
            segResult.isExtended = true
            segResult.extensionReason = 'dialogue'
            
            // Shift all subsequent segments
            for (let j = i + 1; j < results.length; j++) {
              results[j].startTime += durationDelta
              results[j].endTime += durationDelta
            }
          }
          break
        }
      }
    }
  })
  
  return results
}

/**
 * Check if user has overridden timing for a specific language.
 * Returns true if the scene has language-specific timing overrides stored.
 */
export function hasLanguageTimingOverride(scene: any, language: string): boolean {
  // Check for user timing overrides stored in scene metadata
  return scene?.audioTimingOverrides?.[language] != null
}

/**
 * Reset timing overrides for a language back to baseline.
 * This function returns the data needed to update the scene - it does NOT mutate the scene.
 * 
 * @param scene - The scene object
 * @param language - The language to reset
 * @returns Object with audioTimingOverrides update, or null if no override exists
 */
export function getResetTimingOverrideData(
  scene: any, 
  language: string
): { audioTimingOverrides: Record<string, null> } | null {
  if (!hasLanguageTimingOverride(scene, language)) {
    return null
  }
  
  return {
    audioTimingOverrides: {
      [language]: null,  // Clear the override for this language
    }
  }
}

/**
 * Build complete timeline audio state from scene data.
 * Derives all languages and their audio tracks.
 */
export function buildTimelineAudioState(
  scene: any,
  selectedLanguage: string = 'en'
): TimelineAudioState {
  const availableLanguages = detectAvailableLanguages(scene)
  
  // Ensure selected language is available, fallback to first available
  const effectiveLanguage = availableLanguages.includes(selectedLanguage)
    ? selectedLanguage
    : availableLanguages[0] || 'en'
  
  // Build tracks for all available languages
  const tracks: MultiLanguageAudioTracks = {}
  availableLanguages.forEach(lang => {
    tracks[lang] = buildAudioTracksForLanguage(scene, lang)
  })
  
  // Calculate hash from the selected language's tracks
  const audioHash = hashAudioUrls(tracks[effectiveLanguage] || null)
  
  return {
    selectedLanguage: effectiveLanguage,
    availableLanguages,
    tracks,
    audioHash,
  }
}

/**
 * Get the current language's audio tracks from timeline state.
 * Returns empty tracks if language not available.
 */
export function getCurrentLanguageTracks(state: TimelineAudioState): AudioTracksDataV2 {
  return state.tracks[state.selectedLanguage] || {
    voiceover: null,
    description: null,
    dialogue: [],
    music: null,
    sfx: [],
  }
}

/**
 * Convert V2 tracks to flat clip array for timeline rendering.
 * Only includes clips with valid URLs.
 */
export function flattenAudioTracks(tracks: AudioTracksDataV2): AudioTrackClipV2[] {
  const clips: AudioTrackClipV2[] = []
  
  if (tracks.voiceover?.url) clips.push(tracks.voiceover)
  if (tracks.description?.url) clips.push(tracks.description)
  
  tracks.dialogue.forEach(clip => {
    if (clip.url) clips.push(clip)
  })
  
  if (tracks.music?.url) clips.push(tracks.music)
  
  tracks.sfx.forEach(clip => {
    if (clip.url) clips.push(clip)
  })
  
  return clips
}

/**
 * Check if any audio clips exist for a given language
 */
export function hasAudioForLanguage(tracks: AudioTracksDataV2): boolean {
  if (tracks.voiceover?.url) return true
  if (tracks.description?.url) return true
  if (tracks.dialogue.some(d => d.url)) return true
  if (tracks.music?.url) return true
  if (tracks.sfx.some(s => s.url)) return true
  return false
}

// ============================================================================
// SEQUENTIAL ALIGNMENT SYSTEM
// ============================================================================

/**
 * Buffer constants for audio alignment (in seconds)
 */
export const AUDIO_ALIGNMENT_BUFFERS = {
  NARRATION_BUFFER: 2,    // Buffer after narration ends (2s gap before dialogue)
  INTER_CLIP_BUFFER: 2,   // Buffer between SFX/Dialogue clips (2s gap for natural pacing)
  MUSIC_END_BUFFER: 5,    // Buffer at end of music for fade-out (totalAudio + 5s)
}

/**
 * Represents an audio clip for sequential alignment
 */
export interface AlignmentClip {
  id: string
  type: 'narration' | 'sfx' | 'dialogue' | 'music'
  url: string
  duration: number        // Actual duration from audio file
  originalStartTime?: number  // Original position (for reference)
  label?: string
  isMuted?: boolean       // Whether this clip is muted
  sfxIndex?: number       // Original index in SFX array
  dialogueIndex?: number  // Original index in dialogue array
}

/**
 * Result of sequential alignment calculation
 */
export interface AlignmentResult {
  clips: Array<AlignmentClip & { startTime: number }>
  totalDuration: number   // Total scene duration including buffers
  musicDuration: number   // Calculated music duration (totalDuration + buffer)
}

/**
 * Calculate sequential alignment for audio clips.
 * 
 * Sequence: Narration → interleaved SFX/Dialogue → remaining items → Music spans all
 * 
 * @param narration - Narration clip (optional)
 * @param sfxClips - Array of SFX clips
 * @param dialogueClips - Array of dialogue clips
 * @param mutedClipIds - Set of clip IDs that are muted (will be skipped in alignment)
 * @returns AlignmentResult with calculated start times
 */
export function calculateSequentialAlignment(
  narration: AlignmentClip | null,
  sfxClips: AlignmentClip[],
  dialogueClips: AlignmentClip[],
  mutedClipIds: Set<string> = new Set()
): AlignmentResult {
  const { NARRATION_BUFFER, INTER_CLIP_BUFFER, MUSIC_END_BUFFER } = AUDIO_ALIGNMENT_BUFFERS
  
  const result: Array<AlignmentClip & { startTime: number }> = []
  let cursor = 0
  
  // 1. Narration starts at 0s (if not muted)
  if (narration && narration.url && !mutedClipIds.has(narration.id)) {
    const narrationWithTime = {
      ...narration,
      startTime: 0,
      isMuted: false,
    }
    result.push(narrationWithTime)
    cursor = narration.duration + NARRATION_BUFFER
  } else if (narration && mutedClipIds.has(narration.id)) {
    // Muted narration: keep at position 0 but don't advance cursor
    result.push({
      ...narration,
      startTime: 0,
      isMuted: true,
    })
  }
  
  // 2. Interleave SFX and Dialogue
  // Pattern: SFX1 → Dialogue1 → SFX2 → Dialogue2 → ...
  const maxPairs = Math.max(sfxClips.length, dialogueClips.length)
  
  for (let i = 0; i < maxPairs; i++) {
    // Process SFX at index i
    if (i < sfxClips.length) {
      const sfx = sfxClips[i]
      if (sfx.url) {
        const isMuted = mutedClipIds.has(sfx.id)
        if (!isMuted) {
          result.push({
            ...sfx,
            startTime: cursor,
            isMuted: false,
          })
          cursor += sfx.duration + INTER_CLIP_BUFFER
        } else {
          // Muted SFX: show at current cursor position but don't advance
          result.push({
            ...sfx,
            startTime: cursor,
            isMuted: true,
          })
        }
      }
    }
    
    // Process Dialogue at index i
    if (i < dialogueClips.length) {
      const dialogue = dialogueClips[i]
      if (dialogue.url) {
        const isMuted = mutedClipIds.has(dialogue.id)
        if (!isMuted) {
          result.push({
            ...dialogue,
            startTime: cursor,
            isMuted: false,
          })
          cursor += dialogue.duration + INTER_CLIP_BUFFER
        } else {
          // Muted dialogue: show at current cursor position but don't advance
          result.push({
            ...dialogue,
            startTime: cursor,
            isMuted: true,
          })
        }
      }
    }
  }
  
  // 3. Calculate total duration and music duration
  const totalDuration = cursor > 0 ? cursor : 10  // Minimum 10s scene
  const musicDuration = totalDuration + MUSIC_END_BUFFER
  
  return {
    clips: result,
    totalDuration,
    musicDuration,
  }
}

/**
 * Apply sequential alignment to scene audio data.
 * Returns updated audio arrays with new startTime values.
 * 
 * @param scene - The scene object containing audio data
 * @param language - The language to apply alignment for
 * @param mutedClipIds - Set of clip IDs that are muted
 * @returns Object with updated narration, dialogue, sfx, and music timing
 */
export function applySequentialAlignmentToScene(
  scene: any,
  language: string = 'en',
  mutedClipIds: Set<string> = new Set()
): {
  narrationStartTime: number
  narrationDuration: number
  dialogueTimings: Array<{ index: number; startTime: number; duration: number }>
  sfxTimings: Array<{ index: number; startTime: number; duration: number }>
  musicStartTime: number
  musicDuration: number
  totalDuration: number
} {
  // Extract narration
  const narrationAudio = scene.narrationAudio?.[language] || scene.narrationAudio?.en
  const narrationUrl = narrationAudio?.url || scene.narrationAudioUrl
  const narrationDuration = narrationAudio?.duration || scene.narrationDuration || 0
  
  const narration: AlignmentClip | null = narrationUrl ? {
    id: 'narration',
    type: 'narration',
    url: narrationUrl,
    duration: narrationDuration,
    label: 'Narration',
  } : null
  
  // Extract SFX clips
  const sfxClips: AlignmentClip[] = []
  const sfxAudioArray = scene.sfxAudio || []
  const sfxDefArray = scene.sfx || []
  
  for (let i = 0; i < Math.max(sfxAudioArray.length, sfxDefArray.length); i++) {
    const url = sfxAudioArray[i]
    const sfxDef = sfxDefArray[i] || {}
    if (url) {
      sfxClips.push({
        id: `sfx-${i}`,
        type: 'sfx',
        url,
        duration: sfxDef.duration || 2,
        label: typeof sfxDef === 'string' ? sfxDef.slice(0, 20) : (sfxDef.description?.slice(0, 20) || `SFX ${i + 1}`),
        sfxIndex: i,
      })
    }
  }
  
  // Extract dialogue clips
  const dialogueClips: AlignmentClip[] = []
  const dialogueAudioArray = scene.dialogueAudio?.[language] || scene.dialogueAudio?.en || []
  
  if (Array.isArray(dialogueAudioArray)) {
    dialogueAudioArray.forEach((audio: any, i: number) => {
      if (audio?.audioUrl) {
        dialogueClips.push({
          id: `dialogue-${i}`,
          type: 'dialogue',
          url: audio.audioUrl,
          duration: audio.duration || 3,
          label: audio.character || `Line ${i + 1}`,
          dialogueIndex: audio.dialogueIndex ?? i,
        })
      }
    })
  }
  
  // Calculate alignment
  const alignment = calculateSequentialAlignment(narration, sfxClips, dialogueClips, mutedClipIds)
  
  // Build result
  const dialogueTimings: Array<{ index: number; startTime: number; duration: number }> = []
  const sfxTimings: Array<{ index: number; startTime: number; duration: number }> = []
  let narrationStartTime = 0
  
  for (const clip of alignment.clips) {
    if (clip.type === 'narration' && !clip.isMuted) {
      narrationStartTime = clip.startTime
    } else if (clip.type === 'dialogue' && clip.dialogueIndex !== undefined) {
      dialogueTimings.push({
        index: clip.dialogueIndex,
        startTime: clip.startTime,
        duration: clip.duration,
      })
    } else if (clip.type === 'sfx' && clip.sfxIndex !== undefined) {
      sfxTimings.push({
        index: clip.sfxIndex,
        startTime: clip.startTime,
        duration: clip.duration,
      })
    }
  }
  
  return {
    narrationStartTime,
    narrationDuration,
    dialogueTimings,
    sfxTimings,
    musicStartTime: 0,
    musicDuration: alignment.musicDuration,
    totalDuration: alignment.totalDuration,
  }
}
