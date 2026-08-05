import { describe, expect, it } from 'vitest'
import { safeParseJsonFromText } from '@/lib/safeJson'
import { repairTreatment } from '@/lib/treatment/validate'

/**
 * `beats` sits near the end of TREATMENT_SCHEMA_TEMPLATE, after the verbose
 * character_descriptions array. When the model hits its output token cap the
 * response is cut off before beats, and the Zod repair silently yields [].
 */
function truncatedTreatmentJson(): string {
  const character = {
    name: 'Dr. Arthur Pendelton',
    role: 'protagonist',
    subject: 'Dr. Arthur Pendelton',
    ethnicity: 'British',
    keyFeature: 'Disgraced archaeologist',
    hairStyle: 'Short, greying, unkempt',
    hairColor: 'Salt and pepper',
    eyeColor: 'Pale blue',
    expression: 'Haunted concentration',
    build: 'Lean, stooped from years of study',
    defaultWardrobe: 'Worn tweed jacket over a rumpled shirt',
    wardrobeAccessories: 'Brass pocket watch, cracked spectacles',
    description: 'An academic cast out for believing the impossible',
    externalGoal: 'Prove the anomaly is real',
    internalNeed: 'Reclaim his self-respect',
    fatalFlaw: 'Obsession blinds him to danger',
    arcStartingState: 'Isolated and bitter',
    arcShift: 'Discovery forces him to trust another',
    arcEndingState: 'Vindicated but changed',
  }

  const full = {
    character_focus: 'The episode follows Pendelton from disgrace to discovery.',
    key_decisions: [{ decision: 'Center Pendelton', why: 'Highest stakes', impact: 'Personal cost' }],
    story_strengths: 'A compelling hook with an active antagonist.',
    user_adjustments: 'Ask for more framing scenes to emphasise Croft.',
    title: 'The Mud Flood',
    logline: 'A disgraced archaeologist uncovers a buried city.',
    genre: 'Documentary Thriller',
    synopsis: 'Pendelton descends into the tunnels beneath the city.',
    setting: 'Victorian London, beneath the streets',
    protagonist: 'Dr. Arthur Pendelton',
    antagonist: 'The Consortium',
    character_descriptions: [character, { ...character, name: 'Vesper Thorne', role: 'supporting' }],
    scene_descriptions: [
      { name: 'The Tunnel', type: 'INT', location: 'Collapsed brick service tunnel', atmosphere: 'Lamplight, dripping water', furniture_props: 'Shoring timbers, survey equipment' },
    ],
    themes: ['Suppressed history', 'Obsession'],
    beats: [
      { title: 'The Summons', intent: 'Establish the mystery', synopsis: 'A letter arrives.', minutes: 2.5 },
      { title: 'The Descent', intent: 'Raise the stakes', synopsis: 'They enter the tunnel.', minutes: 4 },
    ],
    visual_style: 'Photorealistic, high contrast',
  }

  const complete = JSON.stringify(full, null, 2)
  // Cut the response inside scene_descriptions, i.e. before `beats` is emitted.
  const cutAt = complete.indexOf('"furniture_props"')
  return complete.slice(0, cutAt + 40)
}

describe('film treatment beats under output truncation', () => {
  it('parses a truncated response without throwing', () => {
    const parsed = safeParseJsonFromText(truncatedTreatmentJson())
    expect(parsed).toBeTruthy()
    expect((parsed as Record<string, unknown>).title).toBe('The Mud Flood')
  })

  it('REGRESSION: truncation silently produces zero beats', () => {
    const parsed = safeParseJsonFromText(truncatedTreatmentJson())
    const repaired = repairTreatment(parsed)

    // Truncation happened before `beats`, so nothing to salvage.
    expect(repaired.beats).toEqual([])
    // Everything the user does see survives, which is why this looks like
    // "beats are missing" rather than "generation failed".
    expect(repaired.title).toBe('The Mud Flood')
    expect(repaired.synopsis).toBeTruthy()
  })

  it('keeps beats when the response is complete', () => {
    const complete = safeParseJsonFromText(
      JSON.stringify({
        title: 'The Mud Flood',
        beats: [{ title: 'The Summons', intent: 'Establish', synopsis: 'A letter.', minutes: 2.5 }],
      })
    )
    expect(repairTreatment(complete).beats).toHaveLength(1)
  })
})
