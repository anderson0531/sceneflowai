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
  it('stays hidden when landing tokens are empty', () => {
    expect(matchPipelineDemoStage('any-token')).toBeNull()
    expect(getPipelineDemoHref('blueprint')).toBeNull()
    expect(getPipelineDemoNextStage('blueprint')).toBe('script-ar')
    expect(getPipelineDemoNextStage('screening-room')).toBeNull()
  })

  it('is mounted on all three listen-only surfaces', () => {
    expect(readSource('src/components/blueprint/BlueprintShareViewer.tsx')).toContain(
      'PipelineDemoChrome'
    )
    expect(readSource('src/components/vision/ScriptResonanceShareViewer.tsx')).toContain(
      'PipelineDemoChrome'
    )
    expect(readSource('src/app/share/screening-room/[shareToken]/page.tsx')).toContain(
      'PipelineDemoChrome'
    )
  })
})
