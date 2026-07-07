import { describe, expect, it } from 'vitest'
import { buildSceneImageSystemPrompt } from '@/lib/intelligence/scene-image-intelligence'

describe('buildSceneImageSystemPrompt', () => {
  it('requires in-scene performance and camera awareness', () => {
    const prompt = buildSceneImageSystemPrompt()
    expect(prompt).toMatch(/CAMERA AWARENESS/i)
    expect(prompt).toMatch(/unaware of the camera/i)
    expect(prompt).toMatch(/mid-action/i)
    expect(prompt).toMatch(/body blocking, gesture/i)
    expect(prompt).toMatch(/NOT looking at the camera/i)
  })

  it('does not collapse action into a neutral standing pose', () => {
    const prompt = buildSceneImageSystemPrompt()
    expect(prompt).not.toMatch(/single pose\/position/i)
    expect(prompt).toMatch(/Do NOT reduce it to a neutral standing pose/i)
  })
})
