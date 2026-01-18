/**
 * Treatment-Phase Scoring Checklist
 * 
 * This configuration defines explicit pass/fail criteria for the Audience Resonance
 * scoring algorithm. Each axis has specific gates that must be passed before 
 * nuanced scoring is applied.
 * 
 * Key Principles:
 * 1. Treatment-appropriate metrics (not script-level nuance)
 * 2. Explicit, binary checkpoints for each axis
 * 3. Intent-aware criteria (genre, demographic, tone)
 * 4. Diminishing returns after 3 iterations
 */

import type { PrimaryGenre, TargetDemographic, ToneProfile } from '@/lib/types/audienceResonance'

// =============================================================================
// SCORING WEIGHTS (User-specified)
// =============================================================================

// Default weights - users can customize these
export const DEFAULT_SCORING_WEIGHTS = {
  'concept-originality': 0.15,  // Lower weight - often subjective, hard to improve at treatment level
  'character-depth': 0.25,
  'pacing-structure': 0.15,     // Lower weight - best addressed in script phase
  'genre-fidelity': 0.20,
  'commercial-viability': 0.25
} as const

// Mutable weights for backward compatibility
export const SCORING_WEIGHTS = { ...DEFAULT_SCORING_WEIGHTS }

// Weight presets for different production goals
export const WEIGHT_PRESETS = {
  'balanced': {
    name: 'Balanced',
    description: 'Equal emphasis on all dimensions',
    weights: {
      'concept-originality': 0.20,
      'character-depth': 0.20,
      'pacing-structure': 0.20,
      'genre-fidelity': 0.20,
      'commercial-viability': 0.20
    }
  },
  'commercial': {
    name: 'Commercial Focus',
    description: 'Prioritize market appeal and audience engagement',
    weights: {
      'concept-originality': 0.15,
      'character-depth': 0.20,
      'pacing-structure': 0.15,
      'genre-fidelity': 0.20,
      'commercial-viability': 0.30
    }
  },
  'artistic': {
    name: 'Artistic Vision',
    description: 'Prioritize originality and character depth',
    weights: {
      'concept-originality': 0.30,
      'character-depth': 0.30,
      'pacing-structure': 0.15,
      'genre-fidelity': 0.15,
      'commercial-viability': 0.10
    }
  },
  'genre-driven': {
    name: 'Genre-Driven',
    description: 'Prioritize genre conventions and commercial appeal',
    weights: {
      'concept-originality': 0.10,
      'character-depth': 0.20,
      'pacing-structure': 0.15,
      'genre-fidelity': 0.30,
      'commercial-viability': 0.25
    }
  }
} as const

export type WeightPresetKey = keyof typeof WEIGHT_PRESETS
export type ScoringWeights = Record<string, number>

export const WEIGHT_FORMULA = 'Score = (Concept × 0.15) + (Character × 0.25) + (Pacing × 0.15) + (Genre × 0.20) + (Viability × 0.25)'

// =============================================================================
// GOOD ENOUGH THRESHOLD
// =============================================================================

export const READY_FOR_PRODUCTION_THRESHOLD = 80
export const MAX_ITERATIONS = 2

// =============================================================================
// AXIS CHECKPOINTS (Pass/Fail Gates)
// =============================================================================

export interface AxisCheckpoint {
  id: string
  label: string
  description: string
  passCondition: string // What the AI should look for
  failPenalty: number // Points deducted if failed (0-30)
  fixTemplate: string // Template for fix suggestion if failed
}

export interface AxisConfig {
  id: string
  label: string
  weight: number
  description: string
  checkpoints: AxisCheckpoint[]
  baseScore: number // Score if all checkpoints pass
}

// =============================================================================
// CONCEPT ORIGINALITY AXIS (25%)
// =============================================================================

export const CONCEPT_ORIGINALITY_AXIS: AxisConfig = {
  id: 'concept-originality',
  label: 'Concept Originality',
  weight: 0.25,
  description: 'How unique and fresh is the concept?',
  baseScore: 85,
  checkpoints: [
    {
      id: 'hook-or-twist',
      label: 'Hook/Twist Present',
      description: 'Does the logline contain a clear "Hook" or "Twist"?',
      passCondition: 'Logline contains an unexpected element, unique angle, or compelling twist that differentiates it from standard genre fare',
      failPenalty: 25,
      fixTemplate: 'Strengthen the logline with a clear hook: "When [ordinary situation], [protagonist] discovers [unexpected twist] that forces them to [high-stakes action]."'
    },
    {
      id: 'cliche-avoidance',
      label: 'Avoids Top 5 Genre Clichés',
      description: 'Is it distinct from the top 5 clichés in the selected genre?',
      passCondition: 'The premise does not rely on overused tropes without subversion (e.g., "chosen one" without twist, "love at first sight" without complication)',
      failPenalty: 20,
      fixTemplate: 'Subvert the familiar premise by adding: [specific subversion based on genre]. Instead of [cliché], consider [fresh angle].'
    },
    {
      id: 'unique-setting-or-premise',
      label: 'Distinct Setting/Premise',
      description: 'Is the setting or premise different from standard entries?',
      passCondition: 'The world, time period, or central premise offers something audiences haven\'t seen frequently',
      failPenalty: 15,
      fixTemplate: 'Add specificity to the setting: "[Time period/location] where [unique detail that affects the story]."'
    }
  ]
}

// =============================================================================
// CHARACTER DEPTH AXIS (25%)
// =============================================================================

export const CHARACTER_DEPTH_AXIS: AxisConfig = {
  id: 'character-depth',
  label: 'Character Depth',
  weight: 0.25,
  description: 'Are characters well-defined with clear motivations?',
  baseScore: 85,
  checkpoints: [
    {
      id: 'protagonist-goal',
      label: 'Protagonist Goal Defined',
      description: 'Does the protagonist have a clear, stated goal?',
      passCondition: 'The treatment explicitly states what the protagonist wants to achieve (external goal)',
      failPenalty: 30,
      fixTemplate: 'Define the protagonist\'s goal: "[NAME] desperately wants to [specific external goal] because [personal motivation]."'
    },
    {
      id: 'protagonist-flaw',
      label: 'Protagonist Flaw Defined',
      description: 'Does the protagonist have a defined flaw or internal conflict?',
      passCondition: 'The treatment mentions a character weakness, fear, or internal obstacle',
      failPenalty: 25,
      fixTemplate: 'Add the protagonist\'s flaw: "But [NAME]\'s [internal flaw: fear/weakness/blind spot] threatens to sabotage their mission."'
    },
    {
      id: 'antagonist-defined',
      label: 'Antagonist/Opposition Defined',
      description: 'Is there a clear antagonist (person or force)?',
      passCondition: 'The treatment names or describes the opposing force creating conflict',
      failPenalty: 20,
      fixTemplate: 'Define the antagonist: "Standing in their way is [NAME/FORCE], whose [motivation] creates the central conflict."'
    },
    {
      id: 'character-ghost',
      label: 'The "Ghost" (Backstory Trauma)',
      description: 'Is there a past trauma or secret that haunts the protagonist?',
      passCondition: 'The treatment references a past event, loss, or secret that explains the character\'s current state',
      failPenalty: 10,
      fixTemplate: 'Add the character\'s ghost: "[NAME] carries the weight of [past trauma/secret] that still drives their decisions today."'
    }
  ]
}

// =============================================================================
// PACING & STRUCTURE AXIS (20%)
// =============================================================================

export const PACING_STRUCTURE_AXIS: AxisConfig = {
  id: 'pacing-structure',
  label: 'Pacing & Structure',
  weight: 0.20,
  description: 'Is the narrative structure clear and well-paced?',
  baseScore: 85,
  checkpoints: [
    {
      id: 'three-act-structure',
      label: 'Three Acts Identifiable',
      description: 'Are there exactly 3 distinct acts (Setup, Confrontation, Resolution)?',
      passCondition: 'The treatment contains clear act breaks or the words/concepts of Setup, Confrontation/Rising Action, and Resolution/Climax',
      failPenalty: 25,
      fixTemplate: 'Add clear act structure: "ACT 1 (Setup): [what happens]. ACT 2 (Confrontation): [escalating conflict]. ACT 3 (Resolution): [climax and resolution]."'
    },
    {
      id: 'inciting-incident-placement',
      label: 'Inciting Incident in First 25%',
      description: 'Does the "Inciting Incident" occur early in the treatment?',
      passCondition: 'Within the first quarter of the synopsis/beats, there is a clear event that disrupts the ordinary world',
      failPenalty: 20,
      fixTemplate: 'Clarify the inciting incident: "Everything changes when [specific event] forces [protagonist] to [reaction]."'
    },
    {
      id: 'low-point-mentioned',
      label: 'Low Point/All Is Lost',
      description: 'Is there a clear "Low Point" mentioned near Act 2 end?',
      passCondition: 'The treatment describes a moment where all seems lost for the protagonist before the final push',
      failPenalty: 15,
      fixTemplate: 'Add the low point: "At their lowest moment, [protagonist] loses [what matters most] and must decide whether to [give up or push forward]."'
    },
    {
      id: 'midpoint-shift',
      label: 'Midpoint Turn Present',
      description: 'Is there a midpoint revelation or reversal?',
      passCondition: 'The treatment mentions a revelation, reversal, or point of no return around the middle of the story',
      failPenalty: 10,
      fixTemplate: 'Add a midpoint turn: "The truth about [revelation] changes everything, forcing [protagonist] to [new approach]."'
    }
  ]
}

// =============================================================================
// GENRE FIDELITY AXIS (15%)
// =============================================================================

export const GENRE_FIDELITY_AXIS: AxisConfig = {
  id: 'genre-fidelity',
  label: 'Genre Fidelity',
  weight: 0.15,
  description: 'Does the treatment match genre expectations?',
  baseScore: 85,
  checkpoints: [
    {
      id: 'genre-keywords',
      label: 'Genre Keywords Present (3+)',
      description: 'Does the treatment contain keywords associated with the genre and tone?',
      passCondition: 'At least 3 keywords or phrases that evoke the chosen genre and tone appear in the treatment',
      failPenalty: 20,
      fixTemplate: 'Add genre-appropriate language: For [genre], include words like [keyword1], [keyword2], [keyword3] to establish tone.'
    },
    {
      id: 'genre-conventions-met',
      label: 'Essential Conventions Present',
      description: 'Does the treatment include the must-have elements for this genre?',
      passCondition: 'The essential genre conventions are present (e.g., thriller has stakes/ticking clock, horror has threat/dread, drama has emotional transformation)',
      failPenalty: 25,
      fixTemplate: 'Strengthen genre elements: This [genre] needs [essential convention]. Add: "[specific convention text]."'
    },
    {
      id: 'tone-consistency',
      label: 'Tone Matches Throughout',
      description: 'Is the emotional tone consistent with the selected tone profile?',
      passCondition: 'The language, imagery, and story beats maintain the specified tone (dark/light/suspenseful/etc.)',
      failPenalty: 15,
      fixTemplate: 'Adjust tone consistency: Replace [inconsistent element] with [tone-appropriate alternative] to maintain [tone profile] feel.'
    }
  ]
}

// =============================================================================
// COMMERCIAL VIABILITY AXIS (15%)
// =============================================================================

export const COMMERCIAL_VIABILITY_AXIS: AxisConfig = {
  id: 'commercial-viability',
  label: 'Commercial Viability',
  weight: 0.15,
  description: 'Is this marketable to the target demographic?',
  baseScore: 85,
  checkpoints: [
    {
      id: 'protagonist-demographic-match',
      label: 'Protagonist Matches Target Audience',
      description: 'Does the protagonist\'s age/situation match the target demographic?',
      passCondition: 'The protagonist\'s age, life stage, or concerns align with what the target demographic can relate to',
      failPenalty: 20,
      fixTemplate: 'Adjust protagonist for audience: For [demographic], the protagonist should be [age range] dealing with [relevant themes].'
    },
    {
      id: 'demographic-themes',
      label: 'Demographic-Relevant Themes',
      description: 'Does the treatment address themes relevant to the target demographic?',
      passCondition: 'The story explores themes that resonate with the target age group\'s experiences and concerns',
      failPenalty: 20,
      fixTemplate: 'Add demographic-relevant themes: For [demographic], include themes like [theme1], [theme2] that resonate with their experiences.'
    },
    {
      id: 'marketable-logline',
      label: 'Marketable Logline',
      description: 'Is the logline pitchable in one compelling sentence?',
      passCondition: 'The logline could be used in marketing materials and clearly communicates the hook',
      failPenalty: 15,
      fixTemplate: 'Strengthen the logline for marketing: "[Genre] meets [comparison] when [protagonist] must [action] or face [stakes]."'
    }
  ]
}

// =============================================================================
// ALL AXES COMBINED
// =============================================================================

export const ALL_SCORING_AXES: AxisConfig[] = [
  CONCEPT_ORIGINALITY_AXIS,
  CHARACTER_DEPTH_AXIS,
  PACING_STRUCTURE_AXIS,
  GENRE_FIDELITY_AXIS,
  COMMERCIAL_VIABILITY_AXIS
]

// =============================================================================
// GENRE-SPECIFIC KEYWORDS
// =============================================================================

export const GENRE_KEYWORDS: Record<string, { required: string[]; avoid: string[] }> = {
  'drama': {
    required: ['emotional', 'transformation', 'struggle', 'relationship', 'conflict', 'catharsis', 'realization'],
    avoid: ['gore', 'explosion', 'action sequence']
  },
  'thriller': {
    required: ['stakes', 'tension', 'clock', 'pursuit', 'danger', 'revelation', 'twist'],
    avoid: ['whimsical', 'heartwarming', 'comedic']
  },
  'horror': {
    required: ['dread', 'fear', 'threat', 'survival', 'darkness', 'terror', 'isolation'],
    avoid: ['cheerful', 'upbeat', 'lighthearted']
  },
  'comedy': {
    required: ['funny', 'humor', 'awkward', 'mishap', 'ironic', 'absurd', 'witty'],
    avoid: ['tragedy', 'death', 'despair']
  },
  'sci-fi': {
    required: ['technology', 'future', 'discovery', 'humanity', 'evolution', 'alien', 'synthetic'],
    avoid: ['magic', 'supernatural', 'fantasy']
  },
  'romance': {
    required: ['love', 'connection', 'chemistry', 'heart', 'passion', 'desire', 'vulnerability'],
    avoid: ['violence', 'gore', 'horror']
  },
  'action': {
    required: ['explosive', 'chase', 'fight', 'hero', 'stakes', 'danger', 'adrenaline'],
    avoid: ['slow', 'contemplative', 'subtle']
  },
  'fantasy': {
    required: ['magic', 'quest', 'realm', 'power', 'destiny', 'ancient', 'mythical'],
    avoid: ['technology', 'science', 'realistic']
  },
  'mystery': {
    required: ['clue', 'suspect', 'secret', 'investigation', 'revelation', 'truth', 'deception'],
    avoid: ['obvious', 'straightforward', 'simple']
  },
  'documentary': {
    required: ['truth', 'real', 'insight', 'journey', 'discovery', 'subject', 'perspective'],
    avoid: ['fictional', 'imaginary', 'fantasy']
  }
}

// =============================================================================
// TONE-SPECIFIC KEYWORDS
// =============================================================================

export const TONE_KEYWORDS: Record<string, { required: string[]; avoid: string[] }> = {
  'dark-gritty': {
    required: ['visceral', 'shadowy', 'tense', 'burdened', 'raw', 'harsh', 'unforgiving', 'bleak'],
    avoid: ['cheerful', 'bright', 'happy', 'joyful', 'lighthearted']
  },
  'light-comedic': {
    required: ['playful', 'witty', 'charming', 'absurd', 'quirky', 'delightful', 'amusing'],
    avoid: ['dark', 'grim', 'disturbing', 'violent', 'tragic']
  },
  'inspirational': {
    required: ['uplifting', 'triumph', 'hope', 'perseverance', 'courage', 'transformation', 'breakthrough'],
    avoid: ['cynical', 'hopeless', 'defeat', 'despair']
  },
  'suspenseful': {
    required: ['tense', 'edge', 'anticipation', 'danger', 'uncertainty', 'looming', 'breathless'],
    avoid: ['relaxed', 'calm', 'peaceful', 'predictable']
  },
  'heartwarming': {
    required: ['touching', 'emotional', 'tender', 'bond', 'love', 'family', 'connection', 'healing'],
    avoid: ['cold', 'dark', 'violent', 'cynical']
  },
  'satirical': {
    required: ['ironic', 'biting', 'critique', 'absurd', 'exaggerated', 'commentary', 'parody'],
    avoid: ['sincere', 'earnest', 'straightforward']
  },
  'melancholic': {
    required: ['wistful', 'bittersweet', 'loss', 'reflection', 'longing', 'nostalgia', 'regret'],
    avoid: ['cheerful', 'energetic', 'upbeat']
  },
  'whimsical': {
    required: ['magical', 'fantastical', 'playful', 'wonder', 'curious', 'enchanting', 'dreamlike'],
    avoid: ['realistic', 'grim', 'harsh', 'dark']
  },
  'intense': {
    required: ['gripping', 'powerful', 'relentless', 'confrontation', 'explosive', 'urgent', 'fierce'],
    avoid: ['gentle', 'mild', 'subdued', 'calm']
  },
  'nostalgic': {
    required: ['reminiscent', 'era', 'memory', 'classic', 'throwback', 'sentimental', 'retro'],
    avoid: ['futuristic', 'modern', 'cutting-edge']
  }
}

// =============================================================================
// DEMOGRAPHIC-SPECIFIC THEMES
// =============================================================================

export const DEMOGRAPHIC_THEMES: Record<string, { themes: string[]; protagonistAge: string }> = {
  'gen-z-18-24': {
    themes: ['identity', 'authenticity', 'social media', 'mental health', 'climate anxiety', 'diversity', 'digital native'],
    protagonistAge: '18-24'
  },
  'millennials-25-34': {
    themes: ['burnout', 'student debt', 'quarter-life crisis', 'work-life balance', 'digital isolation', 'adulting', 'relationship complexity'],
    protagonistAge: '25-34'
  },
  'gen-x-35-54': {
    themes: ['career plateau', 'aging parents', 'teenage children', 'midlife reflection', 'divorce', 'reinvention', 'legacy'],
    protagonistAge: '35-54'
  },
  'boomers-55+': {
    themes: ['retirement', 'mortality', 'grandchildren', 'health', 'legacy', 'second chances', 'wisdom', 'reflection'],
    protagonistAge: '55-70'
  },
  'teens-13-17': {
    themes: ['first love', 'identity formation', 'peer pressure', 'family conflict', 'school', 'self-discovery', 'rebellion'],
    protagonistAge: '14-17'
  },
  'family-all-ages': {
    themes: ['adventure', 'teamwork', 'love', 'courage', 'friendship', 'growth', 'wonder', 'good vs evil'],
    protagonistAge: 'any (relatable to children and adults)'
  },
  'mature-21+': {
    themes: ['moral ambiguity', 'violence', 'sexuality', 'addiction', 'trauma', 'complex relationships', 'existential questions'],
    protagonistAge: '21-45'
  },
  'general-audience': {
    themes: ['universal struggles', 'hope', 'love', 'adventure', 'growth', 'humor', 'resilience', 'connection', 'discovery'],
    protagonistAge: 'any (broadly relatable)'
  }
}

// =============================================================================
// DIMINISHING RETURNS CONFIGURATION
// =============================================================================

export interface IterationFocus {
  iteration: number
  focusAreas: string[]
  description: string
  maxImpact: string
  restrictedSuggestions: string[]
}

export const ITERATION_FOCUS: IterationFocus[] = [
  {
    iteration: 1,
    focusAreas: ['Major Structural Blocks', 'Missing Core Elements', 'Core Story Foundation'],
    description: 'Focus on foundational issues: logline, acts, protagonist, antagonist, genre conventions',
    maxImpact: '+20-40 points',
    restrictedSuggestions: []
  },
  {
    iteration: 2,
    focusAreas: ['Tone Refinement', 'Genre Polish', 'Character Nuance'],
    description: 'Final refinement - accept current state unless critical issues remain. Further improvements happen in script phase.',
    maxImpact: '+5-15 points',
    restrictedSuggestions: ['word choice', 'phrasing', 'stylistic', 'better words', 'more flair', 'enhanced description']
  }
]

/**
 * Get iteration focus configuration
 */
export function getIterationFocus(iteration: number): IterationFocus {
  if (iteration >= 2) return ITERATION_FOCUS[1] // Cap at iteration 2
  return ITERATION_FOCUS[Math.max(0, iteration - 1)]
}

/**
 * Check if a suggestion should be restricted based on iteration
 */
export function isSuggestionRestricted(suggestion: string, iteration: number): boolean {
  if (iteration < 2) return false // No restrictions in first iteration
  
  const focus = getIterationFocus(iteration)
  const lowerSuggestion = suggestion.toLowerCase()
  
  return focus.restrictedSuggestions.some(restricted => 
    lowerSuggestion.includes(restricted.toLowerCase())
  )
}

// =============================================================================
// SCORE NARRATIVE EXPLANATIONS
// =============================================================================

export type FixPhase = 'blueprint' | 'script' | 'both'

export interface AxisNarrative {
  axisId: string
  axisLabel: string
  lowScoreExplanation: string
  mediumScoreExplanation: string
  highScoreExplanation: string
  bestFixedIn: FixPhase
  blueprintTips: string[]
  scriptTips: string[]
}

export const AXIS_NARRATIVES: Record<string, AxisNarrative> = {
  'concept-originality': {
    axisId: 'concept-originality',
    axisLabel: 'Concept Originality',
    lowScoreExplanation: 'The concept feels familiar or relies heavily on common tropes without subversion.',
    mediumScoreExplanation: 'The concept has some unique elements but could be more distinctive.',
    highScoreExplanation: 'The concept feels fresh and offers a compelling hook that stands out.',
    bestFixedIn: 'blueprint',
    blueprintTips: [
      'Add an unexpected twist to the logline',
      'Subvert a common genre trope',
      'Make the setting more specific and unusual'
    ],
    scriptTips: [
      'Add unique dialogue patterns',
      'Include unexpected scene reversals'
    ]
  },
  'character-depth': {
    axisId: 'character-depth',
    axisLabel: 'Character Depth',
    lowScoreExplanation: 'Characters lack clear goals, flaws, or backstory that drive their actions.',
    mediumScoreExplanation: 'Main characters are defined but could have stronger motivations or internal conflicts.',
    highScoreExplanation: 'Characters are well-defined with clear goals, flaws, and compelling backstories.',
    bestFixedIn: 'blueprint',
    blueprintTips: [
      'Define the protagonist\'s specific external goal',
      'Add a character flaw that creates internal conflict',
      'Include a "ghost" - a past trauma that haunts them'
    ],
    scriptTips: [
      'Show character flaws through actions, not exposition',
      'Add moments of vulnerability in dialogue'
    ]
  },
  'pacing-structure': {
    axisId: 'pacing-structure',
    axisLabel: 'Pacing & Structure',
    lowScoreExplanation: 'The story structure is unclear or missing key beats (inciting incident, midpoint, low point).',
    mediumScoreExplanation: 'Basic structure is present but some beats could be stronger or better placed.',
    highScoreExplanation: 'Clear three-act structure with well-placed story beats and good momentum.',
    bestFixedIn: 'script',
    blueprintTips: [
      'Ensure all three acts are clearly defined',
      'Identify the inciting incident explicitly',
      'Add a midpoint turn and low point'
    ],
    scriptTips: [
      'Balance scene lengths for better rhythm',
      'Ensure rising tension through Act 2',
      'Cut scenes that don\'t advance plot or character'
    ]
  },
  'genre-fidelity': {
    axisId: 'genre-fidelity',
    axisLabel: 'Genre Fidelity',
    lowScoreExplanation: 'The treatment doesn\'t meet audience expectations for the selected genre.',
    mediumScoreExplanation: 'Genre conventions are present but tone may be inconsistent.',
    highScoreExplanation: 'Strong genre identity with consistent tone and expected conventions delivered.',
    bestFixedIn: 'blueprint',
    blueprintTips: [
      'Add genre-specific keywords and imagery',
      'Ensure essential genre conventions are present',
      'Maintain consistent tone throughout'
    ],
    scriptTips: [
      'Use genre-appropriate dialogue style',
      'Include set-piece scenes expected by genre fans'
    ]
  },
  'commercial-viability': {
    axisId: 'commercial-viability',
    axisLabel: 'Commercial Viability',
    lowScoreExplanation: 'The story may not resonate with the target demographic or lacks marketable elements.',
    mediumScoreExplanation: 'Good audience potential but could strengthen demographic appeal.',
    highScoreExplanation: 'Strong market appeal with clear demographic targeting and pitchable logline.',
    bestFixedIn: 'blueprint',
    blueprintTips: [
      'Ensure protagonist matches target demographic age/concerns',
      'Include themes that resonate with the audience',
      'Strengthen the logline for marketing'
    ],
    scriptTips: [
      'Add relatable dialogue for target audience',
      'Include scenes that showcase marketable moments'
    ]
  }
}

/**
 * Get narrative explanation for a score
 */
export function getScoreNarrative(axisId: string, score: number): {
  explanation: string
  bestFixedIn: FixPhase
  tips: string[]
} {
  const narrative = AXIS_NARRATIVES[axisId]
  if (!narrative) {
    return {
      explanation: 'Score information not available.',
      bestFixedIn: 'blueprint',
      tips: []
    }
  }
  
  let explanation: string
  if (score < 60) {
    explanation = narrative.lowScoreExplanation
  } else if (score < 80) {
    explanation = narrative.mediumScoreExplanation
  } else {
    explanation = narrative.highScoreExplanation
  }
  
  const tips = narrative.bestFixedIn === 'script' 
    ? narrative.scriptTips 
    : narrative.blueprintTips
  
  return {
    explanation,
    bestFixedIn: narrative.bestFixedIn,
    tips
  }
}

/**
 * Generate overall score narrative summary
 */
export function generateScoreSummary(scores: {
  originality: number
  characterDepth: number
  pacing: number
  genreFidelity: number
  commercialViability: number
}, overallScore: number): {
  summary: string
  blueprintFocus: string[]
  scriptFocus: string[]
} {
  const weakAreas: string[] = []
  const blueprintFocus: string[] = []
  const scriptFocus: string[] = []
  
  const scoreMap = {
    'concept-originality': scores.originality,
    'character-depth': scores.characterDepth,
    'pacing-structure': scores.pacing,
    'genre-fidelity': scores.genreFidelity,
    'commercial-viability': scores.commercialViability
  }
  
  for (const [axisId, score] of Object.entries(scoreMap)) {
    if (score < 70) {
      const narrative = AXIS_NARRATIVES[axisId]
      if (narrative) {
        weakAreas.push(narrative.axisLabel)
        if (narrative.bestFixedIn === 'script') {
          scriptFocus.push(`${narrative.axisLabel}: ${narrative.scriptTips[0]}`)
        } else {
          blueprintFocus.push(`${narrative.axisLabel}: ${narrative.blueprintTips[0]}`)
        }
      }
    }
  }
  
  let summary: string
  if (overallScore >= 80) {
    summary = 'Your treatment is strong and ready for production. Minor refinements can be made during script editing.'
  } else if (overallScore >= 70) {
    summary = `Good foundation with room for improvement in ${weakAreas.slice(0, 2).join(' and ')}. Consider addressing key issues before proceeding.`
  } else if (overallScore >= 60) {
    summary = `Your treatment needs work on ${weakAreas.slice(0, 3).join(', ')}. Focus on foundational elements in the Blueprint phase.`
  } else {
    summary = 'Focus on establishing core story elements: protagonist goal, clear structure, and genre conventions.'
  }
  
  return { summary, blueprintFocus, scriptFocus }
}

export const ENDING_EXPECTATIONS: Record<string, { acceptable: string[]; penalized: string[] }> = {
  'dark-gritty': {
    acceptable: ['bittersweet', 'tragic', 'pyrrhic victory', 'ambiguous', 'somber'],
    penalized: ['happy ending', 'fairy tale', 'triumphant', 'cheerful resolution']
  },
  'light-comedic': {
    acceptable: ['happy', 'satisfying', 'comedic resolution', 'heartwarming'],
    penalized: ['tragic', 'death', 'depressing', 'dark']
  },
  'inspirational': {
    acceptable: ['triumphant', 'hopeful', 'transformation complete', 'success'],
    penalized: ['defeat', 'tragedy', 'hopeless', 'failure']
  },
  'suspenseful': {
    acceptable: ['resolution', 'revelation', 'twist', 'cliffhanger'],
    penalized: ['predictable', 'anticlimactic']
  },
  'heartwarming': {
    acceptable: ['emotional resolution', 'reunion', 'reconciliation', 'love'],
    penalized: ['cold', 'unresolved', 'tragic', 'dark']
  },
  'melancholic': {
    acceptable: ['bittersweet', 'acceptance', 'wistful', 'reflection'],
    penalized: ['purely happy', 'triumphant', 'energetic']
  }
}

// =============================================================================
// HELPER: Build Checklist Prompt Section (Compact Version)
// =============================================================================

export function buildChecklistPrompt(intent: {
  primaryGenre: PrimaryGenre
  targetDemographic: TargetDemographic
  toneProfile: ToneProfile
}, iteration: number): string {
  const genreKeywords = GENRE_KEYWORDS[intent.primaryGenre] || GENRE_KEYWORDS['drama']
  const toneKeywords = TONE_KEYWORDS[intent.toneProfile] || TONE_KEYWORDS['dark-gritty']
  const demoThemes = DEMOGRAPHIC_THEMES[intent.targetDemographic] || DEMOGRAPHIC_THEMES['millennials-25-34']
  const iterationFocus = getIterationFocus(iteration)
  
  // Compact checklist format to reduce prompt size
  return `
SCORING: ${WEIGHT_FORMULA}
Iteration ${iteration}/${MAX_ITERATIONS} | Focus: ${iterationFocus.focusAreas.join(', ')}
${iteration >= 2 ? `Avoid suggesting: ${iterationFocus.restrictedSuggestions.slice(0, 3).join(', ')}` : ''}

CHECKPOINTS (mark passed IDs in checkpoints_passed):
Concept (25%): hook-or-twist (-25), cliche-avoidance (-20), unique-setting-or-premise (-15)
Character (25%): protagonist-goal (-30), protagonist-flaw (-25), antagonist-defined (-20), character-ghost (-10)
Pacing (20%): three-act-structure (-25), inciting-incident-placement (-20), low-point-mentioned (-15), midpoint-shift (-10)
Genre (15%): genre-keywords (-20), genre-conventions-met (-25), tone-consistency (-15)
Commercial (15%): protagonist-demographic-match (-20), demographic-themes (-20), marketable-logline (-15)

GENRE ${intent.primaryGenre}: Need keywords like ${genreKeywords.required.slice(0, 4).join(', ')}
TONE ${intent.toneProfile}: Need keywords like ${toneKeywords.required.slice(0, 4).join(', ')}
AUDIENCE ${intent.targetDemographic}: Protagonist age ${demoThemes.protagonistAge}, themes: ${demoThemes.themes.slice(0, 3).join(', ')}

READY THRESHOLD: ${READY_FOR_PRODUCTION_THRESHOLD}/100. If score >= ${READY_FOR_PRODUCTION_THRESHOLD}, minimize suggestions.
${iteration >= MAX_ITERATIONS ? 'FINAL ITERATION: Accept unless FATAL FLAW exists.' : ''}
`
}

// =============================================================================
// GRADIENT SCORING FUNCTIONS
// =============================================================================

/**
 * Calculate axis score using gradient (0-10) checkpoint scores
 * Uses weighted average for smoother scoring (max ~4% swing per checkpoint)
 */
export function calculateAxisScoreGradient(
  checkpointScores: Record<string, number>,
  axis: AxisConfig
): number {
  let totalPoints = 0
  let maxPossible = 0
  
  for (const checkpoint of axis.checkpoints) {
    const score = checkpointScores[checkpoint.id] ?? 5 // Default to mid-score if missing
    const weight = 1.0 // All checkpoints equally weighted within axis
    totalPoints += score * weight
    maxPossible += 10 * weight
  }
  
  if (maxPossible === 0) return 50 // Fallback
  return Math.round((totalPoints / maxPossible) * 100)
}

/**
 * Apply hysteresis smoothing to prevent score volatility on re-analysis
 * New Score = (Previous * anchorStrength) + (Current * (1 - anchorStrength))
 */
export function applyHysteresisSmoothing(
  newScores: {
    originality: number
    genreFidelity: number
    characterDepth: number
    pacing: number
    commercialViability: number
  },
  previousScores: {
    originality: number
    genreFidelity: number
    characterDepth: number
    pacing: number
    commercialViability: number
  } | null,
  anchorStrength: number = 0.3 // 30% locked to history (was 40%, reduced for responsiveness)
): typeof newScores {
  if (!previousScores) return newScores
  
  return {
    originality: Math.round(previousScores.originality * anchorStrength + newScores.originality * (1 - anchorStrength)),
    genreFidelity: Math.round(previousScores.genreFidelity * anchorStrength + newScores.genreFidelity * (1 - anchorStrength)),
    characterDepth: Math.round(previousScores.characterDepth * anchorStrength + newScores.characterDepth * (1 - anchorStrength)),
    pacing: Math.round(previousScores.pacing * anchorStrength + newScores.pacing * (1 - anchorStrength)),
    commercialViability: Math.round(previousScores.commercialViability * anchorStrength + newScores.commercialViability * (1 - anchorStrength))
  }
}

/**
 * Enforce score floor to prevent catastrophic drops
 * Iteration 3+: No drops allowed (maxDrop = 0)
 * Earlier iterations: Max 10 point drop
 */
export function enforceScoreFloor(
  newScore: number,
  previousScore: number | null,
  iteration: number = 1
): number {
  if (previousScore === null) return newScore
  // After iteration 2, lock in gains - no regression allowed
  const maxDrop = iteration >= 3 ? 0 : 10
  const floor = previousScore - maxDrop
  return Math.max(newScore, floor)
}

/**
 * Convert gradient score (0-10) to legacy passed/penalty format
 */
export function scoreToLegacyFormat(
  score: number,
  maxPenalty: number
): { passed: boolean; penalty: number } {
  const passed = score >= 7 // 7+ = passed
  const penalty = passed ? 0 : Math.round(((10 - score) / 10) * maxPenalty)
  return { passed, penalty }
}

/**
 * Convert legacy passed/penalty to gradient score (0-10)
 */
export function legacyToGradientScore(
  passed: boolean,
  penalty: number,
  maxPenalty: number
): number {
  if (passed) return 10
  if (maxPenalty === 0) return 5
  // Map penalty to score: higher penalty = lower score
  const penaltyRatio = penalty / maxPenalty
  return Math.round(10 - (penaltyRatio * 10))
}

/**
 * Get all checkpoint IDs for an axis
 */
export function getAxisCheckpointIds(axisId: string): string[] {
  const axis = ALL_SCORING_AXES.find(a => a.id === axisId)
  return axis ? axis.checkpoints.map(c => c.id) : []
}

/**
 * Get max penalty for a checkpoint
 */
export function getCheckpointMaxPenalty(checkpointId: string): number {
  for (const axis of ALL_SCORING_AXES) {
    const checkpoint = axis.checkpoints.find(c => c.id === checkpointId)
    if (checkpoint) return checkpoint.failPenalty
  }
  return 20 // Default
}
