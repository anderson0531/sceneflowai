import { describe, it, expect, vi, beforeEach } from 'vitest'
import { persistBlueprintARToProject } from '@/lib/treatment/persistBlueprintAR'
import {
  deductionsFromRecommendations,
  gapTextForRecommendation,
  normalizeLegacyAnalysis,
} from '@/lib/treatment/blueprintAudienceScorer'
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

describe('analyses persisted before gaps and fixes merged', () => {
  // Shape written by the previous route: two lists authored independently,
  // recommendations with no reason and positional ids.
  const legacyPersisted: PersistedBlueprintAudienceResonance = {
    ...persistedFixture,
    analysis: {
      ...persistedFixture.analysis,
      overallScore: 74,
      isReadyForProduction: false,
      deductions: [
        { reason: 'Antagonist has no want', points: 14, category: 'Character' },
        { reason: 'Act two loses momentum', points: 7, category: 'Pacing' },
      ],
      recommendations: [
        {
          id: 'rec-0',
          text: 'Give the rival a concrete objective that collides with the hero.',
          priority: 'critical',
          pointsDeducted: 14,
          fixSection: 'characters',
        },
        {
          id: 'rec-1',
          text: 'Add a midpoint reversal that resets the stakes.',
          priority: 'medium',
          pointsDeducted: 7,
          fixSection: 'beats',
        },
      ],
    },
  }

  it('renders every gap without a re-analysis', () => {
    const recs = normalizeLegacyAnalysis(legacyPersisted.analysis)!.recommendations

    expect(recs.map((r) => gapTextForRecommendation(r))).toEqual([
      'Antagonist has no want',
      'Act two loses momentum',
    ])
  })

  it('keeps the recovered breakdown consistent with the stored one', () => {
    const recs = normalizeLegacyAnalysis(legacyPersisted.analysis)!.recommendations
    const derived = deductionsFromRecommendations(recs)
    const total = (points: number[]) => points.reduce((sum, p) => sum + p, 0)

    expect(total(derived.map((d) => d.points))).toBe(
      total(legacyPersisted.analysis.deductions.map((d) => d.points))
    )
    expect(derived.map((d) => d.reason)).toEqual(
      legacyPersisted.analysis.deductions.map((d) => d.reason)
    )
  })
})
