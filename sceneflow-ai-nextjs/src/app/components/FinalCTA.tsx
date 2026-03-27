'use client'

import { motion } from 'framer-motion'
import { DemoVideoModal } from './DemoVideoModal'
import { trackCta } from '@/lib/analytics'
import { Button } from '@/components/ui/Button'
import { ArrowRight } from 'lucide-react'

export function FinalCTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-purple-500/5 to-gray-950"></div>
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
      
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            Ready to move from "Prompter" to "Director"?
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
            Join thousands of businesses, schools, and creators who are building the future of long-form video.
          </p>
          <Button href="/dashboard" size="xl" className="w-full sm:w-auto">
            Launch Your Studio for $9
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
