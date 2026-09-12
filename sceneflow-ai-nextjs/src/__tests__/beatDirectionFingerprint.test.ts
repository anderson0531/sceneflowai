import { describe, expect, it } from 'vitest'
import {
  beatDirectionFingerprint,
  beatStillDirectionFingerprint,
  stillDirectionKeyFromStored,
  storedStillDirectionKeyMatches,
} from '@/lib/script/beatDirectionFingerprint'
import type { BeatDirection } from '@/lib/script/segmentTypes'

const stillDirection: BeatDirection = {
  shotType: 'Close-Up',
  cameraAngle: 'low angle',
  frozenMoment: 'Elara grips the journal',
  lightingAccent: 'teal rim',
}

const withVideoOnly: BeatDirection = {
  ...stillDirection,
  cameraMovement: 'handheld push-in',
  emotion: 'resolute',
  audioCue: 'timer glitch',
  transition: 'CUT',
}

describe('beatStillDirectionFingerprint', () => {
  it('ignores video-only facets', () => {
    expect(beatStillDirectionFingerprint(stillDirection)).toBe(
      beatStillDirectionFingerprint(withVideoOnly)
    )
    expect(beatDirectionFingerprint(withVideoOnly)).not.toBe(
      beatDirectionFingerprint(stillDirection)
    )
  })

  it('changes when shot or frozen moment changes', () => {
    const next: BeatDirection = { ...stillDirection, shotType: 'Wide Shot' }
    expect(beatStillDirectionFingerprint(next)).not.toBe(
      beatStillDirectionFingerprint(stillDirection)
    )
  })

  it('separates an empty cast from an unstated one', () => {
    // Clearing the cast is a real edit — it turns "guess who is on camera" into
    // "nobody is" — so a prompt composed before it has to read as stale.
    const unstated = beatStillDirectionFingerprint(stillDirection)
    const nobody = beatStillDirectionFingerprint({ ...stillDirection, castInFrame: [] })
    const someone = beatStillDirectionFingerprint({
      ...stillDirection,
      castInFrame: ['Piper Hayes'],
    })

    expect(nobody).not.toBe(unstated)
    expect(someone).not.toBe(nobody)
    expect(storedStillDirectionKeyMatches(unstated, { ...stillDirection, castInFrame: [] })).toBe(
      false
    )
  })

  it('does not care what order the cast was listed in', () => {
    expect(
      beatStillDirectionFingerprint({ ...stillDirection, castInFrame: ['Piper', 'Gideon'] })
    ).toBe(beatStillDirectionFingerprint({ ...stillDirection, castInFrame: ['Gideon', 'Piper'] }))
  })

  it('reads a key from an older composer as stale, whatever shape it was stored in', () => {
    // This is the whole migration: a prompt composed before the bump recomposes
    // on the next read, so no pass over every project's stored scenes is needed
    // to clear wording that named cast the direction never did.
    const still = beatStillDirectionFingerprint(withVideoOnly)
    const legacyStill = still.replace(/^still-v\d+\|/, '')
    const legacyFull = beatDirectionFingerprint(withVideoOnly)

    expect(legacyStill).not.toBe(still)
    expect(storedStillDirectionKeyMatches(legacyStill, withVideoOnly)).toBe(false)
    expect(storedStillDirectionKeyMatches(legacyFull, withVideoOnly)).toBe(false)
  })

  it('settles once recomposed, so a movement-only edit is not a stale still', () => {
    const still = beatStillDirectionFingerprint(withVideoOnly)

    expect(storedStillDirectionKeyMatches(still, stillDirection)).toBe(true)
    expect(
      storedStillDirectionKeyMatches(still, { ...withVideoOnly, shotType: 'Insert Shot' })
    ).toBe(false)
  })

  it('lifts the still slice out of a key that also carries video facets', () => {
    const still = beatStillDirectionFingerprint(withVideoOnly)
    const withVideoFacets = `${still}|cameraMovement=handheld push-in|emotion=resolute`

    expect(stillDirectionKeyFromStored(withVideoFacets)).toBe(still)
    expect(storedStillDirectionKeyMatches(withVideoFacets, withVideoOnly)).toBe(true)
  })
})
