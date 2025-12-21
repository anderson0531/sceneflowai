'use client'

import { motion } from 'framer-motion'
import { CheckCircle, Film, Mic2, Palette, Video, Users } from 'lucide-react'

export function DemocratizationSection() {
  const features = [
    { icon: Film, title: 'AI Screenwriting', description: 'Generate professional scripts from a simple idea in seconds' },
    { icon: Palette, title: 'Visual Development', description: 'Create stunning scene images with consistent characters' },
    { icon: Video, title: 'Video Generation', description: 'Transform static frames into dynamic video sequences' },
    { icon: Mic2, title: 'Voice Acting', description: 'Add professional voiceovers with AI-powered voices' },
    { icon: Users, title: 'Character Consistency', description: 'Maintain visual identity across all scenes' },
  ]

  return (
    <section className="py-20 bg-slate-950 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08),transparent_70%)]" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-6">
              <span className="text-sm font-medium text-cyan-400">All-in-One Platform</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Everything You Need.
              <span className="block text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text">
                Nothing You Don't.
              </span>
            </h2>
            
            <p className="text-lg text-gray-400 mb-8">
              Stop juggling multiple tools and subscriptions. SceneFlow AI combines every step of video production into one seamless workflow.
            </p>
            
            <div className="space-y-4">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/50 border border-white/5 hover:border-cyan-500/20 transition-all"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">{feature.title}</h4>
                    <p className="text-sm text-gray-500">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          {/* Right: Visual */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 p-8">
              {/* Workflow Visualization */}
              <div className="space-y-4">
                {['Idea', 'Script', 'Visuals', 'Video', 'Film'].map((step, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      index === 4 
                        ? 'bg-gradient-to-br from-cyan-500 to-purple-500' 
                        : 'bg-slate-700/50 border border-white/10'
                    }`}>
                      {index === 4 ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : (
                        <span className="text-lg font-bold text-gray-400">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                        initial={{ width: 0 }}
                        whileInView={{ width: '100%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.3 + index * 0.15 }}
                      />
                    </div>
                    <span className={`text-sm font-medium ${index === 4 ? 'text-cyan-400' : 'text-gray-500'}`}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/10 text-center">
                <p className="text-2xl font-bold text-white mb-1">~60 minutes</p>
                <p className="text-sm text-gray-500">From concept to complete film</p>
              </div>
            </div>
            
            {/* Glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-2xl -z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
