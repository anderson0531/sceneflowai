import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

describe('Reference Library next-action CTA wiring', () => {
  it('kind libraries consume pendingKindAgentRun via the shared hook', () => {
    const hook = readSource('src/components/vision/usePendingKindAgentRun.ts')
    expect(hook).toContain('pendingKindAgentRun !== kind')
    expect(hook).toContain('onConsumedRef.current')

    for (const file of [
      'src/components/vision/LocationLibrary.tsx',
      'src/components/vision/CharacterLibrary.tsx',
      'src/components/vision/ObjectSuggestionPanel.tsx',
    ]) {
      const source = readSource(file)
      expect(source).toContain('usePendingKindAgentRun')
      expect(source).toContain('pendingKindAgentRun')
      expect(source).toContain('onPendingKindAgentRunConsumed')
    }

    expect(readSource('src/components/vision/LocationLibrary.tsx')).toContain('handleLocationAgent')
    expect(readSource('src/components/vision/CharacterLibrary.tsx')).toContain('handleCastAgent')
    expect(readSource('src/components/vision/ObjectSuggestionPanel.tsx')).toContain('handleObjectAgent')
  })

  it('sidebar banner sets pendingKindAgentRun and tab attention', () => {
    const sidebar = readSource('src/components/vision/VisionReferencesSidebar.tsx')
    expect(sidebar).toContain('ReferenceLibraryNextActionBanner')
    expect(sidebar).toContain('setPendingKindAgentRun')
    expect(sidebar).toContain('pendingKindAgentRunForAction')
    expect(sidebar).toContain('firstLibraryTabWithRequiredWork')
    expect(sidebar).toContain('libraryRequiredActions.tabAttention')

    const tabs = readSource('src/components/product/ProductTabList.tsx')
    expect(tabs).toContain("attention?: ProductTabAttention")
    expect(tabs).toContain('data-attention={attention}')
    expect(tabs).toContain("missing: 'bg-red-500'")
    expect(tabs).toContain("stale: 'bg-amber-400'")
    expect(tabs).toContain("ready: 'bg-emerald-500'")
  })

  it('kind toolbars promote a remaining count into a filled Run CTA', () => {
    const toolbar = readSource('src/components/vision/LibraryKindToolbar.tsx')
    expect(toolbar).toContain('agentHasWork')
    expect(toolbar).toContain('bg-amber-500')

    expect(readSource('src/components/vision/LocationLibrary.tsx')).toContain(
      'runLocationAgentNeeded'
    )
    expect(readSource('src/components/vision/CharacterLibrary.tsx')).toContain(
      'kindAgentToolbarLabel'
    )
    expect(readSource('src/components/vision/ObjectSuggestionPanel.tsx')).toContain(
      'kindAgentToolbarLabel'
    )
  })

  it('missing-refs toast names Library Agent', () => {
    const page = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    expect(page).toContain(
      'Opening the Reference Library — use Library Agent to draw the missing references.'
    )
    expect(page).not.toContain('use Generate to draw the missing references')
  })
})
