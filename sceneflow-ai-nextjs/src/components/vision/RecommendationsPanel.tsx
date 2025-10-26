'use client'

import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Film, Users, Wand2, AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface Recommendation {
  id: string
  category: 'pacing' | 'dialogue' | 'visual' | 'character' | 'emotion' | 'clarity'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  before: string
  after: string
  rationale: string
  impact: string
}

interface QuickFix {
  id: string
  label: string
  instruction: string
  icon: string
}

interface RecommendationsPanelProps {
  directorRecs: Recommendation[]
  audienceRecs: Recommendation[]
  quickFixes: QuickFix[]
  selectedRecs: string[]
  onToggleRec: (id: string) => void
  onApplyQuickFix: (quickFix: QuickFix) => void
}

export function RecommendationsPanel({
  directorRecs,
  audienceRecs,
  quickFixes,
  selectedRecs,
  onToggleRec,
  onApplyQuickFix
}: RecommendationsPanelProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500 text-white'
      case 'medium': return 'bg-yellow-500 text-white'
      case 'low': return 'bg-gray-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'pacing': return <Clock className="w-3 h-3" />
      case 'dialogue': return <Users className="w-3 h-3" />
      case 'visual': return <Film className="w-3 h-3" />
      case 'character': return <Users className="w-3 h-3" />
      case 'emotion': return <AlertCircle className="w-3 h-3" />
      case 'clarity': return <CheckCircle className="w-3 h-3" />
      default: return <Wand2 className="w-3 h-3" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with Select All/Clear All */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Flow Suggestions</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const allIds = [...directorRecs, ...audienceRecs].map(r => r.id)
              // Toggle based on current state
              if (selectedRecs.length === allIds.length) {
                // Clear all
                allIds.forEach(id => onToggleRec(id))
              } else {
                // Select all
                allIds.filter(id => !selectedRecs.includes(id)).forEach(id => onToggleRec(id))
              }
            }}
            className="text-xs"
          >
            {selectedRecs.length === [...directorRecs, ...audienceRecs].length 
              ? 'Clear All' 
              : 'Select All'}
          </Button>
        </div>
      </div>
      {/* Quick Fixes */}
      {quickFixes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
            <Wand2 className="w-4 h-4 text-green-600" />
            Quick Fixes
          </h3>
          <div className="flex flex-wrap gap-2">
            {quickFixes.map(fix => (
              <Button
                key={fix.id}
                size="sm"
                variant="outline"
                onClick={() => onApplyQuickFix(fix)}
                className="text-xs h-auto py-2 px-3"
              >
                <span className="mr-1">{fix.icon}</span>
                {fix.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Director Recommendations */}
      {directorRecs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Film className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-semibold">Director's Notes</h3>
            <Badge variant="secondary" className="text-xs">
              {directorRecs.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {directorRecs.map(rec => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                isSelected={selectedRecs.includes(rec.id)}
                onToggle={() => onToggleRec(rec.id)}
                perspective="director"
                getPriorityColor={getPriorityColor}
                getCategoryIcon={getCategoryIcon}
              />
            ))}
          </div>
        </div>
      )}

      {/* Audience Recommendations */}
      {audienceRecs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold">Audience Appeal</h3>
            <Badge variant="secondary" className="text-xs">
              {audienceRecs.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {audienceRecs.map(rec => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                isSelected={selectedRecs.includes(rec.id)}
                onToggle={() => onToggleRec(rec.id)}
                perspective="audience"
                getPriorityColor={getPriorityColor}
                getCategoryIcon={getCategoryIcon}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Recommendations */}
      {directorRecs.length === 0 && audienceRecs.length === 0 && quickFixes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
          <p className="text-sm">No recommendations available</p>
          <p className="text-xs">This scene looks good!</p>
        </div>
      )}
    </div>
  )
}

interface RecommendationCardProps {
  recommendation: Recommendation
  isSelected: boolean
  onToggle: () => void
  perspective: 'director' | 'audience'
  getPriorityColor: (priority: string) => string
  getCategoryIcon: (category: string) => React.ReactNode
}

function RecommendationCard({
  recommendation,
  isSelected,
  onToggle,
  perspective,
  getPriorityColor,
  getCategoryIcon
}: RecommendationCardProps) {
  return (
    <div 
      className={`
        p-3 rounded-lg border transition-all cursor-pointer
        ${isSelected 
          ? 'border-sf-primary bg-sf-primary/5 ring-2 ring-sf-primary' 
          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
        }
      `}
      onClick={onToggle}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={`text-xs ${getPriorityColor(recommendation.priority)}`}>
              {recommendation.priority}
            </Badge>
            <div className="flex items-center gap-1">
              {getCategoryIcon(recommendation.category)}
              <span className="text-sm font-medium truncate">{recommendation.title}</span>
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
            {recommendation.description}
          </p>
          
          {/* Before/After Comparison */}
          <div className="space-y-1 mb-2">
            <div className="text-xs">
              <span className="font-medium text-red-600 dark:text-red-400">Before:</span>
              <p className="text-gray-600 dark:text-gray-400 italic text-xs line-clamp-2">
                {recommendation.before}
              </p>
            </div>
            <div className="text-xs">
              <span className="font-medium text-green-600 dark:text-green-400">After:</span>
              <p className="text-gray-900 dark:text-gray-100 text-xs line-clamp-2">
                {recommendation.after}
              </p>
            </div>
          </div>
          
          {/* Rationale */}
          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
            <div className="mb-1">
              <strong className="text-gray-700 dark:text-gray-300">Why:</strong>
              <span className="text-gray-600 dark:text-gray-400 ml-1">
                {recommendation.rationale}
              </span>
            </div>
            <div>
              <strong className="text-gray-700 dark:text-gray-300">Impact:</strong>
              <span className="text-gray-600 dark:text-gray-400 ml-1">
                {recommendation.impact}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
