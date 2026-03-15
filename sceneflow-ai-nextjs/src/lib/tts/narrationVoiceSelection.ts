/**
 * Narrator Voice Catalog
 * 
 * Curated catalog of ElevenLabs voices optimized for narration use cases.
 * Used by the NarratorVoicePicker for a compact, focused selection experience
 * instead of the full voice browser.
 */

// ================================================================================
// Types
// ================================================================================

export interface NarrationVoice {
  id: string
  name: string
  gender: 'male' | 'female'
  age: 'young' | 'middle' | 'mature'
  tone: 'warm' | 'dramatic' | 'authoritative' | 'gentle' | 'energetic' | 'mysterious'
  style: 'cinematic' | 'documentary' | 'conversational' | 'theatrical' | 'intimate'
  accent: 'american' | 'british'
  /** Short human-readable description */
  description: string
  /** Genres / use-cases this voice excels at */
  bestFor: string[]
}

export interface NarrationContext {
  genre?: string
  tone?: string
  era?: string
  setting?: string
  targetAudience?: string
  genderPreference?: 'male' | 'female' | 'any'
}

// ================================================================================
// Curated Voice Catalog
// ================================================================================

export const NARRATION_VOICES: NarrationVoice[] = [
  // --- Male Voices ---
  {
    id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    gender: 'male',
    age: 'middle',
    tone: 'dramatic',
    style: 'cinematic',
    accent: 'american',
    description: 'Deep cinematic voice with gravitas',
    bestFor: ['epic', 'thriller', 'action', 'sci-fi', 'documentary'],
  },
  {
    id: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    gender: 'male',
    age: 'middle',
    tone: 'warm',
    style: 'conversational',
    accent: 'american',
    description: 'Warm conversational storyteller',
    bestFor: ['drama', 'romance', 'coming-of-age', 'indie'],
  },
  {
    id: 'VR6AewLTigWG4xSOukaG',
    name: 'Arnold',
    gender: 'male',
    age: 'mature',
    tone: 'authoritative',
    style: 'documentary',
    accent: 'american',
    description: 'Authoritative documentary narrator',
    bestFor: ['documentary', 'historical', 'war', 'biography'],
  },
  {
    id: 'TxGEqnHWrfWFTfGW9XjX',
    name: 'Josh',
    gender: 'male',
    age: 'young',
    tone: 'energetic',
    style: 'conversational',
    accent: 'american',
    description: 'Youthful energetic presence',
    bestFor: ['comedy', 'adventure', 'animation', 'youth'],
  },
  {
    id: 'yoZ06aMxZJJ28mfd3POQ',
    name: 'Sam',
    gender: 'male',
    age: 'middle',
    tone: 'mysterious',
    style: 'theatrical',
    accent: 'american',
    description: 'Mysterious theatrical voice',
    bestFor: ['horror', 'mystery', 'noir', 'psychological-thriller'],
  },

  // --- Female Voices ---
  {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    gender: 'female',
    age: 'young',
    tone: 'warm',
    style: 'intimate',
    accent: 'american',
    description: 'Warm intimate storyteller',
    bestFor: ['romance', 'drama', 'coming-of-age', 'memoir'],
  },
  {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    gender: 'female',
    age: 'middle',
    tone: 'authoritative',
    style: 'documentary',
    accent: 'american',
    description: 'Clear authoritative narrator',
    bestFor: ['documentary', 'drama', 'biography', 'educational'],
  },
  {
    id: 'XB0fDUnXU5powFXDhCwa',
    name: 'Charlotte',
    gender: 'female',
    age: 'middle',
    tone: 'dramatic',
    style: 'cinematic',
    accent: 'british',
    description: 'Dramatic British cinematic voice',
    bestFor: ['period-drama', 'fantasy', 'literary-adaptation'],
  },
  {
    id: 'jBpfuIE2acCO8z3wKNLl',
    name: 'Gigi',
    gender: 'female',
    age: 'young',
    tone: 'energetic',
    style: 'conversational',
    accent: 'american',
    description: 'Bright energetic narrator',
    bestFor: ['comedy', 'animation', 'youth', 'adventure'],
  },
  {
    id: 'XrExE9yKIg1WjnnlVkGX',
    name: 'Lily',
    gender: 'female',
    age: 'mature',
    tone: 'gentle',
    style: 'intimate',
    accent: 'british',
    description: 'Gentle ethereal storytelling voice',
    bestFor: ['fantasy', 'children', 'fairy-tale', 'nature-documentary'],
  },
]

// ================================================================================
// Selection Logic
// ================================================================================

/**
 * Score a narration voice against a context to find the best match.
 * Returns 0-100 score.
 */
function scoreNarrationVoice(voice: NarrationVoice, context: NarrationContext): number {
  let score = 50 // base

  // Gender preference
  if (context.genderPreference && context.genderPreference !== 'any') {
    if (voice.gender === context.genderPreference) score += 15
    else score -= 20
  }

  // Genre match
  if (context.genre) {
    const genre = context.genre.toLowerCase()
    const genreMatches = voice.bestFor.some(bf => genre.includes(bf) || bf.includes(genre))
    if (genreMatches) score += 20
    
    // Partial matches
    if (!genreMatches) {
      if (genre.includes('drama') && voice.tone === 'dramatic') score += 8
      if (genre.includes('comedy') && voice.tone === 'energetic') score += 8
      if (genre.includes('thriller') && voice.tone === 'mysterious') score += 8
      if (genre.includes('documentary') && voice.style === 'documentary') score += 10
      if (genre.includes('horror') && voice.tone === 'mysterious') score += 10
      if (genre.includes('romance') && voice.tone === 'warm') score += 8
      if (genre.includes('action') && voice.tone === 'dramatic') score += 5
    }
  }

  // Tone match
  if (context.tone) {
    const tone = context.tone.toLowerCase()
    if (tone.includes('serious') && (voice.tone === 'dramatic' || voice.tone === 'authoritative')) score += 10
    if (tone.includes('light') && (voice.tone === 'warm' || voice.tone === 'energetic')) score += 10
    if (tone.includes('dark') && (voice.tone === 'mysterious' || voice.tone === 'dramatic')) score += 10
    if (tone.includes('warm') && voice.tone === 'warm') score += 10
    if (tone.includes('epic') && voice.style === 'cinematic') score += 10
  }

  // Era / setting
  if (context.era) {
    const era = context.era.toLowerCase()
    if (era.includes('period') || era.includes('historical') || era.includes('victorian')) {
      if (voice.accent === 'british') score += 8
      if (voice.style === 'cinematic' || voice.style === 'theatrical') score += 5
    }
    if (era.includes('modern') || era.includes('contemporary')) {
      if (voice.style === 'conversational') score += 5
    }
    if (era.includes('future') || era.includes('sci-fi')) {
      if (voice.style === 'cinematic') score += 5
    }
  }

  // Target audience
  if (context.targetAudience) {
    const audience = context.targetAudience.toLowerCase()
    if (audience.includes('children') || audience.includes('family')) {
      if (voice.tone === 'warm' || voice.tone === 'gentle') score += 8
      if (voice.age === 'young') score += 5
    }
    if (audience.includes('adult') || audience.includes('mature')) {
      if (voice.age === 'mature' || voice.age === 'middle') score += 5
    }
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * Select the optimal narration voice for a given context.
 * Returns the best-matching voice from the catalog.
 */
export function selectOptimalNarrationVoice(context: NarrationContext): NarrationVoice {
  let bestVoice = NARRATION_VOICES[0] // Default to Adam
  let bestScore = -1

  for (const voice of NARRATION_VOICES) {
    const score = scoreNarrationVoice(voice, context)
    if (score > bestScore) {
      bestScore = score
      bestVoice = voice
    }
  }

  return bestVoice
}

/**
 * Get the default narration voice (Adam).
 */
export function getDefaultNarrationVoice(): NarrationVoice {
  return NARRATION_VOICES[0]
}

/**
 * Get a voice by its ElevenLabs ID.
 */
export function getVoiceById(voiceId: string): NarrationVoice | undefined {
  return NARRATION_VOICES.find(v => v.id === voiceId)
}

/**
 * Get all voices matching a style.
 */
export function getVoicesByStyle(style: NarrationVoice['style']): NarrationVoice[] {
  return NARRATION_VOICES.filter(v => v.style === style)
}

/**
 * Get ranked narration voices with scores for a given context.
 */
export function getRankedNarrationVoices(context: NarrationContext): Array<{ voice: NarrationVoice; score: number }> {
  return NARRATION_VOICES
    .map(voice => ({ voice, score: scoreNarrationVoice(voice, context) }))
    .sort((a, b) => b.score - a.score)
}
