import { describe, it, expect } from 'vitest'
import {
  buildFinalCutSelectionRequestBody,
  finalCutSelectionApiPath,
} from '@/lib/final-cut/persistFinalCutSelection'
import type { FinalCutSelection } from '@/lib/types/finalCut'

describe('persistFinalCutSelection helpers', () => {
  it('builds the final-cut API path', () => {
    expect(finalCutSelectionApiPath('0ea0f025-2b3b-4410-890f-bb9f34aa7123')).toBe(
      '/api/projects/0ea0f025-2b3b-4410-890f-bb9f34aa7123/final-cut'
    )
  })

  it('serializes only finalCut in the request body', () => {
    const selection: FinalCutSelection = {
      format: 'full-video',
      language: 'en',
      presetId: 'custom',
      perSceneOverrides: {
        'scene-1': { streamType: 'video', language: 'en', streamVersion: 1 },
      },
    }

    const body = JSON.parse(buildFinalCutSelectionRequestBody(selection))
    expect(body).toEqual({ finalCut: selection })
    expect(body.metadata).toBeUndefined()
  })
})
