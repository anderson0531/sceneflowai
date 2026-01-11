/**
 * Segment Validation - Scene Bible Integrity Enforcement
 * 
 * Validates segment prompts and configurations against the immutable
 * scene bible to ensure users don't inadvertently modify script content
 * during the segmentation workflow.
 * 
 * PRINCIPLES:
 * 1. Scene content (setting, narration, dialogue) is READ-ONLY during segmentation
 * 2. Users can only edit cinematography, pacing, and visual style
 * 3. New characters, locations, or dialogue not in the bible trigger warnings
 * 4. Duration constraints (≤8s) are enforced for Veo 3.1 compatibility
 */

import type { SceneBible, ProposedSegment } from '@/components/vision/scene-production/SegmentBuilder'

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Validation rule severity
 */
export type ValidationSeverity = 'error' | 'warning' | 'info'

/**
 * Individual validation issue
 */
export interface ValidationIssue {
  code: string
  severity: ValidationSeverity
  message: string
  field?: string
  suggestion?: string
}

/**
 * Complete validation result for a segment
 */
export interface ValidationResult {
  isValid: boolean
  issues: ValidationIssue[]
  // Computed scores
  durationScore: number      // 0-100, how well duration fits constraints
  bibleFidelityScore: number // 0-100, how well prompt matches scene bible
  promptQualityScore: number // 0-100, overall prompt effectiveness
}

/**
 * Validation configuration options
 */
export interface ValidationConfig {
  // Duration constraints
  minDuration: number        // Default: 2 seconds
  maxDuration: number        // Default: 8 seconds (Veo 3.1 limit)
  optimalDuration: number    // Default: 6 seconds
  
  // Strictness levels
  enforceCharacterCheck: boolean  // Require characters to be in scene bible
  enforceLocationCheck: boolean   // Warn on location mentions not matching
  enforceDialogueCheck: boolean   // Warn on dialogue that doesn't match
  
  // Thresholds
  dialogueCoverageThreshold: number  // Warn if < X% of dialogue covered (0-1)
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: ValidationConfig = {
  minDuration: 2,
  maxDuration: 8,
  optimalDuration: 6,
  enforceCharacterCheck: true,
  enforceLocationCheck: true,
  enforceDialogueCheck: true,
  dialogueCoverageThreshold: 0.8,
}

// ============================================================================
// Known Entity Lists (for detection)
// ============================================================================

/**
 * Common character name patterns to detect in prompts
 */
const COMMON_NAME_PATTERNS = [
  // First names (just samples for heuristic detection)
  /\b(john|jane|michael|sarah|david|emma|alex|sam|chris|lisa|mark|anna|tom|kate|james|mary|robert|jennifer|william|elizabeth)\b/gi,
  // Titles + names
  /\b(mr\.|mrs\.|ms\.|dr\.|professor|officer|detective|agent)\s+[A-Z][a-z]+/g,
  // The + descriptor patterns that might be characters
  /\bthe\s+(man|woman|boy|girl|child|stranger|figure|person)\b/gi,
]

/**
 * Location change indicators
 */
const LOCATION_CHANGE_PATTERNS = [
  /\b(moves? to|walks? into|enters?|arrives? at|goes? to|leaves?|exits?|steps? (into|outside|out of))\b/gi,
  /\b(in the|at the|inside the|outside the)\s+[A-Z][a-z]+/g,
  /\b(new location|different room|another place)\b/gi,
]

/**
 * Action-related keywords that are allowed (not location changes)
 */
const ALLOWED_ACTION_KEYWORDS = [
  'walks toward', 'steps forward', 'moves closer', 'turns around',
  'sits down', 'stands up', 'leans', 'gestures', 'reaches',
]

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate segment duration constraints
 */
function validateDuration(
  segment: ProposedSegment,
  config: ValidationConfig
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const duration = segment.duration

  if (duration < config.minDuration) {
    issues.push({
      code: 'DURATION_TOO_SHORT',
      severity: 'error',
      message: `Segment is ${duration.toFixed(1)}s which is below minimum ${config.minDuration}s`,
      field: 'duration',
      suggestion: `Increase duration to at least ${config.minDuration} seconds`,
    })
  }

  if (duration > config.maxDuration) {
    issues.push({
      code: 'DURATION_TOO_LONG',
      severity: 'error',
      message: `Segment is ${duration.toFixed(1)}s which exceeds Veo 3.1 max of ${config.maxDuration}s`,
      field: 'duration',
      suggestion: `Split this segment or reduce duration to ${config.maxDuration} seconds or less`,
    })
  }

  if (duration > config.optimalDuration && duration <= config.maxDuration) {
    issues.push({
      code: 'DURATION_SUBOPTIMAL',
      severity: 'info',
      message: `Duration of ${duration.toFixed(1)}s is valid but ${config.optimalDuration}s is optimal for quality`,
      field: 'duration',
    })
  }

  return issues
}

/**
 * Validate character references against scene bible
 */
function validateCharacters(
  prompt: string,
  sceneBible: SceneBible,
  config: ValidationConfig
): ValidationIssue[] {
  if (!config.enforceCharacterCheck) return []
  
  const issues: ValidationIssue[] = []
  const promptLower = prompt.toLowerCase()
  
  // Get bible character names (lowercase for comparison)
  const bibleCharacters = new Set(
    sceneBible.characters.map(c => c.name.toLowerCase())
  )
  
  // Also include characters from dialogue
  sceneBible.dialogue.forEach(d => {
    bibleCharacters.add(d.character.toLowerCase())
  })

  // Check for common name patterns in prompt
  COMMON_NAME_PATTERNS.forEach(pattern => {
    const matches = promptLower.match(pattern)
    if (matches) {
      matches.forEach(match => {
        const cleanMatch = match.toLowerCase().replace(/^(mr\.|mrs\.|ms\.|dr\.|the)\s*/i, '')
        if (cleanMatch.length > 2 && !bibleCharacters.has(cleanMatch)) {
          // Check if it might be a character name (capitalized in original)
          const originalIndex = prompt.toLowerCase().indexOf(match.toLowerCase())
          if (originalIndex >= 0) {
            issues.push({
              code: 'UNKNOWN_CHARACTER',
              severity: 'warning',
              message: `"${match}" appears to be a character not in the scene bible`,
              field: 'prompt',
              suggestion: `If this is a new character, add them in the Script tab first. Scene characters: ${Array.from(bibleCharacters).join(', ')}`,
            })
          }
        }
      })
    }
  })

  return issues
}

/**
 * Validate location references against scene bible
 */
function validateLocation(
  prompt: string,
  sceneBible: SceneBible,
  config: ValidationConfig
): ValidationIssue[] {
  if (!config.enforceLocationCheck) return []
  
  const issues: ValidationIssue[] = []
  const promptLower = prompt.toLowerCase()
  
  // Check for location change patterns
  LOCATION_CHANGE_PATTERNS.forEach(pattern => {
    const matches = promptLower.match(pattern)
    if (matches) {
      matches.forEach(match => {
        // Filter out allowed action keywords
        const isAllowedAction = ALLOWED_ACTION_KEYWORDS.some(action => 
          match.toLowerCase().includes(action)
        )
        
        if (!isAllowedAction) {
          // Check if the location mentioned is the scene's location
          if (!promptLower.includes(sceneBible.location.toLowerCase())) {
            issues.push({
              code: 'LOCATION_CHANGE_DETECTED',
              severity: 'warning',
              message: `Prompt suggests movement or location change: "${match}"`,
              field: 'prompt',
              suggestion: `Scene location is: ${sceneBible.location}. Location changes should happen in the Script tab, not during segmentation.`,
            })
          }
        }
      })
    }
  })

  return issues
}

/**
 * Validate dialogue references against scene bible
 */
function validateDialogue(
  prompt: string,
  segment: ProposedSegment,
  sceneBible: SceneBible,
  config: ValidationConfig
): ValidationIssue[] {
  if (!config.enforceDialogueCheck) return []
  
  const issues: ValidationIssue[] = []
  
  // Check for quoted text in prompt that might be dialogue
  const quotedMatches = prompt.match(/"([^"]+)"/g) || []
  
  if (quotedMatches.length > 0) {
    const bibleDialogue = sceneBible.dialogue.map(d => d.text.toLowerCase())
    
    quotedMatches.forEach(quoted => {
      const cleanQuote = quoted.replace(/"/g, '').toLowerCase().trim()
      
      // Skip very short quotes (likely not dialogue)
      if (cleanQuote.length < 10) return
      
      // Check if this quote exists in any form in the scene dialogue
      const matchFound = bibleDialogue.some(d => 
        d.includes(cleanQuote.substring(0, 20)) || 
        cleanQuote.includes(d.substring(0, 20))
      )
      
      if (!matchFound) {
        issues.push({
          code: 'UNKNOWN_DIALOGUE',
          severity: 'warning',
          message: `Dialogue "${cleanQuote.substring(0, 40)}..." not found in scene script`,
          field: 'prompt',
          suggestion: `Only reference dialogue that exists in the scene. Add new dialogue in the Script tab.`,
        })
      }
    })
  }

  // Check dialogue coverage for this segment
  if (sceneBible.dialogue.length > 0 && segment.dialogueLineIds.length === 0) {
    issues.push({
      code: 'NO_DIALOGUE_ASSIGNED',
      severity: 'info',
      message: 'No dialogue lines assigned to this segment',
      field: 'dialogueLineIds',
      suggestion: 'This is fine for non-dialogue segments, but ensure all dialogue is covered across segments.',
    })
  }

  return issues
}

/**
 * Validate prompt quality and effectiveness
 */
function validatePromptQuality(
  prompt: string,
  segment: ProposedSegment
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  
  // Check prompt length
  if (prompt.length < 50) {
    issues.push({
      code: 'PROMPT_TOO_SHORT',
      severity: 'warning',
      message: 'Prompt may be too brief for effective video generation',
      field: 'prompt',
      suggestion: 'Add more visual detail about camera movement, lighting, or character actions',
    })
  }
  
  if (prompt.length > 1000) {
    issues.push({
      code: 'PROMPT_TOO_LONG',
      severity: 'warning',
      message: 'Prompt may be too verbose, which can confuse the AI',
      field: 'prompt',
      suggestion: 'Focus on key visual elements. Frame-to-frame generation works best with concise prompts.',
    })
  }

  // Check for over-description (frame-to-frame shouldn't repeat scene setup)
  if (segment.sequenceIndex > 0) {
    const overDescriptionPatterns = [
      /\b(the scene is set|the setting is|we are in)\b/gi,
      /\b(establishing shot|wide shot of the|panoramic view)\b/gi,
    ]
    
    overDescriptionPatterns.forEach(pattern => {
      if (pattern.test(prompt)) {
        issues.push({
          code: 'OVER_DESCRIPTION',
          severity: 'info',
          message: 'Prompt describes scene setup, but this is segment #' + (segment.sequenceIndex + 1),
          field: 'prompt',
          suggestion: 'For frame-to-frame continuity, focus on action and movement rather than re-establishing the scene.',
        })
      }
    })
  }

  return issues
}

/**
 * Calculate duration score (0-100)
 */
function calculateDurationScore(duration: number, config: ValidationConfig): number {
  if (duration < config.minDuration || duration > config.maxDuration) {
    return 0
  }
  
  // Optimal score at optimal duration
  const distanceFromOptimal = Math.abs(duration - config.optimalDuration)
  const maxDistance = Math.max(
    config.optimalDuration - config.minDuration,
    config.maxDuration - config.optimalDuration
  )
  
  return Math.round(100 - (distanceFromOptimal / maxDistance) * 30)
}

/**
 * Calculate bible fidelity score (0-100)
 */
function calculateBibleFidelityScore(issues: ValidationIssue[]): number {
  let score = 100
  
  issues.forEach(issue => {
    if (issue.code === 'UNKNOWN_CHARACTER') score -= 15
    if (issue.code === 'LOCATION_CHANGE_DETECTED') score -= 20
    if (issue.code === 'UNKNOWN_DIALOGUE') score -= 10
  })
  
  return Math.max(0, score)
}

/**
 * Calculate prompt quality score (0-100)
 */
function calculatePromptQualityScore(prompt: string, issues: ValidationIssue[]): number {
  let score = 80 // Start at 80, adjust based on issues
  
  // Length bonus/penalty
  if (prompt.length >= 100 && prompt.length <= 500) {
    score += 10
  } else if (prompt.length < 50 || prompt.length > 1000) {
    score -= 15
  }
  
  // Penalize for quality issues
  issues.forEach(issue => {
    if (issue.code === 'PROMPT_TOO_SHORT') score -= 10
    if (issue.code === 'PROMPT_TOO_LONG') score -= 10
    if (issue.code === 'OVER_DESCRIPTION') score -= 5
  })
  
  return Math.max(0, Math.min(100, score))
}

// ============================================================================
// Main Validation API
// ============================================================================

export class SegmentValidation {
  /**
   * Validate a single segment against the scene bible
   */
  static validateSegment(
    segment: ProposedSegment,
    sceneBible: SceneBible,
    config: Partial<ValidationConfig> = {}
  ): ValidationResult {
    const fullConfig = { ...DEFAULT_CONFIG, ...config }
    const prompt = segment.userEditedPrompt || segment.generatedPrompt

    // Run all validation checks
    const durationIssues = validateDuration(segment, fullConfig)
    const characterIssues = validateCharacters(prompt, sceneBible, fullConfig)
    const locationIssues = validateLocation(prompt, sceneBible, fullConfig)
    const dialogueIssues = validateDialogue(prompt, segment, sceneBible, fullConfig)
    const qualityIssues = validatePromptQuality(prompt, segment)

    const allIssues = [
      ...durationIssues,
      ...characterIssues,
      ...locationIssues,
      ...dialogueIssues,
      ...qualityIssues,
    ]

    // Check if any errors exist (warnings don't make it invalid)
    const hasErrors = allIssues.some(issue => issue.severity === 'error')

    return {
      isValid: !hasErrors,
      issues: allIssues,
      durationScore: calculateDurationScore(segment.duration, fullConfig),
      bibleFidelityScore: calculateBibleFidelityScore([...characterIssues, ...locationIssues, ...dialogueIssues]),
      promptQualityScore: calculatePromptQualityScore(prompt, qualityIssues),
    }
  }

  /**
   * Validate all segments for a scene
   */
  static validateAllSegments(
    segments: ProposedSegment[],
    sceneBible: SceneBible,
    config: Partial<ValidationConfig> = {}
  ): {
    results: Map<string, ValidationResult>
    overallValid: boolean
    dialogueCoverage: number
    totalDuration: number
  } {
    const results = new Map<string, ValidationResult>()
    
    segments.forEach(segment => {
      results.set(segment.id, this.validateSegment(segment, sceneBible, config))
    })

    // Check overall validity
    const overallValid = Array.from(results.values()).every(r => r.isValid)

    // Calculate dialogue coverage
    const assignedDialogueIds = new Set(segments.flatMap(s => s.dialogueLineIds))
    const dialogueCoverage = sceneBible.dialogue.length > 0
      ? assignedDialogueIds.size / sceneBible.dialogue.length
      : 1

    // Calculate total duration
    const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0)

    return {
      results,
      overallValid,
      dialogueCoverage,
      totalDuration,
    }
  }

  /**
   * Check if prompt introduces new entities not in scene bible
   * Returns list of potential new entities found
   */
  static detectNewEntities(
    prompt: string,
    sceneBible: SceneBible
  ): {
    characters: string[]
    locations: string[]
    dialogue: string[]
  } {
    const promptLower = prompt.toLowerCase()
    const newCharacters: string[] = []
    const newLocations: string[] = []
    const newDialogue: string[] = []

    // Build set of known characters
    const knownCharacters = new Set([
      ...sceneBible.characters.map(c => c.name.toLowerCase()),
      ...sceneBible.dialogue.map(d => d.character.toLowerCase()),
    ])

    // Detect potential new characters
    COMMON_NAME_PATTERNS.forEach(pattern => {
      const matches = promptLower.match(pattern) || []
      matches.forEach(match => {
        const clean = match.toLowerCase().replace(/^(mr\.|mrs\.|ms\.|dr\.|the)\s*/i, '').trim()
        if (clean.length > 2 && !knownCharacters.has(clean)) {
          newCharacters.push(match)
        }
      })
    })

    // Detect location changes
    LOCATION_CHANGE_PATTERNS.forEach(pattern => {
      const matches = promptLower.match(pattern) || []
      matches.forEach(match => {
        const isAllowed = ALLOWED_ACTION_KEYWORDS.some(k => match.includes(k))
        if (!isAllowed && !promptLower.includes(sceneBible.location.toLowerCase())) {
          newLocations.push(match)
        }
      })
    })

    // Detect new dialogue
    const quotedMatches = prompt.match(/"([^"]+)"/g) || []
    const knownDialogue = sceneBible.dialogue.map(d => d.text.toLowerCase())
    
    quotedMatches.forEach(quoted => {
      const clean = quoted.replace(/"/g, '').toLowerCase().trim()
      if (clean.length >= 10) {
        const found = knownDialogue.some(d => 
          d.includes(clean.substring(0, 20)) || clean.includes(d.substring(0, 20))
        )
        if (!found) {
          newDialogue.push(quoted)
        }
      }
    })

    return {
      characters: [...new Set(newCharacters)],
      locations: [...new Set(newLocations)],
      dialogue: [...new Set(newDialogue)],
    }
  }
}

export default SegmentValidation
