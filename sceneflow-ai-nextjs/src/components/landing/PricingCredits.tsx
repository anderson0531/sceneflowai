'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Check, 
  Zap, 
  ArrowRight, 
  Calculator,
  Sparkles,
  Film,
  Image as ImageIcon,
  Mic,
  HardDrive,
  Clock,
  Users,
  Building2,
  ChevronDown,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

// Credit costs for calculator
const creditCosts = {
  imageGeneration: 10,      // per image
  videoFast: 150,           // per fast video clip
  videoQuality: 500,        // per 4K quality clip
  voiceover: 5,             // per 30 seconds
  storage: 1,               // per GB/month
}

// Project presets for calculator
const projectPresets = [
  {
    id: 'commercial',
    name: '30-sec Commercial',
    duration: 0.5,
    images: 10,
    videoClips: 5,
    videoQuality: 'fast',
    voiceMinutes: 0.5,
    storageGb: 2,
  },
  {
    id: 'short',
    name: '2-min Short Film',
    duration: 2,
    images: 30,
    videoClips: 15,
    videoQuality: 'fast',
    voiceMinutes: 2,
    storageGb: 5,
  },
  {
    id: 'episode',
    name: '10-min Episode',
    duration: 10,
    images: 80,
    videoClips: 50,
    videoQuality: 'mixed',
    voiceMinutes: 10,
    storageGb: 15,
  },
  {
    id: 'feature',
    name: '90-min Feature',
    duration: 90,
    images: 500,
    videoClips: 300,
    videoQuality: 'quality',
    voiceMinutes: 90,
    storageGb: 100,
  },
]

// Credit top-up packs
const creditPacks = [
  { credits: 2500, price: 25, label: 'Starter Pack', description: 'Perfect for quick revisions' },
  { credits: 7500, price: 60, label: 'Scene Pack', description: 'Complete a short project' },
  { credits: 25000, price: 180, label: 'Production Pack', description: 'Major film sequence' },
  { credits: 100000, price: 600, label: 'Studio Pack', description: 'Full production capacity' },
]

// Base access plans
const basePlans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    includedCredits: 3000,
    storage: '25 GB',
    description: 'For individual creators',
    features: [
      'Full platform access',
      '3,000 credits/month included',
      '25 GB active storage',
      'MP4 export (any resolution)',
      'AI voiceover (32 languages)',
      'Email support',
    ],
    limitations: [
      '1 team seat',
      'Community support only',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    includedCredits: 10000,
    storage: '100 GB',
    description: 'For professional creators',
    popular: true,
    features: [
      'Everything in Starter, plus:',
      '10,000 credits/month included',
      '100 GB active storage',
      'Veo 3.1 Quality (4K) access',
      'Character consistency engine',
      'Voice cloning',
      '3 team seats',
      'Priority support',
    ],
    limitations: [],
  },
  {
    id: 'studio',
    name: 'Studio',
    price: 249,
    includedCredits: 50000,
    storage: '500 GB',
    description: 'For teams & agencies',
    features: [
      'Everything in Pro, plus:',
      '50,000 credits/month included',
      '500 GB active storage',
      'White-label exports',
      'API access',
      '10 team seats',
      'Dedicated account manager',
      'SLA guarantee',
    ],
    limitations: [],
  },
]

// Project Budget Calculator Component
function ProjectBudgetCalculator() {
  const [selectedPreset, setSelectedPreset] = useState(projectPresets[1])
  const [showCustom, setShowCustom] = useState(false)
  const [customValues, setCustomValues] = useState({
    images: 30,
    videoClips: 15,
    videoQuality: 'fast' as 'fast' | 'quality' | 'mixed',
    voiceMinutes: 2,
  })

  const calculateCredits = useMemo(() => {
    const values = showCustom ? customValues : selectedPreset
    const videoRate = values.videoQuality === 'quality' 
      ? creditCosts.videoQuality 
      : values.videoQuality === 'mixed'
        ? (creditCosts.videoFast + creditCosts.videoQuality) / 2
        : creditCosts.videoFast

    return {
      images: (showCustom ? customValues.images : selectedPreset.images) * creditCosts.imageGeneration,
      video: (showCustom ? customValues.videoClips : selectedPreset.videoClips) * videoRate,
      voice: Math.ceil((showCustom ? customValues.voiceMinutes : selectedPreset.voiceMinutes) * 2) * creditCosts.voiceover,
      total: 0,
    }
  }, [selectedPreset, showCustom, customValues])

  const totalCredits = calculateCredits.images + calculateCredits.video + calculateCredits.voice
  const estimatedCost = (totalCredits / 1000) * 8 // Rough $8 per 1000 credits

  return (
    <div className="bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-800 p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="dashboard-widget-title text-xl font-bold text-white">Project Budget Calculator</h3>
          <p className="text-sm text-gray-400">Estimate credits before you start</p>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {projectPresets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => {
              setSelectedPreset(preset)
              setShowCustom(false)
            }}
            className={cn(
              'p-4 rounded-xl border text-left transition-all',
              selectedPreset.id === preset.id && !showCustom
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            )}
          >
            <div className="text-sm font-medium text-white mb-1">{preset.name}</div>
            <div className="text-xs text-gray-400">{preset.duration} min</div>
          </button>
        ))}
      </div>

      {/* Custom Toggle */}
      <button
        onClick={() => setShowCustom(!showCustom)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6"
      >
        <ChevronDown className={cn('w-4 h-4 transition-transform', showCustom && 'rotate-180')} />
        Customize parameters
      </button>

      {/* Custom Sliders */}
      <AnimatePresence>
        {showCustom && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 mb-6 overflow-hidden"
          >
            <div>
              <label className="flex items-center justify-between text-sm text-gray-400 mb-2">
                <span>Images to generate</span>
                <span className="text-white font-medium">{customValues.images}</span>
              </label>
              <input
                type="range"
                min={5}
                max={200}
                value={customValues.images}
                onChange={(e) => setCustomValues({ ...customValues, images: parseInt(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>
            <div>
              <label className="flex items-center justify-between text-sm text-gray-400 mb-2">
                <span>Video clips</span>
                <span className="text-white font-medium">{customValues.videoClips}</span>
              </label>
              <input
                type="range"
                min={1}
                max={100}
                value={customValues.videoClips}
                onChange={(e) => setCustomValues({ ...customValues, videoClips: parseInt(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>
            <div>
              <label className="flex items-center justify-between text-sm text-gray-400 mb-2">
                <span>Voiceover (minutes)</span>
                <span className="text-white font-medium">{customValues.voiceMinutes}</span>
              </label>
              <input
                type="range"
                min={0}
                max={60}
                value={customValues.voiceMinutes}
                onChange={(e) => setCustomValues({ ...customValues, voiceMinutes: parseInt(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cost Breakdown */}
      <div className="bg-gray-800/50 rounded-xl p-5 mb-6">
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <ImageIcon className="w-4 h-4" />
              <span>Image Generation</span>
            </div>
            <span className="text-white font-medium">{calculateCredits.images.toLocaleString()} credits</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Film className="w-4 h-4" />
              <span>Video Generation</span>
            </div>
            <span className="text-white font-medium">{calculateCredits.video.toLocaleString()} credits</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Mic className="w-4 h-4" />
              <span>Voiceover</span>
            </div>
            <span className="text-white font-medium">{calculateCredits.voice.toLocaleString()} credits</span>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-white">Total Estimate</span>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-400">{totalCredits.toLocaleString()} credits</div>
              <div className="text-sm text-gray-400">≈ ${estimatedCost.toFixed(2)} with top-ups</div>
            </div>
          </div>
        </div>
      </div>

      {/* Transparency Message */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-sm text-gray-300">
          <span className="font-medium text-emerald-400">Full transparency:</span> You&apos;ll see real-time credit usage as you work. No surprises—adjust your project scope anytime.
        </div>
      </div>
    </div>
  )
}

export function PricingCredits() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const annualDiscount = 0.17 // 17% discount

  return (
    <section id="pricing" className="relative py-24 md:py-32 overflow-hidden scroll-mt-20">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08),transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">Usage-Based Pricing</span>
          </div>
          
          <h2 className="landing-section-heading text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Pay for What You Create
          </h2>
          
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
            One base plan for platform access. Credits for AI generation. Top up when you need more. Full control, zero waste.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center p-1 bg-gray-800/50 rounded-lg border border-gray-700">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                'px-6 py-2.5 rounded-md text-sm font-medium transition-all',
                billingCycle === 'monthly'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={cn(
                'px-6 py-2.5 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                billingCycle === 'annual'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              Annual
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                billingCycle === 'annual' ? 'bg-white/20' : 'bg-emerald-500/20 text-emerald-400'
              )}>
                Save 17%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Base Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-20">
          {basePlans.map((plan, index) => {
            const displayPrice = billingCycle === 'annual' 
              ? Math.round(plan.price * (1 - annualDiscount))
              : plan.price

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={cn(
                  'relative rounded-2xl border p-6 lg:p-8 flex flex-col',
                  plan.popular
                    ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/30 via-gray-900 to-gray-900 shadow-2xl shadow-emerald-500/10'
                    : 'border-gray-800 bg-gray-900/60'
                )}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="px-4 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold">
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-6">
                  <h3 className="dashboard-widget-title text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-sm text-gray-400">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">${displayPrice}</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                  {billingCycle === 'annual' && (
                    <p className="text-sm text-emerald-400 mt-1">
                      Billed ${displayPrice * 12}/year (save ${Math.round(plan.price * 12 * annualDiscount)})
                    </p>
                  )}
                </div>

                {/* Credits & Storage */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="text-xs text-gray-400">Credits/mo</span>
                    </div>
                    <div className="text-lg font-bold text-white">{plan.includedCredits.toLocaleString()}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                    <div className="flex items-center gap-2 mb-1">
                      <HardDrive className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs text-gray-400">Storage</span>
                    </div>
                    <div className="text-lg font-bold text-white">{plan.storage}</div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature, fIndex) => (
                    <div key={fIndex} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Button
                  onClick={() => window.location.href = '/?signup=1'}
                  className={cn(
                    'w-full py-3 font-medium',
                    plan.popular
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                      : 'bg-gray-800 border border-gray-700 text-white hover:bg-gray-700'
                  )}
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )
          })}
        </div>

        {/* Enterprise CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-4 p-4 rounded-xl bg-gray-900/60 border border-gray-800">
            <Building2 className="w-6 h-6 text-purple-400" />
            <div className="text-left">
              <div className="text-white font-medium">Need enterprise scale?</div>
              <div className="text-sm text-gray-400">Custom credits, SLA, dedicated support</div>
            </div>
            <Button variant="outline" className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
              Contact Sales
            </Button>
          </div>
        </motion.div>

        {/* Credit Top-ups */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold text-white mb-3">Need More Credits?</h3>
            <p className="text-gray-400">Top up anytime. Credits never expire.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {creditPacks.map((pack, index) => (
              <motion.div
                key={pack.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 hover:border-amber-500/30 transition-colors cursor-pointer"
                onClick={() => window.location.href = '/dashboard/settings/billing'}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span className="font-semibold text-white">{pack.label}</span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {pack.credits.toLocaleString()} <span className="text-base text-gray-400 font-normal">credits</span>
                </div>
                <div className="text-lg text-amber-400 font-medium mb-2">${pack.price}</div>
                <div className="text-xs text-gray-500">{pack.description}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Project Budget Calculator */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold text-white mb-3">Estimate Your Project</h3>
            <p className="text-gray-400">Know exactly what you&apos;ll pay before you commit</p>
          </div>
          <ProjectBudgetCalculator />
        </motion.div>

        {/* Trust Signals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="inline-flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>14-day money-back guarantee</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Credits never expire</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default PricingCredits
