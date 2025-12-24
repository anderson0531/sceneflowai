'use client'

import { motion } from 'framer-motion'
import { CheckCircle, Play, Zap, Sparkles, Film, Rocket, Shield, Users, Star } from 'lucide-react'
import { useState } from 'react'
import { DemoVideoModal } from './DemoVideoModal'
import { trackCta } from '@/lib/analytics'

export function FinalCTA() {
  const [isDemoOpen, setIsDemoOpen] = useState(false)
  const scrollToPricing = () => {
    const element = document.getElementById('pricing')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-blue-500/5 to-gray-950"></div>
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"></div>
      
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 mb-6"
          >
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-300">Start Creating Today</span>
          </motion.div>
          
          <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6">
            Your Story Deserves{' '}
            <span className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              Cinematic Treatment
            </span>
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
            Join creators who are transforming their ideas into professional films 
            with AI-powered video production. From screenplay to screening room—
            experience our complete 4-phase workflow.
          </p>

          {/* Social Proof Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-6 mb-6 text-sm text-gray-400"
          >
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 border-2 border-slate-900" />
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 border-2 border-slate-900" />
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 border-2 border-slate-900" />
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 border-2 border-slate-900" />
              </div>
              <span className="text-gray-300"><strong className="text-white">Built for</strong> indie creators</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-gray-700" />
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-amber-500" />
              <span className="text-gray-300"><strong className="text-white">Unlimited</strong> creative potential</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-gray-700" />
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-gray-300"><strong className="text-white">Intuitive</strong> & easy to use</span>
            </div>
          </motion.div>

          {/* Risk Reversal Guarantee */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-xl p-4 mb-8 max-w-2xl mx-auto"
          >
            <div className="flex items-center justify-center gap-3">
              <Shield className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span className="text-emerald-400 font-medium text-sm sm:text-base">
                100% Money-Back Guarantee — If you don&apos;t love it in 7 days, we&apos;ll refund every penny.
              </span>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={() => (window.location.href = '/?signup=1')}
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
            >
              <Rocket className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              Get 1,000 Credits — $5
            </button>
            <button 
              onClick={() => { 
                setIsDemoOpen(true) 
              }}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-gray-600 text-gray-200 font-semibold rounded-xl hover:border-blue-500/50 hover:bg-blue-500/10 transition-all"
            >
              <Play className="w-5 h-5" />
              Watch Demo
            </button>
          </div>

          {/* Value Props Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center p-6 rounded-2xl bg-gray-800/30 border border-gray-700/50"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Film className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Full Production Access</h3>
              <p className="text-gray-400 text-sm">7 days of complete creative tools</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-center p-6 rounded-2xl bg-gray-800/30 border border-gray-700/50"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Risk-Free Trial</h3>
              <p className="text-gray-400 text-sm">Cancel anytime, no questions asked</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-center p-6 rounded-2xl bg-gray-800/30 border border-gray-700/50"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Instant Results</h3>
              <p className="text-gray-400 text-sm">Create your first film in minutes</p>
            </motion.div>
          </div>

          {/* Trial Justification */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-12 p-6 bg-gradient-to-r from-gray-800/50 to-gray-800/30 rounded-xl border border-gray-700/50 max-w-3xl mx-auto"
          >
            <p className="text-gray-300 text-sm leading-relaxed">
              <strong className="text-white">Why $5?</strong> SceneFlow uses cutting-edge AI models like Gemini 3.0 Pro, Veo 3.1, and ElevenLabs which require significant computational resources. This small investment ensures you get reliable, high-speed access to the same professional tools our subscribers use—at the cost of a coffee.
            </p>
          </motion.div>
        </motion.div>
      </div>
      <DemoVideoModal 
        open={isDemoOpen} 
        onClose={() => setIsDemoOpen(false)} 
        src="https://xxavfkdhdebrqida.public.blob.vercel-storage.com/demo/sceneflow-demo-v2.mp4" 
        poster="/demo/sceneflow-poster.jpg" 
      />
    </section>
  )
}
