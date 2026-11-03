import fs from 'fs'
import path from 'path'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  buildScriptChunkPlanSignature,
  restoreCompletedChunksFromCheckpoint,
  isActiveScriptGenerationJobFresh,
} from '@/lib/script/scriptGenerationCheckpoint'
import type { SceneChunk } from '@/lib/script/sceneChunkPlan'

const {
  mockNotificationCreate,
  mockUserFindByPk,
  mockSendWebPushToUser,
  mockSendEmail,
  mockSequelizeQuery,
} = vi.hoisted(() => ({
  mockNotificationCreate: vi.fn(),
  mockUserFindByPk: vi.fn(),
  mockSendWebPushToUser: vi.fn(),
  mockSendEmail: vi.fn(),
  mockSequelizeQuery: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/config/database', () => ({
  sequelize: {
    query: mockSequelizeQuery,
  },
}))

vi.mock('@/lib/database/schemaProbe', () => ({
  hasTables: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/models', () => ({}))

vi.mock('@/models/GenerationJob', () => ({
  default: {
    create: vi.fn(),
    update: vi.fn(),
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
  },
}))

vi.mock('@/models/Notification', () => ({
  default: {
    create: mockNotificationCreate,
    findAll: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/models/User', () => ({
  default: {
    findByPk: mockUserFindByPk,
  },
}))

vi.mock('@/lib/notifications/webPush', () => ({
  sendWebPushToUser: mockSendWebPushToUser,
}))

vi.mock('@/lib/email/resendClient', () => ({
  getAppBaseUrl: () => 'https://sceneflowai.studio',
  getBrandBadgeUrl: () => 'https://sceneflowai.studio/SF-Badge-64.png',
  sendEmail: mockSendEmail,
}))

describe('Script generation background job, checkpointing, and notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generate-script-v2 route uses projectFormat (never bare format) and registers background execution with after()', () => {
    const routePath = path.join(
      process.cwd(),
      'src/app/api/vision/generate-script-v2/route.ts'
    )
    const src = fs.readFileSync(routePath, 'utf8')

    // Regression: `if (format !== 'podcast')` inside POST threw `ReferenceError: format is not defined`
    expect(src).toContain("if (projectFormat !== 'podcast')")
    expect(src).not.toMatch(/if\s*\(\s*format\s*!==\s*['"]podcast['"]\s*\)/)

    // Background execution + checkpointing + notifications
    expect(src).toContain("import { NextRequest, NextResponse, after } from 'next/server'")
    expect(src).toContain("jobType: 'script_generation'")
    expect(src).toContain('scriptGenerationCheckpoint')
    expect(src).toContain('after(async () => {')
    expect(src).toContain('sendEmail: true')
  })

  it('vision page handles SSE error events outside JSON.parse catch and does not re-run script generation on reload once scriptGenerated is true', () => {
    const pagePath = path.join(
      process.cwd(),
      'src/app/dashboard/workflow/vision/[projectId]/page.tsx'
    )
    const src = fs.readFileSync(pagePath, 'utf8')

    // Regression: loadProject should only auto-initiate script generation when !visionPhase.scriptGenerated
    expect(src).toContain('if (!skipAutoGeneration && !visionPhase.scriptGenerated)')
    expect(src).not.toContain(
      'if (!skipAutoGeneration && (!visionPhase.scriptGenerated || !visionPhase.charactersGenerated || !visionPhase.scenesGenerated))'
    )

    // Regression: JSON.parse has its own try/catch with `continue` so `throw new Error(data.error...)` is not swallowed
    const generateScriptIdx = src.indexOf('const generateScript = async (')
    const generateCharactersIdx = src.indexOf('const generateCharacters = async () => {')
    expect(generateScriptIdx).toBeGreaterThan(0)
    expect(generateCharactersIdx).toBeGreaterThan(generateScriptIdx)
    const generateScriptSlice = src.slice(generateScriptIdx, generateCharactersIdx)
    expect(generateScriptSlice).toContain('data = JSON.parse(line.slice(6))')
    expect(generateScriptSlice).toContain("} else if (data.type === 'error') {")
    expect(generateScriptSlice).toContain("throw new Error(data.error || 'Script generation failed')")

    // Tracks script_generation background job
    expect(src).toContain("jobType: 'script_generation'")
  })

  it('AnimatedProcessingOverlay allows continuing in the background during script-generation', () => {
    const overlayPath = path.join(
      process.cwd(),
      'src/components/AnimatedProcessingOverlay.tsx'
    )
    const src = fs.readFileSync(overlayPath, 'utf8')
    expect(src).toContain("operationType === 'script-generation'")
    expect(src).toContain('Continue in Background')
  })

  it('checkpoints and restores completed chunks when planSignature matches', () => {
    const chunks: SceneChunk[] = [
      {
        blueprintBeatIndex: 0,
        beatTitle: 'Act I',
        beatDescription: 'Opening',
        partIndex: 1,
        partCount: 1,
        sceneCount: 2,
        sceneNumberStart: 1,
      },
      {
        blueprintBeatIndex: 1,
        beatTitle: 'Act II',
        beatDescription: 'Escalation',
        partIndex: 1,
        partCount: 1,
        sceneCount: 3,
        sceneNumberStart: 3,
      },
    ]

    const sig = buildScriptChunkPlanSignature(chunks)
    expect(sig).toBe('0:1/1:1:2|1:1/1:3:3')

    const restored = restoreCompletedChunksFromCheckpoint(
      {
        jobId: 'job-123',
        planSignature: sig,
        updatedAt: new Date().toISOString(),
        scenesGenerated: 2,
        totalScenes: 5,
        completedChunks: {
          '0': [{ sceneNumber: 1, heading: 'EXT. HARBOR - NIGHT' }, { sceneNumber: 2, heading: 'INT. CABIN - NIGHT' }],
        },
      },
      sig,
      chunks.length
    )

    expect(restored.restoredChunksCount).toBe(1)
    expect(restored.restoredScenesCount).toBe(2)
    expect(restored.completedChunks[0]).toHaveLength(2)
    expect(restored.completedChunks[1]).toBeUndefined()

    // Mismatched signature returns empty
    const mismatched = restoreCompletedChunksFromCheckpoint(
      {
        planSignature: 'different-plan',
        completedChunks: { '0': [{ sceneNumber: 1 }] },
      },
      sig,
      chunks.length
    )
    expect(mismatched.restoredChunksCount).toBe(0)
    expect(mismatched.restoredScenesCount).toBe(0)
  })

  it('detects fresh vs stale active script_generation jobs by heartbeat timestamp', () => {
    const now = 1_700_000_000_000
    expect(
      isActiveScriptGenerationJobFresh(
        { status: 'processing', updated_at: new Date(now - 15_000).toISOString() },
        90_000,
        now
      )
    ).toBe(true)

    expect(
      isActiveScriptGenerationJobFresh(
        { status: 'processing', updated_at: new Date(now - 120_000).toISOString() },
        90_000,
        now
      )
    ).toBe(false)

    expect(
      isActiveScriptGenerationJobFresh(
        { status: 'completed', updated_at: new Date(now - 5_000).toISOString() },
        90_000,
        now
      )
    ).toBe(false)
  })

  it('notifyUser dispatches in-app notification, mobile web push, and email for script_generation', async () => {
    mockUserFindByPk.mockResolvedValue({
      id: 'user-1',
      email: 'director@example.com',
    })
    mockNotificationCreate.mockResolvedValue({ id: 'notif-1' })
    mockSendWebPushToUser.mockResolvedValue({ sent: 1 })
    mockSendEmail.mockResolvedValue({ id: 'email-1', skipped: false })

    const { notifyUser } = await import('@/lib/jobs/jobService')

    await notifyUser({
      userId: 'user-1',
      projectId: 'proj-42',
      jobId: 'job-99',
      type: 'job_completed',
      title: 'Script ready: "The Last Lighthouse"',
      message: '23 scenes generated and ready in the Production Stage.',
      metadata: {
        kind: 'script_generation',
        totalScenes: 23,
        productionUrl: '/dashboard/workflow/vision/proj-42',
      },
      sendEmail: true,
    })

    expect(mockNotificationCreate).toHaveBeenCalledTimes(1)
    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        project_id: 'proj-42',
        job_id: 'job-99',
        type: 'job_completed',
        title: 'Script ready: "The Last Lighthouse"',
      })
    )

    expect(mockSendWebPushToUser).toHaveBeenCalledTimes(1)
    expect(mockSendWebPushToUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        title: 'Script ready: "The Last Lighthouse"',
        message: '23 scenes generated and ready in the Production Stage.',
      })
    )

    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'director@example.com',
        subject: 'Script ready: "The Last Lighthouse"',
        allowFallbackFrom: true,
      })
    )
    const emailCall = mockSendEmail.mock.calls[0][0]
    expect(emailCall.html).toContain('/dashboard/workflow/vision/proj-42')
    expect(emailCall.html).toContain('Open Production Stage')
  })
})
