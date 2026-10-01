import { describe, expect, it } from 'vitest'
import type { SceneSegment, SceneSegmentTake } from '@/components/vision/scene-production/types'
import { MEDIA_VERSION_CAP } from '@/lib/storyboard/mediaVersions'
import { mergeSceneProductionData } from '@/lib/storyboard/mergeProductionMedia'
import {
  applyGeneratedClipTake,
  appendLanguageClipTake,
  keepLanguageClipVersions,
  languageClipSelectionValue,
  listLanguageClipVersionOptions,
  presentSegmentForStream,
  withSelectedLanguageClip,
} from '@/lib/scene/languageClipVersions'
import {
  buildLanguageClipPrompt,
  composeLanguageClipPrompt,
  preferStoredSpokenTranslation,
} from '@/lib/scene/languageClipPrompt'

function take(id: string, url = `${id}.mp4`): SceneSegmentTake {
  return {
    id,
    createdAt: '2026-01-01T00:00:00.000Z',
    assetUrl: url,
    status: 'COMPLETE',
  }
}

function segment(overrides: Partial<SceneSegment> = {}): SceneSegment {
  return {
    segmentId: 'seg_1',
    sequenceIndex: 0,
    startTime: 0,
    endTime: 8,
    status: 'COMPLETE',
    assetType: 'video',
    references: { characterIds: [], sceneRefIds: [], objectRefIds: [] },
    takes: [take('master')],
    currentTakeId: 'master',
    activeAssetUrl: 'master.mp4',
    ...overrides,
  }
}

describe('language clip versions', () => {
  it('appends a language take without moving the English master pointer', () => {
    const master = segment()
    const committed = applyGeneratedClipTake(master, take('es1', 'es.mp4'), 'es')
    expect(committed?.activeAssetUrl).toBe('master.mp4')
    expect(committed?.currentTakeId).toBe('master')
    expect(committed?.takes.map((row) => row.id)).toEqual(['master'])
    expect(committed?.languageVersions?.es.currentTakeId).toBe('es1')
    expect(committed?.languageVersions?.es.takes.map((row) => row.id)).toEqual(['es1'])
    expect(applyGeneratedClipTake(master, take('en1'), 'en')).toBeNull()
  })

  it('caps language takes on their own and leaves the master list intact', () => {
    let versions = appendLanguageClipTake(undefined, 'es', take('es0'))
    for (let i = 1; i <= MEDIA_VERSION_CAP; i += 1) {
      versions = appendLanguageClipTake(versions, 'es', take(`es${i}`))
    }
    expect(versions.es.takes).toHaveLength(MEDIA_VERSION_CAP)
    expect(versions.es.takes.some((row) => row.id === 'es0')).toBe(false)
    expect(versions.es.currentTakeId).toBe(`es${MEDIA_VERSION_CAP}`)
    const master = segment({ languageVersions: versions })
    expect(master.takes.map((row) => row.id)).toEqual(['master'])
  })

  it('labels the oldest clip v1 and treats the newest pointer as Latest', () => {
    const versions = ['es1', 'es2', 'es3'].reduce(
      (current, id) => appendLanguageClipTake(current, 'es', take(id)),
      undefined
    )
    const options = listLanguageClipVersionOptions(versions?.es)
    expect(options.map((option) => `${option.label}:${option.id}`)).toEqual([
      'v1:es1',
      'v2:es2',
      'v3:es3',
    ])
    expect(options.find((option) => option.isCurrent)?.id).toBe('es3')
    expect(languageClipSelectionValue(options)).toBe('latest')

    const pinned = withSelectedLanguageClip(segment({ languageVersions: versions }), 'es', 'es1')
    expect(pinned.activeAssetUrl).toBe('master.mp4')
    expect(pinned.currentTakeId).toBe('master')
    const pinnedOptions = listLanguageClipVersionOptions(pinned.languageVersions?.es)
    expect(languageClipSelectionValue(pinnedOptions)).toBe('es1')
    expect(pinnedOptions.find((option) => option.id === 'es1')?.isCurrent).toBe(true)
  })

  it('plays the language clip and falls back to the master when none exists', () => {
    const withSpanish = segment({
      languageVersions: appendLanguageClipTake(undefined, 'es', take('es1', 'es.mp4')),
    })
    expect(presentSegmentForStream(withSpanish, 'es').activeAssetUrl).toBe('es.mp4')
    expect(presentSegmentForStream(withSpanish, 'en').activeAssetUrl).toBe('master.mp4')
    expect(presentSegmentForStream(segment(), 'fr').activeAssetUrl).toBe('master.mp4')
  })

  it('keeps language history when a re-derive replaces segment ids on the same beat', () => {
    const previous = [
      segment({
        segmentId: 'old',
        beatId: 'bt_1',
        languageVersions: appendLanguageClipTake(undefined, 'es', take('es1', 'es.mp4')),
      }),
    ]
    const kept = keepLanguageClipVersions(
      [segment({ segmentId: 'new', beatId: 'bt_1', languageVersions: undefined })],
      previous
    )
    expect(kept[0].languageVersions?.es.takes.map((row) => row.id)).toEqual(['es1'])
  })
})

describe('merge language clip versions', () => {
  it('unions language takes by id and does not wipe them when the incoming segment omits them', () => {
    const existing = {
      isSegmented: true,
      targetSegmentDuration: 8,
      segments: [
        segment({
          languageVersions: {
            es: { takes: [take('es1', 'es.mp4')], currentTakeId: 'es1' },
          },
        }),
      ],
    }
    const incoming = {
      isSegmented: true,
      targetSegmentDuration: 8,
      segments: [segment({ takes: [], activeAssetUrl: 'master.mp4' })],
    }
    const merged = mergeSceneProductionData(existing, incoming)!
    expect(merged.segments[0].languageVersions?.es.takes.map((row) => row.id)).toEqual(['es1'])
    expect(merged.segments[0].currentTakeId).toBe('master')
    expect(merged.segments[0].activeAssetUrl).toBe('master.mp4')
  })
})

describe('language clip prompts', () => {
  it('swaps the spoken line and keeps English stage direction', () => {
    const source =
      'ELARA speaks with natural lip sync: "Hello there". Delivery: softly. Close-up; slow push.'
    expect(buildLanguageClipPrompt(source, 'Hola', 'ELARA')).toBe(
      'ELARA speaks with natural lip sync: "Hola". Delivery: softly. Close-up; slow push.'
    )
  })

  it('leaves narration and action pictures in English and translates the guide line', () => {
    const visual = 'Visual backdrop for narration; atmospheric motion, no on-screen dialogue text.'
    const composed = composeLanguageClipPrompt({
      sourcePrompt: visual,
      guidePrompt: 'Narrator: The door is open.',
      kind: 'narration',
      englishLine: 'The door is open.',
      translatedLine: 'La puerta está abierta.',
    })
    expect(composed.prompt).toBe(visual)
    expect(composed.guidePrompt).toBe('Narrator: La puerta está abierta.')
  })

  it('prefers a stored full-line translation and skips split excerpts', () => {
    const translation = { dialogue: ['Hola'], narration: 'Érase una vez' }
    const dialogue = [{ lineId: 'ln_1', line: 'Hello' }]
    expect(
      preferStoredSpokenTranslation({
        translation,
        kind: 'dialogue',
        lineId: 'ln_1',
        dialogue,
        englishLine: 'Hello',
      })
    ).toBe('Hola')
    expect(
      preferStoredSpokenTranslation({
        translation,
        kind: 'dialogue',
        lineId: 'ln_1',
        dialogue,
        englishLine: 'Hello there',
        isExcerpt: true,
      })
    ).toBeUndefined()
    expect(
      preferStoredSpokenTranslation({
        translation,
        kind: 'narration',
        englishLine: 'Once upon a time',
      })
    ).toBe('Érase una vez')
  })
})
