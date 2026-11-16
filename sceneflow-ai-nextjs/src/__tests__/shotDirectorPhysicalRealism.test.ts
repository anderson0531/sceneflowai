import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  applyPhysicalRealismToPatch,
  buildStillDirectorUserPrompt,
} from '@/lib/intelligence/beat-still-director-fallback'
import { composePersistedBeatStillPrompt } from '@/lib/intelligence/beat-sequence-planner-fallback'
import { compileBeatVideoPromptFromDirection } from '@/lib/scene/beatVideoPromptCompiler'
import {
  buildEndFramePrompt,
  buildStartFramePrompt,
  isStoredFrameBookendPromptAligned,
} from '@/lib/scene/deriveSegmentsFromBeats'
import {
  beatDirectionFingerprint,
  beatStillDirectionFingerprint,
} from '@/lib/script/beatDirectionFingerprint'
import { normalizeBeatDirection } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import { saveDirectorPatchToScenes } from '@/lib/vision/saveBeatDirection'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relPath: string): string {
  return readFileSync(path.join(ROOT, relPath), 'utf8')
}

describe('Shot Director — Physical Realism option (Still & Clip)', () => {
  const baseBeat: SceneBeat = {
    beatId: 'bt_realism_1',
    sequenceIndex: 0,
    kind: 'action',
    actionDescription:
      'Elena sets the heavy brass microscope onto the oak workbench and steadies the lens barrel.',
    beatDirection: {
      shotType: 'Medium Shot',
      cameraAngle: 'eye-level',
      cameraMovement: 'slow push-in',
      frozenMoment:
        'Elena stands screen-left at the oak workbench with both hands resting on the heavy brass microscope.',
      startFrame:
        'Elena holds the heavy brass microscope just above the oak workbench surface.',
      clipAction:
        'Elena lowers the heavy brass microscope onto the oak workbench with deliberate control. She adjusts the brass focus knob with her right hand.',
      endFrame:
        'The brass microscope rests firmly on the oak workbench as Elena leans toward the eyepiece.',
      blocking: 'Elena planted screen-left beside the oak workbench, shoulders squared.',
      emotion: 'Focused concentration',
      castInFrame: ['Elena'],
      keyProps: ['Brass Microscope'],
      generatedBy: 'user',
    },
  }

  it('surfaces the Physical realism checkbox, tooltip, hint, preview row, and surgical refine chip in Shot Director', () => {
    const dialog = readSource('src/components/vision/BeatDirectorDialog.tsx')
    expect(dialog).toContain("t('realismOption')")
    expect(dialog).toContain("t('realismOptionTooltip')")
    expect(dialog).toContain("t('realismHint')")
    expect(dialog).toContain('physicalRealism: physicalRealism || undefined')
    expect(dialog).toContain('physicalRealism,')
    expect(dialog).toContain("id: 'physical-realism'")
    expect(dialog).toContain('Apply Realism &')

    const route = readSource('src/app/api/scene/direct-beat-still/route.ts')
    expect(route).toContain('const physicalRealism = body.physicalRealism === true')
    expect(route).toContain('applyPhysicalRealismToPatch')
  })

  it('injects authoritative physical realism & camera optics rules into the Shot Director LLM prompt', () => {
    const prompt = buildStillDirectorUserPrompt({
      mode: 'optimize',
      beats: [{ beatIndex: 0, beat: baseBeat }],
      physicalRealism: true,
    })
    expect(prompt).toContain('PHYSICAL REALISM & CAMERA OPTICS (authoritative):')
    expect(prompt).toContain('Grounded weight & contact shadows')
    expect(prompt).toContain('Rigid structural integrity & object permanence')
    expect(prompt).toContain('Natural anatomical proportions & biomechanics')
    expect(prompt).toContain('Physical camera capture')
  })

  it('preserves physicalRealism across normalizeBeatDirection and updates both still & clip fingerprints', () => {
    const normalized = normalizeBeatDirection({
      shotType: 'Medium Shot',
      physicalRealism: true,
    })
    expect(normalized?.physicalRealism).toBe(true)

    const withoutRealism = baseBeat.beatDirection!
    const withRealism = { ...withoutRealism, physicalRealism: true }

    expect(beatStillDirectionFingerprint(withRealism)).not.toBe(
      beatStillDirectionFingerprint(withoutRealism)
    )
    expect(beatStillDirectionFingerprint(withRealism)).toContain('physicalRealism=true')

    expect(beatDirectionFingerprint(withRealism)).not.toBe(
      beatDirectionFingerprint(withoutRealism)
    )
    expect(beatDirectionFingerprint(withRealism)).toContain('physicalRealism=true')
  })

  it('synchronously updates Still prompt, Start/End bookends, and Clip prompts (R2V & FTV) when saved via Shot Director', () => {
    const initialScene = {
      scene_number: 1,
      heading: 'INT. WORKSHOP - DAY',
      beats: [baseBeat],
      segments: [
        {
          segmentId: 'seg_1',
          beatId: 'bt_realism_1',
          generatedPrompt: 'Old ungrounded prompt',
          videoPrompt: 'Old ungrounded prompt',
        },
      ],
    }

    const updatedScenes = saveDirectorPatchToScenes({
      scenes: [initialScene],
      sceneIdx: 0,
      beatId: 'bt_realism_1',
      patch: applyPhysicalRealismToPatch({
        shotType: baseBeat.beatDirection?.shotType,
        frozenMoment: baseBeat.beatDirection?.frozenMoment,
        startFrame: baseBeat.beatDirection?.startFrame,
        clipAction: baseBeat.beatDirection?.clipAction,
        endFrame: baseBeat.beatDirection?.endFrame,
        blocking: baseBeat.beatDirection?.blocking,
        castInFrame: ['Elena'],
        keyProps: ['Brass Microscope'],
      }),
      referenceSelection: {
        characterIds: ['Elena'],
        objectRefIds: ['prop_microscope'],
        locationRefId: null,
        source: 'user',
        resolvedAt: new Date().toISOString(),
      },
      characters: [{ id: 'Elena', name: 'Elena' }],
      objectReferences: [{ id: 'prop_microscope', name: 'Brass Microscope' }],
      physicalRealism: true,
    })

    const savedBeat = updatedScenes[0].beats[0] as SceneBeat
    expect(savedBeat.beatDirection?.physicalRealism).toBe(true)

    // 1. Still prompt & [EXCLUSIONS]
    const stillPrompt =
      composePersistedBeatStillPrompt({
        sceneIndex: 0,
        beat: savedBeat,
      }) ?? ''
    expect(stillPrompt).toContain('grounded in real-world physics')
    expect(stillPrompt).toContain('accurate contact shadows and weight distribution')
    expect(stillPrompt).toContain('rigid structural integrity')
    expect(stillPrompt).toContain('consistent object permanence')
    expect(stillPrompt).toContain('natural anatomical proportions')
    expect(stillPrompt).toContain('captured on a physical camera')
    expect(stillPrompt).toContain('floating feet')

    // 2. Start & End Frame bookend prompts
    const startPrompt = buildStartFramePrompt(savedBeat)
    const endPrompt = buildEndFramePrompt(savedBeat)
    expect(startPrompt).toContain('grounded in real-world physics')
    expect(endPrompt).toContain('captured on a physical camera')
    expect(isStoredFrameBookendPromptAligned(startPrompt, savedBeat)).toBe(true)

    // 3. Clip prompt (R2V + FTV + segment sync + negativePrompt)
    const r2vClip = compileBeatVideoPromptFromDirection(savedBeat, null)
    const ftvClip = compileBeatVideoPromptFromDirection(savedBeat, null, {
      targetMethod: 'frame',
    })
    expect(r2vClip.prompt).toContain('grounded in real-world physics')
    expect(r2vClip.prompt).toContain('accurate contact shadows and weight distribution')
    expect(r2vClip.prompt).toContain('rigid structural integrity')
    expect(r2vClip.prompt).toContain('consistent object permanence')
    expect(r2vClip.prompt).toContain('natural anatomical proportions')
    expect(r2vClip.prompt).toContain('captured on a physical camera')
    expect(r2vClip.negativePrompt).toContain('floating feet')
    expect(r2vClip.negativePrompt).toContain('morphing props')
    expect(ftvClip.prompt).toContain('grounded in real-world physics')
    expect(updatedScenes[0].segments[0].videoPrompt).toContain('grounded in real-world physics')

    // 4. Turning physicalRealism OFF cleanly clears the flag and removes the auto-injected clause
    const clearedScenes = saveDirectorPatchToScenes({
      scenes: updatedScenes,
      sceneIdx: 0,
      beatId: 'bt_realism_1',
      patch: {
        shotType: savedBeat.beatDirection?.shotType,
        frozenMoment: savedBeat.beatDirection?.frozenMoment,
        startFrame: savedBeat.beatDirection?.startFrame,
        clipAction: savedBeat.beatDirection?.clipAction,
        endFrame: savedBeat.beatDirection?.endFrame,
        blocking: savedBeat.beatDirection?.blocking,
        castInFrame: ['Elena'],
        keyProps: ['Brass Microscope'],
      },
      referenceSelection: savedBeat.referenceSelection!,
      characters: [{ id: 'Elena', name: 'Elena' }],
      objectReferences: [{ id: 'prop_microscope', name: 'Brass Microscope' }],
      physicalRealism: false,
    })

    const clearedBeat = clearedScenes[0].beats[0] as SceneBeat
    expect(clearedBeat.beatDirection?.physicalRealism).toBeUndefined()
    expect(clearedScenes[0].segments[0].videoPrompt).not.toContain(
      'Physical realism: grounded in real-world physics'
    )
    expect(isStoredFrameBookendPromptAligned(startPrompt, clearedBeat)).toBe(false)
  })

  it('omits anatomical proportions on empty-cast object inserts and composes cleanly with Safety compliance', () => {
    const emptyCastBeat: SceneBeat = {
      beatId: 'bt_gauge_1',
      sequenceIndex: 1,
      kind: 'action',
      actionDescription: 'The brass pressure gauge needle settles at 40 PSI on the steel bulkhead.',
      beatDirection: {
        shotType: 'Extreme Close-Up',
        cameraAngle: 'eye-level',
        cameraMovement: 'static',
        frozenMoment: 'The brass pressure gauge mounted on the steel bulkhead reads 40 PSI.',
        castInFrame: [],
        keyProps: ['Brass Pressure Gauge'],
        physicalRealism: true,
        policyCompliance: true,
        generatedBy: 'user',
      },
    }

    const stillPrompt =
      composePersistedBeatStillPrompt({
        sceneIndex: 0,
        beat: emptyCastBeat,
      }) ?? ''
    expect(stillPrompt).toContain('grounded in real-world physics')
    expect(stillPrompt).not.toContain('natural anatomical proportions')

    const startPrompt = buildStartFramePrompt(emptyCastBeat)
    expect(isStoredFrameBookendPromptAligned(startPrompt, emptyCastBeat)).toBe(true)

    const clip = compileBeatVideoPromptFromDirection(emptyCastBeat, null)
    expect(clip.prompt).toContain('grounded in real-world physics')
    expect(clip.prompt).not.toContain('natural anatomical proportions')
  })
})
