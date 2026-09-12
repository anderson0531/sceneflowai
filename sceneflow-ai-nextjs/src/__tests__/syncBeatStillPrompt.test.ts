import { describe, expect, it } from 'vitest'
import { beatDirectionFingerprint, beatStillDirectionFingerprint } from '@/lib/script/beatDirectionFingerprint'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import { storedPromptMatchesDirection } from '@/lib/intelligence/beat-sequence-planner-fallback'
import {
  isStructuredStillPrompt,
  parseStillPromptSource,
} from '@/lib/imagen/structuredStillPrompt'
import {
  isBeatFrameStale,
  syncBeatStillPromptToDirection,
} from '@/lib/storyboard/syncBeatStillPrompt'

function actionBeat(overrides: Partial<SceneBeat> = {}): SceneBeat {
  return {
    beatId: 'bt-1',
    sequenceIndex: 0,
    kind: 'action',
    actionDescription: 'Elara raises the journal.',
    storyboardImageUrl: 'https://example.com/frame.jpg',
    storyboardImagePrompt: 'Medium shot: Elara raises the journal.',
    storyboardImagePromptDirectionKey: beatStillDirectionFingerprint({
      shotType: 'Medium Shot',
      frozenMoment: 'Elara raises the journal',
    }),
    beatDirection: {
      shotType: 'Medium Shot',
      frozenMoment: 'Elara raises the journal',
    },
    ...overrides,
  }
}

describe('syncBeatStillPromptToDirection', () => {
  it('rewrites the still prompt and keeps the image when still direction changes', () => {
    const prior = actionBeat()
    const next = syncBeatStillPromptToDirection({
      ...prior,
      beatDirection: {
        shotType: 'Insert Shot',
        frozenMoment: 'The journal fills the frame',
      },
    })

    expect(next.storyboardImageUrl).toBe(prior.storyboardImageUrl)
    expect(next.storyboardImagePrompt).toContain('The journal fills the frame')
    expect(next.storyboardImagePrompt).not.toBe(prior.storyboardImagePrompt)
    expect(next.storyboardImagePromptDirectionKey).toBe(
      beatStillDirectionFingerprint(next.beatDirection)
    )
    expect(next.storyboardImageDirectionKey).toBe(prior.storyboardImagePromptDirectionKey)
    expect(isBeatFrameStale(next)).toBe(true)
  })

  // Update Prompts runs with no lookbook on plenty of projects. A prompt left
  // as bare prose is rewritten by the rules optimizer downstream, which is how
  // uninvolved cast ended up in object beats.
  it('writes a sectioned prompt even with no lookbook', () => {
    const next = syncBeatStillPromptToDirection({
      ...actionBeat(),
      beatDirection: {
        shotType: 'Insert Shot',
        frozenMoment: 'The journal fills the frame',
      },
    })

    expect(next.storyboardImagePrompt).toContain('[SCENE COMPOSITION & BEAT]')
    expect(isStructuredStillPrompt(next.storyboardImagePrompt!)).toBe(true)
    expect(parseStillPromptSource(next.storyboardImagePrompt!).actionFraming).toContain(
      'The journal fills the frame'
    )
  })

  it('is a no-op for video-only direction edits', () => {
    const prior = actionBeat()
    const next = syncBeatStillPromptToDirection({
      ...prior,
      beatDirection: {
        ...prior.beatDirection,
        cameraMovement: 'slow dolly in',
        emotion: 'hypnotic awe',
        audioCue: 'proximity timer',
        transition: 'DISSOLVE',
      },
    })

    expect(next.storyboardImagePrompt).toBe(prior.storyboardImagePrompt)
    expect(next.storyboardImagePromptDirectionKey).toBe(
      prior.storyboardImagePromptDirectionKey
    )
    expect(next.storyboardImageUrl).toBe(prior.storyboardImageUrl)
    expect(next.storyboardImageDirectionKey).toBe(prior.storyboardImageDirectionKey)
    expect(isBeatFrameStale(next)).toBe(false)
    expect(storedPromptMatchesDirection(next)).toBe(true)
  })

  it('treats a stamped image as current after Express writes the still key', () => {
    const direction = {
      shotType: 'Close-Up',
      frozenMoment: 'Elara stares at the core',
    }
    const beat = actionBeat({
      beatDirection: direction,
      storyboardImagePrompt: 'Close-Up. Elara stares at the core.',
      storyboardImagePromptDirectionKey: beatStillDirectionFingerprint(direction),
      storyboardImageDirectionKey: beatStillDirectionFingerprint(direction),
    })

    expect(isBeatFrameStale(beat)).toBe(false)
    expect(storedPromptMatchesDirection(beat)).toBe(true)
  })

  it('recomposes a prompt keyed by an earlier composer, once', () => {
    const direction = {
      shotType: 'Wide Shot',
      cameraMovement: 'crane down',
      frozenMoment: 'The lab at dusk',
      castInFrame: [],
    }
    // A pre-bump record: the key describes this direction, but the wording was
    // built by a composer that put the scene's cast in an empty room.
    const stale = actionBeat({
      actionDescription: 'The lab stands empty, centrifuges still spinning.',
      beatDirection: direction,
      storyboardImagePrompt: 'Wide Shot. Elara and Marcus stand in the lab at dusk.',
      storyboardImagePromptDirectionKey: beatDirectionFingerprint(direction),
      storyboardImageDirectionKey: undefined,
    })

    expect(storedPromptMatchesDirection(stale)).toBe(false)

    const next = syncBeatStillPromptToDirection(stale)
    expect(next.storyboardImagePrompt).not.toContain('Elara')
    expect(next.storyboardImagePrompt).toContain('No people in frame')
    expect(storedPromptMatchesDirection(next)).toBe(true)

    // And it settles: the recomposed record is not asked to recompose again.
    expect(syncBeatStillPromptToDirection(next)).toBe(next)
  })
})
