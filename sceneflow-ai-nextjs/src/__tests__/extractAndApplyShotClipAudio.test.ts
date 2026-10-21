import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it, vi } from 'vitest'
import {
  extractAndSaveActionBeatClipAudio,
  resolveBeatSegmentDuration,
  resolveBeatVideoClipUrl,
} from '@/lib/audio/extractAndApplyShotClipAudio'
import { persistDialogueAudioSlot } from '@/lib/audio/clientPersistDialogueAudio'
import { applySceneAudioPersistToMetadata } from '@/lib/audio/applySceneAudioPersistToMetadata'
import { applyAudioSlotToScene } from '@/lib/audio/cleanupAudio'
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
    expect(toggle).toContain('disabled={busy || !extractEnabled}')

    expect(workbench).toContain('resolveBeatVideoClipUrl(props.segments, beat.beatId, props.selectedLanguage)')
    expect(workbench).toContain('extractAndSaveSpokenBeatClipAudio')
    expect(workbench).toContain('hasClip={!!clipUrl}')
    expect(workbench).toContain('onExtractClipAudio={() => {')

    expect(sfxControls).toContain('extractAndSaveActionBeatClipAudio')
    expect(sfxControls).toContain('hasClip={!!clipUrl}')
  })

  it('provides MP3 upload controls on all shot audio cards and persists uploaded shot audio', () => {
    const toggle = readSource('src/components/vision/DialogueQualityToggle.tsx')
    const workbench = readSource('src/components/vision/scene-production/SceneAudioWorkbench.tsx')
    const sfxControls = readSource('src/components/vision/ActionBeatSfxControls.tsx')
    const segDialogue = readSource('src/components/vision/scene-production/SegmentDialogueCard.tsx')
    const segSfx = readSource('src/components/vision/scene-production/SegmentSfxCard.tsx')
    const scriptPanel = readSource('src/components/vision/ScriptPanel.tsx')

    expect(toggle).toContain('Upload MP3')
    expect(toggle).toContain('onUploadAudio')

    expect(sfxControls).toContain('handleUploadSfxAudio')
    expect(sfxControls).toContain('title="Upload Shot MP3 Audio"')
    expect(sfxControls).toContain('onUploadAudio={() => {')

    expect(workbench).toContain("props.uploadAudio?.(sceneIdx, 'dialogue', undefined, i, d.character)")
    expect(workbench).toContain("onDeleteSfxAudio={")

    expect(segDialogue).toContain('dispatchUpload()')
    expect(segSfx).toContain('dispatchUploadMp3')
    expect(segSfx).toContain('onUploadAudio={dispatchUploadMp3}')

    expect(scriptPanel).not.toContain('SFX uploads are no longer supported')
    expect(scriptPanel).toContain("if (type === 'music')")
    expect(scriptPanel).toContain("} else if (type === 'sfx') {")
    expect(scriptPanel).toContain('persistDialogueAudioSlot')
  })

  it('bypasses characterName requirement when uploading dialogue shot audio', async () => {
    const routeSource = readSource('src/app/api/projects/[id]/route.ts')
    const scriptPanel = readSource('src/components/vision/ScriptPanel.tsx')

    expect(routeSource).not.toContain('Dialogue audio update requires characterName')
    expect(scriptPanel).toContain('sceneIndex: sceneIdx')
    expect(scriptPanel).toContain('characterName: resolvedCharacter')
    expect(scriptPanel).toContain("provider: 'upload'")

    const originalFetch = globalThis.fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })
    globalThis.fetch = mockFetch as unknown as typeof fetch

    try {
      const saved = await persistDialogueAudioSlot({
        projectId: 'proj-1',
        sceneIndex: 0,
        audioUrl: 'https://cdn.test/uploaded-shot.mp3',
        language: 'en',
        dialogueIndex: 2,
        lineId: 'ln-2',
        duration: 3.4,
        provider: 'upload',
      })

      expect(saved.characterName).toBe('')
      expect(saved.sceneIndex).toBe(0)
      expect(saved.dialogueIndex).toBe(2)

      const metadata = {
        visionPhase: {
          script: {
            script: {
              scenes: [
                {
                  dialogue: [{ line: 'Line 0' }, { line: 'Line 1' }, { line: 'Line 2', lineId: 'ln-2' }],
                  dialogueAudio: { en: [] },
                },
              ],
            },
          },
        },
      }
      applySceneAudioPersistToMetadata(metadata, {
        projectId: 'proj-1',
        sceneIndex: 0,
        audioType: 'dialogue',
        audioUrl: 'https://cdn.test/uploaded-shot.mp3',
        language: 'en',
        dialogueIndex: 2,
        characterName: '',
        duration: 3.4,
        provider: 'upload',
        lineMeta: { lineId: 'ln-2', lineKind: 'dialogue' },
      })

      const persistedScene = (metadata.visionPhase.script.script.scenes as any[])[0]
      expect(persistedScene.dialogueAudio.en).toHaveLength(1)
      expect(persistedScene.dialogueAudio.en[0]).toMatchObject({
        audioUrl: 'https://cdn.test/uploaded-shot.mp3',
        dialogueIndex: 2,
        lineId: 'ln-2',
        character: '',
        provider: 'upload',
      })

      const clientUpdated = applyAudioSlotToScene(
        {
          dialogueAudio: {
            en: [{ dialogueIndex: 2, lineId: 'ln-2', character: 'Piper Hayes', audioUrl: 'old.mp3' }],
          },
        },
        saved
      )
      expect(clientUpdated.dialogueAudio.en[0]).toMatchObject({
        dialogueIndex: 2,
        lineId: 'ln-2',
        character: 'Piper Hayes',
        audioUrl: 'https://cdn.test/uploaded-shot.mp3',
      })
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
