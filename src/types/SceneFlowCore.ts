// Central data model that flows through all SceneFlow modules
export interface SceneFlowProject {
  id: string
  title: string
  status: 'draft' | 'in_progress' | 'completed' | 'archived'
  
  // Core Creative Elements (Spark Studio)
  coreConcept: {
    workingTitle: string
    corePremise: string
    thematicKeywords: string[]
    genre: string
    targetAudience: string
    tone: string
    estimatedDuration: number
    keyMessage?: string
  }
  
  // Narrative Structure (Story Structure Studio)
  narrativeBlueprint: {
    selectedStructure: string
    acts: Act[]
    characterArcs: CharacterArc[]
    plotBeats: PlotBeat[]
    status: 'draft' | 'completed'
  }
  
  // Visual Language (Vision Board)
  styleGuide: {
    visualReferences: VisualReference[]
    artDirectionKeywords: string[]
    cinematographyStyle: CinematographyStyle
    characterDNA: Record<string, CharacterProfile>
  }
  
  // Production Planning (Director's Chair)
  productionPackage: {
    shootingScript: any
    shotList: any
    breakdownReport: any
    status: 'draft' | 'completed'
  }
  
  // Video Generation (Screening Room)
  generationQueue: any
  digitalDailies: any
  
  // Final Assembly (Quality Control)
  timelineProject: any
  finalExport: any
  
  // Project Metadata
  metadata: {
    createdAt: Date
    updatedAt: Date
    createdBy: string
    version: string
    totalRuntime: number
  }
  
  // Progress Tracking
  progress: {
    ideation: number
    storyStructure: number
    visionBoard: number
    direction: number
    videoGeneration: number
    qualityControl: number
  }
}

export interface Act {
  id: string
  number: number
  title: string
  description: string
  estimatedDuration: number
  plotBeats: PlotBeat[]
}

export interface PlotBeat {
  id: string
  title: string
  description: string
  order: number
  estimatedDuration: number
  charactersPresent: string[]
  emotionalTone: string
  structuralPurpose: string
}

export interface CharacterArc {
  id: string
  characterName: string
  archetype: string
  primaryMotivation: string
  internalConflict: string
  externalConflict: string
  arcSummary: string
  act1State: string
  act2State: string
  act3State: string
  transformation: string
}

export interface VisualReference {
  id: string
  type: 'upload' | 'curated' | 'ai-generated'
  url: string
  description: string
  tags: string[]
  uploadedAt: Date
}

export interface CinematographyStyle {
  lighting: string
  colorPalette: string
  overallMood: string
  additionalNotes?: string
}

export interface CharacterProfile {
  id: string
  name: string
  physicalDescription: string
  wardrobe: string
  personality: string
  motivation: string
  visualNotes: string
}

// Module-specific types for enhanced functionality
export type ModuleId = 'ideation' | 'story-structure' | 'vision-board' | 'direction' | 'screening-room' | 'quality-control'

export interface ModuleProgress {
  moduleId: ModuleId
  progress: number
  status: 'not-started' | 'in-progress' | 'completed' | 'needs-review'
  lastUpdated: Date
  notes?: string
}

export interface ProjectTemplate {
  id: string
  name: string
  description: string
  category: 'short-film' | 'commercial' | 'documentary' | 'music-video' | 'social-media'
  estimatedDuration: number
  complexity: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  previewImage?: string
}

// Export and sharing types
export interface ExportSettings {
  format: 'mp4' | 'mov' | 'avi'
  resolution: '720p' | '1080p' | '2k' | '4k'
  quality: 'draft' | 'standard' | 'high'
  includeMetadata: boolean
  watermark: boolean
}

export interface ShareSettings {
  public: boolean
  allowComments: boolean
  allowDownload: boolean
  expirationDate?: Date
  password?: string
}





