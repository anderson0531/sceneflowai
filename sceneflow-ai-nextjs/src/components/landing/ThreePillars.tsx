'use client'

import { motion } from 'framer-motion'
import { Server, Building, BookOpen, Film } from 'lucide-react'

const Pillar = ({ icon, title, children, delay }) => (
  <motion.div 
    className="bg-slate-900/50 p-8 rounded-2xl border border-white/10"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
  >
    <div className="flex items-center gap-4">
      <div className="p-3 bg-slate-800 rounded-lg">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white">{title}</h3>
    </div>
    <p className="mt-4 text-gray-400">{children}</p>
    <div className="aspect-video bg-slate-800 rounded-lg mt-6 flex items-center justify-center">
      <div className="text-center text-gray-500">
        <Film className="w-10 h-10 mx-auto" />
        <p className="text-xs mt-2">[SAMPLE_VIDEO]</p>
      </div>
    </div>
  </motion.div>
)

export function ThreePillars() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Built for the Visionary in Every Field</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-12">
          <Pillar 
            icon={<Server className="w-6 h-6 text-cyan-400" />}
            title="The Creator"
            delay={0.2}
          >
            Turn a single idea into a 40-episode franchise. Maintain character consistency across every scene without &apos;gambling&apos; your budget on rerolls.
          </Pillar>
          <Pillar 
            icon={<Building className="w-6 h-6 text-amber-400" />}
            title="The Business"
            delay={0.4}
          >
            Scale your agency. Produce professional real-estate tours, 24/7 AI news cycles, or high-fidelity marketing assets for a fraction of traditional costs.
          </Pillar>
          <Pillar 
            icon={<BookOpen className="w-6 h-6 text-purple-400" />}
            title="The Educator"
            delay={0.6}
          >
            Bring history and science to life. Transform lesson plans into cinematic series that capture student attention and drive retention.
          </Pillar>
        </div>
      </div>
    </section>
  )
}
