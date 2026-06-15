'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

export type ExpandedImageModalProps = {
  imageUrl: string
  closeLabel: string
  expandImageLabel?: string
  onClose: () => void
}

export function ExpandedImageModal({
  imageUrl,
  closeLabel,
  expandImageLabel = '',
  onClose,
}: ExpandedImageModalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/90 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md md:p-12"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative flex h-full w-full max-w-7xl flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-0 right-0 z-10 flex items-center gap-2 rounded-lg bg-black/50 px-3 py-2 text-sm font-medium text-white/80 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white md:top-4 md:right-4"
        >
          <X className="h-5 w-5" />
          {closeLabel}
        </button>
        <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
          <img src={imageUrl} alt={expandImageLabel} className="h-full w-full object-contain" />
        </div>
      </motion.div>
    </motion.div>
  )
}
