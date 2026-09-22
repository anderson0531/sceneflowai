import { describe, expect, it } from 'vitest'
import { enforceVideoGenerationUnlock } from '@/lib/script/enforceVideoGenerationUnlock'

function mockProject(scenes: Record<string, unknown>[]) {
  const project = {
    metadata: {
      visionPhase: { script: { script: { scenes } } },
    } as Record<string, unknown>,
    update: async (values: { metadata: unknown }) => {
      project.metadata = values.metadata as Record<string, unknown>
    },
  }
  return project
}

describe('enforceVideoGenerationUnlock', () => {
  it('403s dramatic scenes that are not approved', async () => {
    const project = mockProject([
      {
        id: 'scene-lab',
        heading: 'INT. LAB - NIGHT',
        storyboardStatus: 'pending_review',
        beats: [
          {
            beatId: 'bt_0',
            sequenceIndex: 0,
            kind: 'action',
            actionDescription: 'Wide',
            storyboardImageUrl: 'https://example.com/lab.jpg',
          },
        ],
      },
    ])
    const result = await enforceVideoGenerationUnlock(project, 'scene-lab')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(403)
      const body = await result.response.json()
      expect(body.code).toBe('STORYBOARD_NOT_APPROVED')
    }
  })

  it('stamps cinematic title sequences approved when frames are complete', async () => {
    const project = mockProject([
      {
        id: 'cinematic-title-fallback-1',
        cinematicType: 'title',
        storyboardStatus: 'pending_review',
        beats: [
          {
            beatId: 'bt_0',
            sequenceIndex: 0,
            kind: 'action',
            actionDescription: 'Title card',
            storyboardImageUrl: 'https://example.com/title.jpg',
          },
        ],
      },
    ])
    const result = await enforceVideoGenerationUnlock(project, 'cinematic-title-fallback-1')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.scene?.storyboardStatus).toBe('approved')
    }
    const scenes = (project.metadata as { visionPhase: { script: { script: { scenes: Array<{ storyboardStatus?: string }> } } } })
      .visionPhase.script.script.scenes
    expect(scenes[0].storyboardStatus).toBe('approved')
  })
})
