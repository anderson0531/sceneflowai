'use client'

import { motion } from 'framer-motion'
import { Layers, UserCheck, Headphones, Download, Zap, Shield, TrendingUp } from 'lucide-react'

const differentiators = [
  {
    icon: Layers,
    title: "Full Creative Control",
    description: "AI handles the production; you make the creative decisions. Every scene, every frame, every word—under your direction.",
    highlight: "You're the director, AI is your crew"
  },
  {
    icon: UserCheck,
    title: "Character Consistency",
    description: "Our keyframe-anchoring technology keeps faces consistent—a problem other AI tools simply can't solve. Same character, every frame.",
    highlight: "Frame-anchored identity lock"
  },
  {
    icon: Headphones,
    title: "Professional Audio",
    description: "ElevenLabs integration for narration, dialogue, music, and sound effects. Multiple voices, multiple languages, one seamless mix.",
    highlight: "Complete audio pipeline"
  },
  {
    icon: Download,
    title: "One-Click Export",
    description: "Download MP4s ready for YouTube upload. No post-processing, no additional software. Render and publish.",
    highlight: "Upload-ready output"
  },
  {
    icon: Zap,
    title: "100x Cost Savings",
    description: "Self-hosted rendering on Cloud Run means your credits go further. Same quality, fraction of the cost.",
    highlight: "FFmpeg on Cloud Run"
  },
  {
    icon: Shield,
    title: "Enterprise-Grade Safety",
    description: "Hive AI content moderation ensures every generation is policy-compliant. Create confidently.",
    highlight: "Built-in moderation"
  }
]

export function DifferentiatorsSection() {
  return (
    <section className="relative py-24 overflow-hidden bg-gradient-to-b from-gray-950 to-slate-900">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.08),transparent_60%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 mb-6">
            <TrendingUp className="w-4 h-4 text-purple-400 mr-2" />
            <span className="text-sm font-medium text-purple-400">Why Creators Choose Us</span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            The unfair advantages{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              you&apos;ve been looking for
            </span>
          </h2>
          
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Every feature designed to solve real creator problems—not just impressive demos.
          </p>
        </motion.div>

        {/* Differentiators Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {differentiators.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="group relative p-6 rounded-2xl border border-gray-700/50 bg-gray-800/30 backdrop-blur-sm hover:border-purple-500/40 hover:bg-purple-500/5 transition-all duration-300"
            >
              {/* Icon */}
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30 group-hover:border-purple-400/50 transition-colors">
                  <item.icon className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">
                    {item.title}
                  </h3>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                {item.description}
              </p>

              {/* Highlight Tag */}
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                ✓ {item.highlight}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
