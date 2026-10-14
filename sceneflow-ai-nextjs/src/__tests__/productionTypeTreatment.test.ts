import { describe, expect, it } from 'vitest'
import { resolveBlueprintProductionFormat, resolveContentIntentFromMetadata } from '@/lib/content/contentIntent'
import { buildTreatmentPrompt } from '@/lib/treatment/prompts'
import { autoDetectFilmStructure } from '@/lib/treatment/filmStructure'

const coreConcept = {
  input_title: 'Harbor',
  input_synopsis: 'A look at the harbor.',
  core_themes: ['work'],
  narrative_structure: 'mini_doc',
}

describe('blueprint production type mapping', () => {
  it('maps series types onto the blueprint format for that engine', () => {
    expect(resolveBlueprintProductionFormat('cinematic_drama')).toBe('short_film')
    expect(resolveBlueprintProductionFormat('audio_drama')).toBe('short_film')
    expect(resolveBlueprintProductionFormat('true_crime')).toBe('documentary')
    expect(resolveBlueprintProductionFormat('documentary')).toBe('documentary')
    expect(resolveBlueprintProductionFormat('sports')).toBe('news')
    expect(resolveBlueprintProductionFormat('training')).toBe('training')
    expect(resolveBlueprintProductionFormat('explainer')).toBe('explainer')
    expect(resolveBlueprintProductionFormat('interview')).toBe('interview')
    expect(resolveBlueprintProductionFormat('demo')).toBe('product_demo')
    expect(resolveBlueprintProductionFormat('case_study')).toBe('case_study')
    expect(resolveBlueprintProductionFormat('advertisement')).toBe('advertisement')
    expect(resolveBlueprintProductionFormat('short_film')).toBe('short_film')
  })

  it('keeps a documentary selection informational when the inferred genre is drama', () => {
    expect(
      resolveContentIntentFromMetadata({
        format: 'documentary',
        genre: 'drama',
      })
    ).toBe('informational')
  })
})

describe('buildTreatmentPrompt production type', () => {
  it('tells documentary and true crime to narrate the subject instead of inventing a plot', () => {
    const documentary = buildTreatmentPrompt({
      input: 'Follow three urban beekeepers through one honey season.',
      coreConcept,
      format: 'documentary',
      targetMinutes: 30,
      context: { genre: 'drama' },
    })
    const trueCrime = buildTreatmentPrompt({
      input: 'Reconstruct the lighthouse keeper case from the files.',
      coreConcept,
      format: 'true_crime',
      targetMinutes: 30,
    })

    for (const prompt of [documentary, trueCrime]) {
      expect(prompt).toContain('INFORMATIONAL')
      expect(prompt).toContain('Do NOT invent fictional')
      expect(prompt).toContain('narrator or host')
      expect(prompt).toContain("creator's stated subject")
      expect(prompt).not.toContain('three-act arc, character tension, cinematic pacing')
    }
    expect(trueCrime).toContain('PRODUCTION TYPE: True Crime')
    expect(documentary).toContain('Do NOT invent a fatal flaw')
    expect(documentary).not.toContain('character transformation, personal stakes')
  })

  it('keeps cinematic drama on a fiction craft line', () => {
    const prompt = buildTreatmentPrompt({
      input: 'A family hides a debt that resurfaces at every funeral.',
      coreConcept: { ...coreConcept, narrative_structure: 'three_act' },
      format: 'cinematic_drama',
      targetMinutes: 45,
    })

    expect(prompt).toContain('PRODUCTION TYPE: Cinematic Drama')
    expect(prompt).toContain('Write a cinematic drama')
    expect(prompt).toContain('FICTION')
    expect(prompt).not.toContain('Do NOT invent fictional')
    expect(prompt).not.toContain('SCHEMA FIELD OVERRIDE (NON-FICTION)')
  })
})

describe('autoDetectFilmStructure', () => {
  it('does not turn a long true-crime piece into Save the Cat or a hero journey', () => {
    const detected = autoDetectFilmStructure(
      "A hero's journey through the case files, with a finale.",
      null,
      'true_crime',
      45,
      'informational'
    )
    expect(detected.structure).toBe('mini_doc')
  })

  it('keeps a long cinematic drama out of the documentary structure', () => {
    const detected = autoDetectFilmStructure(
      'A family hides a debt that resurfaces at every funeral.',
      null,
      'cinematic_drama',
      45,
      'fiction'
    )
    expect(detected.structure).not.toBe('mini_doc')
    expect(detected.structure).not.toBe('instructional')
  })
})
