import { describe, it, expect } from 'vitest'
import {
  buildWardrobeSyncDiff,
  enrichSuggestionsWithBeatAppearanceNotes,
  matchSuggestionToExisting,
  mergeWardrobeSyncDiff,
  wardrobeContentFingerprint,
} from '@/lib/character/wardrobeScriptSync'

describe('wardrobeScriptSync', () => {
  const existing = [
    {
      id: 'w-office',
      name: 'Office Attire',
      description: 'Navy blazer and charcoal trousers',
      accessories: 'Silver watch',
      appearanceNotes: '',
      sceneNumbers: [1, 2],
      fullBodyUrl: 'https://blob.example/office.png',
      isDefault: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'w-evening',
      name: 'Evening Formal',
      description: 'Black cocktail dress',
      sceneNumbers: [5],
      fullBodyUrl: 'https://blob.example/evening.png',
      isDefault: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ]

  it('matches suggestions by canonical name before creating duplicates', () => {
    const match = matchSuggestionToExisting(
      {
        name: 'office attire',
        description: 'Navy blazer with charcoal trousers',
        sceneNumbers: [1, 2, 3],
        reason: 'Same look, more scenes',
      },
      existing,
      new Set()
    )
    expect(match?.id).toBe('w-office')
  })

  it('remaps sceneNumbers without marking image stale when content unchanged', () => {
    const diff = buildWardrobeSyncDiff('char-1', 'Piper', existing, [
      {
        name: 'Office Attire',
        description: 'Navy blazer and charcoal trousers',
        accessories: 'Silver watch',
        appearanceNotes: '',
        sceneNumbers: [1, 2, 3],
        reason: 'Script added scene 3',
      },
    ])

    expect(diff.creates).toHaveLength(0)
    expect(diff.updates).toHaveLength(1)
    expect(diff.updates[0].imageStale).toBe(false)
    expect(diff.updates[0].patch.sceneNumbers).toEqual([1, 2, 3])
    expect(diff.obsolete.map((o) => o.wardrobeId)).toContain('w-evening')
  })

  it('marks image stale when appearanceNotes change', () => {
    const diff = buildWardrobeSyncDiff('char-1', 'Piper', existing, [
      {
        name: 'Office Attire',
        description: 'Navy blazer and charcoal trousers',
        accessories: 'Silver watch',
        appearanceNotes: 'Bruised hands, contusion on knuckles',
        sceneNumbers: [1, 2],
        reason: 'Injury continuity after rewrite',
      },
      {
        name: 'Evening Formal',
        description: 'Black cocktail dress',
        sceneNumbers: [5],
        reason: 'Unchanged',
      },
    ])

    const officeUpdate = diff.updates.find((u) => u.wardrobeId === 'w-office')
    expect(officeUpdate?.imageStale).toBe(true)
    expect(officeUpdate?.patch.appearanceNotes).toMatch(/Bruised hands/i)
  })

  it('creates new looks and soft-obsoletes unmatched without deleting images', () => {
    const diff = buildWardrobeSyncDiff('char-1', 'Piper', existing, [
      {
        name: 'Raincoat Escape',
        description: 'Olive trench coat over jeans',
        sceneNumbers: [4],
        reason: 'New chase sequence',
      },
    ])

    expect(diff.creates).toHaveLength(1)
    expect(diff.obsolete.map((o) => o.wardrobeId).sort()).toEqual([
      'w-evening',
      'w-office',
    ])

    const { wardrobes, staleWardrobeIds } = mergeWardrobeSyncDiff(existing, diff)
    const raincoat = wardrobes.find((w) => w.name === 'Raincoat Escape')
    expect(raincoat?.needsImageRegen).toBe(true)
    expect(raincoat?.sceneNumbers).toEqual([4])

    const office = wardrobes.find((w) => w.id === 'w-office')
    expect(office?.sceneNumbers).toEqual([])
    expect(office?.fullBodyUrl).toBe('https://blob.example/office.png')
    expect(staleWardrobeIds).toEqual([])
  })

  it('clears wardrobe images when merging a stale content update', () => {
    const diff = buildWardrobeSyncDiff('char-1', 'Piper', existing, [
      {
        name: 'Office Attire',
        description: 'Torn navy blazer and charcoal trousers',
        accessories: 'Silver watch',
        appearanceNotes: 'Bloodshot eyes',
        sceneNumbers: [1, 2],
        reason: 'Script fight aftermath',
      },
      {
        name: 'Evening Formal',
        description: 'Black cocktail dress',
        sceneNumbers: [5],
        reason: 'keep',
      },
    ])

    const { wardrobes, staleWardrobeIds } = mergeWardrobeSyncDiff(existing, diff)
    const office = wardrobes.find((w) => w.id === 'w-office')
    expect(staleWardrobeIds).toContain('w-office')
    expect(office?.fullBodyUrl).toBeUndefined()
    expect(office?.needsImageRegen).toBe(true)
    expect(office?.description).toMatch(/Torn navy/i)
  })

  it('enriches missing appearanceNotes from beat text', () => {
    const suggestions = enrichSuggestionsWithBeatAppearanceNotes(
      [
        {
          name: 'Interrogation',
          description: 'Grey hoodie',
          sceneNumbers: [4],
          reason: 'Main look',
        },
      ],
      [
        {
          sceneNumber: 4,
          heading: 'INT. ROOM - NIGHT',
          beats: [
            {
              kind: 'action',
              actionDescription:
                'Close-up: Piper shows bruised hands, bloodshot eyes, faint bruise on temple',
            },
          ],
        },
      ],
      'Piper'
    )

    expect(suggestions[0].appearanceNotes).toMatch(/bruise|bloodshot/i)
  })

  it('wardrobeContentFingerprint changes when notes change', () => {
    const a = wardrobeContentFingerprint({
      description: 'Suit',
      accessories: '',
      appearanceNotes: '',
    })
    const b = wardrobeContentFingerprint({
      description: 'Suit',
      accessories: '',
      appearanceNotes: 'bruised hands',
    })
    expect(a).not.toBe(b)
  })

  it('preserves a single default after merge', () => {
    const diff = buildWardrobeSyncDiff('char-1', 'Piper', existing, [
      {
        name: 'Raincoat Escape',
        description: 'Olive trench',
        sceneNumbers: [4],
        reason: 'new',
      },
    ])
    const { wardrobes } = mergeWardrobeSyncDiff(existing, {
      ...diff,
      obsolete: existing.map((w) => ({
        wardrobeId: w.id,
        name: w.name,
        reason: 'unused',
      })),
    })
    expect(wardrobes.filter((w) => w.isDefault)).toHaveLength(1)
  })
})
