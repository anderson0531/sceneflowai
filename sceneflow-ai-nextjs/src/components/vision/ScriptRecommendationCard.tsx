
'use client'

import React from 'react'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Film, Users, AlertCircle, CheckCircle, MessageSquare } from 'lucide-react'
import { parseRecommendationText } from '@/lib/script/recommendationParser'

interface ScriptRecommendationCardProps {
  rec: any
  selected: boolean
  onToggle: () => void
}

const categoryIcon = (category?: string) => {
  switch ((category || '').toLowerCase()) {
    case 'pacing':
      return <MessageSquare className="w-3 h-3" />
    case 'dialogue':
      return <Users className="w-3 h-3" />
    case 'visual':
      return <Film className="w-3 h-3" />
    case 'character':
      return <Users className="w-3 h-3" />
    case 'clarity':
      return <CheckCircle className="w-3 h-3" />
    case 'emotion':
      return <AlertCircle className="w-3 h-3" />
    default:
      return <MessageSquare className="w-3 h-3" />
  }
}

const priorityColor = (priority?: string) => {
  switch ((priority || '').toLowerCase()) {
    case 'high':
      return 'bg-red-600 text-white'
    case 'medium':
      return 'bg-yellow-600 text-white'
    case 'low':
      return 'bg-gray-600 text-white'
    default:
      return 'bg-gray-600 text-white'
  }
}

export function ScriptRecommendationCard({ rec, selected, onToggle }: ScriptRecommendationCardProps) {
  const parsed = parseRecommendationText(rec?.description || '')
  const compactTitle = rec?.title || parsed.title || 'Recommendation'
  const compactPriority = rec?.priority || parsed.priority || 'medium'
  const compactCategory = rec?.category || parsed.category || rec?.category || 'clarity'
  const oneLiner = rec?.rationaleOneLiner || parsed.rationaleOneLiner || parsed.effect || ''
  const effectSummary = rec?.effectSummary || parsed.effectSummary || ''
  const [showDetails, setShowDetails] = React.useState(false as any)

  return (
    <div
      className={`p-3 rounded-lg border transition-all cursor-pointer ${
        selected
          ? 'border-sf-primary bg-sf-primary/5 ring-2 ring-sf-primary'
          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-2">
        <Checkbox checked={selected} onCheckedChange={onToggle} className="mt-1" />
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <Badge className={`text-xs ${priorityColor(compactPriority)}`}>{compactPriority}</Badge>
            <div className="flex items-center gap-1">
              {categoryIcon(compactCategory)}
              <span className="text-sm font-medium truncate">{compactTitle}</span>
            </div>
          </div>

          {/* Compact one-liner always visible */}
          {oneLiner && (
            <div className="mb-1">
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2">{oneLiner}</p>
            </div>
          )}
          {effectSummary && (
            <div className="mb-1 text-[11px] text-gray-600 dark:text-gray-400">{effectSummary}</div>
          )}

          {/* Details toggle */}
          <div className="mt-1 mb-1">
            <button
              onClick={(e) => { e.stopPropagation(); setShowDetails((v: boolean) => !v) }}
              className="text-[11px] text-sf-primary hover:underline"
            >
              {showDetails ? 'Hide details' : 'Details'}
            </button>
          </div>

          {showDetails && (
            <div>
              {/* Problem */}
              {parsed.problem && (
                <div className="mb-2">
                  <div className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 mb-0.5">Problem</div>
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{parsed.problem}</p>
                </div>
              )}

              {/* Effect */}
              {parsed.effect && (
                <div className="mb-2">
                  <div className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 mb-0.5">Effect</div>
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{parsed.effect}</p>
                </div>
              )}

              {/* Examples */}
              {parsed.examples.length > 0 && (
                <div className="mb-2">
                  <div className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 mb-1">Examples</div>
                  <ul className="list-disc ml-5 space-y-1">
                    {parsed.examples.map((ex, idx) => (
                      <li key={idx} className="text-xs text-gray-600 dark:text-gray-400">{ex}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Solution */}
              {parsed.actions.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 mb-1">Solution</div>
                  <ol className="list-decimal ml-5 space-y-1">
                    {parsed.actions.map((a, idx) => (
                      <li key={idx} className="text-xs text-gray-600 dark:text-gray-400">{a}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )}

export default ScriptRecommendationCard


