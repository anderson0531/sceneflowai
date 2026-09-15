import { describe, expect, it } from 'vitest'
import {
  mapSceneImageToKlingOmni,
} from '@/lib/kling/klingOmniImagePromptMapper'
import type { PrioritizedReferenceImage } from '@/lib/vision/referenceLimits'

describe('mapSceneImageToKlingOmni', () => {
  it('maps person tokens to <<<elementId>>> and location/prop refs to <<<image_N>>>', () => {
    const selectedReferences: PrioritizedReferenceImage[] = [
      {
        imageUrl: 'https://example.com/piper.jpg',
        name: 'Piper Hayes',
        role: 'identity',
        refRole: 'identity',
        characterName: 'Piper Hayes',
        subjectOrdinal: 1,
        sendIndex: 1,
      },
      {
        imageUrl: 'https://example.com/tunnel.jpg',
        name: 'Brick tunnel',
        role: 'location',
        locationName: 'Brick tunnel',
        sendIndex: 2,
      },
      {
        imageUrl: 'https://example.com/spanner.jpg',
        name: 'spanner',
        role: 'prop-critical',
        propName: 'spanner',
        promptToken: 'prop [6]',
        sendIndex: 3,
      },
    ]

    const mapped = mapSceneImageToKlingOmni({
      scenePrompt:
        'person [1] pulls the dispatch cylinder from under her coat to her chest with both hands. Location reference 2. Match prop [6].',
      selectedReferences,
      characterOrdinals: [{ name: 'Piper Hayes', subjectOrdinal: 1 }],
      characterElementIds: new Map([['Piper Hayes', 'elem_piper_1']]),
    })

    expect(mapped.prompt).toContain('<<<elem_piper_1>>>')
    expect(mapped.prompt).not.toMatch(/person\s*\[\s*1\s*\]/i)
    expect(mapped.prompt).toContain('<<<image_1>>>')
    expect(mapped.prompt).toContain('<<<image_2>>>')
    expect(mapped.prompt).not.toContain('@Element')
    expect(mapped.prompt).not.toContain('stage prop')
    expect(mapped.elementList).toEqual([{ element_id: 'elem_piper_1' }])
    expect(mapped.imageList).toEqual([
      { image: 'https://example.com/tunnel.jpg' },
      { image: 'https://example.com/spanner.jpg' },
    ])
  })

  it('does not rewrite Creative original action language', () => {
    const selectedReferences: PrioritizedReferenceImage[] = [
      {
        imageUrl: 'https://example.com/gideon.jpg',
        name: 'Gideon',
        role: 'identity',
        refRole: 'identity',
        characterName: 'Gideon',
        subjectOrdinal: 2,
      },
    ]
    const original =
      'Gideon plants the steel spanner beside person [2]\'s shoulder to block her path.'
    const mapped = mapSceneImageToKlingOmni({
      scenePrompt: original,
      selectedReferences,
      characterElementIds: new Map([['Gideon', 'elem_gideon']]),
    })
    expect(mapped.prompt).toContain('steel spanner')
    expect(mapped.prompt).toContain('<<<elem_gideon>>>')
    expect(mapped.prompt).not.toContain('stage prop')
    expect(mapped.prompt).toContain("to block her path")
  })
})
