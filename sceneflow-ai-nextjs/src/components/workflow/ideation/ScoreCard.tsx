'use client'

import { Button } from '@/components/ui/Button'

interface ScoreCardProps {
  uiMode: 'guided' | 'advanced'
  scores: any | null
  scoreCard: { audience: number; director: number } | null
  cueAnalysis: any | null
  hasUnscoredChanges: boolean
  showScoreCard: boolean
  setShowScoreCard: (fn: (v: boolean) => boolean | boolean) => void
  attributes: any | null
}

export function ScoreCard(props: ScoreCardProps) {
  const { uiMode, scores, scoreCard, cueAnalysis, hasUnscoredChanges, showScoreCard, setShowScoreCard, attributes } = props
  return (
    <div className="bg-sf-surface rounded-xl border border-sf-border p-6 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-sf-text-primary">Score Card</h3>
        <div className="flex items-center gap-2">
          {hasUnscoredChanges && (
            <span className="text-sm px-2 py-1 rounded-full border border-amber-400 text-amber-300">Update required</span>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowScoreCard(v=>!v)} aria-expanded={showScoreCard}>{showScoreCard ? 'Hide' : 'Show'}</Button>
        </div>
      </div>
      {showScoreCard && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-sf-primary mb-2">{scoreCard ? scoreCard.audience.toFixed(1) : (cueAnalysis?.audience_alignment ? (cueAnalysis.audience_alignment * 10).toFixed(1) : '8.7')}</div>
              <div className="text-sm font-medium text-sf-text-primary mb-2">Audience Score</div>
              <div className="text-sm text-sf-text-secondary">
                <p>Strong appeal to {attributes?.targetAudience?.value || 'target audience'}</p>
                <p>High engagement potential</p>
                <p>Trending topic relevance</p>
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-sf-primary mb-2">{scoreCard ? scoreCard.director.toFixed(1) : (cueAnalysis?.narrative_strength ? (cueAnalysis.narrative_strength * 10).toFixed(1) : '8.4')}</div>
              <div className="text-sm font-medium text-sf-text-primary mb-2">Directors Score</div>
              <div className="text-sm text-sf-text-secondary">
                <p>Clear narrative structure</p>
                <p>Strong visual potential</p>
                <p>Executable concept</p>
              </div>
            </div>
          </div>
          {scores?.breakdown && uiMode==='advanced' && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="bg-sf-surface-light border border-sf-border rounded p-3">
                <div className="text-sm font-semibold text-sf-text-primary mb-2">Audience Score Factors</div>
                <ul className="text-sm text-sf-text-secondary space-y-1 list-disc ml-4">
                  {scores.breakdown.audienceFactors.map((f: any, i: number)=> (
                    <li key={i}><span className="text-sf-text-primary">{f.label}</span>: +{f.contribution} {f.note ? `(${f.note})` : ''}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-sf-surface-light border border-sf-border rounded p-3">
                <div className="text-sm font-semibold text-sf-text-primary mb-2">Director's Score Factors</div>
                <ul className="text-sm text-sf-text-secondary space-y-1 list-disc ml-4">
                  {scores.breakdown.technicalFactors.map((f: any, i: number)=> (
                    <li key={i}><span className="text-sf-text-primary">{f.label}</span>: +{f.contribution} {f.note ? `(${f.note})` : ''}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}




















