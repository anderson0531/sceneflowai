'use client'

import React, { useState } from 'react'
import { X, ChevronRight, Lightbulb, BookOpen, Sparkles, CheckCircle, AlertCircle } from 'lucide-react'
import { type WorkflowStep } from './SceneWorkflowCoPilot'
import { guidanceContent } from './SceneWorkflowCoPilot'

interface SceneWorkflowCoPilotPanelProps {
  activeStep: WorkflowStep | null
  isOpen: boolean
  onClose: () => void
  onRegenerate?: () => void
  onRunReview?: () => void
  onViewReferences?: () => void
  sceneIdx?: number
  generatingDirectionFor?: number | null
  generatingScoreFor?: number | null
}

export function SceneWorkflowCoPilotPanel({
  activeStep,
  isOpen,
  onClose,
  onRegenerate,
  onRunReview,
  onViewReferences,
  sceneIdx,
  generatingDirectionFor,
  generatingScoreFor,
}: SceneWorkflowCoPilotPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['insights', 'methodology']))

  if (!activeStep || !isOpen) return null

  const content = guidanceContent[activeStep]
  if (!content) return null

  const isGenerating = (generatingDirectionFor === sceneIdx) || (generatingScoreFor === sceneIdx)
  const stepStatus = isGenerating ? 'generating' : 'ready'

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const getRegenerateLabel = () => {
    switch (activeStep) {
      case 'dialogueAction':
        return 'Regenerate Script'
      case 'directorsChair':
        return 'Regenerate Direction'
      case 'storyboardPreViz':
        return 'Regenerate Storyboard'
      case 'callAction':
        return 'Regenerate Segments'
      default:
        return 'Regenerate'
    }
  }

  const getReviewLabel = () => {
    switch (activeStep) {
      case 'dialogueAction':
        return 'Run Script Review'
      case 'directorsChair':
        return 'Run Technical Review'
      case 'storyboardPreViz':
        return 'Review Storyboard'
      case 'callAction':
        return 'Review Segments'
      default:
        return 'Run Review'
    }
  }

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-slate-900 border-l border-slate-700 p-4 overflow-y-auto shadow-2xl z-40">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-extrabold text-white flex items-center">
          <span className="mr-2 text-2xl">🤖</span> AI Co-Pilot
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition p-1 rounded hover:bg-slate-800"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Goal & Status */}
      <div className="mb-6 p-3 rounded-lg bg-slate-800 border border-slate-700">
        <p className="text-xs font-semibold uppercase text-sf-primary mb-1">Current Focus</p>
        <p className="text-lg font-bold text-white mb-2">{content.title}</p>
        <div className="mt-2 flex items-center">
          {stepStatus === 'generating' ? (
            <>
              <div className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse" />
              <p className="text-sm text-blue-400 font-medium">Generating...</p>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
              <p className="text-sm text-green-400 font-medium">Ready for AI Review</p>
            </>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-2">{content.goal}</p>
      </div>

      {/* AI Tools & Actions */}
      <div className="space-y-3 mb-6">
        <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sf-primary" />
          AI Actions
        </h4>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={isGenerating}
            className="w-full py-3 bg-sf-primary hover:bg-sf-primary/90 text-white font-bold rounded-lg transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {getRegenerateLabel()}
              </>
            )}
          </button>
        )}
        {onRunReview && (
          <button
            onClick={onRunReview}
            disabled={isGenerating}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {getReviewLabel()}
          </button>
        )}
        {onViewReferences && (
          <button
            onClick={onViewReferences}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition text-sm border border-slate-600"
          >
            View References
          </button>
        )}
      </div>

      {/* Contextual Help */}
      <div className="space-y-3">
        {/* Key Insights */}
        <details
          open={expandedSections.has('insights')}
          className="bg-slate-800 rounded-lg border border-slate-700"
        >
          <summary
            className="p-3 font-semibold text-slate-200 cursor-pointer flex items-center justify-between list-none"
            onClick={(e) => {
              e.preventDefault()
              toggleSection('insights')
            }}
          >
            <span className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              Key Insights
            </span>
            <ChevronRight
              className={`w-4 h-4 text-slate-400 transition-transform ${
                expandedSections.has('insights') ? 'rotate-90' : ''
              }`}
            />
          </summary>
          <div className="px-3 pb-3 pt-0">
            <p className="text-sm text-slate-400 leading-relaxed">{content.whyItMatters}</p>
            {content.bestPractice && (
              <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="font-semibold">Best Practice:</span>
                </div>
                <p className="mt-1">{content.bestPractice}</p>
              </div>
            )}
            {content.tip && (
              <div className="mt-2 p-2 bg-slate-700/50 rounded text-xs text-slate-300">
                <span className="font-semibold">💡 Tip:</span> {content.tip}
              </div>
            )}
          </div>
        </details>

        {/* Methodology */}
        <details
          open={expandedSections.has('methodology')}
          className="bg-slate-800 rounded-lg border border-slate-700"
        >
          <summary
            className="p-3 font-semibold text-slate-200 cursor-pointer flex items-center justify-between list-none"
            onClick={(e) => {
              e.preventDefault()
              toggleSection('methodology')
            }}
          >
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              Methodology
            </span>
            <ChevronRight
              className={`w-4 h-4 text-slate-400 transition-transform ${
                expandedSections.has('methodology') ? 'rotate-90' : ''
              }`}
            />
          </summary>
          <div className="px-3 pb-3 pt-0">
            <ul className="list-disc list-inside space-y-2 text-sm text-slate-400">
              {content.howItWorks.map((step, idx) => (
                <li key={idx} className="leading-relaxed">{step}</li>
              ))}
            </ul>
            {content.toolsAndTips && content.toolsAndTips.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-300 uppercase mb-2">Tools & Tips</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-400">
                  {content.toolsAndTips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  )
}





