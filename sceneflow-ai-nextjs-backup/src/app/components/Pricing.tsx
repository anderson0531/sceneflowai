'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, X, Zap } from 'lucide-react'

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false)

  const pricingTiers = [
    {
      name: 'Trial Run',
      monthlyPrice: 5, 
      annualPrice: 5, 
      description: 'For Serious Creators', 
      credits: '50 Credits (One-Time)',
      headline: 'Unlock Professional Storyboarding for the Price of a Latte',
      body: 'Test drive the complete SceneFlow AI suite. For just $5, you get 7 days of full access to our Ideation, Storyboarding, and Scene Direction tools. Visualize your next project and revolutionize your pre-production workflow.',
      features: [
        '7-Day access to Creator features', 
        '1080p Max rendering', 
        'Standard Analysis', 
        'BYOK Generation', 
        'Email Support'
      ],
      excluded: [
        '4K Video Generation', 
        'Advanced Analytics', 
        'Team Collaboration', 
        'Priority Support'
      ],
      popular: false, 
      color: 'from-green-500 to-emerald-600', 
      special: 'Trial', 
      note: 'Why $5? Our professional-grade AI visualization requires significant GPU power. This small fee helps us cover operational costs and ensures dedicated, high-speed access for serious creators.',
      cta: 'Start My 7-Day Full Access Trial ($5)'
    },
    {
      name: 'Creator',
      monthlyPrice: 29,
      annualPrice: 23,
      description: 'For Solo Creators, Novices',
      credits: '150 Credits/mo',
      features: [
        '1080p Rendering',
        'Standard Analysis',
        'BYOK Generation',
        'Multilingual Support',
        'Email Support',
        'Basic Templates'
      ],
      excluded: [
        '4K Video Generation',
        'Advanced Analytics',
        'Team Collaboration',
        'Priority Support'
      ],
      popular: false,
      color: 'from-gray-500 to-gray-600'
    },
    {
      name: 'Pro',
      monthlyPrice: 79,
      annualPrice: 63,
      description: 'For Freelancers, Pro Creators',
      credits: '500 Credits/mo',
      features: [
        '4K Rendering',
        'Advanced Multimodal Analysis',
        '5 Team Members',
        'Downloadable Direction Packages',
        'Priority Support',
        'Advanced Templates',
        'Analytics Dashboard',
        'Custom Integrations'
      ],
      excluded: [
        'Dedicated Account Manager',
        'White-label options'
      ],
      popular: true,
      color: 'from-blue-500 to-purple-600'
    },
    {
      name: 'Studio',
      monthlyPrice: 249,
      annualPrice: 199,
      description: 'For Agencies, Teams',
      credits: '1600 Credits/mo',
      features: [
        'All Pro features',
        'Priority Rendering',
        'Queue Management',
        'Team Management Dashboard',
        'Dedicated Account Manager',
        'White-label options',
        'API Access',
        'Custom Workflows'
      ],
      excluded: [],
      popular: false,
      color: 'from-purple-500 to-pink-600'
    }
  ]

  return (
    <section id="pricing" className="py-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl font-bold mb-6">Choose Your Creative Journey</h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            From trial to enterprise, we have the perfect plan to match your creative ambitions and scale with your success.
          </p>
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center mb-16"
        >
          <div className="bg-gray-800 rounded-lg p-1 flex items-center">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                !isAnnual
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                isAnnual
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Annual
              <span className="ml-2 text-green-400 text-sm">Save 20%</span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`relative rounded-2xl p-6 border-2 transition-all duration-300 ${
                tier.popular
                  ? 'border-blue-500 bg-gradient-to-br from-gray-800 to-gray-900 scale-105 shadow-2xl'
                  : tier.special === 'Trial'
                  ? 'border-green-500 bg-gradient-to-br from-gray-800 to-gray-900'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                </div>
              )}
              
              {tier.special === 'Trial' && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center">
                    <Zap className="w-4 h-4 mr-2" />
                    Trial Run
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                
                {tier.special === 'Trial' ? (
                  // Trial Run - Value Exchange Messaging
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold text-green-400 mb-2">{tier.headline}</h4>
                    <p className="text-gray-300 text-sm leading-relaxed mb-3">{tier.body}</p>
                    <div className="flex items-baseline justify-center mb-2">
                      <span className="text-3xl font-bold text-green-400">${tier.monthlyPrice}</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">{tier.description}</p>
                    <p className="text-green-400 font-medium text-sm">{tier.credits}</p>
                  </div>
                ) : (
                  // Regular pricing tiers
                  <div>
                    <div className="flex items-baseline justify-center mb-2">
                      <span className="text-3xl font-bold">${isAnnual ? tier.annualPrice : tier.monthlyPrice}</span>
                      <span className="text-gray-400 ml-1">/mo</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">{tier.description}</p>
                    <p className="text-blue-400 font-medium text-sm">{tier.credits}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-6">
                <h4 className="font-semibold text-base mb-2">What&apos;s Included:</h4>
                {tier.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300 text-xs">{feature}</span>
                  </div>
                ))}
                
                {tier.excluded.length > 0 && (
                  <>
                    <h4 className="font-semibold text-base mb-2 mt-4">Not Included:</h4>
                    {tier.excluded.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center space-x-2">
                        <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span className="text-gray-500 text-xs">{feature}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {tier.special === 'Trial' && tier.note && (
                <div className="mb-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                  <p className="text-xs text-yellow-300 text-center leading-relaxed">{tier.note}</p>
                </div>
              )}

              <button className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 ${
                tier.popular
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                  : tier.special === 'Trial'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                  : 'bg-gray-700 hover:bg-gray-600'
              } text-white`}>
                {tier.special === 'Trial' ? tier.cta : `Start ${tier.name} Plan`}
              </button>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-8"
        >
          <p className="text-sm text-gray-400 max-w-2xl mx-auto">
            Need more credits? Purchase additional credit packs (e.g., $10 for 100 credits).
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-8"
        >
          <p className="text-sm text-gray-400 max-w-2xl mx-auto">
            Image and Video generation requires a Google Gemini API Key (BYOK). Generation costs are billed directly by Google.
            SceneFlow AI subscription covers platform access and AI workflow tools.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
