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

// Maximum possible score for normalization (sum of all possible bonuses)
const MAX_POSSIBLE_SCORE = 145 // 30 (gender) + 20 (age) + 20 (ethnicity/accent) + 25 (role) + 20 (profession) + 10 (genre) + 10 (personality) + 10 (description traits)

/**
 * Infer ethnicity/cultural background from character description and name
 * Returns accent preferences for voice matching
 */
function inferEthnicityFromDescription(description: string, name: string): string | null {
  const text = (description + ' ' + name).toLowerCase()
  
  // Ethnicity to accent mapping - ordered by specificity (more specific first)
  const ethnicityPatterns: Array<{ keywords: string[], accent: string }> = [
    // African/African American
    { keywords: ['african american', 'african-american', 'black american', 'afro-american'], accent: 'american' },
    { keywords: ['african', 'nigerian', 'kenyan', 'ghanaian', 'ethiopian', 'south african'], accent: 'african' },
    
    // Asian
    { keywords: ['chinese', 'mandarin', 'cantonese', 'beijing', 'shanghai', 'hong kong'], accent: 'chinese' },
    { keywords: ['japanese', 'tokyo', 'osaka', 'kyoto'], accent: 'japanese' },
    { keywords: ['korean', 'seoul', 'busan', 'pyongyang'], accent: 'korean' },
    { keywords: ['indian', 'hindi', 'mumbai', 'delhi', 'bangalore', 'punjabi', 'tamil', 'bengali'], accent: 'indian' },
    { keywords: ['vietnamese', 'hanoi', 'saigon', 'ho chi minh'], accent: 'vietnamese' },
    { keywords: ['filipino', 'philippine', 'manila', 'tagalog'], accent: 'filipino' },
    { keywords: ['thai', 'bangkok', 'thailand'], accent: 'thai' },
    { keywords: ['indonesian', 'jakarta', 'bali'], accent: 'indonesian' },
    
    // European
    { keywords: ['british', 'english', 'london', 'manchester', 'birmingham', 'uk', 'united kingdom', 'cockney', 'received pronunciation'], accent: 'british' },
    { keywords: ['scottish', 'scotland', 'edinburgh', 'glasgow', 'highlander'], accent: 'scottish' },
    { keywords: ['irish', 'ireland', 'dublin', 'belfast', 'celtic'], accent: 'irish' },
    { keywords: ['welsh', 'wales', 'cardiff'], accent: 'welsh' },
    { keywords: ['french', 'paris', 'france', 'marseille', 'lyon', 'parisian'], accent: 'french' },
    { keywords: ['german', 'germany', 'berlin', 'munich', 'hamburg', 'bavarian'], accent: 'german' },
    { keywords: ['italian', 'italy', 'rome', 'milan', 'naples', 'sicilian', 'tuscan'], accent: 'italian' },
    { keywords: ['spanish', 'spain', 'madrid', 'barcelona', 'castilian', 'andalusian'], accent: 'spanish' },
    { keywords: ['russian', 'russia', 'moscow', 'slavic', 'siberian'], accent: 'russian' },
    { keywords: ['polish', 'poland', 'warsaw', 'krakow'], accent: 'polish' },
    { keywords: ['dutch', 'netherlands', 'amsterdam', 'holland'], accent: 'dutch' },
    { keywords: ['swedish', 'sweden', 'stockholm', 'scandinavian'], accent: 'swedish' },
    { keywords: ['norwegian', 'norway', 'oslo'], accent: 'norwegian' },
    { keywords: ['danish', 'denmark', 'copenhagen'], accent: 'danish' },
    { keywords: ['greek', 'greece', 'athens'], accent: 'greek' },
    { keywords: ['portuguese', 'portugal', 'lisbon'], accent: 'portuguese' },
    
    // Latin American / Hispanic
    { keywords: ['mexican', 'mexico', 'mexico city', 'guadalajara', 'tijuana'], accent: 'mexican' },
    { keywords: ['latino', 'latina', 'hispanic', 'latin american', 'latinx'], accent: 'latino' },
    { keywords: ['brazilian', 'brazil', 'rio', 'sao paulo', 'rio de janeiro'], accent: 'brazilian' },
    { keywords: ['cuban', 'cuba', 'havana'], accent: 'cuban' },
    { keywords: ['puerto rican', 'puerto rico', 'boricua'], accent: 'puerto rican' },
    { keywords: ['colombian', 'colombia', 'bogota', 'medellin'], accent: 'colombian' },
    { keywords: ['argentinian', 'argentina', 'buenos aires'], accent: 'argentinian' },
    { keywords: ['venezuelan', 'venezuela', 'caracas'], accent: 'venezuelan' },
    { keywords: ['peruvian', 'peru', 'lima'], accent: 'peruvian' },
    { keywords: ['chilean', 'chile', 'santiago'], accent: 'chilean' },
    
    // Middle Eastern
    { keywords: ['arabic', 'arab', 'middle eastern', 'saudi', 'emirati', 'egyptian', 'lebanese', 'syrian', 'iraqi', 'jordanian'], accent: 'arabic' },
    { keywords: ['persian', 'iranian', 'iran', 'tehran', 'farsi'], accent: 'persian' },
    { keywords: ['turkish', 'turkey', 'istanbul', 'ankara'], accent: 'turkish' },
    { keywords: ['israeli', 'hebrew', 'jewish', 'tel aviv', 'jerusalem'], accent: 'israeli' },
    
    // Other
    { keywords: ['australian', 'australia', 'sydney', 'melbourne', 'aussie', 'outback'], accent: 'australian' },
    { keywords: ['new zealand', 'kiwi', 'auckland', 'wellington', 'maori'], accent: 'new zealand' },
    { keywords: ['canadian', 'canada', 'toronto', 'vancouver', 'montreal', 'quebec'], accent: 'canadian' },
    { keywords: ['southern american', 'southern drawl', 'dixie', 'deep south'], accent: 'southern american' },
    { keywords: ['new york', 'brooklyn', 'bronx', 'queens', 'manhattan'], accent: 'new york' },
    { keywords: ['boston', 'bostonian', 'massachusetts'], accent: 'boston' },
    { keywords: ['texan', 'texas', 'dallas', 'houston'], accent: 'texan' },
    { keywords: ['american', 'usa', 'united states', 'u.s.', 'los angeles', 'chicago'], accent: 'american' },
  ]
  
  for (const { keywords, accent } of ethnicityPatterns) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return accent
      }
    }
  }
  
  return null
}

/**
 * Infer character profession/occupation from description
 * Returns voice style preferences for matching
 */
function inferProfessionFromDescription(description: string): { profession: string, voiceStyles: string[] } | null {
  const text = description.toLowerCase()
  
  // Profession to voice style mapping - ordered by specificity
  const professionPatterns: Array<{ keywords: string[], profession: string, voiceStyles: string[] }> = [
    // Medical
    { keywords: ['doctor', 'physician', 'surgeon', 'md', 'medical doctor', 'dr.'], profession: 'doctor', voiceStyles: ['authoritative', 'calm', 'professional', 'intelligent'] },
    { keywords: ['nurse', 'nursing', 'caregiver', 'rn', 'registered nurse'], profession: 'nurse', voiceStyles: ['warm', 'caring', 'gentle', 'compassionate'] },
    { keywords: ['psychiatrist', 'psychologist', 'therapist', 'counselor'], profession: 'therapist', voiceStyles: ['calm', 'soothing', 'understanding', 'thoughtful'] },
    
    // Legal/Authority
    { keywords: ['lawyer', 'attorney', 'barrister', 'solicitor', 'legal counsel'], profession: 'lawyer', voiceStyles: ['authoritative', 'articulate', 'persuasive', 'confident'] },
    { keywords: ['judge', 'magistrate', 'justice', 'your honor'], profession: 'judge', voiceStyles: ['authoritative', 'commanding', 'dignified', 'serious'] },
    { keywords: ['police', 'detective', 'officer', 'cop', 'sheriff', 'marshal', 'investigator'], profession: 'police', voiceStyles: ['commanding', 'firm', 'authoritative', 'serious'] },
    { keywords: ['military', 'soldier', 'general', 'colonel', 'sergeant', 'captain', 'marine', 'army', 'navy', 'commander'], profession: 'military', voiceStyles: ['commanding', 'strong', 'disciplined', 'authoritative'] },
    
    // Business/Corporate
    { keywords: ['ceo', 'executive', 'businessman', 'businesswoman', 'entrepreneur', 'corporate', 'chairman', 'director'], profession: 'executive', voiceStyles: ['confident', 'professional', 'authoritative', 'polished'] },
    { keywords: ['politician', 'senator', 'congressman', 'mayor', 'governor', 'president', 'minister', 'diplomat'], profession: 'politician', voiceStyles: ['charismatic', 'persuasive', 'articulate', 'confident'] },
    
    // Creative/Entertainment
    { keywords: ['actor', 'actress', 'performer', 'entertainer', 'thespian'], profession: 'actor', voiceStyles: ['expressive', 'dramatic', 'versatile', 'theatrical'] },
    { keywords: ['singer', 'vocalist', 'musician', 'artist', 'composer', 'conductor'], profession: 'musician', voiceStyles: ['melodic', 'expressive', 'dynamic', 'passionate'] },
    { keywords: ['writer', 'author', 'novelist', 'poet', 'journalist', 'reporter', 'editor'], profession: 'writer', voiceStyles: ['thoughtful', 'articulate', 'intellectual', 'contemplative'] },
    { keywords: ['director', 'filmmaker', 'producer'], profession: 'filmmaker', voiceStyles: ['creative', 'passionate', 'visionary', 'articulate'] },
    
    // Academic/Scientific
    { keywords: ['professor', 'teacher', 'educator', 'lecturer', 'academic', 'instructor'], profession: 'educator', voiceStyles: ['clear', 'articulate', 'patient', 'knowledgeable'] },
    { keywords: ['scientist', 'researcher', 'physicist', 'chemist', 'biologist', 'astronomer'], profession: 'scientist', voiceStyles: ['intelligent', 'precise', 'analytical', 'thoughtful'] },
    
    // Sports/Physical
    { keywords: ['boxer', 'fighter', 'mma', 'wrestler', 'martial artist', 'pugilist'], profession: 'fighter', voiceStyles: ['tough', 'intense', 'gritty', 'strong'] },
    { keywords: ['athlete', 'sports', 'player', 'coach', 'trainer', 'champion'], profession: 'athlete', voiceStyles: ['energetic', 'confident', 'dynamic', 'passionate'] },
    
    // Service/Hospitality
    { keywords: ['chef', 'cook', 'culinary', 'kitchen', 'pastry chef', 'sous chef'], profession: 'chef', voiceStyles: ['passionate', 'warm', 'energetic', 'creative'] },
    { keywords: ['bartender', 'waiter', 'waitress', 'server', 'sommelier'], profession: 'hospitality', voiceStyles: ['friendly', 'personable', 'warm', 'charismatic'] },
    
    // Technical
    { keywords: ['engineer', 'programmer', 'developer', 'tech', 'software', 'hacker', 'coder'], profession: 'tech', voiceStyles: ['intelligent', 'analytical', 'precise', 'knowledgeable'] },
    { keywords: ['mechanic', 'technician', 'repairman', 'electrician', 'plumber'], profession: 'technician', voiceStyles: ['practical', 'grounded', 'straightforward', 'reliable'] },
    
    // Criminal/Underworld
    { keywords: ['gangster', 'mobster', 'mafia', 'crime boss', 'don', 'godfather'], profession: 'gangster', voiceStyles: ['menacing', 'powerful', 'intimidating', 'commanding'] },
    { keywords: ['criminal', 'thug', 'hitman', 'enforcer', 'muscle'], profession: 'criminal', voiceStyles: ['menacing', 'intense', 'threatening', 'gritty'] },
    { keywords: ['spy', 'agent', 'operative', 'assassin', 'secret agent'], profession: 'spy', voiceStyles: ['mysterious', 'cool', 'sophisticated', 'calculating'] },
    { keywords: ['thief', 'burglar', 'con artist', 'grifter', 'pickpocket'], profession: 'thief', voiceStyles: ['smooth', 'charming', 'sly', 'quick'] },
    
    // Religious/Spiritual
    { keywords: ['priest', 'pastor', 'reverend', 'minister', 'preacher', 'father'], profession: 'clergy', voiceStyles: ['warm', 'soothing', 'compassionate', 'wise'] },
    { keywords: ['rabbi', 'imam', 'cleric', 'religious leader'], profession: 'religious', voiceStyles: ['wise', 'thoughtful', 'gentle', 'authoritative'] },
    { keywords: ['monk', 'nun', 'spiritual', 'mystic', 'sage', 'guru'], profession: 'spiritual', voiceStyles: ['calm', 'peaceful', 'serene', 'wise'] },
    
    // Working Class
    { keywords: ['farmer', 'rancher', 'cowboy', 'ranch hand'], profession: 'farmer', voiceStyles: ['rustic', 'grounded', 'warm', 'straightforward'] },
    { keywords: ['factory', 'worker', 'laborer', 'construction', 'builder', 'miner'], profession: 'laborer', voiceStyles: ['practical', 'straightforward', 'grounded', 'tough'] },
    { keywords: ['trucker', 'driver', 'cabbie', 'taxi', 'chauffeur'], profession: 'driver', voiceStyles: ['casual', 'friendly', 'relaxed', 'conversational'] },
    { keywords: ['sailor', 'seaman', 'captain', 'skipper', 'fisherman'], profession: 'sailor', voiceStyles: ['weathered', 'gruff', 'experienced', 'adventurous'] },
    
    // Other Professions
    { keywords: ['pilot', 'aviator', 'astronaut'], profession: 'pilot', voiceStyles: ['calm', 'confident', 'professional', 'authoritative'] },
    { keywords: ['wizard', 'sorcerer', 'mage', 'magician'], profession: 'wizard', voiceStyles: ['mysterious', 'wise', 'ancient', 'powerful'] },
    { keywords: ['king', 'queen', 'prince', 'princess', 'royalty', 'monarch'], profession: 'royalty', voiceStyles: ['regal', 'dignified', 'commanding', 'elegant'] },
    { keywords: ['warrior', 'knight', 'gladiator', 'samurai'], profession: 'warrior', voiceStyles: ['strong', 'commanding', 'fierce', 'determined'] },
  ]
  
  for (const { keywords, profession, voiceStyles } of professionPatterns) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return { profession, voiceStyles }
      }
    }
  }
  
  return null
}

/**
 * Infer age group from character description
 */
function inferAgeFromDescription(description: string): 'young' | 'middle' | 'mature' | null {
  const text = description.toLowerCase()
  
  // Extract numeric ages
  const ageMatch = text.match(/\b(\d{1,3})\s*(?:years?|yrs?)\s*old\b|\bage\s*(\d{1,3})\b|\b(\d{1,3})\s*year\s*old\b/)
  if (ageMatch) {
    const age = parseInt(ageMatch[1] || ageMatch[2] || ageMatch[3], 10)
    if (age < 30) return 'young'
    if (age >= 30 && age < 55) return 'middle'
    if (age >= 55) return 'mature'
  }
  
  // Keyword-based inference
  const youngIndicators = ['young', 'youthful', 'teen', 'teenager', 'adolescent', 'child', 'kid', 'boy', 'girl', 'twenties', '20s']
  const matureIndicators = ['old', 'elderly', 'senior', 'ancient', 'elder', 'grandparent', 'grandmother', 'grandfather', 'retired', 'fifties', 'sixties', 'seventies', '50s', '60s', '70s']
  
  for (const indicator of matureIndicators) {
    if (text.includes(indicator)) return 'mature'
  }
  for (const indicator of youngIndicators) {
    if (text.includes(indicator)) return 'young'
  }
  
  return 'middle' // Default to middle-aged for unspecified adults
}

/**
 * Infer gender from character name using common name patterns
 */
function inferGenderFromName(name: string): 'male' | 'female' | null {
  const firstName = name.split(/[\s.]+/)[0]?.toLowerCase() || ''
  
  // Common male names (partial list for high-confidence matches)
  const maleNames = ['james', 'john', 'robert', 'michael', 'william', 'david', 'richard', 'joseph', 'thomas', 'charles', 'daniel', 'matthew', 'anthony', 'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua', 'kenneth', 'kevin', 'brian', 'george', 'edward', 'ronald', 'timothy', 'jason', 'jeffrey', 'ryan', 'jacob', 'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon', 'benjamin', 'samuel', 'raymond', 'gregory', 'frank', 'alexander', 'patrick', 'jack', 'dennis', 'jerry', 'tyler', 'aaron', 'jose', 'adam', 'nathan', 'henry', 'douglas', 'zachary', 'peter', 'kyle', 'noah', 'ethan', 'jeremy', 'walter', 'christian', 'keith', 'roger', 'terry', 'austin', 'sean', 'gerald', 'carl', 'dylan', 'harold', 'jordan', 'jesse', 'bryan', 'lawrence', 'arthur', 'gabriel', 'bruce', 'logan', 'albert', 'willie', 'alan', 'eugene', 'russell', 'vincent', 'philip', 'bobby', 'johnny', 'bradley', 'dr']
  
  // Common female names (partial list for high-confidence matches)
  const femaleNames = ['mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen', 'lisa', 'nancy', 'betty', 'margaret', 'sandra', 'ashley', 'dorothy', 'kimberly', 'emily', 'donna', 'michelle', 'carol', 'amanda', 'melissa', 'deborah', 'stephanie', 'rebecca', 'sharon', 'laura', 'cynthia', 'kathleen', 'amy', 'angela', 'shirley', 'anna', 'brenda', 'pamela', 'emma', 'nicole', 'helen', 'samantha', 'katherine', 'christine', 'debra', 'rachel', 'carolyn', 'janet', 'catherine', 'maria', 'heather', 'diane', 'ruth', 'julie', 'olivia', 'joyce', 'virginia', 'victoria', 'kelly', 'lauren', 'christina', 'joan', 'evelyn', 'judith', 'megan', 'andrea', 'cheryl', 'hannah', 'jacqueline', 'martha', 'gloria', 'teresa', 'ann', 'sara', 'madison', 'frances', 'kathryn', 'janice', 'jean', 'abigail', 'alice', 'judy', 'sophia', 'grace', 'denise', 'amber', 'doris', 'marilyn', 'danielle', 'beverly', 'isabella', 'theresa', 'diana', 'natalie', 'brittany', 'charlotte', 'marie', 'kayla', 'alexis', 'lori']
  
  if (maleNames.includes(firstName)) return 'male'
  if (femaleNames.includes(firstName)) return 'female'
  
  return null
}

/**
 * Score a voice against character attributes
 */
function scoreVoiceForCharacter(
  voice: ElevenLabsVoice,
  character: CharacterContext,
  screenplayContext?: ScreenplayContext
): { score: number; reasons: string[]; normalizedScore: number } {
  let score = 0
  const reasons: string[] = []

  // Infer gender if not provided
  const voiceGender = voice.gender?.toLowerCase() || voice.labels?.gender?.toLowerCase()
  let charGender = character.gender?.toLowerCase()
  
  // Try to infer gender from description or name
  if (!charGender && character.description) {
    const inferredFromDesc = inferGenderFromDescription(character.description)
    if (inferredFromDesc) {
      charGender = inferredFromDesc
    }
  }
  if (!charGender && character.name) {
    const inferredFromName = inferGenderFromName(character.name)
    if (inferredFromName) {
      charGender = inferredFromName
    }
  }
  
  // Gender matching (high weight)
  if (voiceGender && charGender) {
    if (voiceGender === charGender) {
      score += 30
      reasons.push(`Gender match: ${voiceGender}`)
    } else {
      score -= 20 // Penalty for mismatch
    }
  }

  // Infer age if not provided
  let charAge = character.age?.toLowerCase()
  if (!charAge && character.description) {
    const inferredAge = inferAgeFromDescription(character.description)
    if (inferredAge) {
      charAge = inferredAge
    }
  }
  
  // Age matching (medium weight)
  const voiceAge = voice.age?.toLowerCase() || voice.labels?.age?.toLowerCase()
  
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

  // Accent/Ethnicity matching (enhanced with inference)
  const voiceAccent = voice.accent?.toLowerCase() || voice.labels?.accent?.toLowerCase()
  let charEthnicity = character.ethnicity?.toLowerCase()
  
  // Infer ethnicity from description if not explicitly provided
  if (!charEthnicity && character.description) {
    const inferredEthnicity = inferEthnicityFromDescription(character.description, character.name || '')
    if (inferredEthnicity) {
      charEthnicity = inferredEthnicity
    }
  }
  
  if (voiceAccent && charEthnicity) {
    // Check for accent match with inferred or explicit ethnicity
    if (voiceAccent.includes(charEthnicity) || charEthnicity.includes(voiceAccent)) {
      score += 20
      reasons.push(`Accent matches ethnicity: ${charEthnicity}`)
    } else {
      // Check for regional matches (e.g., "southern american" matches "american")
      const accentFamilies: Record<string, string[]> = {
        'american': ['american', 'southern american', 'new york', 'boston', 'texan', 'california'],
        'british': ['british', 'english', 'scottish', 'irish', 'welsh', 'cockney'],
        'latin': ['latino', 'mexican', 'spanish', 'cuban', 'puerto rican', 'colombian', 'argentinian'],
        'asian': ['chinese', 'japanese', 'korean', 'indian', 'vietnamese', 'filipino', 'thai'],
        'european': ['french', 'german', 'italian', 'russian', 'polish', 'dutch', 'swedish', 'greek'],
      }
      
      for (const [family, accents] of Object.entries(accentFamilies)) {
        const voiceInFamily = accents.some(a => voiceAccent.includes(a))
        const charInFamily = accents.some(a => charEthnicity!.includes(a))
        if (voiceInFamily && charInFamily) {
          score += 10
          reasons.push(`Accent in same ${family} family`)
          break
        }
      }
    }
  } else if (voiceAccent) {
    // Fallback: Match accent to setting hints
    const settingHints = [
      screenplayContext?.setting?.toLowerCase() || '',
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

  // Profession-based voice style matching
  if (character.description) {
    const professionInfo = inferProfessionFromDescription(character.description)
    if (professionInfo) {
      const voiceDescLower = voice.description?.toLowerCase() || ''
      const voiceLabels = Object.values(voice.labels || {}).join(' ').toLowerCase()
      const voiceText = voiceDescLower + ' ' + voiceLabels
      
      // Check if voice matches any of the profession's preferred styles
      let professionMatched = false
      for (const style of professionInfo.voiceStyles) {
        if (voiceText.includes(style)) {
          score += 20
          reasons.push(`Voice style matches ${professionInfo.profession}: ${style}`)
          professionMatched = true
          break
        }
      }
      
      // Partial match for similar traits
      if (!professionMatched) {
        const partialMatches = professionInfo.voiceStyles.filter(style => {
          // Check for partial/related keywords
          const relatedTerms: Record<string, string[]> = {
            'authoritative': ['commanding', 'strong', 'powerful', 'confident'],
            'warm': ['friendly', 'gentle', 'caring', 'compassionate'],
            'mysterious': ['enigmatic', 'dark', 'intriguing', 'suspense'],
            'intense': ['dramatic', 'powerful', 'fierce', 'passionate'],
            'calm': ['soothing', 'relaxed', 'peaceful', 'serene'],
            'articulate': ['clear', 'precise', 'eloquent', 'polished'],
          }
          const related = relatedTerms[style] || []
          return related.some(r => voiceText.includes(r))
        })
        
        if (partialMatches.length > 0) {
          score += 10
          reasons.push(`Voice partially matches ${professionInfo.profession} style`)
        }
      }
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

  // Normalize score to 0-100 percentage
  const normalizedScore = Math.max(0, Math.min(100, Math.round((score / MAX_POSSIBLE_SCORE) * 100)))

  return { score, reasons, normalizedScore }
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
  // Infer character gender for pre-filtering
  let charGender = character.gender?.toLowerCase()
  if (!charGender && character.description) {
    const inferredFromDesc = inferGenderFromDescription(character.description)
    if (inferredFromDesc) charGender = inferredFromDesc
  }
  if (!charGender && character.name) {
    const inferredFromName = inferGenderFromName(character.name)
    if (inferredFromName) charGender = inferredFromName
  }
  
  // Pre-filter by gender for better recommendations (but keep fallback)
  let candidateVoices = voices
  if (charGender) {
    const genderFiltered = voices.filter(v => {
      const voiceGender = v.gender?.toLowerCase() || v.labels?.gender?.toLowerCase()
      return voiceGender === charGender
    })
    // Only use filtered list if we have enough candidates
    if (genderFiltered.length >= topN) {
      candidateVoices = genderFiltered
    }
  }
  
  const scored = candidateVoices.map(voice => {
    const { score, reasons, normalizedScore } = scoreVoiceForCharacter(voice, character, screenplayContext)
    return {
      voiceId: voice.id,
      voiceName: voice.name,
      score: normalizedScore, // Use normalized percentage
      rawScore: score,
      reasons,
      provider: 'elevenlabs' as const,
      gender: voice.gender?.toLowerCase() || voice.labels?.gender?.toLowerCase(),
      category: voice.category
    }
  })

  // Sort by score descending, with secondary criteria for tie-breaking
  return scored
    .sort((a, b) => {
      // Primary: normalized score
      if (a.score !== b.score) return b.score - a.score
      // Secondary: prefer matching gender
      const aGenderMatch = a.gender === charGender ? 1 : 0
      const bGenderMatch = b.gender === charGender ? 1 : 0
      if (aGenderMatch !== bGenderMatch) return bGenderMatch - aGenderMatch
      // Tertiary: prefer professional category
      const aCat = a.category === 'professional' ? 1 : 0
      const bCat = b.category === 'professional' ? 1 : 0
      if (aCat !== bCat) return bCat - aCat
      // Final: alphabetical
      return a.voiceName.localeCompare(b.voiceName)
    })
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
