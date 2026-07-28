import { readFileSync } from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import {
  PRODUCTION_SECTION_DESCRIPTIONS,
  PRODUCTION_SECTION_LABELS,
} from '@/constants/productionSections'
import { productNav } from '@/config/nav/globalNav'
import { productionWorkflowGroups } from '@/config/nav/workflowGuideConfig'
import { guidanceContent } from '@/components/vision/SceneWorkflowCoPilot'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

/**
 * Files whose user-facing copy names the two Production sections. "Script tab",
 * "Action tab", and "Shoot tab" are all names the UI no longer uses, so copy
 * that still sends users to them is a navigation dead end.
 */
const SECTION_COPY_SOURCES = [
  'src/components/vision/ScriptPanel.tsx',
  'src/components/vision/SceneWorkflowCoPilot.tsx',
  'src/components/vision/ProductionOnboarding.tsx',
  'src/components/vision/WorkflowNextStepBanner.tsx',
  'src/config/nav/workflowGuideConfig.ts',
  'src/lib/intelligence/SegmentValidation.ts',
  'src/config/landing/workflowPhaseCopy.ts',
  'src/config/landing/simpleWalkthroughCopy.ts',
  'src/config/landing/featureStoryboardCopy.ts',
]

const RETIRED_SECTION_NAMES = ['Script tab', 'Action tab', 'Shoot tab']

describe('Production section labels', () => {
  it("names the two sections Writer's Room and Motion", () => {
    expect(PRODUCTION_SECTION_LABELS.dialogueAction).toBe("Writer's Room")
    expect(PRODUCTION_SECTION_LABELS.callAction).toBe('Motion')
  })

  it('uses the straight apostrophe that marketing copy uses', () => {
    // A curly apostrophe (U+2019) would not match the landing page strings.
    expect(PRODUCTION_SECTION_LABELS.dialogueAction).toContain('\u0027')
    expect(PRODUCTION_SECTION_LABELS.dialogueAction).not.toContain('\u2019')
  })

  it('matches the canonical spelling used in landing copy', () => {
    const showcase = readSource('src/config/landing/productionShowcaseCopy.ts')
    expect(showcase).toContain(PRODUCTION_SECTION_LABELS.dialogueAction)
  })

  it('names the Intelligent Assistant Writer and Audience Resonance Analysis in the section description', () => {
    expect(PRODUCTION_SECTION_DESCRIPTIONS.dialogueAction).toContain('Intelligent Assistant Writer')
    expect(PRODUCTION_SECTION_DESCRIPTIONS.dialogueAction).toContain('Audience Resonance Analysis')
  })

  it('renders the segmented tab labels from the shared constants', () => {
    const panel = readSource('src/components/vision/ScriptPanel.tsx')

    expect(panel).toContain('PRODUCTION_SECTION_LABELS.dialogueAction')
    expect(panel).toContain('PRODUCTION_SECTION_LABELS.callAction')
    // Hardcoded labels would silently drift from the constants module.
    expect(panel).not.toContain("label: 'Script'")
    expect(panel).not.toContain("label: 'Motion'")
  })

  it.each(SECTION_COPY_SOURCES)('does not point users at a retired tab name in %s', (relativePath) => {
    const source = readSource(relativePath)
    for (const retired of RETIRED_SECTION_NAMES) {
      expect(source).not.toContain(retired)
    }
  })

  it('names the sections in the workflow guide and co-pilot guidance', () => {
    const foundation = productionWorkflowGroups.find((group) => group.id === 'foundation-script')
    expect(foundation?.title).toContain("Writer's Room")

    const motion = productionWorkflowGroups.find((group) => group.id === 'production-shoot')
    expect(motion?.title).toContain('Motion')

    expect(guidanceContent.dialogueAction.title).toContain("Writer's Room")
    expect(guidanceContent.callAction.title).toContain('Motion')
  })

  it("reserves Writer's Room for the Production section, not the Blueprint entry point", () => {
    // Two destinations sharing the name is what the rename set out to remove.
    for (const item of productNav) {
      expect(item.label).not.toContain("Writer's Room")
    }
    expect(productNav.map((item) => item.label)).toContain('Blueprint')

    for (const relativePath of [
      'src/components/layout/ProductSwitcher.tsx',
      'src/app/dashboard/components/QuickActionsGrid.tsx',
    ]) {
      const source = readSource(relativePath)
      expect(source).not.toContain('name: "Writer\'s Room"')
      expect(source).not.toContain('label: "Writer\'s Room"')
    }
  })
})
