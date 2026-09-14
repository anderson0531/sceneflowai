import { describe, expect, it } from 'vitest'
import { mergeVoiceAudioMapsByLineId } from '@/lib/storyboard/mergeVoiceAudioMaps'
import { mergeSceneArraysForPersistence } from '@/lib/storyboard/mergeSceneMedia'

const CLIP = 'https://blob.example.com/audio/line.mp3'
const NARRATION = 'https://blob.example.com/audio/narration.mp3'

describe('mergeVoiceAudioMapsByLineId', () => {
  it('copies dialogueAudio audioUrl onto empty slots matched by lineId', () => {
    const incoming = {
      id: 'sc_1',
      dialogueAudio: {
        en: [{ lineId: 'ln_1', character: 'DR. CHEN', dialogueIndex: 0 }],
      },
    }
    const existing = {
      id: 'sc_1',
      dialogueAudio: {
        en: [{ lineId: 'ln_1', character: 'DR. CHEN', dialogueIndex: 0, audioUrl: CLIP }],
      },
    }

    const result = mergeVoiceAudioMapsByLineId(incoming, existing)

    expect(result.filled).toBe(1)
    expect(result.scene.dialogueAudio.en[0].audioUrl).toBe(CLIP)
  })

  it('does not attach a clip to a different lineId', () => {
    const incoming = {
      dialogueAudio: { en: [{ lineId: 'ln_new' }] },
    }
    const existing = {
      dialogueAudio: { en: [{ lineId: 'ln_old', audioUrl: CLIP }] },
    }

    const result = mergeVoiceAudioMapsByLineId(incoming, existing)

    expect(result.filled).toBe(0)
    expect(result.scene.dialogueAudio.en[0].audioUrl).toBeUndefined()
  })

  it('never overwrites a URL the incoming scene already has', () => {
    const incoming = {
      dialogueAudio: { en: [{ lineId: 'ln_1', audioUrl: 'https://blob.example.com/audio/newer.mp3' }] },
    }
    const existing = {
      dialogueAudio: { en: [{ lineId: 'ln_1', audioUrl: CLIP }] },
    }

    const result = mergeVoiceAudioMapsByLineId(incoming, existing)

    expect(result.filled).toBe(0)
    expect(result.scene.dialogueAudio.en[0].audioUrl).toBe(
      'https://blob.example.com/audio/newer.mp3'
    )
  })

  it('fills object-shaped narrationAudio by language when the url is empty', () => {
    const incoming = { narrationAudio: { en: { duration: 4 } } }
    const existing = { narrationAudio: { en: { url: NARRATION, duration: 4 } } }

    const result = mergeVoiceAudioMapsByLineId(incoming, existing)

    expect(result.filled).toBe(1)
    expect((result.scene.narrationAudio as { en: { url?: string } }).en.url).toBe(NARRATION)
  })
})

describe('mergeSceneArraysForPersistence voice maps', () => {
  it('copies dialogueAudio[lang][].audioUrl onto empty slots matched by lineId', () => {
    const existing = [
      {
        id: 's1',
        dialogue: [{ lineId: 'ln_1', character: 'A', line: 'Hi' }],
        dialogueAudio: {
          en: [{ lineId: 'ln_1', character: 'A', dialogueIndex: 0, audioUrl: CLIP }],
        },
      },
    ]
    const incoming = [
      {
        id: 's1',
        dialogue: [{ lineId: 'ln_1', character: 'A', line: 'Hi edited' }],
        dialogueAudio: {
          en: [{ lineId: 'ln_1', character: 'A', dialogueIndex: 0 }],
        },
      },
    ]

    const merged = mergeSceneArraysForPersistence(existing, incoming)

    expect(merged[0].dialogue[0].line).toBe('Hi edited')
    expect(merged[0].dialogueAudio.en[0].audioUrl).toBe(CLIP)
  })

  it('copies narrationAudio array audioUrl onto empty slots matched by lineId', () => {
    const existing = [
      {
        id: 's1',
        narrationAudio: { en: [{ lineId: 'ln_n', audioUrl: NARRATION }] },
      },
    ]
    const incoming = [
      {
        id: 's1',
        narrationAudio: { en: [{ lineId: 'ln_n' }] },
      },
    ]

    const merged = mergeSceneArraysForPersistence(existing, incoming)

    expect(merged[0].narrationAudio.en[0].audioUrl).toBe(NARRATION)
  })
})
