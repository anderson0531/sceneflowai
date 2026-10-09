import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

describe('Script Director removal', () => {
  it('keeps Audience Analysis focused on analysis and recommendations', () => {
    const modal = readSource('src/components/vision/ScriptReviewModal.tsx')
    expect(modal).toContain('Audience Analysis')
    expect(modal).toContain('Script Analysis and Recommendations')
    expect(modal).not.toContain('Insights & Direction')
    expect(modal).not.toContain('You Direct')
    expect(modal).not.toContain("value=\"cinematic\"")
    expect(modal).not.toContain('onScriptOptimized')
    expect(modal).not.toContain('OptimizeSceneDialog')
  })

  it('does not offer a whole-script rewrite from Production Studio', () => {
    const panel = readSource('src/components/vision/ScriptPanel.tsx')
    const page = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    const banner = readSource('src/components/vision/WorkflowNextStepBanner.tsx')
    expect(panel).not.toContain("tStudio('directScript')")
    expect(panel).not.toContain('DirectScriptDialog')
    expect(panel).toContain("tStudio('audienceResonance')")
    expect(page).not.toContain('optimize-script')
    expect(page).not.toContain('handleScriptOptimized')
    expect(banner).toContain('Scene Director')
    expect(banner).toContain('revise the blueprint and regenerate the script')
    expect(banner).not.toContain('Script Director')
  })
})
