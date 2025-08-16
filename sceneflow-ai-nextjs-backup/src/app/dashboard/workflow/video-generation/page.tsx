'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { 
  Film, 
  Play, 
  Download,
  Share2,
  ArrowLeft,
  Save,
  Settings,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import Link from 'next/link'

interface VideoVersion {
  id: string
  name: string
  status: 'processing' | 'completed' | 'failed'
  progress: number
  duration: number
  quality: string
  createdAt: string
  thumbnail?: string
}

export default function VideoGenerationPage() {
  const router = useRouter()
  const { currentProject, updateProject, updateStepProgress } = useStore()
  const [videoVersions, setVideoVersions] = useState<VideoVersion[]>([
    {
      id: '1',
      name: 'Final Cut - v1.0',
      status: 'completed',
      progress: 100,
      duration: 60,
      quality: '4K',
      createdAt: '2 hours ago'
    }
  ])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationSettings, setGenerationSettings] = useState({
    quality: '4K',
    format: 'MP4',
    aspectRatio: '16:9',
    frameRate: '30fps'
  })

  const startGeneration = () => {
    setIsGenerating(true)
    // Simulate video generation
    setTimeout(() => {
      const newVersion: VideoVersion = {
        id: Date.now().toString(),
        name: `Final Cut - v${videoVersions.length + 1}.0`,
        status: 'processing',
        progress: 0,
        duration: 60,
        quality: generationSettings.quality,
        createdAt: 'Just now'
      }
      setVideoVersions([...videoVersions, newVersion])
      setIsGenerating(false)
    }, 2000)
  }

  const handleSave = () => {
    if (currentProject) {
      updateProject(currentProject.id, {
        metadata: {
          ...currentProject.metadata,
          videoVersions,
          generationSettings
        }
      })
      updateStepProgress('video-generation', 100)
    }
  }

  const handleComplete = () => {
    handleSave()
    // Navigate to project completion or dashboard
    router.push('/dashboard')
  }

  const handlePreviousStep = () => {
    router.push('/dashboard/workflow/scene-direction')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Film className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">The Screening Room</h1>
        <p className="text-xl text-gray-600">Step 4: Video Generation & Review</p>
        <p className="text-gray-500 mt-2">Generate your final video and review the results</p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Project Progress</h2>
          <span className="text-sm text-gray-500">Step 4 of 4</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-purple-600 h-2 rounded-full transition-all duration-300" style={{ width: '100%' }}></div>
        </div>
        <p className="text-sm text-green-600 mt-2">🎉 All workflow steps completed!</p>
      </div>

      {/* Generation Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2 text-gray-600" />
          Generation Settings
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
            <select
              value={generationSettings.quality}
              onChange={(e) => setGenerationSettings({...generationSettings, quality: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="1080p">1080p</option>
              <option value="4K">4K</option>
              <option value="8K">8K</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
            <select
              value={generationSettings.format}
              onChange={(e) => setGenerationSettings({...generationSettings, format: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="MP4">MP4</option>
              <option value="MOV">MOV</option>
              <option value="AVI">AVI</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Ratio</label>
            <select
              value={generationSettings.aspectRatio}
              onChange={(e) => setGenerationSettings({...generationSettings, aspectRatio: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="16:9">16:9 (Widescreen)</option>
              <option value="4:3">4:3 (Standard)</option>
              <option value="1:1">1:1 (Square)</option>
              <option value="9:16">9:16 (Portrait)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Frame Rate</label>
            <select
              value={generationSettings.frameRate}
              onChange={(e) => setGenerationSettings({...generationSettings, frameRate: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="24fps">24fps (Film)</option>
              <option value="30fps">30fps (Standard)</option>
              <option value="60fps">60fps (Smooth)</option>
            </select>
          </div>
        </div>
        
        <div className="mt-6">
          <Button 
            onClick={startGeneration}
            disabled={isGenerating}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Film className="w-4 h-4 mr-2" />
                Generate Video
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Video Versions */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">Generated Versions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videoVersions.map((version) => (
            <div key={version.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              {/* Thumbnail Placeholder */}
              <div className="h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center mb-4">
                <Film className="w-8 h-8 text-purple-600" />
              </div>
              
              {/* Version Info */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{version.name}</h3>
                  {getStatusIcon(version.status)}
                </div>
                
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(version.status)}`}>
                  {version.status}
                </span>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <p className="font-medium text-gray-900">{version.duration}s</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Quality:</span>
                    <p className="font-medium text-gray-900">{version.quality}</p>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  Created: {version.createdAt}
                </div>
              </div>
              
              {/* Progress Bar for Processing */}
              {version.status === 'processing' && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{version.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${version.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex space-x-2">
                {version.status === 'completed' ? (
                  <>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </>
                ) : version.status === 'failed' ? (
                  <Button variant="outline" size="sm" className="w-full">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Retry
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    <Clock className="w-4 h-4 mr-1" />
                    Processing...
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Project Completion */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200 p-6">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-green-900 mb-2">Project Complete! 🎉</h3>
          <p className="text-green-700 mb-6">
            Congratulations! You&apos;ve successfully completed all workflow steps and generated your video.
            Review the results and download your final product.
          </p>
          
          <div className="flex justify-center space-x-4">
            <Button 
              onClick={handleComplete}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Project
            </Button>
            <Link href="/dashboard/projects">
              <Button variant="outline">
                View All Projects
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Progress
            </Button>
            <Link href="/dashboard">
              <Button variant="ghost">
                Back to Dashboard
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handlePreviousStep}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous Step
            </Button>
            <span className="text-sm text-gray-500">Progress: 100%</span>
            <Button 
              onClick={handleComplete}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Project
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
