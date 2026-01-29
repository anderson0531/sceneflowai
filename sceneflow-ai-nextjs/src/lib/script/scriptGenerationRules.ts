/**
 * Script Generation Rules
 * 
 * Implements scene consolidation, narration reduction, character state tracking,
 * and anti-repetition constraints to create tighter, more cinematic scripts.
 * 
 * These rules apply to both new script generation and script editing (regeneration).
 */

// ============================================================================
// Configuration Types
// ============================================================================

export type NarrationMode = 'minimal' | 'moderate' | 'narrative-driven'
export type RepetitionTolerance = 'strict' | 'normal' | 'permissive'

export interface ScriptSettings {
  /** 
   * How many story beats should consolidate into one scene.
   * Lower = more scenes, higher = fewer, denser scenes.
   * Range: 3-8, Default: 5
   */
  beatToSceneRatio: number
  
  /**
   * Controls how much voiceover/narration is allowed.
   * - 'minimal': Opening hook + final resolution only (recommended for drama/thriller)
   * - 'moderate': Key transitions allowed
   * - 'narrative-driven': Full narration (documentary, essay films)
   */
  narrationMode: NarrationMode
  
  /**
   * How strictly to penalize repetitive content.
   * - 'strict': Heavy penalties, aggressive deduplication
   * - 'normal': Balanced approach (default)
   * - 'permissive': Light penalties, allows thematic repetition
   */
  repetitionTolerance: RepetitionTolerance
  
  /**
   * Maximum scenes per act to prevent bloat.
   * Range: 8-20, Default: 12
   */
  maxScenesPerAct: number
  
  /**
   * Whether to enforce character knowledge state progression.
   * When true, characters cannot "discover" the same information twice.
   */
  enforceStateProgression: boolean
  
  /**
   * Target total scene count for the entire script.
   * Varies by format: short (15-25), feature (40-60), series episode (25-40)
   */
  targetSceneCount?: number
}

// ============================================================================
// Default Settings by Project Type
// ============================================================================

export const DEFAULT_SCRIPT_SETTINGS: ScriptSettings = {
  beatToSceneRatio: 5,
  narrationMode: 'minimal',
  repetitionTolerance: 'normal',
  maxScenesPerAct: 12,
  enforceStateProgression: true,
  targetSceneCount: 50
}

export const SCRIPT_SETTINGS_BY_FORMAT: Record<string, Partial<ScriptSettings>> = {
  'short-film': {
    beatToSceneRatio: 3,
    maxScenesPerAct: 8,
    targetSceneCount: 20
  },
  'feature': {
    beatToSceneRatio: 5,
    maxScenesPerAct: 15,
    targetSceneCount: 50
  },
  'tv-episode': {
    beatToSceneRatio: 4,
    maxScenesPerAct: 10,
    targetSceneCount: 35
  },
  'documentary': {
    beatToSceneRatio: 6,
    narrationMode: 'narrative-driven',
    maxScenesPerAct: 12,
    targetSceneCount: 40
  },
  'music-video': {
    beatToSceneRatio: 2,
    narrationMode: 'minimal',
    maxScenesPerAct: 6,
    targetSceneCount: 15
  }
}

export function getSettingsForFormat(format: string): ScriptSettings {
  return {
    ...DEFAULT_SCRIPT_SETTINGS,
    ...SCRIPT_SETTINGS_BY_FORMAT[format]
  }
}

// ============================================================================
// Character State Tracking
// ============================================================================

export interface CharacterKnowledge {
  characterName: string
  knownFacts: Set<string>          // Facts the character has learned
  actionsTaken: Map<string, number> // Action type -> count
  emotionalState: string           // Current emotional arc position
  lastSceneAppeared: number
}

export interface ActionConstraint {
  actionType: string
  maxOccurrences: number
  description: string
}

// Default action constraints to prevent repetitive loops
export const DEFAULT_ACTION_CONSTRAINTS: ActionConstraint[] = [
  { actionType: 'physical_ejection', maxOccurrences: 1, description: 'Character forcibly removed from location' },
  { actionType: 'discovery_same_info', maxOccurrences: 1, description: 'Discovering the same piece of information' },
  { actionType: 'phone_warning_ignored', maxOccurrences: 2, description: 'Warning call that gets dismissed' },
  { actionType: 'confrontation_same_argument', maxOccurrences: 2, description: 'Making the same argument to the same person' },
  { actionType: 'suspicious_without_action', maxOccurrences: 3, description: 'Being suspicious without taking concrete action' }
]

export class CharacterStateTracker {
  private characters: Map<string, CharacterKnowledge> = new Map()
  private actionConstraints: ActionConstraint[]
  
  constructor(constraints: ActionConstraint[] = DEFAULT_ACTION_CONSTRAINTS) {
    this.actionConstraints = constraints
  }
  
  /**
   * Initialize or get a character's state
   */
  getCharacter(name: string): CharacterKnowledge {
    if (!this.characters.has(name)) {
      this.characters.set(name, {
        characterName: name,
        knownFacts: new Set(),
        actionsTaken: new Map(),
        emotionalState: 'neutral',
        lastSceneAppeared: 0
      })
    }
    return this.characters.get(name)!
  }
  
  /**
   * Record that a character learned a fact
   * Returns false if they already knew it (should not re-discover)
   */
  learnFact(characterName: string, fact: string): boolean {
    const character = this.getCharacter(characterName)
    if (character.knownFacts.has(fact)) {
      return false // Already knew this
    }
    character.knownFacts.add(fact)
    return true
  }
  
  /**
   * Check if a character already knows a fact
   */
  knowsFact(characterName: string, fact: string): boolean {
    const character = this.getCharacter(characterName)
    return character.knownFacts.has(fact)
  }
  
  /**
   * Record an action and check if it exceeds constraints
   * Returns { allowed: boolean, warning?: string }
   */
  recordAction(characterName: string, actionType: string): { allowed: boolean; warning?: string } {
    const character = this.getCharacter(characterName)
    const currentCount = character.actionsTaken.get(actionType) || 0
    
    const constraint = this.actionConstraints.find(c => c.actionType === actionType)
    if (constraint && currentCount >= constraint.maxOccurrences) {
      return {
        allowed: false,
        warning: `${characterName} has already "${constraint.description}" ${constraint.maxOccurrences} time(s). Consider a different approach.`
      }
    }
    
    character.actionsTaken.set(actionType, currentCount + 1)
    return { allowed: true }
  }
  
  /**
   * Update character's emotional state
   */
  updateEmotionalState(characterName: string, state: string, sceneNumber: number): void {
    const character = this.getCharacter(characterName)
    character.emotionalState = state
    character.lastSceneAppeared = sceneNumber
  }
  
  /**
   * Get all characters who have been in a stagnant emotional state too long
   */
  getStagnantCharacters(currentScene: number, maxScenesStagnant: number = 3): CharacterKnowledge[] {
    const stagnant: CharacterKnowledge[] = []
    for (const char of this.characters.values()) {
      if (currentScene - char.lastSceneAppeared > maxScenesStagnant) {
        stagnant.push(char)
      }
    }
    return stagnant
  }
  
  /**
   * Export state for serialization
   */
  exportState(): Record<string, any> {
    const state: Record<string, any> = {}
    for (const [name, char] of this.characters) {
      state[name] = {
        knownFacts: Array.from(char.knownFacts),
        actionsTaken: Object.fromEntries(char.actionsTaken),
        emotionalState: char.emotionalState,
        lastSceneAppeared: char.lastSceneAppeared
      }
    }
    return state
  }
  
  /**
   * Import state from serialized data
   */
  importState(state: Record<string, any>): void {
    this.characters.clear()
    for (const [name, data] of Object.entries(state)) {
      this.characters.set(name, {
        characterName: name,
        knownFacts: new Set(data.knownFacts || []),
        actionsTaken: new Map(Object.entries(data.actionsTaken || {})),
        emotionalState: data.emotionalState || 'neutral',
        lastSceneAppeared: data.lastSceneAppeared || 0
      })
    }
  }
}

// ============================================================================
// Scene Consolidation
// ============================================================================

export interface SceneBeat {
  id: string
  location: string
  timeOfDay?: string
  characters: string[]
  action: string
  dialogue?: Array<{ character: string; text: string }>
  emotionalBeat?: string
  plotPoint?: string
}

export interface ConsolidatedScene {
  sceneNumber: number
  heading: string
  location: string
  timeOfDay: string
  characters: string[]
  beats: SceneBeat[]
  hasBeginning: boolean
  hasMiddle: boolean
  hasEnd: boolean
}

/**
 * Normalize location strings for comparison
 */
function normalizeLocation(location: string): string {
  return location
    .toLowerCase()
    .replace(/^(int\.|ext\.|int\/ext\.|i\/e\.)\s*/i, '')
    .replace(/\s*-\s*(day|night|morning|evening|dusk|dawn|continuous)$/i, '')
    .trim()
}

/**
 * Check if two locations are effectively the same
 */
function isSameLocation(loc1: string, loc2: string): boolean {
  return normalizeLocation(loc1) === normalizeLocation(loc2)
}

/**
 * Consolidate beats into scenes based on location continuity
 * Implements the "N-to-1" rule where N is beatToSceneRatio
 */
export function consolidateBeatsToScenes(
  beats: SceneBeat[],
  settings: ScriptSettings
): ConsolidatedScene[] {
  if (beats.length === 0) return []
  
  const scenes: ConsolidatedScene[] = []
  let currentScene: ConsolidatedScene | null = null
  let sceneNumber = 1
  
  for (const beat of beats) {
    const shouldStartNewScene = (
      !currentScene ||
      !isSameLocation(currentScene.location, beat.location) ||
      currentScene.beats.length >= settings.beatToSceneRatio
    )
    
    if (shouldStartNewScene) {
      // Finalize previous scene
      if (currentScene) {
        currentScene.hasEnd = true
        scenes.push(currentScene)
        sceneNumber++
      }
      
      // Start new scene
      const timeMatch = beat.location.match(/\s*-\s*(DAY|NIGHT|MORNING|EVENING|DUSK|DAWN|CONTINUOUS)$/i)
      currentScene = {
        sceneNumber,
        heading: beat.location,
        location: normalizeLocation(beat.location),
        timeOfDay: timeMatch ? timeMatch[1].toUpperCase() : 'DAY',
        characters: [...beat.characters],
        beats: [beat],
        hasBeginning: true,
        hasMiddle: false,
        hasEnd: false
      }
    } else {
      // Add to current scene
      currentScene!.beats.push(beat)
      currentScene!.hasMiddle = currentScene!.beats.length > 1
      
      // Merge characters
      for (const char of beat.characters) {
        if (!currentScene!.characters.includes(char)) {
          currentScene!.characters.push(char)
        }
      }
    }
  }
  
  // Finalize last scene
  if (currentScene) {
    currentScene.hasEnd = true
    scenes.push(currentScene)
  }
  
  return scenes
}

// ============================================================================
// Narration Rules
// ============================================================================

export interface NarrationGuidelines {
  allowedPositions: ('opening' | 'closing' | 'act_transition' | 'anywhere')[]
  maxNarrationPerScene: number  // 0 = none, 1 = one block, -1 = unlimited
  conversionInstructions: string
}

export function getNarrationGuidelines(mode: NarrationMode): NarrationGuidelines {
  switch (mode) {
    case 'minimal':
      return {
        allowedPositions: ['opening', 'closing'],
        maxNarrationPerScene: 0,
        conversionInstructions: `
NARRATION REDUCTION RULES:
- Remove 95% of voiceover/narration
- Convert emotional narration content into:
  1. ACTION LINES: Visual descriptions showing the emotion (e.g., "His hand trembles" instead of "He felt afraid")
  2. SUBTEXT: Behavior and body language (e.g., character avoids eye contact)
  3. VISUAL METAPHOR: Environmental cues reflecting inner state
- ONLY use narration for:
  1. Scene 1 opening hook (max 2-3 sentences)
  2. Final resolution/epilogue (max 2-3 sentences)
- The audience must SEE the story, not be TOLD the story
- Replace "NARRATION: He felt..." with "ACTION: His face shows..."
`
      }
    
    case 'moderate':
      return {
        allowedPositions: ['opening', 'closing', 'act_transition'],
        maxNarrationPerScene: 1,
        conversionInstructions: `
NARRATION GUIDELINES (MODERATE):
- Use narration sparingly for:
  1. Opening scene establishment
  2. Act transitions (max 1-2 sentences each)
  3. Closing/epilogue
- Limit to ONE narration block per scene maximum
- Prefer visual storytelling over narration
- Convert internal monologue to action/reaction shots
`
      }
    
    case 'narrative-driven':
      return {
        allowedPositions: ['anywhere'],
        maxNarrationPerScene: -1,
        conversionInstructions: `
NARRATION STYLE (NARRATIVE-DRIVEN):
- Narration is a core storytelling device
- Use narration to provide context, commentary, or poetic reflection
- Balance narration with visual content
- Ensure narration adds information visuals cannot convey
`
      }
  }
}

// ============================================================================
// Anti-Repetition Scoring
// ============================================================================

export interface RepetitionPenalty {
  type: string
  penalty: number
  description: string
}

export function getRepetitionPenalties(tolerance: RepetitionTolerance): RepetitionPenalty[] {
  const basePenalties: RepetitionPenalty[] = [
    { type: 'same_argument_repeated', penalty: -10, description: 'Character makes same argument to same person >2x' },
    { type: 'discovery_loop', penalty: -15, description: 'Character "discovers" information they already learned' },
    { type: 'stagnant_character', penalty: -5, description: 'Character unchanged emotionally for >3 scenes' },
    { type: 'location_ping_pong', penalty: -8, description: 'Cutting away and back to same location repeatedly' },
    { type: 'redundant_exposition', penalty: -12, description: 'Explaining something already shown visually' }
  ]
  
  const multiplier = tolerance === 'strict' ? 1.5 : tolerance === 'permissive' ? 0.5 : 1
  
  return basePenalties.map(p => ({
    ...p,
    penalty: Math.round(p.penalty * multiplier)
  }))
}

export interface ProgressionBonus {
  type: string
  bonus: number
  description: string
}

export const PROGRESSION_BONUSES: ProgressionBonus[] = [
  { type: 'irreversible_action', bonus: 10, description: 'Character takes action that cannot be undone' },
  { type: 'knowledge_escalation', bonus: 8, description: 'Character learns NEW information building on previous' },
  { type: 'relationship_shift', bonus: 7, description: 'Relationship between characters fundamentally changes' },
  { type: 'stakes_raised', bonus: 6, description: 'Consequences of failure become more severe' },
  { type: 'point_of_no_return', bonus: 15, description: 'Character crosses a threshold they cannot return from' }
]

// ============================================================================
// Scene Deduplication Analysis
// ============================================================================

export interface DuplicateSceneGroup {
  primarySceneNumber: number
  duplicateSceneNumbers: number[]
  similarity: number  // 0-1
  reason: string
  recommendation: string
}

/**
 * Analyze scenes for potential duplicates/redundancy
 */
export function findDuplicateScenes(
  scenes: Array<{ sceneNumber: number; action?: string; dialogue?: any[]; characters?: string[] }>
): DuplicateSceneGroup[] {
  const groups: DuplicateSceneGroup[] = []
  const processed = new Set<number>()
  
  for (let i = 0; i < scenes.length; i++) {
    if (processed.has(scenes[i].sceneNumber)) continue
    
    const primary = scenes[i]
    const duplicates: number[] = []
    
    for (let j = i + 1; j < scenes.length; j++) {
      if (processed.has(scenes[j].sceneNumber)) continue
      
      const comparison = scenes[j]
      const similarity = calculateSceneSimilarity(primary, comparison)
      
      if (similarity > 0.7) {
        duplicates.push(comparison.sceneNumber)
        processed.add(comparison.sceneNumber)
      }
    }
    
    if (duplicates.length > 0) {
      groups.push({
        primarySceneNumber: primary.sceneNumber,
        duplicateSceneNumbers: duplicates,
        similarity: 0.75, // Average estimate
        reason: 'Scenes have similar action/dialogue patterns',
        recommendation: `Consider merging scenes ${duplicates.join(', ')} into scene ${primary.sceneNumber} or deleting redundant scenes`
      })
      processed.add(primary.sceneNumber)
    }
  }
  
  return groups
}

/**
 * Calculate similarity between two scenes (0-1)
 */
function calculateSceneSimilarity(
  scene1: { action?: string; dialogue?: any[]; characters?: string[] },
  scene2: { action?: string; dialogue?: any[]; characters?: string[] }
): number {
  let score = 0
  let factors = 0
  
  // Character overlap
  if (scene1.characters && scene2.characters) {
    const overlap = scene1.characters.filter(c => scene2.characters!.includes(c)).length
    const total = new Set([...scene1.characters, ...scene2.characters]).size
    score += overlap / Math.max(total, 1)
    factors++
  }
  
  // Action similarity (simple keyword overlap)
  if (scene1.action && scene2.action) {
    const words1 = new Set(scene1.action.toLowerCase().split(/\s+/))
    const words2 = new Set(scene2.action.toLowerCase().split(/\s+/))
    const overlap = [...words1].filter(w => words2.has(w)).length
    const total = new Set([...words1, ...words2]).size
    score += overlap / Math.max(total, 1)
    factors++
  }
  
  // Dialogue pattern similarity
  if (scene1.dialogue && scene2.dialogue) {
    const speakers1 = scene1.dialogue.map(d => d.character || d.speaker).join(',')
    const speakers2 = scene2.dialogue.map(d => d.character || d.speaker).join(',')
    if (speakers1 === speakers2) {
      score += 0.5
    }
    factors++
  }
  
  return factors > 0 ? score / factors : 0
}

// ============================================================================
// Prompt Builder Integration
// ============================================================================

/**
 * Generate the constraint instructions to inject into script generation prompts
 */
export function buildScriptConstraintPrompt(settings: ScriptSettings): string {
  const narrationGuidelines = getNarrationGuidelines(settings.narrationMode)
  const repetitionPenalties = getRepetitionPenalties(settings.repetitionTolerance)
  
  return `
=== SCRIPT GENERATION CONSTRAINTS ===

## 1. SCENE CONSOLIDATION (${settings.beatToSceneRatio}-to-1 Rule)
- Merge consecutive story beats in the SAME LOCATION into single scenes
- Each scene MUST have a beginning, middle, and end
- Do NOT cut away and cut back to the same location unless significant time passes
- Target: ${settings.targetSceneCount || 50} total scenes for the entire script
- Maximum ${settings.maxScenesPerAct} scenes per act

## 2. NARRATION RULES
${narrationGuidelines.conversionInstructions}

## 3. CHARACTER STATE PROGRESSION
${settings.enforceStateProgression ? `
- Once a character LEARNS information, they CANNOT "discover" it again
- The NEXT scene must show them ACTING on that information
- Characters cannot be "suspicious" for more than 3 scenes without taking concrete action
- Each character must show EMOTIONAL PROGRESSION - no static states
- Track what each character knows and ensure logical consistency
` : '- State progression enforcement disabled'}

## 4. ANTI-REPETITION RULES
Avoid the following (penalties apply to quality score):
${repetitionPenalties.map(p => `- ${p.description}: ${p.penalty} points`).join('\n')}

REWARD plot progression:
${PROGRESSION_BONUSES.map(b => `- ${b.description}: +${b.bonus} points`).join('\n')}

## 5. SPECIFIC CONSTRAINTS
- A character can only be physically ejected from a location ONCE
- The same confrontation argument can only happen TWICE maximum
- If a warning is ignored, the NEXT attempt must use a different approach
- Every 10 scenes, something IRREVERSIBLE must happen

=== END CONSTRAINTS ===
`
}

/**
 * Validate a generated script against the rules
 * Returns issues found and a quality score adjustment
 */
export function validateScriptAgainstRules(
  scenes: Array<{ sceneNumber: number; action?: string; dialogue?: any[]; characters?: string[]; narration?: string }>,
  settings: ScriptSettings
): { issues: string[]; scoreAdjustment: number } {
  const issues: string[] = []
  let scoreAdjustment = 0
  
  // Check scene count
  if (scenes.length > (settings.targetSceneCount || 50) * 1.2) {
    issues.push(`Script has ${scenes.length} scenes, exceeding target of ${settings.targetSceneCount || 50} by more than 20%`)
    scoreAdjustment -= 10
  }
  
  // Check for duplicate scenes
  const duplicates = findDuplicateScenes(scenes)
  for (const group of duplicates) {
    issues.push(`Potential duplicate scenes: ${group.primarySceneNumber} and ${group.duplicateSceneNumbers.join(', ')}`)
    scoreAdjustment -= 15 * group.duplicateSceneNumbers.length
  }
  
  // Check narration usage
  const narrationGuidelines = getNarrationGuidelines(settings.narrationMode)
  if (narrationGuidelines.maxNarrationPerScene === 0) {
    const middleScenes = scenes.slice(1, -1) // Exclude first and last
    const scenesWithNarration = middleScenes.filter(s => s.narration && s.narration.trim().length > 0)
    if (scenesWithNarration.length > 0) {
      issues.push(`${scenesWithNarration.length} middle scenes have narration but mode is 'minimal'`)
      scoreAdjustment -= 5 * scenesWithNarration.length
    }
  }
  
  return { issues, scoreAdjustment }
}
