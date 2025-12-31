'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, X, Zap, Film, Clapperboard, Users, ChevronDown, ChevronUp, ArrowRight, Clock, DollarSign, Calculator, Layers, Volume2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({})
  const [purchasing, setPurchasing] = useState(false)
  const router = useRouter()

  const togglePlan = (planName: string) => {
    setExpandedPlans(prev => ({
      ...prev,
      [planName]: !prev[planName]
    }))
  }

  const handleTrialPurchase = async () => {
    setPurchasing(true)
    try {
      const res = await fetch('/api/subscription/purchase-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await res.json()
      
      if (data.success) {
        if (data.checkoutUrl) {
          // Redirect to Stripe checkout
          window.location.href = data.checkoutUrl
        } else if (data.redirectUrl) {
          // Demo mode - redirect to dashboard
          router.push(data.redirectUrl)
        }
      } else {
        alert(data.message || 'Purchase failed. Please try again.')
      }
    } catch (error) {
      console.error('Purchase error:', error)
      alert('Failed to initiate purchase. Please try again.')
    } finally {
      setPurchasing(false)
    }
  }

    const pricingTiers = [
    {
      name: 'Trial',
      monthlyPrice: 4.99,
      annualPrice: 4.99, // Same as monthly (one-time)
      isOneTime: true,
      description: 'Test Drive SceneFlow AI',
      tagline: 'Create your first animatic',
      credits: '1,500 Credits (one-time)',
      value: 'Full animatic + 2 draft scenes',
      storage: '1 GB',
      features: [
        '1,500 credits (never expire)',
        '~150 images + 3 Fast video scenes',
        '1 GB storage',
        'Gemini 2.5 Flash + Imagen 4',
        'Veo 3.1 Fast video drafts',
        'AI voiceover generation',
        'MP4 export',
        '1 active project',
        'Email support'
      ],
      excluded: [
        'One-time purchase only',
        'Veo Quality (4K)',
        'No collaboration features'
      ],
      popular: false,
      color: 'from-amber-500 to-orange-600',
      badge: 'Best for Evaluation'
    },
    {
      name: 'Starter',
      monthlyPrice: 49,
      annualPrice: 41, // ~17% discount
      description: 'For Animatic Creators & Short-Form',
      credits: '4,500 Credits/mo',
      storage: '25 GB',
      features: [
        '4,500 monthly credits',
        '~300 images + 20 Fast video scenes',
        '25 GB active storage',
        'Unlimited Ken Burns animatics',
        'MP4 export (any resolution)',
        'Multi-language voiceover',
        'Background music library',
        'Gemini 2.5 Flash + Imagen 4',
        'Veo 3.1 Fast video drafts',
        'Email support'
      ],
      excluded: [
        'Veo Quality (4K)',
        'Team collaboration',
        'Character consistency engine'
      ],
      popular: false,
      color: 'from-gray-500 to-gray-600',
      badge: 'Best for Animatics'
    },
    {
      name: 'Pro',
      monthlyPrice: 149,
      annualPrice: 124, // ~17% discount
      description: 'For Freelancers & YouTubers',
      credits: '15,000 Credits/mo',
      storage: '500 GB',
      features: [
        '15,000 monthly credits',
        '~1,000 images + 50 Fast + 3 Quality (4K) scenes',
        '500 GB active storage',
        'Veo 3.1 Quality (4K) ✨',
        'Character consistency engine',
        'Custom voice cloning',
        'Gemini 2.5 Pro + Imagen 4',
        'MP4 export (any resolution)',
        '3 collaboration seats',
        'Priority support'
      ],
      excluded: [
        'Beta AI models',
        'API access',
        'Dedicated manager'
      ],
      popular: true,
      popularBadge: 'Most Popular',
      color: 'from-blue-500 to-purple-600'
    },
    {
      name: 'Studio',
      monthlyPrice: 599,
      annualPrice: 499, // ~17% discount
      description: 'For Agencies & Production Teams',
      credits: '75,000 Credits/mo',
      storage: '2 TB',
      features: [
        '75,000 monthly credits',
        'Full 150-scene movie capacity',
        '2 TB active storage',
        'Veo 3.1 Quality (4K) unlimited ✨',
        'White-label exports',
        'Gemini 2.5 Pro + Beta models',
        'Imagen 4 unlimited',
        '10 collaboration seats',
        'Dedicated account manager',
        'API access',
        'SLA guarantee'
      ],
      excluded: [],
      popular: false,
      color: 'from-purple-500 to-pink-600'
    }
  ]

  const creditPacks = [
    { credits: 2500, price: 25, bonus: 0, label: 'Quick Fix', description: '1-2 Quality (4K) finals or ~12 Fast drafts' },
    { credits: 7500, price: 60, bonus: 0, label: 'Scene Pack', description: '~40 Veo Fast scenes + revisions' },
    { credits: 25000, price: 180, bonus: 0, label: 'Feature Boost', description: 'Complete a major movie sequence' }
  ]

  const creditExamples = [
    {
      projectType: 'Animatic (Ken Burns)',
      credits: '~100 credits',
      examples: '~45 animatics with Starter plan'
    },
    {
      projectType: 'Short Film (Fast)',
      credits: '~30,000 credits', 
      examples: '10 scenes, ~200 video clips'
    },
    {
      projectType: 'Short Film + 4K Upscale',
      credits: '~33,000 credits',
      examples: 'Fast + AI upscale (recommended)'
    },
    {
      projectType: 'Feature Film (Fast)',
      credits: '~180,000 credits',
      examples: '60 scenes, ~1,200 video clips'
    }
  ]

  return (
    <section id="pricing" className="py-24 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cost Comparison Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 rounded-2xl p-6 sm:p-8 mb-16 max-w-4xl mx-auto border border-slate-700/50"
        >
          <h3 className="text-xl sm:text-2xl font-bold text-center mb-2 text-white">
            Why Creators Choose SceneFlow AI
          </h3>
          <p className="text-gray-400 text-center text-sm mb-6">
            Replace complexity with one streamlined platform
          </p>
          
          {/* Feature Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="text-center p-5 sm:p-6 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <Clock className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
              <div className="text-lg font-bold text-white mb-1">Hours, Not Months</div>
              <div className="text-sm text-gray-400">
                Go from script to published video in a single session
              </div>
            </div>
            
            <div className="text-center p-5 sm:p-6 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <Layers className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <div className="text-lg font-bold text-white mb-1">One Platform</div>
              <div className="text-sm text-gray-400">
                No tool-juggling—script, visuals, voice, music all integrated
              </div>
            </div>
            
            <div className="text-center p-5 sm:p-6 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Zap className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
              <div className="text-lg font-bold text-white mb-1">AI-Powered Quality</div>
              <div className="text-sm text-gray-400">
                Professional results without professional equipment
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="mt-6 pt-6 border-t border-slate-700/50 flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-cyan-500" />
              <span className="text-gray-300"><strong className="text-cyan-400">Full</strong> video production</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500" />
              <span className="text-gray-300"><strong className="text-purple-400">Consistent</strong> AI characters</span>
            </div>
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-amber-500" />
              <span className="text-gray-300"><strong className="text-amber-400">Professional</strong> voiceover</span>
            </div>
          </div>
          
          {/* CTA to Value Calculator */}
          <div className="mt-6 text-center">
            <a 
              href="#value-calculator" 
              className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('value-calculator')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Calculator className="w-4 h-4" />
              Calculate your total savings (cost + time + expertise)
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 text-white">
            Choose Your{' '}
            <span className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
              Production Plan
            </span>
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            From hobbyists to professional studios—start free and scale as you grow.
          </p>
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center mb-12"
        >
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-1 flex items-center border border-white/5">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                !isAnnual
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                isAnnual
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Annual
              <span className="ml-2 text-amber-400 text-sm">Save 17%</span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards - Single Row Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`relative rounded-2xl p-8 border-2 transition-all duration-300 flex flex-col h-full ${
                tier.popular
                  ? 'border-orange-500 bg-gradient-to-br from-gray-800 to-gray-900 scale-105 shadow-2xl'
                  : tier.special === 'Trial'
                  ? 'border-green-500 bg-gradient-to-br from-gray-800 to-gray-900'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
                                {/* Plan Label - Positioned above title with proper spacing */}
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-1 rounded-full text-xs font-semibold flex items-center">
                      <Film className="w-3 h-3 mr-1" />
                      Most Popular
                    </div>
                  </div>
                )}
                {tier.badge && !tier.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-amber-500/20 to-orange-600/20 text-amber-400 px-3 py-1 rounded-full text-xs font-semibold border border-amber-500/30">
                      {tier.badge}
                    </div>
                  </div>
                )}

                <div className="text-center mb-6 flex-shrink-0">
                  <h3 className="text-xl font-bold mb-3 text-white">{tier.name}</h3>
                  
                                    {tier.special === 'Trial' ? (
                    // Trial Run - Clean Value Proposition
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold text-sf-accent mb-3">{tier.headline}</h4>                                                            
                      <div className="flex items-baseline justify-center mb-3">
                        <span className="text-3xl font-bold text-sf-accent">${tier.monthlyPrice}</span>                                                         
                      </div>
                      <p className="text-gray-300 text-sm mb-2">{tier.description}</p>                                                                          
                      <p className="text-sf-primary font-medium text-sm">{tier.credits}</p>                                                                     
                    </div>
                  ) : tier.isOneTime ? (
                    // Trial Plan - One-time purchase
                    <div className="mb-4">
                      {tier.badge && (
                        <div className="inline-block mb-2">
                          <div className="bg-gradient-to-r from-amber-500/20 to-orange-600/20 text-amber-400 px-3 py-1 rounded-full text-xs font-semibold border border-amber-500/30">
                            {tier.badge}
                          </div>
                        </div>
                      )}
                      <p className="text-lg font-semibold text-amber-400 mb-2">{tier.tagline}</p>
                                            <div className="flex items-baseline justify-center mb-3">
                        <span className="text-3xl font-bold text-amber-400" title="One-time purchase, no subscription required">${tier.monthlyPrice}</span>                                                         
                        <span className="text-gray-400 ml-2 text-sm">one-time</span>                                                                            
                      </div>
                      <p className="text-xs text-gray-500 mt-1">One-time purchase, no subscription required</p>
                      <p className="text-gray-300 text-sm mb-1">{tier.description}</p>                                                                          
                      <p className="text-sf-primary font-medium text-sm mb-1">{tier.credits}</p>
                      {tier.value && (
                        <p className="text-amber-400 font-medium text-xs">{tier.value}</p>
                      )}
                    </div>
                  ) : (
                    // Regular pricing tiers
                    <div>
                      <div className="flex items-baseline justify-center mb-3">
                        <span className="text-3xl font-bold text-white">${isAnnual ? tier.annualPrice : tier.monthlyPrice}</span>                               
                        <span className="text-gray-400 ml-2">/mo</span>
                      </div>
                      <p className="text-gray-300 text-sm mb-2">{tier.description}</p>                                                                          
                      <p className="text-sf-primary font-medium text-sm">{tier.credits}</p>                                                                     
                    </div>
                  )}
                </div>

                {/* Show/Hide Controls for Features */}
                <div className="text-center mb-4">
                  <button
                    onClick={() => togglePlan(tier.name)}
                    className="flex items-center justify-center w-full text-sf-primary hover:text-sf-accent transition-colors duration-200 text-sm font-medium"
                  >
                    {expandedPlans[tier.name] ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-1" />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-1" />
                        Show Details
                      </>
                    )}
                  </button>
                </div>

                {/* Expanded Features Section */}
                {expandedPlans[tier.name] && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 mb-6"
                  >
                    <div className="space-y-3">
                      <h4 className="font-semibold text-base mb-3 text-white">What&apos;s Included:</h4>
                      {tier.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center space-x-3">
                          <CheckCircle className="w-4 h-4 text-sf-accent flex-shrink-0" />
                          <span className="text-gray-300 text-sm">{feature}</span>
                        </div>
                      ))}
                      
                      {tier.excluded.length > 0 && (
                        <>
                          <h4 className="font-semibold text-base mb-3 mt-4 text-white">Not Included:</h4>
                          {tier.excluded.map((feature, featureIndex) => (
                            <div key={featureIndex} className="flex items-center space-x-3">
                              <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                              <span className="text-gray-400 text-sm">{feature}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>

                    {tier.special === 'Trial' && tier.note && (
                      <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                        <p className="text-sm text-yellow-300 text-center leading-relaxed">{tier.note}</p>
                      </div>
                    )}
                  </motion.div>
                )}

                                <button 
                  onClick={() => {
                    if (tier.isOneTime && tier.name === 'Trial') {
                      handleTrialPurchase()
                    } else if (tier.special === 'Trial') {
                      window.location.href = '/?signup=1&plan=trial'
                    } else {
                      window.location.href = `/?signup=1&plan=${tier.name.toLowerCase().replace(/\s/g, '-')}`                                                   
                    }
                  }}
                  disabled={purchasing && tier.name === 'Trial'}
                  className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-auto ${
                    tier.isOneTime && tier.name === 'Trial'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white'
                      : tier.popular
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white'
                      : tier.special === 'Trial'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-sf-background'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  {purchasing && tier.name === 'Trial' 
                    ? 'Processing...' 
                    : tier.isOneTime && tier.name === 'Trial'
                    ? 'Start Testing'
                    : tier.special === 'Trial' 
                    ? tier.cta 
                    : `Start ${tier.name} Plan`}
                </button>
              </motion.div>
                        ))}
          </div>

        {/* Feature Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-20"
        >
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 rounded-2xl p-6 sm:p-8 border border-slate-700/50">
            <div className="text-center mb-8">
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">Compare Plans at a Glance</h3>
              <p className="text-gray-400 text-sm">All the features you need to bring your vision to life</p>
            </div>
            
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-4 px-4 text-gray-400 font-medium">Feature</th>
                    <th className="text-center py-4 px-4 text-amber-400 font-medium">Trial</th>
                    <th className="text-center py-4 px-4 text-gray-300 font-medium">Starter</th>
                    <th className="text-center py-4 px-4 text-blue-400 font-medium">Pro <span className="text-xs bg-blue-500/20 px-2 py-0.5 rounded-full">Popular</span></th>
                    <th className="text-center py-4 px-4 text-purple-400 font-medium">Studio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  <tr className="hover:bg-slate-700/20 transition-colors">
                    <td className="py-4 px-4 text-gray-300">Credits</td>
                    <td className="py-4 px-4 text-center text-white">1,200 (one-time)</td>
                    <td className="py-4 px-4 text-center text-white">4,500/mo</td>
                    <td className="py-4 px-4 text-center text-white font-medium">15,000/mo</td>
                    <td className="py-4 px-4 text-center text-white">75,000/mo</td>
                  </tr>
                  <tr className="hover:bg-slate-700/20 transition-colors">
                    <td className="py-4 px-4 text-gray-300">Storage</td>
                    <td className="py-4 px-4 text-center text-white">10 GB</td>
                    <td className="py-4 px-4 text-center text-white">25 GB</td>
                    <td className="py-4 px-4 text-center text-white font-medium">500 GB</td>
                    <td className="py-4 px-4 text-center text-white">2 TB</td>
                  </tr>
                  <tr className="hover:bg-slate-700/20 transition-colors">
                    <td className="py-4 px-4 text-gray-300">Video Quality</td>
                    <td className="py-4 px-4 text-center text-white">Fast Only</td>
                    <td className="py-4 px-4 text-center text-white">Fast Only</td>
                    <td className="py-4 px-4 text-center text-white font-medium">Fast + Quality (4K) ✨</td>
                    <td className="py-4 px-4 text-center text-white">Fast + Quality (4K) ✨</td>
                  </tr>
                  <tr className="hover:bg-slate-700/20 transition-colors">
                    <td className="py-4 px-4 text-gray-300">Collaboration Seats</td>
                    <td className="py-4 px-4 text-center"><X className="w-5 h-5 text-gray-500 mx-auto" /></td>
                    <td className="py-4 px-4 text-center"><X className="w-5 h-5 text-gray-500 mx-auto" /></td>
                    <td className="py-4 px-4 text-center text-white font-medium">3</td>
                    <td className="py-4 px-4 text-center text-white">10</td>
                  </tr>
                  <tr className="hover:bg-slate-700/20 transition-colors">
                    <td className="py-4 px-4 text-gray-300">Support</td>
                    <td className="py-4 px-4 text-center text-white">Email</td>
                    <td className="py-4 px-4 text-center text-white">Email</td>
                    <td className="py-4 px-4 text-center text-white font-medium">Priority</td>
                    <td className="py-4 px-4 text-center text-white">Dedicated Manager</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {[
                { feature: 'Credits', values: ['1,200 (one-time)', '4,500/mo', '15,000/mo', '75,000/mo'] },
                { feature: 'Storage', values: ['10 GB', '25 GB', '500 GB', '2 TB'] },
                { feature: 'Video Quality', values: ['Fast Only', 'Fast Only', 'Fast + 4K', 'Fast + 4K'] },
                { feature: 'Collaboration', values: ['—', '—', '3 seats', '10 seats'] },
              ].map((row, idx) => (
                <div key={idx} className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">{row.feature}</h4>
                  <div className="grid grid-cols-4 gap-2 text-xs text-center">
                    <div>
                      <div className="text-amber-400 mb-1">Trial</div>
                      <div className="text-white">{row.values[0]}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">Starter</div>
                      <div className="text-white">{row.values[1]}</div>
                    </div>
                    <div>
                      <div className="text-blue-400 mb-1">Pro</div>
                      <div className="text-white font-medium">{row.values[2]}</div>
                    </div>
                    <div>
                      <div className="text-purple-400 mb-1">Studio</div>
                      <div className="text-white">{row.values[3]}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Credit Usage Examples */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-20"
        >
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-8 border border-gray-700">
            <div className="text-center mb-10">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-sf-primary/20 to-sf-accent/20 text-sf-primary rounded-full text-sm font-medium mb-4 border border-sf-primary/30">
                <Clapperboard className="w-4 h-4 mr-2" />
                Credit System
              </div>
              <h3 className="text-3xl font-bold mb-4 text-white">How Credits Work for Filmmaking</h3>
              <p className="text-lg text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Our credit system is designed to support filmmakers at every level, from short content to feature-length productions. Each project type has been carefully calibrated to provide fair value for your creative work.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {creditExamples.map((example, index) => {
                // Define semantic colors for each credit type
                const iconColors = [
                  'from-blue-500 to-blue-600',      // Short Film - Quick, accessible
                  'from-emerald-500 to-emerald-600', // Medium Film - Growing, developing
                  'from-orange-500 to-orange-600',   // Long Film - Ambitious, feature-length
                  'from-purple-500 to-purple-600'    // AI Story Generation - Creative, AI-powered
                ]
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.7 + index * 0.1 }}
                    className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300 group hover:scale-105 hover:shadow-xl"
                  >
                    <div className="text-center">
                      <div className={`w-14 h-14 bg-gradient-to-r ${iconColors[index]} rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                        <Clapperboard className="w-7 h-7 text-white" />
                      </div>
                      <h4 className="text-lg font-semibold mb-3 text-white group-hover:text-sf-primary transition-colors duration-300">{example.projectType}</h4>
                      <p className="text-sf-primary font-medium mb-3 text-lg">{example.credits}</p>
                      <p className="text-gray-300 text-sm leading-relaxed">{example.examples}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-8"
        >
          <p className="text-sm text-gray-400 max-w-2xl mx-auto">
            Need more credits? Purchase Top Up credit packs anytime from your dashboard.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="text-center mt-8"
        >
          <p className="text-sm text-gray-400 max-w-2xl mx-auto">
            All AI generation (Gemini, Imagen 4, Veo 3.1, ElevenLabs) is included in your credits.
            Higher resolution outputs and video generation use more credits. Select &quot;Fast&quot; mode in settings for lower credit usage.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="text-center mt-6"
        >
          <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl p-4 max-w-3xl mx-auto">
            <p className="text-sm text-emerald-400 font-medium mb-1">
              💡 Pro Tip: Generate with Veo 3.1 Fast + AI Upscale to 4K
            </p>
            <p className="text-xs text-gray-400">
              Save up to 80% by using Fast quality and adding optional 4K upscaling (15 credits/clip).
              Perfect for social media and streaming platforms.
            </p>
          </div>
        </motion.div>

        {/* Payment & Compliance Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 1.1 }}
          className="text-center mt-8"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-gray-400">Secure Payments</span>
          </div>
          <p className="text-xs text-gray-500 max-w-lg mx-auto">
            Payments processed by our authorized Merchant of Record, who handles tax calculation and compliance.
            All major credit cards accepted. Prices shown exclude applicable taxes.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
