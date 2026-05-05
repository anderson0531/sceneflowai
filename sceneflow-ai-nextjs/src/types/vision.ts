// Shared vision-workflow types extracted from src/app/dashboard/workflow/vision/[projectId]/page.tsx
// Keeping these in their own module reduces page-level surface and improves type-checking incrementally.

export interface SceneAnalysis {
  overallScore: number
  directorScore: number
  audienceScore: number
  generatedAt: string
  recommendations: any[]
  iterationCount?: number
  appliedRecommendationIds?: string[]
}

export interface CharacterWardrobe {
  id: string
  name: string
  description: string
  accessories?: string
  previewImageUrl?: string
  headshotUrl?: string
  fullBodyUrl?: string
  sceneNumbers?: number[]
  isDefault: boolean
  createdAt: string
}

export interface SceneCharacterWardrobe {
  characterId: string
  wardrobeId: string
}

export interface Scene {
  id?: string
  heading?: string | { text: string }
  visualDescription?: string
  narration?: string
  dialogue?: any[]
  music?: string | { description: string }
  sfx?: any[]
  imageUrl?: string
  narrationAudioUrl?: string
  musicAudio?: string
  duration?: number
  scoreAnalysis?: SceneAnalysis
  sceneDirection?: any
  appliedRecommendations?: string[]
  appliedRecommendationIds?: string[]
  analysisIterationCount?: number
  characterWardrobes?: SceneCharacterWardrobe[]
  audienceAnalysis?: {
    score: number
    pacing: 'slow' | 'moderate' | 'fast'
    tension: 'low' | 'medium' | 'high'
    characterDevelopment: 'minimal' | 'moderate' | 'strong'
    visualPotential: 'low' | 'medium' | 'high'
    notes: string
    recommendations: Array<
      | string
      | { text: string; category?: string; targetElement?: string; impact?: 'structural' | 'polish' }
    >
    appliedRecommendationIds?: string[]
    analyzedAt: string
    optimizedAt?: string
    previousScore?: number
  }
  [key: string]: any
}

export type SceneBookmark = {
  sceneId: string
  sceneNumber: number
}

export interface VisionVoiceConfig {
  provider: 'elevenlabs' | 'google'
  voiceId: string
  voiceName: string
  stability?: number
  similarityBoost?: number
  languageCode?: string
  prompt?: string
  voiceDescription?: string
}

export interface VisionCharacter {
  id: string
  name: string
  description: string
  role?: 'protagonist' | 'main' | 'supporting'
  type?: 'character' | 'narrator' | 'description'
  referenceImage?: string
  appearanceDescription?: string
  voiceConfig?: VisionVoiceConfig
  voiceDescription?: string
  voiceTrainingAudioUrl?: string
  wardrobes?: CharacterWardrobe[]
  defaultWardrobe?: string
  wardrobeAccessories?: string
}

export interface BYOKSettings {
  imageProvider: 'google' | 'openai' | 'stability'
  imageModel: string
  audioProvider: 'google' | 'elevenlabs'
  audioModel: string
  videoProvider: 'runway' | 'pika' | 'kling'
  videoModel: string
}

export interface VisionProject {
  id: string
  title: string
  description: string
  duration?: number
  genre?: string
  tone?: string
  series_id?: string | null
  episode_number?: number | null
  metadata?: {
    blueprintVariant?: string
    filmTreatmentVariant?: any
    imageQuality?: 'max' | 'auto'
    visionPhase?: {
      script?: any
      characters?: any[]
      scenes?: any[]
      scriptGenerated?: boolean
      charactersGenerated?: boolean
      scenesGenerated?: boolean
      narrationVoice?: VisionVoiceConfig
      descriptionVoice?: VisionVoiceConfig
    }
    [key: string]: any
  }
}
