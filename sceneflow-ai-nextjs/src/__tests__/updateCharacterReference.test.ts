import { describe, it, expect } from 'vitest'
import {
  resolveCharacterId,
  updateCharacterInList,
} from '@/lib/vision/updateCharacterReference'
import { updateObjectReferenceInList } from '@/lib/vision/updateObjectReference'

describe('resolveCharacterId', () => {
  it('uses id when present', () => {
    expect(resolveCharacterId({ id: 'abc', name: 'Alice' }, 0)).toBe('abc')
  })

  it('falls back to index string', () => {
    expect(resolveCharacterId({ name: 'Alice' }, 2)).toBe('2')
  })
})

describe('updateCharacterInList sequential merge', () => {
  const chars = [
    { id: 'c1', name: 'Alice', referenceImage: '' },
    { id: 'c2', name: 'Bob', referenceImage: '' },
    { id: 'c3', name: 'Carol', referenceImage: '' },
    { id: 'c4', name: 'Dave', referenceImage: '' },
  ]

  it('accumulates referenceImage across 4 sequential updates', () => {
    let list = [...chars]
    const urls = [
      'https://blob.example/alice.png',
      'https://blob.example/bob.png',
      'https://blob.example/carol.png',
      'https://blob.example/dave.png',
    ]

    for (let i = 0; i < 4; i++) {
      list = updateCharacterInList(list, `c${i + 1}`, { referenceImage: urls[i] })
    }

    expect(list.map((c) => c.referenceImage)).toEqual(urls)
  })

  it('resolves characters without id by index', () => {
    const noIdChars = [
      { name: 'Alice', referenceImage: '' },
      { name: 'Bob', referenceImage: '' },
    ]
    let list = [...noIdChars]
    list = updateCharacterInList(list, '0', { referenceImage: 'url-a' })
    list = updateCharacterInList(list, '1', { referenceImage: 'url-b' })
    expect(list[0].referenceImage).toBe('url-a')
    expect(list[1].referenceImage).toBe('url-b')
  })
})

describe('updateObjectReferenceInList sequential merge', () => {
  const props = [
    { id: 'p1', name: 'Sword', imageUrl: '' },
    { id: 'p2', name: 'Shield', imageUrl: '' },
    { id: 'p3', name: 'Map', imageUrl: '' },
    { id: 'p4', name: 'Key', imageUrl: '' },
  ]

  it('accumulates imageUrl across 4 sequential updates', () => {
    let list = [...props]
    const urls = [
      'https://blob.example/sword.png',
      'https://blob.example/shield.png',
      'https://blob.example/map.png',
      'https://blob.example/key.png',
    ]

    for (let i = 0; i < 4; i++) {
      list = updateObjectReferenceInList(list, `p${i + 1}`, {
        imageUrl: urls[i],
        updatedAt: `2026-01-0${i + 1}T00:00:00.000Z`,
      })
    }

    expect(list.map((p) => p.imageUrl)).toEqual(urls)
    expect(list.every((p) => p.updatedAt)).toBe(true)
  })
})
