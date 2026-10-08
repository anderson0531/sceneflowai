import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

describe('Continuity Library dialog', () => {
  it('titles the dialog Continuity Library in bold and drops the direction banner', () => {
    const en = JSON.parse(readSource('messages/app/en/production.json')) as {
      studio: { referenceTooltip: string }
      foundation: { referenceLibrary: { title: string; nextAction: Record<string, string> } }
      libraryAgent: { tooltip: string; confirm: string }
    }
    expect(en.foundation.referenceLibrary.title).toBe('Continuity Library')
    expect(en.studio.referenceTooltip).toBe(
      'Open Continuity Library — cast, looks, locations, and props'
    )
    expect(en.foundation.referenceLibrary.nextAction.runLibraryAgent).toBe('Library Agent')
    expect(en.libraryAgent.tooltip).toBe('Choose cast, location, and prop stills to draw.')
    expect(en.libraryAgent.confirm).toBe('Library Agent ({count})')

    const sidebar = readSource('src/components/vision/VisionReferencesSidebar.tsx')
    expect(sidebar).toContain('font-bold')
    expect(sidebar).toContain("tLibrary('title')")
    expect(sidebar).toContain("tLibraryAgent('tooltip')")
    expect(sidebar).toContain('LibraryAgentConfirmDialog')
    expect(sidebar).not.toContain('Production Readiness')
    expect(sidebar).not.toContain('from-indigo-500')

    const page = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    expect(page).not.toContain('DirectionReadinessBanner')
    expect(page).toContain('onMergeDuplicateCast')

    const script = readSource('src/components/vision/ScriptPanel.tsx')
    expect(script).not.toContain('referenceNeedsDirection')

    const start = readSource('src/app/api/vision/references/express/start/route.ts')
    expect(start).toContain('planSelectedLibraryBaseItems')
    expect(start).toContain('selectedLibraryBases')
  })

  it('keeps wardrobe status as text on an amber tab instead of a tab badge', () => {
    const library = readSource('src/components/vision/CharacterLibrary.tsx')
    expect(library).toContain('stillStatusLine')
    expect(library).toContain('formatReferenceActionCue')
    expect(library).toContain('bg-amber-400/30')
    expect(library).not.toContain('Enhance with AI')
    expect(library).not.toContain('title="Enhance with AI"')
    const wardrobeTrigger = library.slice(
      library.indexOf('value="wardrobe"'),
      library.indexOf('value="wardrobe"') + 900
    )
    expect(wardrobeTrigger).not.toContain('ReferenceActionCue')
  })
})
