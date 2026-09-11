import { describe, it, expect } from 'vitest'
import {
  MIN_BEATS_FOR_LIBRARY,
  buildObjectMatchTerms,
  countObjectBeatReferences,
  harvestKeyPropNames,
  isAlreadyInLibrary,
  normalizeObjectName,
  selectRecurringObjects,
} from '@/lib/vision/objectBeatUsage'

function scene(sceneNumber: number, beats: any[]) {
  return { sceneNumber, beats }
}

describe('normalizeObjectName', () => {
  it('drops possessives, punctuation, and casing', () => {
    expect(normalizeObjectName("Clara's Folded Schematics")).toBe('clara folded schematics')
    expect(normalizeObjectName('1893 Water-Damaged Journal')).toBe('1893 water damaged journal')
  })
})

describe('buildObjectMatchTerms', () => {
  it('offers the full name, its trailing noun phrase, and its head noun', () => {
    expect(buildObjectMatchTerms('1893 Water-Damaged Leather Journal')).toEqual([
      '1893 water damaged leather journal',
      'leather journal',
      'journal',
    ])
  })

  it('will not match on a head noun too generic to identify anything', () => {
    expect(buildObjectMatchTerms('Heavy Oak Door')).toEqual(['heavy oak door', 'oak door'])
  })

  it('stems the head noun so plural and singular both match', () => {
    expect(buildObjectMatchTerms('Folded Schematics')).toContain('schematic')
  })
})

describe('countObjectBeatReferences', () => {
  const script = [
    scene(4, [
      {
        beatId: 'b1',
        actionDescription: 'Piper tumbles from the tube, clutching the schematics.',
        beatDirection: { keyProps: ["Clara's Folded Schematics"] },
      },
      {
        beatId: 'b2',
        kind: 'dialogue',
        line: 'Gideon levels the brass core at her.',
        beatDirection: { keyProps: ['Brass Faraday Energy Core'] },
      },
      { beatId: 'b3', actionDescription: 'She lifts the schematic into the lamplight.' },
      { beatId: 'b4', actionDescription: 'A door swings shut behind her.' },
    ]),
    scene(5, [
      {
        beatId: 'b5',
        actionDescription: 'The core hums.',
        beatDirection: { keyProps: ['Brass Faraday Energy Core'] },
      },
    ]),
  ]

  it('harvests candidate names from tagged key props', () => {
    expect(harvestKeyPropNames(script)).toEqual([
      "Clara's Folded Schematics",
      'Brass Faraday Energy Core',
    ])
  })

  it('counts every beat that touches an object, tagged or in prose', () => {
    const usages = countObjectBeatReferences(script)
    const core = usages.find((u) => u.key === 'brass faraday energy core')
    expect(core?.beatCount).toBe(2)
    expect(core?.sceneNumbers).toEqual([4, 5])
    expect(core?.tagged).toBe(true)
  })

  it('credits an untagged beat that names the object in its own prose', () => {
    const usages = countObjectBeatReferences(script)
    const schematics = usages.find((u) => u.key === 'clara folded schematics')
    expect(schematics?.beatCount).toBe(2)
    expect(schematics?.beatRefs.map((r) => r.beatId)).toEqual(['b1', 'b3'])
    expect(schematics?.beatRefs.map((r) => r.tagged)).toEqual([true, false])
  })

  it('qualifies an object recurring within a single scene', () => {
    const usages = countObjectBeatReferences(script)
    const schematics = usages.find((u) => u.key === 'clara folded schematics')!
    expect(schematics.sceneNumbers).toEqual([4])
    expect(selectRecurringObjects(usages).map((u) => u.key)).toContain(
      'clara folded schematics'
    )
  })

  it('reports zero beats for a name the script never mentions', () => {
    const usages = countObjectBeatReferences(script, ['Rugged Military Laptop'])
    expect(usages[0]?.beatCount).toBe(0)
    expect(selectRecurringObjects(usages)).toEqual([])
  })

  it('ignores scene-wide blocking so broadcast direction cannot inflate counts', () => {
    const broadcast = [
      scene(1, [
        { beatId: 'a', beatDirection: { blocking: 'Elara grips the brass lantern.' } },
        { beatId: 'b', beatDirection: { blocking: 'Elara grips the brass lantern.' } },
      ]),
    ]
    expect(countObjectBeatReferences(broadcast, ['Brass Lantern'])[0].beatCount).toBe(0)
  })

  it('sorts the most-handled objects first', () => {
    const usages = countObjectBeatReferences(script, [
      'Rugged Military Laptop',
      'Brass Faraday Energy Core',
    ])
    expect(usages.map((u) => u.name)).toEqual([
      'Brass Faraday Energy Core',
      'Rugged Military Laptop',
    ])
  })

  it('treats two beats as the bar for a library entry', () => {
    expect(MIN_BEATS_FOR_LIBRARY).toBe(2)
  })
})

describe('isAlreadyInLibrary', () => {
  it('matches an existing entry spelled differently', () => {
    expect(isAlreadyInLibrary('Brass Faraday Core', ['Brass Faraday Energy Core'])).toBe(true)
  })

  it('does not match an unrelated entry', () => {
    expect(isAlreadyInLibrary('Pocket Watch', ['Brass Faraday Energy Core'])).toBe(false)
  })
})
