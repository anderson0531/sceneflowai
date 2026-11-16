/**
 * @vitest-environment jsdom
 */

import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}))

import {
  SERVICE_IN_A_BOX_PLAYBOOKS,
  formatPlaybookPitch,
  type ServicePlaybookVerticalId,
} from '@/config/producer/serviceInABoxPlaybooks'
import { calculateClientQuoteMargin } from '@/lib/credits/projectCalculator'
import { DashboardQuickStart } from '@/app/dashboard/components/DashboardQuickStart'
import { ProducerOnboardingWizard } from '@/components/producer/ProducerOnboardingWizard'
import { FoundingOperatorsClient } from '@/components/landing/FoundingOperatorsClient'

describe('Service-in-a-Box Playbooks, Founding Operators Page & Producer Onboarding Wizard', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.restoreAllMocks()
  })

  it('provides 4 vertical playbooks with 3 healthy-margin rate-card packages each', () => {
    const expectedIds: ServicePlaybookVerticalId[] = [
      'video_memoir',
      'real_estate_tour',
      'education_module',
      'brand_story',
    ]

    for (const id of expectedIds) {
      const pb = SERVICE_IN_A_BOX_PLAYBOOKS[id]
      expect(pb).toBeDefined()
      expect(pb.rateCardTiers).toHaveLength(3)
      for (const tier of pb.rateCardTiers) {
        const margin = calculateClientQuoteMargin({
          baseProjectCredits: tier.estCredits,
          clientPriceUsd: tier.suggestedPriceUsd,
          includedRevisionRounds: pb.defaultMaxRounds,
        })
        expect(margin.healthyMargin).toBe(true)
        expect(margin.providerGrossMarginPercent).toBeGreaterThanOrEqual(75)
      }
    }
  })

  it('interpolates {brand} cleanly in partner outreach scripts and rate cards', () => {
    const custom = formatPlaybookPitch('video_memoir', 'Harbor Legacy Films')
    expect(custom.subject).toContain('Harbor Legacy Films')
    expect(custom.body).toContain('I run Harbor Legacy Films')
    expect(custom.body).not.toContain('{brand}')
    expect(custom.rateCardText).toContain(
      'Harbor Legacy Films — Video Memoirs & Family Legacy Packages'
    )
    expect(custom.rateCardText).toContain('$599')

    const fallback = formatPlaybookPitch('real_estate_tour', '   ')
    expect(fallback.subject).toContain('Your Studio Name')
    expect(fallback.body).toContain('At Your Studio Name')
  })

  it('surfaces White-Label Video Service in DashboardQuickStart linking to ?onboarding=1', () => {
    act(() => {
      root.render(React.createElement(DashboardQuickStart))
    })

    const links = Array.from(container.querySelectorAll('a'))
    const producerLink = links.find((a) =>
      a.getAttribute('href')?.includes('/dashboard/settings/producer?onboarding=1')
    )
    expect(producerLink).toBeDefined()
    expect(producerLink?.textContent).toContain('White-Label Video Service')
  })

  it('renders FoundingOperatorsClient in both fallback and live Whop charter modes', () => {
    act(() => {
      root.render(React.createElement(FoundingOperatorsClient, { charterPlanConfigured: false }))
    })
    expect(container.textContent).toContain('Start Solo Operator Pro Now ($149/mo)')
    expect(container.textContent).toContain('Want the $299 90-Day Charter Bundle Invoice?')
    expect(container.textContent).toContain('Build Your Spec Sample First — $9 Explorer')

    act(() => {
      root.render(React.createElement(FoundingOperatorsClient, { charterPlanConfigured: true }))
    })
    expect(container.textContent).toContain('Claim Founding Operator Charter ($299)')
    expect(container.textContent).toContain('Monthly Pro Operator — $149/mo')
  })

  it('guides an operator through Vertical Preset selection, Intake link display, and Partner Pitch copy', () => {
    const onApplyVerticalPreset = vi.fn()
    const onCopyText = vi.fn()
    const onSaveProfile = vi.fn().mockResolvedValue(true)
    const onCreateIntakeLink = vi.fn().mockResolvedValue(undefined)

    act(() => {
      root.render(
        React.createElement(ProducerOnboardingWizard, {
          defaultExpanded: true,
          brandName: 'Pacific Tribute Studio',
          onBrandNameChange: vi.fn(),
          primaryColor: '#06b6d4',
          onPrimaryColorChange: vi.fn(),
          hideBranding: true,
          onHideBrandingChange: vi.fn(),
          addendumChecked: true,
          onAddendumCheckedChange: vi.fn(),
          addendumAccepted: true,
          whiteLabelEligible: true,
          savingProfile: false,
          onSaveProfile,
          currentIntakeVertical: 'custom_production',
          onApplyVerticalPreset,
          creatingIntake: false,
          onCreateIntakeLink,
          generatedIntake: {
            shareUrl: 'https://sceneflowai.studio/c/intake/tok_demo_123',
            embedUrl: 'https://sceneflowai.studio/c/intake/tok_demo_123?embed=1',
            iframeSnippet:
              '<iframe src="https://sceneflowai.studio/c/intake/tok_demo_123?embed=1"></iframe>',
            projectId: 'proj_123',
          },
          onCopyText,
          copiedKey: null,
        })
      )
    })

    // Because brandName + addendumAccepted are true, Wizard opens directly on Step 2
    expect(container.textContent).toContain(
      'Step 2 — Pick Your Flagship Service Vertical & Client Rate Card'
    )

    // Apply default flagship Video Memoir ($599) preset
    const applyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Apply Preset to Client Intake')
    )
    expect(applyBtn).toBeDefined()

    act(() => {
      applyBtn?.click()
    })

    expect(onApplyVerticalPreset).toHaveBeenCalledTimes(1)
    expect(onApplyVerticalPreset).toHaveBeenCalledWith(
      expect.objectContaining({
        vertical: 'video_memoir',
        clientPriceUsd: 599,
        maxCustomerTurns: 10,
        intakeMaxRounds: 2,
      })
    )

    // Advances to Step 3 and shows hosted intake link
    expect(container.textContent).toContain(
      'Step 3 — Mint Your Branded Client Intake Link or Build a 3-Minute Spec Sample'
    )

    const nextStep4Btn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Next: Copy 20% Partner Pitch')
    )
    expect(nextStep4Btn).toBeDefined()

    act(() => {
      nextStep4Btn?.click()
    })

    // Step 4 renders interpolated partner pitch and copies on click
    expect(container.textContent).toContain(
      'Step 4 — Copy Your 20% Referral Partner Pitch & Rate Card'
    )
    expect(container.textContent).toContain('I run Pacific Tribute Studio')

    const copyPitchBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Copy Partner Pitch')
    )
    expect(copyPitchBtn).toBeDefined()

    act(() => {
      copyPitchBtn?.click()
    })

    expect(onCopyText).toHaveBeenCalledWith(
      'wizardPartnerPitch',
      expect.stringContaining('Pacific Tribute Studio')
    )
  })
})
