'use client'

import { motion } from 'framer-motion'
import { Cloud, Shield, Zap, Globe } from 'lucide-react'

export function TrustSignals() {
  const capabilities = [
    { icon: Cloud, value: 'Cloud-Native', label: 'Scalable Infrastructure', description: 'Built to handle millions of creators' },
    { icon: Shield, value: 'Enterprise', label: 'Security Standards', description: 'SOC 2 compliant architecture' },
    { icon: Zap, value: '< 60s', label: 'Video Generation', description: 'Instant AI-powered rendering' },
    { icon: Globe, value: 'Global', label: 'Edge Deployment', description: 'Low-latency worldwide access' }
  ]

  const techStack = [
    { 
      name: 'Google AI', 
      description: 'Script • Image • Video',
      gradient: 'from-blue-500 to-cyan-500'
    },
    { 
      name: 'ElevenLabs', 
      description: 'Voice & Audio',
      gradient: 'from-purple-500 to-pink-500'
    },
    { 
      name: 'Vercel', 
      description: 'Global Edge',
      gradient: 'from-gray-500 to-gray-600'
    },
  ]
  
  return (
    <section className="py-16 bg-gradient-to-b from-slate-950 to-slate-900 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Platform Capabilities Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {capabilities.map((item, index) => (
            <motion.div 
              key={index}
              className="text-center p-6 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/5 hover:border-white/10 transition-all"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <item.icon className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="text-xl md:text-2xl font-bold text-white mb-1">{item.value}</div>
              <div className="text-sm font-medium text-gray-300 mb-1">{item.label}</div>
              <div className="text-xs text-gray-500">{item.description}</div>
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
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-6">Powered by Industry-Leading AI Platforms</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            {techStack.map((tech, index) => (
              <motion.div 
                key={index}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-800/30 border border-white/5"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tech.gradient} flex items-center justify-center shadow-lg`}>
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

