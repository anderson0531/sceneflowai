'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Maximize2 } from 'lucide-react'

interface DemoVideoModalProps {
  open: boolean
  onClose: () => void
  src?: string // Now optional, defaults to YouTube
  poster?: string
}

// YouTube video ID
const YOUTUBE_VIDEO_ID = 'M01EwOKyfcw'

export function DemoVideoModal({ open, onClose }: DemoVideoModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          exitFullscreen()
        } else {
          onClose()
        }
      }
      // Allow 'f' key to toggle fullscreen
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen()
      }
    }
    
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    if (open) {
      document.addEventListener('keydown', onKey)
      document.addEventListener('fullscreenchange', onFullscreenChange)
      document.body.style.overflow = 'hidden'
      setIsLoading(true)
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      document.body.style.overflow = 'unset'
    }
  }, [open, onClose, isFullscreen])

  const toggleFullscreen = async () => {
    if (!iframeRef.current) return
    
    if (!document.fullscreenElement) {
      try {
        await iframeRef.current.requestFullscreen()
        setIsFullscreen(true)
      } catch (err) {
        console.error('Error entering fullscreen:', err)
      }
    } else {
      exitFullscreen()
    }
  }
  
  const exitFullscreen = async () => {
    try {
      await document.exitFullscreen()
      setIsFullscreen(false)
    } catch (err) {
      console.error('Error exiting fullscreen:', err)
    }
  }

  // YouTube embed URL with privacy-enhanced mode and restricted options
  // - youtube-nocookie.com: Privacy-enhanced mode (no tracking cookies)
  // - autoplay=1: Auto-start video
  // - rel=0: Don't show related videos from other channels
  // - modestbranding=1: Minimal YouTube branding
  // - controls=0: Hide YouTube controls (we provide custom fullscreen)
  // - fs=1: Allow fullscreen via API
  // - playsinline=1: Play inline on mobile
  // - iv_load_policy=3: Hide video annotations
  // - disablekb=0: Keep keyboard controls
  const youtubeEmbedUrl = `https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1&controls=0&fs=1&playsinline=1&iv_load_policy=3&enablejsapi=1&disablekb=0`

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
            
            <div className="bg-black overflow-hidden relative aspect-video rounded-xl border border-gray-700">
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
                ref={iframeRef}
                src={youtubeEmbedUrl}
                title="SceneFlow AI Demo"
                className="w-full h-full absolute inset-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                onLoad={() => setIsLoading(false)}
                style={{ border: 'none' }}
              />
              
              {/* Custom Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="absolute bottom-4 right-4 z-20 p-2 bg-black/70 hover:bg-black/90 rounded-lg text-white/80 hover:text-white transition-all"
                aria-label="Enter fullscreen"
                title="Fullscreen (F)"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
              
              {/* Overlay to block YouTube logo click (top-left corner) */}
              <div 
                className="absolute top-0 left-0 w-32 h-16 z-10 cursor-default"
                onClick={(e) => e.stopPropagation()}
              />
              
              {/* Overlay to block YouTube logo click (bottom-right corner) */}
              <div 
                className="absolute bottom-0 right-0 w-24 h-12 z-10 cursor-default"
                onClick={(e) => e.stopPropagation()}
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


