'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Lightbulb, 
  Upload, 
  Sparkles, 
  ArrowLeft,
  FileText,
  Video,
  Target,
  Users
} from 'lucide-react'
import Link from 'next/link'

export default function NewProjectPage() {
  const router = useRouter()
  const { addProject } = useStore()
  const [projectData, setProjectData] = useState({
    title: '',
    description: '',
    genre: '',
    duration: '',
    targetAudience: '',
    style: ''
  })
  const [creationMethod, setCreationMethod] = useState<'spark' | 'upload' | null>(null)

  const handleCreateProject = () => {
    if (!projectData.title.trim()) return

    const newProject = {
      id: `project-${Date.now()}`,
      title: projectData.title,
      description: projectData.description,
      currentStep: 'ideation' as const,
      progress: 0,
      status: 'in-progress' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedSteps: [],
      metadata: {
        genre: projectData.genre,
        duration: parseInt(projectData.duration) || 60,
        targetAudience: projectData.targetAudience,
        style: projectData.style
      }
    }

    addProject(newProject)
    router.push('/dashboard/workflow/ideation')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/projects">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Project</h1>
          <p className="text-gray-600">Start your video production journey</p>
        </div>
      </div>

      {/* Creation Method Selection */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">Choose Your Creation Method</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Spark Studio Option */}
          <div 
            className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
              creationMethod === 'spark' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-blue-300'
            }`}
            onClick={() => setCreationMethod('spark')}
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">The Spark Studio</h3>
                <p className="text-sm text-gray-600">AI-powered ideation & brainstorming</p>
              </div>
            </div>
            <p className="text-gray-700">
              Start with a blank canvas and let AI help you develop your video concept from scratch.
              Perfect for exploring new ideas and creative directions.
            </p>
          </div>

          {/* Upload Script Option */}
          <div 
            className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
              creationMethod === 'upload' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-blue-300'
            }`}
            onClick={() => setCreationMethod('upload')}
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Upload Script</h3>
                <p className="text-sm text-gray-600">Start with existing content</p>
              </div>
            </div>
            <p className="text-gray-700">
              Upload an existing script, treatment, or concept document to jump-start your project.
              Great for adapting existing content or continuing previous work.
            </p>
          </div>
        </div>
      </div>

      {/* Project Details Form */}
      {creationMethod && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Project Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Title *
              </label>
              <Input
                value={projectData.title}
                onChange={(e) => setProjectData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter project title"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Genre
              </label>
              <select
                value={projectData.genre}
                onChange={(e) => setProjectData(prev => ({ ...prev, genre: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select genre</option>
                <option value="commercial">Commercial</option>
                <option value="educational">Educational</option>
                <option value="entertainment">Entertainment</option>
                <option value="documentary">Documentary</option>
                <option value="corporate">Corporate</option>
                <option value="social">Social Media</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={projectData.description}
              onChange={(e) => setProjectData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your project concept..."
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (seconds)
              </label>
              <Input
                type="number"
                value={projectData.duration}
                onChange={(e) => setProjectData(prev => ({ ...prev, duration: e.target.value }))}
                placeholder="60"
                min="15"
                max="600"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience
              </label>
              <select
                value={projectData.targetAudience}
                onChange={(e) => setProjectData(prev => ({ ...prev, targetAudience: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select audience</option>
                <option value="general">General</option>
                <option value="business">Business</option>
                <option value="students">Students</option>
                <option value="professionals">Professionals</option>
                <option value="youth">Youth</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Style
              </label>
              <select
                value={projectData.style}
                onChange={(e) => setProjectData(prev => ({ ...prev, style: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select style</option>
                <option value="modern">Modern</option>
                <option value="classic">Classic</option>
                <option value="minimalist">Minimalist</option>
                <option value="dynamic">Dynamic</option>
                <option value="friendly">Friendly</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <Link href="/dashboard/projects">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button 
              onClick={handleCreateProject}
              disabled={!projectData.title.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {creationMethod === 'spark' ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start in Spark Studio
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload & Continue
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
