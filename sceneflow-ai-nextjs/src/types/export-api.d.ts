export type ExportKenBurnsIntensity = 'subtle' | 'medium' | 'dramatic'

export interface ExportDialogueClip {
  url: string
  startTime: number
  duration?: number
}

export interface ExportSfxClip {
  url: string
  startTime: number
  duration?: number
}

export interface ExportSceneAudio {
  narration?: string
  dialogue?: ExportDialogueClip[]
  sfx?: ExportSfxClip[]
  music?: string
}

export interface ExportScene {
  id: string
  number: number
  imagePath: string
  duration: number
  audio: ExportSceneAudio
  kenBurnsIntensity: ExportKenBurnsIntensity
}

export type ExportQuality = 'draft' | 'standard' | 'high' | 'ultra'
export type ExportFormat = 'mp4' | 'mov'

export interface ExportVideoOptions {
  width: number
  height: number
  fps: number
  quality: ExportQuality
  format: ExportFormat
}

export interface ExportAudioMix {
  narration: number
  dialogue: number
  music: number
  sfx: number
  normalize: boolean
  duckMusic: boolean
}

export interface ExportStartPayload {
  projectId: string
  projectTitle: string
  scenes: ExportScene[]
  video: ExportVideoOptions
  audio: ExportAudioMix
  engine?: {
    useHardwareAcceleration?: boolean
  }
  outputDir?: string
  metadata?: Record<string, unknown>
}

export type ExportPhase =
  | 'preparing'
  | 'video-render'
  | 'video-concat'
  | 'audio-assembly'
  | 'audio-mix'
  | 'mux'
  | 'finalizing'

export interface ExportProgressPayload {
  progress: number
  phase: ExportPhase
  detail?: string
  pass?: number
  totalPasses?: number
  overallProgress?: number
  etaSeconds?: number
}

export interface ExportCompletePayload {
  filePath: string
  durationSeconds: number
  fileSizeBytes: number
  thumbnailPath?: string
  qa?: {
    duration?: {
      expected: number
      clipSum: number
      video: number
      tracks?: Record<string, number>
      deltas: Record<string, number>
      maxDelta: number
      withinTolerance: boolean
      warnings: string[]
    }
  }
  performance?: {
    startedAt?: number
    completedAt?: number
    totalDurationMs?: number
    stages?: Array<{
      label: string
      durationMs: number
      cpuUserMicros?: number
      cpuSystemMicros?: number
      failed?: boolean
      message?: string
    }>
  }
}

export interface ExportErrorPayload {
  message: string
  code?: string
  stage?: string
  recoverable: boolean
}

export interface ExportStartAck {
  ok: boolean
  workspaceId?: string
  workspacePath?: string
}

export interface ExportPublishRequest {
  platform: 'youtube' | 'tiktok'
  videoPath: string
  metadata?: {
    title?: string
    description?: string
  }
}

export interface ExportPublishResponse {
  ok: boolean
  message?: string
}

export interface ExportBridge {
  startExport(payload: ExportStartPayload): Promise<ExportStartAck>
  onProgress(callback: (payload: ExportProgressPayload) => void): () => void
  onComplete(callback: (payload: ExportCompletePayload) => void): () => void
  onError(callback: (payload: ExportErrorPayload) => void): () => void
  startPublish(request: ExportPublishRequest): Promise<ExportPublishResponse>
  ping(): Promise<string>
}

declare global {
  interface Window {
    exportAPI?: ExportBridge
  }
}

export {}
