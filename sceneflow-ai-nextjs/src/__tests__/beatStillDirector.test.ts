import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
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
    expect(src).toContain('reusedStoredPrompt: Boolean(selectedKeys && storedPromptMatchesDirection(beat))')
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

    const director = readSource('src/components/vision/BeatStillDirectorDialog.tsx')
    expect(director).toContain('onSave({ patch: savePatch ?? null, generate })')
    expect(director).toContain("patch ? t('saveAndGenerate') : tp('retryStill')")
    expect(director).toContain("t('safetyOption')")
    expect(director).toContain('policyCompliance: safety')
    expect(director).not.toContain('stillPolicyMode')
    expect(director).not.toContain('persistVision')
    expect(director).not.toContain('applyStillDirectorPatchToScene')
  })

  it('Direct Frame persist-before-generate stamps user direction and keeps no customPrompt', () => {
    const page = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    expect(page).toContain('handleGenerateBeatStillWithPolicy')
    expect(page).toContain('if (payload.patch)')
    expect(page).not.toContain('void handleRequestGenerateBeatFrame(dialog.sceneIdx')
    expect(page).toContain("generatedBy: 'user'")
    expect(page).toContain("mode: options.userDirection?.trim() ? 'rewrite' : 'optimize'")
    expect(page).toContain('persistStillDirectorPatch')
    expect(page).toContain('BeatStillDirectorDialog')
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

  it('overlay labels are Direct Frame, Director, then Edit', () => {
    const frame = readSource('src/components/vision/SceneImageFrame.tsx')
    expect(frame).toContain("title={generateBlockedReason || 'Direct Frame'}")
    expect(frame).toContain("title={generateBlockedReason || 'Director'}")
    expect(frame).toContain('title="Edit"')
    expect(frame).not.toContain('AI edit')
    expect(frame).not.toContain('Direct — prompt builder')
    expect(frame.indexOf('onDirect') ).toBeLessThan(frame.indexOf('onDirector'))
    expect(frame.indexOf("title={generateBlockedReason || 'Director'}")).toBeLessThan(
      frame.indexOf('title="Edit"')
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
