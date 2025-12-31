'use client'

import { motion } from 'framer-motion'
import { Cloud, Shield, Zap, Globe } from 'lucide-react'

export function TrustSignals() {
  const capabilities = [
    { icon: Cloud, value: 'Cloud-Native', label: 'Scalable Infrastructure', description: 'Built for reliable performance' },
    { icon: Shield, value: 'Secure', label: 'Security Standards', description: 'Industry-standard security practices' },
    { icon: Zap, value: 'Fast', label: 'Video Generation', description: 'AI-powered video rendering' },
    { icon: Globe, value: 'Global', label: 'Edge Deployment', description: 'Reliable worldwide access' }
  ]
  
  return (
    <section className="py-16 bg-gradient-to-b from-slate-950 to-slate-900 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Platform Capabilities Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
      </div>
    </section>
  )
}

