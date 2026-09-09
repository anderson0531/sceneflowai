import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { getPipelineDemoScreeningHref } from '@/config/landing/productionPipelineDemo'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

describe('Shared Screening Room listen-only page', () => {
  it('does not enable audience feedback and no longer alerts on close', () => {
    const page = readSource('src/app/share/screening-room/[shareToken]/page.tsx')
    expect(page).toContain('enableAudienceFeedback={false}')
    expect(page).not.toContain("alert(")
    expect(page).toContain('searchParams.get(\'lang\')')
    expect(page).toContain('searchParams.get(\'playback\')')
    expect(page).toContain('PipelineDemoChrome')
  })

  it('points the landing pipeline walk at /share/screening-room, not a storyboard slug', () => {
    const config = readSource('src/config/landing/productionPipelineDemo.ts')
    expect(config).toContain('/share/screening-room/')
    expect(config).not.toContain('`/${encodeURIComponent(slug)}`')
    expect(getPipelineDemoScreeningHref()).toBeNull()
  })
})
