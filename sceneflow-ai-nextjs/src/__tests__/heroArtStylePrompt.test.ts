import { describe, expect, it } from 'vitest'
import { DEFAULT_PROMPT_TEMPLATES } from '@/types/treatment-visuals'

const HERO = {
  title: 'Harbor',
  genre: 'drama',
  mood: 'tense',
  setting: 'a dock at night',
  synopsis: 'Pilots guide ships through one winter.',
}

describe('hero billboard art style', () => {
  it('keeps the live-action poster line for photorealistic', () => {
    const prompt = DEFAULT_PROMPT_TEMPLATES.heroImage({
      ...HERO,
      artStyle: 'photorealistic',
    })
    expect(prompt).toContain('ultra-realistic')
    expect(prompt).toContain('Cinematic movie poster')
  })

  it('uses the preset suffix and drops ultra-realistic poster language for other styles', () => {
    const prompt = DEFAULT_PROMPT_TEMPLATES.heroImage({
      ...HERO,
      artStyle: 'ghibli',
    })
    expect(prompt).toContain('Studio Ghibli style, watercolor aesthetic')
    expect(prompt).not.toContain('ultra-realistic')
    expect(prompt).not.toContain('Cinematic movie poster')
  })
})
