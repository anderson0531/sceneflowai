'use client'

import React, { use, useEffect, useState } from 'react'
import { ScreeningRoom } from '@/components/vision/ScriptPlayer'
import { Loader, AlertCircle } from 'lucide-react'

export default function SharedScreeningRoomPage({ params }: { params: Promise<{ shareToken: string }> }) {
  const { shareToken } = use(params)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectData, setProjectData] = useState<any>(null)

  useEffect(() => {
    async function loadSharedProject() {
      try {
        console.log(`[Shared Screening Room] Loading project with token: ${shareToken}`)
        const response = await fetch(`/api/vision/shared-project/${shareToken}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load shared project')
        }

        console.log(`[Shared Screening Room] Loaded project: ${data.project.title}`)
        setProjectData(data.project)
      } catch (err: any) {
        console.error('[Shared Screening Room] Error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadSharedProject()
  }, [shareToken])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-xl">Loading Screening Room...</p>
          <p className="text-sm text-gray-400 mt-2">Powered by Sceneflow</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white max-w-md px-4">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold mb-4">Link Not Found</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            This link may have expired or been disabled by the project owner.
          </p>
          <div className="mt-6 text-xs text-gray-600">
            Powered by <span className="font-semibold text-gray-400">Sceneflow</span>
          </div>
        </div>
      </div>
    )
  }

  if (!projectData) {
    return null
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Sceneflow Branding */}
      <div className="absolute top-4 left-4 z-50">
        <div className="text-white text-sm opacity-75">
          Powered by <span className="font-semibold">Sceneflow</span>
        </div>
      </div>

      {/* Shared Project Info */}
      <div className="absolute top-4 right-4 z-50">
        <div className="text-white text-sm opacity-75 bg-black/50 px-3 py-1 rounded">
          {projectData.title}
        </div>
      </div>

      <ScreeningRoom
        script={projectData.script}
        characters={projectData.characters || []}
        onClose={() => {
          // Show message that this is a shared view
          alert('This is a shared Screening Room. Close this browser tab to exit.')
        }}
      />
    </div>
  )
}
