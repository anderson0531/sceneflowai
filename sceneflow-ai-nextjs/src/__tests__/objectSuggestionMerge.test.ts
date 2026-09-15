import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import type { ObjectBeatUsage } from '@/lib/vision/objectBeatUsage'
import {
  mergeNewObjectCandidates,
  objectSuggestionsFromUsages,
  shouldDeferObjectAutoAdd,
} from '@/lib/vision/objectSuggestionMerge'

function usage(name: string, key = name.toLowerCase()): ObjectBeatUsage {
  return {
    key,
    name,
    beatRefs: [],
    beatCount: 3,
    sceneNumbers: [1, 2],
    tagged: true,
  }
}

describe('shouldDeferObjectAutoAdd', () => {
  it('defers after the library is emptied so Delete all is not undone', () => {
    expect(shouldDeferObjectAutoAdd(94, 0)).toBe(true)
  })

  it('does not defer first-load empty or a partial shrink', () => {
    expect(shouldDeferObjectAutoAdd(0, 0)).toBe(false)
    expect(shouldDeferObjectAutoAdd(0, 5)).toBe(false)
    expect(shouldDeferObjectAutoAdd(5, 4)).toBe(false)
  })
})

describe('mergeNewObjectCandidates', () => {
  it('rebuilds unique script objects plus a novel model extra when the library is empty', () => {
    const script = objectSuggestionsFromUsages([
      usage('Thirty-Inch Iron Rail Spanner'),
      usage('Spud wrench'),
      usage('Water-damaged leather journal'),
      usage('Leather journal'),
    ])
    const model = [
      {
        id: 'model-1',
        name: 'Brass Faraday Energy Core',
        description: 'A humming brass core.',
        category: 'prop' as const,
        importance: 'critical' as const,
        suggestedPrompt: 'Brass Faraday Energy Core',
        sceneNumbers: [4],
        confidence: 0.9,
      },
    ]

    const added = mergeNewObjectCandidates(script, model, [])
    const names = added.map((row) => row.name).sort()

    expect(names).toContain('Thirty-Inch Iron Rail Spanner')
    expect(names).toContain('Water-damaged leather journal')
    expect(names).toContain('Brass Faraday Energy Core')
    expect(names).not.toContain('Spud wrench')
    expect(names).not.toContain('Leather journal')
    expect(added).toHaveLength(3)
  })

  it('does not re-add script names already in the library', () => {
    const script = objectSuggestionsFromUsages([
      usage('Spud wrench'),
      usage('Water-damaged leather journal'),
    ])
    const model = [
      {
        id: 'model-1',
        name: 'Brass Faraday Energy Core',
        description: 'A humming brass core.',
        category: 'prop' as const,
        importance: 'critical' as const,
        suggestedPrompt: 'Brass Faraday Energy Core',
        sceneNumbers: [4],
        confidence: 0.9,
      },
    ]

    const added = mergeNewObjectCandidates(script, model, [
      'Thirty-Inch Iron Rail Spanner',
      'Water-damaged leather journal',
    ])

    expect(added).toHaveLength(1)
    expect(added[0].name).toBe('Brass Faraday Energy Core')
  })
})

describe('suggest-objects returns the script inventory', () => {
  it('unions tagged key props into the response instead of asking Gemini for the whole catalog', () => {
    const route = readFileSync(
      path.join(process.cwd(), 'src/app/api/vision/suggest-objects/route.ts'),
      'utf8'
    )
    expect(route).toContain('mergeNewObjectCandidates')
    expect(route).toContain('objectSuggestionsFromUsages')
    expect(route).toContain('Return ONLY additional objects')
    expect(route).not.toMatch(/Identify 3-8 significant objects that:/)
  })
})
