import { describe, expect, it } from 'vitest'
import { buildBlueprintNarrationText } from '@/lib/blueprint/buildBlueprintNarrationText'

describe('buildBlueprintNarrationText', () => {
  it('builds synopsis narration from logline and synopsis', () => {
    const text = buildBlueprintNarrationText(
      {
        logline: 'A detective hunts truth',
        synopsis: 'She uncovers a conspiracy.',
      },
      'synopsis'
    )
    expect(text).toContain('A detective hunts truth')
    expect(text).toContain('She uncovers a conspiracy.')
  })

  it('builds beat-by-beat narration', () => {
    const text = buildBlueprintNarrationText(
      {
        beats: [{ title: 'Hook', synopsis: 'Open strong', minutes: 2 }],
      },
      'beats'
    )
    expect(text).toBe('1. Hook — Open strong')
  })
})
