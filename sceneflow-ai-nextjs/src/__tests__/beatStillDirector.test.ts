import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { compileBeatVideoPromptFromDirection } from '@/lib/scene/beatVideoPromptCompiler'
import { composeBeatActionFraming } from '@/lib/intelligence/beat-sequence-planner-fallback'
import {
  applyStillDirectorPatch,
  applyStillDirectorPatchToScene,
  applyPolicyComplianceToPatch,
  buildStillDirectorSystemPrompt,
  buildStillDirectorUserPrompt,
  mergeDirectOverlaysIntoPatch,
  parseStillDirectorPatch,
  shouldRunStillDirectorAuto,
  shouldSkipStillDirectorAuto,
} from '@/lib/intelligence/beat-still-director-fallback'
import { getSceneBeats } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import { isBeatFrameStale } from '@/lib/storyboard/syncBeatStillPrompt'
import { refreshProductionSegmentVideoPrompts } from '@/lib/scene/syncBeatVideoPrompt'
import { hydratePromoSceneWithSharedShots } from '@/lib/publish/buildPromoScene'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

function beat(overrides: Partial<SceneBeat> = {}): SceneBeat {
  return {
    beatId: 'bt_still',
    sequenceIndex: 0,
    kind: 'action',
    actionDescription: 'Gideon and Piper stand over the brick.',
    ...overrides,
  }
}

describe('applyStillDirectorPatch', () => {
  it('stamps director, writes facets, and recomposes Action/Framing', () => {
    const { beat: next, skipped } = applyStillDirectorPatch(
      beat(),
      {
        shotType: 'Two-Shot',
        frozenMoment:
          'Gideon screen-right leans his weight on the spanner; Piper is nearer camera, hands on the brick.',
        blocking: 'Gideon screen-right, Piper screen-left, both fully in frame.',
        emotion: 'Gideon: tight jaw. Piper: wide eyes, not matching Gideon.',
      },
      { generatedBy: 'director' }
    )

    expect(skipped).toBe(false)
    expect(next.beatDirection?.generatedBy).toBe('director')
    expect(next.beatDirection?.shotType).toBe('Two-Shot')
    const framing = composeBeatActionFraming(next)
    expect(framing).toContain('Gideon screen-right leans his weight on the spanner')
    expect(next.storyboardImagePrompt).toBeTruthy()
    expect(next.storyboardImagePrompt).toContain(
      'Gideon screen-right leans his weight on the spanner'
    )
  })

  it('uses actionFraming as frozenMoment when the patch omitted frozenMoment', () => {
    const { beat: next } = applyStillDirectorPatch(
      beat(),
      { actionFraming: 'Insert of the spanner planted on the brick.' },
      { generatedBy: 'director' }
    )
    expect(next.beatDirection?.frozenMoment).toBe(
      'Insert of the spanner planted on the brick.'
    )
  })

  it('does not overwrite user or director beats on the auto pass', () => {
    const userBeat = beat({
      beatDirection: { shotType: 'Close-Up', generatedBy: 'user' },
    })
    const directorBeat = beat({
      beatDirection: { shotType: 'Insert Shot', generatedBy: 'director' },
    })
    const userApplied = applyStillDirectorPatch(
      userBeat,
      { shotType: 'Wide Shot' },
      { generatedBy: 'director', skipIfProtected: true }
    )
    const directorApplied = applyStillDirectorPatch(
      directorBeat,
      { shotType: 'Wide Shot' },
      { generatedBy: 'director', skipIfProtected: true }
    )
    expect(userApplied.skipped).toBe(true)
    expect(userApplied.beat.beatDirection?.shotType).toBe('Close-Up')
    expect(directorApplied.skipped).toBe(true)
    expect(directorApplied.beat.beatDirection?.shotType).toBe('Insert Shot')
  })

  it('overwrites a protected beat when the user confirms Director / Direct Frame', () => {
    const prior = beat({
      beatDirection: { shotType: 'Close-Up', generatedBy: 'director' },
    })
    const { beat: next, skipped } = applyStillDirectorPatch(
      prior,
      { shotType: 'Two-Shot', frozenMoment: 'Both bodies fully in frame.' },
      { generatedBy: 'user' }
    )
    expect(skipped).toBe(false)
    expect(next.beatDirection?.generatedBy).toBe('user')
    expect(next.beatDirection?.shotType).toBe('Two-Shot')
  })

  it('marks an existing frame stale after a rewrite', () => {
    const prior = beat({
      storyboardImageUrl: 'https://example.com/frame.jpg',
      storyboardImagePrompt: 'Weak framing.',
      storyboardImagePromptDirectionKey: 'old-key',
      storyboardImageDirectionKey: 'old-key',
    })
    const { beat: next } = applyStillDirectorPatch(
      prior,
      { frozenMoment: 'Piper plants both palms on the brick.' },
      { generatedBy: 'user' }
    )
    expect(next.storyboardImageUrl).toBe(prior.storyboardImageUrl)
    expect(isBeatFrameStale(next)).toBe(true)
  })

  it('applies a patch onto the matching beat in a scene', () => {
    const scene = {
      beats: [
        beat({ beatId: 'bt_a' }),
        beat({ beatId: 'bt_b', actionDescription: 'Piper waits.' }),
      ],
    }
    const { scene: next, skipped } = applyStillDirectorPatchToScene(
      scene,
      'bt_b',
      { frozenMoment: 'Piper waits, weight on both feet.' },
      { generatedBy: 'user' }
    )
    expect(skipped).toBe(false)
    const [first, second] = getSceneBeats(next)
    expect(first.beatDirection).toBeUndefined()
    expect(second.beatDirection?.frozenMoment).toBe('Piper waits, weight on both feet.')
    expect(second.beatDirection?.generatedBy).toBe('user')
  })

  it('writes beat direction, a frozen still prompt, and a separate motion video prompt', () => {
    const scene = {
      beats: [
        beat({
          beatDirection: { cameraMovement: 'slow push-in', generatedBy: 'llm' },
        }),
      ],
      segments: [
        {
          beatId: 'bt_still',
          generatedPrompt: 'Sarah turns sharply toward the exit with rising panic.',
          videoPrompt: 'Sarah turns sharply toward the exit with rising panic.',
        },
        {
          beatId: 'bt_still',
          userEditedPrompt: 'Keep this clip wording.',
          generatedPrompt: 'old',
          videoPrompt: 'old',
        },
      ],
    }
    const frozen =
      'Gideon screen-right leans his weight on the spanner; Piper is nearer camera.'
    const { scene: next } = applyStillDirectorPatchToScene(
      scene,
      'bt_still',
      {
        shotType: 'Two-Shot',
        frozenMoment: frozen,
        blocking: 'Gideon screen-right, Piper screen-left.',
      },
      { generatedBy: 'director' }
    )
    const [directed] = getSceneBeats(next)
    expect(directed.beatDirection?.generatedBy).toBe('director')
    expect(directed.beatDirection?.frozenMoment).toBe(frozen)
    expect(directed.storyboardImagePrompt).toContain(frozen)
    expect(directed.storyboardImagePrompt).not.toContain('Natural cinematic motion')

    const video = compileBeatVideoPromptFromDirection(directed, null)
    expect(video.prompt).toContain(frozen)
    expect(video.prompt).toContain('slow push-in')
    expect(video.prompt).toContain('No spoken dialogue')
    expect(video.prompt).not.toContain('Natural cinematic motion')
    expect(video.prompt).not.toBe(directed.storyboardImagePrompt)

    const segments = (next as { segments: Array<Record<string, string>> }).segments
    expect(segments[0].generatedPrompt).toBe(video.prompt)
    expect(segments[0].videoPrompt).toBe(video.prompt)
    expect(segments[0].generatedPrompt).not.toContain('turns sharply toward the exit')
    expect(segments[1].userEditedPrompt).toBe('Keep this clip wording.')
    expect(segments[1].generatedPrompt).toBe('old')
    expect(directed.beatDirection?.audioDirection).toBeTruthy()
  })

  it('updates Audio direction (voiceDirection, audioDirection, scene.sfx, and stale flags) alongside Still and Clip direction', () => {
    const spokenScene = {
      dialogue: [
        {
          lineId: 'ln_piper_1',
          character: 'Piper',
          line: 'Open the ledger.',
          kind: 'dialogue',
          voiceDirection: 'Calm and unhurried.',
        },
      ],
      dialogueAudio: {
        en: [
          {
            lineId: 'ln_piper_1',
            dialogueIndex: 0,
            character: 'Piper',
            audioUrl: 'https://example.com/piper.mp3',
            sourceFingerprint: 'dialogue|piper|Open the ledger.|vd:Calm and unhurried.',
          },
        ],
      },
      sfx: [
        {
          sfxId: 'sfx_1',
          sourceBeatId: 'bt_spoken',
          description: 'Soft paper rustle',
        },
      ],
      beats: [
        {
          beatId: 'bt_spoken',
          sequenceIndex: 0,
          kind: 'dialogue' as const,
          character: 'Piper',
          line: 'Open the ledger.',
          lineId: 'ln_piper_1',
          voiceDirection: 'Calm and unhurried.',
          beatDirection: {
            shotType: 'Medium Shot',
            emotion: 'calm',
            audioCue: 'Soft paper rustle',
            generatedBy: 'llm' as const,
          },
        },
      ],
      segments: [
        {
          beatId: 'bt_spoken',
          generatedPrompt: 'Old video prompt',
          videoPrompt: 'Old video prompt',
        },
      ],
    }

    const { scene: updated } = applyStillDirectorPatchToScene(
      spokenScene,
      'bt_spoken',
      {
        shotType: 'Close-Up',
        frozenMoment: 'Piper leans across the brass desk, fingers digging into the ledger.',
        emotion: 'Urgent, breathless whisper with coiled tension',
        audioCue: 'Heavy brass clasp snaps open',
      },
      { generatedBy: 'user' }
    )

    const [updatedBeat] = getSceneBeats(updated)
    // 1. Audio direction updated
    expect(updatedBeat.voiceDirection).toContain('Urgent, breathless whisper with coiled tension')
    expect(updatedBeat.beatDirection?.audioCue).toBe('Heavy brass clasp snaps open')
    expect(updatedBeat.beatDirection?.audioDirection).toContain(
      'Urgent, breathless whisper with coiled tension'
    )
    expect(updatedBeat.beatDirection?.audioDirection).toContain('Heavy brass clasp snaps open')
    const updatedDialogue = (updated.dialogue as Array<{ voiceDirection?: string }>)[0]
    expect(updatedDialogue?.voiceDirection).toContain('Urgent, breathless whisper with coiled tension')
    const updatedSfx = (updated.sfx as Array<{ description?: string }>)[0]
    expect(updatedSfx?.description).toBe('Heavy brass clasp snaps open')
    const updatedAudioEntry = (updated.dialogueAudio as { en: Array<{ audioStale?: boolean }> }).en[0]
    expect(updatedAudioEntry?.audioStale).toBe(true)

    // 2. Still direction updated
    expect(updatedBeat.storyboardImagePrompt).toContain(
      'Piper leans across the brass desk, fingers digging into the ledger.'
    )

    // 3. Clip direction updated
    const updatedSeg = (updated.segments as Array<{ videoPrompt?: string }>)[0]
    expect(updatedSeg?.videoPrompt).toContain(
      'Piper leans across the brass desk, fingers digging into the ledger.'
    )
  })
})

describe('shouldRunStillDirectorAuto', () => {
  it('runs on first-gen beats without authored direction', () => {
    expect(
      shouldRunStillDirectorAuto(beat(), {
        needsNewStartFrame: true,
        reusedStoredPrompt: false,
      })
    ).toBe(true)
  })

  it('skips Regen reuse of a stored matching prompt', () => {
    expect(
      shouldRunStillDirectorAuto(beat(), {
        needsNewStartFrame: true,
        reusedStoredPrompt: true,
      })
    ).toBe(false)
  })

  it('re-directs a reused title beat that names no cast', () => {
    expect(
      shouldRunStillDirectorAuto(
        beat({
          actionDescription:
            'A faint amber glow pulses from a hairline fracture in the concrete wall.',
        }),
        {
          needsNewStartFrame: true,
          reusedStoredPrompt: true,
          unnamedTitleBeat: true,
        }
      )
    ).toBe(true)
  })

  it('does not re-direct a reused beat that already names its cast', () => {
    expect(
      shouldRunStillDirectorAuto(
        beat({ beatDirection: { castInFrame: ['Gideon Croft'] } }),
        {
          needsNewStartFrame: true,
          reusedStoredPrompt: true,
          unnamedTitleBeat: false,
        }
      )
    ).toBe(false)
  })

  it('does not re-direct an explicit empty cast', () => {
    expect(
      shouldRunStillDirectorAuto(
        beat({ beatDirection: { castInFrame: [] } }),
        {
          needsNewStartFrame: true,
          reusedStoredPrompt: true,
          unnamedTitleBeat: true,
        }
      )
    ).toBe(false)
  })

  it('does not re-direct user direction even on an unnamed title beat', () => {
    expect(
      shouldRunStillDirectorAuto(
        beat({ beatDirection: { generatedBy: 'user' } }),
        {
          needsNewStartFrame: true,
          reusedStoredPrompt: true,
          unnamedTitleBeat: true,
        }
      )
    ).toBe(false)
  })

  it('skips when the start frame does not need generation', () => {
    expect(
      shouldRunStillDirectorAuto(beat(), {
        needsNewStartFrame: false,
        reusedStoredPrompt: false,
      })
    ).toBe(false)
  })

  it('skips user and director sources', () => {
    expect(
      shouldSkipStillDirectorAuto(
        beat({ beatDirection: { generatedBy: 'user' } })
      )
    ).toBe(true)
    expect(
      shouldSkipStillDirectorAuto(
        beat({ beatDirection: { generatedBy: 'director' } })
      )
    ).toBe(true)
    expect(
      shouldRunStillDirectorAuto(
        beat({ beatDirection: { generatedBy: 'user' } }),
        { needsNewStartFrame: true, reusedStoredPrompt: false }
      )
    ).toBe(false)
  })
})

describe('patch parsing and overlays', () => {
  it('parses actionFraming into frozenMoment', () => {
    const patch = parseStillDirectorPatch({
      actionFraming: 'Maya at the counter, cup in her right hand.',
      shotType: 'Medium Shot',
    })
    expect(patch?.frozenMoment).toBe('Maya at the counter, cup in her right hand.')
    expect(patch?.shotType).toBe('Medium Shot')
  })

  it('parses movement, audio, and a known transition', () => {
    const patch = parseStillDirectorPatch({
      cameraMovement: 'slow push-in',
      audioCue: 'timer chirps twice',
      transition: 'match cut',
    })
    expect(patch?.cameraMovement).toBe('slow push-in')
    expect(patch?.audioCue).toBe('timer chirps twice')
    expect(patch?.transition).toBe('MATCH_CUT')
    expect(parseStillDirectorPatch({ transition: 'weird-unknown' })?.transition).toBeUndefined()
  })

  it('writes movement, audio, and transition onto the beat', () => {
    const { beat: next } = applyStillDirectorPatch(
      beat({ beatDirection: { shotType: 'Wide Shot', transition: 'CUT' } }),
      {
        cameraMovement: 'slow push-in',
        audioCue: 'timer chirps twice',
        transition: 'DISSOLVE',
      },
      { generatedBy: 'director' }
    )
    expect(next.beatDirection?.shotType).toBe('Wide Shot')
    expect(next.beatDirection?.cameraMovement).toBe('slow push-in')
    expect(next.beatDirection?.audioCue).toBe('timer chirps twice')
    expect(next.beatDirection?.transition).toBe('DISSOLVE')
  })

  it('folds Direct Frame overlays only into omitted fields', () => {
    const merged = mergeDirectOverlaysIntoPatch(
      { shotType: 'Two-Shot', blocking: 'Piper nearer camera.' },
      {
        shotType: 'Wide Shot',
        talentBlocking: 'Gideon at the door.',
        lighting: 'Hard practical',
      }
    )
    expect(merged.shotType).toBe('Two-Shot')
    expect(merged.blocking).toBe('Piper nearer camera.')
    expect(merged.lightingAccent).toBe('Hard practical')
  })
})

describe('Still Director contracts', () => {
  it('Express auto pass emits still-direct and skips protected / reuse beats', () => {
    const src = readSource('src/lib/sceneGeneration/expressOrchestrator.ts')
    expect(src).toContain('runStillDirectorPhase')
    expect(src).toContain("phase: 'still-direct'")
    expect(src).toContain('shouldRunStillDirectorAuto')
    expect(src).toContain('generatedBy: \'director\'')
    expect(src).toContain('skipIfProtected: true')
    expect(src).toContain('storedPromptMatchesDirection(beat)')
    expect(src).toContain('hasCompleteAuthoredBeatDirection(beat)')
    expect(src).toContain('unnamedTitleBeat: titleBeatNeedsCastClarify(')
    expect(src).not.toMatch(/from ['"]@\/app\/api\/scene\/generate-image/)
  })

  it('API returns a patch and does not persist beatDirection', () => {
    const route = readSource('src/app/api/scene/direct-beat-still/route.ts')
    expect(route).toContain("mode !== 'optimize' && mode !== 'suggest' && mode !== 'rewrite'")
    expect(route).not.toContain('applyStillDirectorPatchToScene')
    expect(route).not.toContain('project.save')
    expect(route).not.toContain('project.update')
    expect(route).toContain('policyCompliance')
    expect(route).toContain('applyPolicyComplianceToPatch')
    expect(route).toContain('scoreBeatDirectionFidelity')
    expect(route).toContain('directionStrength:')
  })

  it('Suggest revisions fills Direction and does not persist until Generate / Save', () => {
    const dialog = readSource('src/components/vision/PreVisFramePromptDialog.tsx')
    expect(dialog).toContain("mode: 'suggest'")
    expect(dialog).toContain('setUserDirection(notes)')
    expect(dialog).not.toContain('applyStillDirectorPatch')
    expect(dialog).not.toContain('persistVision')

    const director = readSource('src/components/vision/BeatDirectorDialog.tsx')
    expect(director).toContain("t('safetyOption')")
    expect(director).toContain('policyCompliance: safety')
    expect(director).toContain('applyPolicyComplianceToPatch')
    expect(director).not.toContain('stillPolicyMode')
    expect(director).not.toContain('persistVision')
    expect(director).not.toContain('applyStillDirectorPatchToScene')
  })

  it('Direct Frame persist-before-generate stamps user direction and keeps no customPrompt', () => {
    const page = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    expect(page).not.toContain('void handleRequestGenerateBeatFrame(dialog.sceneIdx')
    expect(page).toContain("generatedBy: 'user'")
    expect(page).toContain("mode: options.userDirection?.trim() ? 'rewrite' : 'optimize'")
    expect(page).toContain('persistStillDirectorPatch')
    expect(page).toContain('BeatDirectionEditor')
    expect(page).toContain('layout="dialog"')
    expect(page).not.toContain('BeatStillDirectorDialog')
    expect(page).toContain('onDirectorFrame={handleOpenDirectorFrame}')
    const start = page.indexOf('const handleDirectFrameGenerate')
    const next = page.indexOf('const handleGenerateDialogueFrameImage')
    const handler = page.slice(start, next > start ? next : undefined)
    const rewriteIdx = handler.indexOf("fetch('/api/scene/direct-beat-still'")
    const imageIdx = handler.indexOf("fetch('/api/scene/generate-image'")
    expect(rewriteIdx).toBeGreaterThan(-1)
    expect(imageIdx).toBeGreaterThan(rewriteIdx)
    expect(handler).not.toMatch(/customPrompt:/)
    expect(handler).toContain('stillGenerationMode: frameGenerationMode')
    expect(handler).toContain('IMAGE_CONTENT_POLICY_USER_MESSAGE')
    expect(handler).toContain('IMAGE_SAFETY_USER_MESSAGE')
    expect(handler).toContain('toastStillPolicyFailure')
    expect(handler).not.toContain('stillPolicyMode: options.stillPolicyMode')
  })

  it('Frames Direct Shot uses the shared direction dialog', () => {
    const page = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    const director = readSource('src/components/vision/BeatDirectorDialog.tsx')
    expect(page).toContain('<BeatDirectionEditor')
    expect(page).toContain('layout="dialog"')
    expect(page).toContain('locationReferences={locationReferences}')
    expect(page).toContain('objectReferences={objectReferences}')
    expect(page).not.toContain('BeatStillDirectorDialog')
    expect(director).toContain('policyCompliance: safety')
    expect(director).toContain('initialSafety')
    expect(director).toContain('Reference library')
  })

  it('overlay defaults are Direct Frame, Director, then Edit', () => {
    const frame = readSource('src/components/vision/SceneImageFrame.tsx')
    expect(frame).toContain("title={generateBlockedReason || directTitle || 'Direct Frame'}")
    expect(frame).toContain("title={generateBlockedReason || directorTitle || 'Director'}")
    expect(frame).toContain("title={editTitle || 'Edit'}")
    expect(frame).not.toContain('AI edit')
    expect(frame).not.toContain('Direct — prompt builder')
    expect(frame.indexOf('onDirect') ).toBeLessThan(frame.indexOf('onDirector'))
    expect(frame.indexOf("title={generateBlockedReason || directorTitle || 'Director'}")).toBeLessThan(
      frame.indexOf("title={editTitle || 'Edit'}")
    )
  })
})

describe('applyPolicyComplianceToPatch', () => {
  it('softens harm-in-progress wording and keeps named props', () => {
    const next = applyPolicyComplianceToPatch({
      frozenMoment: 'Piper sits trapped against the wall',
      blocking: "Gideon plants the steel spanner beside Piper's shoulder",
      emotion: 'Piper hunched defensively',
    })
    expect(next.frozenMoment).not.toMatch(/\btrapped\b/i)
    expect(next.blocking).toContain('spanner')
    expect(next.blocking).not.toMatch(/beside Piper's shoulder/i)
    expect(next.emotion).not.toMatch(/hunched defensively/i)
  })
})

describe('buildStillDirectorSystemPrompt', () => {
  it('does not invent Gaze on empty-cast object inserts', () => {
    const system = buildStillDirectorSystemPrompt()
    expect(system).toContain('Omit emotion and gaze when castInFrame is empty')
    expect(system).toContain('Never write "Gaze: No characters"')
    expect(system).toContain("describe the instrument's settled state, not a limb, hand, or face")
    expect(system).not.toMatch(/mid-motion/)
    expect(system).toContain('"cameraMovement"')
    expect(system).toContain('"audioCue"')
    expect(system).toContain('"transition": "CUT"')
    expect(system).toContain('production credits')
    expect(system).toContain('actionDescription is two to four concrete sentences')
    expect(system).toContain('Never use Over-the-Shoulder (OTS) or Two-Shot')
    expect(system).toContain('"castInFrame": ["Exact Character Name", "Second Character Name"]')
  })

  it('prevents single-cast dialogue shots from triggering an unreferenced OTS listener in still and video prompts', () => {
    const singleDialogueBeat: SceneBeat = {
      beatId: 'bt_single_dialogue',
      sequenceIndex: 0,
      kind: 'dialogue',
      character: 'Piper Hayes',
      line: 'The current is unstable.',
      beatDirection: {
        shotType: 'Over-the-Shoulder',
        castInFrame: ['Piper Hayes'],
        spatialRelationship: 'speaker turns toward the listener, listener at frame edge',
        blocking: 'Piper Hayes turns to face listener',
        gaze: "into listener's eyes",
        frozenMoment: 'Piper Hayes mid-word, eyes locked on the listener.',
      },
    }

    const framing = composeBeatActionFraming(singleDialogueBeat)
    expect(framing).toContain('Medium Close-Up')
    expect(framing).not.toMatch(/Over-the-Shoulder/i)
    expect(framing).not.toMatch(/\blistener\b/i)
    expect(framing).toContain('off-camera')

    const video = compileBeatVideoPromptFromDirection(singleDialogueBeat, null)
    expect(video.prompt).toContain('Shot: Medium Close-Up')
    expect(video.prompt).not.toMatch(/Over-the-Shoulder/i)
    expect(video.prompt).not.toMatch(/listener at frame edge/i)
    expect(video.prompt).toContain(
      "no foreground silhouette or back of another person's head"
    )
    expect(video.negativePrompt).toContain('back of second person head')
  })
})

describe('buildStillDirectorUserPrompt', () => {
  it('adds Safety compliance rules when policyCompliance is set', () => {
    const withSafety = buildStillDirectorUserPrompt({
      mode: 'rewrite',
      beats: [],
      policyCompliance: true,
    })
    const without = buildStillDirectorUserPrompt({
      mode: 'rewrite',
      beats: [],
    })
    expect(withSafety).toContain('SAFETY COMPLIANCE')
    expect(without).not.toContain('SAFETY COMPLIANCE')
  })
})

describe('Shot direction prompt update synchronization and generation gating', () => {
  it('awaits onSaveDirection in BeatDirectorDialog and disables generation controls while prompts update', () => {
    const dialog = readSource('src/components/vision/BeatDirectorDialog.tsx')
    const editor = readSource('src/components/vision/BeatDirectionEditor.tsx')
    const videoQueue = readSource('src/hooks/useVideoQueue.ts')
    const consoleImpl = readSource(
      'src/components/vision/scene-production/DirectorConsoleImpl.tsx'
    )
    const gallery = readSource('src/components/vision/scene-production/BeatVideoGallery.tsx')
    const frameViewer = readSource('src/components/vision/SceneStoryboardFrameViewer.tsx')
    const directorDialog = readSource('src/components/vision/scene-production/DirectorDialog.tsx')
    const page = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')

    // BeatDirectorDialog awaits onSaveDirection and shows Updating prompts…
    expect(dialog).toContain('await onSaveDirection(')
    expect(dialog).toContain("{saving ? 'Updating prompts…' : 'Save direction'}")
    expect(editor).toContain('return onScriptChange({')

    // useVideoQueue tracks configInputSignature, exposes isUpdatingPrompts, includes autoConfigs in contentHash,
    // and refreshes cached userConfigs when autoConfig.prompt changes after a direction save.
    expect(videoQueue).toContain('isUpdatingPrompts: boolean')
    expect(videoQueue).toContain('const isUpdatingPrompts = !isReady || !configsReady || settledConfigSignature !== configInputSignature')
    expect(videoQueue).toContain('autoConfigs: Array.from(configsMap.entries())')
    expect(videoQueue).toContain('changedAutoPrompts.forEach')

    // DirectorConsoleImpl synchronously refreshes segment prompts on render and combines prompt-updating states
    expect(consoleImpl).toContain('const pendingProductionRefresh = useMemo(')
    expect(consoleImpl).toContain('const segments = pendingProductionRefresh ?? productionData?.segments ?? EMPTY_SEGMENTS')
    expect(consoleImpl).toContain('const effectiveIsUpdatingPrompts = Boolean(')
    expect(consoleImpl).toContain('data-testid="clips-updating-prompts-badge"')
    expect(consoleImpl).toContain('disabled={queue.length === 0 || effectiveIsUpdatingPrompts}')

    // BeatVideoGallery, SceneStoryboardFrameViewer, and DirectorDialog gate generation while isUpdatingPrompts is true
    expect(gallery).toContain('data-testid="updating-shot-prompts-badge"')
    expect(gallery).toContain('disabled={isUpdatingPrompts || generatingClipId === previewSegment.segmentId}')
    expect(gallery).toContain('disabled={generatingLanguageClip || isUpdatingPrompts}')
    expect(frameViewer).toContain('data-testid="stills-updating-prompts-badge"')
    expect(frameViewer).toContain("isUpdatingPrompts\n        ? 'Updating shot prompts — please wait…'")
    expect(directorDialog).toContain('disabled={!canGenerateWithCustomPrompt || isUpdatingPrompts}')

    // Vision page synchronously refreshes production segment prompts on script/direction save and awaits in-flight saves before generation
    expect(page).toContain('syncProductionPromptsForScenes(mergedScenes)')
    expect(page).toContain('syncProductionPromptsForScenes(updatedScenes)')
    expect(page).toContain('await syncVisionReferencesForExpress({ includeScript: true })')
    expect(page).toContain('isUpdatingPrompts={isUpdatingScriptPrompts}')

    // TDZ safety: userConfigs is declared before the useEffect that calls setUserConfigs in useVideoQueue,
    // and productionPersistDrainPromiseRef is declared before handleScriptChange in page.tsx
    expect(videoQueue.indexOf('const [userConfigs, setUserConfigs]')).toBeLessThan(
      videoQueue.indexOf('setUserConfigs((prev) =>')
    )
    expect(page.indexOf('const productionPersistDrainPromiseRef = useRef')).toBeLessThan(
      page.indexOf('const handleScriptChange = useCallback')
    )
  })

  it('does not trigger endless segment refresh when generatedPrompt matches and videoPrompt is undefined (promo & studio scenes)', () => {
    const sourceBeat = beat({
      beatId: 'bt_src_1',
      beatDirection: {
        shotType: 'Medium Shot',
        frozenMoment: 'Gideon holds the brass calipers.',
        cameraMovement: 'slow push-in',
        generatedBy: 'user',
      },
    })
    const sourceScene = {
      id: 'scene-3',
      beats: [sourceBeat],
    }
    const promoBeat = {
      ...sourceBeat,
      beatId: 'bt_promo_0_bt_src_1_0',
      sourceSceneId: 'scene-3',
      sourceSceneIndex: 0,
      sourceBeatId: 'bt_src_1',
    }
    const promoScene = {
      id: 'promo-123',
      cinematicType: 'promo',
      beats: [promoBeat],
    }

    const hydrated = hydratePromoSceneWithSharedShots(
      promoScene,
      [sourceScene, promoScene],
      {
        'scene-3': {
          isSegmented: true,
          targetDuration: 6,
          segments: [
            {
              segmentId: 'seg_src_1',
              beatId: 'bt_src_1',
              sequenceIndex: 0,
              startTime: 0,
              endTime: 6,
              status: 'DRAFT',
              generatedPrompt: 'stale old prompt',
              userEditedPrompt: undefined,
              activeAssetUrl: null,
              assetType: null,
              references: {
                startFrameUrl: null,
                endFrameUrl: null,
                characterIds: [],
                sceneRefIds: [],
                objectRefIds: [],
              },
              takes: [],
            },
          ],
        },
      },
      { artStyleId: 'cinematic-noir' }
    )

    expect(hydrated.productionData?.segments).toHaveLength(1)
    // Calling refreshProductionSegmentVideoPrompts with the same artStyleId must return null (no-op) so
    // DirectorConsoleImpl never enters an infinite pendingProductionRefresh / onProductionDataChange loop.
    const refreshedAgain = refreshProductionSegmentVideoPrompts(
      hydrated.productionData!.segments,
      hydrated.scene,
      { artStyleId: 'cinematic-noir' }
    )
    expect(refreshedAgain).toBeNull()
  })
})

