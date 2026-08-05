import { describe, it, expect, vi, beforeEach } from 'vitest'
import { persistBlueprintARToProject } from '@/lib/treatment/persistBlueprintAR'
import type { PersistedBlueprintAudienceResonance } from '@/lib/types/audienceResonance'

const mockAuthenticate = vi.fn()
const mockAssertProjectAccess = vi.fn()
const mockSave = vi.fn()

vi.mock('@/config/database', () => ({
  sequelize: {
    authenticate: (...args: unknown[]) => mockAuthenticate(...args),
  },
}))

vi.mock('@/lib/projectAccess', () => ({
  assertProjectAccess: (...args: unknown[]) => mockAssertProjectAccess(...args),
}))

const persistedFixture: PersistedBlueprintAudienceResonance = {
  iterationCount: 1,
  appliedRecommendationIds: [],
  lastAnalyzedAt: '2026-08-03T00:00:00.000Z',
  lastSavedAt: '2026-08-03T00:00:00.000Z',
  audienceDefinition: {
    presetId: null,
    description: 'Test audience',
    culturalSignals: [],
  },
  analysis: {
    version: 3,
    treatmentId: 'current',
    overallScore: 82,
    baseScore: 100,
    deductions: [],
    recommendations: [],
    categories: [],
    strengths: [],
    improvements: [],
    summary: 'Solid fit',
    audienceDefinition: {
      presetId: null,
      description: 'Test audience',
      culturalSignals: [],
    },
    isReadyForProduction: true,
    generatedAt: '2026-08-03T00:00:00.000Z',
    creditsUsed: 1,
  },
}

describe('persistBlueprintARToProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthenticate.mockResolvedValue(undefined)
  })

  it('uses assertProjectAccess and merges metadata on success', async () => {
    const project = {
      metadata: { existingKey: 'keep' },
      set: vi.fn(),
      changed: vi.fn(),
      save: mockSave.mockResolvedValue(undefined),
    }
    mockAssertProjectAccess.mockResolvedValue({ ok: true, project })

    await persistBlueprintARToProject(
      'project-1',
      persistedFixture,
      'owner-uuid',
      'legacy-local-id'
    )

    expect(mockAssertProjectAccess).toHaveBeenCalledWith(
      'project-1',
      'owner-uuid',
      'legacy-local-id'
    )
    expect(project.set).toHaveBeenCalledWith('metadata', {
      existingKey: 'keep',
      audienceDefinition: persistedFixture.audienceDefinition,
      blueprintAudienceResonance: persistedFixture,
    })
    expect(project.changed).toHaveBeenCalledWith('metadata', true)
    expect(mockSave).toHaveBeenCalled()
  })

  it('throws access error when assertProjectAccess fails', async () => {
    mockAssertProjectAccess.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'You do not have permission to share this project',
    })

    await expect(
      persistBlueprintARToProject('project-1', persistedFixture, 'other-user')
    ).rejects.toThrow('You do not have permission to share this project')
  })
})
