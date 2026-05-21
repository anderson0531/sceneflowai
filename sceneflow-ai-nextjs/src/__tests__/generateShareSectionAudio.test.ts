import { describe, it, expect } from 'vitest'
import {
  runShareSectionAudioGeneration,
  scheduleShareSectionAudioGeneration,
} from '@/lib/blueprint/generateShareSectionAudio'

describe('scheduleShareSectionAudioGeneration', () => {
  it('delegates to runShareSectionAudioGeneration', () => {
    expect(scheduleShareSectionAudioGeneration).toBe(runShareSectionAudioGeneration)
  })
})
