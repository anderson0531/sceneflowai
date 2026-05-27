'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useState, useRef } from 'react'
import { DemoVideoModal } from './DemoVideoModal'
import { Play, ArrowRight, Pause, Volume2, VolumeX, Maximize } from 'lucide-react'
import Link from 'next/link'
import { HERO_COPY } from '@/config/landing/valuePropCopy'

/** Longform "What's Possible Reel" */
const HERO_COMMERCIAL_BLOB_SRC = '/demo/sceneflow-intro.mov#t=0.1'

export function HeroSection() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  return (
    <>
      <DemoVideoModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <section className="relative bg-gray-950 text-white pt-24 pb-20 sm:pt-32 sm:pb-28 lg:pt-40 lg:pb-36">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.07]" />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-950/80 to-transparent" />
        
        <div className="relative container mx-auto px-4 z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.p
              className="text-sm font-medium text-cyan-400/90 mb-4 tracking-wide"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {HERO_COPY.pipelineLine}
            </motion.p>

            <motion.h1 
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter leading-tight bg-gradient-to-r from-white via-gray-300 to-gray-400 text-transparent bg-clip-text"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              {HERO_COPY.headline}
            </motion.h1>

            <motion.p 
              className="mt-6 max-w-2xl mx-auto text-lg text-gray-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {HERO_COPY.subheadline}
            </motion.p>
            
            <motion.div 
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Link href="/?signup=1" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">
                  {HERO_COPY.ctaPrimary}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full sm:w-auto"
                onClick={() => setIsModalOpen(true)}
              >
                <Play className="mr-2 w-5 h-5" />
                {HERO_COPY.ctaSecondary}
              </Button>
              <Link
                href="/early-access"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-cyan-500/40 bg-cyan-500/10 px-6 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors"
              >
                Apply for Closed Beta
              </Link>
            </motion.div>
          </div>

          <motion.div
            className="relative max-w-4xl mx-auto mt-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl" />

            <div 
              ref={containerRef}
              className="relative rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl bg-black group"
            >
              <div className="relative aspect-video w-full h-full">
                <video
                  ref={videoRef}
                  src={HERO_COMMERCIAL_BLOB_SRC}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  preload="auto"
                  className="absolute inset-0 h-full w-full object-cover"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                
                <div className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex items-center justify-between pointer-events-auto">
                    <div className="flex items-center space-x-4">
                      <button onClick={togglePlay} className="text-white hover:text-cyan-400 transition" aria-label={isPlaying ? "Pause" : "Play"}>
                        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                      </button>
                      <button onClick={toggleMute} className="text-white hover:text-cyan-400 transition" aria-label={isMuted ? "Unmute" : "Mute"}>
                        {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                      </button>
                    </div>
                    <button onClick={toggleFullscreen} className="text-white hover:text-cyan-400 transition" aria-label="Fullscreen">
                      <Maximize className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-sm text-gray-400">
              Longform feature walkthrough: What&apos;s Possible with SceneFlow
            </p>
          </motion.div>
        </div>
      </section>
    </>
  );
}
