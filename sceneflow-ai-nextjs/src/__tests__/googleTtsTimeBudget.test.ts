import { describe, expect, it } from 'vitest'
import {
  canAffordGoogleTtsRetry,
  edgeTtsTimeoutMs,
  googleTtsFetchTimeoutMs,
  remainingSceneAudioBudgetMs,
  SCENE_AUDIO_GOOGLE_FETCH_CAP_MS,
  SCENE_AUDIO_MAX_DURATION_SECONDS,
  SCENE_AUDIO_MIN_EDGE_TIMEOUT_MS,
  SCENE_AUDIO_MIN_RETRY_FETCH_MS,
  SCENE_AUDIO_POST_EDGE_RESERVE_MS,
  SCENE_AUDIO_POST_TTS_RESERVE_MS,
  shouldSkipGoogleTtsForBudget,
} from '@/lib/tts/googleTtsTimeBudget'

describe('googleTtsTimeBudget', () => {
  it('counts remaining time from route start', () => {
    const startedAt = 1_000_000
    const now = startedAt + 40_000
    expect(remainingSceneAudioBudgetMs(startedAt, now)).toBe(
      SCENE_AUDIO_MAX_DURATION_SECONDS * 1000 - 40_000
    )
  })

  it('caps each Google fetch at 90s and reserves post-TTS work', () => {
    const remainingMs = SCENE_AUDIO_MAX_DURATION_SECONDS * 1000
    expect(googleTtsFetchTimeoutMs(remainingMs)).toBe(SCENE_AUDIO_GOOGLE_FETCH_CAP_MS)
    expect(googleTtsFetchTimeoutMs(remainingMs)).toBeLessThanOrEqual(
      remainingMs - SCENE_AUDIO_POST_TTS_RESERVE_MS
    )
  })

  it('skips paid TTS when remaining time cannot fit a fetch plus reserve', () => {
    expect(shouldSkipGoogleTtsForBudget(SCENE_AUDIO_POST_TTS_RESERVE_MS)).toBe(true)
    expect(
      shouldSkipGoogleTtsForBudget(
        SCENE_AUDIO_POST_TTS_RESERVE_MS + SCENE_AUDIO_MIN_RETRY_FETCH_MS
      )
    ).toBe(false)
  })

  it('refuses another 429/policy retry when delay plus reserve would overrun', () => {
    expect(canAffordGoogleTtsRetry(30_000, 12_000)).toBe(false)
    expect(canAffordGoogleTtsRetry(120_000, 12_000)).toBe(true)
  })

  it('caps Edge timeout to remaining time minus persist reserve', () => {
    expect(edgeTtsTimeoutMs(40_000)).toBe(40_000 - SCENE_AUDIO_POST_EDGE_RESERVE_MS)
    expect(edgeTtsTimeoutMs(8_000)).toBe(SCENE_AUDIO_MIN_EDGE_TIMEOUT_MS)
  })
})
