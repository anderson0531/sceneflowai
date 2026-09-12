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

  it('lifts the still slice out of a legacy full-direction key', () => {
    const full = beatDirectionFingerprint(withVideoOnly)
    const still = beatStillDirectionFingerprint(withVideoOnly)
    expect(stillDirectionKeyFromStored(full)).toBe(still)
    expect(storedStillDirectionKeyMatches(full, withVideoOnly)).toBe(true)
    expect(storedStillDirectionKeyMatches(full, stillDirection)).toBe(true)
    expect(
      storedStillDirectionKeyMatches(full, { ...withVideoOnly, shotType: 'Insert Shot' })
    ).toBe(false)
  })
})
