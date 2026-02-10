/**
 * Script Quality Assurance Utilities
 * 
 * Post-processing validation and consistency checks for generated scripts
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

import { toCanonicalName, generateAliases } from '@/lib/character/canonical'

export interface QAIssue {
  type: 'error' | 'warning' | 'info'
  category: 'character' | 'dialogue' | 'continuity' | 'formatting'
  sceneIndex?: number
  dialogueIndex?: number
  message: string
  suggestion?: string
  autoFixable?: boolean
}

export interface QAResult {
  valid: boolean
  issues: QAIssue[]
  stats: {
    totalScenes: number
    totalDialogue: number
    charactersFound: string[]
    unmatchedCharacters: string[]
    missingEmotionTags: number
    averageSceneDuration: number
  }
}

interface Character {
  name: string
  id?: string
  aliases?: string[]
}

interface DialogueLine {
  character: string
  line?: string
  text?: string
  characterId?: string
}

interface Scene {
  sceneNumber?: number
  heading?: string
  action?: string
  narration?: string
  dialogue?: DialogueLine[]
  characters?: string[]
  duration?: number
  imageUrl?: string
}

/**
 * Run full quality assurance on a script
 */
export function runScriptQA(
  scenes: Scene[],
  approvedCharacters: Character[]
): QAResult {
  const issues: QAIssue[] = []
  const charactersFound = new Set<string>()
  const unmatchedCharacters = new Set<string>()
  let totalDialogue = 0
  let missingEmotionTags = 0
  let totalDuration = 0

  // Build character lookup with aliases
  const characterMap = new Map<string, Character>()
  for (const char of approvedCharacters) {
    const canonical = toCanonicalName(char.name)
    characterMap.set(canonical.toLowerCase(), char)
    
    // Add aliases
    const aliases = char.aliases || generateAliases(canonical)
    for (const alias of aliases) {
      characterMap.set(alias.toLowerCase(), char)
    }
  }

  for (let sceneIdx = 0; sceneIdx < scenes.length; sceneIdx++) {
    const scene = scenes[sceneIdx]
    const sceneNum = scene.sceneNumber || sceneIdx + 1

    // Check scene has required fields
    if (!scene.heading) {
      issues.push({
        type: 'warning',
        category: 'formatting',
        sceneIndex: sceneIdx,
        message: `Scene ${sceneNum} is missing a heading/slugline`,
        suggestion: 'Add a heading like "INT. LOCATION - TIME"',
        autoFixable: false
      })
    }

    if (!scene.narration && !scene.action) {
      issues.push({
        type: 'warning',
        category: 'formatting',
        sceneIndex: sceneIdx,
        message: `Scene ${sceneNum} has no narration or action description`,
        suggestion: 'Add descriptive content to the scene',
        autoFixable: false
      })
    }

    // Track duration
    if (scene.duration) {
      totalDuration += scene.duration
    }

    // Validate dialogue
    if (scene.dialogue && Array.isArray(scene.dialogue)) {
      for (let dlgIdx = 0; dlgIdx < scene.dialogue.length; dlgIdx++) {
        const dlg = scene.dialogue[dlgIdx]
        const dialogueText = dlg.line || dlg.text || ''
        totalDialogue++

        // Character name consistency check
        if (dlg.character) {
          const normalizedName = dlg.character.toLowerCase().trim()
          charactersFound.add(dlg.character)

          if (!characterMap.has(normalizedName)) {
            // Check if it's a close match
            const closeMatch = findCloseMatch(dlg.character, approvedCharacters)
            if (closeMatch) {
              issues.push({
                type: 'warning',
                category: 'character',
                sceneIndex: sceneIdx,
                dialogueIndex: dlgIdx,
                message: `Character "${dlg.character}" may be a variation of "${closeMatch.name}"`,
                suggestion: `Use the approved name: "${closeMatch.name}"`,
                autoFixable: true
              })
            } else {
              unmatchedCharacters.add(dlg.character)
              issues.push({
                type: 'error',
                category: 'character',
                sceneIndex: sceneIdx,
                dialogueIndex: dlgIdx,
                message: `Unknown character "${dlg.character}" not in approved character list`,
                suggestion: 'Add this character to the character list or use an approved character name',
                autoFixable: false
              })
            }
          }
        } else {
          issues.push({
            type: 'error',
            category: 'dialogue',
            sceneIndex: sceneIdx,
            dialogueIndex: dlgIdx,
            message: `Dialogue line ${dlgIdx + 1} in Scene ${sceneNum} has no character attribution`,
            autoFixable: false
          })
        }

        // Emotion tag validation
        if (dialogueText && !hasEmotionTag(dialogueText)) {
          missingEmotionTags++
          issues.push({
            type: 'warning',
            category: 'dialogue',
            sceneIndex: sceneIdx,
            dialogueIndex: dlgIdx,
            message: `Dialogue in Scene ${sceneNum} missing emotion tag: "${dialogueText.substring(0, 50)}..."`,
            suggestion: 'Add emotion tag like [happy], [sad], [neutral] at the start',
            autoFixable: true
          })
        }
      }
    }

    // Scene continuity checks
    if (sceneIdx > 0) {
      const prevScene = scenes[sceneIdx - 1]
      
      // Check for abrupt location changes without transition
      const currentLocation = extractLocation(scene.heading)
      const prevLocation = extractLocation(prevScene.heading)
      
      if (currentLocation && prevLocation && 
          currentLocation !== prevLocation &&
          !hasTransitionIndicator(scene.action)) {
        issues.push({
          type: 'info',
          category: 'continuity',
          sceneIndex: sceneIdx,
          message: `Scene ${sceneNum} changes location from "${prevLocation}" to "${currentLocation}" - consider adding a transition`,
          suggestion: 'Add a transitional phrase or establish the new location clearly',
          autoFixable: false
        })
      }
    }
  }

  // Calculate stats
  const averageSceneDuration = scenes.length > 0 ? totalDuration / scenes.length : 0

  return {
    valid: issues.filter(i => i.type === 'error').length === 0,
    issues,
    stats: {
      totalScenes: scenes.length,
      totalDialogue,
      charactersFound: Array.from(charactersFound),
      unmatchedCharacters: Array.from(unmatchedCharacters),
      missingEmotionTags,
      averageSceneDuration
    }
  }
}

/**
 * Check if dialogue has an emotion tag
 */
function hasEmotionTag(text: string): boolean {
  // Matches [word] or [word, word] patterns at the start
  return /^\s*\[[^\]]+\]/.test(text)
}

/**
 * Find a close match for a character name
 * Enhanced to detect common AI generation variations:
 * - ALL CAPS versions ("BEN" → "Ben")
 * - Title variations ("Doctor" → "Dr.")
 * - Partial names ("Ben" → "Dr. Ben Anderson")
 * - Case mismatches
 */
function findCloseMatch(name: string, characters: Character[]): Character | null {
  const normalizedInput = toCanonicalName(name).toLowerCase().trim()
  const inputUpper = name.toUpperCase().trim()
  
  for (const char of characters) {
    const canonicalName = toCanonicalName(char.name)
    const canonicalLower = canonicalName.toLowerCase()
    const canonicalUpper = canonicalName.toUpperCase()
    
    // Direct match after normalization
    if (canonicalLower === normalizedInput) {
      return char
    }
    
    // ALL CAPS match (common AI error: "BEN" should match "Ben")
    if (canonicalUpper === inputUpper) {
      return char
    }
    
    // Check if input is a partial match (first name, last name, etc.)
    const nameParts = canonicalLower.split(/\s+/)
    if (nameParts.some(part => part === normalizedInput)) {
      return char
    }
    
    // Check if input matches any part in uppercase
    if (nameParts.some(part => part.toUpperCase() === inputUpper)) {
      return char
    }
    
    // Check if input is contained in the full name or vice versa
    if (canonicalLower.includes(normalizedInput) || normalizedInput.includes(canonicalLower)) {
      return char
    }
    
    // Check aliases (now includes ALL CAPS variants)
    const aliases = char.aliases || generateAliases(char.name)
    if (aliases.some(alias => 
      alias.toLowerCase() === normalizedInput || 
      alias.toUpperCase() === inputUpper
    )) {
      return char
    }
  }
  
  return null
}

/**
 * Extract location from scene heading
 */
function extractLocation(heading?: string): string | null {
  if (!heading) return null
  
  // Match pattern: INT./EXT. LOCATION - TIME
  const match = heading.match(/(?:INT\.|EXT\.)\s+([^-]+)/i)
  return match ? match[1].trim().toLowerCase() : null
}

/**
 * Check if scene action has transition indicator
 */
function hasTransitionIndicator(action?: string): boolean {
  if (!action) return false
  
  const transitionWords = [
    'cut to', 'fade', 'dissolve', 'meanwhile', 'later',
    'arrives', 'enters', 'walking into', 'steps into',
    'transition', 'moves to', 'travels to'
  ]
  
  const lowerAction = action.toLowerCase()
  return transitionWords.some(word => lowerAction.includes(word))
}

/**
 * Auto-fix common issues where possible
 */
export function autoFixScript(
  scenes: Scene[],
  approvedCharacters: Character[],
  qaResult: QAResult
): { scenes: Scene[]; fixedCount: number } {
  let fixedCount = 0
  const fixedScenes = JSON.parse(JSON.stringify(scenes)) as Scene[]

  // Build character lookup
  const characterMap = new Map<string, Character>()
  for (const char of approvedCharacters) {
    const canonical = toCanonicalName(char.name)
    characterMap.set(canonical.toLowerCase(), char)
    const aliases = char.aliases || generateAliases(canonical)
    for (const alias of aliases) {
      characterMap.set(alias.toLowerCase(), char)
    }
  }

  for (const issue of qaResult.issues) {
    if (!issue.autoFixable) continue

    if (issue.category === 'character' && issue.sceneIndex !== undefined && issue.dialogueIndex !== undefined) {
      const scene = fixedScenes[issue.sceneIndex]
      if (scene?.dialogue?.[issue.dialogueIndex]) {
        const dlg = scene.dialogue[issue.dialogueIndex]
        const closeMatch = findCloseMatch(dlg.character, approvedCharacters)
        if (closeMatch) {
          dlg.character = closeMatch.name
          if (closeMatch.id) dlg.characterId = closeMatch.id
          fixedCount++
        }
      }
    }

    if (issue.category === 'dialogue' && issue.message.includes('missing emotion tag')) {
      if (issue.sceneIndex !== undefined && issue.dialogueIndex !== undefined) {
        const scene = fixedScenes[issue.sceneIndex]
        if (scene?.dialogue?.[issue.dialogueIndex]) {
          const dlg = scene.dialogue[issue.dialogueIndex]
          const text = dlg.line || dlg.text || ''
          if (text && !hasEmotionTag(text)) {
            // Add neutral tag as default
            if (dlg.line) {
              dlg.line = `[neutral] ${text}`
            } else if (dlg.text) {
              dlg.text = `[neutral] ${text}`
            }
            fixedCount++
          }
        }
      }
    }
  }

  return { scenes: fixedScenes, fixedCount }
}

/**
 * Generate a quality report summary
 */
export function generateQAReport(qaResult: QAResult): string {
  const { valid, issues, stats } = qaResult
  
  const errorCount = issues.filter(i => i.type === 'error').length
  const warningCount = issues.filter(i => i.type === 'warning').length
  const infoCount = issues.filter(i => i.type === 'info').length
  
  const lines = [
    '=== Script Quality Report ===',
    '',
    `Status: ${valid ? '✅ PASSED' : '❌ ISSUES FOUND'}`,
    '',
    '--- Statistics ---',
    `Total Scenes: ${stats.totalScenes}`,
    `Total Dialogue Lines: ${stats.totalDialogue}`,
    `Average Scene Duration: ${stats.averageSceneDuration.toFixed(1)}s`,
    `Characters Found: ${stats.charactersFound.length}`,
    `Missing Emotion Tags: ${stats.missingEmotionTags}`,
    '',
    '--- Issues Summary ---',
    `Errors: ${errorCount}`,
    `Warnings: ${warningCount}`,
    `Info: ${infoCount}`,
  ]
  
  if (stats.unmatchedCharacters.length > 0) {
    lines.push('', '--- Unmatched Characters ---')
    for (const char of stats.unmatchedCharacters) {
      lines.push(`  • ${char}`)
    }
  }
  
  if (issues.length > 0) {
    lines.push('', '--- Detailed Issues ---')
    for (const issue of issues.slice(0, 20)) { // Limit to first 20
      const location = issue.sceneIndex !== undefined 
        ? `Scene ${issue.sceneIndex + 1}${issue.dialogueIndex !== undefined ? `, Line ${issue.dialogueIndex + 1}` : ''}`
        : 'Global'
      lines.push(`  [${issue.type.toUpperCase()}] ${location}: ${issue.message}`)
    }
    if (issues.length > 20) {
      lines.push(`  ... and ${issues.length - 20} more issues`)
    }
  }
  
  return lines.join('\n')
}
