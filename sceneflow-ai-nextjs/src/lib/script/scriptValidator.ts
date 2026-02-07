/**
 * Script Import Validator
 * 
 * Pre-analyzes imported scripts to determine if they can be effectively parsed.
 * Provides detailed feedback and confidence scoring.
 */

export interface ValidationResult {
  isValid: boolean
  confidence: number // 0-100
  detectedFormat: 'fountain' | 'prose' | 'plain-text' | 'unknown'
  issues: ValidationIssue[]
  suggestions: string[]
  stats: ScriptStats
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info'
  code: string
  message: string
  line?: number
  suggestion?: string
}

export interface ScriptStats {
  totalLines: number
  sceneHeadings: number
  characterCues: number
  dialogueBlocks: number
  actionLines: number
  transitions: number
  parentheticals: number
  estimatedScenes: number
  detectedCharacters: string[]
}

// Validation thresholds
const THRESHOLDS = {
  ERROR: 30,      // Below this = cannot proceed
  WARNING: 60,    // Below this = proceed with confirmation
  GOOD: 80        // Above this = good quality script
}

// Regex patterns for screenplay elements
const PATTERNS = {
  // Scene headings: INT./EXT./INT/EXT./I/E.
  sceneHeading: /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|INT |EXT )\s*.+/i,
  // Character cue: ALL CAPS, possibly with (V.O.), (O.S.), (CONT'D)
  characterCue: /^([A-Z][A-Z0-9 .\-']{1,39})(\s*\([^)]+\))?$/,
  // Parenthetical: (text)
  parenthetical: /^\([^)]+\)$/,
  // Transition: CUT TO:, FADE OUT., DISSOLVE TO:, etc.
  transition: /^(CUT TO:|FADE OUT\.|FADE IN[.:]|DISSOLVE TO:|SMASH CUT TO:|MATCH CUT TO:|JUMP CUT TO:|TIME CUT:|IRIS OUT\.|IRIS IN\.|WIPE TO:)$/i,
  // Action line: starts with lowercase or mixed case, not dialogue
  actionLine: /^[A-Za-z].+/,
  // Title page elements
  titlePage: /^(Title:|Author:|Contact:|Draft:|Date:|Copyright:)/i
}

// Common non-character words that might be mistaken for character cues
const NON_CHARACTER_WORDS = new Set([
  'THE', 'AND', 'BUT', 'FOR', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR',
  'OUT', 'DAY', 'HAD', 'HOT', 'NEW', 'NOW', 'OLD', 'SEE', 'WAY', 'WHO', 'BOY', 'DID',
  'GET', 'HAS', 'HIM', 'HIS', 'HOW', 'MAN', 'MAY', 'SAY', 'SHE', 'TOO', 'USE', 'LATER',
  'CONTINUOUS', 'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'SAME', 'FLASHBACK', 'END'
])

/**
 * Validate an imported script and return detailed analysis
 */
export function validateScript(text: string): ValidationResult {
  const lines = text.split(/\r?\n/)
  const issues: ValidationIssue[] = []
  const suggestions: string[] = []
  
  // Initialize stats
  const stats: ScriptStats = {
    totalLines: lines.length,
    sceneHeadings: 0,
    characterCues: 0,
    dialogueBlocks: 0,
    actionLines: 0,
    transitions: 0,
    parentheticals: 0,
    estimatedScenes: 0,
    detectedCharacters: []
  }
  
  const characterSet = new Set<string>()
  let lastLineType: string = ''
  let consecutiveDialogue = 0
  let inTitlePage = true
  
  // Analyze each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const lineNum = i + 1
    
    // Skip empty lines
    if (!line) {
      lastLineType = 'empty'
      inTitlePage = false // Empty line typically ends title page
      continue
    }
    
    // Check for title page elements (at start of script)
    if (inTitlePage && PATTERNS.titlePage.test(line)) {
      lastLineType = 'title'
      continue
    }
    inTitlePage = false
    
    // Scene heading
    if (PATTERNS.sceneHeading.test(line)) {
      stats.sceneHeadings++
      lastLineType = 'scene-heading'
      continue
    }
    
    // Transition
    if (PATTERNS.transition.test(line)) {
      stats.transitions++
      lastLineType = 'transition'
      continue
    }
    
    // Parenthetical
    if (PATTERNS.parenthetical.test(line)) {
      stats.parentheticals++
      lastLineType = 'parenthetical'
      continue
    }
    
    // Character cue (must be followed by dialogue or parenthetical)
    const charMatch = line.match(PATTERNS.characterCue)
    if (charMatch && !NON_CHARACTER_WORDS.has(charMatch[1].trim())) {
      const charName = charMatch[1].trim()
      // Look ahead to verify this is followed by dialogue
      const nextNonEmpty = findNextNonEmptyLine(lines, i + 1)
      if (nextNonEmpty && !PATTERNS.sceneHeading.test(nextNonEmpty) && 
          !PATTERNS.characterCue.test(nextNonEmpty) && !PATTERNS.transition.test(nextNonEmpty)) {
        stats.characterCues++
        characterSet.add(normalizeCharacterName(charName))
        lastLineType = 'character'
        continue
      }
    }
    
    // Dialogue (after character cue or parenthetical)
    if (lastLineType === 'character' || lastLineType === 'parenthetical' || lastLineType === 'dialogue') {
      // Check if this looks like dialogue (not a scene heading or character)
      if (!PATTERNS.sceneHeading.test(line) && !PATTERNS.transition.test(line)) {
        stats.dialogueBlocks++
        lastLineType = 'dialogue'
        consecutiveDialogue++
        
        // Warn about excessively long dialogue
        if (consecutiveDialogue > 10) {
          issues.push({
            type: 'warning',
            code: 'LONG_DIALOGUE',
            message: `Very long dialogue block at line ${lineNum}`,
            line: lineNum,
            suggestion: 'Consider breaking into smaller exchanges with action beats'
          })
        }
        continue
      }
    }
    
    // Action line (default)
    stats.actionLines++
    lastLineType = 'action'
    consecutiveDialogue = 0
  }
  
  stats.estimatedScenes = stats.sceneHeadings || 1
  stats.detectedCharacters = Array.from(characterSet).sort()
  
  // Determine format
  const detectedFormat = detectFormat(stats, lines.length)
  
  // Generate issues and suggestions based on analysis
  generateIssues(stats, issues, suggestions, lines.length, detectedFormat)
  
  // Calculate confidence score
  const confidence = calculateConfidence(stats, issues, lines.length)
  
  // Determine if valid based on threshold
  const isValid = confidence >= THRESHOLDS.ERROR
  
  return {
    isValid,
    confidence,
    detectedFormat,
    issues,
    suggestions,
    stats
  }
}

/**
 * Find the next non-empty line
 */
function findNextNonEmptyLine(lines: string[], startIndex: number): string | null {
  for (let i = startIndex; i < Math.min(startIndex + 3, lines.length); i++) {
    const line = lines[i]?.trim()
    if (line) return line
  }
  return null
}

/**
 * Normalize character name for comparison
 */
function normalizeCharacterName(name: string): string {
  return name.replace(/\s*\([^)]+\)\s*$/, '').trim()
}

/**
 * Detect the script format based on stats
 */
function detectFormat(stats: ScriptStats, totalLines: number): ValidationResult['detectedFormat'] {
  // Calculate ratios
  const sceneRatio = stats.sceneHeadings / Math.max(totalLines, 1) * 100
  const dialogueRatio = stats.dialogueBlocks / Math.max(totalLines, 1) * 100
  const characterRatio = stats.characterCues / Math.max(totalLines, 1) * 100
  
  // Fountain format: has scene headings, character cues, and dialogue
  if (stats.sceneHeadings >= 1 && stats.characterCues >= 1 && stats.dialogueBlocks >= 1) {
    // Strong screenplay indicators
    if (sceneRatio > 1 && dialogueRatio > 10 && characterRatio > 3) {
      return 'fountain'
    }
    // Weak but present indicators
    return 'fountain'
  }
  
  // Prose: mostly action lines, few screenplay elements
  if (stats.actionLines > totalLines * 0.7 && stats.sceneHeadings < 2) {
    return 'prose'
  }
  
  // Plain text: minimal structure
  if (stats.sceneHeadings === 0 && stats.characterCues === 0) {
    return 'plain-text'
  }
  
  return 'unknown'
}

/**
 * Generate validation issues and suggestions
 */
function generateIssues(
  stats: ScriptStats, 
  issues: ValidationIssue[], 
  suggestions: string[],
  totalLines: number,
  format: ValidationResult['detectedFormat']
): void {
  // Critical: No scene headings
  if (stats.sceneHeadings === 0) {
    issues.push({
      type: 'error',
      code: 'NO_SCENE_HEADINGS',
      message: 'No scene headings (INT./EXT.) detected',
      suggestion: 'Add scene headings like "INT. COFFEE SHOP - DAY" to define scene locations'
    })
    suggestions.push('Add scene headings starting with INT. or EXT. to define locations and times')
  }
  
  // Critical: No identifiable dialogue
  if (stats.dialogueBlocks === 0 && stats.characterCues === 0) {
    issues.push({
      type: 'error',
      code: 'NO_DIALOGUE',
      message: 'No dialogue or character cues detected',
      suggestion: 'Format character names in ALL CAPS on their own line, followed by their dialogue'
    })
    suggestions.push('Format character names in ALL CAPS before their dialogue lines')
  }
  
  // Warning: Very few scene headings for the length
  if (stats.sceneHeadings > 0 && stats.sceneHeadings < totalLines / 100) {
    issues.push({
      type: 'warning',
      code: 'FEW_SCENE_HEADINGS',
      message: `Only ${stats.sceneHeadings} scene heading(s) for ${totalLines} lines`,
      suggestion: 'Most screenplays have a scene heading every 50-100 lines'
    })
  }
  
  // Warning: No detected characters
  if (stats.detectedCharacters.length === 0 && stats.sceneHeadings > 0) {
    issues.push({
      type: 'warning',
      code: 'NO_CHARACTERS',
      message: 'No character names detected',
      suggestion: 'Ensure character names are in ALL CAPS before their dialogue'
    })
  }
  
  // Warning: Prose-heavy (might be a treatment, not a script)
  if (format === 'prose') {
    issues.push({
      type: 'warning',
      code: 'PROSE_FORMAT',
      message: 'Content appears to be prose or treatment rather than screenplay format',
      suggestion: 'Convert to screenplay format with scene headings, character cues, and dialogue'
    })
    suggestions.push('This looks like prose - consider reformatting as a screenplay')
  }
  
  // Info: Few transitions (not critical but noted)
  if (stats.sceneHeadings > 5 && stats.transitions === 0) {
    issues.push({
      type: 'info',
      code: 'NO_TRANSITIONS',
      message: 'No transitions detected (CUT TO:, FADE OUT, etc.)',
      suggestion: 'Transitions are optional but can help with pacing'
    })
  }
  
  // Info: Script seems short
  if (totalLines < 50 && stats.sceneHeadings > 0) {
    issues.push({
      type: 'info',
      code: 'SHORT_SCRIPT',
      message: 'Script appears to be very short',
      suggestion: 'This may be a script excerpt or short film'
    })
  }
  
  // Add format-specific suggestions
  if (format === 'fountain') {
    if (stats.sceneHeadings >= 3 && stats.characterCues >= 2) {
      suggestions.push('Script format looks good! Characters and scenes detected.')
    }
  }
}

/**
 * Calculate confidence score (0-100)
 */
function calculateConfidence(stats: ScriptStats, issues: ValidationIssue[], totalLines: number): number {
  let score = 100
  
  // Deductions for missing elements
  if (stats.sceneHeadings === 0) score -= 40
  else if (stats.sceneHeadings < 2) score -= 15
  
  if (stats.characterCues === 0) score -= 30
  else if (stats.characterCues < 2) score -= 10
  
  if (stats.dialogueBlocks === 0) score -= 25
  else if (stats.dialogueBlocks < 5) score -= 5
  
  // Deductions for issues
  const errorCount = issues.filter(i => i.type === 'error').length
  const warningCount = issues.filter(i => i.type === 'warning').length
  
  score -= errorCount * 15
  score -= warningCount * 5
  
  // Bonus for good structure
  const dialogueToAction = stats.dialogueBlocks / Math.max(stats.actionLines, 1)
  if (dialogueToAction > 0.3 && dialogueToAction < 3) {
    score += 5 // Good balance
  }
  
  if (stats.detectedCharacters.length >= 2) {
    score += 5 // Multiple characters
  }
  
  if (stats.parentheticals > 0) {
    score += 3 // Uses parentheticals
  }
  
  return Math.max(0, Math.min(100, score))
}

/**
 * Get the validation status label
 */
export function getValidationStatus(confidence: number): 'error' | 'warning' | 'success' {
  if (confidence < THRESHOLDS.ERROR) return 'error'
  if (confidence < THRESHOLDS.WARNING) return 'warning'
  return 'success'
}

/**
 * Sample screenplay format for reference
 */
export const SAMPLE_SCREENPLAY_FORMAT = `Title: My Script Title
Author: Your Name
Draft: First Draft

INT. COFFEE SHOP - DAY

A busy morning. CUSTOMERS line up at the counter.

SARAH (30s, determined) enters, scanning the room.

SARAH
(nervous)
Is this seat taken?

MARCUS looks up from his laptop.

MARCUS
It's all yours.

She sits down. An awkward silence.

SARAH
I'm Sarah. I think we matched online?

MARCUS
(surprised)
Oh! Right. Marcus. Sorry, I didn't expect...

SARAH
Someone who looks like their photos?

They both laugh, tension broken.

EXT. CITY STREET - NIGHT

Rain falls on empty sidewalks. Sarah and Marcus walk under a shared umbrella.

MARCUS (V.O.)
That was the moment I knew.

CUT TO:

INT. SARAH'S APARTMENT - NIGHT

Sarah enters, smiling. She tosses her keys on the counter.

FADE OUT.

THE END`

/**
 * Get validation thresholds for UI display
 */
export function getValidationThresholds() {
  return THRESHOLDS
}
