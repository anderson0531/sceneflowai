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
import { ASSISTANT } from '@/lib/constants/assistant'

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

  it('names the Assistant and Audience Resonance Analysis in the section description', () => {
    expect(PRODUCTION_SECTION_DESCRIPTIONS.dialogueAction).toContain(ASSISTANT.full)
    expect(PRODUCTION_SECTION_DESCRIPTIONS.dialogueAction).toContain('Audience Resonance Analysis')
    // The old "Assistant Writer" name is retired in favour of one brand.
    expect(PRODUCTION_SECTION_DESCRIPTIONS.dialogueAction).not.toContain('Assistant Writer')
  })

  it('renders one continuous production strip', () => {
    const panel = readSource('src/components/vision/ScriptPanel.tsx')

    expect(panel).toContain('Pre-Vis')
    expect(panel).toContain('value="video"')
    expect(panel).toContain('value="mixer"')
    expect(panel).toContain('value="streams"')
    expect(panel).not.toContain('StoryboardReviewPanel')
    expect(panel).not.toContain("label: 'Script'")
    expect(panel).not.toContain("label: 'Motion'")
  })

  it.each(SECTION_COPY_SOURCES)('does not point users at a retired tab name in %s', (relativePath) => {
    const source = readSource(relativePath)
    for (const retired of RETIRED_SECTION_NAMES) {
      expect(source).not.toContain(retired)
    }
  })

  it('describes one production strip in the workflow guide and co-pilot', () => {
    const foundation = productionWorkflowGroups.find((group) => group.id === 'foundation-script')
    expect(foundation?.title).toContain('Direction')

    const motion = productionWorkflowGroups.find((group) => group.id === 'production-shoot')
    expect(motion?.title).toContain('Video')

    expect(guidanceContent.dialogueAction.title).toContain('Direction')
    expect(guidanceContent.callAction.title).toContain('Video')
  })

  it("reserves Writer's Room for the Production section, not the Blueprint entry point", () => {
    // Two destinations sharing the name is what the rename set out to remove.
    for (const item of productNav) {
      expect(item.label).not.toContain("Writer's Room")
    }
    expect(productNav.map((item) => item.label)).toContain('Blueprint Studio')

    for (const relativePath of [
      'src/components/layout/ProductSwitcher.tsx',
      'src/app/dashboard/components/QuickActionsGrid.tsx',
    ]) {
      const source = readSource(relativePath)
      expect(source).not.toContain('name: "Writer\'s Room"')
      expect(source).not.toContain('label: "Writer\'s Room"')
    }
  })

  it('build-info exposes the production section labels for deploy verification', () => {
    const route = readSource('src/app/api/build-info/route.ts')
    expect(route).toContain('PRODUCTION_SECTION_LABELS')
    expect(route).toContain('productionSections')
    expect(route).not.toContain('Your Direction')
    expect(route).not.toContain('Flow Direction')
  })
})
