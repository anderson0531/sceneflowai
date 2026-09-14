import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  attributeBeatExpression,
  buildBeatDirectedEmotionPromptSection,
  buildSceneAppearanceContinuityPromptSection,
  extractSceneStateFromAppearanceNotes,
  formatDirectedEmotionLine,
  inferEmotionFromActionProse,
  expandEmotionForStill,
  resolveBeatDirectedEmotion,
  resolveDirectedEmotionForCharacter,
  resolveSceneAppearanceContinuity,
} from '@/lib/scene/performanceCues'

describe('resolveDirectedEmotionForCharacter', () => {
  it('prefers beat line bracket cues over wardrobe appearanceNotes', () => {
    const emotion = resolveDirectedEmotionForCharacter({
      characterName: 'Elara',
      beatSpeaker: 'Elara',
      beatLine: '[angry] You knew this would happen.',
      beatAction: 'She stares at the screen, exhausted.',
      appearanceNotes: 'Bloodshot eyes, visible exhaustion and distress',
    })
    expect(emotion).toMatch(/angry/i)
  })

  it('uses beat action cues for action beats without dialogue', () => {
    const emotion = resolveDirectedEmotionForCharacter({
      characterName: 'Marcus',
      beatAction: '[fearful] Marcus backs away from the doorway, terrified.',
    })
    expect(emotion).toMatch(/fearful|terrified/i)
  })

  it('infers emotion from action prose when no bracket cue exists', () => {
    const emotion = resolveDirectedEmotionForCharacter({
      characterName: 'Elara',
      beatAction: 'Elara is crying, tears streaming down her face.',
    })
    expect(emotion).toMatch(/crying|tearful/i)
  })

  it('does not use wardrobe appearanceNotes as emotion — continuity is separate', () => {
    const emotion = resolveDirectedEmotionForCharacter({
      characterName: 'Elara',
      beatAction: 'Elara sits at the desk reviewing documents.',
      appearanceNotes: 'Bloodshot eyes, faint bruise forming on left temple, visible distress',
    })
    expect(emotion).toBe('')
  })

  it('does not apply dialogue line emotion to non-speaking characters', () => {
    const emotion = resolveDirectedEmotionForCharacter({
      characterName: 'Marcus',
      beatSpeaker: 'Elara',
      beatLine: '[angry] You knew this would happen.',
      beatAction: 'Marcus watches silently.',
      appearanceNotes: 'Visible exhaustion and distress',
    })
    expect(emotion).not.toMatch(/angry/i)
    // Neutral action prose + no speaker cue → no directed emotion
    expect(emotion).toBe('')
  })

  it('keeps bruise continuity when beat emotion is scared', () => {
    const emotion = resolveDirectedEmotionForCharacter({
      characterName: 'Piper',
      beatSpeaker: 'Piper',
      beatLine: '[scared] What did they do to me?',
      appearanceNotes: 'Bruised hands, faint contusion on knuckles',
    })
    const continuity = resolveSceneAppearanceContinuity(
      'Bruised hands, faint contusion on knuckles'
    )
    expect(emotion).toMatch(/scared|fearful/i)
    expect(continuity).toMatch(/bruise/i)
    expect(continuity).toMatch(/contusion|knuckles/i)
  })

  it('extractSceneStateFromAppearanceNotes drops base identity traits', () => {
    const scoped = extractSceneStateFromAppearanceNotes(
      'Bloodshot eyes, pale skin, a faint bruise forming on her temple, dark brown wavy hair, visible exhaustion and distress'
    )
    expect(scoped).toMatch(/bloodshot/i)
    expect(scoped).toMatch(/bruise/i)
    expect(scoped).toMatch(/distress|exhaustion/i)
    expect(scoped).not.toMatch(/pale skin/i)
    expect(scoped).not.toMatch(/dark brown wavy hair/i)
  })

  it('buildSceneAppearanceContinuityPromptSection formats continuity lines', () => {
    const section = buildSceneAppearanceContinuityPromptSection([
      { name: 'Piper', continuity: 'bruised hands, contusion on knuckles' },
      { name: 'Marcus', continuity: '' },
    ])
    expect(section).toBe(
      'Scene appearance continuity (preserve from wardrobe): Piper: bruised hands, contusion on knuckles.'
    )
  })
})

describe('beat directed emotion prompt helpers', () => {
  it('buildBeatDirectedEmotionPromptSection formats per-character lines', () => {
    const section = buildBeatDirectedEmotionPromptSection([
      { name: 'Elara', emotion: 'angry, intense expression' },
      { name: 'Marcus', emotion: 'fearful, anxious expression' },
    ])
    expect(section).toBe(
      'Directed emotion: Elara: angry, intense expression; Marcus: fearful, anxious expression.'
    )
  })

  it('formatDirectedEmotionLine produces Facial expression guidance', () => {
    expect(formatDirectedEmotionLine('scared, frightened expression')).toBe(
      'Facial expression: scared, frightened expression — eyes wide, brows raised, mouth tight.'
    )
  })

  it('leaves a single subject to take the expression unnamed', () => {
    expect(
      attributeBeatExpression({
        emotion: 'quiet dread',
        placedSubjects: [{ name: 'Piper Hayes', promptToken: 'person [1]' }],
        speakerName: 'Piper Hayes',
      })
    ).toEqual({
      line: 'Facial expression: quiet dread — eyes held, jaw tight, mouth closed, shoulders drawn.',
    })
  })

  it('applies the shared expression to every placed face in a two-shot', () => {
    const attributed = attributeBeatExpression({
      emotion: 'quiet dread',
      placedSubjects: [
        { name: 'Piper Hayes', promptToken: 'person [1]' },
        { name: 'Professor Gideon Croft', promptToken: 'person [2]' },
      ],
      speakerName: 'Gideon',
    })

    expect(attributed.line).toContain(
      'Facial expression (person [1] — Piper Hayes): quiet dread — eyes held, jaw tight, mouth closed, shoulders drawn.'
    )
    expect(attributed.line).toContain(
      'Facial expression (person [2] — Professor Gideon Croft): quiet dread — eyes held, jaw tight, mouth closed, shoulders drawn.'
    )
    expect(attributed.dropped).toBeUndefined()
  })

  it('still directs every placed face when no speaker is named', () => {
    const attributed = attributeBeatExpression({
      emotion: 'quiet dread',
      placedSubjects: [
        { name: 'Piper Hayes', promptToken: 'person [1]' },
        { name: 'Professor Gideon Croft', promptToken: 'person [2]' },
      ],
    })

    expect(attributed.line).toMatch(/Facial expression \(person \[1\] — Piper Hayes\):/)
    expect(attributed.line).toMatch(/Facial expression \(person \[2\] — Professor Gideon Croft\):/)
    expect(attributed.dropped).toBeUndefined()
  })

  it('directs no expression at a frame that places nobody', () => {
    expect(
      attributeBeatExpression({ emotion: 'quiet dread', placedSubjects: [] })
    ).toEqual({ line: '' })
  })

  it('resolveBeatDirectedEmotion reads action before appearance-only context', () => {
    expect(
      resolveBeatDirectedEmotion({
        beatLine: '[sad] I cannot believe it.',
        beatAction: 'She slams the folder shut.',
      })
    ).toMatch(/sad/i)
  })
})

describe('expandEmotionForStill', () => {
  it('turns a short mood label into visible face and body tells', () => {
    expect(expandEmotionForStill('sudden tension')).toBe(
      'sudden tension — eyes widened, jaw set, mouth tight, shoulders locked'
    )
    expect(expandEmotionForStill('hypnotic awe')).toContain('mouth parted')
  })

  it('keeps a phrase that already names the face or body', () => {
    expect(expandEmotionForStill('sudden tension, jaw set, eyes widened')).toBe(
      'sudden tension, jaw set, eyes widened'
    )
  })
})

describe('inferEmotionFromActionProse', () => {
  it('detects crying and terrified keywords in action text', () => {
    expect(inferEmotionFromActionProse('She is crying uncontrollably')).toMatch(/crying/i)
    expect(inferEmotionFromActionProse('He looks terrified at the explosion')).toMatch(/terrified/i)
  })
})

describe('generate-image expression negative regression guard', () => {
  it('does not block beat emotions when identity reference smiles', () => {
    const routePath = join(
      process.cwd(),
      'src/app/api/scene/generate-image/route.ts'
    )
    const source = readFileSync(routePath, 'utf8')
    expect(source).not.toMatch(/includes\('smile'\)/)
    expect(source).not.toMatch(
      /characterSpecificNegatives\.push\('frowning', 'sad expression', 'angry expression'\)/
    )
  })
})

describe('generate-image beat frame acting and wardrobe regression guard', () => {
  it('uses cinematic in-scene wrapper instead of reference-match phrasing', () => {
    const routePath = join(
      process.cwd(),
      'src/app/api/scene/generate-image/route.ts'
    )
    const source = readFileSync(routePath, 'utf8')
    expect(source).toMatch(/Storyboard dialogue frame/)
    expect(source).toMatch(/Storyboard silent action frame/)
    expect(source).toMatch(/buildSceneAppearanceContinuityPromptSection/)
    // Faces live in Action/Framing. A Directed emotion footer after [EXCLUSIONS]
    // is parsed as a negative and ignored.
    expect(source).toMatch(/applyCastPerformanceToPrompt/)
    expect(source).toMatch(/speakerName: ctx\.beatSpeakerName/)
    expect(source).not.toMatch(/joinPromptBlocks\(optimizedPrompt, directedEmotionSection\)/)
    expect(source).not.toMatch(/attributeBeatExpression\(\{/)
    expect(source).not.toMatch(/buildBeatDirectedEmotionPromptSection/)
    expect(source).not.toMatch(
      /Create an image about \$\{subjectIntroductions\} to match the description:/
    )
  })

  it('adds anti-posing negatives for beat frames', () => {
    const routePath = join(
      process.cwd(),
      'src/app/api/scene/generate-image/route.ts'
    )
    const assemblyPath = join(
      process.cwd(),
      'src/lib/character/characterReferenceAssembly.ts'
    )
    const routeSource = readFileSync(routePath, 'utf8')
    const assemblySource = readFileSync(assemblyPath, 'utf8')
    expect(routeSource).toMatch(/BEAT_FRAME_ANTI_POSE_NEGATIVE_PROMPT/)
    expect(routeSource).toMatch(/buildWardrobeBindingSummary/)
    expect(routeSource).toMatch(/subjectBindingSummary/)
    expect(routeSource).toMatch(/SCENE PROMPT:/)
    expect(assemblySource).toMatch(/posing for camera/)
  })

  it('does not pass JSON-wrapped prompts through the AI optimized path', () => {
    const intelligencePath = join(
      process.cwd(),
      'src/lib/intelligence/scene-image-intelligence.ts'
    )
    const source = readFileSync(intelligencePath, 'utf8')
    expect(source).toMatch(/unwrapSceneImageAiPrompt/)
    expect(source).toMatch(/looksLikeJsonPrompt/)
  })

  it('upgrades eco tier and enforces contiguous person tokens for multi-character beats', () => {
    const routePath = join(
      process.cwd(),
      'src/app/api/scene/generate-image/route.ts'
    )
    const source = readFileSync(routePath, 'utf8')
    expect(source).toMatch(/resolveEffectiveImageTier/)
    expect(source).toMatch(/getMaxReferenceImagesForTier/)
    expect(source).toMatch(/groupByRole:\s*true/)
    expect(source).toMatch(/buildSubjectCountGuardrail/)
    expect(source).toMatch(/modelTier:\s*effectiveImageTier/)
  })

  it('keeps project characters at function scope for beat and custom frame paths', () => {
    const routePath = join(
      process.cwd(),
      'src/app/api/scene/generate-image/route.ts'
    )
    const source = readFileSync(routePath, 'utf8')
    expect(source).toMatch(/let projectCharacters:\s*any\[\]\s*=\s*\[\]/)
    expect(source).toMatch(/projectCharacters\s*=\s*allCharacters/)
    expect(source).toMatch(/character && projectCharacters\.length > 0/)
    expect(source).toMatch(/projectCharactersForBeat = projectCharacters/)
    expect(source).not.toMatch(
      /resolveBeatSpeaker\(beatForEmotion,\s*allCharacters\)/
    )
  })
})
