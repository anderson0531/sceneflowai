import { DetailedSceneDirection } from '@/types/scene-direction'

export enum ReportType {
  FILM_TREATMENT = 'Film Treatment',
  PROFESSIONAL_SCRIPT = 'Professional Script',
  STORYBOARD = 'Storyboard',
  SCENE_DIRECTION = 'Scene Direction',
}

// Align with existing FilmTreatmentItem interface
export interface FilmTreatmentData {
  title?: string
  logline?: string
  synopsis?: string
  genre?: string
  author_writer?: string
  date?: string
  character_descriptions?: Array<{
    name: string
    description?: string
    role?: string
    image_prompt?: string
  }>
  beats?: Array<{
    title: string
    intent?: string
    synopsis?: string
    minutes: number
  }>
  visual_style?: string
  artStyle?: string
  aspectRatio?: string
  tone?: string
  themes?: string[] | string
  setting?: string
  protagonist?: string
  antagonist?: string
  act_breakdown?: {
    act1?: string
    act2?: string
    act3?: string
  }
}

// Align with existing script structure + rich Production Stage script export
export interface ScriptData {
  title: string
  logline?: string
  author?: string
  createdAt?: Date | string
  characters?: Array<{
    id?: string
    name: string
    role?: string
    description?: string
    appearanceDescription?: string
    defaultWardrobe?: string
    wardrobes?: Array<{
      id?: string
      name: string
      description?: string
      fullBodyPrompt?: string
      accessories?: string
      continuityNotes?: string
      sceneNumbers?: number[]
    }>
  }>
  chapters?: Array<{
    id: string
    number: number
    heading: string
    title: string
    description?: string
    minutes?: number
    sceneNumbers?: number[]
  }>
  scenes?: any[]
  script?: {
    scenes: Array<{
      sceneNumber?: number
      heading?: string | { text: string }
      visualDescription?: string
      sceneDescription?: string
      action?: string
      narration?: string
      chapterId?: string
      chapterHeading?: string
      chapterTitle?: string
      chapterDescription?: string
      sceneDirection?: DetailedSceneDirection
      sceneDirectionText?: Record<string, string | undefined>
      shots?: any[]
      dialogue?: Array<{
        character: string
        text?: string
        line?: string
        parenthetical?: string
      }>
    }>
  }
}

// Align with existing storyboard structure
export interface StoryboardData {
  title: string
  frames: Array<{
    sceneNumber: number
    frameType?: 'establishing' | 'dialogue' | 'custom'
    dialogueIndex?: number
    customFrameId?: string
    imageUrl?: string
    visualDescription?: string
    shotType?: string
    cameraAngle?: string
    lighting?: string
    duration?: number
    character?: string
    line?: string
    label?: string
  }>
}

// Scene direction data
export interface SceneDirectionData {
  title: string
  scenes: Array<{
    sceneNumber: number
    heading?: string
    visualDescription?: string
    shotType?: string
    cameraAngle?: string
    lighting?: string
    mood?: string
    duration?: number
    sceneDirection?: DetailedSceneDirection
  }>
}

export type ReportData = FilmTreatmentData | ScriptData | StoryboardData | SceneDirectionData

