'use client'

import { use, useState } from 'react'
import { notFound } from 'next/navigation'
import { PremiereScreeningEmbedPlayer } from '@/components/screening-room/PremiereScreeningEmbedPlayer'

export default function ScreeningEmbedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [isNotFound, setIsNotFound] = useState(false)

  if (isNotFound) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <PremiereScreeningEmbedPlayer
        screeningId={id}
        className="flex-1"
        minHeight="min-h-screen"
        showExpandLink={false}
        onNotFound={() => setIsNotFound(true)}
      />
    </div>
  )
}
