import { describe, it, expect } from 'vitest'
import { mergeScenesForScriptSave } from '@/lib/audio/cleanupAudio'
import {
  mergeScenePreservingMedia,
  pickDialogueAudioEntry,
  storyboardBlobUrlTimestamp,
} from '@/lib/storyboard/mergeSceneMedia'

describe('mergeScenePreservingMedia', () => {
  it('preserves canonical imageUrl when incoming scene lacks it', () => {
    const canonical = {
      id: 'scene-2',
      heading: 'Scene 2',
      imageUrl: 'https://blob.example/scene2.png',
      dialogue: [{ character: 'A', line: 'Hi', storyboardImageUrl: 'https://blob.example/d0.png' }],
    }
    const incoming = {
      id: 'scene-2',
      heading: 'Scene 2 edited',
      dialogue: [{ character: 'A', line: 'Hi edited' }],
    }

    const merged = mergeScenePreservingMedia(canonical, incoming)
    expect(merged.imageUrl).toBe('https://blob.example/scene2.png')
    expect(merged.dialogue[0].storyboardImageUrl).toBe('https://blob.example/d0.png')
    expect(merged.heading).toBe('Scene 2 edited')
  })

  it('ignores deferred placeholder and keeps canonical URL', () => {
    const canonical = { imageUrl: 'https://blob.example/real.png' }
    const incoming = { imageUrl: 'deferred' }
    expect(mergeScenePreservingMedia(canonical, incoming).imageUrl).toBe(
      'https://blob.example/real.png'
    )
  })

  it('merges segment dialogue storyboardImageUrl by lineId', () => {
    const canonical = {
      dialogue: [{ lineId: 'ln-1', character: 'A', line: 'Hello' }],
      segments: [
        {
          segmentId: 'seg-1',
          dialogue: [
            {
              lineId: 'ln-1',
              character: 'A',
              line: 'Hello',
              kind: 'dialogue',
              storyboardImageUrl: 'https://blob.example/seg-line.png',
            },
          ],
        },
      ],
    }
    const incoming = {
      dialogue: [{ lineId: 'ln-1', character: 'A', line: 'Hello' }],
      segments: [
        {
          segmentId: 'seg-1',
          dialogue: [{ lineId: 'ln-1', character: 'A', line: 'Hello', kind: 'dialogue' }],
        },
      ],
    }

    const merged = mergeScenePreservingMedia(canonical, incoming)
    expect(merged.segments[0].dialogue[0].storyboardImageUrl).toBe(
      'https://blob.example/seg-line.png'
    )
  })

  it('storyboardBlobUrlTimestamp parses blob path timestamps', () => {
    expect(
      storyboardBlobUrlTimestamp(
        'https://x.public.blob.vercel-storage.com/images/frames/p/1779527367355.jpeg'
      )
    ).toBe(1779527367355)
  })

  it('prefers newer blob URL when both valid', () => {
    const canonical = {
      imageUrl:
        'https://x.public.blob.vercel-storage.com/images/frames/p/old/1779500000000.jpeg',
    }
    const incoming = {
      imageUrl:
        'https://x.public.blob.vercel-storage.com/images/frames/p/new/1779527367355.jpeg',
    }
    const merged = mergeScenePreservingMedia(canonical, incoming)
    expect(merged.imageUrl).toContain('1779527367355')
  })

  it('merges per-line dialogueAudio preferring newer manual uploads', () => {
    const canonical = {
      id: 's1',
      dialogueAudio: {
        en: [
          {
            character: 'Bob',
            dialogueIndex: 1,
            audioUrl:
              'https://x.public.blob.vercel-storage.com/audio/dialogue/p/scene-0-bob-1779172978058.mp3',
            duration: 10,
          },
        ],
      },
    }
    const incoming = {
      id: 's1',
      dialogueAudio: {
        en: [
          {
            character: 'Bob',
            dialogueIndex: 1,
            audioUrl:
              'https://x.public.blob.vercel-storage.com/audio/uploads/default/1779502385910-bob.wav',
            duration: 11,
          },
        ],
      },
    }

    const merged = mergeScenePreservingMedia(canonical, incoming)
    expect(merged.dialogueAudio.en[0].audioUrl).toContain('/uploads/default/')
    expect(merged.dialogueAudio.en[0].audioUrl).toContain('1779502385910')
  })

  it('pickDialogueAudioEntry prefers newer timestamp', () => {
    const older = {
      dialogueIndex: 0,
      audioUrl: 'https://x.public.blob.vercel-storage.com/audio/dialogue/old-1779170000000.mp3',
    }
    const newer = {
      dialogueIndex: 0,
      audioUrl: 'https://x.public.blob.vercel-storage.com/audio/uploads/default/1779502356523.wav',
    }
    expect(pickDialogueAudioEntry(newer, older).audioUrl).toContain('1779502356523')
  })
})

describe('mergeScenesForScriptSave media preservation', () => {
  it('keeps scene 2 imageUrl when incoming script edit omits it', () => {
    const canonical = [
      { id: 's1', imageUrl: 'https://example.com/1.png' },
      { id: 's2', imageUrl: 'https://example.com/2.png' },
    ]
    const incoming = [
      { id: 's1', imageUrl: 'https://example.com/1.png', heading: 'A' },
      { id: 's2', heading: 'B edited' },
    ]

    const merged = mergeScenesForScriptSave(canonical, incoming)
    expect(merged[1].imageUrl).toBe('https://example.com/2.png')
    expect(merged[1].heading).toBe('B edited')
  })
})
