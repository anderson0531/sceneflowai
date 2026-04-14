import { describe, it, expect } from 'vitest'
import { expandDirectionsForTimelineAudioBudget } from '@/lib/scene/expandDirectionsForTimelineAudioBudget'

describe('expandDirectionsForTimelineAudioBudget', () => {
  it('keeps split prompts clean while preserving continuation metadata', () => {
    const rawDirections = [
      {
        sequence: 1,
        estimated_duration: 18,
        dialogue_indices: [0],
        trigger_reason: 'Long spoken line',
        video_generation_prompt: 'Static medium shot. Character speaks with controlled confidence.',
      },
    ]

    const sceneData = {
      combinedAudioTimeline: [
        {
          index: 0,
          type: 'dialogue',
          character: 'DR. BENJAMIN ANDERSON',
          text: 'And to truly understand the architects of this future...',
          estimatedDuration: 18,
          dialogueScriptIndex: 0,
        },
      ],
    } as any

    const expanded = expandDirectionsForTimelineAudioBudget(rawDirections, sceneData, 12)

    expect(expanded.length).toBe(2)
    expect(expanded[0].video_generation_prompt).toBe(rawDirections[0].video_generation_prompt)
    expect(expanded[1].video_generation_prompt).toBe(rawDirections[0].video_generation_prompt)
    expect(expanded[0].video_generation_prompt).not.toContain('[Continuation')
    expect(expanded[1].video_generation_prompt).not.toContain('[Continuation')

    expect(expanded[0].veoTimelineContinuation).toBeFalsy()
    expect(expanded[1].veoTimelineContinuation).toBe(true)
    expect(expanded[0].dialogue_indices).toEqual([0])
    expect(expanded[1].dialogue_indices).toEqual([])
  })
})
