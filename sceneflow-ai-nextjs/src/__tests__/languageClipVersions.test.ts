import { describe, expect, it } from 'vitest'
import type { SceneSegment, SceneSegmentTake } from '@/components/vision/scene-production/types'
import { MEDIA_VERSION_CAP } from '@/lib/storyboard/mediaVersions'
import { mergeSceneProductionData } from '@/lib/storyboard/mergeProductionMedia'
import {
  applyGeneratedClipTake,
  appendLanguageClipTake,
  keepLanguageClipVersions,
  languageClipSelectionValue,
  listLanguageClipVersionOptions,
  presentSegmentForStream,
  withSelectedLanguageClip,
} from '@/lib/scene/languageClipVersions'
import {
  buildLanguageClipPrompt,
  composeLanguageClipPrompt,
  extractPromptSignageText,
  preferStoredSpokenTranslation,
  replacePromoOnScreenText,
  segmentNeedsLanguageClip,
} from '@/lib/scene/languageClipPrompt'
import { findDialogueAudioForLine } from '@/components/vision/scene-production/audioTrackBuilder'
import { buildBeatVideoClips } from '@/lib/scene/buildBeatVideoClips'

function take(id: string, url = `${id}.mp4`): SceneSegmentTake {
  return {
    id,
    createdAt: '2026-01-01T00:00:00.000Z',
    assetUrl: url,
    status: 'COMPLETE',
  }
}

function segment(overrides: Partial<SceneSegment> = {}): SceneSegment {
  return {
    segmentId: 'seg_1',
    sequenceIndex: 0,
    startTime: 0,
    endTime: 8,
    status: 'COMPLETE',
    assetType: 'video',
    references: { characterIds: [], sceneRefIds: [], objectRefIds: [] },
    takes: [take('master')],
    currentTakeId: 'master',
    activeAssetUrl: 'master.mp4',
    ...overrides,
  }
}

describe('language clip versions', () => {
  it('appends a language take without moving the English master pointer', () => {
    const master = segment()
    const committed = applyGeneratedClipTake(master, take('es1', 'es.mp4'), 'es')
    expect(committed?.activeAssetUrl).toBe('master.mp4')
    expect(committed?.currentTakeId).toBe('master')
    expect(committed?.takes.map((row) => row.id)).toEqual(['master'])
    expect(committed?.languageVersions?.es.currentTakeId).toBe('es1')
    expect(committed?.languageVersions?.es.takes.map((row) => row.id)).toEqual(['es1'])
    expect(applyGeneratedClipTake(master, take('en1'), 'en')).toBeNull()
  })

  it('caps language takes on their own and leaves the master list intact', () => {
    let versions = appendLanguageClipTake(undefined, 'es', take('es0'))
    for (let i = 1; i <= MEDIA_VERSION_CAP; i += 1) {
      versions = appendLanguageClipTake(versions, 'es', take(`es${i}`))
    }
    expect(versions.es.takes).toHaveLength(MEDIA_VERSION_CAP)
    expect(versions.es.takes.some((row) => row.id === 'es0')).toBe(false)
    expect(versions.es.currentTakeId).toBe(`es${MEDIA_VERSION_CAP}`)
    const master = segment({ languageVersions: versions })
    expect(master.takes.map((row) => row.id)).toEqual(['master'])
  })

  it('labels the oldest clip v1 and treats the newest pointer as Latest', () => {
    const versions = ['es1', 'es2', 'es3'].reduce(
      (current, id) => appendLanguageClipTake(current, 'es', take(id)),
      undefined
    )
    const options = listLanguageClipVersionOptions(versions?.es)
    expect(options.map((option) => `${option.label}:${option.id}`)).toEqual([
      'v1:es1',
      'v2:es2',
      'v3:es3',
    ])
    expect(options.find((option) => option.isCurrent)?.id).toBe('es3')
    expect(languageClipSelectionValue(options)).toBe('latest')

    const pinned = withSelectedLanguageClip(segment({ languageVersions: versions }), 'es', 'es1')
    expect(pinned.activeAssetUrl).toBe('master.mp4')
    expect(pinned.currentTakeId).toBe('master')
    const pinnedOptions = listLanguageClipVersionOptions(pinned.languageVersions?.es)
    expect(languageClipSelectionValue(pinnedOptions)).toBe('es1')
    expect(pinnedOptions.find((option) => option.id === 'es1')?.isCurrent).toBe(true)
  })

  it('plays the language clip and falls back to the master when none exists', () => {
    const withSpanish = segment({
      languageVersions: appendLanguageClipTake(undefined, 'es', take('es1', 'es.mp4')),
    })
    expect(presentSegmentForStream(withSpanish, 'es').activeAssetUrl).toBe('es.mp4')
    expect(presentSegmentForStream(withSpanish, 'en').activeAssetUrl).toBe('master.mp4')
    expect(presentSegmentForStream(segment(), 'fr').activeAssetUrl).toBe('master.mp4')
  })

  it('keeps language history when a re-derive replaces segment ids on the same beat', () => {
    const previous = [
      segment({
        segmentId: 'old',
        beatId: 'bt_1',
        languageVersions: appendLanguageClipTake(undefined, 'es', take('es1', 'es.mp4')),
      }),
    ]
    const kept = keepLanguageClipVersions(
      [segment({ segmentId: 'new', beatId: 'bt_1', languageVersions: undefined })],
      previous
    )
    expect(kept[0].languageVersions?.es.takes.map((row) => row.id)).toEqual(['es1'])
  })
})

describe('merge language clip versions', () => {
  it('unions language takes by id and does not wipe them when the incoming segment omits them', () => {
    const existing = {
      isSegmented: true,
      targetSegmentDuration: 8,
      segments: [
        segment({
          languageVersions: {
            es: { takes: [take('es1', 'es.mp4')], currentTakeId: 'es1' },
          },
        }),
      ],
    }
    const incoming = {
      isSegmented: true,
      targetSegmentDuration: 8,
      segments: [segment({ takes: [], activeAssetUrl: 'master.mp4' })],
    }
    const merged = mergeSceneProductionData(existing, incoming)!
    expect(merged.segments[0].languageVersions?.es.takes.map((row) => row.id)).toEqual(['es1'])
    expect(merged.segments[0].currentTakeId).toBe('master')
    expect(merged.segments[0].activeAssetUrl).toBe('master.mp4')
  })
})

describe('language clip prompts', () => {
  it('swaps the spoken line and keeps English stage direction', () => {
    const source =
      'ELARA speaks with natural lip sync: "Hello there". Delivery: softly. Close-up; slow push.'
    expect(buildLanguageClipPrompt(source, 'Hola', 'ELARA')).toBe(
      'ELARA speaks with natural lip sync: "Hola". Delivery: softly. Close-up; slow push.'
    )
  })

  it('replaces both speaks naturally lead and fidelity close spoken line in compiled beat prompts', () => {
    const currentPrompt =
      'Char_GIDEON_CROFT speaks naturally: "The current bleeds out. Every damn time. the loop refuses to close.". Delivery: with obsessive delivery; with breathless delivery Performance: Close-mic, private, and strained on ragged leftover air. Rush the first clause in an obsessive whisper, hitch on the ellipsis, and land \'refuses to close\' as a bitter, self-lacerating indictment. Coverage: Capture Gideon\'s vocalized obsession and breath control amid the isolating silence. Lens: Slow, deliberate push-in, shallow focus on Gideon\'s sweat-beaded brow. Space: Gideon in profile at screen-right, background falls away into dark tunnel mouth screen-left. Shot: Medium Close-Up. Angle: low angle. Camera: slow push-in. Blocking: Gideon Croft is framed from the chest up, planted screen-right in three-quarter profile facing screen-left. His weight leans forward over his planted right foot toward the slate board; his right elbow is sharply bent with his forearm raised chest-high, while his left shoulder drops rigid against his side. Emotion: Gideon Croft: obsessive fixity and fevered exhaustion; jaw bunched, lips parted over clenched lower teeth, deep horizontal furrow across his brow, and neck tendons pulled tight. Gaze: Gideon Croft stares unblinkingly toward screen-left, his eyeline fixed into empty air three feet past the slate surface. Prop interaction: Gideon Croft\'s right thumb, index, and middle finger pinch the fractured stub of white Chalk one inch off the slate wall beside the struck-through text \'RESONANCE FLUX = 0\'. Props: Chalk. Lighting: Warm tungsten key light sculpting the hollows of his cheeks, deep charcoal shadows masking his eyes. End on: Gideon Croft\'s lips are parted mid-syllable with a suspended wisp of condensation before his mouth, his chalk-dusted right fingers pinching the stub of Chalk an inch from the struck-through formula \'RESONANCE FLUX = 0\' on the slate wall. Film Noir, dynamic motion. Scored moment: electrifying rebellious adrenaline — carry that in the pacing and performance. Incoming continuity from Wide Establishing Shot. Only these people are visible: Gideon Croft. No other people, no foreground silhouette or back of another person\'s head (any listener is off-camera out of frame). Only these objects: Chalk. Do not add other objects. The only action is: Gideon Croft is framed from the chest up, planted screen-right in three-quarter profile facing screen-left. The only spoken line is: "The current bleeds out. Every damn time. the loop refuses to close.". photorealistic, cinematic motion, professional cinematography, natural lighting, shallow depth of field'

    const expectedPrompt =
      'Char_GIDEON_CROFT speaks naturally: "La corriente se escapa. Siempre. El circuito se niega a cerrarse.". Delivery: with obsessive delivery; with breathless delivery Performance: Close-mic, private, and strained on ragged leftover air. Rush the first clause in an obsessive whisper, hitch on the ellipsis, and land \'refuses to close\' as a bitter, self-lacerating indictment. Coverage: Capture Gideon\'s vocalized obsession and breath control amid the isolating silence. Lens: Slow, deliberate push-in, shallow focus on Gideon\'s sweat-beaded brow. Space: Gideon in profile at screen-right, background falls away into dark tunnel mouth screen-left. Shot: Medium Close-Up. Angle: low angle. Camera: slow push-in. Blocking: Gideon Croft is framed from the chest up, planted screen-right in three-quarter profile facing screen-left. His weight leans forward over his planted right foot toward the slate board; his right elbow is sharply bent with his forearm raised chest-high, while his left shoulder drops rigid against his side. Emotion: Gideon Croft: obsessive fixity and fevered exhaustion; jaw bunched, lips parted over clenched lower teeth, deep horizontal furrow across his brow, and neck tendons pulled tight. Gaze: Gideon Croft stares unblinkingly toward screen-left, his eyeline fixed into empty air three feet past the slate surface. Prop interaction: Gideon Croft\'s right thumb, index, and middle finger pinch the fractured stub of white Chalk one inch off the slate wall beside the struck-through text \'RESONANCE FLUX = 0\'. Props: Chalk. Lighting: Warm tungsten key light sculpting the hollows of his cheeks, deep charcoal shadows masking his eyes. End on: Gideon Croft\'s lips are parted mid-syllable with a suspended wisp of condensation before his mouth, his chalk-dusted right fingers pinching the stub of Chalk an inch from the struck-through formula \'RESONANCE FLUX = 0\' on the slate wall. Film Noir, dynamic motion. Scored moment: electrifying rebellious adrenaline — carry that in the pacing and performance. Incoming continuity from Wide Establishing Shot. Only these people are visible: Gideon Croft. No other people, no foreground silhouette or back of another person\'s head (any listener is off-camera out of frame). Only these objects: Chalk. Do not add other objects. The only action is: Gideon Croft is framed from the chest up, planted screen-right in three-quarter profile facing screen-left. The only spoken line is: "La corriente se escapa. Siempre. El circuito se niega a cerrarse.". photorealistic, cinematic motion, professional cinematography, natural lighting, shallow depth of field'

    const composed = composeLanguageClipPrompt({
      sourcePrompt: currentPrompt,
      character: 'GIDEON CROFT',
      kind: 'dialogue',
      englishLine:
        '[obsessive, breathless] The current bleeds out. Every damn time... the loop refuses to close.',
      translatedLine:
        '[obsesivo, sin aliento] La corriente se escapa. Siempre. El circuito se niega a cerrarse.',
    })
    expect(composed.prompt).toBe(expectedPrompt)
    expect(extractPromptSignageText(currentPrompt)).toBeUndefined()
  })

  it('replaces title and credit copy without a lip-sync line', () => {
    const source = 'A black card holds the title "The Current" in white serif type.'
    expect(replacePromoOnScreenText(source, 'The Current', 'La Corriente')).toBe(
      'A black card holds the title "La Corriente" in white serif type.'
    )
    expect(replacePromoOnScreenText('Slow fade over water.', 'The Current', 'La Corriente')).toBe(
      'Slow fade over water. On-screen text: "La Corriente".'
    )
    expect(replacePromoOnScreenText(source, 'The Current', 'La Corriente')).not.toContain('lip sync')
  })

  it('extracts signage text from shot prompts and localizes signage in regenerated shots', () => {
    const promptWithSignage =
      'Medium tracking shot of a rainy alley with a glowing neon sign reading "OPEN 24 HOURS" above the door.'
    expect(extractPromptSignageText(promptWithSignage)).toBe('OPEN 24 HOURS')

    const localized = composeLanguageClipPrompt({
      sourcePrompt: promptWithSignage,
      kind: 'action',
      englishLine: '',
      translatedLine: '',
      signageSourceText: 'OPEN 24 HOURS',
      signageTranslatedText: 'ABIERTO 24 HORAS',
    })
    expect(localized.prompt).toContain('"ABIERTO 24 HORAS"')
    expect(localized.prompt).not.toContain('"OPEN 24 HOURS"')
  })

  it('leaves narration and action pictures in English and translates the guide line', () => {
    const visual = 'Visual backdrop for narration; atmospheric motion, no on-screen dialogue text.'
    const composed = composeLanguageClipPrompt({
      sourcePrompt: visual,
      guidePrompt: 'Narrator: The door is open.',
      kind: 'narration',
      englishLine: 'The door is open.',
      translatedLine: 'La puerta está abierta.',
    })
    expect(composed.prompt).toBe(visual)
    expect(composed.guidePrompt).toBe('Narrator: La puerta está abierta.')
  })

  it('prefers a stored full-line translation and skips split excerpts', () => {
    const translation = { dialogue: ['Hola'], narration: 'Érase una vez' }
    const dialogue = [{ lineId: 'ln_1', line: 'Hello' }]
    expect(
      preferStoredSpokenTranslation({
        translation,
        kind: 'dialogue',
        lineId: 'ln_1',
        dialogue,
        englishLine: 'Hello',
      })
    ).toBe('Hola')
    expect(
      preferStoredSpokenTranslation({
        translation,
        kind: 'dialogue',
        lineId: 'ln_1',
        dialogue,
        englishLine: 'Hello there',
        isExcerpt: true,
      })
    ).toBeUndefined()
    expect(
      preferStoredSpokenTranslation({
        translation,
        kind: 'narration',
        englishLine: 'Once upon a time',
      })
    ).toBe('Érase una vez')
  })

  it('identifies dialogue, title, and signage shots for language Clips Agent while skipping action and off-screen narrator shots', () => {
    expect(
      segmentNeedsLanguageClip({
        beatKind: 'dialogue',
        beatCharacter: 'ELARA',
        beatLine: 'We need to shut down the dynamo now.',
      })
    ).toBe(true)

    expect(
      segmentNeedsLanguageClip({
        beatKind: 'title',
        beatLine: 'THE WHITE CITY CURRENT',
      })
    ).toBe(true)

    expect(
      segmentNeedsLanguageClip({
        beatKind: 'action',
        sourcePrompt: 'Medium shot of a glowing neon sign reading "OPEN 24 HOURS" in the rain.',
      })
    ).toBe(true)

    expect(
      segmentNeedsLanguageClip({
        beatKind: 'action',
        sourcePrompt: 'Wide establishing shot of rain-soaked cobblestones at night.',
      })
    ).toBe(false)

    expect(
      segmentNeedsLanguageClip({
        beatKind: 'narration',
        beatCharacter: 'NARRATOR',
        beatLine: 'Beneath an empire built on steel and shadow, an impossible breakthrough awaits.',
      })
    ).toBe(false)

    expect(
      segmentNeedsLanguageClip({
        beatKind: 'dialogue',
        beatCharacter: 'NARRATOR (V.O.)',
        beatLine: 'The city never slept.',
      })
    ).toBe(false)

    expect(
      segmentNeedsLanguageClip({
        beatKind: 'action',
        shotMethod: 'regenerate',
      })
    ).toBe(true)

    expect(
      segmentNeedsLanguageClip({
        beatKind: 'dialogue',
        beatCharacter: 'ELARA',
        beatLine: 'Wait here.',
        shotMethod: 'double',
      })
    ).toBe(false)
  })

  it('does not return legacy English dialogueAudio array entries when querying non-English languages', () => {
    const legacyScene = {
      dialogueAudio: [
        { lineId: 'line-1', dialogueIndex: 0, character: 'ELARA', audioUrl: 'https://cdn/en-1.mp3' },
      ],
    }
    expect(
      findDialogueAudioForLine(legacyScene, {
        language: 'en',
        lineId: 'line-1',
        dialogueIndex: 0,
        character: 'ELARA',
      })?.audioUrl
    ).toBe('https://cdn/en-1.mp3')

    expect(
      findDialogueAudioForLine(legacyScene, {
        language: 'es',
        lineId: 'line-1',
        dialogueIndex: 0,
        character: 'ELARA',
      })
    ).toBeNull()
  })

  it('marks dialogue clips with needsLanguageClip in buildBeatVideoClips while keeping action clips shared', () => {
    const clips = buildBeatVideoClips({
      scene: {
        beats: [
          {
            beatId: 'beat-1',
            sequenceIndex: 0,
            kind: 'action',
            actionDescription: 'Rain falls over the courtyard.',
          },
          {
            beatId: 'beat-2',
            sequenceIndex: 1,
            kind: 'dialogue',
            character: 'ELARA',
            line: 'Start the generator.',
          },
        ],
      },
      segments: [
        {
          segmentId: 'seg-1',
          beatId: 'beat-1',
          sequenceIndex: 0,
          startTime: 0,
          endTime: 4,
          status: 'COMPLETE',
          activeAssetUrl: 'https://cdn/shot1.mp4',
          takes: [take('t1', 'https://cdn/shot1.mp4')],
        } as SceneSegment,
        {
          segmentId: 'seg-2',
          beatId: 'beat-2',
          sequenceIndex: 1,
          startTime: 4,
          endTime: 8,
          status: 'COMPLETE',
          activeAssetUrl: 'https://cdn/shot2.mp4',
          takes: [take('t2', 'https://cdn/shot2.mp4')],
        } as SceneSegment,
      ],
      queue: [],
    })
    expect(clips).toHaveLength(2)
    expect(clips[0].needsLanguageClip).toBe(false)
    expect(clips[1].needsLanguageClip).toBe(true)
  })

  it('localizes compiled dialogue prompts in buildBeatVideoClips when a non-English streamLanguage and stored translation are provided', () => {
    const clips = buildBeatVideoClips({
      scene: {
        dialogue: [
          {
            lineId: 'line-gideon-1',
            character: 'Gideon Croft',
            line: '[obsessive, breathless] The current bleeds out. Every damn time... the loop refuses to close.',
          },
        ],
        beats: [
          {
            beatId: 'beat-gideon-1',
            sequenceIndex: 0,
            kind: 'dialogue',
            character: 'Gideon Croft',
            line: '[obsessive, breathless] The current bleeds out. Every damn time... the loop refuses to close.',
          },
        ],
      },
      segments: [
        {
          segmentId: 'seg-gideon-1',
          beatId: 'beat-gideon-1',
          sequenceIndex: 0,
          startTime: 0,
          endTime: 6,
          status: 'COMPLETE',
          activeAssetUrl: 'https://cdn/shot1.mp4',
          takes: [take('t1', 'https://cdn/shot1.mp4')],
        } as SceneSegment,
      ],
      queue: [],
      streamLanguage: 'es',
      sceneIndex: 0,
      sceneTranslations: {
        es: {
          0: {
            dialogue: [
              '[obsesivo, sin aliento] La corriente se escapa. Siempre. El circuito se niega a cerrarse.',
            ],
          },
        },
      },
    })

    expect(clips).toHaveLength(1)
    expect(clips[0].label).toBe(
      'La corriente se escapa. Siempre. El circuito se niega a cerrarse.'
    )
    expect(clips[0].prompt).toContain(
      'speaks naturally: "La corriente se escapa. Siempre. El circuito se niega a cerrarse."'
    )
    expect(clips[0].prompt).toContain(
      'The only spoken line is: "La corriente se escapa. Siempre. El circuito se niega a cerrarse."'
    )
    expect(clips[0].prompt).not.toContain('The current bleeds out')
  })
})

