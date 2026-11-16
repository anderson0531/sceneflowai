'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
  Briefcase,
  MessageSquare,
  Handshake,
  Film,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  SERVICE_IN_A_BOX_PLAYBOOKS,
  formatPlaybookPitch,
  type ServicePlaybookVerticalId,
} from '@/config/producer/serviceInABoxPlaybooks'
import { calculateClientQuoteMargin } from '@/lib/credits/projectCalculator'

export interface AppliedVerticalPreset {
  vertical: ServicePlaybookVerticalId
  clientPriceUsd: number
  creditBudgetCap: number
  maxCustomerTurns: number
  intakeMaxRounds: number
}

export interface ProducerOnboardingWizardProps {
  defaultExpanded?: boolean
  brandName: string
  onBrandNameChange: (value: string) => void
  primaryColor: string
  onPrimaryColorChange: (value: string) => void
  hideBranding: boolean
  onHideBrandingChange: (value: boolean) => void
  addendumChecked: boolean
  onAddendumCheckedChange: (value: boolean) => void
  addendumAccepted: boolean
  whiteLabelEligible?: boolean
  savingProfile: boolean
  onSaveProfile: () => Promise<boolean>
  currentIntakeVertical: string
  onApplyVerticalPreset: (preset: AppliedVerticalPreset) => void
  creatingIntake: boolean
  onCreateIntakeLink: () => Promise<void>
  generatedIntake: {
    shareUrl: string
    embedUrl: string
    iframeSnippet: string
    projectId: string | null
  } | null
  onCopyText: (key: string, text: string) => Promise<void> | void
  copiedKey: string | null
}

const PLAYBOOK_ORDER: ServicePlaybookVerticalId[] = [
  'video_memoir',
  'real_estate_tour',
  'education_module',
  'brand_story',
]

export function ProducerOnboardingWizard({
  defaultExpanded = true,
  brandName,
  onBrandNameChange,
  primaryColor,
  onPrimaryColorChange,
  hideBranding,
  onHideBrandingChange,
  addendumChecked,
  onAddendumCheckedChange,
  addendumAccepted,
  whiteLabelEligible,
  savingProfile,
  onSaveProfile,
  currentIntakeVertical,
  onApplyVerticalPreset,
  creatingIntake,
  onCreateIntakeLink,
  generatedIntake,
  onCopyText,
  copiedKey,
}: ProducerOnboardingWizardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(
    addendumAccepted && brandName.trim().length > 0 ? 2 : 1
  )
  const [selectedVertical, setSelectedVertical] = useState<ServicePlaybookVerticalId>(
    PLAYBOOK_ORDER.includes(currentIntakeVertical as ServicePlaybookVerticalId)
      ? (currentIntakeVertical as ServicePlaybookVerticalId)
      : 'video_memoir'
  )
  const [selectedPackageIndex, setSelectedPackageIndex] = useState<number>(1)
  const [presetApplied, setPresetApplied] = useState<boolean>(
    PLAYBOOK_ORDER.includes(currentIntakeVertical as ServicePlaybookVerticalId)
  )

  useEffect(() => {
    if (defaultExpanded) {
      setExpanded(true)
    }
  }, [defaultExpanded])

  const activePlaybook = SERVICE_IN_A_BOX_PLAYBOOKS[selectedVertical]
  const activeTier =
    activePlaybook.rateCardTiers[selectedPackageIndex] ?? activePlaybook.rateCardTiers[1]
  const quoteMargin = calculateClientQuoteMargin({
    baseProjectCredits: activeTier.estCredits,
    clientPriceUsd: activeTier.suggestedPriceUsd,
    includedRevisionRounds: activePlaybook.defaultMaxRounds,
  })
  const pitch = formatPlaybookPitch(selectedVertical, brandName)

  const step1Done = addendumAccepted && brandName.trim().length > 0
  const step2Done = presetApplied
  const step3Done = Boolean(generatedIntake?.shareUrl)
  const completedCount =
    (step1Done ? 1 : 0) + (step2Done ? 1 : 0) + (step3Done ? 1 : 0)

  const handleSaveStep1 = async () => {
    const ok = await onSaveProfile()
    if (ok && addendumChecked) {
      setActiveStep(2)
    }
  }

  const handleApplyStep2 = () => {
    onApplyVerticalPreset({
      vertical: selectedVertical,
      clientPriceUsd: activeTier.suggestedPriceUsd,
      creditBudgetCap: quoteMargin.recommendedCreditCeiling,
      maxCustomerTurns: activePlaybook.defaultMaxTurns,
      intakeMaxRounds: activePlaybook.defaultMaxRounds,
    })
    setPresetApplied(true)
    setActiveStep(3)
  }

  return (
    <section
      aria-label="Producer Onboarding Launchpad"
      className="rounded-xl border border-cyan-500/35 bg-gradient-to-br from-slate-900/95 via-gray-900/95 to-indigo-950/30 p-5 sm:p-6 shadow-lg shadow-cyan-950/20"
    >
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white">
                4-Step Producer Launchpad &amp; Service-in-a-Box Playbooks
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                {completedCount}/3 Setup Milestones · Partner Scripts Included
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-1">
              Configure your white-label brand, apply a proven high-margin vertical rate card, mint
              your first Client Intake link, and copy a 20%-commission referral partner pitch in
              under 3 minutes.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          title={expanded ? 'Collapse Producer Launchpad' : 'Expand Producer Launchpad'}
          className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-1.5 text-xs font-medium text-gray-200 hover:border-cyan-500/40 hover:text-white transition"
        >
          {expanded ? (
            <>
              Hide Launchpad <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              Open Launchpad <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-5 space-y-5">
          {/* Step Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[
              {
                step: 1 as const,
                label: '1. Brand & Addendum',
                sub: step1Done ? 'Brand & legal shield active' : 'Set studio name & clickwrap',
                done: step1Done,
                icon: ShieldCheck,
              },
              {
                step: 2 as const,
                label: '2. Vertical & Rate Card',
                sub: step2Done
                  ? `${activePlaybook.title}`
                  : 'Pick flagship wedge & margins',
                done: step2Done,
                icon: Briefcase,
              },
              {
                step: 3 as const,
                label: '3. Intake or Spec Sample',
                sub: step3Done ? 'Client link ready to share' : 'Mint client portal or sample',
                done: step3Done,
                icon: MessageSquare,
              },
              {
                step: 4 as const,
                label: '4. 20% Partner Outreach',
                sub: 'Copy B2B referral script & rates',
                done: false,
                icon: Handshake,
              },
            ].map((item) => {
              const Icon = item.icon
              const isCurrent = activeStep === item.step
              return (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => setActiveStep(item.step)}
                  title={item.label}
                  className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition ${
                    isCurrent
                      ? 'border-cyan-400/70 bg-cyan-500/15 text-white'
                      : 'border-gray-700/80 bg-gray-800/60 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {item.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Icon className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white">{item.label}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{item.sub}</div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* STEP 1: Brand & Commercial Addendum */}
          {activeStep === 1 && (
            <div className="rounded-xl border border-gray-700/70 bg-gray-900/75 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Step 1 — Configure Your Studio Identity &amp; Zero-Privity Shield
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Your brand name and accent color appear on every Client Intake, Continuity
                    upload, and Screening Room portal.
                  </p>
                </div>
                {addendumAccepted && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Addendum Saved
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Studio / Agency Brand Name
                  </label>
                  <Input
                    value={brandName}
                    onChange={(e) => onBrandNameChange(e.target.value)}
                    placeholder="e.g., Heritage Memoir Films"
                    className="bg-gray-950 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Portal Accent Color &amp; White-Label Mode
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-7 w-7 rounded-md border border-gray-600 shrink-0"
                        style={{ backgroundColor: primaryColor || '#06b6d4' }}
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => onPrimaryColorChange(e.target.value)}
                        className="w-28 bg-gray-950 border-gray-700 text-white"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whiteLabelEligible === false ? false : hideBranding}
                        disabled={whiteLabelEligible === false}
                        onChange={(e) => onHideBrandingChange(e.target.checked)}
                        className="rounded border-gray-600 bg-gray-800 text-cyan-500 disabled:opacity-50"
                      />
                      <span>Hide SceneFlow branding</span>
                    </label>
                  </div>
                  {whiteLabelEligible === false && (
                    <p className="mt-1.5 text-[11px] text-amber-300">
                      100% unbranded portals require Pro ($149/mo) or a{' '}
                      <Link href="/founding-operators" className="underline hover:text-white">
                        Founding Operator Charter ($299 / 90 days)
                      </Link>
                      .
                    </p>
                  )}
                </div>
              </div>

              <label className="flex items-start gap-2.5 rounded-lg border border-gray-700/80 bg-gray-950/70 p-3.5 text-xs text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addendumChecked}
                  onChange={(e) => onAddendumCheckedChange(e.target.checked)}
                  className="mt-0.5 rounded border-gray-600 bg-gray-800 text-cyan-500"
                />
                <span>
                  I accept the{' '}
                  <Link
                    href="/terms#commercial-producer-addendum"
                    target="_blank"
                    className="text-cyan-400 hover:underline"
                  >
                    Commercial Producer &amp; Zero-Privity Addendum
                  </Link>{' '}
                  (you act as sole Merchant of Record for your clients; mandatory likeness/voice
                  clickwrap is enforced on every client portal).
                </span>
              </label>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <Button
                  variant="primary"
                  onClick={handleSaveStep1}
                  disabled={savingProfile}
                  className="flex items-center gap-2"
                >
                  {savingProfile ? 'Saving…' : 'Save Brand & Continue to Verticals'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Flagship Vertical & Rate Card */}
          {activeStep === 2 && (
            <div className="rounded-xl border border-gray-700/70 bg-gray-900/75 p-5 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Step 2 — Pick Your Flagship Service Vertical &amp; Client Rate Card
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Start with one high-conviction wedge. Selecting a package below pre-populates your
                  Client Intake pricing, revision rounds, and credit ceiling.
                </p>
              </div>

              {/* 4 Vertical Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {PLAYBOOK_ORDER.map((vid) => {
                  const pb = SERVICE_IN_A_BOX_PLAYBOOKS[vid]
                  const selected = selectedVertical === vid
                  return (
                    <button
                      key={vid}
                      type="button"
                      onClick={() => {
                        setSelectedVertical(vid)
                        setSelectedPackageIndex(1)
                      }}
                      title={pb.title}
                      className={`rounded-lg border p-3.5 text-left transition ${
                        selected
                          ? 'border-cyan-400 bg-cyan-500/15 text-white'
                          : 'border-gray-700 bg-gray-950/70 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
                        {pb.roleTag}
                      </div>
                      <div className="text-xs font-bold text-white mt-1">{pb.title}</div>
                      <div className="text-[11px] text-emerald-300 mt-2 font-medium">
                        Anchor Package: ${pb.recommendedClientPriceUsd.toLocaleString('en-US')}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* 3-Tier Rate Card Selector */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-gray-200">
                  {activePlaybook.title} — Recommended 3-Tier Client Rate Card (Click to select):
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {activePlaybook.rateCardTiers.map((tier, idx) => {
                    const tierMargin = calculateClientQuoteMargin({
                      baseProjectCredits: tier.estCredits,
                      clientPriceUsd: tier.suggestedPriceUsd,
                      includedRevisionRounds: activePlaybook.defaultMaxRounds,
                    })
                    const isPicked = selectedPackageIndex === idx
                    return (
                      <button
                        key={tier.name}
                        type="button"
                        onClick={() => setSelectedPackageIndex(idx)}
                        title={tier.name}
                        className={`rounded-lg border p-3.5 text-left transition ${
                          isPicked
                            ? 'border-emerald-400/80 bg-emerald-500/10'
                            : 'border-gray-700/80 bg-gray-950/60 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-white">{tier.name}</span>
                          {idx === 1 && (
                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                              Most Popular
                            </span>
                          )}
                        </div>
                        <div className="text-lg font-bold text-white mt-1">
                          ${tier.suggestedPriceUsd.toLocaleString('en-US')}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">{tier.scopeSummary}</p>
                        <div className="mt-2.5 pt-2 border-t border-gray-800 flex items-center justify-between text-[11px]">
                          <span className="text-gray-400">
                            COGS ~${tierMargin.sceneFlowCogsUsd.toFixed(0)} (
                            {tierMargin.recommendedCreditCeiling.toLocaleString('en-US')} cr)
                          </span>
                          <span className="font-semibold text-emerald-300">
                            {tierMargin.providerGrossMarginPercent}% gross
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="text-xs text-gray-300">
                  Selected Quote:{' '}
                  <strong className="text-white">
                    ${activeTier.suggestedPriceUsd.toLocaleString('en-US')}
                  </strong>{' '}
                  · Est. Gross Profit{' '}
                  <strong className="text-emerald-300">
                    ${quoteMargin.providerGrossProfitUsd.toFixed(0)} (
                    {quoteMargin.providerGrossMarginPercent}%)
                  </strong>{' '}
                  with {activePlaybook.defaultMaxRounds} revision rounds included
                </div>
                <Button
                  variant="primary"
                  onClick={handleApplyStep2}
                  className="flex items-center gap-2"
                >
                  Apply Preset to Client Intake
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Mint Client Intake Link or Build Spec Sample */}
          {activeStep === 3 && (
            <div className="rounded-xl border border-gray-700/70 bg-gray-900/75 p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Step 3 — Mint Your Branded Client Intake Link or Build a 3-Minute Spec Sample
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Send a zero-login conversational intake link after collecting payment on your own
                  Stripe/Square/invoice, or produce a watermark-free showcase sample first.
                </p>
              </div>

              {!addendumAccepted && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200">
                  <span>
                    Complete Step 1 (accept &amp; save the Commercial Producer Addendum) before
                    minting live client links.
                  </span>
                  <Button variant="secondary" onClick={() => setActiveStep(1)}>
                    Go to Step 1
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-cyan-500/30 bg-gray-950/70 p-4 space-y-3">
                  <div className="text-xs font-semibold text-cyan-300 uppercase tracking-wide">
                    Path A · Ready for Clients
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    Generate Branded Client Onboarding Link
                  </h4>
                  <p className="text-xs text-gray-300">
                    Creates a hosted zero-login interview link + website{' '}
                    <code className="text-cyan-300">&lt;iframe&gt;</code> embed using your{' '}
                    <strong>{activePlaybook.title}</strong> preset ($
                    {activeTier.suggestedPriceUsd.toLocaleString('en-US')}).
                  </p>
                  <Button
                    variant="primary"
                    onClick={onCreateIntakeLink}
                    disabled={creatingIntake || !addendumAccepted}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {creatingIntake
                      ? 'Minting Client Intake Link…'
                      : 'Generate Branded Client Intake Link'}
                  </Button>
                </div>

                <div className="rounded-lg border border-gray-700 bg-gray-950/70 p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-purple-300 uppercase tracking-wide">
                      Path B · Build Portfolio Proof First
                    </div>
                    <h4 className="text-sm font-bold text-white">
                      Produce a 3-Minute Watermark-Free Spec Film
                    </h4>
                    <p className="text-xs text-gray-300">
                      The fastest way to close a local referral partner (estate planner, broker, or
                      agency) is texting them a private Screening Room link on their phone.
                    </p>
                  </div>
                  <Link href="/dashboard/studio/new-project" className="block">
                    <Button
                      variant="secondary"
                      className="w-full flex items-center justify-center gap-2 border border-gray-700"
                    >
                      <Film className="w-4 h-4" />
                      Build Spec Sample in Studio →
                    </Button>
                  </Link>
                </div>
              </div>

              {generatedIntake && (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-emerald-300">
                      ✓ Hosted Client Intake Link Active
                    </span>
                    <Button
                      variant="secondary"
                      onClick={() => setActiveStep(4)}
                      className="text-xs py-1 px-3"
                    >
                      Next: Copy 20% Partner Pitch →
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={generatedIntake.shareUrl}
                      className="bg-gray-950 border-gray-700 text-xs text-gray-200 font-mono"
                    />
                    <Button
                      variant="secondary"
                      onClick={() => onCopyText('wizardShareUrl', generatedIntake.shareUrl)}
                      className="shrink-0 flex items-center gap-1"
                    >
                      {copiedKey === 'wizardShareUrl' ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      Copy Link
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Referral Partner Pitch & Rate Card */}
          {activeStep === 4 && (
            <div className="rounded-xl border border-gray-700/70 bg-gray-900/75 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Step 4 — Copy Your 20% Referral Partner Pitch &amp; Rate Card
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Target Channel: <strong className="text-gray-200">{activePlaybook.partnerTargetAudience}</strong>
                  </p>
                </div>
                <select
                  aria-label="Playbook vertical selector"
                  value={selectedVertical}
                  onChange={(e) =>
                    setSelectedVertical(e.target.value as ServicePlaybookVerticalId)
                  }
                  className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-1.5 text-xs text-white"
                >
                  {PLAYBOOK_ORDER.map((vid) => (
                    <option key={vid} value={vid}>
                      {SERVICE_IN_A_BOX_PLAYBOOKS[vid].title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg border border-gray-700 bg-gray-950/80 p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-cyan-300">
                    Subject: {pitch.subject}
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      onCopyText('wizardPartnerPitch', `Subject: ${pitch.subject}\n\n${pitch.body}`)
                    }
                    className="flex items-center gap-1.5 text-xs py-1 px-3"
                  >
                    {copiedKey === 'wizardPartnerPitch' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    Copy Partner Pitch
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs text-gray-200 leading-relaxed border-t border-gray-800 pt-2.5">
                  {pitch.body}
                </pre>
              </div>

              <div className="rounded-lg border border-gray-700 bg-gray-950/80 p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-emerald-300">
                    Client 3-Tier Rate Card Summary
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => onCopyText('wizardRateCard', pitch.rateCardText)}
                    className="flex items-center gap-1.5 text-xs py-1 px-3"
                  >
                    {copiedKey === 'wizardRateCard' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    Copy Rate Card
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs text-gray-300 leading-relaxed">
                  {pitch.rateCardText}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
