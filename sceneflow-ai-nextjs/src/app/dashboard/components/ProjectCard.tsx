'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Play, 
  Video, 
  FileText, 
  Camera, 
  Film, 
  CheckCircle, 
  Wrench,
  Sparkles,
  Eye,
  Clock,
  DollarSign,
  Key,
  AlertTriangle
} from 'lucide-react'
import { useEnhancedStore } from '@/store/enhancedStore'
import { useCueStore } from '@/store/useCueStore'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

interface ProjectCardProps {
  project: {
    id: string
    title: string
    description: string
    currentStep: string
    progress: number
    status: string
    createdAt: Date
    updatedAt: Date
    completedSteps: string[]
    metadata?: {
      genre?: string
      duration?: number
      targetAudience?: string
      style?: string
      concept?: string
      keyMessage?: string
      tone?: string
    }
  }
  className?: string
}

export function ProjectCard({ project, className = '' }: ProjectCardProps) {
  const { user, byokSettings } = useEnhancedStore()
  const { invokeCue } = useCueStore()
  const [isHovered, setIsHovered] = useState(false)

  // Enhanced workflow step mapping with phase information
  const workflowSteps = {
    'ideation': { 
      name: 'Script Analysis', 
      phase: 1, 
      stepNumber: 1,
      icon: FileText,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/40'
    },
    'storyboard': { 
      name: 'Storyboarding', 
      phase: 1, 
      stepNumber: 2,
      icon: Eye,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/40'
    },
    'scene-direction': { 
      name: "Director's Chair", 
      phase: 1, 
      stepNumber: 3,
      icon: Camera,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/40'
    },
    'video-generation': { 
      name: 'Video Generation', 
      phase: 2, 
      stepNumber: 4,
      icon: Film,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/40'
    },
    'review': { 
      name: 'Quality Review', 
      phase: 2, 
      stepNumber: 5,
      icon: CheckCircle,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/40'
    },
    'optimization': { 
      name: 'Optimization', 
      phase: 2, 
      stepNumber: 6,
      icon: Wrench,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/40'
    }
  }

  const currentStepInfo = workflowSteps[project.currentStep as keyof typeof workflowSteps]
  const isPhase1Complete = project.completedSteps.includes('scene-direction')
  const isPhase2Available = isPhase1Complete
  const hasValidBYOK = Boolean(byokSettings?.videoGenerationProvider?.isConfigured)

  // Calculate estimated costs based on project complexity and duration
  const getEstimatedCosts = () => {
    const baseAnalysisCost = 150 // credits per step
    const analysisCreditsUsed = project.completedSteps.length * baseAnalysisCost
    const estimatedBYOKCost = project.metadata?.duration ? 
      Math.max(5, project.metadata.duration * 0.5) : 15 // $0.50 per minute, minimum $5
    
    return {
      analysisCredits: analysisCreditsUsed,
      estimatedBYOK: estimatedBYOKCost
    }
  }

  const costs = getEstimatedCosts()

  // Handle Generate Video button click with JIT BYOK onboarding
  const handleGenerateVideo = () => {
    if (!hasValidBYOK) {
      // Trigger Cue with BYOK onboarding flow
      invokeCue({
        type: 'analysis',
        content: 'BYOK_GUIDED_SETUP',
        payload: {
          projectId: project.id,
          projectTitle: project.title,
          estimatedCost: costs.estimatedBYOK,
          message: `I need help setting up BYOK (Bring Your Own Key) to generate video for "${project.title}". The estimated cost is $${costs.estimatedBYOK}. Can you guide me through the setup process?`
        }
      })
    } else {
      // Proceed to generation page
      window.location.href = `/dashboard/workflow/video-generation?project=${project.id}`
    }
  }



  // Get workflow status display
  const getWorkflowStatus = () => {
    if (isPhase1Complete) {
      return {
        text: 'Pre-Production Complete',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/40'
      }
    } else {
      return {
        text: `Step ${currentStepInfo.stepNumber}/6: ${currentStepInfo.name}`,
        color: currentStepInfo.color,
        bgColor: currentStepInfo.bgColor,
        borderColor: currentStepInfo.borderColor
      }
    }
  }

  const workflowStatus = getWorkflowStatus()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-2xl overflow-hidden ${className}`}
    >
      {/* Project Thumbnail */}
      <div className="relative h-40 bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center">
        <div className="text-center">
          <div className={`w-16 h-16 mx-auto mb-3 ${currentStepInfo.bgColor} ${currentStepInfo.borderColor} border-2 rounded-xl flex items-center justify-center`}>
            <currentStepInfo.icon className={`w-8 h-8 ${currentStepInfo.color}`} />
          </div>
          <p className="text-gray-400 text-sm">Project Thumbnail</p>
        </div>
        
        {/* Phase Indicator */}
        <div className="absolute top-3 right-3">
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            currentStepInfo.phase === 1 
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' 
              : 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
          }`}>
            Phase {currentStepInfo.phase}
          </div>
        </div>
      </div>

      {/* Project Content */}
      <div className="p-6">
        {/* Project Header */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white mb-2">{project.title}</h3>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {project.metadata?.duration ? `${project.metadata.duration} min` : 'Duration TBD'}
            </span>
            {project.metadata?.genre && (
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {project.metadata.genre}
              </span>
            )}
          </div>
        </div>

        {/* Workflow Status */}
        <div className="mb-4">
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${workflowStatus.bgColor} ${workflowStatus.borderColor} border`}>
            <span className={`text-sm font-semibold ${workflowStatus.color}`}>
              {workflowStatus.text}
            </span>
          </div>
        </div>

        {/* Costs & Budgeting */}
        <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
            Costs & Budgeting
          </h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Analysis Credits Used:</span>
              <span className="text-sm font-semibold text-white">{costs.analysisCredits}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Est. BYOK (if generating):</span>
              <span className="text-sm font-semibold text-white">~${costs.estimatedBYOK}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {isPhase1Complete ? (
            // Phase 2: Dual pathway options
            <>
              {/* Primary: Generate Video */}
              <Button
                onClick={handleGenerateVideo}
                className={`w-full h-12 text-base font-semibold transition-all duration-200 ${
                  hasValidBYOK 
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg shadow-orange-500/25' 
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25'
                }`}
              >
                <Video className="w-5 h-5 mr-2" />
                {hasValidBYOK ? 'Generate Video' : 'Setup BYOK & Generate'}
              </Button>


            </>
          ) : (
            // Phase 1: Continue current step
            <Button
              onClick={() => window.location.href = `/dashboard/workflow/${project.currentStep}?project=${project.id}`}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-base font-semibold shadow-lg shadow-blue-500/25"
            >
              <Play className="w-5 h-5 mr-2" />
              Resume Project
            </Button>
          )}
        </div>

        {/* BYOK Status Indicator */}
        {isPhase2Available && (
          <div className="mt-4 p-3 rounded-lg border border-gray-700/50 bg-gray-800/30">
            <div className="flex items-center gap-2">
              <Key className={`w-4 h-4 ${hasValidBYOK ? 'text-green-400' : 'text-yellow-400'}`} />
              <span className="text-sm text-gray-300">
                {hasValidBYOK 
                  ? 'BYOK Configured - Ready for AI Generation' 
                  : 'BYOK Required for AI Video Generation'
                }
              </span>
            </div>
            
            {!hasValidBYOK && (
              <div className="mt-2 flex items-center gap-2 text-xs text-yellow-400">
                <AlertTriangle className="w-3 h-3" />
                <span>Click "Generate Video" to setup your API keys</span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
