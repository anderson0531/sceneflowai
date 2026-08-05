import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  ASSISTANT,
  ASSISTANT_FULL_WITH_ABBR,
  assistantAriaLabel,
  assistantTitle,
} from '@/lib/constants/assistant'
import { ASSISTANT_ICON } from '@/lib/constants/assistantIcon'
import { FEATURE_ICONS } from '@/components/landing/keyFeatureIcons'
import { BLUEPRINT_COPY, BLUEPRINT_GLOSSARY } from '@/lib/blueprint/blueprintGlossary'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

/**
 * Every surface that opens the assisted-edit dialog. Each of these used to carry
 * its own wording, so a hardcoded label here means the rename has drifted.
 */
const TRIGGER_SOURCES = [
  'src/components/blueprint/TreatmentCard.tsx',
  'src/components/blueprint/AudienceResonancePanel.tsx',
  'src/components/blueprint/AudienceResonancePanelV3.tsx',
  'src/components/blueprint/SidePanelTabs.tsx',
  'src/components/blueprint/BlueprintOnboarding.tsx',
  'src/components/vision/ScriptPanel.tsx',
  'src/config/nav/sidebarConfig.ts',
  'src/config/nav/proTipsConfig.ts',
]

/** Wording these surfaces used before the feature had one name. */
const RETIRED_LABELS = [
  "'Edit Blueprint'",
  '>Edit Blueprint<',
  'Open guided editor',
  'Open guided revision',
  'Improve in editor',
  'Intelligent Assistant Writer',
]

describe('Assistant naming', () => {
  it('keeps the marketing name and a short in-app label', () => {
    expect(ASSISTANT.full).toBe('Intelligent Assistant Director')
    expect(ASSISTANT.abbr).toBe('IAD')
    expect(ASSISTANT.short).toBe('Assistant')
    expect(ASSISTANT_FULL_WITH_ABBR).toBe('Intelligent Assistant Director (IAD)')
  })

  it('keeps the button label short enough for a chip', () => {
    expect(ASSISTANT.short.length).toBeLessThanOrEqual(12)
  })

  it('states the full name in the tooltip so the brand stays discoverable', () => {
    expect(ASSISTANT.tooltip).toContain(ASSISTANT.full)
  })

  it('builds dialog titles and accessible names from the short label', () => {
    expect(assistantTitle('Blueprint')).toBe('Assistant · Blueprint')
    expect(assistantTitle('Scene 3')).toBe('Assistant · Scene 3')
    expect(assistantAriaLabel('Beats & Runtime')).toBe('Assistant — Beats & Runtime')
    expect(assistantAriaLabel()).toBe('Assistant')
  })

  it('routes the Blueprint edit label through the shared constant', () => {
    expect(BLUEPRINT_COPY.editBlueprint).toBe(ASSISTANT.short)
    expect(BLUEPRINT_GLOSSARY.editBlueprint.term).toBe(ASSISTANT.short)
    // A full regen is a different action and must keep its own name.
    expect(BLUEPRINT_COPY.reimagine).toBe('Regenerate Blueprint')
  })

  it('uses the same icon in-app and on the landing feature card', () => {
    expect(FEATURE_ICONS.iad).toBe(ASSISTANT_ICON)
  })

  it('does not reuse the Assistant icon for another landing feature', () => {
    const collisions = Object.entries(FEATURE_ICONS).filter(
      ([key, icon]) => key !== 'iad' && icon === ASSISTANT_ICON
    )
    expect(collisions).toEqual([])
  })

  it.each(TRIGGER_SOURCES)('has no retired edit wording in %s', (relativePath) => {
    const source = readSource(relativePath)
    for (const retired of RETIRED_LABELS) {
      expect(source).not.toContain(retired)
    }
  })

  it('renders the Blueprint section triggers from the shared AssistantButton', () => {
    const card = readSource('src/components/blueprint/TreatmentCard.tsx')
    for (const scope of ['core', 'story', 'tone', 'beats', 'characters']) {
      expect(card).toContain(`openGuidedForSection('${scope}')`)
    }
    // Five section triggers plus the toolbar one.
    expect(card.match(/<AssistantButton/g)?.length).toBe(6)
    // The unlabelled pencil is what made the feature invisible.
    expect(card).not.toContain('PencilLine')
  })

  it('labels the Assistant button with text, not an icon alone', () => {
    const button = readSource('src/components/blueprint/AssistantButton.tsx')
    expect(button).toContain('ASSISTANT.short')
    expect(button).toContain('ASSISTANT.tooltip')
    expect(button).toContain('aria-label')
  })

  it('titles both dialogs from the shared helper', () => {
    expect(readSource('src/components/blueprint/BlueprintRefineDialog.tsx')).toContain(
      "assistantTitle('Blueprint')"
    )
    expect(readSource('src/components/vision/SceneEditorModalV2.tsx')).toContain('assistantTitle(')
  })

  it('keeps the marketing string in the English messages catalogue', () => {
    const messages = readSource('messages/en.json')
    expect(messages).toContain(ASSISTANT_FULL_WITH_ABBR)
  })

  it('keeps the label module free of the icon library so API routes stay light', () => {
    // productionSections imports these labels and is read by /api/build-info.
    expect(readSource('src/lib/constants/assistant.ts')).not.toContain('lucide-react')
  })
})
