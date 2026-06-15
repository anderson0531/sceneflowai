'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Camera,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Maximize2,
  PlayCircle,
  Sparkles,
  X,
} from 'lucide-react'
import NextImage from 'next/image'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { getLoginUrl } from '@/lib/auth/postLoginRedirect'
import { CollaborationDemosPanel } from '@/components/landing/SamplesSection'
import {
  FeatureVideoPlayer,
  MediaAssetLink,
  type VideoAriaLabels,
} from '@/components/landing/FeatureVideoPlayer'
import { getSimpleWalkthroughMedia } from '@/config/landing/simpleWalkthroughMedia'
import {
  SectionCollapseBody,
  SectionCollapseToggle,
  useLandingSectionCollapse,
} from '@/components/landing/LandingSectionCollapse'
import { cn } from '@/lib/utils'

const SECTION_ID = 'how-it-works'

type SimpleWalkthroughStepMessage = {
  id: string
  stepLabel: string
  shortDescription: string
  detailedDescription: string
  media: 'previs-player' | 'video' | 'screenshot'
  subPoints?: string[]
  screenshotSlot?: string
}

function WalkthroughStepCard({
  stepNumber,
  step,
  showDetails,
  hideDetails,
  ui,
  videoAriaLabels,
  onExpandImage,
  onExpandVideo,
}: {
  stepNumber: number
  step: SimpleWalkthroughStepMessage
  showDetails: string
  hideDetails: string
  ui: {
    screenshot: string
    video: string
    expandImage: string
    openScreenshot: string
    openFeatureVideo: string
  }
  videoAriaLabels: VideoAriaLabels
  onExpandImage: (url: string) => void
  onExpandVideo: (url: string) => void
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const media = getSimpleWalkthroughMedia(step.id)

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-sm overflow-hidden"
    >
      <div className="p-5 md:p-6 lg:p-8">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 text-sm font-bold text-white shadow-lg">
            {stepNumber}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-xl md:text-2xl font-bold text-white">{step.stepLabel}</h3>
            <p className="mt-2 text-base text-slate-300 leading-relaxed">{step.shortDescription}</p>
          </div>
        </div>

        <div className="mt-6">
          {step.media === 'previs-player' ? (
            <CollaborationDemosPanel />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-dashed border-white/20 bg-slate-950/70 p-4 md:p-5">
                <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-cyan-300">
                  <Camera className="h-4 w-4" />
                  {ui.screenshot}
                  {media.screenshotUrl && (
                    <button
                      type="button"
                      onClick={() => onExpandImage(media.screenshotUrl!)}
                      className="ml-auto hover:text-white transition-colors bg-white/5 p-1.5 rounded-lg"
                      title={ui.expandImage}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  )}
                </p>
                <div
                  className={cn(
                    'aspect-video rounded-xl border border-white/10 bg-slate-900/70 overflow-hidden flex items-center justify-center relative group',
                    media.screenshotUrl ? 'cursor-zoom-in' : ''
                  )}
                  onClick={() => media.screenshotUrl && onExpandImage(media.screenshotUrl)}
                >
                  {media.screenshotUrl ? (
                    <>
                      <NextImage
                        src={media.screenshotUrl}
                        alt={step.stepLabel}
                        width={1280}
                        height={720}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20">
                          <Maximize2 className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 text-sm text-slate-400 text-center">
                      {step.screenshotSlot ?? 'Screenshot coming soon'}
                    </div>
                  )}
                </div>
                {media.screenshotUrl && (
                  <MediaAssetLink href={media.screenshotUrl} label={ui.openScreenshot} />
                )}
              </div>

              {(step.media === 'video' || media.videoUrl) && (
                <div className="rounded-2xl border border-dashed border-white/20 bg-slate-950/70 p-4 md:p-5">
                  <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-violet-300">
                    <PlayCircle className="h-4 w-4" />
                    {ui.video}
                  </p>
                  <div className="aspect-video rounded-xl border border-white/10 bg-slate-900/70 overflow-hidden shadow-2xl">
                    {media.videoUrl ? (
                      <FeatureVideoPlayer
                        src={media.videoUrl}
                        ariaLabels={videoAriaLabels}
                        onExpand={(e) => {
                          e.stopPropagation()
                          onExpandVideo(media.videoUrl!)
                        }}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center p-3 text-sm text-slate-400">
                        Demo video coming soon
                      </div>
                    )}
                  </div>
                  {media.videoUrl && (
                    <MediaAssetLink href={media.videoUrl} label={ui.openFeatureVideo} />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="inline-flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {detailsOpen ? (
              <>
                {hideDetails}
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                {showDetails}
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
          <AnimatePresence initial={false}>
            {detailsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <p className="mt-3 text-sm text-slate-400 leading-relaxed max-w-3xl">
                  {step.detailedDescription}
                </p>
                {step.subPoints && step.subPoints.length > 0 && (
                  <ul className="mt-4 space-y-2 max-w-3xl">
                    {step.subPoints.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-sm text-slate-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-cyan-400" />
                        {point}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  )
}

export function SimpleWalkthroughSection() {
  const t = useTranslations('simpleWalkthrough')
  const tCommon = useTranslations('common')
  const { isOpen } = useLandingSectionCollapse(SECTION_ID)

  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null)

  const steps = t.raw('steps') as SimpleWalkthroughStepMessage[]

  const ui = {
    screenshot: t('ui.screenshot'),
    video: t('ui.video'),
    expandImage: t('ui.expandImage'),
    closePreview: t('ui.closePreview'),
    openScreenshot: t('ui.openScreenshot'),
    openFeatureVideo: t('ui.openFeatureVideo'),
  }

  const videoAriaLabels: VideoAriaLabels = {
    play: tCommon('play'),
    pause: tCommon('pause'),
    mute: tCommon('mute'),
    unmute: tCommon('unmute'),
    expandVideo: tCommon('expandVideo'),
  }

  return (
    <section
      id={SECTION_ID}
      className={cn(
        'bg-slate-950 relative overflow-hidden scroll-mt-20',
        isOpen ? 'py-24' : 'pt-24 pb-8'
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.05),transparent_70%)]" />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          className="relative text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <SectionCollapseToggle sectionId={SECTION_ID} className="absolute right-0 top-0" />
          <p className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-purple-200 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            {t('badge')}
          </p>
          <h2 className="landing-section-heading text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
            {t('title')}{' '}
            <span className="landing-gradient-text bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
              {t('titleAccent')}
            </span>
          </h2>
          <p className="text-base md:text-lg text-gray-400 max-w-3xl mx-auto mb-4">{t('subtitle')}</p>
          <p className="text-cyan-400 font-medium text-sm md:text-base">{t('tagline')}</p>
        </motion.div>

        <SectionCollapseBody sectionId={SECTION_ID}>
          <div className="space-y-6 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <WalkthroughStepCard
                key={step.id}
                stepNumber={index + 1}
                step={step}
                showDetails={t('showDetails')}
                hideDetails={t('hideDetails')}
                ui={ui}
                videoAriaLabels={videoAriaLabels}
                onExpandImage={setExpandedImage}
                onExpandVideo={setExpandedVideo}
              />
            ))}
          </div>

          <motion.div
            className="text-center mt-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <p className="text-gray-400 mb-4">{t('readyTitle')}</p>
            <a
              href={getLoginUrl({ mode: 'signup' })}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 hover:from-cyan-400 hover:via-purple-400 hover:to-amber-400 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25"
            >
              {t('explorerCta')}
              <ArrowRight className="w-5 h-5" />
            </a>
          </motion.div>
        </SectionCollapseBody>
      </div>

      <AnimatePresence>
        {expandedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedImage(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-12 backdrop-blur-md cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-7xl w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setExpandedImage(null)}
                className="absolute -top-12 right-0 text-white/70 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <X className="w-5 h-5" />
                {ui.closePreview}
              </button>
              <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <NextImage
                  src={expandedImage}
                  alt="Expanded view"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {expandedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedVideo(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-12 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-7xl w-full aspect-video flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setExpandedVideo(null)}
                className="absolute -top-12 right-0 text-white/70 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <X className="w-5 h-5" />
                {ui.closePreview}
              </button>
              <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                <FeatureVideoPlayer
                  src={expandedVideo}
                  autoPlay
                  showExpand={false}
                  className="w-full h-full object-contain"
                  ariaLabels={videoAriaLabels}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

export default SimpleWalkthroughSection
