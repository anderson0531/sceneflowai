'use client'

import { useState } from 'react'
import NextImage from 'next/image'
import { Maximize2 } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { getGuidedStepMedia } from '@/config/landing/guidedStepsMedia'
import { ExpandedImageModal } from '@/components/landing/ExpandedImageModal'
import { cn } from '@/lib/utils'

interface StepImagePlaceholderProps {
  stepId: string
  placeholderText: string
  alt: string
  className?: string
}

export function StepImagePlaceholder({
  stepId,
  placeholderText,
  alt,
  className,
}: StepImagePlaceholderProps) {
  const t = useTranslations('pipeline.ui')
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const media = getGuidedStepMedia(stepId)
  const { videoUrl, posterUrl, imageUrl } = media

  if (videoUrl) {
    return (
      <div
        className={cn(
          'aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-900/70',
          className
        )}
      >
        <video
          className="h-full w-full object-cover"
          controls
          playsInline
          preload="metadata"
          poster={posterUrl}
          aria-label={alt}
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      </div>
    )
  }

  if (imageUrl) {
    return (
      <>
        <div
          className={cn(
            'group relative aspect-video cursor-zoom-in overflow-hidden rounded-xl border border-white/10 bg-slate-900/70',
            className
          )}
        >
          <button
            type="button"
            onClick={() => setExpandedImage(imageUrl)}
            className="absolute top-3 right-3 z-10 rounded-lg bg-black/50 p-1.5 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white"
            aria-label={t('expandFullscreen')}
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setExpandedImage(imageUrl)}
            className="relative block h-full w-full"
            aria-label={t('expandFullscreen')}
          >
            <NextImage
              src={imageUrl}
              alt={alt}
              width={1280}
              height={720}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-colors group-hover:bg-black/30 group-hover:opacity-100">
              <div className="rounded-full border border-white/20 bg-white/10 p-3 backdrop-blur-md">
                <Maximize2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </button>
        </div>

        <AnimatePresence>
          {expandedImage && (
            <ExpandedImageModal
              imageUrl={expandedImage}
              closeLabel={t('closeFullscreen')}
              expandImageLabel={alt}
              onClose={() => setExpandedImage(null)}
            />
          )}
        </AnimatePresence>
      </>
    )
  }

  return (
    <div
      className={cn(
        'flex aspect-video items-center justify-center rounded-xl border border-dashed border-white/15 bg-slate-900/50 p-6',
        className
      )}
    >
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium text-slate-300">{placeholderText}</p>
        <p className="text-xs text-slate-500">{t('comingSoon')}</p>
      </div>
    </div>
  )
}

export default StepImagePlaceholder
