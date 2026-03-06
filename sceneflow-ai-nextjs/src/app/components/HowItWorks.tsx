'use client'

import { motion } from 'framer-motion'
import { Lightbulb, Film, Scissors, Rocket, ArrowRight, Clapperboard } from 'lucide-react'

export function HowItWorks() {
  const steps = [
    {
      icon: <Clapperboard className="w-10 h-10" />,
      title: '1. Series',
      subtitle: 'Showrunner Engine',
      description: 'Transform a single idea into a multi-episode franchise. The Series Studio manages long-form narrative arcs and maintains total visual continuity across up to 40 episodes with a shared Production Bible.',
      color: 'from-purple-500 to-cyan-600',
      borderColor: 'border-purple-500/30',
    },
    {
      icon: <Lightbulb className="w-10 h-10" />,
      title: '2. Blueprint',
      subtitle: 'Story Development',
      description: 'AI-assisted ideation with proprietary Audience Resonance™ scoring. Get automated story fixes, professional script generation, and industry-standard exports—then refine every detail through guided dialogs.',
      color: 'from-cyan-500 to-cyan-600',
      borderColor: 'border-cyan-500/30',
    },
    {
      icon: <Film className="w-10 h-10" />,
      title: '3. Production',
      subtitle: 'Your Creative Bible',
      description: 'Production Bible locks character, wardrobe, and location references for frame-perfect consistency. 800+ premium voices with cloning. Imagen 4 storyboards flow to Veo 3 video—each frame AI-generated, each cut director-approved.',
      color: 'from-amber-500 to-amber-600',
      borderColor: 'border-amber-500/30',
    },
    {
      icon: <Scissors className="w-10 h-10" />,
      title: '4. Final Cut',
      subtitle: 'Professional Editor',
      description: 'Full NLE timeline with transitions, overlays, and multi-track audio mixing. Import external clips, add reusable intros and ads, upscale to 4K/8K with Topaz AI. Every automation has an override—you\'re always in control.',
      color: 'from-emerald-500 to-teal-600',
      borderColor: 'border-emerald-500/30',
    },
    {
      icon: <Rocket className="w-10 h-10" />,
      title: '5. Premiere',
      subtitle: 'Audience Intelligence',
      description: 'Screening Room with Audience Resonance™ scoring—get critical analysis before you publish. Automated publishing generates titles, descriptions, and promo clips. One-click export to YouTube, Vimeo, and beyond.',
      color: 'from-amber-500 to-orange-600',
      borderColor: 'border-amber-500/30',
    },
  ]
  
  return (
    <section id="how-it-works" className="py-24 bg-slate-950 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.05),transparent_70%)]" />
      
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="landing-section-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-4">
            Five Phases to{' '}
            <span className="landing-gradient-text bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
              Cinematic Excellence
            </span>
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto mb-4">
            Our streamlined workflow takes you from initial concept to finished film in record time.
          </p>
          <p className="text-cyan-400 font-medium text-sm md:text-base">
            Every step is expertly automated. Every step gives you full control.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 xl:gap-5">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
              className="relative group"
            >
              {/* Card */}
              <div className={`relative h-full bg-slate-900/50 backdrop-blur-sm rounded-2xl p-5 border ${step.borderColor} hover:border-opacity-60 transition-all duration-300`}>
                {/* Step Number Badge */}
                <div className={`absolute -top-3 -right-3 w-7 h-7 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white text-xs font-bold shadow-lg`}>
                  {index + 1}
                </div>
                
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {step.icon}
                </div>
                
                {/* Content */}
                <h3 className="text-base md:text-lg font-bold text-white mb-1 whitespace-nowrap">{step.title}</h3>
                <p className="text-xs text-gray-500 mb-2">{step.subtitle}</p>
                <p className="text-gray-400 text-xs md:text-sm leading-relaxed">{step.description}</p>
              </div>
              
              {/* Connector Arrow (hidden on last item and mobile) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:flex absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                  <ArrowRight className="w-5 h-5 text-gray-600" />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div 
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <p className="text-gray-400 mb-4">
            Ready to bring your story to life?
          </p>
          <a 
            href="/?signup=1"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 hover:from-cyan-400 hover:via-purple-400 hover:to-amber-400 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25"
          >
            Start Your Production
            <ArrowRight className="w-5 h-5" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
