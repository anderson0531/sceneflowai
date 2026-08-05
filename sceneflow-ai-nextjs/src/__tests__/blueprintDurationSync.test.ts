import { describe, it, expect } from 'vitest'
import {
  computeBlueprintDurationFromBeats,
  syncBlueprintDurationFields,
} from '@/lib/treatment/duration'
import { mergeRevisionIntoVariant } from '@/lib/treatment/blueprintRevisionDiff'

describe('blueprint duration sync', () => {
  it('computeBlueprintDurationFromBeats derives all duration fields from beats', () => {
    const beats = [
      { title: 'Opening', minutes: 10 },
      { title: 'Middle', minutes: 20 },
      { title: 'Climax', minutes: 15 },
    ]

    expect(computeBlueprintDurationFromBeats(beats)).toEqual({
      total_duration_seconds: 2700,
      estimatedDurationMinutes: 45,
      format_length: '2700 seconds',
    })
  })

  it('syncBlueprintDurationFields updates duration fields when beats patch is applied', () => {
    const variant = {
      title: 'Test Film',
      format_length: '600 seconds',
      total_duration_seconds: 600,
      estimatedDurationMinutes: 10,
      beats: [{ title: 'Beat 1', minutes: 22.5 }, { title: 'Beat 2', minutes: 22.5 }],
    }

    const synced = syncBlueprintDurationFields(variant)

    expect(synced.total_duration_seconds).toBe(2700)
    expect(synced.estimatedDurationMinutes).toBe(45)
    expect(synced.format_length).toBe('2700 seconds')
    expect(synced.title).toBe('Test Film')
  })

  it('syncBlueprintDurationFields leaves variant unchanged without beats', () => {
    const variant = { title: 'No beats', format_length: '600 seconds' }
    expect(syncBlueprintDurationFields(variant)).toEqual(variant)
  })

  it('mergeRevisionIntoVariant syncs format_length when beats patch is merged', () => {
    const original = {
      title: 'Test',
      format_length: '600 seconds',
      total_duration_seconds: 600,
      estimatedDurationMinutes: 10,
      beats: [{ title: 'Old beat', minutes: 10 }],
    }

    const merged = mergeRevisionIntoVariant(original, {
      beats: [
        { title: 'Beat 1', minutes: 15 },
        { title: 'Beat 2', minutes: 15 },
        { title: 'Beat 3', minutes: 15 },
      ],
    })

    expect(merged.format_length).toBe('2700 seconds')
    expect(merged.total_duration_seconds).toBe(2700)
    expect(merged.estimatedDurationMinutes).toBe(45)
  })
})
