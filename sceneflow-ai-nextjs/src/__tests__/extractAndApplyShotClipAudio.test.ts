import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it, vi } from 'vitest'
import {
  extractAndSaveActionBeatClipAudio,
  resolveBeatSegmentDuration,
  resolveBeatVideoClipUrl,
} from '@/lib/audio/extractAndApplyShotClipAudio'
import type { SceneSegment } from '@/components/vision/scene-production/types'

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

describe('Shot clip MP3 extraction and shot audio update', () => {
  it('returns undefined when no playable video clip exists for the shot', () => {
    const segments: SceneSegment[] = [
      {
        segmentId: 'seg-1',
        beatId: 'beat-1',
        sequenceIndex: 0,
        startTime: 0,
        endTime: 4,
        status: 'COMPLETE',
        assetType: 'image',
        activeAssetUrl: 'https://cdn.test/still-frame.png',
        takes: [],
        references: {
          characterIds: [],
          sceneRefIds: [],
          objectRefIds: [],
        },
      },
    ]

    expect(resolveBeatVideoClipUrl(segments, 'beat-1', 'en')).toBeUndefined()
    expect(resolveBeatVideoClipUrl(segments, 'missing-beat', 'en')).toBeUndefined()
  })

  it('resolves the live MP4 clip URL when a shot video clip exists', () => {
    const segments: SceneSegment[] = [
      {
        segmentId: 'seg-1',
        beatId: 'beat-1',
        sequenceIndex: 0,
        startTime: 0,
        endTime: 6,
        actualVideoDuration: 5.5,
        status: 'COMPLETE',
        assetType: 'video',
        activeAssetUrl: 'https://cdn.test/shot-1-v2.mp4',
        currentTakeId: 'take-2',
        takes: [
          {
            id: 'take-1',
            assetUrl: 'https://cdn.test/shot-1-v1.mp4',
            status: 'COMPLETE',
            createdAt: '2026-10-20T10:00:00.000Z',
          },
          {
            id: 'take-2',
            assetUrl: 'https://cdn.test/shot-1-v2.mp4',
            status: 'COMPLETE',
            createdAt: '2026-10-20T10:05:00.000Z',
          },
        ],
        languageVersions: {
          es: {
            currentTakeId: 'es-1',
            takes: [
              {
                id: 'es-1',
                assetUrl: 'https://cdn.test/shot-1-es.mp4',
                status: 'COMPLETE',
                createdAt: '2026-10-20T10:10:00.000Z',
              },
            ],
          },
        },
        references: {
          characterIds: [],
          sceneRefIds: [],
          objectRefIds: [],
        },
      },
    ]

    expect(resolveBeatVideoClipUrl(segments, 'beat-1', 'en')).toBe(
      'https://cdn.test/shot-1-v2.mp4'
    )
    expect(resolveBeatVideoClipUrl(segments, 'beat-1', 'es')).toBe(
      'https://cdn.test/shot-1-es.mp4'
    )
    expect(resolveBeatSegmentDuration(segments, 'beat-1')).toBe(5.5)
  })

  it('extracts MP3 from the shot video clip MP4 and saves it to the action beat SFX slot', async () => {
    const originalFetch = globalThis.fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        url: 'https://cdn.test/shot-audio-beat-action-1.mp3',
        beatId: 'beat-action-1',
        sourceUrl: 'https://cdn.test/shot-action-1.mp4',
      }),
    })
    globalThis.fetch = mockFetch as unknown as typeof fetch

    const onSaveSfxAudio = vi.fn().mockResolvedValue(undefined)

    try {
      const result = await extractAndSaveActionBeatClipAudio({
        projectId: 'proj-123',
        sceneIndex: 2,
        sceneId: 'scene-3',
        beat: {
          beatId: 'beat-action-1',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Steam hisses across the iron valve.\nSFX: High-pressure steam hiss',
        },
        sfxIndex: 1,
        videoUrl: 'https://cdn.test/shot-action-1.mp4',
        onSaveSfxAudio,
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/sfx/extract-clip-audio',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            projectId: 'proj-123',
            videoUrl: 'https://cdn.test/shot-action-1.mp4',
            beatId: 'beat-action-1',
          }),
        })
      )
      expect(result.audioUrl).toBe('https://cdn.test/shot-audio-beat-action-1.mp3')
      expect(onSaveSfxAudio).toHaveBeenCalledWith(
        2,
        'sfx',
        'https://cdn.test/shot-audio-beat-action-1.mp3',
        1,
        null,
        expect.objectContaining({
          beatId: 'beat-action-1',
        })
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('activates Extract clip MP3 in DialogueQualityToggle and shot audio cards when clipUrl exists', () => {
    const toggle = readSource('src/components/vision/DialogueQualityToggle.tsx')
    const workbench = readSource('src/components/vision/scene-production/SceneAudioWorkbench.tsx')
    const sfxControls = readSource('src/components/vision/ActionBeatSfxControls.tsx')

    expect(toggle).toContain('Extract clip MP3')
    expect(toggle).toContain('Extracting MP3...')
    expect(toggle).toContain('const extractEnabled = Boolean(hasClip && onExtractClipAudio)')
    expect(toggle).toContain('disabled={disabled || !extractEnabled || isExtractingClipAudio}')

    expect(workbench).toContain('resolveBeatVideoClipUrl(props.segments, beat.beatId, props.selectedLanguage)')
    expect(workbench).toContain('extractAndSaveSpokenBeatClipAudio')
    expect(workbench).toContain('hasClip={!!clipUrl}')
    expect(workbench).toContain('onExtractClipAudio={() => {')

    expect(sfxControls).toContain('extractAndSaveActionBeatClipAudio')
    expect(sfxControls).toContain('if (!sfxText && !sfxAudio && !clipUrl)')
    expect(sfxControls).toContain('hasClip={!!clipUrl}')
  })
})
