/**
 * Voice Selection Intelligence
 * 
 * Analyzes screenplay context to recommend optimal narration voice.
 * Ensures voice consistency and cinematic quality across the production.
 * 
 * @version 2.26 - Narration-Driven Segmentation
 */

// ElevenLabs voice catalog with characteristics
export interface VoiceProfile {
  id: string
  name: string
  provider: 'elevenlabs' | 'google'
  characteristics: {
    gender: 'male' | 'female' | 'neutral'
    age: 'young' | 'middle' | 'mature'
    tone: 'warm' | 'dramatic' | 'authoritative' | 'gentle' | 'energetic' | 'mysterious'
    style: 'cinematic' | 'documentary' | 'conversational' | 'theatrical' | 'intimate'
    accent?: 'american' | 'british' | 'neutral' | 'european'
  }
  bestFor: string[]
  sampleText?: string
}

// Curated voice catalog for narration
export const NARRATION_VOICES: VoiceProfile[] = [
  // Cinematic Male Voices
  {
    id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    provider: 'elevenlabs',
    characteristics: {
      gender: 'male',
      age: 'middle',
      tone: 'dramatic',
      style: 'cinematic',
      accent: 'american'
    },
    bestFor: ['epic', 'thriller', 'action', 'sci-fi', 'documentary']
  },
  {
    id: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    provider: 'elevenlabs',
    characteristics: {
      gender: 'male',
      age: 'middle',
      tone: 'warm',
      style: 'conversational',
      accent: 'american'
    },
    bestFor: ['drama', 'romance', 'coming-of-age', 'indie']
  },
  {
    id: 'VR6AewLTigWG4xSOukaG',
    name: 'Arnold',
    provider: 'elevenlabs',
    characteristics: {
      gender: 'male',
      age: 'mature',
      tone: 'authoritative',
      style: 'documentary',
      accent: 'american'
    },
    bestFor: ['documentary', 'historical', 'war', 'biography']
  },
  {
    id: 'TxGEqnHWrfWFTfGW9XjX',
    name: 'Josh',
    provider: 'elevenlabs',
    characteristics: {
      gender: 'male',
      age: 'young',
      tone: 'energetic',
      style: 'conversational',
      accent: 'american'
    },
    bestFor: ['comedy', 'adventure', 'animation', 'youth']
  },
  {
    id: 'yoZ06aMxZJJ28mfd3POQ',
    name: 'Sam',
    provider: 'elevenlabs',
    characteristics: {
      gender: 'male',
      age: 'middle',
      tone: 'mysterious',
      style: 'theatrical',
      accent: 'american'
    },
    bestFor: ['horror', 'mystery', 'noir', 'psychological-thriller']
  },
  // Cinematic Female Voices
  {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    provider: 'elevenlabs',
    characteristics: {
      gender: 'female',
      age: 'young',
      tone: 'warm',
      style: 'intimate',
      accent: 'american'
    },
    bestFor: ['romance', 'drama', 'coming-of-age', 'memoir']
  },
  {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    provider: 'elevenlabs',
    characteristics: {
      gender: 'female',
      age: 'middle',
      tone: 'authoritative',
      style: 'documentary',
      accent: 'american'
    },
    bestFor: ['documentary', 'drama', 'biography', 'educational']
  },
  {
    id: 'XB0fDUnXU5powFXDhCwa',
    name: 'Charlotte',
    provider: 'elevenlabs',
    characteristics: {
      gender: 'female',
      age: 'middle',
      tone: 'dramatic',
      style: 'cinematic',
      accent: 'british'
    },
    bestFor: ['period-drama', 'fantasy', 'literary-adaptation', 'british']
  },
  {
    id: 'jBpfuIE2acCO8z3wKNLl',
    name: 'Gigi',
    provider: 'elevenlabs',
    characteristics: {
      gender: 'female',
      age: 'young',
      tone: 'energetic',
      style: 'conversational',
      accent: 'american'
    },
    bestFor: ['comedy', 'animation', 'youth', 'adventure']
  },
  {
    id: 'XrExE9yKIg1WjnnlVkGX',
    name: 'Lily',
    provider: 'elevenlabs',
    characteristics: {
      gender: 'female',
      age: 'mature',
      tone: 'gentle',
      style: 'intimate',
      accent: 'british'
    },
    bestFor: ['fantasy', 'children', 'fairy-tale', 'nature-documentary']
  }
]

// Genre to voice characteristic mapping
const GENRE_PREFERENCES: Record<string, Partial<VoiceProfile['characteristics']>> = {
  // Action/Adventure
  'action': { gender: 'male', tone: 'dramatic', style: 'cinematic' },
  'adventure': { tone: 'energetic', style: 'cinematic' },
  'thriller': { gender: 'male', tone: 'dramatic', style: 'cinematic' },
  'war': { gender: 'male', tone: 'authoritative', style: 'documentary' },
  
  // Drama
  'drama': { tone: 'warm', style: 'cinematic' },
  'romance': { tone: 'warm', style: 'intimate' },
  'coming-of-age': { age: 'young', tone: 'warm', style: 'conversational' },
  'family': { tone: 'warm', style: 'conversational' },
  
  // Sci-Fi/Fantasy
  'sci-fi': { gender: 'male', tone: 'dramatic', style: 'cinematic' },
  'fantasy': { tone: 'mysterious', style: 'theatrical' },
  'superhero': { gender: 'male', tone: 'dramatic', style: 'cinematic' },
  
  // Horror/Mystery
  'horror': { tone: 'mysterious', style: 'theatrical' },
  'mystery': { tone: 'mysterious', style: 'theatrical' },
  'noir': { gender: 'male', tone: 'mysterious', style: 'cinematic' },
  'psychological-thriller': { tone: 'mysterious', style: 'intimate' },
  
  // Comedy
  'comedy': { tone: 'energetic', style: 'conversational' },
  'dark-comedy': { tone: 'dramatic', style: 'conversational' },
  'romantic-comedy': { tone: 'warm', style: 'conversational' },
  
  // Documentary/Historical
  'documentary': { tone: 'authoritative', style: 'documentary' },
  'historical': { tone: 'authoritative', style: 'documentary' },
  'biography': { tone: 'warm', style: 'documentary' },
  'true-crime': { tone: 'mysterious', style: 'documentary' },
  
  // Period/Literary
  'period-drama': { accent: 'british', style: 'theatrical' },
  'literary-adaptation': { style: 'theatrical' },
  
  // Animation
  'animation': { tone: 'energetic', style: 'conversational' },
  'anime': { age: 'young', tone: 'energetic' }
}

// Tone to voice characteristic mapping
const TONE_PREFERENCES: Record<string, Partial<VoiceProfile['characteristics']>> = {
  'dark': { tone: 'mysterious', style: 'theatrical' },
  'light': { tone: 'warm', style: 'conversational' },
  'epic': { tone: 'dramatic', style: 'cinematic' },
  'intimate': { tone: 'gentle', style: 'intimate' },
  'suspenseful': { tone: 'mysterious', style: 'cinematic' },
  'whimsical': { tone: 'energetic', style: 'conversational' },
  'melancholic': { tone: 'gentle', style: 'intimate' },
  'inspirational': { tone: 'warm', style: 'cinematic' },
  'gritty': { tone: 'authoritative', style: 'cinematic' },
  'ethereal': { tone: 'gentle', style: 'theatrical' }
}

export interface ScreenplayContext {
  genre?: string
  tone?: string
  era?: string // 'modern', 'historical', 'futuristic', 'period'
  setting?: string
  targetAudience?: string // 'adult', 'young-adult', 'children', 'family'
  narratorGender?: 'male' | 'female' | 'any'
  preferBritishAccent?: boolean
  logline?: string
  title?: string
}

export interface VoiceRecommendation {
  primary: VoiceProfile
  alternatives: VoiceProfile[]
  reasoning: string
  confidence: number // 0-100
}

/**
 * Analyzes screenplay context to recommend optimal narration voice
 */
export function selectOptimalNarrationVoice(context: ScreenplayContext): VoiceRecommendation {
  const scores = new Map<string, number>()
  
  // Initialize all voices with base score
  NARRATION_VOICES.forEach(voice => {
    scores.set(voice.id, 50)
  })
  
  // Score based on genre preferences
  if (context.genre) {
    const genreKey = context.genre.toLowerCase().replace(/\s+/g, '-')
    const genrePrefs = GENRE_PREFERENCES[genreKey]
    
    if (genrePrefs) {
      NARRATION_VOICES.forEach(voice => {
        let bonus = 0
        if (genrePrefs.gender && voice.characteristics.gender === genrePrefs.gender) bonus += 15
        if (genrePrefs.age && voice.characteristics.age === genrePrefs.age) bonus += 10
        if (genrePrefs.tone && voice.characteristics.tone === genrePrefs.tone) bonus += 20
        if (genrePrefs.style && voice.characteristics.style === genrePrefs.style) bonus += 15
        if (genrePrefs.accent && voice.characteristics.accent === genrePrefs.accent) bonus += 10
        
        scores.set(voice.id, (scores.get(voice.id) || 50) + bonus)
      })
    }
    
    // Check bestFor matches
    NARRATION_VOICES.forEach(voice => {
      if (voice.bestFor.some(g => genreKey.includes(g) || g.includes(genreKey))) {
        scores.set(voice.id, (scores.get(voice.id) || 50) + 25)
      }
    })
  }
  
  // Score based on tone preferences
  if (context.tone) {
    const toneKey = context.tone.toLowerCase()
    const tonePrefs = TONE_PREFERENCES[toneKey]
    
    if (tonePrefs) {
      NARRATION_VOICES.forEach(voice => {
        let bonus = 0
        if (tonePrefs.tone && voice.characteristics.tone === tonePrefs.tone) bonus += 15
        if (tonePrefs.style && voice.characteristics.style === tonePrefs.style) bonus += 10
        scores.set(voice.id, (scores.get(voice.id) || 50) + bonus)
      })
    }
  }
  
  // Score based on narrator gender preference
  if (context.narratorGender && context.narratorGender !== 'any') {
    NARRATION_VOICES.forEach(voice => {
      if (voice.characteristics.gender === context.narratorGender) {
        scores.set(voice.id, (scores.get(voice.id) || 50) + 20)
      } else {
        scores.set(voice.id, (scores.get(voice.id) || 50) - 30)
      }
    })
  }
  
  // Score based on accent preference
  if (context.preferBritishAccent) {
    NARRATION_VOICES.forEach(voice => {
      if (voice.characteristics.accent === 'british') {
        scores.set(voice.id, (scores.get(voice.id) || 50) + 15)
      }
    })
  }
  
  // Score based on era
  if (context.era) {
    const era = context.era.toLowerCase()
    NARRATION_VOICES.forEach(voice => {
      if (era === 'historical' || era === 'period') {
        if (voice.characteristics.style === 'theatrical' || voice.characteristics.accent === 'british') {
          scores.set(voice.id, (scores.get(voice.id) || 50) + 10)
        }
      } else if (era === 'futuristic') {
        if (voice.characteristics.style === 'cinematic' && voice.characteristics.tone === 'dramatic') {
          scores.set(voice.id, (scores.get(voice.id) || 50) + 10)
        }
      }
    })
  }
  
  // Score based on target audience
  if (context.targetAudience) {
    const audience = context.targetAudience.toLowerCase()
    NARRATION_VOICES.forEach(voice => {
      if (audience === 'children' || audience === 'family') {
        if (voice.characteristics.tone === 'warm' || voice.characteristics.tone === 'gentle') {
          scores.set(voice.id, (scores.get(voice.id) || 50) + 15)
        }
        if (voice.characteristics.tone === 'mysterious' || voice.characteristics.tone === 'dramatic') {
          scores.set(voice.id, (scores.get(voice.id) || 50) - 10)
        }
      } else if (audience === 'adult') {
        if (voice.characteristics.age === 'mature' || voice.characteristics.age === 'middle') {
          scores.set(voice.id, (scores.get(voice.id) || 50) + 5)
        }
      }
    })
  }
  
  // Sort by score and get top results
  const sortedVoices = NARRATION_VOICES
    .map(voice => ({ voice, score: scores.get(voice.id) || 50 }))
    .sort((a, b) => b.score - a.score)
  
  const primary = sortedVoices[0]
  const alternatives = sortedVoices.slice(1, 4).map(v => v.voice)
  
  // Generate reasoning
  const reasoning = generateReasoning(primary.voice, context)
  
  // Calculate confidence based on score differential
  const scoreDiff = primary.score - (sortedVoices[1]?.score || 0)
  const confidence = Math.min(95, Math.max(60, 70 + scoreDiff))
  
  return {
    primary: primary.voice,
    alternatives,
    reasoning,
    confidence
  }
}

function generateReasoning(voice: VoiceProfile, context: ScreenplayContext): string {
  const parts: string[] = []
  
  parts.push(`${voice.name} is recommended for this ${context.genre || 'production'}`)
  
  if (voice.characteristics.style === 'cinematic') {
    parts.push('with a cinematic narrative style')
  } else if (voice.characteristics.style === 'documentary') {
    parts.push('with an authoritative documentary presence')
  } else if (voice.characteristics.style === 'theatrical') {
    parts.push('with a theatrical dramatic quality')
  }
  
  if (context.tone) {
    parts.push(`that complements the ${context.tone} tone`)
  }
  
  if (voice.bestFor.length > 0) {
    const matching = voice.bestFor.filter(g => 
      context.genre?.toLowerCase().includes(g) || 
      context.tone?.toLowerCase().includes(g)
    )
    if (matching.length > 0) {
      parts.push(`and excels at ${matching.join(', ')} content`)
    }
  }
  
  return parts.join(' ') + '.'
}

/**
 * Get a default cinematic male voice for narration
 */
export function getDefaultNarrationVoice(): VoiceProfile {
  // Adam is the default cinematic male voice
  return NARRATION_VOICES.find(v => v.id === 'pNInz6obpgDQGcFmaJgB') || NARRATION_VOICES[0]
}

/**
 * Get voice profile by ID
 */
export function getVoiceById(voiceId: string): VoiceProfile | undefined {
  return NARRATION_VOICES.find(v => v.id === voiceId)
}

/**
 * Get all voices for a specific style
 */
export function getVoicesByStyle(style: VoiceProfile['characteristics']['style']): VoiceProfile[] {
  return NARRATION_VOICES.filter(v => v.characteristics.style === style)
}

/**
 * Get all male cinematic voices
 */
export function getCinematicMaleVoices(): VoiceProfile[] {
  return NARRATION_VOICES.filter(v => 
    v.characteristics.gender === 'male' && 
    v.characteristics.style === 'cinematic'
  )
}

/**
 * Calculate estimated narration duration based on word count
 * Average speaking rate: 150 words per minute
 */
export function estimateNarrationDuration(text: string, wordsPerMinute: number = 150): number {
  const wordCount = text.trim().split(/\s+/).length
  return (wordCount / wordsPerMinute) * 60 // Return seconds
}

/**
 * Suggest segment count based on narration duration
 * Target segment duration: 6-8 seconds
 */
export function suggestSegmentCount(narrationDurationSeconds: number, targetSegmentDuration: number = 7): number {
  const count = Math.ceil(narrationDurationSeconds / targetSegmentDuration)
  return Math.max(1, Math.min(count, 20)) // Cap at 20 segments
}
