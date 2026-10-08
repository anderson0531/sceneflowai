import { describe, expect, it } from 'vitest'
import { libraryAgentChecklist } from '@/lib/vision/libraryAgentSelection'

const cast = {
  id: 'c1',
  name: 'Mira',
  type: 'lead',
  referenceImage: '',
  sceneNumbers: [2, 1],
}

describe('libraryAgentChecklist', () => {
  const input = {
    characters: [
      cast,
      { id: 'c2', name: 'Jon', type: 'supporting', referenceImage: 'https://cdn/jon.png' },
      { id: 'nar', name: 'Narrator', type: 'narrator', referenceImage: '' },
    ],
    locations: [
      { id: 'l1', location: 'Dockyard', imageUrl: '', sceneNumbers: [1] },
      { id: 'l2', location: 'Lab', imageUrl: 'https://cdn/lab.png' },
    ],
    props: [
      { id: 'p1', name: 'Brass key', imageUrl: '' },
      { id: 'p2', name: 'Lamp', imageUrl: 'https://cdn/lamp.png' },
    ],
  }

  it('lists missing base stills and skips narrators', () => {
    const rows = libraryAgentChecklist(input, 'missing')
    expect(rows.map((row) => row.key)).toEqual(['cast:c1', 'location:l1', 'prop:p1'])
    expect(rows[0]).toMatchObject({ name: 'Mira', sceneNumbers: [1, 2], hasImage: false })
  })

  it('lists only bases that already have an image when regenerating', () => {
    const rows = libraryAgentChecklist(input, 'regenerate')
    expect(rows.map((row) => `${row.kind}:${row.name}`)).toEqual([
      'cast:Jon',
      'location:Lab',
      'prop:Lamp',
    ])
    expect(rows.every((row) => row.hasImage)).toBe(true)
  })
})
