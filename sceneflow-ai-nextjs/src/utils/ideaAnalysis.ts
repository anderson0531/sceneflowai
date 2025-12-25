/**
 * Utility functions for analyzing and classifying user idea inputs
 * Determines if an idea is "vague" and needs inspiration assistance
 */

export interface IdeaAnalysisResult {
  isVague: boolean
  confidence: number // 0-1 scale
  missingElements: string[]
  suggestions: string[]
}

// Story elements that indicate a well-formed idea
const STORY_ELEMENT_PATTERNS = {
  protagonist: /\b(character|protagonist|hero|person|man|woman|girl|boy|they|someone|narrator|host|presenter|founder|creator|artist|expert)\b/i,
  conflict: /\b(conflict|problem|challenge|struggle|versus|against|overcome|solve|fix|help|discover|learn|reveal|transform|change|journey|quest)\b/i,
  setting: /\b(in|at|during|world|place|city|town|home|office|space|time|era|future|past|present|location|environment|setting)\b/i,
  genre: /\b(documentary|drama|comedy|thriller|horror|romance|action|adventure|sci-fi|fantasy|mystery|tutorial|how-to|explainer|brand|commercial|testimonial|product|demo)\b/i,
  emotion: /\b(feel|emotion|inspire|motivate|scare|excite|move|touch|laugh|cry|hope|fear|joy|love|anger|sad|happy|anxious|curious|surprised)\b/i,
}

// Minimum thresholds
const MIN_CHAR_LENGTH = 50 // Ideas under 50 chars are likely too vague
const MIN_WORD_COUNT = 8 // Ideas under 8 words need expansion
const VAGUE_THRESHOLD = 0.4 // Score below this = vague

/**
 * Analyzes an idea to determine if it's too vague and needs inspiration
 * @param input The raw user input/concept
 * @returns Analysis result with vagueness determination and suggestions
 */
export function analyzeIdeaClarity(input: string): IdeaAnalysisResult {
  const trimmed = input.trim()
  const words = trimmed.split(/\s+/).filter(w => w.length > 0)
  const wordCount = words.length
  
  const missingElements: string[] = []
  const suggestions: string[] = []
  
  // Check length thresholds
  if (trimmed.length < MIN_CHAR_LENGTH) {
    suggestions.push('Add more detail to your concept')
  }
  
  if (wordCount < MIN_WORD_COUNT) {
    suggestions.push('Expand your idea with a few more sentences')
  }
  
  // Calculate element scores
  let elementScore = 0
  const elementCount = Object.keys(STORY_ELEMENT_PATTERNS).length
  
  for (const [element, pattern] of Object.entries(STORY_ELEMENT_PATTERNS)) {
    if (pattern.test(trimmed)) {
      elementScore += 1
    } else {
      missingElements.push(element)
      
      // Add specific suggestions for missing elements
      switch (element) {
        case 'protagonist':
          suggestions.push('Consider adding who this story is about')
          break
        case 'conflict':
          suggestions.push('What challenge or transformation happens?')
          break
        case 'setting':
          suggestions.push('Where or when does this take place?')
          break
        case 'genre':
          suggestions.push('What style or format are you envisioning?')
          break
        case 'emotion':
          suggestions.push('How should viewers feel watching this?')
          break
      }
    }
  }
  
  // Normalize element score (0-1)
  const normalizedElementScore = elementScore / elementCount
  
  // Calculate length score (0-1)
  const lengthScore = Math.min(1, trimmed.length / 150) // 150+ chars = full score
  
  // Calculate word diversity score
  const uniqueWords = new Set(words.map(w => w.toLowerCase()))
  const diversityScore = Math.min(1, uniqueWords.size / 15) // 15+ unique words = full score
  
  // Weighted composite confidence score
  const confidence = (
    normalizedElementScore * 0.5 +
    lengthScore * 0.3 +
    diversityScore * 0.2
  )
  
  // Determine if vague
  const isVague = confidence < VAGUE_THRESHOLD
  
  // Limit suggestions to top 3
  const topSuggestions = suggestions.slice(0, 3)
  
  return {
    isVague,
    confidence,
    missingElements,
    suggestions: topSuggestions
  }
}

/**
 * Quick check if an idea is vague (simpler boolean version)
 * @param input The raw user input
 * @returns true if the idea is considered vague
 */
export function isVagueIdea(input: string): boolean {
  return analyzeIdeaClarity(input).isVague
}

/**
 * Get a user-friendly message explaining why an idea is vague
 * @param analysis The analysis result
 * @returns A friendly message for the user
 */
export function getVagueIdeaMessage(analysis: IdeaAnalysisResult): string {
  if (!analysis.isVague) {
    return 'Your idea looks good! Ready to analyze.'
  }
  
  const missing = analysis.missingElements.slice(0, 2)
  if (missing.length === 0) {
    return "Let's spark some inspiration! Your idea could use more detail."
  }
  
  const formattedMissing = missing.map(m => {
    switch (m) {
      case 'protagonist': return 'who it\'s about'
      case 'conflict': return 'what happens'
      case 'setting': return 'where/when it takes place'
      case 'genre': return 'what style'
      case 'emotion': return 'how viewers should feel'
      default: return m
    }
  })
  
  return `Let's add more detail! Consider: ${formattedMissing.join(', ')}.`
}
