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
  const dialogueClips: AudioTrackClipV2[] = []
  let currentTime = tracks.voiceover 
    ? (tracks.voiceover.startTime + tracks.voiceover.duration + 0.5) 
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
        currentTime += duration + 0.5
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
        currentTime += duration + 0.5
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
  if (Array.isArray(scene.sfxAudio)) {
    scene.sfxAudio.forEach((sfxUrl: string, idx: number) => {
      if (sfxUrl && typeof sfxUrl === 'string' && sfxUrl.trim()) {
        const sfxDef = scene.sfx?.[idx]
        tracks.sfx.push({
          id: `sfx-${idx}`,
          url: sfxUrl,
          startTime: sfxDef?.startTime || idx * 2,
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
