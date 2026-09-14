import { describe, expect, it } from 'vitest'
import {
  applySceneAudioPersistToMetadata,
  shouldBumpScriptUpdatedAtOnAudioPersist,
} from '@/lib/audio/applySceneAudioPersistToMetadata'

const SCRIPT_TS = '2026-09-14T09:23:07.794Z'
const CLIP = 'https://blob.example.com/audio/line.mp3'

function voiceMetadata() {
  return {
    visionPhase: {
      scriptUpdatedAt: SCRIPT_TS,
      script: {
        script: {
          scenes: [
            {
              id: 'sc_1',
              dialogueAudio: { en: [] as Array<Record<string, unknown>> },
            },
          ],
        },
      },
    },
  }
}

describe('shouldBumpScriptUpdatedAtOnAudioPersist', () => {
  it('never bumps for dialogue, narration, or description', () => {
    expect(shouldBumpScriptUpdatedAtOnAudioPersist('dialogue', true)).toBe(false)
    expect(shouldBumpScriptUpdatedAtOnAudioPersist('narration', true)).toBe(false)
    expect(shouldBumpScriptUpdatedAtOnAudioPersist('description', true)).toBe(false)
  })

  it('bumps for music/sfx only when the caller opted in', () => {
    expect(shouldBumpScriptUpdatedAtOnAudioPersist('music', true)).toBe(true)
    expect(shouldBumpScriptUpdatedAtOnAudioPersist('sfx', true)).toBe(true)
    expect(shouldBumpScriptUpdatedAtOnAudioPersist('music', false)).toBe(false)
    expect(shouldBumpScriptUpdatedAtOnAudioPersist('dialogue')).toBe(false)
  })
})

describe('applySceneAudioPersistToMetadata', () => {
  it('writes a dialogue clip without changing scriptUpdatedAt', () => {
    const metadata = voiceMetadata()
    applySceneAudioPersistToMetadata(metadata, {
      projectId: 'proj',
      sceneIndex: 0,
      audioType: 'dialogue',
      audioUrl: CLIP,
      language: 'en',
      dialogueIndex: 0,
      characterName: 'DR. CHEN',
      lineMeta: { lineId: 'ln_1' },
      updateScriptUpdatedAt: true,
    })

    const scene = metadata.visionPhase.script.script.scenes[0] as {
      dialogueAudio: { en: Array<{ audioUrl?: string; lineId?: string }> }
    }
    expect(scene.dialogueAudio.en[0].audioUrl).toBe(CLIP)
    expect(scene.dialogueAudio.en[0].lineId).toBe('ln_1')
    expect(metadata.visionPhase.scriptUpdatedAt).toBe(SCRIPT_TS)
  })

  it('writes a narration clip without changing scriptUpdatedAt', () => {
    const metadata = voiceMetadata()
    applySceneAudioPersistToMetadata(metadata, {
      projectId: 'proj',
      sceneIndex: 0,
      audioType: 'narration',
      audioUrl: CLIP,
      language: 'en',
      updateScriptUpdatedAt: true,
    })

    const scene = metadata.visionPhase.script.script.scenes[0] as {
      narrationAudio: { en: { url?: string } }
    }
    expect(scene.narrationAudio.en.url).toBe(CLIP)
    expect(metadata.visionPhase.scriptUpdatedAt).toBe(SCRIPT_TS)
  })
})
