import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { ExportJobService } from '@/services/export/ExportJobService'
import { publishExportJob } from '@/services/export/ExportQueueService'

const SceneAudioSchema = z.object({
  narration: z.string().optional(),
  dialogue: z.array(z.any()).optional(),
  sfx: z.array(z.any()).optional(),
  music: z.string().optional(),
})

const SceneSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  number: z.number().int().optional(),
  timeline: z.any().optional(),
  audio: SceneAudioSchema.optional(),
  metadata: z.record(z.any()).optional(),
})

const VideoOptionsSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().positive(),
  format: z.enum(['mp4', 'mov']).default('mp4'),
})

const AudioOptionsSchema = z.object({
  narration: z.number().optional(),
  dialogue: z.number().optional(),
  music: z.number().optional(),
  sfx: z.number().optional(),
  normalize: z.boolean().optional(),
  duckMusic: z.boolean().optional(),
})

const StartExportSchema = z.object({
  projectId: z.string().uuid().optional(),
  title: z.string().min(1),
  scenes: z.array(SceneSchema).min(1),
  video: VideoOptionsSchema,
  audio: AudioOptionsSchema.optional(),
  metadata: z.record(z.any()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const payload = StartExportSchema.parse(body)

    const job = await ExportJobService.createJob({
      userId: session.user.id,
      projectId: payload.projectId ?? null,
      payload: {
        title: payload.title,
        scenes: payload.scenes,
        video: payload.video,
        audio: payload.audio,
      },
      metadata: payload.metadata,
    })

    await publishExportJob(job)

    return NextResponse.json({ jobId: job.id, status: job.status })
  } catch (error) {
    console.error('[ExportStart] Failed to enqueue job', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to start export job' }, { status: 500 })
  }
}
