'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'
import { DemoVideoModal } from './DemoVideoModal'
import { Play, ArrowRight, Video } from 'lucide-react'

export function HeroSection() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <DemoVideoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <section className="relative bg-gray-950 text-white pt-24 pb-20 sm:pt-32 sm:pb-28 lg:pt-40 lg:pb-36">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.07]" />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-950/80 to-transparent" />
        
        <div className="relative container mx-auto px-4 z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* New Headline */}
            <motion.h1 
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter leading-tight bg-gradient-to-r from-white via-gray-300 to-gray-400 text-transparent bg-clip-text"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              Your Vision, Rendered. Without the Friction.
            </motion.h1>

            {/* New Sub-headline */}
            <motion.p 
              className="mt-6 max-w-2xl mx-auto text-lg text-gray-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              SceneFlow is the world’s first AI Video Studio designed for the Director, not the Prompter. Whether you’re launching a real-estate empire, a corporate training series, or the next viral YouTube documentary—focus on your story. We’ll handle the pixels.
            </motion.p>
            
            {/* New CTAs */}
            <motion.div 
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Button href="/dashboard" size="xl" className="w-full sm:w-auto">
                Start Your First Series
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="xl" 
                className="w-full sm:w-auto"
                onClick={() => setIsModalOpen(true)}
              >
                <Play className="mr-2 w-5 h-5" />
                Watch the &apos;What&apos;s Possible&apos; Reel
              </Button>
            </motion.div>
          </div>

          {/* New Video Placeholder */}
          <motion.div
            className="relative max-w-4xl mx-auto mt-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl" />
            
            <div className="relative rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl">
              <div className="aspect-video bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                  <Video className="w-16 h-16 mx-auto text-gray-500" />
                  <p className="mt-4 text-lg font-semibold text-gray-400">
                    [VIDEO_PLACEHOLDER: A 30-second high-energy montage of diverse outputs]
                  </p>
                  <p className="text-sm text-gray-500">
                    (Cinematic home walkthrough, digital teacher, sci-fi series)
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
