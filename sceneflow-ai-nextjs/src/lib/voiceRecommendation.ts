/**
 * Voice Recommendation System
 * 
 * Provides intelligent voice recommendations for characters based on their attributes
 * and screenplay context. Uses scoring algorithms to match ElevenLabs voices with
 * character profiles.
 */

// ================================================================================
// Types & Interfaces
// ================================================================================

export interface VoiceProfile {
  id: string
  name: string
  provider: 'elevenlabs' | 'google'
  characteristics: {
    gender: 'male' | 'female' | 'neutral'
    age: 'young' | 'middle' | 'mature'
    tone: 'warm' | 'dramatic' | 'authoritative' | 'gentle' | 'energetic' | 'mysterious' | 'neutral'
    style: 'cinematic' | 'documentary' | 'conversational' | 'theatrical' | 'intimate'
    accent?: 'american' | 'british' | 'neutral' | 'european' | 'other'
  }
  bestFor: string[]
}

export interface CharacterContext {
  name: string
  role?: 'protagonist' | 'antagonist' | 'supporting' | 'background' | 'narrator'
  gender?: string
  age?: string
  ethnicity?: string
  personality?: string
  description?: string
}

export interface ScreenplayContext {
  genre?: string
  tone?: string
  era?: string
  setting?: string
  targetAudience?: string
  logline?: string
  title?: string
}

export interface VoiceRecommendation {
  voiceId: string
  voiceName: string
  score: number
  reasons: string[]
  provider: 'elevenlabs' | 'google'
}

export interface ElevenLabsVoice {
  id: string
  name: string
  description?: string
  category?: string
  labels?: Record<string, string>
  previewUrl?: string
  language?: string
  gender?: string
  age?: string
  accent?: string
  useCase?: string
}

// ================================================================================
// Scoring Functions
// ================================================================================

/**
 * Score a voice against character attributes
 */
function scoreVoiceForCharacter(
  voice: ElevenLabsVoice,
  character: CharacterContext,
  screenplayContext?: ScreenplayContext
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // Gender matching (high weight)
  const voiceGender = voice.gender?.toLowerCase() || voice.labels?.gender?.toLowerCase()
  const charGender = character.gender?.toLowerCase()
  
  if (voiceGender && charGender) {
    if (voiceGender === charGender) {
      score += 30
      reasons.push(`Gender match: ${voiceGender}`)
    } else if (voiceGender !== charGender) {
      score -= 20 // Penalty for mismatch
    }
  }

  // Age matching (medium weight)
  const voiceAge = voice.age?.toLowerCase() || voice.labels?.age?.toLowerCase()
  const charAge = character.age?.toLowerCase()
  
  if (voiceAge && charAge) {
    const ageMap: Record<string, string[]> = {
      'young': ['young', 'youthful', 'teen', 'adolescent', 'twenties', '20s'],
      'middle': ['middle', 'middle-aged', 'adult', 'thirties', 'forties', '30s', '40s'],
      'mature': ['mature', 'old', 'senior', 'elderly', 'fifties', 'sixties', '50s', '60s']
    }
    
    for (const [ageGroup, keywords] of Object.entries(ageMap)) {
      const voiceMatches = keywords.some(k => voiceAge.includes(k))
      const charMatches = keywords.some(k => charAge.includes(k))
      
      if (voiceMatches && charMatches) {
        score += 20
        reasons.push(`Age range match: ${ageGroup}`)
        break
      }
    }
  }

  // Accent matching (medium weight)
  const voiceAccent = voice.accent?.toLowerCase() || voice.labels?.accent?.toLowerCase()
  if (voiceAccent) {
    // Match accent to setting or ethnicity hints
    const settingHints = [
      screenplayContext?.setting?.toLowerCase() || '',
      character.ethnicity?.toLowerCase() || '',
      character.description?.toLowerCase() || ''
    ].join(' ')

    if (voiceAccent.includes('british') && settingHints.includes('british')) {
      score += 15
      reasons.push('British accent matches setting')
    } else if (voiceAccent.includes('american') && settingHints.includes('american')) {
      score += 10
      reasons.push('American accent matches setting')
    }
  }

  // Use case matching
  const voiceUseCase = voice.useCase?.toLowerCase() || voice.labels?.use_case?.toLowerCase() || ''
  const voiceDesc = voice.description?.toLowerCase() || ''
  
  // Match character role to voice use case
  if (character.role === 'narrator') {
    if (voiceUseCase.includes('narration') || voiceUseCase.includes('documentary') || voiceDesc.includes('narrator')) {
      score += 25
      reasons.push('Voice suited for narration')
    }
  } else if (character.role === 'protagonist') {
    if (voiceUseCase.includes('character') || voiceUseCase.includes('conversational')) {
      score += 15
      reasons.push('Voice suited for main character')
    }
  } else if (character.role === 'antagonist') {
    if (voiceDesc.includes('dramatic') || voiceDesc.includes('intense') || voiceDesc.includes('mysterious')) {
      score += 15
      reasons.push('Voice has dramatic quality for antagonist')
    }
  }

  // Genre matching
  if (screenplayContext?.genre) {
    const genre = screenplayContext.genre.toLowerCase()
    
    if (genre.includes('horror') || genre.includes('thriller')) {
      if (voiceDesc.includes('mysterious') || voiceDesc.includes('dark') || voiceDesc.includes('suspense')) {
        score += 10
        reasons.push('Voice tone matches genre')
      }
    } else if (genre.includes('comedy')) {
      if (voiceDesc.includes('friendly') || voiceDesc.includes('warm') || voiceDesc.includes('upbeat')) {
        score += 10
        reasons.push('Voice tone matches comedy genre')
      }
    } else if (genre.includes('drama')) {
      if (voiceDesc.includes('emotional') || voiceDesc.includes('expressive') || voiceDesc.includes('dramatic')) {
        score += 10
        reasons.push('Voice has dramatic range')
      }
    } else if (genre.includes('action')) {
      if (voiceDesc.includes('intense') || voiceDesc.includes('powerful') || voiceDesc.includes('strong')) {
        score += 10
        reasons.push('Voice matches action genre energy')
      }
    }
  }

  // Description keyword matching
  if (character.personality || character.description) {
    const charTraits = [character.personality, character.description].join(' ').toLowerCase()
    
    const traitMatches: [string[], string[], number][] = [
      [['warm', 'friendly', 'kind'], ['warm', 'friendly', 'gentle'], 10],
      [['authoritative', 'commanding', 'leader'], ['authoritative', 'commanding', 'strong'], 10],
      [['mysterious', 'enigmatic', 'secretive'], ['mysterious', 'intriguing'], 10],
      [['energetic', 'enthusiastic', 'lively'], ['energetic', 'dynamic', 'upbeat'], 10],
      [['calm', 'serene', 'peaceful'], ['calm', 'soothing', 'relaxed'], 10],
    ]
    
    for (const [charKeywords, voiceKeywords, points] of traitMatches) {
      const charHasTrait = charKeywords.some(k => charTraits.includes(k))
      const voiceHasTrait = voiceKeywords.some(k => voiceDesc.includes(k))
      
      if (charHasTrait && voiceHasTrait) {
        score += points
        reasons.push(`Personality trait match`)
        break // Only count once
      }
    }
  }

  // Voice category bonus
  if (voice.category === 'professional' || voice.category === 'high_quality') {
    score += 5
    reasons.push('High quality voice')
  }

  return { score, reasons }
}

// ================================================================================
// Public Functions
// ================================================================================

/**
 * Get voice recommendations for a character
 */
export function getCharacterVoiceRecommendations(
  voices: ElevenLabsVoice[],
  character: CharacterContext,
  screenplayContext?: ScreenplayContext,
  topN: number = 5
): VoiceRecommendation[] {
  const scored = voices.map(voice => {
    const { score, reasons } = scoreVoiceForCharacter(voice, character, screenplayContext)
    return {
      voiceId: voice.id,
      voiceName: voice.name,
      score,
      reasons,
      provider: 'elevenlabs' as const
    }
  })

  // Sort by score descending and return top N
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
}

/**
 * Intelligent search that ranks voices by relevance to query and character
 */
export function searchVoicesIntelligently(
  voices: ElevenLabsVoice[],
  query: string,
  character?: CharacterContext,
  screenplayContext?: ScreenplayContext
): ElevenLabsVoice[] {
  const lowerQuery = query.toLowerCase().trim()
  
  if (!lowerQuery) {
    return voices
  }

  // Score each voice based on query relevance
  const scored = voices.map(voice => {
    let searchScore = 0
    
    // Name match (highest priority)
    if (voice.name.toLowerCase().includes(lowerQuery)) {
      searchScore += 100
    }
    
    // Description match
    if (voice.description?.toLowerCase().includes(lowerQuery)) {
      searchScore += 50
    }
    
    // Label matches
    const labels = voice.labels || {}
    for (const value of Object.values(labels)) {
      if (typeof value === 'string' && value.toLowerCase().includes(lowerQuery)) {
        searchScore += 30
      }
    }
    
    // Category match
    if (voice.category?.toLowerCase().includes(lowerQuery)) {
      searchScore += 20
    }
    
    // Accent match
    if (voice.accent?.toLowerCase().includes(lowerQuery)) {
      searchScore += 25
    }
    
    // Gender match
    if (voice.gender?.toLowerCase().includes(lowerQuery)) {
      searchScore += 25
    }
    
    // Age match
    if (voice.age?.toLowerCase().includes(lowerQuery)) {
      searchScore += 20
    }
    
    // If character context provided, add character relevance score
    let charScore = 0
    if (character && searchScore > 0) {
      const { score } = scoreVoiceForCharacter(voice, character, screenplayContext)
      charScore = score
    }
    
    return {
      voice,
      totalScore: searchScore + (charScore * 0.5) // Weight search higher than character match
    }
  })

  // Filter voices that have some match and sort by score
  return scored
    .filter(s => s.totalScore > 0)
    .sort((a, b) => b.totalScore - a.totalScore)
    .map(s => s.voice)
}

/**
 * Infer gender from a character description using keyword analysis
 */
function inferGenderFromDescription(description: string): 'male' | 'female' | null {
  const text = description.toLowerCase()
  
  // Female indicators (check first since character names like Ka'ali might be female)
  const femaleIndicators = [
    // Pronouns
    'she', 'her', 'hers', 'herself',
    // Titles/roles
    'woman', 'women', 'female', 'girl', 'lady', 'queen', 'princess', 'empress',
    'mother', 'mom', 'daughter', 'sister', 'aunt', 'grandmother', 'wife',
    'actress', 'waitress', 'priestess', 'goddess', 'witch', 'sorceress',
    // Descriptors
    'feminine', 'maternal', 'sisterly',
  ]
  
  // Male indicators
  const maleIndicators = [
    // Pronouns
    'he', 'him', 'his', 'himself',
    // Titles/roles
    'man', 'men', 'male', 'boy', 'guy', 'gentleman', 'king', 'prince', 'emperor',
    'father', 'dad', 'son', 'brother', 'uncle', 'grandfather', 'husband',
    'actor', 'waiter', 'priest', 'god', 'wizard', 'sorcerer',
    // Descriptors
    'masculine', 'paternal', 'brotherly',
  ]
  
  // Use word boundaries for more accurate matching
  let femaleScore = 0
  let maleScore = 0
  
  for (const indicator of femaleIndicators) {
    const regex = new RegExp(`\\b${indicator}\\b`, 'gi')
    const matches = text.match(regex)
    if (matches) {
      femaleScore += matches.length
    }
  }
  
  for (const indicator of maleIndicators) {
    const regex = new RegExp(`\\b${indicator}\\b`, 'gi')
    const matches = text.match(regex)
    if (matches) {
      maleScore += matches.length
    }
  }
  
  if (femaleScore > maleScore) return 'female'
  if (maleScore > femaleScore) return 'male'
  return null
}

/**
 * Extract voice trait hints from character description
 */
function extractVoiceTraits(description: string): string[] {
  const text = description.toLowerCase()
  const traits: string[] = []
  
  // Voice quality hints
  if (text.includes('deep') || text.includes('bass') || text.includes('rumbling')) {
    traits.push('deep resonant voice')
  }
  if (text.includes('soft') || text.includes('gentle') || text.includes('quiet')) {
    traits.push('soft and gentle tone')
  }
  if (text.includes('loud') || text.includes('booming') || text.includes('powerful')) {
    traits.push('powerful commanding voice')
  }
  if (text.includes('warm') || text.includes('friendly') || text.includes('kind')) {
    traits.push('warm friendly delivery')
  }
  if (text.includes('cold') || text.includes('calculating') || text.includes('sinister')) {
    traits.push('cool measured tone')
  }
  if (text.includes('wise') || text.includes('ancient') || text.includes('elder')) {
    traits.push('wise and seasoned voice')
  }
  if (text.includes('young') || text.includes('youthful') || text.includes('energetic')) {
    traits.push('youthful energetic delivery')
  }
  if (text.includes('mysterious') || text.includes('enigmatic') || text.includes('cryptic')) {
    traits.push('mysterious and intriguing tone')
  }
  if (text.includes('warrior') || text.includes('fighter') || text.includes('soldier')) {
    traits.push('strong confident voice')
  }
  if (text.includes('leader') || text.includes('chief') || text.includes('commander')) {
    traits.push('authoritative commanding presence')
  }
  if (text.includes('healer') || text.includes('nurturing') || text.includes('caring')) {
    traits.push('nurturing compassionate tone')
  }
  
  return traits
}

/**
 * Generate a description for AI voice design based on character
 * Uses intelligent inference from character description to determine gender and traits
 */
export function generateVoiceDesignPrompt(
  character: CharacterContext,
  screenplayContext?: ScreenplayContext
): string {
  const parts: string[] = []
  
  // Intelligently infer gender from description if not explicitly provided
  let gender = character.gender?.toLowerCase()
  if (!gender && character.description) {
    const inferredGender = inferGenderFromDescription(character.description)
    if (inferredGender) {
      gender = inferredGender
    }
  }
  
  // Add gender
  if (gender) {
    parts.push(gender)
  }
  
  // Add age
  if (character.age) {
    parts.push(character.age)
  }
  
  // Extract voice traits from description
  if (character.description) {
    const traits = extractVoiceTraits(character.description)
    parts.push(...traits)
  }
  
  // Role-based description
  if (character.role === 'narrator') {
    parts.push('narrator voice with clear articulation')
  } else if (character.role === 'protagonist') {
    parts.push('protagonist with relatable and engaging voice')
  } else if (character.role === 'antagonist') {
    parts.push('antagonist with compelling and distinct voice')
  }
  
  // Personality hints
  if (character.personality) {
    parts.push(character.personality)
  }
  
  // Genre-based hints
  if (screenplayContext?.genre) {
    const genre = screenplayContext.genre.toLowerCase()
    if (genre.includes('comedy')) {
      parts.push('with warm and expressive delivery')
    } else if (genre.includes('drama')) {
      parts.push('with emotional depth and range')
    } else if (genre.includes('thriller') || genre.includes('horror')) {
      parts.push('with subtle intensity')
    } else if (genre.includes('action')) {
      parts.push('with confident and dynamic presence')
    } else if (genre.includes('fantasy') || genre.includes('sci-fi') || genre.includes('epic')) {
      parts.push('with cinematic presence')
    }
  }
  
  // Build the final description - ensure it's descriptive enough for ElevenLabs (20+ chars)
  let description: string
  if (parts.length > 0) {
    description = `Voice for ${character.name}: ${parts.join(', ')}`
  } else {
    // Fallback with more detail to meet minimum length requirements
    description = `A distinctive voice for the character ${character.name}, suitable for film and storytelling`
  }
  
  // Ensure minimum length for ElevenLabs API (20 characters)
  if (description.length < 25) {
    description = `${description}, with natural expressive qualities suitable for film narration`
  }
  
  return description
}
