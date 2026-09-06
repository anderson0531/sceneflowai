import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

const PAGE = join(process.cwd(), 'src/app/dashboard/series/[seriesId]/page.tsx')

describe('Series Studio hook order', () => {
  it('does not call hooks after the loading or not-found returns', () => {
    const source = readFileSync(PAGE, 'utf8')
    const start = source.indexOf('export default function SeriesStudioPage')
    const end = source.indexOf('\nfunction OverviewPanel')
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)

    const pageFn = source.slice(start, end)
    const loadingReturn = pageFn.indexOf('if (isLoading)')
    const notFoundReturn = pageFn.indexOf('if (!series)')
    const tabSyncEffect = pageFn.indexOf("searchParams?.get('tab')")

    expect(loadingReturn).toBeGreaterThan(-1)
    expect(notFoundReturn).toBeGreaterThan(-1)
    expect(tabSyncEffect).toBeGreaterThan(-1)
    expect(tabSyncEffect).toBeLessThan(loadingReturn)
    expect(tabSyncEffect).toBeLessThan(notFoundReturn)

    const afterEarlyReturns = pageFn.slice(loadingReturn)
    expect(afterEarlyReturns).not.toMatch(/\buseEffect\s*\(/)
    expect(afterEarlyReturns).not.toMatch(/\buseMemo\s*\(/)
    expect(afterEarlyReturns).not.toMatch(/\buseCallback\s*\(/)
    expect(afterEarlyReturns).not.toMatch(/\buseState\s*\(/)
  })
})
