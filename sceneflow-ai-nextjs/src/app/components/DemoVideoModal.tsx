'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'

interface DemoVideoModalProps {
  open: boolean
  onClose: () => void
  src: string
  poster?: string
}

export function DemoVideoModal({ open, onClose, src, poster }: DemoVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isBuffering, setIsBuffering] = useState(true)
  const [bufferedPercent, setBufferedPercent] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', onKey)
      // Reset state when modal opens
      setIsBuffering(true)
      setBufferedPercent(0)
      setHasStarted(false)
    }
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Handle buffering progress
  const handleProgress = () => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      const buffered = videoRef.current.buffered.end(videoRef.current.buffered.length - 1)
      const duration = videoRef.current.duration
      if (duration > 0) {
        setBufferedPercent(Math.round((buffered / duration) * 100))
      }
    }
  }

  const handleCanPlay = () => {
    setIsBuffering(false)
  }

  const handleWaiting = () => {
    if (hasStarted) {
      setIsBuffering(true)
    }
  }

  const handlePlaying = () => {
    setIsBuffering(false)
    setHasStarted(true)
  }

  const handleLoadStart = () => {
    setIsBuffering(true)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-5xl mx-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <button
              onClick={onClose}
              className="absolute -top-12 right-0 text-gray-300 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-7 h-7" />
            </button>
            <div className="aspect-video bg-black rounded-xl overflow-hidden border border-gray-700 relative">
              {/* Buffering indicator overlay */}
              {isBuffering && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                    <span className="text-white/80 text-sm font-medium">
                      Loading video... {bufferedPercent > 0 ? `${bufferedPercent}%` : ''}
                    </span>
                  </div>
                </div>
              )}
              
              <video
                ref={videoRef}
                controls
                autoPlay
                playsInline
                poster={poster}
                preload="auto"
                className="w-full h-full"
                onProgress={handleProgress}
                onCanPlay={handleCanPlay}
                onCanPlayThrough={handleCanPlay}
                onWaiting={handleWaiting}
                onPlaying={handlePlaying}
                onLoadStart={handleLoadStart}
              >
                {/* Fragment hint #t=0.1 helps browser start loading from near beginning faster */}
                <source src={`${src}#t=0.1`} type="video/mp4" />
              </video>
            </div>
            
            {/* Buffer progress bar below video */}
            <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-300"
                style={{ width: `${bufferedPercent}%` }}
              />
            </div>
            <p className="text-center text-gray-500 text-xs mt-1">
              {bufferedPercent < 100 ? `Buffered: ${bufferedPercent}%` : 'Fully loaded'}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}


