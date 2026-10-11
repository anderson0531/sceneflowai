import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import {
  getPipelineDemoHref,
  getPipelineDemoNextStage,
  matchPipelineDemoStage,
} from '@/config/landing/productionPipelineDemo'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

describe('Pipeline demo chrome', () => {
  it('walks the cinematic drama milestones and ignores unknown tokens', () => {
    expect(matchPipelineDemoStage('any-token')).toBeNull()
    expect(getPipelineDemoHref('series')).toBe('/s/series/cb7cc9e663a87a074e37c62636ef8c00')
    expect(getPipelineDemoHref('blueprint')).toBe(
      '/blueprint/share/5GDScu72NC7SWo1ioPMwzUxTg9KM2joz'
    )
    expect(getPipelineDemoNextStage('blueprint')).toBe('script-ar')
    expect(getPipelineDemoNextStage('screening-room')).toBeNull()
  })

  it('does not mount a second milestone menu on live review pages', () => {
    for (const relativePath of [
      'src/components/blueprint/BlueprintShareViewer.tsx',
      'src/components/vision/ScriptResonanceShareViewer.tsx',
      'src/app/share/screening-room/[shareToken]/page.tsx',
      'src/app/[slug]/SharedStoryboardSlugPage.tsx',
      'src/app/s/series/[token]/page.tsx',
      'src/components/landing/PipelinePlaceholderStage.tsx',
    ]) {
      expect(readSource(relativePath), relativePath).not.toContain('PipelineDemoChrome')
    }
  })
})
