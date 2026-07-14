import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  migrateMixerSettingsByLanguage,
  getMixerSettingsForLanguage,
  buildLanguageMixerSnapshot,
  splitLanguageMixerSettings,
} from '@/lib/scene/mixerSettings'
import type { SceneProductionData } from '@/components/vision/scene-production/types'
import {
  resolveOverlayText,
  resolveWatermarkText,
  autoTranslateMixerTextOverlays,
  backfillMixerTextForScene,
  applyResolvedOverlaysForLanguage,
} from '@/lib/storyboard/mixerTextTranslations'

describe('per-language mixer settings', () => {
  it('migrates legacy mixerSettings into mixerSettingsByLanguage.en', () => {
    const data: SceneProductionData = {
      isSegmented: true,
      targetSegmentDuration: 10,
      segments: [],
      mixerSettings: {
        audioTracks: { dialogue: { volume: 0.42 } },
        productionTarget: { language: 'en', streamType: 'animatic' },
      },
    }
    const migrated = migrateMixerSettingsByLanguage(data)
    expect(migrated.en?.audioTracks?.dialogue?.volume).toBe(0.42)
    expect(getMixerSettingsForLanguage(data, 'en')?.audioTracks?.dialogue?.volume).toBe(0.42)
  })

  it('preserves independent language snapshots', () => {
    const data: SceneProductionData = {
      isSegmented: true,
      targetSegmentDuration: 10,
      segments: [],
      mixerSettingsByLanguage: {
        en: { audioTracks: { dialogue: { volume: 0.9 } } },
        es: { audioTracks: { dialogue: { volume: 0.3 } } },
      },
    }
    expect(getMixerSettingsForLanguage(data, 'en')?.audioTracks?.dialogue?.volume).toBe(0.9)
    expect(getMixerSettingsForLanguage(data, 'es')?.audioTracks?.dialogue?.volume).toBe(0.3)
  })

  it('splitLanguageMixerSettings removes shared UI fields', () => {
    const split = splitLanguageMixerSettings({
      audioTracks: { music: { volume: 0.5 } },
      theaterMode: true,
      collapsedSections: { timeline: false },
      productionTarget: { language: 'es', streamType: 'video' },
    })
    expect(split.audioTracks?.music?.volume).toBe(0.5)
    expect(split.theaterMode).toBeUndefined()
    expect(split.productionTarget).toBeUndefined()
  })

  it('buildLanguageMixerSnapshot serializes per-language payload', () => {
    const snapshot = buildLanguageMixerSnapshot({
      audioTracks: {
        narration: { enabled: false, volume: 0.8, startOffset: 0, startSegment: 0, endSegment: -1 },
        dialogue: { enabled: true, volume: 0.7, startOffset: 0, startSegment: 0, endSegment: -1 },
        music: { enabled: false, volume: 0.4, startOffset: 0, startSegment: 0, endSegment: -1 },
        sfx: { enabled: false, volume: 0.6, startOffset: 0, startSegment: 0, endSegment: -1 },
      },
      segmentAudioConfigs: {},
      dialogueClipConfigs: {},
      masterSegmentVolume: 0.8,
      resolution: '1080p',
      preserveBackgroundStem: true,
      includeSpeechStem: false,
      klingLipsyncEnabled: false,
      watermarkConfig: {
        enabled: true,
        type: 'text',
        text: 'Brand',
        textStyle: {
          fontFamily: 'Inter',
          fontSize: 3,
          fontWeight: 500,
          color: '#fff',
          opacity: 0.6,
        },
        imageUrl: '',
        imageStyle: { width: 10, opacity: 0.7 },
        anchor: 'bottom-right',
        padding: 60,
      },
    })
    expect(snapshot.audioTracks?.dialogue?.volume).toBe(0.7)
    expect(snapshot.watermarkConfig?.text).toBe('Brand')
    expect(snapshot.theaterMode).toBeUndefined()
  })
})

describe('mixer text translations', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ translatedText: 'Hola' }),
    } as Response)
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('resolveOverlayText prefers translated stream', () => {
    const overlay = {
      id: 'ov1',
      text: 'Hello',
      position: { x: 50, y: 50, anchor: 'center' as const },
      style: {
        preset: 'title' as const,
        fontFamily: 'Inter',
        fontSize: 8,
        fontWeight: 600 as const,
        color: '#fff',
      },
      timing: { startTime: 0, duration: 5, fadeInMs: 0, fadeOutMs: 0 },
    }
    const translations = { es: { ov1: { text: 'Hola' } } }
    expect(resolveOverlayText(overlay, 'es', translations).text).toBe('Hola')
    expect(resolveOverlayText(overlay, 'es', {}).text).toBe('Hello')
  })

  it('resolveWatermarkText falls back to English', () => {
    const english = {
      enabled: true,
      type: 'text' as const,
      text: 'SceneFlow AI Studio',
      textStyle: {
        fontFamily: 'Inter',
        fontSize: 3,
        fontWeight: 500 as const,
        color: '#fff',
        opacity: 0.6,
      },
      imageUrl: '',
      imageStyle: { width: 10, opacity: 0.7 },
      anchor: 'bottom-right' as const,
      padding: 60,
    }
    const spanish = { ...english, text: undefined }
    expect(resolveWatermarkText(spanish, 'es', english)).toBe('SceneFlow AI Studio')
  })

  it('autoTranslateMixerTextOverlays skips edited entries', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const overlays = [
      {
        id: 'ov1',
        text: 'Title',
        position: { x: 50, y: 10, anchor: 'top-center' as const },
        style: {
          preset: 'title' as const,
          fontFamily: 'Inter',
          fontSize: 8,
          fontWeight: 700 as const,
          color: '#fff',
        },
        timing: { startTime: 0, duration: 5, fadeInMs: 0, fadeOutMs: 0 },
      },
      {
        id: 'ov2',
        text: 'Other',
        position: { x: 50, y: 90, anchor: 'bottom-center' as const },
        style: {
          preset: 'subtitle' as const,
          fontFamily: 'Inter',
          fontSize: 4,
          fontWeight: 400 as const,
          color: '#fff',
        },
        timing: { startTime: 0, duration: 5, fadeInMs: 0, fadeOutMs: 0 },
      },
    ]
    await autoTranslateMixerTextOverlays({
      overlays,
      targetLanguages: ['es'],
      translations: { es: { ov2: { text: 'Manual', edited: true } } },
      onSave,
    })
    expect(onSave).toHaveBeenCalledWith({
      es: {
        ov1: { text: 'Hola', subtext: undefined, edited: false },
        ov2: { text: 'Manual', edited: true },
      },
    })
  })

  it('backfillMixerTextForScene populates overlay translations and watermark', async () => {
    const productionData: SceneProductionData = {
      isSegmented: true,
      targetSegmentDuration: 10,
      segments: [],
      textOverlays: [
        {
          id: 'ov1',
          text: 'Chapter One',
          position: { x: 50, y: 50, anchor: 'center' },
          style: {
            preset: 'title',
            fontFamily: 'Inter',
            fontSize: 8,
            fontWeight: 700,
            color: '#fff',
          },
          timing: { startTime: 0, duration: 5, fadeInMs: 0, fadeOutMs: 0 },
        },
      ],
      mixerSettingsByLanguage: {
        en: {
          watermarkConfig: {
            enabled: true,
            type: 'text',
            text: 'SceneFlow AI Studio',
          },
        },
      },
    }

    const { productionData: updated, count } = await backfillMixerTextForScene('es', productionData)
    expect(count).toBeGreaterThan(0)
    expect(updated.textOverlayTranslations?.es?.ov1?.text).toBe('Hola')
    expect(updated.mixerSettingsByLanguage?.es?.watermarkConfig?.text).toBe('Hola')
  })

  it('applyResolvedOverlaysForLanguage maps all overlays', () => {
    const overlays = [
      {
        id: 'ov1',
        text: 'Hello',
        position: { x: 50, y: 50, anchor: 'center' as const },
        style: {
          preset: 'title' as const,
          fontFamily: 'Inter',
          fontSize: 8,
          fontWeight: 600 as const,
          color: '#fff',
        },
        timing: { startTime: 0, duration: 5, fadeInMs: 0, fadeOutMs: 0 },
      },
    ]
    const resolved = applyResolvedOverlaysForLanguage(overlays, 'es', {
      es: { ov1: { text: 'Hola' } },
    })
    expect(resolved[0].text).toBe('Hola')
  })
})
