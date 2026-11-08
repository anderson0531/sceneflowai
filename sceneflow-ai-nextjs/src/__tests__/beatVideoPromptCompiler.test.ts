import { describe, expect, it } from 'vitest'
import {
  compileBeatVideoPrompt,
  compileBeatVideoPromptFromDirection,
  resolveBeatClipDirection,
} from '@/lib/scene/beatVideoPromptCompiler'
import {
  estimateSyllables,
  isStoredTranslationTimedForShot,
  isTruncatedTimedTranslation,
} from '@/lib/translation/timedDialogueMetrics'
import {
  bindingsFromReferenceRecords,
  rewriteVisualNamesToTokens,
} from '@/lib/vision/referenceImageBinding'
import type { SceneBeat, SceneMusicCue } from '@/lib/script/segmentTypes'
import type { DetailedSceneDirection } from '@/types/scene-direction'

const dialogueBeat: SceneBeat = {
  beatId: 'beat_1',
  sequenceIndex: 0,
  kind: 'dialogue',
  character: 'SARAH',
  line: 'We need to leave now.',
}

const actionBeat: SceneBeat = {
  beatId: 'beat_2',
  sequenceIndex: 1,
  kind: 'action',
  actionDescription: 'Sarah slams the door and runs down the hallway.',
}

describe('compileBeatVideoPromptFromDirection', () => {
  it('uses segmentPromptBundle videoPrompt for dialogue beats', () => {
    const direction: DetailedSceneDirection = {
      camera: { shots: [], angle: '', movement: 'Dolly in', lensChoice: '', focus: '' },
      lighting: {
        overallMood: 'Low-Key',
        timeOfDay: '',
        keyLight: '',
        fillLight: '',
        backlight: '',
        practicals: '',
        colorTemperature: '',
      },
      scene: { location: '', keyProps: [], atmosphere: '' },
      talent: { blocking: '', keyActions: [], emotionalBeat: '' },
      audio: { priorities: '', considerations: '' },
      segmentPromptBundle: [
        {
          timelineIndex: 0,
          kind: 'dialogue',
          character: 'SARAH',
          lineText: 'We need to leave now.',
          segmentDirectionSummary: 'Urgent escape beat.',
          startFramePrompt: '',
          endFramePrompt: '',
          videoPrompt: 'Sarah turns sharply toward the exit with rising panic.',
        },
      ],
    }

    const result = compileBeatVideoPromptFromDirection(dialogueBeat, direction)
    expect(result.prompt).toContain('Urgent escape beat.')
    expect(result.prompt).toContain('Sarah turns sharply toward the exit with rising panic.')
    expect(result.prompt).toContain('Dolly in')
  })

  it('combines action description with scene camera hints', () => {
    const direction: DetailedSceneDirection = {
      camera: {
        shots: ['Wide Shot'],
        angle: '',
        movement: 'Handheld',
        lensChoice: '',
        focus: '',
      },
      lighting: {
        overallMood: 'Hard & Dramatic',
        timeOfDay: '',
        keyLight: '',
        fillLight: '',
        backlight: '',
        practicals: '',
        colorTemperature: '',
      },
      scene: { location: '', keyProps: [], atmosphere: '' },
      talent: { blocking: '', keyActions: [], emotionalBeat: 'Suppressed anger' },
      audio: { priorities: '', considerations: '' },
    }

    const result = compileBeatVideoPromptFromDirection(actionBeat, direction)
    expect(result.prompt).toContain('Sarah slams the door')
    expect(result.prompt).toContain('Handheld')
    expect(result.prompt).toContain('Wide Shot')
  })

  it('adds incoming continuity and continues a split spoken line', () => {
    const previous: SceneBeat = {
      beatId: 'beat_0',
      sequenceIndex: 0,
      kind: 'dialogue',
      character: 'SARAH',
      line: 'We need to leave now before they seal the tunnel.',
      beatDirection: {
        shotType: 'Medium Close-Up',
        castInFrame: ['SARAH'],
        keyProps: ['tunnel key'],
      },
    }
    const continuation: SceneBeat = {
      ...dialogueBeat,
      beatId: 'beat_1',
      sequenceIndex: 1,
      line: 'We need to leave now before they seal the tunnel.',
    }
    const result = compileBeatVideoPromptFromDirection(continuation, null, {
      excerpt: 'before they seal the tunnel.',
      previousBeat: previous,
      continuesSameLine: true,
    })
    expect(result.prompt).toContain('before they seal the tunnel.')
    expect(result.prompt).toContain('Continues the same spoken line')
  })

  it('compiles a motion prompt from user beat direction and leaves the scene bundle behind', () => {
    const directed: SceneBeat = {
      ...dialogueBeat,
      beatDirection: {
        generatedBy: 'user',
        shotType: 'Medium Close-Up',
        cameraMovement: 'push-in',
        blocking: 'screen-left, weight on the back foot',
        frozenMoment: 'Sarah plants her feet at the doorway.',
        emotion: 'rising panic',
      },
    }
    const direction: DetailedSceneDirection = {
      camera: { shots: [], angle: '', movement: 'Dolly in', lensChoice: '', focus: '' },
      lighting: {
        overallMood: 'Low-Key',
        timeOfDay: '',
        keyLight: '',
        fillLight: '',
        backlight: '',
        practicals: '',
        colorTemperature: '',
      },
      scene: { location: '', keyProps: [], atmosphere: '' },
      talent: { blocking: '', keyActions: [], emotionalBeat: '' },
      audio: { priorities: '', considerations: '' },
      segmentPromptBundle: [
        {
          timelineIndex: 0,
          kind: 'dialogue',
          character: 'SARAH',
          lineText: 'We need to leave now.',
          segmentDirectionSummary: 'Urgent escape beat.',
          startFramePrompt: '',
          endFramePrompt: '',
          videoPrompt: 'Sarah turns sharply toward the exit with rising panic.',
        },
      ],
    }

    const result = compileBeatVideoPromptFromDirection(directed, direction)
    expect(result.prompt).toContain('We need to leave now.')
    expect(result.prompt).toContain('Sarah plants her feet at the doorway.')
    expect(result.prompt).toContain('push-in')
    expect(result.prompt).toContain('screen-left, weight on the back foot')
    expect(result.prompt).toContain('The only spoken line is')
    expect(result.prompt).not.toContain('Natural cinematic motion')
    expect(result.prompt).not.toContain('Dolly in')
    expect(result.prompt).not.toContain('film still')
    expect(result.prompt).not.toContain('turns sharply toward the exit')
    expect(result.prompt).not.toContain('Urgent escape beat')
  })

  it('returns a saved video prompt as the clip text', () => {
    const directed: SceneBeat = {
      ...actionBeat,
      beatDirection: {
        generatedBy: 'user',
        shotType: 'Wide Shot',
        videoPrompt: 'Hold on the doorway. No one enters.',
      },
    }
    const result = compileBeatVideoPromptFromDirection(directed, null)
    expect(result.prompt).toBe('Hold on the doorway. No one enters.')
  })

  it('closes an action beat without inviting dialogue or a second camera', () => {
    const directed: SceneBeat = {
      ...actionBeat,
      beatDirection: {
        generatedBy: 'user',
        shotType: 'Medium Tracking Shot',
        cameraMovement: 'Dolly In fast',
        castInFrame: [],
        keyProps: ['copper induction engine'],
      },
    }
    const direction: DetailedSceneDirection = {
      camera: {
        shots: ['Wide Establishing Shot'],
        angle: '',
        movement: 'Dynamic Steadicam push-ins',
        lensChoice: '',
        focus: '',
      },
      lighting: {
        overallMood: 'Hard & Dramatic',
        timeOfDay: '',
        keyLight: '',
        fillLight: '',
        backlight: '',
        practicals: '',
        colorTemperature: '',
      },
      scene: { location: '', keyProps: [], atmosphere: '' },
      talent: { blocking: '', keyActions: [], emotionalBeat: '' },
      audio: { priorities: '', considerations: '' },
    }
    const result = compileBeatVideoPromptFromDirection(directed, direction)
    expect(result.prompt).toContain('Dolly In fast')
    expect(result.prompt).toContain('Medium Tracking Shot')
    expect(result.prompt).toContain('No people in frame')
    expect(result.prompt).toContain('copper induction engine')
    expect(result.prompt).toContain('No spoken dialogue')
    expect(result.prompt).toContain('The only action is')
    expect(result.prompt).not.toContain('Wide Establishing Shot')
    expect(result.prompt).not.toContain('Steadicam')
    expect(result.prompt).not.toContain('film still')
    expect(result.prompt).not.toContain('speaks naturally')
    expect(result.negativePrompt).toContain('dialogue')
    expect(result.negativePrompt).toContain('lip sync')
  })

  it('skips redundant segmentDirectionSummary when it duplicates videoPrompt', () => {
    const direction: DetailedSceneDirection = {
      camera: { shots: [], angle: '', movement: 'Dolly in', lensChoice: '', focus: '' },
      lighting: {
        overallMood: 'Low-Key',
        timeOfDay: '',
        keyLight: '',
        fillLight: '',
        backlight: '',
        practicals: '',
        colorTemperature: '',
      },
      scene: { location: '', keyProps: [], atmosphere: '' },
      talent: {
        blocking: '',
        keyActions: [],
        emotionalBeat: 'horrifying realization and quiet resignation',
      },
      audio: { priorities: '', considerations: '' },
      segmentPromptBundle: [
        {
          timelineIndex: 0,
          kind: 'dialogue',
          character: 'SARAH',
          lineText: 'We need to leave now.',
          segmentDirectionSummary:
            'Sarah turns sharply toward the exit with rising panic.',
          startFramePrompt: '',
          endFramePrompt: '',
          videoPrompt:
            'Sarah turns sharply toward the exit with rising panic. Dolly in on her face.',
        },
      ],
    }

    const result = compileBeatVideoPromptFromDirection(dialogueBeat, direction)
    expect(result.prompt).not.toContain('..')
    expect(result.prompt).not.toContain('horrifying')
    expect(result.prompt.match(/Sarah turns sharply toward the exit/g)?.length).toBe(1)
  })
})

describe('compileBeatVideoPrompt cinematic performance', () => {
  const takes = [
    {
      line: "It's a closed loop... why won't the math close?",
      voiceDirection:
        'Close-mic, intimate and utterly defeated. Let the breath carry the words more than the vocal cords. Frame this as a quiet, bitter surrender to his own limitations.',
    },
    {
      line: "I'm losing the thread, Clara. The current is dead.",
      voiceDirection:
        "Fragile and highly intimate. He is confessing his absolute failure to the only person who mattered. Let the words crack on 'dead'.",
    },
    {
      line: 'Eighty pounds of drag... Ward found me.',
      voiceDirection:
        "Tightly coiled, processing impossible data. He isn't panicked, he's rapidly calculating the physics of the threat and arriving at a terrifying conclusion. Grounded in paranoia.",
    },
  ]

  it.each(takes)('sends the acting brief with $line', ({ line, voiceDirection }) => {
    const result = compileBeatVideoPrompt({
      ...dialogueBeat,
      character: 'GIDEON',
      line,
      voiceDirection,
    })
    expect(result.prompt).toContain(`Performance: ${voiceDirection}`)
    expect(result.prompt).toContain(line.replace(/\.{2,}/g, '.'))
  })

  it('keeps a bracket-only line on Delivery and does not invent Performance', () => {
    const result = compileBeatVideoPrompt({
      ...dialogueBeat,
      line: '[angry] We need to leave now.',
    })
    expect(result.prompt).toContain('Delivery:')
    expect(result.prompt).toContain('We need to leave now.')
    expect(result.prompt).not.toContain('Performance:')
  })
})

describe('compileBeatVideoPrompt speaker alias', () => {
  it('uses Char_ aliases on speaker lines and keeps spoken text', () => {
    const result = compileBeatVideoPrompt(dialogueBeat)
    expect(result.prompt).toContain('Char_SARAH speaks naturally:')
    expect(result.prompt).toContain('We need to leave now.')
    expect(result.prompt).not.toMatch(/^SARAH speaks naturally/)
  })
})

describe('music cue steer', () => {
  const musicCue: SceneMusicCue = {
    cueId: 'cue-0-2',
    beatStart: 0,
    beatEnd: 2,
    description: 'Cinematic orchestral score, aggressive mood, low brass, driving tempo',
    intent: 'the turn into violence',
    generatedBy: 'llm',
  }

  it('directs the performance with the cue’s emotion, not its instrumentation', () => {
    const result = compileBeatVideoPrompt(actionBeat, { musicCue })

    expect(result.prompt).toContain('the turn into violence')
    expect(result.prompt).toContain('pacing and performance')
    expect(result.prompt).not.toMatch(/orchestral|brass|tempo/i)
  })

  it('keeps music in the negative prompt so only Lyria scores the beat', () => {
    const result = compileBeatVideoPrompt(actionBeat, { musicCue })
    expect(result.negativePrompt).toContain('music')
  })

  it('leaves the prompt untouched for a beat no cue scores', () => {
    expect(compileBeatVideoPrompt(actionBeat, {}).prompt).toBe(
      compileBeatVideoPrompt(actionBeat).prompt
    )
  })

  it('adds the steer once when compiling from scene direction', () => {
    const direction: DetailedSceneDirection = {
      camera: { shots: ['Wide Shot'], angle: '', movement: 'Handheld', lensChoice: '', focus: '' },
      lighting: {
        overallMood: 'Hard & Dramatic',
        timeOfDay: '',
        keyLight: '',
        fillLight: '',
        backlight: '',
        practicals: '',
        colorTemperature: '',
      },
      scene: { location: '', keyProps: [], atmosphere: '' },
      talent: { blocking: '', keyActions: [], emotionalBeat: 'Suppressed anger' },
      audio: { priorities: '', considerations: '' },
    }

    const result = compileBeatVideoPromptFromDirection(actionBeat, direction, { musicCue })
    expect(result.prompt.match(/the turn into violence/g)).toHaveLength(1)
    expect(result.prompt).not.toContain('..')
  })

  it('adds the steer once when falling back with no direction at all', () => {
    const result = compileBeatVideoPromptFromDirection(actionBeat, null, { musicCue })
    expect(result.prompt.match(/the turn into violence/g)).toHaveLength(1)
  })
})

describe('narration beat video prompt compilation', () => {
  const narrationBeat: SceneBeat = {
    beatId: 'beat_narr_1',
    sequenceIndex: 0,
    kind: 'narration',
    character: 'NARRATOR',
    line: 'In a city wired to remember everything, one archive is about to forget.',
    voiceDirection: 'Low, urgent trailer cadence',
    beatDirection: {
      shotType: 'Wide establishing shot',
      cameraMovement: 'Slow push-in establishing trailer tone',
      frozenMoment: 'Promo trailer opening voice-over sequence',
      blocking: 'Voice-over narration plays over the opening promotional montage sequence.',
    },
  }

  it('includes the narration spoken line and omits No spoken dialogue in compiled clip prompts', () => {
    const result = compileBeatVideoPrompt(narrationBeat)
    expect(result.prompt).toContain(
      'Voiceover narration: "In a city wired to remember everything, one archive is about to forget."'
    )
    expect(result.prompt).toContain(
      'The only spoken line is: "In a city wired to remember everything, one archive is about to forget."'
    )
    expect(result.prompt).not.toContain('No spoken dialogue')
    expect(result.negativePrompt).not.toContain('speech')
  })

  it('replaces a stale stored beatDirection.videoPrompt that omitted the narration line', () => {
    const staleBeat: SceneBeat = {
      ...narrationBeat,
      beatDirection: {
        ...narrationBeat.beatDirection,
        videoPrompt:
          'Promo trailer opening voice-over sequence. Slow push-in establishing trailer tone. Real-time motion, no lip flap, no speech. No spoken dialogue.',
      },
    }
    const result = compileBeatVideoPromptFromDirection(staleBeat, null)
    expect(result.prompt).toContain(
      'In a city wired to remember everything, one archive is about to forget.'
    )
    expect(result.prompt).not.toContain('No spoken dialogue')
  })

  it('compiles 10s Clip direction (startFrame, clipAction, emotion, endFrame) and replaces stale cached videoPrompt without cast contradictions', () => {
    const previousBeat: SceneBeat = {
      beatId: 'beat_prev',
      sequenceIndex: 0,
      kind: 'action',
      beatDirection: {
        shotType: 'Long Shot',
        castInFrame: ['Julian Ward'],
      },
    }

    const shorelineBeat: SceneBeat = {
      beatId: 'beat_shoreline',
      sequenceIndex: 1,
      kind: 'action',
      actionDescription:
        'A harmonic surge sweeps through the municipal power grid along the Chicago coastline, igniting the dormant infrastructure in a rolling shockwave of power. Thousands of streetlights, industrial yards, and tenement windows across Englewood and Woodlawn flare into intense incandescent gold. Columns of dense white exhaust steam vent from rooftop boilers into the pitch-black winter sky.',
      beatDirection: {
        generatedBy: 'user',
        shotType: 'Wide Shot',
        cameraAngle: 'high angle',
        cameraMovement: 'slow push-in',
        transition: 'CUT',
        castInFrame: [],
        startFrame:
          'Darkened Chicago shoreline and frozen pack ice of Lake Michigan sit pitch-black at t=0s as the initial golden electrical arc strikes the coastal substation.',
        clipAction:
          'A harmonic shockwave of incandescent gold sweeps inland across Englewood and Woodlawn from 0s to 10s, igniting thousands of streetlights and tenement windows while rooftop boilers vent dense white steam.',
        emotion: 'Electrifying, awe-inspiring infrastructural awakening',
        endFrame:
          'The sprawling Chicago shoreline grid across Englewood and Woodlawn sits locked in blazing incandescent gold, casting warm amber highlights across the cracked shelf ice of Lake Michigan below while vertical plumes of white exhaust steam hang against the night sky.',
        frozenMoment:
          'The sprawling Chicago shoreline grid across Englewood and Woodlawn sits locked in blazing incandescent gold, casting warm amber highlights across the cracked shelf ice of Lake Michigan below while vertical plumes of white exhaust steam hang frozen against the night sky.',
        blocking:
          'The jagged blue-gray pack ice and dark open water of Lake Michigan anchor the bottom third of the frame, meeting the dark breakwater at screen-left; the dense street grid and illuminated brick tenements of Englewood and Woodlawn stretch across the midground and background, receding toward the upper-right horizon under a starless winter sky.',
        audioCue: 'Resonant low-frequency electrical surge humming across the frozen lake',
        // Simulate a stale cached videoPrompt from before Shot Director ran
        videoPrompt:
          'The harmonic wave impacts the shoreline. Simultaneously, thousands of municipal streetlights, darkened tenements, and frozen housing blocks in Englewood and Woodlawn erupt into brilliant, warm incandescent gold. Shot: Wide Shot. Angle: high angle. End on: Thousands of municipal streetlights, darkened tenements, and frozen housing blocks in Englewood and Woodlawn sit illuminated in brilliant, warm incandescent gold, with exhaust steam suspended in glowing plumes against the dark winter sky. Natural cinematic motion. Film Noir, dynamic motion. Scored moment: electrifying rebellious adrenaline — carry that in the pacing and performance. Incoming continuity from Long Shot. same people already in frame: Julian Ward. No people in frame. The only action is: The harmonic wave impacts the shoreline. Simultaneously, thousands of municipal streetlights, darkened tenements, and frozen housing blocks in Englewood and Woodlawn erupt into brilliant, warm incandescent gold. No spoken dialogue. photorealistic, cinematic motion, professional cinematography, natural lighting, shallow depth of field',
      },
    }

    const resolved = resolveBeatClipDirection(shorelineBeat, null)
    expect(resolved.startFrame).toContain('Darkened Chicago shoreline')
    expect(resolved.clipAction).toContain('harmonic shockwave of incandescent gold sweeps inland')
    expect(resolved.emotion).toBe('Electrifying, awe-inspiring infrastructural awakening')
    expect(resolved.endFrame).toContain('sprawling Chicago shoreline grid across Englewood and Woodlawn')

    const result = compileBeatVideoPromptFromDirection(shorelineBeat, null, { previousBeat })
    expect(result.prompt).toContain('0s–2s (Start frame): Darkened Chicago shoreline')
    expect(result.prompt).toContain('2s–8s (Action): A harmonic shockwave of incandescent gold sweeps inland')
    expect(result.prompt).toContain('Camera: slow push-in')
    expect(result.prompt).toContain('Blocking: The jagged blue-gray pack ice')
    expect(result.prompt).toContain('Emotion: Electrifying, awe-inspiring infrastructural awakening')
    expect(result.prompt).toContain(
      '8s–10s (End frame): End on: The sprawling Chicago shoreline grid across Englewood and Woodlawn sits locked in blazing incandescent gold'
    )
    expect(result.prompt).toContain(
      'Sound: Resonant low-frequency electrical surge humming across the frozen lake'
    )
    expect(result.prompt).toContain(
      'Hold the 0s–2s start state before initiating the 2s–8s progression, and settle cleanly into the 8s–10s end frame without inventing unstated events or extra cuts'
    )
    expect(result.prompt).toContain('No people in frame')
    expect(result.prompt).not.toContain('same people already in frame: Julian Ward')
    expect(result.prompt).toContain('deep depth of field')
    expect(result.prompt).not.toContain('shallow depth of field')
  })

  it('directs a 10s shot with explicit timed phases (0s–2s start, 2s–5s / 5s–8s action, 8s–10s end) and strips redundant temporal prefixes', () => {
    const awakeningBeat: SceneBeat = {
      beatId: 'beat_chicago_awakening',
      sequenceIndex: 2,
      kind: 'action',
      actionDescription:
        'The camera pushes slowly inward high over the frozen lakefront as a dormant Chicago awakens. A resonant electrical wave sweeps inland across the ice, sequentially igniting rows of amber incandescent streetlights along the rail corridors of Englewood and Woodlawn. Clustered tenement windows light up in warm gold while awakened rooftop boilers vent dense vertical plumes of white steam against the pre-dawn indigo sky.',
      beatDirection: {
        generatedBy: 'user',
        shotType: 'Wide Shot',
        cameraAngle: 'high angle',
        cameraMovement: 'slow high-angle push-in',
        transition: 'CUT',
        castInFrame: [],
        frozenMoment:
          'The dormant Chicago shoreline stands frozen in complete darkness at t=0s, showing unlit brick tenement silhouettes and cold rail yards across Englewood and Woodlawn beneath a deep indigo pre-dawn sky, with jagged blue-gray shelf ice completely unilluminated across the lower frame.',
        startFrame:
          'At t=0s, the Chicago coastline sits in complete pitch-black darkness with zero electrical light or power, framing the dormant silhouettes of Englewood and Woodlawn tenement blocks against a deep indigo sky, while motionless blue-gray shelf ice blankets the foreground lake.',
        clipAction:
          'From t=0s to t=10s, a radiant violet-gold electrical surge hits the shoreline and propels westward through the dormant municipal grid, sequentially igniting lines of incandescent amber streetlights through Englewood and Woodlawn. Hundreds of tenement windows illuminate in rapid succession in warm golden squares, while dense vertical plumes of white exhaust steam erupt from awakened rooftop boilers and catch the golden glare.',
        blocking:
          'Cracked blue-gray lake ice blankets the lower third of the frame from screen-left to screen-right; the unlit, pitch-black municipal grid of Englewood and Woodlawn spans the middle and upper frame, receding southwest toward the horizon.',
        emotion:
          'Atmospheric tension begins in frozen, pitch-black desolation before accelerating into an overwhelming, triumphant crescendo of warmth and restored civic power.',
        endFrame:
          'End on: At t=10s, the entire street and rail grid across Englewood and Woodlawn blazes in radiant amber and golden illumination, with towering white steam plumes billowing into the indigo sky and long warm light ribbons reflected across the cracked lake ice below.',
        audioCue:
          'Deep resonant sub-bass surge of municipal transformers humming into phase accompanied by the sharp crackle of expanding high-voltage lines',
        // Simulate a stale videoPrompt from an earlier Shot Director run
        videoPrompt:
          'A resonant electrical wave surges through the dormant municipal infrastructure along the southern Chicago lakefront. The dark street grids of Englewood and Woodlawn ignite into thousands of incandescent amber streetlights and glowing tenement windows. Dense vertical plumes of white exhaust steam billow from industrial rooftop boilers, catching the warm golden glare against the deep indigo horizon. Shot: Wide Shot. Angle: high angle. Camera: slow push-in. Blocking: Cracked blue-gray lake ice and dark open water occupy the bottom third of the frame, tapering along the diagonal shoreline from screen-left to screen-right; the glowing grid of brick tenement blocks, switchyards, and rail corridors fills the middle and upper frame, receding toward the western horizon. End on: The interconnected street grid of Englewood and Woodlawn stands fully illuminated in radiant amber and gold, casting sharp reflective ribbons across the cracked shelf ice of Lake Michigan in the lower frame while tall, dense plumes of white boiler steam hang suspended in the freezing air against the dark western sky. Sound: Deep resonant sub-bass surge of thousands of municipal transformers humming simultaneously. Film Noir, dynamic motion. Scored moment: electrifying rebellious adrenaline — carry that in the pacing and performance. Incoming continuity from Long Shot. No people in frame. The only action is: A resonant electrical wave surges through the dormant municipal infrastructure along the southern Chicago lakefront. No spoken dialogue. photorealistic, cinematic motion, professional cinematography, natural lighting, deep depth of field',
      },
    }

    const result = compileBeatVideoPromptFromDirection(awakeningBeat, null)
    expect(result.prompt).toMatch(
      /^0s–2s \(Start frame\): The Chicago coastline sits in complete pitch-black darkness in total blackout with every window and streetlamp dark and unlit/
    )
    expect(result.prompt).not.toContain('with zero electrical light or power')
    expect(result.prompt).toContain(
      '2s–5s (Action): A radiant violet-gold electrical surge hits the shoreline and propels westward through the dormant municipal grid, sequentially igniting lines of incandescent amber streetlights through Englewood and Woodlawn'
    )
    expect(result.prompt).toContain(
      '5s–8s (Action progression): Hundreds of tenement windows illuminate in rapid succession in warm golden squares, while dense vertical plumes of white exhaust steam erupt from awakened rooftop boilers and catch the golden glare'
    )
    expect(result.prompt).toContain(
      '8s–10s (End frame): End on: The entire street and rail grid across Englewood and Woodlawn blazes in radiant amber and golden illumination'
    )
    expect(result.prompt).not.toContain('2s–8s (Action):')
    expect(result.prompt.match(/8s–10s \(End frame\):/g)).toHaveLength(1)
    expect(result.prompt).not.toContain('End on: End on:')
    expect(result.prompt).not.toContain('From t=0s to t=10s,')
    expect(result.prompt).toContain('Camera: slow high-angle push-in')
    expect(result.prompt).toContain(
      'Emotion: Atmospheric tension begins in frozen, pitch-black desolation before accelerating into an overwhelming, triumphant crescendo of warmth and restored civic power'
    )
    expect(result.prompt).toContain(
      'Hold the 0s–2s start state before initiating the 2s–8s progression, and settle cleanly into the 8s–10s end frame without inventing unstated events or extra cuts'
    )
    expect(result.prompt).not.toContain('The only action is:')
  })

  it('optimizes Omni 1.1 Flash timed prompts by converting negated light nouns to affirmative blackout state, stripping word-number time labels, and eliminating duplicate action/end clauses', () => {
    const omniFlashBeat: SceneBeat = {
      beatId: 'bt_ba099b7c-1ce',
      sequenceIndex: 2,
      kind: 'action',
      actionDescription:
        'The camera pushes slowly inward high over the frozen lakefront as a dormant Chicago awakens.',
      beatDirection: {
        generatedBy: 'director',
        shotType: 'Wide Shot',
        cameraAngle: 'high angle',
        cameraMovement: 'slow push-in',
        transition: 'CUT',
        castInFrame: [],
        startFrame:
          'Jagged slabs of blue-gray shelf ice span the lower foreground in dark shadow, while the completely unlit silhouettes of the Englewood rail corridors on screen-left and Woodlawn tenement blocks on screen-right stand black against a deep pre-dawn indigo sky without a single electric light.',
        clipAction:
          'From two to five seconds, a luminous electrical wave surges westward across the frozen lake ice to the shoreline, sequentially igniting rows of amber incandescent streetlights along the Englewood rail corridors. From five to eight seconds, warm golden illumination propagates block by block through hundreds of Woodlawn tenement windows as dense vertical plumes of white steam erupt from awakened rooftop boilers against the pre-dawn indigo sky.',
        endFrame:
          'The urban grid across Englewood and Woodlawn stands fully illuminated in an interconnected web of amber streetlights and glowing golden tenement windows, with dense vertical plumes of white boiler steam rising into the pale pre-dawn sky.',
        blocking:
          'Cracked blue-gray shelf ice blankets the lower third of the frame from screen-left to screen-right; the dark grid of Englewood rail corridors occupies screen-left receding southwest, while Woodlawn\'s tenement clusters sit across screen-right beneath the open indigo horizon.',
        emotion:
          'Cold, desolate stillness and suffocating suspense transitioning into an accelerating, triumphant wave of electric heat, civic illumination, and sudden kinetic awakening.',
        audioCue:
          'Deep resonant sub-bass pulse of municipal transformers humming into phase followed by the sharp snapping crackle of expanding high-voltage electrical lines.',
        // Simulate the previously polluted cached videoPrompt with duplicate 2s–8s, duplicate 8s–10s, and "The only action is:"
        videoPrompt:
          '0s–2s (Start frame): Jagged slabs of blue-gray shelf ice span the lower foreground in dark shadow, while the completely unlit silhouettes of the Englewood rail corridors on screen-left and Woodlawn tenement blocks on screen-right stand black against a deep pre-dawn indigo sky without a single electric light. 2s–5s (Action): From two to five seconds, a luminous electrical wave surges westward across the frozen lake ice to the shoreline, sequentially igniting rows of amber incandescent streetlights along the Englewood rail corridors. 5s–8s (Action progression): From five to eight seconds, warm golden illumination propagates block by block through hundreds of Woodlawn tenement windows as dense vertical plumes of white steam erupt from awakened rooftop boilers against the pre-dawn indigo sky. 8s–10s (End frame): End on: The urban grid across Englewood and Woodlawn stands fully illuminated in an interconnected web of amber streetlights and glowing golden tenement windows, with dense vertical plumes of white boiler steam rising into the pale pre-dawn sky. 2s–8s (Action): From two to five seconds, a luminous electrical wave surges westward across the frozen lake ice to the shoreline, sequentially igniting rows of amber incandescent streetlights along the Englewood rail corridors. From five to eight seconds, warm golden illumination propagates block by block through hundreds of Woodlawn tenement windows as dense vertical plumes of white steam erupt from awakened rooftop boilers against the pre-dawn indigo sky. Shot: Wide Shot. Angle: high angle. Camera: slow push-in. 8s–10s (End frame): End on: The urban grid across Englewood and Woodlawn stands fully illuminated in an interconnected web of amber streetlights and glowing golden tenement windows, with dense vertical plumes of white boiler steam rising into the pale pre-dawn sky. No people in frame. The only action is: From two to five seconds, a luminous electrical wave surges westward across the frozen lake ice to the shoreline, sequentially igniting rows of amber incandescent streetlights along the Englewood rail corridors. No spoken dialogue. photorealistic, cinematic motion, professional cinematography, natural lighting, deep depth of field',
      },
    }

    const result = compileBeatVideoPromptFromDirection(omniFlashBeat, null, {
      previousBeat: {
        beatId: 'bt_prev',
        sequenceIndex: 1,
        kind: 'action',
        beatDirection: { shotType: 'Long Shot', castInFrame: [] },
      },
    })

    expect(result.prompt).toContain(
      '0s–2s (Start frame): Jagged slabs of blue-gray shelf ice span the lower foreground in dark shadow, while the completely unlit silhouettes of the Englewood rail corridors on screen-left and Woodlawn tenement blocks on screen-right stand black against a deep pre-dawn indigo sky in total blackout with every window and streetlamp dark and unlit'
    )
    expect(result.prompt).not.toContain('without a single electric light')
    expect(result.prompt).toContain(
      '2s–5s (Action): A luminous electrical wave surges westward across the frozen lake ice to the shoreline, sequentially igniting rows of amber incandescent streetlights along the Englewood rail corridors'
    )
    expect(result.prompt).toContain(
      '5s–8s (Action progression): Warm golden illumination propagates block by block through hundreds of Woodlawn tenement windows as dense vertical plumes of white steam erupt from awakened rooftop boilers against the pre-dawn indigo sky'
    )
    expect(result.prompt).not.toContain('From two to five seconds,')
    expect(result.prompt).not.toContain('From five to eight seconds,')
    expect(result.prompt).not.toContain('2s–8s (Action):')
    expect(result.prompt.match(/8s–10s \(End frame\):/g)).toHaveLength(1)
    expect(result.prompt.match(/Incoming continuity from/g)).toHaveLength(1)
    expect(result.prompt).not.toContain('The only action is:')
    expect(result.prompt).not.toContain('suffocating')
    expect(result.prompt).toContain('oppressive suspense')
  })

  it('compiles separate optimized prompts for Reference vs Frame mode and strips unactuated board inscriptions', () => {
    const gideonBeat: SceneBeat = {
      beatId: 'bt_gideon_chalk',
      sequenceIndex: 1,
      kind: 'dialogue',
      character: 'Gideon Croft',
      line: '[obsessive, breathless] The current bleeds out. Every damn time... the loop refuses to close.',
      voiceDirection:
        'Deliver in a rapid, breathless, close-mic rasp fogged with cold; rush the opening clause obsessively, hitch sharply on the ellipsis, and drop the final words into a low, self-condemning growl.',
      beatDirection: {
        generatedBy: 'director',
        shotType: 'Medium Close-Up',
        cameraAngle: 'low angle',
        cameraMovement: 'slow handheld push-in',
        castInFrame: ['Gideon Croft'],
        keyProps: ['Chalk'],
        coveragePurpose: "Capture Gideon's vocalized obsession and breath control amid the isolating silence.",
        lensEnergy: "Slow, deliberate push-in, shallow focus on Gideon's sweat-beaded brow.",
        spatialRelationship: 'Gideon in profile at screen-right, background falls away into dark tunnel mouth screen-left.',
        startFrame:
          "Gideon Croft is framed chest-up on screen-right at a low angle, his torso pitched forward toward the damp subterranean slate wall covered in drafted equations and the crisp chalk inscription 'RESONANCE FLUX = 0'. His chalk-whitened right thumb and index finger hold a stick of Chalk suspended an inch off the wet dark stone while cold breath vapor gathers at his parted lips.",
        clipAction:
          "Gideon lunges his weight forward into the slate face, dragging the Chalk in a jagged diagonal strike across the inscription 'RESONANCE FLUX = 0' until the brittle stick snaps apart against the stone and scatters fine white dust down the crevices. He jerks his chalk-stained right fist back against his sternum while his chest heaves in rapid breaths and his jaw tightens in bitter defeat as the handheld camera executes a tight push-in.",
        blocking:
          'Gideon Croft stands screen-right in three-quarter profile facing screen-left, planting his body weight firmly on his forward right foot with his upper torso pitched toward the damp slate wall.',
        emotion:
          'Gideon Croft: obsessive intellectual mania collapsing into physical exhaustion and defeat, registered through tightly bunched masseter muscles, flared nostrils drawing cold air, hollowed shadows under his eyes, and a sharp tremor along his parted lower lip.',
        gaze:
          "Gideon Croft fixes his bloodshot eyes intently screen-left on the chalk formula 'RESONANCE FLUX = 0' inscribed on the slate wall.",
        propInteraction:
          "Gideon Croft's right thumb and forefinger grip a stick of Chalk poised an inch away from the formula 'RESONANCE FLUX = 0' on the damp slate wall.",
        lightingAccent:
          'Warm tungsten key light sculpting the hollows of his cheeks, deep charcoal shadows masking his eyes.',
        endFrame:
          "Gideon Croft stands locked in three-quarter profile on screen-right with his chalk-smeared right knuckles clamped hard against his collarbone, his chest rising and falling in shallow tremors. On the slate wall at screen-left, the formula 'RESONANCE FLUX = 0' is bisected by a jagged white fracture score, surrounded by scattered chalk dust clinging to the glistening dark rock face.",
        audioCue: 'brittle snap of chalk fracturing against wet slate',
      },
    }

    const refPrompt = compileBeatVideoPromptFromDirection(gideonBeat, null, {
      targetMethod: 'reference',
    }).prompt
    expect(refPrompt).toContain('0s–2s (Start frame):')
    expect(refPrompt).toContain('2s–5s (Action):')
    expect(refPrompt).toContain('5s–8s (Action progression):')
    expect(refPrompt).toContain('8s–10s (End frame): End on:')
    // Unactuated quoted board text and static mid-clip reset clauses are stripped
    expect(refPrompt).not.toContain("'RESONANCE FLUX = 0'")
    expect(refPrompt).not.toContain('Prop interaction:')
    expect(refPrompt).not.toContain('Coverage:')
    expect(refPrompt).not.toContain('Lens:')
    expect(refPrompt).not.toContain('Space:')
    expect(refPrompt).not.toContain('Gaze:')

    const framePrompt = compileBeatVideoPromptFromDirection(gideonBeat, null, {
      targetMethod: 'frame',
    }).prompt
    expect(framePrompt).toContain(
      'Continuous motion from start frame to end frame (0s–10s):'
    )
    expect(framePrompt).toContain(
      'Smoothly reach the closing keyframe state by the end of the shot:'
    )
    expect(framePrompt).toContain(
      'Progress smoothly and continuously from the start frame across the entire shot duration to arrive naturally at the end frame without holding the opening pose or jumping in the final 2 seconds'
    )
    expect(framePrompt).not.toContain('0s–2s (Start frame):')
    expect(framePrompt).not.toContain('8s–10s (End frame):')
    expect(framePrompt).not.toContain('Hold the 0s–2s start state')
    expect(framePrompt).not.toContain('Blocking:')
    expect(framePrompt).not.toContain('Prop interaction:')
  })

  it('counts Arabic syllables and binds person [1] across possessive apostrophes, Char_ aliases, and first names in translated prompts', () => {
    const englishLine =
      '[obsessive, breathless] The current bleeds out. Every damn time... the loop refuses to close.'
    const arabicLine = '[obsessive, breathless] التيار يتسرب. كل مرة لعينة... الحلقة ترفض أن تغلق.'

    expect(estimateSyllables(arabicLine)).toBeGreaterThan(8)
    expect(isTruncatedTimedTranslation(englishLine, arabicLine, 'ar')).toBe(false)
    expect(isStoredTranslationTimedForShot(englishLine, arabicLine, 'ar', 10)).toBe(true)

    const bindings = bindingsFromReferenceRecords([
      {
        url: 'https://example.com/gideon.png',
        type: 'character',
        name: 'Gideon Croft',
        characterName: 'Gideon Croft',
      },
      {
        url: 'https://example.com/vault.png',
        type: 'style',
        name: 'FREIGHT TUNNEL VAULT',
        locationName: 'FREIGHT TUNNEL VAULT',
      },
      {
        url: 'https://example.com/chalk.png',
        type: 'object',
        name: 'Chalk',
        propName: 'Chalk',
      },
    ])

    const samplePrompt =
      'Char_GIDEON_CROFT speaks naturally: "التيار يتسرب. كل مرة لعينة. الحلقة ترفض أن تغلق.". 0s–2s (Start frame): Gideon Croft is framed chest-up on screen-right toward the formula \'RESONANCE FLUX = 0\'. 2s–8s (Action): Gideon lunges forward, dragging the Chalk across \'RESONANCE FLUX = 0\' as focus stays on Gideon\'s brow. Only these people are visible: Gideon Croft.'
    const rewritten = rewriteVisualNamesToTokens(samplePrompt, bindings)
    expect(rewritten).toContain('person [1] speaks naturally: "التيار يتسرب.')
    expect(rewritten).not.toContain('Char_GIDEON_CROFT')
    expect(rewritten).not.toContain('Gideon Croft')
    expect(rewritten).toContain('person [1] lunges forward')
    expect(rewritten).toContain("person [1]'s brow")
    expect(rewritten).toContain('Only these people are visible: person [1]')
  })
})
