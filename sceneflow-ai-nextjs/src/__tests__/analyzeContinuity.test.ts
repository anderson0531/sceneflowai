import { describe, it, expect } from 'vitest'
import type { ContinuityIssue } from '@/lib/series/analyzeContinuity'

describe('analyzeContinuity', () => {
  it('exports analyzeContinuity from lib', async () => {
    const { analyzeContinuity } = await import('@/lib/series/analyzeContinuity')
    const result = analyzeContinuity(
      {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        logline: 'Test',
        synopsis: 'Test synopsis',
        setting: 'Earth',
        protagonist: { characterId: 'c1', name: 'Hero', goal: 'Win' },
        antagonistConflict: { type: 'society', description: 'System' },
        aesthetic: {},
        characters: [{ id: 'c1', name: 'Hero', role: 'protagonist', description: '', appearance: '', createdAt: '', updatedAt: '' }],
        locations: [],
        keyEvents: [
          {
            id: 'ke1',
            episodeNumber: 1,
            type: 'death',
            description: 'Hero dies',
            affectedCharacterIds: ['c1'],
            irreversible: true,
            createdAt: new Date().toISOString(),
          },
        ],
      },
      [
        {
          id: 'ep2',
          episodeNumber: 2,
          title: 'Return',
          logline: 'Hero returns',
          synopsis: 'Hero is back',
          beats: [],
          characters: [{ characterId: 'c1', role: 'protagonist' }],
          status: 'blueprint',
        },
      ]
    )
    expect(result.issues.some((i: ContinuityIssue) => i.severity === 'error')).toBe(true)
  })
})
