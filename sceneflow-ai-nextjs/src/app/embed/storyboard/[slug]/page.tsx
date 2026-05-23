'use client'

import { use, useState } from 'react'
import { notFound } from 'next/navigation'
import { StoryboardEmbedPlayer } from '@/components/vision/StoryboardEmbedPlayer'

export default function StoryboardEmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [isNotFound, setIsNotFound] = useState(false)

  if (isNotFound) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <StoryboardEmbedPlayer
        slug={slug}
        className="flex-1"
        minHeight="min-h-screen"
        showExpandLink={false}
        onNotFound={() => setIsNotFound(true)}
      />
    </div>
  )
}
