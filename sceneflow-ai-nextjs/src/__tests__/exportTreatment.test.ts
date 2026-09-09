import { describe, expect, it } from 'vitest'
import {
  exportTreatmentToFountain,
  exportTreatmentToMarkdown,
  exportTreatmentToJSON,
  safeExportFilename,
} from '@/lib/blueprint/exportTreatment'

const SAMPLE = {
  title: 'The Faraday Protocol',
  logline: 'A historian uncovers suppressed energy.',
  synopsis: 'Gideon lives in exile until Piper forces his hand.',
  beats: [
    { title: 'Intro', minutes: 10.5, synopsis: 'Isolation shattered.' },
    { title: 'Module 1', minutes: 11, synopsis: 'Device activates.' },
  ],
  character_descriptions: [{ name: 'Gideon Croft', role: 'Protagonist', description: 'Architectural historian.' }],
}

describe('exportTreatment', () => {
  it('builds markdown with title and beats', () => {
    const md = exportTreatmentToMarkdown(SAMPLE)
    expect(md).toContain('# The Faraday Protocol')
    expect(md).toContain('## Story Beats')
    expect(md).toContain('Intro')
    expect(md).toContain('Gideon Croft')
  })

  it('builds fountain with title page and sections', () => {
    const fountain = exportTreatmentToFountain(SAMPLE)
    expect(fountain).toContain('Title: The Faraday Protocol')
    expect(fountain).toContain('LOGLINE')
    expect(fountain).toContain('STORY BEATS')
    expect(fountain).toContain('GIDEON CROFT')
  })

  it('serializes JSON backup', () => {
    const json = exportTreatmentToJSON(SAMPLE)
    const parsed = JSON.parse(json)
    expect(parsed.title).toBe('The Faraday Protocol')
    expect(parsed.beats).toHaveLength(2)
  })

  it('sanitizes export filenames', () => {
    expect(safeExportFilename('The Faraday Protocol!')).toBe('The_Faraday_Protocol_')
  })
})
