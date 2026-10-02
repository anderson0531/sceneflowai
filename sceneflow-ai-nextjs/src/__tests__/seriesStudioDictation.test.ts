import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { STUDIO_DISPLAY_NAMES } from '@/constants/studioDisplayNames'

const ROOT = join(process.cwd())
const STUDIO_PAGE = join(ROOT, 'src/app/dashboard/series/[seriesId]/page.tsx')
const HUB_PAGE = join(ROOT, 'src/app/dashboard/series/page.tsx')

describe('Series Studio in-box dictation', () => {
  it('uses DictationTextarea for Generate, Reshape, and Direct this episode', () => {
    const source = readFileSync(STUDIO_PAGE, 'utf8')
    expect(source).toContain("import { DictationTextarea } from '@/components/ui/DictationTextarea'")
    expect(source).not.toContain("from '@/components/ui/textarea'")

    const generateStart = source.indexOf('Topic / Concept')
    const reshapeStart = source.indexOf('What would you like to change?')
    const directStart = source.indexOf('Direct this episode')

    expect(generateStart).toBeGreaterThan(-1)
    expect(reshapeStart).toBeGreaterThan(generateStart)
    expect(directStart).toBeGreaterThan(reshapeStart)

    expect(source.slice(generateStart, reshapeStart)).toContain('<DictationTextarea')
    expect(source.slice(reshapeStart, directStart)).toContain('<DictationTextarea')
    expect(source.slice(directStart)).toContain('<DictationTextarea')
    expect(source.slice(directStart)).toContain('min-w-0 flex-1')
  })

  it('uses DictationTextarea for Create New Series Topic / Concept', () => {
    const source = readFileSync(HUB_PAGE, 'utf8')
    expect(source).toContain("import { DictationTextarea } from '@/components/ui/DictationTextarea'")
    expect(source).not.toContain("from '@/components/ui/textarea'")
    expect(source).toContain('Topic / Concept')
    expect(source).toContain('<DictationTextarea')
  })
})

describe('Series Room naming', () => {
  it('renders Series Room on the library and series pages', () => {
    const hub = readFileSync(HUB_PAGE, 'utf8')
    const detail = readFileSync(STUDIO_PAGE, 'utf8')

    expect(STUDIO_DISPLAY_NAMES.series).toBe('Series Room')
    expect(hub).toContain('STUDIO_DISPLAY_NAMES.series')
    expect(detail).toContain('STUDIO_DISPLAY_NAMES.series')
    expect(hub).not.toContain('SERIES STUDIO')
    expect(detail).not.toContain('SERIES STUDIO')
    expect(hub).toContain('Lock the series bible, then produce each episode against it.')
  })
})
