// TypeScript interfaces for Scene Audio Track System

export interface NarrationTrack {
  text: string
  voiceId: string
  mp3Url?: string
  duration?: number
  generated: boolean
  generatedAt?: string
}

export interface DialogueTrack {
  character: string
  line: string
  voiceId: string
  mp3Url?: string
  duration?: number
  generated: boolean
}

export interface SFXTrack {
  description: string
  mp3Url?: string
  duration: number
  startTime: number  // When to play relative to scene start
  generated: boolean
}

export interface MusicTrack {
  description: string
  mp3Url?: string
  duration: number
  generated: boolean
}

export interface SceneAudioTracks {
  sceneNumber: number
  narration?: NarrationTrack
  dialogue: DialogueTrack[]
  sfx: SFXTrack[]
  music?: MusicTrack
}

export interface Voice {
  id: string
  name: string
  gender?: string
}

