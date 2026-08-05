import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { BLUEPRINT_COPY } from '@/lib/blueprint/blueprintGlossary'
import { STUDIO_DISPLAY_NAMES } from '@/constants/studioDisplayNames'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

describe('Production hand-off label', () => {
  it('shortens the header button to Go', () => {
    expect(BLUEPRINT_COPY.startProductionShort).toBe('Go')
  })

  it('keeps the full destination name for labels and tooltips', () => {
    expect(BLUEPRINT_COPY.startProduction).toBe('Go to Production Studio')
    expect(BLUEPRINT_COPY.startProductionTooltip).toContain('Go to Production Studio')
  })

  it('leaves the next-step label as the destination, not Go', () => {
    // blueprintProgress renders this beside the banner's own Go button, so
    // "Next step: Go" would be meaningless.
    // The label is emitted as a catalog key now; blueprint.nextStep.startProduction
    // holds the destination name, and no short/Go key is reachable from here.
    const progress = readSource('src/lib/blueprint/blueprintProgress.ts')
    expect(progress).toContain("nextStepLabelKey")
    expect(progress).toContain("? 'startProduction'")
    expect(progress).not.toContain('startProductionShort')
    expect(progress).not.toContain("'goShort'")

    const catalog = JSON.parse(readSource('messages/app/en/blueprint.json'))
    expect(catalog.nextStep.startProduction).toBe('Go to Production Studio')
  })

  it('uses the short label only on the Studio header button', () => {
    const page = readSource('src/app/dashboard/studio/[projectId]/StudioPageClient.tsx')
    // The header button copy moved to the blueprint catalog (studio.goShort).
    expect(page).toContain("t('goShort')")
    // A bare "Go" needs the destination in its accessible name.
    expect(page).toContain("aria-label={t('goToProduction')}")
  })

  it('keeps the full name in the dialog, sidebar guide and card toolbar', () => {
    for (const relativePath of [
      'src/components/blueprint/StartProductionDialog.tsx',
      'src/components/blueprint/TreatmentCard.tsx',
      'src/config/nav/workflowGuideConfig.ts',
    ]) {
      expect(readSource(relativePath)).not.toContain('startProductionShort')
    }
  })
})

describe('Leaving Blueprint Studio is confirmed', () => {
  const hook = readSource('src/hooks/studio/useStartProduction.ts')

  it('REGRESSION: never hands off straight from the request', () => {
    // Previously an allowed gate called executeHandoff immediately, so a single
    // click navigated out of the Studio with no confirmation.
    const requestBody = hook.slice(
      hook.indexOf('const requestStartProduction'),
      hook.indexOf('const confirmStartProduction')
    )
    expect(requestBody).toContain('setShowPreflight(true)')
    expect(requestBody).not.toContain('executeHandoff')
  })

  it('still hands off from the explicit confirm', () => {
    const confirmBody = hook.slice(
      hook.indexOf('const confirmStartProduction'),
      hook.indexOf('const cancelStartProduction')
    )
    expect(confirmBody).toContain('executeHandoff')
  })

  it('names both studios in the confirmation so the move is explicit', () => {
    const dialog = readSource('src/components/blueprint/StartProductionDialog.tsx')
    expect(dialog).toContain('STUDIO_DISPLAY_NAMES.blueprint')
    expect(dialog).toContain('STUDIO_DISPLAY_NAMES.production')
    expect(STUDIO_DISPLAY_NAMES.blueprint).toBe('Blueprint Studio')
  })

  it('offers staying put rather than a bare Cancel', () => {
    const dialog = readSource('src/components/blueprint/StartProductionDialog.tsx')
    expect(dialog).toContain(`Stay in ${'${STUDIO_DISPLAY_NAMES.blueprint}'}`)
  })
})
