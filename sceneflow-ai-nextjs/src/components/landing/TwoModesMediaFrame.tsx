'use client'

import NextImage from 'next/image'
import { getTwoModesMedia } from '@/config/landing/twoModesMedia'

export function TwoModesMediaFrame({
  mediaId,
  caption,
  comingSoon,
}: {
  mediaId: string
  caption: string
  comingSoon: string
}) {
  const media = getTwoModesMedia(mediaId)
  const hasVideo = Boolean(media.webmUrl || media.mp4Url)

  if (hasVideo) {
    return (
      <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-900/70">
        <video
          className="h-full w-full object-cover"
          controls
          playsInline
          preload="metadata"
          poster={media.posterUrl || undefined}
          aria-label={caption}
        >
          {media.webmUrl ? <source src={media.webmUrl} type="video/webm" /> : null}
          {media.mp4Url ? <source src={media.mp4Url} type="video/mp4" /> : null}
        </video>
      </div>
    )
  }

  if (media.imageUrl) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-900/70">
        <NextImage
          src={media.imageUrl}
          alt={caption}
          width={2400}
          height={1340}
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  return (
    <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-white/15 bg-slate-900/50 p-6">
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium text-slate-300">{caption}</p>
        <p className="text-xs text-slate-500">{comingSoon}</p>
      </div>
    </div>
  )
}

export default TwoModesMediaFrame
