'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'
import { DemoVideoModal } from './DemoVideoModal'
import { Play, ArrowRight, ExternalLink } from 'lucide-react'
import Link from 'next/link'

/** Longform "What's Possible Reel" */
const HERO_COMMERCIAL_VIDEO_ID = 'Rp5kMYYdU50'
const HERO_COMMERCIAL_EMBED_SRC = `https://www.youtube-nocookie.com/embed/${HERO_COMMERCIAL_VIDEO_ID}?rel=0&modestbranding=1&playsinline=1`
const HERO_COMMERCIAL_WATCH_URL = `https://www.youtube.com/watch?v=${HERO_COMMERCIAL_VIDEO_ID}`

export function HeroSection() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <DemoVideoModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
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
              Plan and produce real videos without a full production team. From real-estate showcases and training to podcasts, news, and cinema-style stories, SceneFlow helps non-technical creators move from idea to publish-ready output.
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
              <Link
                href="/early-access"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-cyan-500/40 bg-cyan-500/10 px-6 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors"
              >
                Apply for Early Access
              </Link>
            </motion.div>
          </div>

          {/* Longform What's Possible Reel (YouTube) */}
          <motion.div
            className="relative max-w-4xl mx-auto mt-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl" />

            <div className="relative rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl bg-black">
              <div className="relative aspect-video w-full">
                <iframe
                  src={HERO_COMMERCIAL_EMBED_SRC}
                  title="SceneFlow What's Possible Reel"
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                  loading="eager"
                />
              </div>
            </div>

            <p className="mt-4 text-center text-sm text-gray-400">
              Longform feature walkthrough: What&apos;s Possible with SceneFlow
            </p>
            <p className="mt-1 text-center">
              <a
                href={HERO_COMMERCIAL_WATCH_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                <ExternalLink className="w-4 h-4 shrink-0" aria-hidden />
                Watch on YouTube
              </a>
            </p>
          </motion.div>
        </div>
      </section>
    </>
  );
}
