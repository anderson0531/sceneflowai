'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'

const Plyr = dynamic(async () => (await import('plyr-react')).default, { ssr: false })

interface PlyrYouTubeProps {
  videoId: string
  title: string
  autoplayMuted?: boolean
}

export function PlyrYouTube({ videoId, title, autoplayMuted = true }: PlyrYouTubeProps) {
  const source = useMemo(
    () => ({
      type: 'video' as const,
      title,
      sources: [
        {
          src: videoId,
          provider: 'youtube' as const,
        },
      ],
    }),
    [title, videoId]
  )

  const options = useMemo(
    () => ({
      autoplay: autoplayMuted,
      muted: autoplayMuted,
      clickToPlay: true,
      ratio: '16:9',
      controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
      youtube: {
        noCookie: true,
        rel: 0,
        modestbranding: 1,
        controls: 0,
        playsinline: 1,
      },
    }),
    [autoplayMuted]
  )

  return (
    <div className="absolute inset-0 h-full w-full [&_.plyr]:h-full [&_.plyr__video-wrapper]:h-full [&_.plyr__poster]:bg-black [&_.plyr__video-embed]:h-full [&_.plyr__video-embed_iframe]:h-full [&_.plyr__controls]:backdrop-blur-sm">
      <Plyr source={source} options={options} />
    </div>
  )
}

