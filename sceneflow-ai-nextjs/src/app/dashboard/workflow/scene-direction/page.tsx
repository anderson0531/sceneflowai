'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { 
  Camera, 
  Video, 
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Play,
  Save,
  Settings,
  Lightbulb,
  Mic,
  Music
} from 'lucide-react'
import Link from 'next/link'

interface Direction {
  id: string
  sceneId: string
  cameraAngle: string
  movement: string
  lighting: string
  props: string
  talent: string
  notes: string
}

export default function SceneDirectionPage() {
  const router = useRouter()
  const { currentProject, updateProject, updateStepProgress, stepProgress } = useStore()
  const [directions, setDirections] = useState<Direction[]>([
    {
      id: '1',
      sceneId: '1',
      cameraAngle: 'Medium close-up',
      movement: 'Static',
      lighting: 'Three-point lighting',
      props: 'Product, desk, background',
      talent: 'Professional presenter',
      notes: 'Focus on product features, clean background'
    }
  ])
  const [editingDirection, setEditingDirection] = useState<Direction | null>(null)

  const addDirection = () => {
    const newDirection: Direction = {
      id: Date.now().toString(),
      sceneId: (directions.length + 1).toString(),
      cameraAngle: '',
      movement: '',
      lighting: '',
      props: '',
      talent: '',
      notes: ''
    }
    setDirections([...directions, newDirection])
  }

  const updateDirection = (id: string, updates: Partial<Direction>) => {
    setDirections(directions.map(direction => 
      direction.id === id ? { ...direction, ...updates } : direction
    ))
  }

  const deleteDirection = (id: string) => {
    setDirections(directions.filter(direction => direction.id !== id))
  }

  const handleSave = () => {
    if (currentProject) {
      updateProject(currentProject.id, {
        metadata: {
          ...currentProject.metadata,
          directions
        }
      })
      updateStepProgress('scene-direction', 100)
    }
  }

  const handleNextStep = () => {
    handleSave()
    router.push('/dashboard/workflow/video-generation')
  }

  const handlePreviousStep = () => {
    router.push('/dashboard/workflow/storyboard')
  }

  const cameraAngles = ['Wide shot', 'Medium shot', 'Close-up', 'Extreme close-up', 'Bird\'s eye', 'Low angle', 'High angle', 'Dutch angle']
  const movements = ['Static', 'Pan left', 'Pan right', 'Tilt up', 'Tilt down', 'Zoom in', 'Zoom out', 'Dolly in', 'Dolly out', 'Tracking']
  const lightingStyles = ['Three-point lighting', 'Natural lighting', 'Low-key lighting', 'High-key lighting', 'Rim lighting', 'Backlighting', 'Soft lighting', 'Hard lighting']

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Video className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">The Director&apos;s Chair</h1>
        <p className="text-xl text-gray-600">Step 3: Scene Direction & Control</p>
        <p className="text-gray-500 mt-2">Direct camera angles, lighting, and production details</p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Project Progress</h2>
          <span className="text-sm text-gray-500">Step 3 of 4</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-orange-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${stepProgress?.['scene-direction'] || 0}%` }}
          ></div>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {stepProgress?.['scene-direction'] || 0}% Complete
        </div>
      </div>

      {/* Production Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Scene Directions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Scene Directions</h2>
            <Button onClick={addDirection} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Direction
            </Button>
          </div>

          <div className="space-y-4">
            {directions.map((direction) => (
              <div key={direction.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{direction.sceneId}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setEditingDirection(direction)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => deleteDirection(direction.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Camera:</span>
                    <p className="text-gray-900">{direction.cameraAngle}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Movement:</span>
                    <p className="text-gray-900">{direction.movement}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Lighting:</span>
                    <p className="text-gray-900">{direction.lighting}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Props:</span>
                    <p className="text-gray-900">{direction.props}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <span className="text-sm font-medium text-gray-500">Talent:</span>
                  <p className="text-gray-900">{direction.talent}</p>
                </div>

                <div className="mt-4">
                  <span className="text-sm font-medium text-gray-500">Notes:</span>
                  <p className="text-gray-700 text-sm">{direction.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Production Tools */}
        <div className="space-y-6">
          {/* Quick Direction Templates */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
              Quick Templates
            </h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Camera className="w-4 h-4 mr-2" />
                Product Showcase
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Video className="w-4 h-4 mr-2" />
                Interview Style
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Play className="w-4 h-4 mr-2" />
                Action Sequence
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Mic className="w-4 h-4 mr-2" />
                Voiceover Setup
              </Button>
            </div>
          </div>

          {/* Production Checklist */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Checklist</h3>
            <div className="space-y-3">
              {[
                'Camera equipment ready',
                'Lighting setup complete',
                'Props and set dressing',
                'Talent briefed',
                'Audio equipment tested',
                'Backup plans prepared'
              ].map((item, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200 p-6">
            <h3 className="text-lg font-semibold text-orange-900 mb-4">Ready for Production?</h3>
            <p className="text-orange-700 text-sm mb-4">
              Once your scene directions are set, move to video generation to bring it all to life.
            </p>
            <Button 
              onClick={handleNextStep}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              Continue to Video Generation
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Direction Editor Modal */}
      {editingDirection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Edit Scene Direction</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Scene ID</label>
                <input
                  value={editingDirection.sceneId}
                  onChange={(e) => setEditingDirection({...editingDirection, sceneId: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Camera Angle</label>
                <select
                  value={editingDirection.cameraAngle}
                  onChange={(e) => setEditingDirection({...editingDirection, cameraAngle: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select camera angle</option>
                  {cameraAngles.map(angle => (
                    <option key={angle} value={angle}>{angle}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Camera Movement</label>
                <select
                  value={editingDirection.movement}
                  onChange={(e) => setEditingDirection({...editingDirection, movement: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select movement</option>
                  {movements.map(movement => (
                    <option key={movement} value={movement}>{movement}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lighting Style</label>
                <select
                  value={editingDirection.lighting}
                  onChange={(e) => setEditingDirection({...editingDirection, lighting: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select lighting</option>
                  {lightingStyles.map(style => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Props & Set Dressing</label>
                <textarea
                  value={editingDirection.props}
                  onChange={(e) => setEditingDirection({...editingDirection, props: e.target.value})}
                  rows={2}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="List all props, furniture, and set elements needed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Talent Requirements</label>
                <textarea
                  value={editingDirection.talent}
                  onChange={(e) => setEditingDirection({...editingDirection, talent: e.target.value})}
                  rows={2}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the talent, wardrobe, and performance direction"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                <textarea
                  value={editingDirection.notes}
                  onChange={(e) => setEditingDirection({...editingDirection, notes: e.target.value})}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any special considerations, timing notes, or creative direction"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-6">
              <Button variant="outline" onClick={() => setEditingDirection(null)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  updateDirection(editingDirection.id, editingDirection)
                  setEditingDirection(null)
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
            <span className="text-sm text-gray-500">Progress: 75%</span>
            <Button 
              onClick={handleNextStep}
              className="bg-orange-600 hover:bg-orange-700"
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
