'use client'

import { motion } from 'framer-motion'
import { CheckCircle, Play, Zap } from 'lucide-react'
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
    <section className="py-24 bg-gradient-to-r from-gray-900 to-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl font-bold mb-6">
            Ready to Transform Your Creative Workflow?
          </h2>
          <p className="text-xl text-gray-300 max-w-4xl mx-auto mb-12 leading-relaxed">
            Join thousands of creators who are already using SceneFlow AI to produce professional videos in minutes, not days. Start your journey today with our risk-free trial and experience the complete 6-step workflow.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <button
              onClick={() => (window.location.href = '/?signup=1')}
              className="bg-sf-primary hover:bg-sf-accent text-sf-background text-xl px-12 py-6 rounded-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              Start 7-Day Trial — $5
            </button>
            <button 
              onClick={() => { 
                // trackCta({ event: 'click', label: 'watch-demo', location: 'final-cta' });
                setIsDemoOpen(true) 
              }}
              className="border border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white text-xl px-12 py-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center"
            >
              <Play className="w-6 h-6 mr-3" />
              Watch the 1-minute demo
            </button>
          </div>

          {/* Value Proposition Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-sf-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-sf-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Premium Access</h3>
              <p className="text-gray-400 text-sm">Full Creator features for 7 days</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-sf-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-sf-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Risk-Free Trial</h3>
              <p className="text-gray-400 text-sm">Cancel anytime, no commitment</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-sf-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-sf-accent">$5</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Value Investment</h3>
              <p className="text-gray-400 text-sm">Less than your daily coffee</p>
            </motion.div>
          </div>

          {/* Trial Justification */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-12 p-6 bg-gray-800/50 rounded-xl border border-gray-700 max-w-3xl mx-auto"
          >
            <p className="text-gray-300 text-sm leading-relaxed">
              <strong>Why $5?</strong> Our professional-grade AI video production tools require significant GPU power and dedicated resources. This small investment ensures you get the same high-speed, reliable access that our paying customers enjoy. Think of it as the price of a latte for access to premium creative tools that can transform your entire workflow through our complete 6-step process.
            </p>
          </motion.div>
        </motion.div>
      </div>
      <DemoVideoModal 
        open={isDemoOpen} 
        onClose={() => setIsDemoOpen(false)} 
        src="/demo/sceneflow-demo.mp4" 
        poster="/demo/sceneflow-poster.jpg" 
      />
    </section>
  )
}
