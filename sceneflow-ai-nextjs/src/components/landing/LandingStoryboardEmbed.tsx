'use client'

import { LANDING_SAMPLE } from '@/config/landingSamples'
import { StoryboardEmbedPlayer, StoryboardPlayerSkeleton } from '@/components/vision/StoryboardEmbedPlayer'

export function LandingStoryboardEmbed() {
  const slug = LANDING_SAMPLE.storyboardShareSlug.trim()

  if (!slug) {
    return (
      <div className="h-full min-h-[280px] flex flex-col">
        <StoryboardPlayerSkeleton minHeight="min-h-[280px]" />
        <p className="text-center text-xs text-slate-500 py-2 px-3">
          Sample storyboard — set <code className="text-slate-400">storyboardShareSlug</code> in config
        </p>
      </div>
    )
  }

  return (
    <div className="h-full landing-storyboard-embed">
      <StoryboardEmbedPlayer slug={slug} />
    </div>
  )
}
