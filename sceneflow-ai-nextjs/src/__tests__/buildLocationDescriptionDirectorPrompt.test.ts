import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import {
  buildLocationDescriptionDirectorPrompt,
  parseLocationDescriptionDirectorResponse,
} from '@/lib/vision/buildLocationDescriptionDirectorPrompt'

describe('buildLocationDescriptionDirectorPrompt', () => {
  const base = {
    locationName: 'Harbor Office',
    intExt: 'INT',
    timeOfDay: 'NIGHT',
    genre: 'thriller',
    setting: 'coastal city',
    currentDescription: 'A cramped brick office with a square window and cold fluorescent light.',
    scenes: [
      {
        sceneNumber: 2,
        heading: 'INT. HARBOR OFFICE - NIGHT',
        action: 'Rain ticks the brick and the desk lamp is the only warm light.',
        location: 'harbor office',
        atmosphere: 'damp, close',
      },
    ],
  }

  it('lets director notes replace conflicting place details and stays visual', () => {
    const prompt = buildLocationDescriptionDirectorPrompt({
      ...base,
      directorNotes: 'Warm tungsten practicals, drop the fluorescent light, keep the brick',
    })

    expect(prompt).toContain('"description"')
    expect(prompt).toContain("DIRECTOR'S NOTES")
    expect(prompt).toContain('Warm tungsten practicals')
    expect(prompt).toContain('CURRENT DESCRIPTION')
    expect(prompt).toContain('cold fluorescent light')
    expect(prompt).toContain('INT. HARBOR OFFICE - NIGHT')
    expect(prompt).toContain('Rain ticks the brick')
    expect(prompt).toContain("Director's notes outrank")
    expect(prompt).toContain('Do not describe plot or performance')
    expect(prompt).toContain('Do not invent a new setting')
    expect(prompt).not.toContain("DIRECTOR'S NOTES:\n\"\"")
  })

  it('recommend mode uses the scene excerpt and omits director notes', () => {
    const prompt = buildLocationDescriptionDirectorPrompt({
      ...base,
      recommendMode: true,
    })

    expect(prompt).toContain('Recommend a specific visual description')
    expect(prompt).toContain('Rain ticks the brick')
    expect(prompt).toContain('"description"')
    expect(prompt).not.toContain("DIRECTOR'S NOTES")
    expect(prompt).not.toContain("Director's notes outrank")
    expect(prompt).toContain('Do not describe plot or performance')
  })
})

describe('parseLocationDescriptionDirectorResponse', () => {
  it('parses description from fenced JSON', () => {
    const parsed = parseLocationDescriptionDirectorResponse(`
\`\`\`json
{
  "description": "A cramped brick harbor office at night, lit by a warm desk lamp."
}
\`\`\`
`)
    expect(parsed.description).toContain('warm desk lamp')
  })
})

describe('location description editor source', () => {
  it('uses dictation and awaits the description save', () => {
    const src = readFileSync(
      path.join(process.cwd(), 'src/components/vision/LocationLibrary.tsx'),
      'utf8'
    )
    expect(src).toContain('DictationTextarea')
    expect(src).toContain('handleDirectDescription')
    expect(src).toContain('/api/vision/generate-location-description')
    expect(src).toContain('await onUpdateLocations(updated)')
    expect(src).toContain('Recommend')
  })
})
