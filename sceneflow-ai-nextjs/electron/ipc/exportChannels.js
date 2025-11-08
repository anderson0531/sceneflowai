const { z } = require('zod')

const DialogueClipSchema = z.object({
  url: z.string().min(1),
  startTime: z.number().min(0),
  duration: z.number().positive().optional()
})

const SfxClipSchema = z.object({
  url: z.string().min(1),
  startTime: z.number().min(0),
  duration: z.number().positive().optional()
})

const SceneAudioSchema = z.object({
  narration: z.string().min(1).optional(),
  dialogue: z.array(DialogueClipSchema).optional(),
  sfx: z.array(SfxClipSchema).optional(),
  music: z.string().min(1).optional()
})

const SceneSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().min(1),
  imagePath: z.string().min(1),
  duration: z.number().positive(),
  audio: SceneAudioSchema,
  kenBurnsIntensity: z.enum(['subtle', 'medium', 'dramatic']).default('medium')
})

const VideoOptionsSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().positive(),
  quality: z.enum(['draft', 'standard', 'high', 'ultra']).default('standard'),
  format: z.enum(['mp4', 'mov']).default('mp4')
})

const AudioMixSchema = z.object({
  narration: z.number().min(0).max(1.5).default(1),
  dialogue: z.number().min(0).max(2.5).default(1.4),
  music: z.number().min(0).max(1).default(0.4),
  sfx: z.number().min(0).max(1.5).default(0.8),
  normalize: z.boolean().default(true),
  duckMusic: z.boolean().default(true)
})

const EngineOptionsSchema = z.object({
  useHardwareAcceleration: z.boolean().optional()
}).optional()

const ExportStartPayloadSchema = z.object({
  projectId: z.string().min(1),
  projectTitle: z.string().min(1),
  scenes: z.array(SceneSchema).min(1),
  video: VideoOptionsSchema,
  audio: AudioMixSchema,
  engine: EngineOptionsSchema,
  outputDir: z.string().min(1).optional(),
  metadata: z.record(z.any()).optional()
})

const ExportProgressPayloadSchema = z.object({
  progress: z.number().min(0).max(1),
  phase: z.enum([
    'preparing',
    'video-render',
    'video-concat',
    'audio-assembly',
    'audio-mix',
    'mux',
    'finalizing'
  ]).default('preparing'),
  detail: z.string().optional(),
  pass: z.number().int().min(1).optional(),
  totalPasses: z.number().int().min(1).optional(),
  overallProgress: z.number().min(0).max(1).optional(),
  etaSeconds: z.number().min(0).optional()
})

const QaDurationSchema = z.object({
  expected: z.number(),
  clipSum: z.number(),
  video: z.number(),
  tracks: z.record(z.number()).optional(),
  deltas: z.record(z.number()),
  maxDelta: z.number(),
  withinTolerance: z.boolean(),
  warnings: z.array(z.string())
})

const PerformanceStageSchema = z.object({
  label: z.string(),
  durationMs: z.number(),
  cpuUserMicros: z.number().optional(),
  cpuSystemMicros: z.number().optional(),
  failed: z.boolean().optional(),
  message: z.string().optional()
})

const ExportCompletePayloadSchema = z.object({
  filePath: z.string().min(1),
  durationSeconds: z.number().positive(),
  fileSizeBytes: z.number().int().nonnegative(),
  thumbnailPath: z.string().optional(),
  qa: z
    .object({
      duration: QaDurationSchema.optional()
    })
    .optional(),
  performance: z
    .object({
      startedAt: z.number().optional(),
      completedAt: z.number().optional(),
      totalDurationMs: z.number().optional(),
      stages: z.array(PerformanceStageSchema).optional()
    })
    .optional()
})

const ExportErrorPayloadSchema = z.object({
  message: z.string().min(1),
  code: z.string().optional(),
  stage: z.string().optional(),
  recoverable: z.boolean().default(false),
  cause: z.any().optional()
})

const PublishRequestSchema = z.object({
  platform: z.enum(['youtube', 'tiktok']),
  videoPath: z.string().min(1),
  metadata: z
    .object({
      title: z.string().optional(),
      description: z.string().optional()
    })
    .optional()
})

const PublishResponseSchema = z.object({
  ok: z.boolean(),
  message: z.string().optional()
})

const CHANNELS = {
  START: 'export:start',
  PROGRESS: 'export:progress',
  COMPLETE: 'export:complete',
  ERROR: 'export:error',
  PUBLISH: 'export:publish'
}

module.exports = {
  CHANNELS,
  DialogueClipSchema,
  SfxClipSchema,
  SceneAudioSchema,
  SceneSchema,
  VideoOptionsSchema,
  AudioMixSchema,
  ExportStartPayloadSchema,
  ExportProgressPayloadSchema,
  ExportCompletePayloadSchema,
  ExportErrorPayloadSchema,
  PublishRequestSchema,
  PublishResponseSchema,
  QaDurationSchema,
  PerformanceStageSchema
}
