'use client'

import React, { use, useEffect, useState } from 'react'
import { StandaloneStoryboardPlayer } from '@/components/vision/StandaloneStoryboardPlayer'
import { Loader, AlertCircle } from 'lucide-react'
import { notFound } from 'next/navigation'

export default function SharedStoryboardSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectData, setProjectData] = useState<any>(null)
  const [shareToken, setShareToken] = useState<string | null>(null)

  useEffect(() => {
    async function loadSharedProject() {
      try {
        console.log(`[Shared Storyboard] Loading project with slug: ${slug}`)
        // We will create an API route that accepts either a shareToken or a slug
        const response = await fetch(`/api/vision/shared-project/${slug}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load shared project')
        }

        console.log(`[Shared Storyboard] Loaded project: ${data.project.title}`)
        setProjectData(data.project)
        setShareToken(data.project.shareToken || slug)
      } catch (err: any) {
        console.error('[Shared Storyboard] Error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadSharedProject()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-xl">Loading Storyboard...</p>
          <p className="text-sm text-gray-400 mt-2">Powered by Sceneflow</p>
        </div>
      </div>
    )
  }

  if (error || !projectData) {
    // If the slug doesn't match any project, Next.js can fallback to a 404 page
    // This ensures other root URLs aren't permanently swallowed by this route
    notFound()
  }

  return (
    <StandaloneStoryboardPlayer 
      projectData={projectData} 
      shareToken={shareToken || slug} 
    />
  )
}
