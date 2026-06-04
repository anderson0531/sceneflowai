import { describe, expect, it } from 'vitest'
import { buildFalKlingVideoInput } from '@/lib/fal/klingPolicyClient'

describe('buildFalKlingVideoInput', () => {
  it('maps T2V fields', () => {
    const input = buildFalKlingVideoInput({
      prompt: 'A calm street',
      negative_prompt: 'blur',
      duration: 8,
      aspect_ratio: '16:9',
    })
    expect(input.prompt).toBe('A calm street')
    expect(input.negative_prompt).toBe('blur')
    expect(input.duration).toBe('10')
    expect(input.aspect_ratio).toBe('16:9')
    expect(input.start_image_url).toBeUndefined()
  })

  it('maps I2V + FTV end frame fields', () => {
    const input = buildFalKlingVideoInput({
      prompt: 'Motion between frames',
      startFrame: 'https://example.com/start.png',
      lastFrame: 'https://example.com/end.png',
      duration: 5,
      aspect_ratio: '9:16',
    })
    expect(input.start_image_url).toBe('https://example.com/start.png')
    expect(input.end_image_url).toBe('https://example.com/end.png')
    expect(input.tail_image_url).toBe('https://example.com/end.png')
    expect(input.aspect_ratio).toBe('9:16')
    expect(input.duration).toBe('5')
  })
})
