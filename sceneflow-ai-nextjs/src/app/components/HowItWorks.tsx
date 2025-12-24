'use client'

import { motion } from 'framer-motion'
import { Lightbulb, Clapperboard, Film, Rocket, ArrowRight } from 'lucide-react'

export function HowItWorks() {
  const steps = [
    {
      icon: <Lightbulb className="w-10 h-10" />,
      title: '1. The Blueprint',
      subtitle: 'Ideation',
      description: 'Start with your idea. AI generates a professional film treatment with story structure and character breakdowns.',
      color: 'from-cyan-500 to-cyan-600',
      borderColor: 'border-cyan-500/30',
    },
    {
      icon: <Clapperboard className="w-10 h-10" />,
      title: '2. Script & Review',
      subtitle: 'Perfect Your Screenplay',
      description: 'Transform your treatment into a full script. Get Director & Audience scoring with category breakdowns. Apply AI revision recommendations before generation—the most cost-effective step.',
      color: 'from-purple-500 to-purple-600',
      borderColor: 'border-purple-500/30',
    },
    {
      icon: <Film className="w-10 h-10" />,
      title: '3. Production',
      subtitle: 'Images, Audio & Video',
      description: 'Generate storyboards with Imagen 3. Add premium ElevenLabs voices with multi-language dubbing. Render scenes with Veo 3.1 frame-anchored precision.',
      color: 'from-amber-500 to-amber-600',
      borderColor: 'border-amber-500/30',
    },
    {
      icon: <Rocket className="w-10 h-10" />,
      title: '4. The Premiere',
      subtitle: 'Review & Export',
      description: 'Preview in the Screening Room with Ken Burns animation. Export your finished film in HD/4K, ready for any platform.',
      color: 'from-green-500 to-green-600',
      borderColor: 'border-green-500/30',
    },
  ]
  
  return (
    <section id="how-it-works" className="py-24 bg-slate-950 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.05),transparent_70%)]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="landing-section-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-4">
            Four Phases to{' '}
            <span className="landing-gradient-text bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
              Cinematic Excellence
            </span>
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto">
            Our streamlined workflow takes you from initial concept to finished film in record time.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
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
              <div className={`relative h-full bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border ${step.borderColor} hover:border-opacity-60 transition-all duration-300`}>
                {/* Step Number Badge */}
                <div className={`absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white text-sm font-bold shadow-lg`}>
                  {index + 1}
                </div>
                
                {/* Icon */}
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {step.icon}
                </div>
                
                {/* Content */}
                <h3 className="text-lg md:text-xl font-bold text-white mb-1">{step.title}</h3>
                <p className="text-xs md:text-sm text-gray-500 mb-3">{step.subtitle}</p>
                <p className="text-gray-400 text-sm md:text-base leading-relaxed">{step.description}</p>
              </div>
              
              {/* Connector Arrow (hidden on last item and mobile) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <ArrowRight className="w-6 h-6 text-gray-600" />
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
