// Shared vision-workflow types extracted from src/app/dashboard/workflow/vision/[projectId]/page.tsx
// Keeping these in their own module reduces page-level surface and improves type-checking incrementally.

import type { DialogueAudioEntry, ScriptSegment, SfxAudioEntry } from '@/lib/script/segmentTypes'

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
  /**
   * @deprecated Narrator lines are now stored as DialogueLine entries with
   * kind='narration' inside `segments[].dialogue`. Kept for legacy reads.
   */
  narration?: string
  /**
   * @deprecated Flat positional dialogue. New scenes use `segments[].dialogue`.
   * Kept for legacy reads and the migration window.
   */
  dialogue?: any[]
  /**
   * Segmented script content. When present, this is the source of truth for
   * direction / dialogue / SFX. When absent, callers should fall back to the
   * flat `dialogue`/`sfx`/`narration` fields and trigger migration.
   */
  segments?: ScriptSegment[]
  music?: string | { description: string }
  /**
   * @deprecated Per-scene SFX list. New scenes carry SFX inside segments.
   */
  sfx?: any[]
  /**
   * Per-language dialogue audio. Stored as a map of `{ [lang]: DialogueAudioEntry[] }`
   * (or legacy shape `DialogueAudioEntry[]` for older projects).
   */
  dialogueAudio?: Record<string, DialogueAudioEntry[]> | DialogueAudioEntry[]
  /**
   * Per-language SFX audio keyed by sfxId: `{ [lang]: { [sfxId]: entry } }`.
   */
  sfxAudio?: Record<string, Record<string, SfxAudioEntry>>
  imageUrl?: string
  /** @deprecated Narration audio is now part of dialogueAudio. */
  narrationAudioUrl?: string
  /** @deprecated Narration audio is now part of dialogueAudio. */
  narrationAudio?: any
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
      /**
       * Set to an ISO timestamp once a project has been migrated to the
       * segmented-script shape (`script.scenes[].segments[]`). When present,
       * the migration loader is a no-op for this project.
       */
      scriptSegmentMigratedAt?: string
    }
    [key: string]: any
  }
}
