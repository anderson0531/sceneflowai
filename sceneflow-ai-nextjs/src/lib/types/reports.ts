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
  }>
  beats?: Array<{
    title: string
    intent?: string
    synopsis?: string
    minutes: number
  }>
  visual_style?: string
  tone?: string
  themes?: string[] | string
  setting?: string
  protagonist?: string
  antagonist?: string
}

// Align with existing script structure
export interface ScriptData {
  title: string
  logline?: string
  author?: string
  script: {
    scenes: Array<{
      sceneNumber?: number
      heading?: string | { text: string }
      visualDescription?: string
      action?: string
      dialogue?: Array<{
        character: string
        text: string
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
    imageUrl?: string
    visualDescription?: string
    shotType?: string
    cameraAngle?: string
    lighting?: string
    duration?: number
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

