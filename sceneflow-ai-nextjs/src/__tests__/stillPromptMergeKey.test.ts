import { describe, it, expect } from 'vitest'
import { mergeScenePreservingMedia } from '@/lib/storyboard/mergeSceneMedia'
import { beatStillDirectionFingerprint } from '@/lib/script/beatDirectionFingerprint'

const DIRECTION = {
  shotType: 'medium',
  cameraAngle: 'low angle',
  castInFrame: ['DR. CHEN'],
}

const CURRENT_KEY = beatStillDirectionFingerprint(DIRECTION)

/** A key written before STILL_FINGERPRINT_VERSION was bumped to still-v2. */
const PRE_BUMP_KEY = 'shotType=medium|cameraAngle=low angle|castInFrame=DR. CHEN|keyProps='

function beat(overrides: Record<string, unknown> = {}) {
  return {
    beatId: 'bt_1',
    kind: 'action',
    actionDescription: 'A scientist tilts the glowing sample toward the light.',
    beatDirection: DIRECTION,
    ...overrides,
  }
}

describe('still prompt and its direction key merge as a pair', () => {
  it('keeps the freshly composed prompt when the incoming one is stale-keyed', () => {
    const canonical = {
      beats: [
        beat({
          storyboardImagePrompt: 'Medium shot, low angle. DR. CHEN tilts the sample.',
          storyboardImagePromptDirectionKey: CURRENT_KEY,
        }),
      ],
    }
    // A client holding a snapshot from before the recompose.
    const incoming = {
      beats: [
        beat({
          storyboardImagePrompt: 'Old wording from a previous composer.',
          storyboardImagePromptDirectionKey: PRE_BUMP_KEY,
        }),
      ],
    }

    const merged = mergeScenePreservingMedia(canonical, incoming)

    expect(merged.beats[0].storyboardImagePrompt).toBe(
      'Medium shot, low angle. DR. CHEN tilts the sample.'
    )
    expect(merged.beats[0].storyboardImagePromptDirectionKey).toBe(CURRENT_KEY)
  })

  it('never stores a prompt under a key it was not composed under', () => {
    const canonical = {
      beats: [
        beat({
          storyboardImagePrompt: 'Fresh prompt',
          storyboardImagePromptDirectionKey: CURRENT_KEY,
        }),
      ],
    }
    const incoming = {
      beats: [
        beat({
          storyboardImagePrompt: 'Stale prompt',
          storyboardImagePromptDirectionKey: PRE_BUMP_KEY,
        }),
      ],
    }

    const merged = mergeScenePreservingMedia(canonical, incoming)
    const result = merged.beats[0]

    // Picking the two keys independently used to pair the stale prompt with the
    // current key, which then read as up to date forever.
    const pairs = [
      ['Fresh prompt', CURRENT_KEY],
      ['Stale prompt', PRE_BUMP_KEY],
    ]
    expect(pairs).toContainEqual([
      result.storyboardImagePrompt,
      result.storyboardImagePromptDirectionKey,
    ])
  })

  it('still lets a genuinely newer incoming prompt win', () => {
    const canonical = {
      beats: [
        beat({
          storyboardImagePrompt: 'Older prompt',
          storyboardImagePromptDirectionKey: CURRENT_KEY,
        }),
      ],
    }
    const incoming = {
      beats: [
        beat({
          storyboardImagePrompt: 'Newer prompt',
          storyboardImagePromptDirectionKey: CURRENT_KEY,
        }),
      ],
    }

    const merged = mergeScenePreservingMedia(canonical, incoming)
    expect(merged.beats[0].storyboardImagePrompt).toBe('Newer prompt')
  })

  it('takes the incoming prompt when both keys are stale', () => {
    const canonical = {
      beats: [
        beat({
          storyboardImagePrompt: 'Canonical stale',
          storyboardImagePromptDirectionKey: PRE_BUMP_KEY,
        }),
      ],
    }
    const incoming = {
      beats: [
        beat({
          storyboardImagePrompt: 'Incoming stale',
          storyboardImagePromptDirectionKey: PRE_BUMP_KEY,
        }),
      ],
    }

    const merged = mergeScenePreservingMedia(canonical, incoming)
    expect(merged.beats[0].storyboardImagePrompt).toBe('Incoming stale')
    expect(merged.beats[0].storyboardImagePromptDirectionKey).toBe(PRE_BUMP_KEY)
  })

  it('fills in from canonical when the incoming beat has no prompt at all', () => {
    const canonical = {
      beats: [
        beat({
          storyboardImagePrompt: 'Canonical prompt',
          storyboardImagePromptDirectionKey: CURRENT_KEY,
        }),
      ],
    }
    const incoming = { beats: [beat()] }

    const merged = mergeScenePreservingMedia(canonical, incoming)
    expect(merged.beats[0].storyboardImagePrompt).toBe('Canonical prompt')
    expect(merged.beats[0].storyboardImagePromptDirectionKey).toBe(CURRENT_KEY)
  })

  it('lets rewritten beat content replace the prompt outright', () => {
    const canonical = {
      beats: [
        beat({
          storyboardImagePrompt: 'Canonical prompt',
          storyboardImagePromptDirectionKey: CURRENT_KEY,
        }),
      ],
    }
    const incoming = {
      beats: [
        beat({
          actionDescription: 'The scientist drops the sample.',
          storyboardImagePrompt: 'Prompt for the new action',
          storyboardImagePromptDirectionKey: PRE_BUMP_KEY,
        }),
      ],
    }

    // The beat is about something else now, so the canonical prompt describes a
    // frame that no longer exists.
    const merged = mergeScenePreservingMedia(canonical, incoming)
    expect(merged.beats[0].storyboardImagePrompt).toBe('Prompt for the new action')
  })
})
