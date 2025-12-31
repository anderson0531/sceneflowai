'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Building2, GraduationCap, ChevronRight } from 'lucide-react'

const audiences = [
  {
    id: 'creator',
    icon: Sparkles,
    label: 'Content Creator',
    description: 'YouTube, TikTok, Social Media',
    highlight: 'Ship 10x more content',
    color: 'amber',
    gradient: 'from-amber-500 to-orange-500',
    bgGlow: 'bg-amber-500/20',
    borderActive: 'border-amber-500',
    textColor: 'text-amber-500',
  },
  {
    id: 'agency',
    icon: Building2,
    label: 'Agency / Studio',
    description: 'Client work, commercials',
    highlight: 'Reduce production costs',
    color: 'cyan',
    gradient: 'from-cyan-500 to-blue-500',
    bgGlow: 'bg-cyan-500/20',
    borderActive: 'border-cyan-500',
    textColor: 'text-cyan-500',
  },
  {
    id: 'filmmaker',
    icon: GraduationCap,
    label: 'Indie Filmmaker',
    description: 'Short films, features',
    highlight: 'Create faster than ever',
    color: 'purple',
    gradient: 'from-purple-500 to-pink-500',
    bgGlow: 'bg-purple-500/20',
    borderActive: 'border-purple-500',
    textColor: 'text-purple-500',
  },
]

export function AudienceSelector() {
  const [selected, setSelected] = useState<string | null>(null)

  const scrollToPricing = () => {
    const element = document.getElementById('pricing')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="py-16 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            I&apos;m a...
          </h3>
          <p className="text-gray-400 text-sm">
            Select your role to see personalized benefits
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {audiences.map(({ id, icon: Icon, label, description, highlight, gradient, bgGlow, borderActive, textColor }, index) => {
            const isSelected = selected === id
            
            return (
              <motion.button
                key={id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onClick={() => setSelected(id)}
                className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-left group ${
                  isSelected
                    ? `${borderActive} ${bgGlow}`
                    : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
                }`}
              >
                {/* Glow effect when selected */}
                {isSelected && (
                  <div className={`absolute inset-0 ${bgGlow} blur-xl rounded-2xl opacity-50`} />
                )}
                
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${
                    isSelected ? `bg-gradient-to-r ${gradient}` : 'bg-slate-700'
                  }`}>
                    <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  
                  <div className="font-semibold text-white text-lg mb-1">{label}</div>
                  <div className="text-sm text-gray-400 mb-3">{description}</div>
                  
                  <div className={`text-sm font-medium ${isSelected ? textColor : 'text-gray-500'}`}>
                    ✓ {highlight}
                  </div>
                </div>
                
                {/* Selection indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`absolute top-3 right-3 w-6 h-6 rounded-full bg-gradient-to-r ${gradient} flex items-center justify-center`}
                  >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                )}
              </motion.button>
            )
          })}
        </div>

        {/* CTA when selected */}
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-8 text-center"
          >
            <button
              onClick={scrollToPricing}
              className={`inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-black transition-all hover:shadow-lg ${
                selected === 'creator' ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-amber-500/25' :
                selected === 'agency' ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-cyan-500/25' :
                'bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-purple-500/25'
              }`}
            >
              See My Perfect Plan
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </div>
    </section>
  )
}

export default AudienceSelector
