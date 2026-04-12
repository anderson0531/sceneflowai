import { describe, it, expect } from 'vitest'
import {
  composeGuidePromptFromElements,
  buildDefaultBatchGuidePrompt,
  type GuideAudioElement,
} from '@/lib/scene/segmentGuidePrompt'
import type { SceneSegment } from '@/components/vision/scene-production/types'

describe('segmentGuidePrompt', () => {
  it('composeGuidePromptFromElements formats dialogue for Veo', () => {
    const elements: GuideAudioElement[] = [
      {
        id: 'd1',
        type: 'dialogue',
        label: 'ALICE',
        content: 'Hello there.',
        character: 'ALICE',
        selected: true,
        portionStart: 0,
        portionEnd: 100,
      },
    ]
    const out = composeGuidePromptFromElements(elements, {})
    expect(out).toContain('ALICE speaks the following line')
    expect(out).toContain("'Hello there.'")
  })

  it('buildDefaultBatchGuidePrompt uses assigned dialogueLineIds only', () => {
    const segment = {
      segmentId: 's1',
      sequenceIndex: 0,
      startTime: 0,
      endTime: 8,
      dialogueLineIds: ['dialogue-0'],
      action: 'She leans forward.',
    } as unknown as SceneSegment

    const scene = {
      dialogue: [{ character: 'ALICE', text: 'Hello world.' }],
      visualDescription: 'Office interior.',
    }

    const prompt = buildDefaultBatchGuidePrompt(segment, scene, [])
    expect(prompt).toContain('ALICE')
    expect(prompt).toContain('Hello world')
    expect(prompt.toLowerCase()).toMatch(/office|leans|forward/)
  })

  it('returns empty when no dialogue assignment and no direction text', () => {
    const segment = {
      segmentId: 's1',
      sequenceIndex: 0,
      startTime: 0,
      endTime: 8,
    } as unknown as SceneSegment

    expect(buildDefaultBatchGuidePrompt(segment, {}, [])).toBe('')
  })
})
