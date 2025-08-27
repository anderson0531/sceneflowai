'use client'

import { useEnhancedStore } from '@/store/enhancedStore'
import { WorkflowStep } from '@/types/enhanced-project'
// Removed unused cn import
import { Lightbulb, Layout, Video, Film, CheckCircle2, Lock, Wrench } from 'lucide-react'

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
    description: 'Video Generation',
    icon: Film,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-500',
    borderColor: 'border-green-500'
  },
  {
    id: 'review' as WorkflowStep,
    title: 'Quality Review',
    description: 'Assess & validate quality',
    icon: CheckCircle2,
    color: 'from-teal-500 to-teal-600',
    bgColor: 'bg-teal-500',
    borderColor: 'border-teal-500'
  },
  {
    id: 'optimization' as WorkflowStep,
    title: 'Optimization',
    description: 'Improve & finalize',
    icon: Wrench,
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-500',
    borderColor: 'border-pink-500'
  }
]

export function WorkflowNavigator() {
  const { 
    currentStep, 
    stepProgress, 
    canAdvanceToStep, 
    setCurrentStep 
  } = useEnhancedStore()

  return (
    <div className="border-b border-sf-border bg-sf-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3">
          <div className="flex items-center justify-between text-sm text-sf-text-secondary">
            <span>Project Workflow</span>
            <span>Step {workflowSteps.findIndex(step => step.id === currentStep) + 1} of {workflowSteps.length}</span>
          </div>
          <div className="mt-2">
            <div className="flex items-stretch space-x-4 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 -mx-4 px-4">
              {workflowSteps.map((step, index) => {
                const isActive = currentStep === step.id
                const isCompleted = stepProgress[step.id] >= 100
                const isAccessible = canAdvanceToStep(step.id)
                const Icon = step.icon
                
                return (
                  <div key={step.id} className="flex items-center min-w-[220px] sm:min-w-0">
                    {/* Step Circle */}
                    <button
                      onClick={() => isAccessible && setCurrentStep(step.id)}
                      disabled={!isAccessible}
                      className={`relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 transition-all duration-200 focus:outline-none ${isCompleted ? 'bg-green-500 border-green-500 text-white' : isActive ? `${step.bgColor} border-current text-white` : isAccessible ? 'border-sf-border bg-sf-surface-light text-sf-text-secondary hover:border-sf-primary/50' : 'border-sf-border bg-sf-surface-light text-sf-text-secondary/50 cursor-not-allowed'}`}
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
                      <div className={`text-sm sm:text-base font-medium transition-colors ${isActive ? 'text-sf-text-primary' : 'text-sf-text-secondary'}`}>
                        {step.title}
                      </div>
                      <div className="hidden sm:block text-sm text-sf-text-secondary">
                        {step.description}
                      </div>
                      
                      {/* Progress Bar */}
                      {isAccessible && (
                        <div className="hidden sm:block mt-2 w-full bg-sf-surface-light rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-300 ${step.color.includes('blue') ? 'bg-gradient-to-r from-blue-500 to-blue-600' : ''} ${step.color.includes('purple') ? 'bg-gradient-to-r from-purple-500 to-purple-600' : ''} ${step.color.includes('orange') ? 'bg-gradient-to-r from-orange-500 to-orange-600' : ''} ${step.color.includes('green') ? 'bg-gradient-to-r from-green-500 to-green-600' : ''} ${step.color.includes('teal') ? 'bg-gradient-to-r from-teal-500 to-teal-600' : ''} ${step.color.includes('pink') ? 'bg-gradient-to-r from-pink-500 to-pink-600' : ''}`}
                            style={{ width: `${stepProgress[step.id]}%` }}
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Connector Line */}
                    {index < workflowSteps.length - 1 && (
                      <div className={`hidden sm:block flex-1 h-0.5 mx-4 transition-colors ${isCompleted ? 'bg-green-500' : 'bg-sf-surface-light'}`} />
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
