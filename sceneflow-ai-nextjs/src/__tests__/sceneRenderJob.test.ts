import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Op } from 'sequelize'

type Row = {
  id: string
  user_id: string
  project_id: string
  job_type: string
  status: string
  progress: number
  payload: Record<string, unknown>
  result: Record<string, unknown> | null
  error: string | null
}

const state = vi.hoisted(() => ({
  row: null as Row | null,
  metadata: {} as Record<string, unknown>,
  projectUpdate: vi.fn(),
}))

vi.mock('@/models', () => ({}))

vi.mock('@/lib/render/jobStatusStore', () => ({
  getJobStatusAsync: vi.fn(async () => null),
}))

vi.mock('@/lib/gcs/renderStorage', () => ({
  getSignedDownloadUrl: vi.fn(async () => null),
}))

vi.mock('@/models/Project', () => ({
  default: {
    findByPk: vi.fn(async () => ({
      get metadata() {
        return state.metadata
      },
      update: state.projectUpdate,
    })),
  },
}))

function statusAllowed(whereStatus: unknown, current: string): boolean {
  if (whereStatus == null) return true
  if (typeof whereStatus === 'string') return whereStatus === current
  if (typeof whereStatus === 'object' && whereStatus && Op.in in whereStatus) {
    const allowed = (whereStatus as Record<symbol, string[]>)[Op.in] ?? []
    return allowed.includes(current)
  }
  return false
}

vi.mock('@/models/GenerationJob', () => ({
  default: {
    findOne: vi.fn(async (options: { where: Record<string, unknown> }) => {
      const row = state.row
      if (!row) return null
      const where = options.where
      if (where.job_type && where.job_type !== row.job_type) return null
      if (where.id && where.id !== row.id) return null
      if (where.user_id && where.user_id !== row.user_id) return null
      const payloadClause = where.payload as
        | Record<symbol, { renderJobId?: string }>
        | undefined
      const wanted = payloadClause?.[Op.contains]?.renderJobId
      if (wanted && wanted !== row.payload.renderJobId) return null
      return row
    }),
    update: vi.fn(async (patch: Partial<Row>, options: { where: Record<string, unknown> }) => {
      const row = state.row
      if (!row) return [0]
      if (options.where.id && options.where.id !== row.id) return [0]
      if (!statusAllowed(options.where.status, row.status)) return [0]
      Object.assign(row, patch)
      return [1]
    }),
  },
}))

vi.mock('@/lib/jobs/jobService', () => ({
  notifyUser: vi.fn(async () => {}),
  updateGenerationJob: vi.fn(async (_id: string, patch: Partial<Row>) => {
    if (state.row) Object.assign(state.row, patch)
  }),
  createGenerationJob: vi.fn(),
  findActiveJob: vi.fn(),
}))

import { notifyUser } from '@/lib/jobs/jobService'
import { recordSceneRenderCallback } from '@/lib/jobs/sceneRenderJob'

const DOWNLOAD = 'https://storage.googleapis.com/bucket/outputs/render-1.mp4'

function seed() {
  state.metadata = {
    visionPhase: {
      production: {
        scenes: {
          'scene-1': {
            isSegmented: true,
            targetSegmentDuration: 10,
            segments: [],
            productionStreams: [
              {
                id: 'existing',
                language: 'en',
                languageLabel: 'English',
                status: 'complete',
                streamType: 'video',
                streamVersion: 1,
                mp4Url: 'https://blob.example/old.mp4',
              },
            ],
            renderedSceneUrl: 'https://blob.example/old.mp4',
          },
        },
      },
    },
  }
  state.row = {
    id: 'gen-1',
    user_id: 'user-1',
    project_id: 'project-1',
    job_type: 'scene_render',
    status: 'processing',
    progress: 5,
    payload: {
      renderJobId: 'render-1',
      sceneId: 'scene-1',
      sceneNumber: 2,
      language: 'en',
      languageLabel: 'English',
      streamType: 'video',
      durationSeconds: 12,
      mode: 'cloud',
    },
    result: null,
    error: null,
  }
  state.projectUpdate.mockReset()
  state.projectUpdate.mockImplementation(async (patch: { metadata: Record<string, unknown> }) => {
    state.metadata = patch.metadata
  })
  vi.mocked(notifyUser).mockClear()
}

function sceneData() {
  const vision = state.metadata.visionPhase as {
    production: { scenes: Record<string, { productionStreams: Array<Record<string, unknown>>; renderedSceneUrl?: string }> }
  }
  return vision.production.scenes['scene-1']
}

describe('recordSceneRenderCallback', () => {
  beforeEach(() => {
    seed()
  })

  it('persists the stream once and notifies', async () => {
    await recordSceneRenderCallback({
      renderJobId: 'render-1',
      phase: 'completed',
      downloadUrl: DOWNLOAD,
    })

    const scene = sceneData()
    const stream = scene.productionStreams.find((item) => item.id === 'scene-render-gen-1')
    expect(stream).toMatchObject({
      mp4Url: DOWNLOAD,
      streamVersion: 2,
      language: 'en',
      streamType: 'video',
      source: 'render',
      status: 'complete',
    })
    expect(scene.productionStreams).toHaveLength(2)
    expect(scene.renderedSceneUrl).toBe(DOWNLOAD)
    expect(state.row?.status).toBe('completed')
    expect(state.row?.result).toMatchObject({ downloadUrl: DOWNLOAD, promoted: false })
    expect(state.projectUpdate).toHaveBeenCalledTimes(1)
    expect(notifyUser).toHaveBeenCalledTimes(1)
    expect(notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'job_completed',
        title: 'Scene render ready',
        message: 'Scene 2 is ready to watch.',
        userId: 'user-1',
        projectId: 'project-1',
        jobId: 'gen-1',
      })
    )
  })

  it('treats a second completion as a no-op', async () => {
    await recordSceneRenderCallback({
      renderJobId: 'render-1',
      phase: 'completed',
      downloadUrl: DOWNLOAD,
    })
    await recordSceneRenderCallback({
      renderJobId: 'render-1',
      phase: 'completed',
      downloadUrl: 'https://storage.googleapis.com/bucket/outputs/again.mp4',
    })

    expect(state.projectUpdate).toHaveBeenCalledTimes(1)
    expect(notifyUser).toHaveBeenCalledTimes(1)
    expect(sceneData().renderedSceneUrl).toBe(DOWNLOAD)
  })

  it('notifies on failure and does not write a stream', async () => {
    await recordSceneRenderCallback({
      renderJobId: 'render-1',
      phase: 'failed',
      error: 'encode crashed',
    })

    expect(state.projectUpdate).not.toHaveBeenCalled()
    expect(state.row?.status).toBe('failed')
    expect(state.row?.error).toBe('encode crashed')
    expect(notifyUser).toHaveBeenCalledTimes(1)
    expect(notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'job_failed',
        title: 'Scene render failed',
        message: 'Scene 2 did not finish. encode crashed',
      })
    )
  })
})
