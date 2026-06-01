'use client'

import { useState, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
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
  Info,
  Key,
  Gift
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getBillingUrl } from '@/lib/billing/billingUrls'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'
import { PricingTierGrid } from '@/components/landing/PricingTierGrid'

// Credit costs for calculator
const creditCosts = {
  imageGeneration: 10,      // per image
  videoFast: 150,           // per fast video clip
  videoQuality: 500,        // per 4K quality clip
  voiceover: 5,             // per 30 seconds
  storage: 1,               // per GB/month
}

const PRESET_INDEX: Record<string, number> = {
  commercial: 0,
  short: 1,
  episode: 2,
  feature: 3,
}

// Project presets for calculator
const projectPresets = [
  {
    id: 'commercial',
    duration: 0.5,
    images: 10,
    videoClips: 5,
    videoQuality: 'fast' as const,
    voiceMinutes: 0.5,
    storageGb: 2,
  },
  {
    id: 'short',
    duration: 2,
    images: 30,
    videoClips: 15,
    videoQuality: 'fast' as const,
    voiceMinutes: 2,
    storageGb: 5,
  },
  {
    id: 'episode',
    duration: 10,
    images: 80,
    videoClips: 50,
    videoQuality: 'mixed' as const,
    voiceMinutes: 10,
    storageGb: 15,
  },
  {
    id: 'feature',
    duration: 90,
    images: 500,
    videoClips: 300,
    videoQuality: 'quality' as const,
    voiceMinutes: 90,
    storageGb: 100,
  },
]

// Credit top-up packs
const creditPacks = [
  { credits: 2500, price: 25 },
  { credits: 7500, price: 60 },
  { credits: 25000, price: 180 },
  { credits: 100000, price: 600 },
]

// BYOK Platform Fee: 20% of standard credits when using your own API keys
const BYOK_PLATFORM_FEE_PERCENT = 0.20;
const BYOK_SAVINGS_PERCENT = 80; // 80% savings on SceneFlow credits with BYOK

// Project Budget Calculator Component
function ProjectBudgetCalculator() {
  const t = useTranslations('pricing')
  const [selectedPreset, setSelectedPreset] = useState(projectPresets[1])
  const [showCustom, setShowCustom] = useState(false)
  const [customValues, setCustomValues] = useState({
    images: 30,
    videoClips: 15,
    videoQuality: 'fast' as 'fast' | 'quality' | 'mixed',
    voiceMinutes: 2,
  })
  
  // BYOK toggles
  const [byokVertexAI, setByokVertexAI] = useState(false)
  const [byokElevenLabs, setByokElevenLabs] = useState(false)

  const calculateCredits = useMemo(() => {
    const values = showCustom ? customValues : selectedPreset
    const videoRate = values.videoQuality === 'quality' 
      ? creditCosts.videoQuality 
      : values.videoQuality === 'mixed'
        ? (creditCosts.videoFast + creditCosts.videoQuality) / 2
        : creditCosts.videoFast

    // Standard credits
    const standardImages = (showCustom ? customValues.images : selectedPreset.images) * creditCosts.imageGeneration
    const standardVideo = (showCustom ? customValues.videoClips : selectedPreset.videoClips) * videoRate
    const standardVoice = Math.ceil((showCustom ? customValues.voiceMinutes : selectedPreset.voiceMinutes) * 2) * creditCosts.voiceover

    // BYOK credits (20% platform fee when using your own keys)
    const byokImages = byokVertexAI ? Math.ceil(standardImages * BYOK_PLATFORM_FEE_PERCENT) : standardImages
    const byokVideo = byokVertexAI ? Math.ceil(standardVideo * BYOK_PLATFORM_FEE_PERCENT) : standardVideo
    const byokVoice = byokElevenLabs ? Math.ceil(standardVoice * BYOK_PLATFORM_FEE_PERCENT) : standardVoice

    return {
      images: { standard: standardImages, byok: byokImages },
      video: { standard: standardVideo, byok: byokVideo },
      voice: { standard: standardVoice, byok: byokVoice },
    }
  }, [selectedPreset, showCustom, customValues, byokVertexAI, byokElevenLabs])

  const totalStandardCredits = calculateCredits.images.standard + calculateCredits.video.standard + calculateCredits.voice.standard
  const totalByokCredits = calculateCredits.images.byok + calculateCredits.video.byok + calculateCredits.voice.byok
  const hasByokEnabled = byokVertexAI || byokElevenLabs
  const creditSavings = totalStandardCredits - totalByokCredits
  const estimatedCost = (totalByokCredits / 1000) * 8 // Rough $8 per 1000 credits

  const transparencyBody = t('calculator.transparency').replace(`${t('calculator.transparencyHighlight')} `, '')
  const byokDisclaimerBody = t('calculator.byokDisclaimer').replace(`${t('calculator.byokDisclaimerHighlight')} `, '')

  return (
    <div className="bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-800 p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="dashboard-widget-title text-xl font-bold text-white">{t('calculator.title')}</h3>
          <p className="text-sm text-gray-400">{t('calculator.subtitle')}</p>
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
            <div className="text-sm font-medium text-white mb-1">
              {t(`calculator.presets.${PRESET_INDEX[preset.id]}.name`)}
            </div>
            <div className="text-xs text-gray-400">{preset.duration} {t('calculator.minSuffix')}</div>
          </button>
        ))}
      </div>

      {/* Custom Toggle */}
      <button
        onClick={() => setShowCustom(!showCustom)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6"
      >
        <ChevronDown className={cn('w-4 h-4 transition-transform', showCustom && 'rotate-180')} />
        {t('calculator.customize')}
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
                <span>{t('calculator.imagesLabel')}</span>
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
                <span>{t('calculator.videoClipsLabel')}</span>
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
                <span>{t('calculator.voiceoverLabel')}</span>
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

      {/* BYOK Controls */}
      <div className="mb-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-purple-400">{t('calculator.byokTitle')}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">{t('calculator.byokBadge')}</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          {t('calculator.byokDescription')}
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-300">{t('calculator.vertexToggle')}</span>
            </div>
            <button
              onClick={() => setByokVertexAI(!byokVertexAI)}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors',
                byokVertexAI ? 'bg-purple-500' : 'bg-gray-700'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
                  byokVertexAI && 'translate-x-5'
                )}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-300">{t('calculator.elevenLabsToggle')}</span>
            </div>
            <button
              onClick={() => setByokElevenLabs(!byokElevenLabs)}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors',
                byokElevenLabs ? 'bg-purple-500' : 'bg-gray-700'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
                  byokElevenLabs && 'translate-x-5'
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-gray-800/50 rounded-xl p-5 mb-6">
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <ImageIcon className="w-4 h-4" />
              <span>{t('calculator.imageGeneration')}</span>
              {byokVertexAI && <span className="text-xs text-purple-400">{t('calculator.byokTag')}</span>}
            </div>
            <div className="text-right">
              {byokVertexAI && (
                <span className="text-xs text-gray-500 line-through mr-2">{calculateCredits.images.standard.toLocaleString()}</span>
              )}
              <span className="text-white font-medium">
                {calculateCredits.images.byok.toLocaleString()} {t('creditTopUps.creditsUnit')}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Film className="w-4 h-4" />
              <span>{t('calculator.videoGeneration')}</span>
              {byokVertexAI && <span className="text-xs text-purple-400">{t('calculator.byokTag')}</span>}
            </div>
            <div className="text-right">
              {byokVertexAI && (
                <span className="text-xs text-gray-500 line-through mr-2">{calculateCredits.video.standard.toLocaleString()}</span>
              )}
              <span className="text-white font-medium">
                {calculateCredits.video.byok.toLocaleString()} {t('creditTopUps.creditsUnit')}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Mic className="w-4 h-4" />
              <span>{t('calculator.voiceover')}</span>
              {byokElevenLabs && <span className="text-xs text-purple-400">{t('calculator.byokTag')}</span>}
            </div>
            <div className="text-right">
              {byokElevenLabs && (
                <span className="text-xs text-gray-500 line-through mr-2">{calculateCredits.voice.standard.toLocaleString()}</span>
              )}
              <span className="text-white font-medium">
                {calculateCredits.voice.byok.toLocaleString()} {t('creditTopUps.creditsUnit')}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-white">{t('calculator.totalEstimate')}</span>
            <div className="text-right">
              {hasByokEnabled && (
                <div className="text-xs text-gray-500 line-through mb-1">
                  {totalStandardCredits.toLocaleString()} {t('creditTopUps.creditsUnit')}
                </div>
              )}
              <div className="text-2xl font-bold text-emerald-400">
                {totalByokCredits.toLocaleString()} {t('creditTopUps.creditsUnit')}
              </div>
              <div className="text-sm text-gray-400">
                ≈ ${estimatedCost.toFixed(2)} {t('calculator.withTopUps')}
              </div>
            </div>
          </div>
          
          {/* BYOK Savings Display */}
          {hasByokEnabled && (
            <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-300">{t('calculator.creditSavings')}</span>
                <span className="text-lg font-bold text-purple-400">
                  -{creditSavings.toLocaleString()} {t('creditTopUps.creditsUnit')}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {t('calculator.savePercent', {
                  percent: Math.round((creditSavings / totalStandardCredits) * 100),
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transparency Message */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-sm text-gray-300">
          <span className="font-medium text-emerald-400">{t('calculator.transparencyHighlight')}</span>{' '}
          {transparencyBody}
        </div>
      </div>
      
      {/* BYOK Disclaimer */}
      {hasByokEnabled && (
        <div className="flex items-start gap-3 p-4 mt-4 rounded-lg bg-gray-800/50 border border-gray-700">
          <Info className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
          <div className="text-xs text-gray-400">
            <span className="font-medium text-gray-300">{t('calculator.byokDisclaimerHighlight')}</span>{' '}
            {byokDisclaimerBody}
          </div>
        </div>
      )}
    </div>
  )
}

export function PricingCredits() {
  const t = useTranslations('pricing')
  const tFooter = useTranslations('footer')
  const { data: session } = useSession()

  const handlePlanClick = useCallback((tierName: string) => {
    if (session?.user) {
      window.location.href = getBillingUrl({ tier: tierName, isAuthenticated: true })
      return
    }
    window.location.href = getSignupUrlForTier(tierName)
  }, [session])

  const byokDescriptionParts = t('byok.description').split(t('byok.savingsHighlight'))

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
            <span className="text-sm font-medium text-emerald-400">{t('badge')}</span>
          </div>
          
          <h2 className="landing-section-heading text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            {t('title')}
          </h2>
          
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
            {t('subtitle')}
          </p>
        </motion.div>

        {/* Tier grid (Explorer + subscriptions) */}
        <div className="mb-12">
          <PricingTierGrid onSelectTier={handlePlanClick} />
        </div>

        {/* Value Anchor - Industry Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto mb-12 p-4 rounded-xl bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-red-500/5 border border-amber-500/20"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 line-through text-lg">{t('valueAnchor.traditionalCost')}</span>
              <span className="text-xs text-gray-400">{t('valueAnchor.traditionalLabel')}</span>
            </div>
            <div className="hidden sm:block text-gray-600">{t('valueAnchor.vs')}</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-amber-400">{t('valueAnchor.sceneFlowCost')}</span>
              <span className="text-xs text-gray-400">{t('valueAnchor.sceneFlowLabel')}</span>
            </div>
            <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
              <span className="text-xs font-semibold text-emerald-400">{t('valueAnchor.saveBadge')}</span>
            </div>
          </div>
        </motion.div>

        {/* Enterprise & team CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-xl bg-gray-900/60 border border-gray-800">
              <Building2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div className="flex-1 text-left">
                <div className="text-white font-medium">{t('teamCta.title')}</div>
                <div className="text-sm text-gray-400">{t('teamCta.description')}</div>
              </div>
              <Button
                variant="outline"
                className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 shrink-0"
                onClick={() => { window.location.href = '/early-access' }}
              >
                {t('teamCta.button')}
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-xl bg-gray-900/60 border border-gray-800">
              <Users className="w-6 h-6 text-purple-400 shrink-0" />
              <div className="flex-1 text-left">
                <div className="text-white font-medium">{t('agencyCta.title')}</div>
                <div className="text-sm text-gray-400">{t('agencyCta.description')}</div>
              </div>
              <Button
                variant="outline"
                className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 shrink-0"
                onClick={() => { window.location.href = '/contact' }}
              >
                {t('agencyCta.button')}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* BYOK Value Proposition Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="max-w-4xl mx-auto">
            <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/20 via-gray-900 to-gray-900 p-8 lg:p-10">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* BYOK Header */}
                <div className="lg:w-1/2">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <Key className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{t('byok.title')}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">{t('byok.badge')}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-6">
                    {byokDescriptionParts[0]}
                    <span className="text-purple-400 font-semibold">{t('byok.savingsHighlight')}</span>
                    {byokDescriptionParts[1]}
                  </p>
                  
                  <div className="space-y-3">
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-white font-medium">{t(`byok.benefits.${index}.title`)}</span>
                          <p className="text-sm text-gray-400">{t(`byok.benefits.${index}.description`)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* BYOK Providers */}
                <div className="lg:w-1/2">
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">{t('byok.supportedProviders')}</h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/50 border border-gray-700/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Film className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <div className="text-white font-medium">{t('byok.vertexName')}</div>
                            <div className="text-xs text-gray-400">{t('byok.vertexDetail')}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-purple-400 font-medium">{t('byok.savingsLabel')}</div>
                          <div className="text-xs text-gray-500">{t('byok.onImagesVideo')}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/50 border border-gray-700/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                            <Mic className="w-5 h-5 text-violet-400" />
                          </div>
                          <div>
                            <div className="text-white font-medium">{t('byok.elevenLabsName')}</div>
                            <div className="text-xs text-gray-400">{t('byok.elevenLabsDetail')}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-purple-400 font-medium">{t('byok.savingsLabel')}</div>
                          <div className="text-xs text-gray-500">{t('byok.onVoiceover')}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 rounded-lg bg-gray-900/30 border border-gray-700/30">
                      <p className="text-xs text-gray-400">{t('byok.note')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
            <h3 className="text-2xl font-bold text-white mb-3">{t('creditTopUps.title')}</h3>
            <p className="text-gray-400">{t('creditTopUps.subtitle')}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {creditPacks.map((pack, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 hover:border-amber-500/30 transition-colors cursor-pointer"
                onClick={() => window.location.href = '/dashboard/settings/billing'}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span className="font-semibold text-white">{t(`creditTopUps.packs.${index}.label`)}</span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {pack.credits.toLocaleString()}{' '}
                  <span className="text-base text-gray-400 font-normal">{t('creditTopUps.creditsUnit')}</span>
                </div>
                <div className="text-lg text-amber-400 font-medium mb-2">${pack.price}</div>
                <div className="text-xs text-gray-500">{t(`creditTopUps.packs.${index}.description`)}</div>
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
            <h3 className="text-2xl font-bold text-white mb-3">{t('calculator.sectionTitle')}</h3>
            <p className="text-gray-400">{t('calculator.sectionSubtitle')}</p>
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
              <span>{t('trust.cancelAnytime')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>{t('trust.moneyBack')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>{t('trust.creditsNeverExpire')}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-6 max-w-md mx-auto">
            {tFooter('morLine')}
          </p>
        </motion.div>
      </div>
    </section>
  )
}

export default PricingCredits
