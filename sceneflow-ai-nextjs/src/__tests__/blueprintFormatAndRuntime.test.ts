import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  compactBlueprintRuntimeDisplay,
  formatBeatsTabLabel,
  formatBlueprintRuntime,
  resolveBlueprintFormatLabel,
  summariseBeatsRuntime,
} from '@/lib/blueprint/formatBlueprintCore'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

/** The reported sheet: 3+4+4+3+5+5+5+5+4+2 = 40 minutes. */
const fortyMinuteBeats = [3, 4, 4, 3, 5, 5, 5, 5, 4, 2].map((minutes, i) => ({
  title: `Beat ${i + 1}`,
  synopsis: 'x',
  minutes,
}))

describe('summariseBeatsRuntime', () => {
  it('REGRESSION: reports the reported sheet as 40 min, not the original 10', () => {
    const summary = summariseBeatsRuntime(fortyMinuteBeats)
    expect(summary.minutes).toBe(40)
    expect(summary.count).toBe(10)
    expect(summary.display).toBe('40 min')
  })

  it('humanises sub-minute and fractional totals', () => {
    expect(summariseBeatsRuntime([{ minutes: 1.5 }]).display).toBe('1 min 30 sec')
    expect(summariseBeatsRuntime([{ minutes: 0.5 }]).display).toBe('30 sec')
  })

  it('reports nothing to display when there is no runtime', () => {
    expect(summariseBeatsRuntime([])).toEqual({ minutes: 0, count: 0, display: '' })
    expect(summariseBeatsRuntime(undefined)).toEqual({ minutes: 0, count: 0, display: '' })
    expect(summariseBeatsRuntime([{ title: 'no minutes' }]).display).toBe('')
  })

  it('ignores unparseable beat minutes rather than producing NaN', () => {
    const summary = summariseBeatsRuntime([{ minutes: 'abc' }, { minutes: 4 }])
    expect(summary.minutes).toBe(4)
  })
})

describe('formatBeatsTabLabel', () => {
  it('shows count and compact runtime on the Beats tab', () => {
    const summary = summariseBeatsRuntime(fortyMinuteBeats)
    expect(formatBeatsTabLabel(summary.count, summary.minutes, summary.display)).toBe(
      'Beats (10 - 40m)'
    )
  })

  it('falls back to count only when runtime is missing', () => {
    expect(formatBeatsTabLabel(3, 0, '')).toBe('Beats (3)')
    expect(formatBeatsTabLabel(0, 0, '')).toBe('Beats')
  })
})

describe('compactBlueprintRuntimeDisplay', () => {
  it('compresses common runtime strings for tab labels', () => {
    expect(compactBlueprintRuntimeDisplay('40 min')).toBe('40m')
    expect(compactBlueprintRuntimeDisplay('90 sec')).toBe('90s')
    expect(compactBlueprintRuntimeDisplay('1 min 30 sec')).toBe('1m 30s')
  })
})

describe('resolveBlueprintFormatLabel', () => {
  it('prefers the format stored on the variant', () => {
    expect(resolveBlueprintFormatLabel({ format: 'podcast' })).toBe('podcast episode')
    expect(resolveBlueprintFormatLabel({ format: 'education' })).toBe('educational content')
  })

  it('falls back to the project format for blueprints created before it was stored', () => {
    expect(resolveBlueprintFormatLabel({ genre: 'thriller' }, 'documentary')).toBe('documentary')
  })

  it('derives from genre as a last resort', () => {
    const label = resolveBlueprintFormatLabel({ genre: 'drama' })
    expect(label).toBeTruthy()
    expect(label).not.toMatch(/\d/)
  })

  it('never returns a duration', () => {
    for (const input of [
      { format: 'podcast' },
      { genre: 'documentary' },
      { format: 'training', genre: 'education' },
    ]) {
      expect(resolveBlueprintFormatLabel(input)).not.toMatch(/\d/)
      expect(resolveBlueprintFormatLabel(input)).not.toContain('min')
    }
  })

  it('reports nothing when there is nothing to describe', () => {
    expect(resolveBlueprintFormatLabel(null)).toBe('')
    expect(resolveBlueprintFormatLabel({})).toBe('')
  })

  it('is not confused by format_length, which holds a runtime', () => {
    // The old chip rendered this field, which is why Format showed "10 min".
    expect(resolveBlueprintFormatLabel({ format_length: '600 seconds' })).toBe('')
  })
})

describe('Studio wiring', () => {
  const card = readSource('src/components/blueprint/TreatmentCard.tsx')

  it('REGRESSION: the Format chip no longer renders a runtime', () => {
    expect(card).not.toContain('formatBlueprintRuntime')
    expect(card).toContain('resolveBlueprintFormatLabel')
    expect(card).toContain('productionFormatLabel')
  })

  it('shows the runtime in the Beats panel instead', () => {
    expect(card).toContain('summariseBeatsRuntime')
    expect(card).toContain('beatsRuntime.display')
    expect(card).toContain('total')
  })

  it('takes the project format as a fallback source', () => {
    expect(card).toContain('projectFormat')
    expect(readSource('src/app/dashboard/studio/[projectId]/StudioPageClient.tsx')).toContain(
      'projectFormat={currentProject?.metadata?.format'
    )
  })

  it('persists the production format at generation', () => {
    const route = readSource('src/app/api/ideation/film-treatment/route.ts')
    expect(route).toContain("format: context?.format || 'short_film',")
  })
})

describe('format_length stays a duration for its existing consumers', () => {
  it('still humanises a stored runtime string', () => {
    // projects/from-variant and the readiness gate read it as seconds.
    expect(formatBlueprintRuntime('2400 seconds').display).toBe('40 min')
  })
})
