'use client'

import NextImage from 'next/image'
import { Camera } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getGuidedStepMedia } from '@/config/landing/guidedStepsMedia'
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
  const t = useTranslations('guidedSteps.ui')
  const media = getGuidedStepMedia(stepId)
  const imageUrl = media.imageUrl

  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-white/20 bg-slate-950/70 p-4 md:p-5',
        className
      )}
    >
      <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-indigo-300">
        <Camera className="h-4 w-4" />
        {t('imagePlaceholder')}
      </p>
      <div
        className={cn(
          'aspect-video rounded-xl border border-white/10 bg-slate-900/70 overflow-hidden flex items-center justify-center relative',
          imageUrl && 'cursor-default'
        )}
      >
        {imageUrl ? (
          <NextImage
            src={imageUrl}
            alt={alt}
            width={1280}
            height={720}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="p-6 text-center space-y-2">
            <p className="text-sm text-slate-300 font-medium">{placeholderText}</p>
            <p className="text-xs text-slate-500">{t('comingSoon')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default StepImagePlaceholder
