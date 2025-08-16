'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { 
  Layout, 
  Image, 
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Eye,
  Save,
  Play
} from 'lucide-react'
import Link from 'next/link'

interface Scene {
  id: string
  title: string
  description: string
  duration: number
  visualNotes: string
  audioNotes: string
  order: number
}

export default function StoryboardPage() {
  const router = useRouter()
  const { currentProject, updateProject, updateStepProgress } = useStore()
  const [scenes, setScenes] = useState<Scene[]>([
    {
      id: '1',
      title: 'Opening Hook',
      description: 'Grab attention with compelling opening',
      duration: 5,
      visualNotes: 'Dynamic camera movement, bright colors',
      audioNotes: 'Upbeat music, clear voiceover',
      order: 1
    },
    {
      id: '2',
      title: 'Problem Statement',
      description: 'Present the challenge or need',
      duration: 8,
      visualNotes: 'Show problem visually, use graphics',
      audioNotes: 'Serious tone, problem-focused script',
      order: 2
    }
  ])
  const [editingScene, setEditingScene] = useState<Scene | null>(null)

  const addScene = () => {
    const newScene: Scene = {
      id: Date.now().toString(),
      title: `Scene ${scenes.length + 1}`,
      description: '',
      duration: 5,
      visualNotes: '',
      audioNotes: '',
      order: scenes.length + 1
    }
    setScenes([...scenes, newScene])
  }

  const updateScene = (id: string, updates: Partial<Scene>) => {
    setScenes(scenes.map(scene => 
      scene.id === id ? { ...scene, ...updates } : scene
    ))
  }

  const deleteScene = (id: string) => {
    setScenes(scenes.filter(scene => scene.id !== id))
  }

  const handleSave = () => {
    if (currentProject) {
      updateProject(currentProject.id, {
        metadata: {
          ...currentProject.metadata,
          scenes
        }
      })
      updateStepProgress('storyboard', 100)
    }
  }

  const handleNextStep = () => {
    handleSave()
    router.push('/dashboard/workflow/scene-direction')
  }

  const handlePreviousStep = () => {
    router.push('/dashboard/workflow/ideation')
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Layout className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Vision Board</h1>
        <p className="text-xl text-gray-600">Step 2: Storyboard & Planning</p>
        <p className="text-gray-500 mt-2">Plan your visual sequence and narrative flow</p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Project Progress</h2>
          <span className="text-sm text-gray-500">Step 2 of 4</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-green-600 h-2 rounded-full transition-all duration-300" style={{ width: '50%' }}></div>
        </div>
      </div>

      {/* Storyboard Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Scene Breakdown</h2>
          <Button onClick={addScene} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Scene
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenes.map((scene, index) => (
            <div key={scene.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              {/* Scene Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{scene.order}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setEditingScene(scene)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => deleteScene(scene.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Scene Content */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{scene.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{scene.description}</p>
              
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Duration:</span>
                  <span className="font-medium text-gray-900">{scene.duration}s</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Visual:</span>
                  <p className="text-gray-700 mt-1">{scene.visualNotes}</p>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Audio:</span>
                  <p className="text-gray-700 mt-1">{scene.audioNotes}</p>
                </div>
              </div>

              {/* Scene Actions */}
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="w-4 h-4 mr-1" />
                  Preview
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scene Editor Modal */}
      {editingScene && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Edit Scene</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Scene Title</label>
                <input
                  value={editingScene.title}
                  onChange={(e) => setEditingScene({...editingScene, title: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={editingScene.description}
                  onChange={(e) => setEditingScene({...editingScene, description: e.target.value})}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (seconds)</label>
                  <input
                    type="number"
                    value={editingScene.duration}
                    onChange={(e) => setEditingScene({...editingScene, duration: parseInt(e.target.value)})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                  <input
                    type="number"
                    value={editingScene.order}
                    onChange={(e) => setEditingScene({...editingScene, order: parseInt(e.target.value)})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Visual Notes</label>
                <textarea
                  value={editingScene.visualNotes}
                  onChange={(e) => setEditingScene({...editingScene, visualNotes: e.target.value})}
                  rows={2}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Camera angles, lighting, props, etc."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Audio Notes</label>
                <textarea
                  value={editingScene.audioNotes}
                  onChange={(e) => setEditingScene({...editingScene, audioNotes: e.target.value})}
                  rows={2}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Music, sound effects, voiceover, etc."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-6">
              <Button variant="outline" onClick={() => setEditingScene(null)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  updateScene(editingScene.id, editingScene)
                  setEditingScene(null)
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

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
            <span className="text-sm text-gray-500">Progress: 50%</span>
            <Button 
              onClick={handleNextStep}
              className="bg-green-600 hover:bg-green-700"
            >
              Next Step
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
