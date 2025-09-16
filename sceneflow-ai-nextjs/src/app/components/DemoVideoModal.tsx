'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface DemoVideoModalProps {
  open: boolean
  onClose: () => void
  src: string
  poster?: string
}

export function DemoVideoModal({ open, onClose, src, poster }: DemoVideoModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-4xl mx-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <button
              onClick={onClose}
              className="absolute -top-12 right-0 text-gray-300 hover:text-white"
              aria-label="Close"
            >
              <X className="w-7 h-7" />
            </button>
            <div className="aspect-video bg-black rounded-xl overflow-hidden border border-gray-700">
              <video
                controls
                autoPlay
                playsInline
                poster={poster}
                preload="metadata"
                className="w-full h-full"
              >
                <source src={src} type="video/mp4" />
              </video>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}


