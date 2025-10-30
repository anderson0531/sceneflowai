'use client'

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
            <Badge className={`text-xs ${priorityColor(rec?.priority)}`}>{rec?.priority || 'medium'}</Badge>
            <div className="flex items-center gap-1">
              {categoryIcon(rec?.category)}
              <span className="text-sm font-medium truncate">{rec?.title || 'Recommendation'}</span>
            </div>
          </div>

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
      </div>
    </div>
  )}

export default ScriptRecommendationCard


