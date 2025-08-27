export type AttributeSource = 'extracted' | 'suggested' | 'user_modified'

export interface ConceptAttribute<T> {
  value: T
  source: AttributeSource
}

export interface CoreConceptAttributes {
  workingTitle: ConceptAttribute<string>
  corePremise: ConceptAttribute<string>
  targetAudience: ConceptAttribute<string>
  goalObjective: ConceptAttribute<string>
  keyMessageCTA: ConceptAttribute<string>
  genreFormat: ConceptAttribute<string>
  toneMood: ConceptAttribute<string[]>
  visualAesthetic: ConceptAttribute<string>
  intendedPlatform: ConceptAttribute<string>
  estimatedDuration: ConceptAttribute<string>
  mustHaveElements: ConceptAttribute<string[]>
}

export interface AnalysisResponse {
  attributes: CoreConceptAttributes
  rationale: string
}

export interface SceneOutline {
  sceneNumber: number
  setting: string
  action: string
  composition: string
  pacing: 'Fast' | 'Medium' | 'Slow'
  audioCues: string
  dialogueVO: string
}

export interface GeneratedIdea {
  id: string
  hookTitle: string
  logline: string
  detailedSynopsis: string
  visualStyleNotes: string
  audioStyleNotes: string
  sequentialOutline: SceneOutline[]
}

// New interfaces for enhanced project structure
export type ProjectType = 'short' | 'medium' | 'long'
export type StoryStructure = 'linear' | 'three-act' | 'hero-journey' | 'save-the-cat' | 'custom'

export interface Chapter {
  id: string
  title: string
  act: number
  order: number
  description: string
  estimatedDuration: number // in minutes
  status: 'planned' | 'in-progress' | 'completed'
  progress: {
    ideation: number
    storyboard: number
    direction: number
    video: number
  }
  content: {
    ideation?: CoreConceptAttributes
    storyboard?: SceneOutline[]
    direction?: any // Scene direction data
    video?: any // Generated video data
  }
  metadata: Record<string, any>
}

export interface Act {
  id: string
  number: number
  title: string
  description: string
  chapters: Chapter[]
  estimatedDuration: number
  purpose: string // Setup, Development, Resolution, etc.
}

export interface EnhancedProject {
  id: string
  type: ProjectType
  structure: StoryStructure
  title: string
  description: string
  genre: string
  targetRuntime: number // in minutes
  targetAudience: string
  budget?: number
  acts: Act[]
  globalElements: {
    characters: Character[]
    locations: Location[]
    props: Prop[]
    visualStyle: VisualStyle
    tone: string
    theme: string
  }
  currentChapter?: string
  status: 'draft' | 'in_progress' | 'completed' | 'archived'
  created_at: Date
  updated_at: Date
}

export interface Character {
  id: string
  name: string
  description: string
  arc: string
  appearance: string
  personality: string
  motivation: string
  conflicts: string[]
  development: Record<string, string> // chapterId -> development notes
}

export interface Location {
  id: string
  name: string
  description: string
  visualStyle: string
  practical: boolean // Can be filmed on location
  sets: string[] // Alternative set options
}

export interface Prop {
  id: string
  name: string
  description: string
  significance: string
  practical: boolean // Can be sourced/built
}

export interface VisualStyle {
  colorPalette: string[]
  lighting: string
  cameraStyle: string
  editing: string
  references: string[]
}
