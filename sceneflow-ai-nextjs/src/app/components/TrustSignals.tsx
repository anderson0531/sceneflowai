'use client'

import { motion } from 'framer-motion'
import { Users, Star, Video, Zap } from 'lucide-react'

export function TrustSignals() {
  const metrics = [
    { icon: Users, value: '10,000+', label: 'Active Creators' },
    { icon: Star, value: '4.9/5', label: 'User Rating' },
    { icon: Video, value: '100,000+', label: 'Videos Created' },
    { icon: Zap, value: '10x', label: 'Faster Production' }
  ]

  const techStack = [
    { 
      name: 'Google AI', 
      description: 'Gemini 2.5 Pro • Imagen 3 • Veo 3.1',
      gradient: 'from-blue-500 to-blue-600'
    },
    { 
      name: 'ElevenLabs', 
      description: 'Voice & Audio',
      gradient: 'from-purple-500 to-purple-600'
    },
    { 
      name: 'Vercel', 
      description: 'Global Edge',
      gradient: 'from-gray-600 to-gray-700'
    },
  ]
  
  return (
    <section className="py-16 bg-slate-900 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {metrics.map((metric, index) => (
            <motion.div 
              key={index}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <metric.icon className="w-7 h-7 text-cyan-400" />
              </div>
              <div className="text-2xl md:text-3xl font-bold text-white mb-1">{metric.value}</div>
              <div className="text-sm text-gray-500">{metric.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Tech Stack */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <p className="text-xs text-gray-600 uppercase tracking-wider mb-6">Powered by industry-leading AI</p>
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
            {techStack.map((tech, index) => (
              <motion.div 
                key={index}
                className="flex items-center gap-3"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tech.gradient} flex items-center justify-center`}>
                  <span className="text-white text-lg font-bold">{tech.name[0]}</span>
                </div>
                <div className="text-left">
                  <div className="text-white font-semibold text-sm">{tech.name}</div>
                  <div className="text-gray-500 text-xs">{tech.description}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

