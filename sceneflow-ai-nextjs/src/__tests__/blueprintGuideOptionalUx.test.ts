import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { blueprintWorkflowGroups } from '@/config/nav/workflowGuideConfig'

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

describe('Blueprint Guide intention categories', () => {
  it('groups optional actions by intention, not a linear mandatory workflow', () => {
    expect(blueprintWorkflowGroups.map((g) => g.id)).toEqual([
      'create-blueprint',
      'review-blueprint',
      'optimize-blueprint',
      'enhance-experience',
      'continue',
    ])
  })

  it('keeps stable step ids so studio events and progress maps still resolve', () => {
    const ids = blueprintWorkflowGroups.flatMap((g) => g.steps.map((s) => s.id))
    expect(ids).toEqual([
      'enter-idea',
      'generate-blueprint',
      'review-sections',
      'collaborate-export',
      'run-resonance',
      'apply-fixes',
      'regenerate-hero',
      'preview-audio',
      'start-production',
    ])
  })
})

describe('Blueprint Guide is optional chrome, not a progress checklist', () => {
  const panel = readSource('src/components/workflow/WorkflowGuidePanel.tsx')

  it('does not render overall progress or completion counts', () => {
    expect(panel).not.toContain('Overall Progress')
    expect(panel).not.toContain('progressPercent')
    expect(panel).not.toContain('Workflow complete')
    expect(panel).not.toContain('getCompletedSteps')
    expect(panel).not.toContain('getTotalSteps')
  })

  it('does not use checklist checkboxes or strike-through done styling', () => {
    expect(panel).not.toContain('onToggleComplete')
    expect(panel).not.toContain('line-through')
    expect(panel).not.toContain('CheckCircle2')
  })

  it('falls back to English labels when a catalog key is missing', () => {
    expect(panel).toContain('t.has(')
    expect(panel).toContain('guideLabel')
  })
})

describe('sidebar Guide can load blueprint messages', () => {
  const provider = readSource('src/components/i18n/ClientAppMessagesProvider.tsx')

  it('path-scopes surface catalogs so the sidebar is not stuck on common-only', () => {
    expect(provider).toContain('usePathname')
    expect(provider).toContain('surfacesForPath')
    expect(provider).toContain('getAppMessages')
  })
})
