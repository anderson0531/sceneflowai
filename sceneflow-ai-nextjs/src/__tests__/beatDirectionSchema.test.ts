import { describe, expect, it } from 'vitest'
import {
  normalizeBeatDirection,
  parseLlmBeats,
} from '@/lib/script/beatMigration'

describe('normalizeBeatDirection', () => {
  it('returns undefined for non-object input', () => {
    expect(normalizeBeatDirection(null)).toBeUndefined()
    expect(normalizeBeatDirection(undefined)).toBeUndefined()
    expect(normalizeBeatDirection('shot: wide')).toBeUndefined()
    expect(normalizeBeatDirection(42)).toBeUndefined()
  })

  it('returns undefined when no usable fields remain', () => {
    expect(normalizeBeatDirection({})).toBeUndefined()
    expect(
      normalizeBeatDirection({
        shotType: '   ',
        cameraAngle: '',
      })
    ).toBeUndefined()
  })

  it('keeps a director-authored frame prompt and video prompt', () => {
    const d = normalizeBeatDirection({
      shotType: 'Wide Shot',
      framePrompt: '  Frame of the vault.  ',
      videoPrompt: 'Dolly in on the engine. No spoken dialogue.',
    })
    expect(d?.framePrompt).toBe('Frame of the vault.')
    expect(d?.videoPrompt).toBe('Dolly in on the engine. No spoken dialogue.')
  })

  it('trims whitespace and drops empty strings', () => {
    const d = normalizeBeatDirection({
      shotType: '  Medium Wide  ',
      cameraAngle: '',
      blocking: 'Two subjects flank the console',
    })
    expect(d).toEqual({
      shotType: 'Medium Wide',
      blocking: 'Two subjects flank the console',
    })
  })

  it('coerces snake_case aliases to canonical field names', () => {
    const d = normalizeBeatDirection({
      camera_angle: 'low',
      camera_movement: 'handheld push-in',
      key_props: ['journal', 'core'],
      prop_interaction: 'holds journal in left hand',
      lighting_accent: 'teal underlight',
      frozen_moment: 'Elara stares into the pulse.',
      audio_cue: 'proximity timer chirps',
    })
    expect(d).toMatchObject({
      cameraAngle: 'low',
      cameraMovement: 'handheld push-in',
      keyProps: ['journal', 'core'],
      propInteraction: 'holds journal in left hand',
      lightingAccent: 'teal underlight',
      frozenMoment: 'Elara stares into the pulse.',
      audioCue: 'proximity timer chirps',
    })
  })

  it('coerces transition values to the enum', () => {
    expect(normalizeBeatDirection({ transition: 'cut' })).toEqual({
      transition: 'CUT',
    })
    expect(normalizeBeatDirection({ transition: 'match cut' })).toEqual({
      transition: 'MATCH_CUT',
    })
    expect(normalizeBeatDirection({ transition: 'match-cut' })).toEqual({
      transition: 'MATCH_CUT',
    })
    expect(normalizeBeatDirection({ transition: 'weird-unknown' })).toBeUndefined()
  })

  it('dedupes and cleans keyProps arrays', () => {
    const d = normalizeBeatDirection({
      keyProps: [' Journal ', 'Journal', '', 'Core', 'core'],
    })
    expect(d?.keyProps).toEqual(['Journal', 'Core'])
  })

  it('keeps an empty castInFrame, because nobody on camera is a statement', () => {
    // Every other list collapses to undefined when empty. This one cannot:
    // "no people in this frame" is the whole point of the field, and dropping
    // it would put the beat back on the prose heuristics it exists to replace.
    expect(normalizeBeatDirection({ castInFrame: [] })).toEqual({ castInFrame: [] })
    expect(normalizeBeatDirection({ castInFrame: ['  ', ''] })).toEqual({ castInFrame: [] })
    expect(normalizeBeatDirection({ keyProps: [] })).toBeUndefined()
  })

  it('dedupes castInFrame and accepts the snake_case alias', () => {
    expect(
      normalizeBeatDirection({ cast_in_frame: [' Piper Hayes ', 'piper hayes', 'Gideon Croft'] })
        ?.castInFrame
    ).toEqual(['Piper Hayes', 'Gideon Croft'])
  })

  it('leaves castInFrame absent when the beat never mentioned it', () => {
    expect(normalizeBeatDirection({ shotType: 'Wide Shot' })?.castInFrame).toBeUndefined()
  })

  it('parseLlmBeats attaches normalized beatDirection to each beat', () => {
    const beats = parseLlmBeats([
      {
        kind: 'action',
        actionDescription: 'Elara raises the journal.',
        beatDirection: {
          shotType: 'Medium Close-Up',
          cameraAngle: 'low angle',
          keyProps: ['Journal'],
          transition: 'CUT',
        },
      },
      {
        kind: 'dialogue',
        character: 'ELARA',
        line: 'Ready.',
        direction: { emotion: 'resolute', blocking: 'faces the console' },
      },
    ])

    expect(beats).toHaveLength(2)
    expect(beats[0].beatDirection).toMatchObject({
      shotType: 'Medium Close-Up',
      cameraAngle: 'low angle',
      keyProps: ['Journal'],
      transition: 'CUT',
      generatedBy: 'llm',
    })
    expect(beats[1].beatDirection).toMatchObject({
      emotion: 'resolute',
      blocking: 'faces the console',
      generatedBy: 'llm',
    })
  })

  it('parseLlmBeats leaves beatDirection undefined when LLM omits it', () => {
    const beats = parseLlmBeats([
      { kind: 'action', actionDescription: 'A silent hallway.' },
    ])
    expect(beats[0].beatDirection).toBeUndefined()
  })

  it('strips spoken delivery clauses from Still and Start Frame and prunes unreferenced cast from castInFrame', () => {
    const d = normalizeBeatDirection({
      shotType: 'Medium Shot',
      cameraAngle: 'low angle',
      cameraMovement: 'slow push-in',
      transition: 'CUT',
      castInFrame: ['Piper Hayes', 'Gideon Croft', 'Julian Ward'],
      frozenMoment:
        'Piper Hayes is settled on her right knee on wet subterranean flagstones at screen-left, her spine planted against a dark riveted steel column, holding Clara\'s Atmospheric Induction Coil steady at chest height toward screen-right with her right fingers gripping its rectangular brass chassis; her left hand clenches her damp coat lapel, her jaw is tight, and her lips are parted delivering the line: "Clara entrusted this to Father Sullivan at St. Jude\'s three hours before Ward\'s contractors cut her brake lines. Look at the alignment seal, Gideon."',
      startFrame:
        'Piper Hayes is settled on her right knee on wet subterranean flagstones at screen-left, her spine planted against a dark riveted steel column, holding Clara\'s Atmospheric Induction Coil steady at chest height toward screen-right. Her left hand clenches the damp wool lapel of her dark coat against her chest, her lips are parted delivering "Clara entrusted this to Father Sullivan at St. Jude\'s three hours before Ward\'s contractors cut her brake lines. Look at the alignment seal, Gideon.", and her fierce gaze is angled toward upper screen-right off-camera.',
      clipAction:
        'Piper Hayes pushes her right arm further forward into the raking amber lantern beam, tilting the rectangular brass chassis of Clara\'s Atmospheric Induction Coil upward to display its hand-tooled alignment notch and exposed twin copper windings. The camera executes a slow low-angle push-in toward her face as her speech hardens into accusation, her chest heaving with sharp breaths while dense plumes of pale condensation billow into the cold tunnel air.',
      blocking:
        'Piper Hayes is on her right knee on the wet subterranean flagstones at screen-left, her left foot planted flat bearing her forward weight, with her shoulder blades seated firmly against the riveted steel column. Her right arm is extended horizontally forward at chest height presenting the coil toward screen-right, while her left hand remains clenched on her damp coat lapel.',
      emotion:
        'Piper Hayes: brow contracted into sharp vertical furrows, lower eyelids narrowed with cutting intensity, jaw clenched tight between spoken syllables, neck tendons taut, and chest heaving with controlled, furious breaths.',
      endFrame:
        'Piper Hayes holds Clara\'s Atmospheric Induction Coil locked at forward chest height near screen-center, its exposed twin copper windings and hand-tooled alignment notch catching the raking amber lantern light. Her jaw is set in a rigid line, eyes burning toward upper screen-right off-camera, as curling plumes of exhaled breath drift past her cheek in the closer framing.',
      gaze:
        'Piper Hayes directs her fierce gaze toward upper screen-right, angled slightly off-camera toward an unseen listener outside the frame.',
      lightingAccent: 'Specular reflections on dual copper wire coils and paraffin casing.',
      propInteraction:
        'Piper Hayes\'s bare right fingers grip the lower edge of the rectangular brass chassis of Clara\'s Atmospheric Induction Coil, angling its dual copper wire windings and hand-tooled alignment notch upward into the raking amber lantern beam.',
      keyProps: ["Clara's Atmospheric Induction Coil"],
    })

    expect(d?.castInFrame).toEqual(['Piper Hayes'])
    expect(d?.frozenMoment).not.toContain('delivering the line:')
    expect(d?.frozenMoment).not.toContain('Ward\'s contractors')
    expect(d?.frozenMoment).toMatch(/her jaw is tight, and her lips are parted\.$/)
    expect(d?.startFrame).not.toContain('delivering "')
    expect(d?.startFrame).toContain(
      'her lips are parted, and her fierce gaze is angled toward upper screen-right off-camera.'
    )
  })
})
