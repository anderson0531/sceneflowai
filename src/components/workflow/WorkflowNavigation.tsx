'use client'

import React from 'react'
import { useSceneFlowStore } from '@/store/SceneFlowStore'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ModuleProgress } from '@/components/ui/Progress'
import { getModuleDescription, getNextModule } from '@/lib/sceneFlowUtils'
import { 
  Lightbulb, 
  BookOpen, 
  Palette, 
  Video, 
  Play, 
  CheckCircle,
  ArrowRight,
  Home
} from 'lucide-react'

const MODULE_CONFIG = [
  {
    id: 'ideation',
    title: 'The Spark Studio',
    description: 'Forging the core concept from a nascent idea',
    icon: Lightbulb,
    color: 'from-orange-500 to-orange-600'
  },
  {
    id: 'story-structure',
    title: 'Story Structure Studio',
    description: 'Architecting a professional narrative blueprint',
    icon: BookOpen,
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'vision-board',
    title: 'The Vision Board',
    description: 'Translating the written story into visual and technical plans',
    icon: Palette,
    color: 'from-purple-500 to-purple-600'
  },
  {
    id: 'direction',
    title: 'The Director\'s Chair',
    description: 'Generating industry-standard production documents',
    icon: Video,
    color: 'from-green-500 to-green-600'
  },
  {
    id: 'screening-room',
    title: 'The Screening Room',
    description: 'Synthesizing high-fidelity video clips from the production plan',
    icon: Play,
    color: 'from-red-500 to-red-600'
  },
  {
    id: 'quality-control',
    title: 'Quality Control',
    description: 'Reviewing, refining, and finalizing the cinematic product',
    icon: CheckCircle,
    color: 'from-cyan-500 to-cyan-600'
  }
]

export function WorkflowNavigation() {
  const { 
    currentProject, 
    activeModule, 
    moduleProgress, 
    setActiveModule,
    goToNextModule 
  } = useSceneFlowStore()

  if (!currentProject) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No active project. Start by creating a new project.</p>
        </CardContent>
      </Card>
    )
  }

  const currentModuleIndex = MODULE_CONFIG.findIndex(m => m.id === activeModule)
  const canProceed = moduleProgress[activeModule] >= 100

  return (
    <div className="space-y-6">
      {/* Current Module Status */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-lg bg-gradient-to-r ${MODULE_CONFIG[currentModuleIndex]?.color} text-white`}>
              {React.createElement(MODULE_CONFIG[currentModuleIndex]?.icon, { size: 24 })}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">
                {MODULE_CONFIG[currentModuleIndex]?.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {MODULE_CONFIG[currentModuleIndex]?.description}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {moduleProgress[activeModule]}%
              </div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module Progress Overview */}
      <Card>
        <CardContent className="p-6">
          <h4 className="font-semibold mb-4">Workflow Progress</h4>
          <div className="space-y-4">
            {MODULE_CONFIG.map((module, index) => {
              const progress = moduleProgress[module.id] || 0
              const isActive = module.id === activeModule
              const isCompleted = progress === 100
              const isAccessible = index === 0 || moduleProgress[MODULE_CONFIG[index - 1]?.id] === 100
              
              return (
                <div
                  key={module.id}
                  className={`flex items-center space-x-4 p-3 rounded-lg border transition-colors ${
                    isActive ? 'border-primary bg-primary/5' : 
                    isCompleted ? 'border-green-200 bg-green-50' :
                    isAccessible ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isActive ? `bg-gradient-to-r ${module.color} text-white` :
                    isAccessible ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {React.createElement(module.icon, { size: 20 })}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h5 className={`font-medium text-sm ${
                        isActive ? 'text-primary' : 
                        isCompleted ? 'text-green-700' : 
                        isAccessible ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {module.title}
                      </h5>
                      {isCompleted && <CheckCircle size={16} className="text-green-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{module.description}</p>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {progress}%
                    </div>
                    {isAccessible && !isCompleted && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveModule(module.id)}
                        className="mt-1"
                      >
                        {isActive ? 'Current' : 'Open'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Navigation Actions */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setActiveModule('ideation')}
          className="flex items-center space-x-2"
        >
          <Home size={16} />
          <span>Start Over</span>
        </Button>
        
        {canProceed && (
          <Button
            onClick={goToNextModule}
            className="flex items-center space-x-2"
          >
            <span>Continue to Next Module</span>
            <ArrowRight size={16} />
          </Button>
        )}
      </div>
    </div>
  )
}





