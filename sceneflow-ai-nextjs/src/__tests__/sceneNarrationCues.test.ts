import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildPromoSceneFromPlan } from '@/lib/publish/buildPromoScene'
import {
  applySceneNarrationCues,
  beatHasOnCameraDialogue,
  computeNarrationCueFingerprint,
  deriveLegacyOrPromoNarrationCues,
  formatNarrationCueRange,
  getNarrationCueLanguages,
  getNarrationOwnedLineIds,
  getSceneNarrationCues,
  isNarrationCueAudioStale,
  PROMO_LEGACY_NARRATION_LINE_ID,
} from '@/lib/script/sceneNarrationCues'
import type { SceneBeat, SceneNarrationCue } from '@/lib/script/segmentTypes'
import type { PromoTrailerBeatPlan } from '@/types/publishingAssets'

function makeBeat(
  beatId: string,
  index: number,
  overrides: Partial<SceneBeat> = {}
): SceneBeat {
  return {
    beatId,
    sequenceIndex: index,
    beatNumber: index + 1,
    kind: 'action',
    actionDescription: `Visual action for shot ${index + 1}`,
    durationSeconds: 5,
    ...overrides,
  }
}

describe('SceneNarrationCue model, spans, migration & staleness', () => {
  it('normalizes single-shot and multi-shot spans and tracks anchorBeatIds across beat reorders', () => {
    const initialBeats = [
      makeBeat('bt_open', 0),
      makeBeat('bt_vault_1', 1),
      makeBeat('bt_vault_2', 2),
      makeBeat('bt_close', 3),
    ]

    const cue: SceneNarrationCue = {
      cueId: 'ncue-vault',
      beatStart: 1,
      beatEnd: 2,
      speakerType: 'character',
      characterId: 'char-elena',
      characterName: 'Elena',
      deliveryCue: 'hushed, reflective',
      alignmentMode: 'intro-freeze',
      introNarrationSec: 2.0,
      byLanguage: {
        en: {
          text: 'Before we opened the vault, none of us knew what waited inside.',
          audioUrl: 'https://cdn.example.com/vo-en.mp3',
          durationSec: 4.8,
        },
        es: {
          text: 'Antes de abrir la bóveda, ninguno sabía lo que esperaba dentro.',
          audioUrl: 'https://cdn.example.com/vo-es.mp3',
          durationSec: 5.2,
        },
      },
    }

    const updatedScene = applySceneNarrationCues(
      { id: 'scene-1', beats: initialBeats },
      [cue],
      initialBeats
    )
    const persisted = getSceneNarrationCues(updatedScene, initialBeats)

    expect(persisted).toHaveLength(1)
    expect(persisted[0]?.anchorBeatIds).toEqual(['bt_vault_1', 'bt_vault_2'])
    expect(formatNarrationCueRange(persisted[0]!)).toBe('Shots 2–3')
    expect(getNarrationCueLanguages(updatedScene, { requireAudio: true })).toEqual([
      'en',
      'es',
    ])

    // Insert a new opening shot at index 0 -> anchorBeatIds automatically shift span to Shots 3–4 (indices 2..3)
    const reorderedBeats = [
      makeBeat('bt_prologue', 0),
      ...initialBeats.map((b, i) => ({ ...b, sequenceIndex: i + 1, beatNumber: i + 2 })),
    ]
    const reanchored = getSceneNarrationCues(updatedScene, reorderedBeats)
    expect(reanchored[0]?.beatStart).toBe(2)
    expect(reanchored[0]?.beatEnd).toBe(3)
    expect(formatNarrationCueRange(reanchored[0]!)).toBe('Shots 3–4')
  })

  it('migrates legacy Promo single-blob narration across the full Promo shot span instead of freezing Shot 1', () => {
    const promoBeats = [
      makeBeat('bt_p1', 0, { lineId: PROMO_LEGACY_NARRATION_LINE_ID, line: 'In a city of glass, every memory has a price.' }),
      makeBeat('bt_p2', 1),
      makeBeat('bt_p3', 2),
      makeBeat('bt_p4', 3),
    ]
    const legacyPromoScene = {
      id: 'promo-1',
      cinematicType: 'promo',
      beats: promoBeats,
      promoAudioMix: { narrationStartShotKey: 'bt_p2' },
      dialogueAudio: {
        en: [
          {
            lineId: PROMO_LEGACY_NARRATION_LINE_ID,
            character: 'NARRATOR',
            line: 'In a city of glass, every memory has a price.',
            audioUrl: 'https://cdn.example.com/promo-blob.mp3',
            duration: 18.5,
          },
        ],
      },
    }

    const migrated = deriveLegacyOrPromoNarrationCues(legacyPromoScene, promoBeats)
    expect(migrated).toHaveLength(1)
    expect(migrated[0]?.beatStart).toBe(1) // Starts on chosen shot bt_p2!
    expect(migrated[0]?.beatEnd).toBe(3) // Spans through end of trailer!
    expect(migrated[0]?.originLineId).toBe(PROMO_LEGACY_NARRATION_LINE_ID)
    expect(migrated[0]?.byLanguage.en?.durationSec).toBe(18.5)

    const ownedIds = getNarrationOwnedLineIds(legacyPromoScene, promoBeats)
    expect(ownedIds.has(PROMO_LEGACY_NARRATION_LINE_ID)).toBe(true)
  })

  it('builds shot-aligned multi-cue Promo scenes without mutating shared source shots', () => {
    const plan: PromoTrailerBeatPlan[] = [
      { sceneId: 's1', beatId: 'b1', sceneIndex: 0, startSec: 0, endSec: 5, durationSec: 5, score: 1 },
      { sceneId: 's1', beatId: 'b2', sceneIndex: 0, startSec: 5, endSec: 10, durationSec: 5, score: 1 },
      { sceneId: 's2', beatId: 'b3', sceneIndex: 1, startSec: 10, endSec: 16, durationSec: 6, score: 1 },
    ]
    const { scene } = buildPromoSceneFromPlan({
      beatPlan: plan,
      targetDurationSec: 16,
      projectTitle: 'Glass Horizon',
      narrationLine: 'Every door hides a secret.\n\nOnly one leads home.',
    })

    const cues = getSceneNarrationCues(scene as unknown as Record<string, unknown>)
    expect(cues.length).toBeGreaterThanOrEqual(2)
    expect(cues[0]?.beatStart).toBe(0)
    expect(cues[cues.length - 1]?.beatEnd).toBe(2)
    // Shared visual beats remain clean action shots without fake dialogue lines injected onto Shot 1
    expect(scene.beats.every((b) => b.kind === 'action')).toBe(true)

    const explicit = buildPromoSceneFromPlan({
      beatPlan: plan,
      targetDurationSec: 16,
      projectTitle: 'Glass Horizon',
      narrationCues: [
        {
          cueId: 'ncue-custom-0',
          beatStart: 0,
          beatEnd: 1,
          speakerType: 'character',
          characterId: 'char-elena',
          characterName: 'Elena',
          alignmentMode: 'intro-freeze',
          byLanguage: { en: { text: 'Every door hides a secret.' } },
        },
        {
          cueId: 'ncue-custom-1',
          beatStart: 2,
          beatEnd: 2,
          speakerType: 'narrator',
          characterName: 'NARRATOR',
          alignmentMode: 'outro-freeze',
          byLanguage: { en: { text: 'Only one leads home.' } },
        },
      ],
    })
    const explicitCues = getSceneNarrationCues(explicit.scene as unknown as Record<string, unknown>)
    expect(explicitCues).toHaveLength(2)
    expect(explicitCues[0]?.characterName).toBe('Elena')
    expect(explicitCues[0]?.alignmentMode).toBe('intro-freeze')
    expect(explicit.scene.beats.every((b) => b.kind === 'action')).toBe(true)
  })

  it('detects on-camera dialogue collisions and audio fingerprint staleness when text or voice changes', () => {
    expect(
      beatHasOnCameraDialogue(
        makeBeat('bt_dlg', 0, { kind: 'dialogue', character: 'Marcus', line: 'Stop right there!' })
      )
    ).toBe(true)
    expect(beatHasOnCameraDialogue(makeBeat('bt_act', 1, { kind: 'action' }))).toBe(false)

    const fp = computeNarrationCueFingerprint({
      text: 'Winter arrived early that year.',
      speakerType: 'character',
      characterId: 'char-elena',
      voiceId: 'voice-elena-1',
      deliveryCue: 'warm',
      language: 'en',
    })

    const freshCue: SceneNarrationCue = {
      cueId: 'ncue-0-0',
      beatStart: 0,
      beatEnd: 0,
      speakerType: 'character',
      characterId: 'char-elena',
      deliveryCue: 'warm',
      alignmentMode: 'flow',
      byLanguage: {
        en: {
          text: 'Winter arrived early that year.',
          audioUrl: 'https://cdn.example.com/take1.mp3',
          voiceId: 'voice-elena-1',
          sourceFingerprint: fp,
        },
      },
    }

    expect(isNarrationCueAudioStale(freshCue, 'en', 'voice-elena-1')).toBe(false)
    // Changing assigned voice marks existing audio stale
    expect(isNarrationCueAudioStale(freshCue, 'en', 'voice-elena-new')).toBe(true)

    // Editing script copy marks existing audio stale
    const editedCue: SceneNarrationCue = {
      ...freshCue,
      byLanguage: {
        en: {
          ...freshCue.byLanguage.en!,
          text: 'Winter arrived much earlier than anyone expected.',
        },
      },
    }
    expect(isNarrationCueAudioStale(editedCue, 'en', 'voice-elena-1')).toBe(true)
  })

  it('keeps all client-reachable narration & mixer modules free of server-only imports', () => {
    const clientFiles = [
      'src/lib/script/sceneNarrationCues.ts',
      'src/lib/scene/mixerNarrationCues.ts',
      'src/lib/scene/mixerSettings.ts',
      'src/lib/scene/mixerTiming.ts',
      'src/components/vision/SceneNarrationCuePanel.tsx',
      'src/components/vision/scene-production/NarrationCueControls.tsx',
      'src/components/vision/scene-production/MixerTimeline.tsx',
      'src/components/vision/scene-production/ScenePreviewPlayer.tsx',
      'src/components/vision/scene-production/SceneProductionMixer.tsx',
      'src/components/publishing/PromoCutPreview.tsx',
      'src/components/publishing/PublishingPromoTab.tsx',
    ]
    const forbidden = [
      /from\s+['"]server-only['"]/,
      /from\s+['"]@\/lib\/audio\/narrationCueServerService['"]/,
      /from\s+['"]@\/lib\/vertexai\//,
      /from\s+['"]@\/models\//,
      /from\s+['"](?:fs|node:fs|child_process|node:child_process)['"]/,
    ]
    for (const rel of clientFiles) {
      const content = readFileSync(join(process.cwd(), rel), 'utf8')
      for (const pattern of forbidden) {
        expect(content, `${rel} must not match ${pattern}`).not.toMatch(pattern)
      }
    }
  })
})
