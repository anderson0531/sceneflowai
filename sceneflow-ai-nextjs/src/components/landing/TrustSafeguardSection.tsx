'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Shield, CheckCircle2, ArrowRight, Cpu, FileSearch, Volume2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { MobileDisclosure } from '@/components/landing/MobileDisclosure'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'
import { isPrelaunchAccessModeEnabled } from '@/lib/billing/prelaunchAccess'
import { openPrelaunchAccessModal } from '@/components/landing/PrelaunchAccessModal'

const SECTION_ID = 'trust-safety'

const TIER_GRADIENTS = [
  'from-cyan-500/20 to-blue-600/10 border-cyan-500/25',
  'from-violet-500/20 to-purple-600/10 border-violet-500/25',
  'from-emerald-500/20 to-teal-600/10 border-emerald-500/25',
] as const

export function TrustSafeguardSection() {
  const locale = useLocale()
  const t = useTranslations('trustSafeguard')
  const rawTiers = t.raw('tiers')
  const tiers = (Array.isArray(rawTiers) ? rawTiers : []) as Array<{
    id: string
    title: string
    description: string
    highlights: string[]
    badge: string
  }>
  const rawFlowSteps = t.raw('flowSteps')
  const flowSteps = (Array.isArray(rawFlowSteps) ? rawFlowSteps : []) as Array<{
    label: string
    detail: string
  }>
  const prelaunchOnly = isPrelaunchAccessModeEnabled()
  const signupUrl = getSignupUrlForTier('explorer')

  return (
    <section
      id={SECTION_ID}
      className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-14 sm:py-24 scroll-mt-20"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative text-center mb-8 sm:mb-12"
        >
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300 mb-3">
            <Shield className="me-1.5 inline w-3.5 h-3.5 align-[-2px] text-cyan-400" />
            <span>{t('badge')}</span>
          </p>
          <div className="flex items-center justify-center gap-3 mb-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              {t('title')}{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                {t('titleAccent')}
              </span>
            </h2>
          </div>
          <p className="text-gray-400 max-w-3xl mx-auto text-base sm:text-lg leading-relaxed">{t('subtitle')}</p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-10">
          {flowSteps.map((step, index) => (
            <div
              key={step.label}
              className="flex flex-col justify-between rounded-xl bg-slate-900/80 border border-slate-800 p-3 sm:p-3.5 text-left"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                0{index + 1} · {step.label}
              </span>
              <span className="mt-1 text-xs sm:text-sm font-medium leading-snug text-gray-200">
                {step.detail}
              </span>
            </div>
          ))}
        </div>

        <MobileDisclosure
          title={`${t('title')} ${t('titleAccent')}`}
          subtitle={t('badge')}
          badge={`${tiers.length}`}
          icon={<Shield className="w-4 h-4 text-cyan-400" />}
          locale={locale}
          accent="cyan"
          className="mb-8 sm:mb-10"
          testId="trust-tiers-disclosure"
        >
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
            {tiers.map((tier, index) => (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className={`rounded-2xl border bg-gradient-to-br p-5 sm:p-6 ${TIER_GRADIENTS[index]}`}
              >
                <span className="inline-block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2.5 sm:mb-3">
                  {tier.badge}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{tier.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">{tier.description}</p>
                <ul className="space-y-2">
                  {tier.highlights.map((highlight) => (
                    <li key={highlight} className="flex gap-2 text-sm text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </MobileDisclosure>

        {/* Enterprise Cloud & AI Infrastructure Strip (consolidated from InfrastructureSection) */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 py-3 text-xs text-gray-300">
          <span className="font-semibold uppercase tracking-wider text-gray-400">
            SaaS Cloud &amp; AI Infrastructure:
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-950/70 px-2.5 py-1 font-medium text-gray-200">
            <Image src="/images/google-cloud-logo.svg" alt="Google Cloud" width={16} height={16} />
            Google Cloud
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-950/70 px-2.5 py-1 font-medium text-gray-200">
            <Image src="/images/vertex-ai-logo.svg" alt="Vertex AI" width={16} height={16} />
            Vertex AI
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-slate-950/70 px-2.5 py-1 font-medium text-gray-200">
            <Cpu className="h-3.5 w-3.5 text-lime-400" aria-hidden />
            NVIDIA L4 · NVENC 4K Mastering
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-950/70 px-2.5 py-1 font-medium text-gray-200">
            <Volume2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
            ElevenLabs Neural Audio
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={t('ctaPolicyHref')}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white font-medium hover:bg-slate-700 transition-colors"
          >
            <FileSearch className="w-4 h-4" />
            {t('ctaPolicy')}
          </Link>
          {prelaunchOnly ? (
            <button
              type="button"
              onClick={() => {
                if (!openPrelaunchAccessModal({ tier: 'explorer', source: 'trust-safeguard' })) {
                  window.location.href = signupUrl
                }
              }}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 text-slate-950 font-semibold shadow-lg shadow-cyan-500/25 hover:brightness-110 transition-all cursor-pointer"
            >
              Request Pre-Launch Access
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href={signupUrl}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 text-slate-950 font-semibold shadow-lg shadow-cyan-500/25 hover:brightness-110 transition-all"
            >
              {t('ctaStudio')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
