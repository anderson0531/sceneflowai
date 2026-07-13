import { describe, it, expect } from 'vitest'
import {
  mergeScenesForScriptSave,
  mergeExpressOrchestratedScenes,
  mergeScenesTrustingIncomingAudio,
  sceneHasAudioRefs,
  countNonEmptySfxSlots,
} from '@/lib/audio/cleanupAudio'
import {
  mergeSceneArraysForPersistence,
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

  it('preserves canonical sfxAudio slots when incoming snapshot is shorter or has null holes', () => {
    const canonical = {
      id: 's1',
      sfxAudio: ['https://example.com/sfx-beat1.mp3', 'https://example.com/sfx-beat2.mp3'],
    }
    const incoming = {
      id: 's1',
      heading: 'edited',
      sfxAudio: ['https://example.com/sfx-beat1.mp3', null],
    }

    const merged = mergeScenePreservingMedia(canonical, incoming)
    expect(merged.sfxAudio[0]).toBe('https://example.com/sfx-beat1.mp3')
    expect(merged.sfxAudio[1]).toBe('https://example.com/sfx-beat2.mp3')
    expect(merged.heading).toBe('edited')
  })

  it('lets incoming sfxAudio URL win at an index when regenerating SFX', () => {
    const canonical = {
      id: 's1',
      sfxAudio: ['https://example.com/sfx-old.mp3'],
    }
    const incoming = {
      id: 's1',
      sfxAudio: ['https://example.com/sfx-new.mp3'],
    }

    const merged = mergeScenePreservingMedia(canonical, incoming)
    expect(merged.sfxAudio[0]).toBe('https://example.com/sfx-new.mp3')
  })

  it('preserves sfx cues with sourceBeatId when incoming sfx array is shorter', () => {
    const canonical = {
      id: 's1',
      sfx: [
        { description: 'Keyboard', sourceBeatId: 'bt_1', audioUrl: 'https://example.com/sfx1.mp3' },
        { description: 'Door', sourceBeatId: 'bt_2', audioUrl: 'https://example.com/sfx2.mp3' },
      ],
    }
    const incoming = {
      id: 's1',
      sfx: [{ description: 'Keyboard typing', sourceBeatId: 'bt_1' }],
    }

    const merged = mergeScenePreservingMedia(canonical, incoming)
    expect(merged.sfx[0].sourceBeatId).toBe('bt_1')
    expect(merged.sfx[0].audioUrl).toBe('https://example.com/sfx1.mp3')
    expect(merged.sfx[1].sourceBeatId).toBe('bt_2')
    expect(merged.sfx[1].audioUrl).toBe('https://example.com/sfx2.mp3')
  })

  it('does not introduce sfxAudio on scenes that never had SFX', () => {
    const canonical = { id: 's1', heading: 'Scene' }
    const incoming = { id: 's1', heading: 'Scene edited' }

    const merged = mergeScenePreservingMedia(canonical, incoming)
    expect(merged.sfxAudio).toBeUndefined()
    expect(merged.sfx).toBeUndefined()
  })

  it('remaps sfxAudio by sourceBeatId when cue order changes after beat B upsert', () => {
    const canonical = {
      id: 's1',
      sfx: [
        { description: 'Keyboard', sourceBeatId: 'bt_1', sfxId: 'sfx_1' },
        { description: 'Door', sourceBeatId: 'bt_2', sfxId: 'sfx_2' },
      ],
      sfxAudio: ['https://example.com/beat1.mp3', 'https://example.com/beat2.mp3'],
    }
    const incoming = {
      id: 's1',
      sfx: [
        { description: 'Door creak', sourceBeatId: 'bt_2', sfxId: 'sfx_2' },
        { description: 'Keyboard typing', sourceBeatId: 'bt_1', sfxId: 'sfx_1' },
        { description: 'Wind', sourceBeatId: 'bt_3', sfxId: 'sfx_3' },
      ],
      sfxAudio: ['https://example.com/beat2-new.mp3', null, 'https://example.com/beat3.mp3'],
    }

    const merged = mergeScenePreservingMedia(canonical, incoming)
    const beat1Idx = merged.sfx.findIndex((c: any) => c.sourceBeatId === 'bt_1')
    const beat2Idx = merged.sfx.findIndex((c: any) => c.sourceBeatId === 'bt_2')
    expect(merged.sfxAudio[beat1Idx]).toBe('https://example.com/beat1.mp3')
    expect(merged.sfxAudio[beat2Idx]).toBe('https://example.com/beat2-new.mp3')
  })

  it('merges sequential beat SFX saves when canonical lacks prior beat audio', () => {
    const canonical = {
      id: 's1',
      heading: 'Scene',
      sfx: [{ description: 'Keyboard', sourceBeatId: 'bt_1', sfxId: 'sfx_1' }],
    }
    const incoming = {
      id: 's1',
      heading: 'Scene',
      sfx: [
        { description: 'Keyboard', sourceBeatId: 'bt_1', sfxId: 'sfx_1' },
        { description: 'Door', sourceBeatId: 'bt_2', sfxId: 'sfx_2' },
      ],
      sfxAudio: ['https://example.com/beat1.mp3', 'https://example.com/beat2.mp3'],
    }

    const merged = mergeScenePreservingMedia(canonical, incoming)
    expect(merged.sfxAudio[0]).toBe('https://example.com/beat1.mp3')
    expect(merged.sfxAudio[1]).toBe('https://example.com/beat2.mp3')
  })
})

describe('mergeScenesForScriptSave media preservation', () => {
  it('sceneHasAudioRefs detects non-empty sfxAudio', () => {
    expect(sceneHasAudioRefs({ sfxAudio: [null, 'https://example.com/sfx.mp3'] })).toBe(true)
    expect(sceneHasAudioRefs({ sfxAudio: [null, null] })).toBe(false)
  })

  it('rejects stale incoming that drops sfxAudio when canonical has SFX', () => {
    const canonical = [
      {
        id: 's1',
        sfxAudio: ['https://example.com/sfx1.mp3', 'https://example.com/sfx2.mp3'],
      },
    ]
    const incoming = [
      {
        id: 's1',
        heading: 'edited',
        sfxAudio: ['https://example.com/sfx1.mp3'],
      },
    ]

    const merged = mergeScenesForScriptSave(canonical, incoming)
    expect(merged[0].sfxAudio[1]).toBe('https://example.com/sfx2.mp3')
  })

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

  it('keeps incoming sfxAudio when canonical has no SFX after atomic beat save', () => {
    const canonical = [{ id: 's1', heading: 'Scene' }]
    const incoming = [
      {
        id: 's1',
        heading: 'Scene',
        sfx: [{ description: 'Click', sourceBeatId: 'bt_1', sfxId: 'sfx_1' }],
        sfxAudio: ['https://example.com/beat1.mp3'],
      },
    ]

    const merged = mergeScenesForScriptSave(canonical, incoming)
    expect(merged[0].sfxAudio[0]).toBe('https://example.com/beat1.mp3')
    expect(countNonEmptySfxSlots(merged[0])).toBe(1)
  })

  it('preserves both beat URLs when incoming is server-fresh superset', () => {
    const canonical = [
      {
        id: 's1',
        sfx: [{ description: 'Click', sourceBeatId: 'bt_1', sfxId: 'sfx_1' }],
        sfxAudio: ['https://example.com/beat1.mp3'],
      },
    ]
    const incoming = [
      {
        id: 's1',
        sfx: [
          { description: 'Click', sourceBeatId: 'bt_1', sfxId: 'sfx_1' },
          { description: 'Door', sourceBeatId: 'bt_2', sfxId: 'sfx_2' },
        ],
        sfxAudio: ['https://example.com/beat1.mp3', 'https://example.com/beat2.mp3'],
      },
    ]

    const merged = mergeScenesForScriptSave(canonical, incoming)
    expect(merged[0].sfxAudio[0]).toBe('https://example.com/beat1.mp3')
    expect(merged[0].sfxAudio[1]).toBe('https://example.com/beat2.mp3')
  })
})

describe('mergeScenesTrustingIncomingAudio', () => {
  it('prefers incoming sfxAudio over stale canonical when syncing after atomic save', () => {
    const canonical = [
      {
        id: 's1',
        heading: 'Local edit',
        sfx: [{ description: 'Click', sourceBeatId: 'bt_1', sfxId: 'sfx_1' }],
      },
    ]
    const incoming = [
      {
        id: 's1',
        heading: 'Server',
        sfx: [
          { description: 'Click', sourceBeatId: 'bt_1', sfxId: 'sfx_1' },
          { description: 'Door', sourceBeatId: 'bt_2', sfxId: 'sfx_2' },
        ],
        sfxAudio: ['https://example.com/beat1.mp3', 'https://example.com/beat2.mp3'],
      },
    ]

    const merged = mergeScenesTrustingIncomingAudio(canonical, incoming)
    expect(merged[0].sfxAudio[0]).toBe('https://example.com/beat1.mp3')
    expect(merged[0].sfxAudio[1]).toBe('https://example.com/beat2.mp3')
  })
})

describe('mergeSceneArraysForPersistence', () => {
  it('preserves beat storyboardImageUrl when incoming omits it but beat content is unchanged', () => {
    const existing = [
      {
        id: 's2',
        beats: [
          {
            beatId: 'bt_1',
            kind: 'dialogue',
            character: 'A',
            line: 'Same line',
            storyboardImageUrl: 'https://example.com/saved.jpg',
          },
        ],
      },
      {
        id: 's3',
        beats: [
          {
            beatId: 'bt_2',
            kind: 'dialogue',
            storyboardImageUrl: 'https://example.com/s3.jpg',
          },
        ],
      },
    ]
    const incoming = [
      {
        id: 's2',
        beats: [{ beatId: 'bt_1', kind: 'dialogue', character: 'A', line: 'Same line' }],
      },
      {
        id: 's4',
        beats: [
          {
            beatId: 'bt_new',
            kind: 'dialogue',
            storyboardImageUrl: 'https://example.com/s4.jpg',
          },
        ],
      },
    ]

    const merged = mergeSceneArraysForPersistence(existing, incoming)
    expect(merged).toHaveLength(3)
    expect(merged[0].beats[0].storyboardImageUrl).toBe('https://example.com/saved.jpg')
    expect(merged[1].beats[0].storyboardImageUrl).toBe('https://example.com/s4.jpg')
    expect(merged.find((s: any) => s.id === 's3')?.beats[0].storyboardImageUrl).toBe(
      'https://example.com/s3.jpg'
    )
  })

  it('does not restore beat storyboardImageUrl when beat dialogue content changed', () => {
    const existing = [
      {
        id: 's2',
        beats: [
          {
            beatId: 'bt_1',
            kind: 'dialogue',
            character: 'A',
            line: 'Old line',
            storyboardImageUrl: 'https://example.com/saved.jpg',
          },
        ],
      },
    ]
    const incoming = [
      {
        id: 's2',
        beats: [{ beatId: 'bt_1', kind: 'dialogue', character: 'A', line: 'Updated' }],
      },
    ]

    const merged = mergeSceneArraysForPersistence(existing, incoming)
    expect(merged[0].beats[0].line).toBe('Updated')
    expect(merged[0].beats[0].storyboardImageUrl).toBeUndefined()
  })

  it('preserves visionPhase.scenes dialogue frames when incoming legacy mirror omits them', () => {
    const existing = [
      {
        id: 's2',
        dialogue: [{ character: 'A', line: 'Hi', storyboardImageUrl: 'https://example.com/d0.png' }],
      },
    ]
    const incoming = [{ id: 's2', dialogue: [{ character: 'A', line: 'Hi edited' }] }]

    const merged = mergeSceneArraysForPersistence(existing, incoming)
    expect(merged[0].dialogue[0].storyboardImageUrl).toBe('https://example.com/d0.png')
    expect(merged[0].dialogue[0].line).toBe('Hi edited')
  })
})

describe('mergeExpressOrchestratedScenes', () => {
  it('keeps orchestrated beat frames and audio when fresh DB lacks them', () => {
    const freshDb = [
      {
        id: 's2',
        heading: 'Stale heading',
        beats: [{ beatId: 'bt_1', kind: 'dialogue', line: 'Old' }],
      },
    ]
    const orchestrated = [
      {
        id: 's2',
        heading: 'Express heading',
        beats: [
          {
            beatId: 'bt_1',
            kind: 'dialogue',
            line: 'New',
            storyboardImageUrl: 'https://example.com/express-beat.jpg',
          },
        ],
        narrationAudio: {
          en: { url: 'https://example.com/narration.mp3', duration: 5 },
        },
      },
    ]

    const merged = mergeExpressOrchestratedScenes(orchestrated, freshDb)
    expect(merged).toHaveLength(1)
    expect(merged[0].heading).toBe('Express heading')
    expect(merged[0].beats[0].storyboardImageUrl).toBe('https://example.com/express-beat.jpg')
    expect(merged[0].narrationAudio.en.url).toBe('https://example.com/narration.mp3')
  })

  it('preserves orchestrated frames when stale DB has old direction but no new frames', () => {
    const freshDb = [
      {
        id: 's3',
        sceneDirection: { camera: 'old cam', scene: 'old scene', talent: 'old', segmentPromptBundle: [] },
        imageUrl: 'https://example.com/stale-establishing.jpg',
        beats: [{ beatId: 'bt_2', kind: 'dialogue', line: 'Stale' }],
      },
    ]
    const orchestrated = [
      {
        id: 's3',
        sceneDirection: {
          camera: 'new cam',
          scene: 'new scene',
          talent: 'new',
          segmentPromptBundle: [{ segmentId: 'seg-1' }],
        },
        imageUrl: 'https://example.com/new-establishing.jpg',
        beats: [
          {
            beatId: 'bt_2',
            kind: 'dialogue',
            line: 'Fresh',
            storyboardImageUrl: 'https://example.com/new-beat.jpg',
          },
        ],
      },
    ]

    const merged = mergeExpressOrchestratedScenes(orchestrated, freshDb)
    expect(merged[0].sceneDirection.camera).toBe('new cam')
    expect(merged[0].imageUrl).toBe('https://example.com/new-establishing.jpg')
    expect(merged[0].beats[0].storyboardImageUrl).toBe('https://example.com/new-beat.jpg')
  })

  it('keeps orchestrated beat frames when stale DB has a newer concurrent-save URL', () => {
    const freshDb = [
      {
        id: 's2',
        beats: [
          {
            beatId: 'bt_1',
            storyboardImageUrl:
              'https://x.public.blob.vercel-storage.com/images/frames/p/stale-save/1779527367355.jpeg',
          },
        ],
      },
    ]
    const orchestrated = [
      {
        id: 's2',
        beats: [
          {
            beatId: 'bt_1',
            storyboardImageUrl:
              'https://x.public.blob.vercel-storage.com/images/frames/p/express/1779500000000.jpeg',
          },
        ],
      },
    ]

    const wrongMerge = mergeSceneArraysForPersistence(freshDb, orchestrated)
    const expressMerge = mergeExpressOrchestratedScenes(orchestrated, freshDb)

    expect(wrongMerge[0].beats[0].storyboardImageUrl).toContain('1779527367355')
    expect(expressMerge[0].beats[0].storyboardImageUrl).toContain('1779500000000')
  })
})
