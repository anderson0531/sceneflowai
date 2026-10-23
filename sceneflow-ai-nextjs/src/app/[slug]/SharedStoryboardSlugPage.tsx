'use client'

import { useEffect, useState } from 'react'
import { StandaloneStoryboardPlayer } from '@/components/vision/StandaloneStoryboardPlayer'
import { ScreeningRoomLoadingState } from '@/components/screening-room/ScreeningRoomLoadingState'
import { notFound } from 'next/navigation'

export default function SharedStoryboardSlugPage({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectData, setProjectData] = useState<any>(null)
  const [shareToken, setShareToken] = useState<string | null>(null)

  useEffect(() => {
    async function loadSharedProject() {
      try {
        const response = await fetch(`/api/vision/shared-project/${slug}`, {
          cache: 'no-store',
        })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load shared project')
        }

        setProjectData(data.project)
        setShareToken(data.project.shareToken || slug)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadSharedProject()
  }, [slug])

  if (loading) {
    return <ScreeningRoomLoadingState />
  }

  if (error || !projectData) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-black">
      <StandaloneStoryboardPlayer
        projectData={projectData}
        shareToken={shareToken || slug}
        allowFeedback={projectData.allowFeedback !== false}
      />
    </div>
  )
}
