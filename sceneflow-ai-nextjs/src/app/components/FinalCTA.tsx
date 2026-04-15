'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

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
            Ready to remove production barriers?
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
            Launch real-estate showcases, education videos, podcasts, news formats, or cinematic projects with one production workflow.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button href="/dashboard" size="xl" className="w-full sm:w-auto">
              Launch Your Studio for $9
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Link
              href="/early-access"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-cyan-500/40 bg-cyan-500/10 px-6 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors"
            >
              Apply for Early Access
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
