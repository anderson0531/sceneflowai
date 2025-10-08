declare module '@/services/VideoGenerationService' {
  export interface VideoClip { clip_id: string; scene_number?: number; status: string; progress?: number; url?: string }
  export interface VideoGenerationJob { generationId: string; projectId: string; overallStatus: string; clips: VideoClip[]; progress?: number; metadata?: any }
  export interface VideoStitchJob { stitchId: string; status: string; progress: number; final_video_url?: string; thumbnail_url?: string; metadata: any; estimated_completion?: Date }
  export type GenerationSettings = { quality: 'standard'|'high'|'ultra'; format: 'mp4'|'mov'|'webm'; aspectRatio: string; frameRate: string }
  export type OutputSettings = GenerationSettings & { resolution: string }
  export const VideoGenerationService: {
    startGeneration(userId: string, projectId: string, directions: any[], ctx: any, settings: GenerationSettings): Promise<VideoGenerationJob>
    startStatusPolling(genId: string, cb: (job: VideoGenerationJob)=>void): () => void
    getUserGenerationJobs(userId: string): VideoGenerationJob[]
    startStitching(genId: string, userId: string, clips: any[], output: OutputSettings): Promise<VideoStitchJob>
    checkStitchingStatus(stitchId: string, userId: string): Promise<VideoStitchJob>
  }
}

declare module '@/services/CollaborationService' {
  export const CollaborationService: {
    createSession(projectId: string, userId: string, title: string, description: string, participants: string[]): Promise<{ id: string }>
    generateShareLink(sessionId: string): string
    getSessionStats?: (sessionId: string) => any
  }
}

declare module '@/services/ExportService' { export const ExportService: any }

declare module '@/services/TemplateService' {
  export const applyTemplateToProject: (templatePath: string, updater: (fn: any)=>void) => Promise<boolean>
  export const getCurrentTemplate: any
  export const getCurrentStructuredTemplate: any
  export const formatCoreConceptAsTemplate: any
  export const hydrateReadinessFromTemplate: any
}

// Broad service stubs
declare module '@/services/AuthService' { export const AuthService: any }

declare module '@/services/EncryptionService' { export const EncryptionService: any }

declare module '@/services/VideoGenerationGateway' { export const videoGenerationGateway: any }

declare module '@/services/AsyncJobManager' { export const AsyncJobManager: any }

declare module '@/services/SparkStudioService' { export const SparkStudioService: any; export type Editframe = any; export type EditframeOptions = any }

declare module '@/services/CreditService' { export const CreditService: any }

declare module '@/services/llmGateway' { export const llmGateway: any }

declare module '@/services/YouTubeIntegrationService' { export const YouTubeIntegrationService: any }

declare module '@/services/ScoreService' { export const ScoreService: any }

declare module '@/services/storyAnalysisService' { export const storyAnalysisService: any }

declare module '@/services/storyMutationService' { export const storyMutationService: any }

declare module '@/services/ProjectBibleManager' { export const ProjectBibleManager: any }

declare module '@/services/ai-providers/BaseAIProviderAdapter' {
  export type AIProvider = any
  export const BaseAIProviderAdapter: any
}

declare module '@/services/ai-providers/AIProviderFactory' { export const AIProviderFactory: any }

// DOL and related
declare module '@/services/DOL/*' { const anyService: any; export = anyService }
