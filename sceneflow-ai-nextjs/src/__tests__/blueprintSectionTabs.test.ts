import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  BLUEPRINT_ACTIVATE_SECTION_EVENT,
  blueprintCategoryToSection,
} from '@/lib/blueprint/blueprintProgress'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

const CARD = 'src/components/blueprint/TreatmentCard.tsx'
const SECTIONS = ['core', 'story', 'tone', 'beats', 'characters'] as const

describe('Blueprint section tabs', () => {
  const card = readSource(CARD)

  it('renders one tab per blueprint section', () => {
    for (const section of SECTIONS) {
      expect(card).toContain(`<TabsContent value="${section}"`)
      expect(card).toContain(`data-blueprint-section="${section}"`)
    }
  })

  it('keeps a scoped Assistant trigger in every section', () => {
    for (const section of SECTIONS) {
      expect(card).toContain(`openGuidedForSection('${section}')`)
    }
    expect(card.match(/<AssistantButton/g)?.length).toBe(6)
  })

  it('drives the tab list from the shared section config', () => {
    expect(card).toContain('SECTION_TABS.map')
    // Hardcoded triggers would drift from the section ids.
    expect(card).not.toContain('<TabsTrigger value="core"')
  })

  it('gives Characters an empty state instead of omitting the section', () => {
    expect(card).toContain('characterCount === 0')
    expect(card).toContain('No characters yet')
  })

  it('shows counts on the Beats and Characters tabs', () => {
    expect(card).toContain('formatBeatsTabLabel')
    expect(card).toContain('characterCount > 0')
  })

  it('switches tab when the Assistant is opened for a section', () => {
    expect(card).toContain('setActiveSection(scope)')
  })
})

describe('Section jumps reach tabbed content', () => {
  const progress = readSource('src/lib/blueprint/blueprintProgress.ts')
  const card = readSource(CARD)

  it('exports the activation event name', () => {
    expect(BLUEPRINT_ACTIVATE_SECTION_EVENT).toBe('blueprint:activate-section')
  })

  it('REGRESSION: asks for the tab before querying the DOM', () => {
    // Radix unmounts inactive panels, so a plain querySelector finds nothing for
    // a section in a hidden tab.
    const dispatchAt = progress.indexOf(`new CustomEvent(BLUEPRINT_ACTIVATE_SECTION_EVENT`)
    const queryAt = progress.indexOf('document.querySelector')
    expect(dispatchAt).toBeGreaterThan(-1)
    expect(dispatchAt).toBeLessThan(queryAt)
  })

  it('retries after a frame so a newly mounted panel is found', () => {
    expect(progress).toContain('requestAnimationFrame')
  })

  it('the card listens for the activation event', () => {
    expect(card).toContain('BLUEPRINT_ACTIVATE_SECTION_EVENT')
    expect(card).toContain('setActiveSection(section as BlueprintFixSection)')
  })

  it('every Audience Resonance category maps to a real tab', () => {
    for (const category of [
      'Audience Appeal',
      'Genre & Tone Fit',
      'Concept Hook',
      'Character Connection',
      'Clarity & Structure',
    ]) {
      expect(SECTIONS).toContain(blueprintCategoryToSection(category) as (typeof SECTIONS)[number])
    }
  })
})

describe('Created by row', () => {
  const card = readSource(CARD)

  it('stays visible so a missing name is noticeable', () => {
    expect(card).toContain('hideWhenEmpty={false}')
  })

  it('offers a way to fix a missing name', () => {
    expect(card).toContain('Add your name')
    expect(card).toContain('/dashboard/settings/profile')
  })
})

describe('Reasoning panel', () => {
  const panel = readSource('src/components/blueprint/SidePanelTabs.tsx')
  const card = readSource(CARD)

  it('adds a Reasoning tab beside Resonance and Collaborate', () => {
    expect(panel).toContain("'reasoning'")
    expect(panel).toContain('<span>Reasoning</span>')
    expect(panel).toContain('NarrativeReasoningPanel')
    expect(readSource('src/components/blueprint/NarrativeReasoningPanel.tsx')).toContain(
      'BlueprintNarrationSection'
    )
  })

  it('can be focused by signal, like the other tabs', () => {
    expect(panel).toContain('foundationTabSignal')
  })

  it('REGRESSION: the card no longer renders reasoning or logs while rendering', () => {
    expect(card).not.toContain('showReasoning')
    expect(card).not.toContain("console.log('[TreatmentCard]")
  })

  it('REGRESSION: the card toolbar no longer duplicates the production hand-off button', () => {
    expect(card).not.toContain('BLUEPRINT_COPY.startProduction')
  })

  it('keeps the reasoning reachable from the card', () => {
    expect(card).toContain('onOpenFoundation')
    expect(card).toContain('Why these choices?')
  })

  it('shows narration generation progress in the toolbar', () => {
    expect(card).toContain('generationProgress')
  })
})
