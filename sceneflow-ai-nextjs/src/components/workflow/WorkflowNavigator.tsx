'use client'

import { useStore } from '@/store/useStore'
import { WorkflowStep } from '@/store/useStore'
// Removed unused cn import
import { 
  Lightbulb, 
  Layout, 
  Video, 
  Film,
  CheckCircle2,
  Lock
} from 'lucide-react'

const workflowSteps = [
  {
    id: 'ideation' as WorkflowStep,
    title: 'The Spark Studio',
    description: 'Ideation & Brainstorming',
    icon: Lightbulb,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-500'
  },
  {
    id: 'storyboard' as WorkflowStep,
    title: 'Vision Board',
    description: 'Storyboard & Planning',
    icon: Layout,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-500',
    borderColor: 'border-purple-500'
  },
  {
    id: 'scene-direction' as WorkflowStep,
    title: 'The Director\'s Chair',
    description: 'Scene Direction & Control',
    icon: Video,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-500',
    borderColor: 'border-orange-500'
  },
  {
    id: 'video-generation' as WorkflowStep,
    title: 'The Screening Room',
    description: 'Video Generation & Review',
    icon: Film,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-500',
    borderColor: 'border-green-500'
  }
]

export function WorkflowNavigator() {
  const { 
    currentStep, 
    stepProgress, 
    canAdvanceToStep, 
    setCurrentStep 
  } = useStore()

  return (
    <div className="bg-card border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Project Workflow
            </h2>
            <div className="text-sm text-gray-600">
              Step {workflowSteps.findIndex(step => step.id === currentStep) + 1} of {workflowSteps.length}
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center space-x-4">
              {workflowSteps.map((step, index) => {
                const isActive = currentStep === step.id
                const isCompleted = stepProgress[step.id] >= 100
                const isAccessible = canAdvanceToStep(step.id)
                const Icon = step.icon
                
                return (
                  <div key={step.id} className="flex items-center">
                    {/* Step Circle */}
                    <button
                      onClick={() => isAccessible && setCurrentStep(step.id)}
                      disabled={!isAccessible}
                      className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white ${isActive ? 'ring-2 ring-offset-2 ring-offset-white' : ''} ${isCompleted ? 'bg-green-500 border-green-500 text-white' : isActive ? `${step.bgColor} border-current text-white` : isAccessible ? 'border-gray-300 bg-gray-100 text-gray-600 hover:border-gray-400 hover:bg-gray-200' : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'}`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : !isAccessible ? (
                        <Lock className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </button>
                    
                    {/* Step Info */}
                    <div className="ml-3 flex-1 min-w-0">
                      <div className={`text-sm font-medium transition-colors ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {step.description}
                      </div>
                      
                      {/* Progress Bar */}
                      {isAccessible && (
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-300 ${step.color.includes('blue') ? 'bg-gradient-to-r from-blue-500 to-blue-600' : ''} ${step.color.includes('purple') ? 'bg-gradient-to-r from-purple-500 to-purple-600' : ''} ${step.color.includes('orange') ? 'bg-gradient-to-r from-orange-500 to-orange-600' : ''} ${step.color.includes('green') ? 'bg-gradient-to-r from-green-500 to-green-600' : ''}`}
                            style={{ width: `${stepProgress[step.id]}%` }}
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Connector Line */}
                    {index < workflowSteps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-4 transition-colors ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
