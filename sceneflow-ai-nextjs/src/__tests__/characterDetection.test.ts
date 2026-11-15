import { describe, it, expect } from 'vitest'
import {
  detectCharactersInText,
  intersectDetectedCharactersWithDirectionText,
  resolveBeatSpeaker,
} from '@/lib/scene/characterDetection'

const characters = [
  { id: 'c1', name: 'Elara Vance' },
  { id: 'c2', name: 'Marcus Thorne' },
  { id: 'c3', name: 'Dr. Benjamin Reed' },
  { id: 'n1', name: 'Narrator', type: 'narrator' },
]

describe('detectCharactersInText', () => {
  it('detects Elara Vance from action text mentioning first name', () => {
    const text =
      'Elara leans intensely toward a multi-monitor high-tech computer setup'
    const detected = detectCharactersInText(text, characters)
    expect(detected.map((c) => c.name)).toEqual(['Elara Vance'])
  })

  it('does not false-positive on partial name fragments', () => {
    const text = 'They agreed on the plan and moved forward'
    const detected = detectCharactersInText(text, characters)
    expect(detected).toEqual([])
  })

  it('returns empty array for empty action text', () => {
    expect(detectCharactersInText('', characters)).toEqual([])
    expect(detectCharactersInText('   ', characters)).toEqual([])
  })

  it('matches full name and word-boundary name parts', () => {
    const byFullName = detectCharactersInText('Marcus Thorne enters', characters)
    expect(byFullName.map((c) => c.name)).toEqual(['Marcus Thorne'])

    const byLastName = detectCharactersInText('Reed examines the evidence', characters)
    expect(byLastName.map((c) => c.name)).toEqual(['Dr. Benjamin Reed'])
  })

  it('does not match character name embedded in film title AURA\'S ECHO', () => {
    const aura = { id: '1', name: 'Aura' }
    const text =
      "A fully CGI title sequence. The title 'AURA'S ECHO' is revealed in a digital realm."
    const matches = detectCharactersInText(text, [aura], {
      excludeTexts: ["AURA'S ECHO"],
    })
    expect(matches).toHaveLength(0)
  })

  it('still matches character when name appears outside excluded phrase', () => {
    const aura = { id: '1', name: 'Aura' }
    const text = 'Aura enters the neural network tunnel.'
    const matches = detectCharactersInText(text, [aura], {
      excludeTexts: ["AURA'S ECHO"],
    })
    expect(matches).toHaveLength(1)
    expect(matches[0].name).toBe('Aura')
  })

  it('does not match characters named only in full scene action when beat context is scoped', () => {
    const beatAction =
      'Elara walks slowly through her living room, her eyes scanning every detail.'
    const fullSceneAction =
      'Marcus enters with Dr. Reed. Elara walks slowly through her living room.'
    const heading = "INT. ELARA'S APARTMENT - NIGHT"

    const fullContext = [heading, fullSceneAction, beatAction].join(' ')
    expect(detectCharactersInText(fullContext, characters).map((c) => c.name)).toEqual(
      expect.arrayContaining(['Elara Vance', 'Marcus Thorne', 'Dr. Benjamin Reed'])
    )

    const beatScopedContext = [heading, beatAction].join(' ')
    expect(detectCharactersInText(beatScopedContext, characters).map((c) => c.name)).toEqual([
      'Elara Vance',
    ])
  })

  it('does not match Dr. Arthur Pendelton when only his journal prop is mentioned', () => {
    const cast = [
      { id: 'piper', name: 'Piper Hayes' },
      { id: 'gideon', name: 'Professor Gideon Croft' },
      { id: 'arthur', name: 'Dr. Arthur Pendelton' },
    ]
    const journal = "Arthur Pendelton's 1893 Journal"
    const text =
      'Piper Hayes forcefully grounds Professor Gideon Croft using Arthur Pendelton\'s 1893 Journal.'
    const detected = detectCharactersInText(text, cast, {
      maskPhrases: [journal],
    })
    expect(detected.map((c) => c.name)).toEqual(
      expect.arrayContaining(['Piper Hayes', 'Professor Gideon Croft'])
    )
    expect(detected.map((c) => c.name)).not.toContain('Dr. Arthur Pendelton')
  })

  it('still matches Arthur when independently present alongside the masked journal name', () => {
    const cast = [
      { id: 'piper', name: 'Piper Hayes' },
      { id: 'arthur', name: 'Dr. Arthur Pendelton' },
    ]
    const journal = "Arthur Pendelton's 1893 Journal"
    const text = 'Dr. Arthur Pendelton enters clutching Arthur Pendelton\'s 1893 Journal.'
    const detected = detectCharactersInText(text, cast, {
      maskPhrases: [journal],
    })
    expect(detected.map((c) => c.name)).toContain('Dr. Arthur Pendelton')
  })
})

describe('resolveBeatSpeaker', () => {
  it('resolves speaker by characterId first', () => {
    const speaker = resolveBeatSpeaker(
      { characterId: 'c1', character: 'WRONG NAME' },
      characters
    )
    expect(speaker?.name).toBe('Elara Vance')
  })

  it('falls back to character name when characterId is missing', () => {
    const speaker = resolveBeatSpeaker({ character: 'Elara Vance' }, characters)
    expect(speaker?.name).toBe('Elara Vance')
  })

  it('skips narrator type when resolving by name', () => {
    const speaker = resolveBeatSpeaker({ character: 'Narrator' }, characters)
    expect(speaker).toBeUndefined()
  })

  it('disambiguates multi-age cast variants and matches capitalized 3-letter names like Max', () => {
    const multiAgeProjectCast = [
      { id: 'c-narrator', name: 'Narrator', type: 'narrator' },
      { id: 'c-curtis', name: 'Curtis Hefflin' },
      { id: 'c-brian-17', name: 'Brian Eric Anderson Sr. (Age 17)' },
      { id: 'c-frances', name: 'Frances Hefflin' },
      { id: 'c-brian-34', name: 'Brian Eric Anderson Sr. (Age 34)' },
      { id: 'c-brian-58', name: 'Brian Eric Anderson Sr. (Age 58)' },
      { id: 'c-brian-base', name: 'Brian Eric Anderson Sr.' },
      { id: 'c-betty', name: 'Ms. Betty Ellis' },
      { id: 'c-max', name: 'Max Gould' },
      { id: 'c-ashley', name: 'Ashley Pollard' },
    ]

    // Explicit (Age 34) selects ONLY Age 34, not all 4 Brian entries
    const detectedAge34 = detectCharactersInText(
      'Brian Eric Anderson Sr. (Age 34) stands immovable beside the glowing terminal console.',
      multiAgeProjectCast
    )
    expect(detectedAge34.map((c) => c.name)).toEqual(['Brian Eric Anderson Sr. (Age 34)'])

    // Capitalized 3-letter given name "Max" matches Max Gould without matching lowercase stopwords
    const detectedMax = detectCharactersInText(
      'Max sits motionless in his high-backed leather executive chair while red strobes flash.',
      multiAgeProjectCast
    )
    expect(detectedMax.map((c) => c.name)).toEqual(['Max Gould'])

    const noFalsePositive = detectCharactersInText(
      'The red alert strobes may set off the alarm.',
      multiAgeProjectCast
    )
    expect(noFalsePositive).toEqual([])

    // Speaker resolution prefers exact match over earlier substring sibling (Age 17 at index 2)
    expect(
      resolveBeatSpeaker({ character: 'Brian Eric Anderson Sr.' }, multiAgeProjectCast)?.id
    ).toBe('c-brian-base')
    expect(
      resolveBeatSpeaker({ character: 'Brian Eric Anderson Sr. (Age 58)' }, multiAgeProjectCast)?.id
    ).toBe('c-brian-58')

    // Intersecting pre-detected Age 34 with direction naming bare "Brian" keeps Age 34
    const intersected = intersectDetectedCharactersWithDirectionText(
      [multiAgeProjectCast[4], multiAgeProjectCast[8]],
      'Brian stands alone beside the terminal console.',
      multiAgeProjectCast
    )
    expect(intersected.map((c) => c.id)).toEqual(['c-brian-34'])
  })
})
