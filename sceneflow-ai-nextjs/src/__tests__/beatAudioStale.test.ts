import { describe, expect, it } from 'vitest'
import {
  actionBeatSfxIsStale,
  audioSourceFingerprintForSpoken,
  isBeatAudioStale,
  stampStaleBeatAudioOnScene,
} from '@/lib/audio/beatAudioStale'
import { applyAudioSlotToScene, mergeScenesForScriptSave } from '@/lib/audio/cleanupAudio'
import {
  buildExpressAudioItems,
  defaultExpressAudioSelection,
} from '@/lib/audio/buildExpressAudioItems'
import { applySceneAudioPersistToMetadata } from '@/lib/audio/applySceneAudioPersistToMetadata'
import {
  applyBeatStoryboardImageToScene,
  applyDialogueStoryboardImageToScene,
  applyEstablishingImageToScene,
  getSceneBeats,
} from '@/lib/script/beatMigration'
import { isBeatFrameStale } from '@/lib/storyboard/syncBeatStillPrompt'
import { beatFrameNeedsGeneration } from '@/lib/storyboard/storyboardQuality'
import { slotEligibleForScope } from '@/lib/storyboard/expressBeatFrameProgress'
import { refreshSceneSegmentVideoPrompts } from '@/lib/scene/syncBeatVideoPrompt'
import { buildBeatVideoClips } from '@/lib/scene/buildBeatVideoClips'
import { applyVideoTakeSelection } from '@/lib/storyboard/mediaVersions'
import {
  hydratePromoSceneWithSharedShots,
  PROMO_SCENE_CINEMATIC_TYPE,
  syncPromoSharedBeatsToSourceScenes,
} from '@/lib/publish/buildPromoScene'

describe('beat audio stale detection', () => {
  it('treats exact fingerprint match as in sync', () => {
    const fingerprint = audioSourceFingerprintForSpoken({
      kind: 'dialogue',
      character: 'Alex',
      line: 'We need to move now.',
    })
    expect(
      isBeatAudioStale({
        hasAudio: true,
        sourceFingerprint: fingerprint,
        currentFingerprint: fingerprint,
      })
    ).toBe(false)
  })

  it('marks stale when spoken line text changes', () => {
    const generated = audioSourceFingerprintForSpoken({
      kind: 'dialogue',
      character: 'Alex',
      line: 'We need to move now.',
    })
    const current = audioSourceFingerprintForSpoken({
      kind: 'dialogue',
      character: 'Alex',
      line: 'We should wait here.',
    })
    expect(
      isBeatAudioStale({
        hasAudio: true,
        sourceFingerprint: generated,
        currentFingerprint: current,
      })
    ).toBe(true)
  })

  it('marks stale when the acting brief changes and stays stable when it is absent', () => {
    const withoutBrief = audioSourceFingerprintForSpoken({
      kind: 'dialogue',
      character: 'Elena',
      line: '[obsessive, breathless] The differential holds.',
    })
    const withBrief = audioSourceFingerprintForSpoken({
      kind: 'dialogue',
      character: 'Elena',
      line: '[obsessive, breathless] The differential holds.',
      voiceDirection: 'Close-mic, private, strained.',
    })
    expect(withoutBrief).not.toContain('|vd:')
    expect(withBrief).toContain('|vd:')
    expect(
      isBeatAudioStale({
        hasAudio: true,
        sourceFingerprint: withoutBrief,
        currentFingerprint: withBrief,
      })
    ).toBe(true)
    expect(
      audioSourceFingerprintForSpoken({
        kind: 'dialogue',
        character: 'Elena',
        line: '[obsessive, breathless] The differential holds.',
      })
    ).toBe(withoutBrief)
  })

  it('uses audioStale flag when fingerprint is missing', () => {
    expect(
      isBeatAudioStale({
        hasAudio: true,
        currentFingerprint: 'dialogue|ALEX|hello',
      })
    ).toBe(false)
    expect(
      isBeatAudioStale({
        hasAudio: true,
        audioStale: true,
        currentFingerprint: 'dialogue|ALEX|hello',
      })
    ).toBe(true)
  })

  it('stamps audioStale on script merge without clearing the URL', () => {
    const canonical = [
      {
        id: 's1',
        beats: [
          {
            beatId: 'bt_1',
            sequenceIndex: 0,
            kind: 'dialogue',
            character: 'Alex',
            line: 'We need to move now.',
            lineId: 'ln_1',
          },
        ],
        dialogue: [{ lineId: 'ln_1', character: 'Alex', line: 'We need to move now.' }],
        dialogueAudio: {
          en: [
            {
              lineId: 'ln_1',
              dialogueIndex: 0,
              character: 'Alex',
              audioUrl: 'https://blob.example/alex.mp3',
            },
          ],
        },
      },
    ]
    const incoming = [
      {
        id: 's1',
        beats: [
          {
            beatId: 'bt_1',
            sequenceIndex: 0,
            kind: 'dialogue',
            character: 'Alex',
            line: 'We should wait here.',
            lineId: 'ln_1',
          },
        ],
        dialogue: [{ lineId: 'ln_1', character: 'Alex', line: 'We should wait here.' }],
      },
    ]

    const merged = mergeScenesForScriptSave(canonical, incoming)
    const entry = merged[0].dialogueAudio.en[0]
    expect(entry.audioUrl).toBe('https://blob.example/alex.mp3')
    expect(entry.audioStale).toBe(true)
  })

  it('compares stored fingerprint on the scene without deleting audio', () => {
    const scene = stampStaleBeatAudioOnScene(undefined, {
      beats: [
        {
          beatId: 'bt_1',
          sequenceIndex: 0,
          kind: 'dialogue',
          character: 'Alex',
          line: 'Changed line.',
          lineId: 'ln_1',
        },
      ],
      dialogue: [{ lineId: 'ln_1', character: 'Alex', line: 'Changed line.' }],
      dialogueAudio: {
        en: [
          {
            lineId: 'ln_1',
            dialogueIndex: 0,
            character: 'Alex',
            audioUrl: 'https://blob.example/alex.mp3',
            sourceFingerprint: audioSourceFingerprintForSpoken({
              kind: 'dialogue',
              character: 'Alex',
              line: 'Original line.',
            }),
          },
        ],
      },
    })
    expect((scene.dialogueAudio as any).en[0].audioUrl).toBe('https://blob.example/alex.mp3')
    expect((scene.dialogueAudio as any).en[0].audioStale).toBe(true)
  })
})

describe('Express missing-scope includes stale clips', () => {
  it('treats prompt-changed dialogue as not hasAudio', () => {
    const scene = {
      beats: [
        {
          beatId: 'bt_dialogue_1',
          sequenceIndex: 0,
          kind: 'dialogue',
          character: 'Alex',
          line: 'We should wait here.',
          lineId: 'ln_1',
        },
      ],
      dialogue: [
        {
          lineId: 'ln_1',
          character: 'Alex',
          line: 'We should wait here.',
        },
      ],
      dialogueAudio: {
        en: [
          {
            lineId: 'ln_1',
            dialogueIndex: 0,
            character: 'Alex',
            audioUrl: 'https://example.com/alex.mp3',
            sourceFingerprint: audioSourceFingerprintForSpoken({
              kind: 'dialogue',
              character: 'Alex',
              line: 'We need to move now.',
            }),
          },
        ],
      },
    } as Record<string, unknown>

    const items = buildExpressAudioItems(scene, 'en')
    expect(items).toHaveLength(1)
    expect(items[0].stale).toBe(true)
    expect(items[0].hasAudio).toBe(false)
    expect(defaultExpressAudioSelection(items, 'missing')).toEqual(['dialogue-0'])
  })

  it('treats prompt-changed SFX as not hasAudio', () => {
    const scene = {
      beats: [
        {
          beatId: 'bt_action_1',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Glass shatters on the floor.',
          beatDirection: { audioCue: 'Glass shatters' },
        },
      ],
      dialogue: [],
      sfx: [
        {
          sourceBeatId: 'bt_action_1',
          description: 'Wind howls',
          audioUrl: 'https://example.com/wind.mp3',
          sourceFingerprint: 'Wind howls through the alley.',
        },
      ],
      sfxAudio: ['https://example.com/wind.mp3'],
    } as Record<string, unknown>

    const items = buildExpressAudioItems(scene, 'en')
    const sfx = items.find((item) => item.id === 'sfx-bt_action_1')
    expect(sfx?.stale).toBe(true)
    expect(sfx?.hasAudio).toBe(false)
    expect(defaultExpressAudioSelection(items, 'missing')).toContain('sfx-bt_action_1')
  })

  it('treats a stored sound cue as in sync when the action line is longer', () => {
    const beat = {
      beatId: 'bt_action_1',
      actionDescription: 'Glass shatters on the floor.',
      beatDirection: { audioCue: 'Glass shatters' },
      kind: 'action' as const,
    }
    const scene = {
      sfx: [
        {
          sourceBeatId: 'bt_action_1',
          sourceFingerprint: 'Glass shatters',
          audioUrl: 'https://example.com/glass.mp3',
        },
      ],
      sfxAudio: ['https://example.com/glass.mp3'],
    }
    expect(actionBeatSfxIsStale(scene, beat, true)).toBe(false)
  })

  it('treats a stored action line as stale when the sound cue differs', () => {
    const beat = {
      beatId: 'bt_action_1',
      actionDescription: 'Glass shatters on the floor.',
      beatDirection: { audioCue: 'Glass shatters' },
      kind: 'action' as const,
    }
    const scene = {
      sfx: [
        {
          sourceBeatId: 'bt_action_1',
          sourceFingerprint: 'Glass shatters on the floor.',
          audioUrl: 'https://example.com/glass.mp3',
        },
      ],
      sfxAudio: ['https://example.com/glass.mp3'],
    }
    expect(actionBeatSfxIsStale(scene, beat, true)).toBe(true)
  })
})

describe('Prompt Changed status cleared after Still, Clip, Audio, and Promo updates', () => {
  it('clears isBeatFrameStale after establishing, dialogue, or action-start still updates', () => {
    const staleBeat = {
      beatId: 'bt_1',
      sequenceIndex: 0,
      kind: 'action' as const,
      actionDescription: 'Hero sprints across the bridge.',
      storyboardImageUrl: 'https://blob.example/old.png',
      storyboardImageDirectionKey: 'stale-dir-key',
      storyboardImageContentKey: 'stale-content-key',
      beatDirection: {
        shotType: 'Wide tracking shot',
        cameraAngle: 'Low angle',
        cameraMovement: 'Fast dolly',
        frozenMoment: 'Boots hitting wet pavement',
        blocking: 'Hero sprints left to right',
        emotion: 'Urgency',
        lightingAccent: 'Neon reflections',
        audioCue: 'Heavy footsteps',
        transition: 'CUT' as const,
        castInFrame: ['Hero'],
        generatedBy: 'user' as const,
      },
    }
    expect(isBeatFrameStale(staleBeat)).toBe(true)
    expect(beatFrameNeedsGeneration(staleBeat, { missingOnly: true })).toBe(true)
    expect(slotEligibleForScope({ ownImageUrl: staleBeat.storyboardImageUrl }, 'missing', true)).toBe(
      true
    )

    const afterEst = applyEstablishingImageToScene(
      { beats: [staleBeat] },
      'https://blob.example/new-est.png',
      { imagePrompt: 'Wide tracking shot of Hero' }
    )
    expect(isBeatFrameStale(getSceneBeats(afterEst)[0])).toBe(false)

    const afterActionStart = applyBeatStoryboardImageToScene(
      { beats: [staleBeat] },
      0,
      'https://blob.example/new-start.png',
      { frameRole: 'action-start', imagePrompt: 'Start frame' }
    )
    expect(isBeatFrameStale(getSceneBeats(afterActionStart)[0])).toBe(false)

    const staleDialogueBeat = {
      ...staleBeat,
      kind: 'dialogue' as const,
      character: 'Hero',
      line: 'We make our stand here.',
      lineId: 'ln_1',
    }
    const afterDialogue = applyDialogueStoryboardImageToScene(
      {
        beats: [staleDialogueBeat],
        dialogue: [{ lineId: 'ln_1', character: 'Hero', line: 'We make our stand here.' }],
      },
      0,
      'https://blob.example/new-dlg.png',
      { imagePrompt: 'Close-up on Hero' }
    )
    expect(isBeatFrameStale(getSceneBeats(afterDialogue)[0])).toBe(false)
  })

  it('marks clip segment stale when shot direction changes and clears promptChanged when clip is updated', () => {
    const beat = {
      beatId: 'bt_1',
      sequenceIndex: 0,
      kind: 'action' as const,
      actionDescription: 'Hero sprints across the bridge.',
      storyboardImageUrl: 'https://blob.example/old.png',
      storyboardImageDirectionKey: 'stale-dir-key',
      beatDirection: {
        shotType: 'Extreme close-up',
        cameraAngle: 'Dutch angle',
        cameraMovement: 'Handheld shake',
        frozenMoment: 'Eyes locked ahead',
        blocking: 'Hero pushes forward',
        emotion: 'Determination',
        lightingAccent: 'Harsh rim light',
        audioCue: 'Thunder clap',
        transition: 'CUT' as const,
        castInFrame: ['Hero'],
        generatedBy: 'user' as const,
      },
    }
    const sceneWithPlayableClip = {
      beats: [beat],
      segments: [
        {
          segmentId: 'seg_1',
          beatId: 'bt_1',
          sequenceIndex: 0,
          startTime: 0,
          endTime: 5,
          status: 'COMPLETE',
          assetType: 'video',
          activeAssetUrl: 'https://blob.example/clip-v1.mp4',
          generatedPrompt: 'Old video prompt',
          videoPrompt: 'Old video prompt',
          takes: [
            {
              id: 'take_1',
              assetUrl: 'https://blob.example/clip-v1.mp4',
              status: 'COMPLETE',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
      ],
    }

    const refreshed = refreshSceneSegmentVideoPrompts(sceneWithPlayableClip, beat)
    const segAfterDirectionSave = (refreshed.segments as any[])[0]
    expect(segAfterDirectionSave.isStale).toBe(true)

    const clipsWhenStale = buildBeatVideoClips({
      scene: refreshed,
      segments: refreshed.segments as any,
      queue: [],
    })
    expect(clipsWhenStale[0].promptChanged).toBe(true)

    // Selecting/updating a take clears isStale even if the still frame is still stale
    const segAfterClipUpdate = applyVideoTakeSelection(segAfterDirectionSave, 'take_1')
    expect((segAfterClipUpdate as any).isStale).toBe(false)

    const clipsAfterUpdate = buildBeatVideoClips({
      scene: refreshed,
      segments: [segAfterClipUpdate as any],
      queue: [],
    })
    expect(clipsAfterUpdate[0].promptChanged).toBe(false)
  })

  it('keeps narrationAudio and dialogueAudio synchronized and clears stale status', () => {
    const metadata: Record<string, unknown> = {
      visionPhase: {
        script: {
          script: {
            scenes: [
              {
                id: 's1',
                narration: 'The city never sleeps.',
                beats: [
                  {
                    beatId: 'bt_narr',
                    sequenceIndex: 0,
                    kind: 'narration',
                    character: 'NARRATOR',
                    line: 'The city never sleeps.',
                    lineId: 'ln_narr',
                    voiceDirection: 'Warm, measured baritone.',
                  },
                ],
                dialogue: [
                  {
                    lineId: 'ln_narr',
                    kind: 'narration',
                    character: 'NARRATOR',
                    line: 'The city never sleeps.',
                    voiceDirection: 'Warm, measured baritone.',
                  },
                ],
                narrationAudio: {
                  en: {
                    url: 'https://blob.example/old-narr.mp3',
                    sourceFingerprint: 'narration|NARRATOR|Old line',
                    audioStale: true,
                  },
                },
                dialogueAudio: {
                  en: [
                    {
                      lineId: 'ln_narr',
                      dialogueIndex: 0,
                      kind: 'narration',
                      character: 'NARRATOR',
                      audioUrl: 'https://blob.example/old-narr.mp3',
                      sourceFingerprint: 'narration|NARRATOR|Old line',
                      audioStale: true,
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    }

    const fp = audioSourceFingerprintForSpoken({
      kind: 'narration',
      character: 'NARRATOR',
      line: 'The city never sleeps.',
      voiceDirection: 'Warm, measured baritone.',
    })

    applySceneAudioPersistToMetadata(metadata, {
      projectId: 'p1',
      sceneIndex: 0,
      audioType: 'dialogue',
      audioUrl: 'https://blob.example/new-narr.mp3',
      language: 'en',
      characterName: 'NARRATOR',
      dialogueIndex: 0,
      lineMeta: { lineId: 'ln_narr', lineKind: 'narration' },
      sourceFingerprint: fp,
    })

    const updatedScene = (metadata.visionPhase as any).script.script.scenes[0]
    expect(updatedScene.narrationAudio.en.audioStale).toBe(false)
    expect(updatedScene.narrationAudio.en.sourceFingerprint).toBe(fp)
    expect(updatedScene.dialogueAudio.en[0].audioStale).toBe(false)

    const items = buildExpressAudioItems(updatedScene, 'en')
    expect(items[0].stale).toBe(false)
    expect(items[0].hasAudio).toBe(true)
  })

  it('clears Promo shared beat still stale status when narration overlays an action source beat', () => {
    const sourceScene = applyBeatStoryboardImageToScene(
      {
        id: 'scene-1',
        sceneNumber: 1,
        beats: [
          {
            beatId: 'src_bt_1',
            sequenceIndex: 0,
            kind: 'action',
            actionDescription: 'Spaceship lifts off through clouds of smoke.',
            beatDirection: {
              shotType: 'Wide shot',
              cameraAngle: 'Low angle',
              cameraMovement: 'Slow tilt up',
              frozenMoment: 'Engines igniting',
              blocking: 'Ship rises center frame',
              emotion: 'Awe',
              lightingAccent: 'Fiery orange glow',
              audioCue: 'Rocket roar',
              transition: 'CUT',
              castInFrame: [],
              generatedBy: 'user',
            },
          },
        ],
      },
      0,
      'https://blob.example/ship-still-1710000002000.png',
      { imagePrompt: 'Spaceship lifting off' }
    )

    const promoScene = {
      id: 'scene-promo',
      cinematicType: PROMO_SCENE_CINEMATIC_TYPE,
      beats: [
        {
          beatId: 'promo_bt_1',
          sequenceIndex: 0,
          kind: 'narration',
          character: 'NARRATOR',
          line: 'Beyond the horizon lies humanity’s next chapter.',
          sourceSceneId: 'scene-1',
          sourceSceneIndex: 0,
          sourceBeatId: 'src_bt_1',
        },
      ],
    }

    const synced = syncPromoSharedBeatsToSourceScenes([sourceScene, promoScene])
    const hydrated = hydratePromoSceneWithSharedShots(synced[1], synced)
    const hydratedBeat = getSceneBeats(hydrated.scene)[0]
    expect(hydratedBeat.storyboardImageUrl).toBe(
      'https://blob.example/ship-still-1710000002000.png'
    )
    expect(isBeatFrameStale(hydratedBeat)).toBe(false)
  })
})
