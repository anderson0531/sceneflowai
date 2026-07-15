'use client'

import { ExternalLink, Play } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { StoryboardEmbedPlayer } from '@/components/vision/StoryboardEmbedPlayer'
import { getLandingYoutubeCreatorScreeningHref } from '@/config/landingSamples'

interface ScreeningRoomPreviewProps {
  previewTitle: string
  embedSlug?: string | null
}

export function ScreeningRoomPreview({ previewTitle, embedSlug }: ScreeningRoomPreviewProps) {
  const t = useTranslations('screeningRoom')
  const screeningHref = embedSlug ? getLandingYoutubeCreatorScreeningHref() : null

  return (
    <div className="w-full">
      {embedSlug ? (
        <div className="space-y-2 w-full">
          <div className="w-full rounded-xl border border-slate-700/50 overflow-hidden">
            <StoryboardEmbedPlayer
              slug={embedSlug}
              fullWidthEmbed
              showExpandLink={false}
              minHeight="min-h-[360px] sm:min-h-[420px]"
            />
          </div>
          {screeningHref && (
            <a
              href={screeningHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-300/90 hover:text-indigo-200 transition-colors"
            >
              Open full Screening Room
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      ) : (
        <div className="relative aspect-video w-full rounded-xl bg-slate-950 border border-slate-700/50 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950" />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <p className="text-[10px] uppercase tracking-widest text-indigo-400/80 mb-3">
              {t('previewLabel')}
            </p>
            <h4 className="text-lg md:text-xl font-semibold text-white max-w-md">{previewTitle}</h4>
            <button
              type="button"
              className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600/80 text-white hover:bg-indigo-500 transition-colors"
              aria-label="Play preview"
            >
              <Play className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScreeningRoomPreview
