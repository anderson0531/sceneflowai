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
