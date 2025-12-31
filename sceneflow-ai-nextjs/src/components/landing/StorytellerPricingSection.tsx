'use client'

import { motion } from 'framer-motion'
import { 
  Check, 
  Zap, 
  Film, 
  Sparkles,
  ArrowRight,
  Clock,
  Infinity
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface PricingTier {
  id: string
  name: string
  tagline: string
  price: string
  period: string
  highlight?: boolean
  highlightLabel?: string
  icon: React.ElementType
  accentColor: string
  features: string[]
  cta: string
  ctaVariant: 'primary' | 'outline'
}

const pricingTiers: PricingTier[] = [
  {
    id: 'storyteller',
    name: 'Storyteller',
    tagline: 'For digital storytellers & podcasters',
    price: '$29',
    period: '/month',
    highlight: true,
    highlightLabel: 'Most Popular',
    icon: Zap,
    accentColor: 'amber',
    features: [
      'Unlimited script generation',
      'Unlimited Ken Burns animatics',
      'AI voiceover (50 min/month)',
      'Background music library',
      '4K export quality',
      'Screening Room collaboration',
      '10 video credits included',
    ],
    cta: 'Start Free Trial',
    ctaVariant: 'primary'
  },
  {
    id: 'producer',
    name: 'Producer',
    tagline: 'For serious content operations',
    price: '$79',
    period: '/month',
    icon: Film,
    accentColor: 'purple',
    features: [
      'Everything in Storyteller, plus:',
      'Unlimited AI voiceover',
      'Character consistency engine',
      'Custom voice cloning',
      'Priority rendering queue',
      'API access for automation',
      '50 video credits included',
    ],
    cta: 'Contact Sales',
    ctaVariant: 'outline'
  },
  {
    id: 'studio',
    name: 'Studio',
    tagline: 'For agencies & production teams',
    price: 'Custom',
    period: '',
    icon: Sparkles,
    accentColor: 'blue',
    features: [
      'Everything in Producer, plus:',
      'Unlimited video credits',
      'White-label exports',
      'Team collaboration (5 seats)',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
    ],
    cta: 'Talk to Us',
    ctaVariant: 'outline'
  }
]

const creditExplainer = [
  { action: 'Script generation', cost: 'Free', icon: '📝' },
  { action: 'Ken Burns animatic', cost: 'Free', icon: '🎬' },
  { action: 'AI voiceover', cost: 'Free*', icon: '🎙️' },
  { action: 'Full AI video scene', cost: '1 credit', icon: '✨' },
]

export function StorytellerPricingSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-gray-900 to-gray-950 relative">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider text-green-400 bg-green-500/10 rounded-full mb-4">
            SIMPLE PRICING
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Start Free, Scale as You Grow
          </h2>
          <p className="text-lg text-gray-400">
            Animatics are always included. Only pay for full AI video when you need it.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto mb-16">
          {pricingTiers.map((tier, idx) => {
            const TierIcon = tier.icon
            const isHighlighted = tier.highlight
            
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className={`
                  relative rounded-2xl p-6 lg:p-8 flex flex-col
                  ${isHighlighted 
                    ? 'bg-gradient-to-b from-amber-900/30 to-gray-800 border-2 border-amber-500/50 shadow-2xl shadow-amber-500/10' 
                    : 'bg-gray-800/50 border border-gray-700'
                  }
                `}
              >
                {/* Highlight Badge */}
                {isHighlighted && tier.highlightLabel && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 text-xs font-bold text-amber-900 bg-amber-400 rounded-full">
                      {tier.highlightLabel}
                    </span>
                  </div>
                )}
                
                {/* Icon & Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center
                    ${tier.accentColor === 'amber' ? 'bg-amber-500/20 text-amber-400' : ''}
                    ${tier.accentColor === 'purple' ? 'bg-purple-500/20 text-purple-400' : ''}
                    ${tier.accentColor === 'blue' ? 'bg-blue-500/20 text-blue-400' : ''}
                  `}>
                    <TierIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                    <p className="text-xs text-gray-400">{tier.tagline}</p>
                  </div>
                </div>
                
                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{tier.price}</span>
                  <span className="text-gray-400 text-sm">{tier.period}</span>
                </div>
                
                {/* Features */}
                <ul className="space-y-3 mb-8 flex-grow">
                  {tier.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-3">
                      <Check className={`
                        w-4 h-4 mt-0.5 flex-shrink-0
                        ${tier.accentColor === 'amber' ? 'text-amber-400' : ''}
                        ${tier.accentColor === 'purple' ? 'text-purple-400' : ''}
                        ${tier.accentColor === 'blue' ? 'text-blue-400' : ''}
                      `} />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {/* CTA */}
                <Button 
                  className={`
                    w-full py-6
                    ${tier.ctaVariant === 'primary' && tier.accentColor === 'amber'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white'
                      : 'border-gray-600 text-white hover:bg-gray-700'
                    }
                  `}
                  variant={tier.ctaVariant === 'outline' ? 'outline' : 'default'}
                >
                  {tier.cta}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )
          })}
        </div>

        {/* Credit System Explainer */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-center text-lg font-semibold text-white mb-6">
            How Credits Work
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {creditExplainer.map((item) => (
              <div 
                key={item.action}
                className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 text-center"
              >
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-xs text-gray-400 mb-1">{item.action}</div>
                <div className="text-sm font-semibold text-white">{item.cost}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-500 text-xs mt-4">
            * AI voiceover included up to plan limits. Full AI video generation uses 1 credit per scene.
          </p>
        </div>
      </div>
    </section>
  )
}
