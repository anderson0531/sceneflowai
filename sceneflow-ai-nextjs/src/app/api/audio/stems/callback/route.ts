import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import { setJobStatus, updateJobStatus } from '@/lib/render/jobStatusStore'

interface StemCallbackPayload {
  jobId: string
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress?: number
  error?: string
  projectId?: string
  sceneId?: string
  segmentId?: string
  takeId?: string
  provider?: string
  sourceAudioUrl?: string
  sourceHash?: string
  model?: string
  processingMs?: number
  confidence?: number
  speechStemUrl?: string
  backgroundStemUrl?: string
  speechStemPath?: string
  backgroundStemPath?: string
}

function upsertSegmentStem(
  productionData: Record<string, unknown>,
  payload: StemCallbackPayload
): Record<string, unknown> {
  const sceneId = payload.sceneId
  const segmentId = payload.segmentId
  if (!sceneId || !segmentId) return productionData
  const scene = (productionData[sceneId] || {}) as Record<string, unknown>
  const segments = (scene.segments || []) as Array<Record<string, unknown>>
  const now = new Date().toISOString()

  const stemSeparation = {
    status: payload.status === 'COMPLETED' ? 'complete' : payload.status === 'FAILED' ? 'failed' : 'processing',
    provider: payload.provider || 'demucs',
    sourceAudioUrl: payload.sourceAudioUrl,
    sourceHash: payload.sourceHash,
    speechStemUrl: payload.speechStemUrl,
    backgroundStemUrl: payload.backgroundStemUrl,
    jobId: payload.jobId,
    processedAt: payload.status === 'COMPLETED' || payload.status === 'FAILED' ? now : undefined,
    error: payload.error,
    providerMeta: {
      model: payload.model,
      processingMs: payload.processingMs,
      confidence: payload.confidence,
      speechStemPath: payload.speechStemPath,
      backgroundStemPath: payload.backgroundStemPath,
      jobStatus: payload.status,
    },
  }

  const updatedSegments = segments.map((seg) => {
    if (seg.segmentId !== segmentId) return seg
    const takes = Array.isArray(seg.takes) ? (seg.takes as Array<Record<string, unknown>>) : []
    const updatedTakes = takes.map((take) => {
      if (payload.takeId && take.id !== payload.takeId) return take
      if (!payload.takeId && take.assetUrl !== seg.activeAssetUrl) return take
      return {
        ...take,
        stemSeparation,
      }
    })
    return {
      ...seg,
      stemSeparation,
      takes: updatedTakes,
    }
  })

  return {
    ...productionData,
    [sceneId]: {
      ...scene,
      segments: updatedSegments,
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as StemCallbackPayload
    if (!payload.jobId || !payload.status) {
      return NextResponse.json({ error: 'jobId and status are required' }, { status: 400 })
    }

    const progress = payload.progress ?? (payload.status === 'COMPLETED' ? 100 : payload.status === 'FAILED' ? 0 : 25)
    updateJobStatus(payload.jobId, {
      status: payload.status,
      progress,
      error: payload.error,
      downloadUrl: payload.backgroundStemUrl,
    })

    if (payload.status === 'COMPLETED' || payload.status === 'FAILED') {
      setJobStatus(payload.jobId, {
        status: payload.status,
        progress,
        error: payload.error,
        downloadUrl: payload.backgroundStemUrl,
        createdAt: new Date().toISOString(),
      })
    }

    if (payload.projectId && payload.sceneId && payload.segmentId) {
      const project = await Project.findByPk(payload.projectId)
      if (project) {
        const metadata = (project.metadata || {}) as Record<string, any>
        const visionPhase = (metadata.visionPhase || {}) as Record<string, any>
        const production = (visionPhase.production || {}) as Record<string, any>
        const scenes = (production.scenes || {}) as Record<string, unknown>
        const updatedScenes = upsertSegmentStem(scenes, payload)

        await project.update({
          metadata: {
            ...metadata,
            visionPhase: {
              ...visionPhase,
              production: {
                ...production,
                lastUpdated: new Date().toISOString(),
                scenes: updatedScenes,
              },
            },
          },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Stem Callback] Failed to process callback:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process stem callback' },
      { status: 500 }
    )
  }
}
