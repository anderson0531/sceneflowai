/**
 * Script Import Parser
 * 
 * Parses validated screenplay text into structured scene data for the project database.
 * Supports Fountain format and attempts to parse prose/plain-text with AI assistance.
 */

import { ValidationResult } from './scriptValidator'

export interface ParsedScript {
  title: string
  scenes: ParsedScene[]
  characters: ParsedCharacter[]
  metadata: {
    author?: string
    draft?: string
    date?: string
    format: string
    totalDuration: number
    importedAt: string
  }
}

export interface ParsedScene {
  id: string
  sceneNumber: number
  heading: string
  location: string
  timeOfDay: string
  interior: boolean
  action: string
  dialogue: DialogueBlock[]
  characters: string[]
  duration: number // Estimated in seconds
  transitions?: {
    in?: string
    out?: string
  }
}

export interface DialogueBlock {
  character: string
  parenthetical?: string
  text: string
  extension?: string // V.O., O.S., CONT'D
}

export interface ParsedCharacter {
  name: string
  appearances: number
  firstAppearance: number // Scene number
  dialogueCount: number
  description?: string
}

// Scene heading patterns
const SCENE_HEADING_REGEX = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s*(.+?)(?:\s*-\s*(.+))?$/i
const CHARACTER_CUE_REGEX = /^([A-Z][A-Z0-9 .\-']{1,39})(?:\s*\(([^)]+)\))?$/
const TRANSITION_REGEX = /^(CUT TO:|FADE OUT\.|FADE IN[.:]|DISSOLVE TO:|SMASH CUT TO:|MATCH CUT TO:|JUMP CUT TO:|TIME CUT:|IRIS OUT\.|IRIS IN\.|WIPE TO:)$/i
const PARENTHETICAL_REGEX = /^\(([^)]+)\)$/
const TITLE_PAGE_REGEX = /^(Title|Author|Contact|Draft|Date|Copyright):\s*(.+)$/i

// Character extensions
const EXTENSIONS = ['V.O.', 'O.S.', 'O.C.', 'CONT\'D', 'CONTINUED', 'PRE-LAP', 'FILTER']

// Duration estimation constants (in seconds)
const DURATION = {
  ACTION_LINE_PER_WORD: 0.5,    // ~2 words per second of screen time
  DIALOGUE_PER_WORD: 0.4,       // Dialogue is slightly faster
  SCENE_MIN: 10,                // Minimum scene duration
  SCENE_MAX: 180,               // Cap at 3 minutes per scene for shorts
  TRANSITION: 1                  // Transitions add ~1 second
}

/**
 * Parse screenplay text into structured data
 */
export function parseScript(text: string, validation?: ValidationResult): ParsedScript {
  const lines = text.split(/\r?\n/)
  const scenes: ParsedScene[] = []
  const characterStats = new Map<string, { appearances: Set<number>, dialogueCount: number, firstScene: number }>()
  
  // Parse title page
  const titlePageData = parseTitlePage(lines)
  
  // Parse scenes
  let currentScene: Partial<ParsedScene> | null = null
  let currentDialogue: Partial<DialogueBlock> | null = null
  let lastLineType = ''
  let sceneNumber = 0
  let pendingTransition: string | null = null
  
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()
    
    // Skip empty lines (but they end dialogue blocks)
    if (!line) {
      if (currentDialogue && currentDialogue.character) {
        finalizeDialogue(currentScene, currentDialogue as DialogueBlock)
        currentDialogue = null
      }
      lastLineType = 'empty'
      continue
    }
    
    // Skip title page elements
    if (TITLE_PAGE_REGEX.test(line)) {
      continue
    }
    
    // Check for scene heading
    const sceneMatch = line.match(SCENE_HEADING_REGEX)
    if (sceneMatch) {
      // Finalize previous scene
      if (currentScene && currentScene.heading) {
        if (currentDialogue?.character) {
          finalizeDialogue(currentScene, currentDialogue as DialogueBlock)
        }
        currentScene.duration = estimateSceneDuration(currentScene as ParsedScene)
        if (pendingTransition) {
          currentScene.transitions = { ...currentScene.transitions, in: pendingTransition }
          pendingTransition = null
        }
        scenes.push(currentScene as ParsedScene)
      }
      
      // Start new scene
      sceneNumber++
      const [, prefix, location, timeOfDay] = sceneMatch
      const isInterior = prefix.toUpperCase().startsWith('INT')
      
      currentScene = {
        id: `scene-${sceneNumber}`,
        sceneNumber,
        heading: line,
        location: (location || '').trim(),
        timeOfDay: (timeOfDay || 'DAY').trim().toUpperCase(),
        interior: isInterior,
        action: '',
        dialogue: [],
        characters: []
      }
      currentDialogue = null
      lastLineType = 'scene-heading'
      continue
    }
    
    // Check for transition
    if (TRANSITION_REGEX.test(line)) {
      if (currentScene) {
        currentScene.transitions = { ...currentScene.transitions, out: line }
      } else {
        pendingTransition = line
      }
      lastLineType = 'transition'
      continue
    }
    
    // If no current scene, create an implicit one
    if (!currentScene) {
      sceneNumber++
      currentScene = {
        id: `scene-${sceneNumber}`,
        sceneNumber,
        heading: 'INT. UNKNOWN LOCATION - DAY',
        location: 'UNKNOWN LOCATION',
        timeOfDay: 'DAY',
        interior: true,
        action: '',
        dialogue: [],
        characters: []
      }
    }
    
    // Check for character cue
    const charMatch = line.match(CHARACTER_CUE_REGEX)
    if (charMatch && isLikelyCharacterCue(line, lines, i)) {
      // Finalize any pending dialogue
      if (currentDialogue?.character) {
        finalizeDialogue(currentScene, currentDialogue as DialogueBlock)
      }
      
      const charName = charMatch[1].trim()
      const extension = charMatch[2]?.trim()
      
      // Track character
      const normalizedName = normalizeCharacterName(charName)
      if (!characterStats.has(normalizedName)) {
        characterStats.set(normalizedName, { 
          appearances: new Set(), 
          dialogueCount: 0, 
          firstScene: sceneNumber 
        })
      }
      const stats = characterStats.get(normalizedName)!
      stats.appearances.add(sceneNumber)
      stats.dialogueCount++
      
      // Add to scene characters
      if (!currentScene.characters!.includes(normalizedName)) {
        currentScene.characters!.push(normalizedName)
      }
      
      currentDialogue = {
        character: normalizedName,
        extension: extension || undefined,
        text: ''
      }
      lastLineType = 'character'
      continue
    }
    
    // Check for parenthetical
    const parenMatch = line.match(PARENTHETICAL_REGEX)
    if (parenMatch && (lastLineType === 'character' || lastLineType === 'dialogue')) {
      if (currentDialogue) {
        if (!currentDialogue.text) {
          // Parenthetical before dialogue
          currentDialogue.parenthetical = parenMatch[1]
        } else {
          // Mid-dialogue parenthetical - treat as new block
          finalizeDialogue(currentScene, currentDialogue as DialogueBlock)
          currentDialogue = {
            character: currentDialogue.character,
            parenthetical: parenMatch[1],
            text: ''
          }
        }
      }
      lastLineType = 'parenthetical'
      continue
    }
    
    // Dialogue (after character or parenthetical)
    if (currentDialogue && (lastLineType === 'character' || lastLineType === 'parenthetical' || lastLineType === 'dialogue')) {
      currentDialogue.text = currentDialogue.text 
        ? `${currentDialogue.text} ${line}` 
        : line
      lastLineType = 'dialogue'
      continue
    }
    
    // Action line (default)
    if (currentDialogue?.character) {
      finalizeDialogue(currentScene, currentDialogue as DialogueBlock)
      currentDialogue = null
    }
    
    currentScene.action = currentScene.action 
      ? `${currentScene.action}\n${line}` 
      : line
    lastLineType = 'action'
  }
  
  // Finalize last scene
  if (currentScene && currentScene.heading) {
    if (currentDialogue?.character) {
      finalizeDialogue(currentScene, currentDialogue as DialogueBlock)
    }
    currentScene.duration = estimateSceneDuration(currentScene as ParsedScene)
    scenes.push(currentScene as ParsedScene)
  }
  
  // Build character list
  const characters: ParsedCharacter[] = Array.from(characterStats.entries())
    .map(([name, stats]) => ({
      name,
      appearances: stats.appearances.size,
      firstAppearance: stats.firstScene,
      dialogueCount: stats.dialogueCount
    }))
    .sort((a, b) => b.dialogueCount - a.dialogueCount)
  
  // Calculate total duration
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0)
  
  return {
    title: titlePageData.title || extractTitleFromContent(text) || 'Untitled Script',
    scenes,
    characters,
    metadata: {
      author: titlePageData.author,
      draft: titlePageData.draft,
      date: titlePageData.date,
      format: validation?.detectedFormat || 'fountain',
      totalDuration,
      importedAt: new Date().toISOString()
    }
  }
}

/**
 * Parse title page data
 */
function parseTitlePage(lines: string[]): { title?: string; author?: string; draft?: string; date?: string } {
  const data: any = {}
  
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i].trim()
    const match = line.match(TITLE_PAGE_REGEX)
    if (match) {
      const [, key, value] = match
      const keyLower = key.toLowerCase()
      if (keyLower === 'title') data.title = value.trim()
      else if (keyLower === 'author') data.author = value.trim()
      else if (keyLower === 'draft') data.draft = value.trim()
      else if (keyLower === 'date') data.date = value.trim()
    }
    
    // Stop if we hit a scene heading
    if (SCENE_HEADING_REGEX.test(line)) break
  }
  
  return data
}

/**
 * Extract title from first significant content if no title page
 */
function extractTitleFromContent(text: string): string | null {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  
  // Look for centered title-like text in first 10 lines
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i]
    // Skip scene headings
    if (SCENE_HEADING_REGEX.test(line)) continue
    // If it's a short, possibly title-like line
    if (line.length > 2 && line.length < 60 && !/^(INT\.|EXT\.|FADE|CUT)/i.test(line)) {
      return line
    }
  }
  
  return null
}

/**
 * Check if a line is likely a character cue (not just ALL CAPS text)
 */
function isLikelyCharacterCue(line: string, lines: string[], index: number): boolean {
  // Must be ALL CAPS or have character extension
  if (!/^[A-Z][A-Z0-9 .\-']+(\s*\([^)]+\))?$/.test(line)) return false
  
  // Common non-character words
  const nonCharWords = ['THE', 'AND', 'BUT', 'FOR', 'NOT', 'LATER', 'CONTINUOUS', 
    'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'SAME', 'FLASHBACK', 'END', 'TITLE',
    'SUPER', 'CHYRON', 'MONTAGE', 'SERIES OF SHOTS', 'INTERCUT', 'BACK TO']
  
  const baseName = line.replace(/\s*\([^)]+\)$/, '').trim()
  if (nonCharWords.includes(baseName)) return false
  
  // Check if followed by dialogue (non-empty, non-heading, non-character line)
  for (let i = index + 1; i < Math.min(index + 3, lines.length); i++) {
    const nextLine = lines[i]?.trim()
    if (!nextLine) continue
    
    // If next non-empty line is a scene heading, transition, or another char cue, this isn't a char cue
    if (SCENE_HEADING_REGEX.test(nextLine)) return false
    if (TRANSITION_REGEX.test(nextLine)) return false
    
    // If it's a parenthetical or regular text, this is likely a character cue
    if (PARENTHETICAL_REGEX.test(nextLine)) return true
    if (!/^[A-Z][A-Z0-9 .\-']+$/.test(nextLine)) return true
    
    // If it matches character pattern, could be dual dialogue or misdetection
    return true
  }
  
  return false
}

/**
 * Normalize character name (remove extensions, trim)
 */
function normalizeCharacterName(name: string): string {
  return name.replace(/\s*\([^)]+\)\s*$/, '').trim()
}

/**
 * Finalize dialogue block and add to scene
 */
function finalizeDialogue(scene: Partial<ParsedScene> | null, dialogue: DialogueBlock): void {
  if (!scene || !dialogue.character || !dialogue.text?.trim()) return
  
  if (!scene.dialogue) scene.dialogue = []
  scene.dialogue.push({
    character: dialogue.character,
    parenthetical: dialogue.parenthetical,
    text: dialogue.text.trim(),
    extension: dialogue.extension
  })
}

/**
 * Estimate scene duration based on content
 */
function estimateSceneDuration(scene: ParsedScene): number {
  let duration = 0
  
  // Action/description duration
  if (scene.action) {
    const actionWords = scene.action.split(/\s+/).length
    duration += actionWords * DURATION.ACTION_LINE_PER_WORD
  }
  
  // Dialogue duration
  for (const d of scene.dialogue || []) {
    const dialogueWords = d.text.split(/\s+/).length
    duration += dialogueWords * DURATION.DIALOGUE_PER_WORD
    
    // Parentheticals add a beat
    if (d.parenthetical) duration += 0.5
  }
  
  // Transitions
  if (scene.transitions?.in || scene.transitions?.out) {
    duration += DURATION.TRANSITION
  }
  
  // Apply min/max bounds
  return Math.round(Math.max(DURATION.SCENE_MIN, Math.min(DURATION.SCENE_MAX, duration)))
}

/**
 * Convert parsed script to vision phase format for project creation
 */
export function toVisionPhaseFormat(parsed: ParsedScript): {
  script: any
  characters: any[]
  scenes: any[]
} {
  return {
    script: {
      title: parsed.title,
      scenes: parsed.scenes.map(s => ({
        sceneNumber: s.sceneNumber,
        heading: s.heading,
        action: s.action,
        narration: '', // Will be generated
        dialogue: s.dialogue.map(d => ({
          character: d.character,
          parenthetical: d.parenthetical || null,
          line: d.text,
          extension: d.extension || null
        })),
        characters: s.characters,
        duration: s.duration,
        visualNotes: `Location: ${s.location}. Time: ${s.timeOfDay}. ${s.interior ? 'Interior' : 'Exterior'} setting.`,
        audioNotes: s.dialogue.length > 0 
          ? `${s.dialogue.length} dialogue exchange(s)` 
          : 'Scene with action/visuals, no dialogue'
      }))
    },
    characters: parsed.characters.map(c => ({
      name: c.name,
      role: c.dialogueCount > 3 ? 'lead' : 'supporting',
      description: '', // Can be filled in later
      appearances: c.appearances,
      firstAppearance: c.firstAppearance,
      dialogueCount: c.dialogueCount,
      // These can be edited in character library
      age: null,
      ethnicity: null,
      gender: null,
      voiceId: null
    })),
    scenes: parsed.scenes.map(s => ({
      id: s.id,
      sceneNumber: s.sceneNumber,
      title: s.heading,
      description: s.action || s.dialogue.map(d => `${d.character}: ${d.text}`).join('\n'),
      duration: s.duration,
      location: s.location,
      timeOfDay: s.timeOfDay,
      interior: s.interior,
      characters: s.characters
    }))
  }
}

/**
 * Convert parsed script to treatment variant format for blueprint flow
 */
export function toTreatmentVariant(parsed: ParsedScript): {
  id: string
  label: string
  title: string
  content: string
  synopsis: string
  character_descriptions: any[]
} {
  // Generate synopsis from scene actions
  const synopsis = parsed.scenes
    .map(s => s.action || s.dialogue.map(d => `${d.character} speaks`).join('. '))
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 2000)
  
  return {
    id: `imported-${Date.now()}`,
    label: 'Imported Script',
    title: parsed.title,
    content: synopsis,
    synopsis,
    character_descriptions: parsed.characters.map(c => ({
      name: c.name,
      role: c.dialogueCount > 3 ? 'lead' : 'supporting',
      description: `Appears in ${c.appearances} scene(s), ${c.dialogueCount} dialogue line(s)`
    }))
  }
}
