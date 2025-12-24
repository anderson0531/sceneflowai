'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'

interface DemoVideoModalProps {
  open: boolean
  onClose: () => void
  src?: string
  poster?: string
}

// YouTube video ID
const YOUTUBE_VIDEO_ID = 'M01EwOKyfcw'

export function DemoVideoModal({ open, onClose }: DemoVideoModalProps) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    if (open) {
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
      setIsLoading(true)
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = 'unset'
    }
  }, [open, onClose])

  // YouTube embed URL with privacy-enhanced mode
  // - youtube-nocookie.com: Privacy-enhanced mode (no tracking cookies)
  // - autoplay=1: Auto-start video
  // - rel=0: Don't show related videos from other channels
  // - modestbranding=1: Minimal YouTube branding
  // - controls=1: Full YouTube controls (play/pause, volume, fullscreen, etc.)
  // - playsinline=1: Play inline on mobile
  const youtubeEmbedUrl = `https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1&controls=1&playsinline=1`

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-5xl mx-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute -top-12 right-0 text-gray-300 hover:text-white transition-colors z-20"
              aria-label="Close"
            >
              <X className="w-7 h-7" />
            </button>
            
            <div className="bg-black overflow-hidden aspect-video rounded-xl border border-gray-700">
              {/* Loading indicator */}
              {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                    <span className="text-white/80 text-sm font-medium">
                      Loading video...
                    </span>
                  </div>
                </div>
              )}
              
              {/* YouTube iframe embed */}
              <iframe
                src={youtubeEmbedUrl}
                title="SceneFlow AI Demo"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                onLoad={() => setIsLoading(false)}
                style={{ border: 'none' }}
              />
            </div>
            
            {/* Subtle branding */}
            <p className="text-center text-gray-500 text-xs mt-3">
              SceneFlow AI • AI-Powered Virtual Production Studio
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
