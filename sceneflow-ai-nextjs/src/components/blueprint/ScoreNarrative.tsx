'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Lightbulb, 
  FileText, 
  Film,
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { 
  getScoreNarrative, 
  generateScoreSummary,
  type FixPhase 
} from '@/lib/treatment/scoringChecklist'

interface ScoreNarrativeProps {
  scores: {
    originality: number
    characterDepth: number
    pacing: number
    genreFidelity: number
    commercialViability: number
  }
  overallScore: number
}

const PHASE_BADGES: Record<FixPhase, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  'blueprint': { label: 'Blueprint', icon: Lightbulb, color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
  'script': { label: 'Script', icon: FileText, color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  'both': { label: 'Both Phases', icon: Film, color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
}

export function ScoreNarrative({ scores, overallScore }: ScoreNarrativeProps) {
  const { summary, blueprintFocus, scriptFocus } = useMemo(
    () => generateScoreSummary(scores, overallScore),
    [scores, overallScore]
  )
  
  // Get narratives for weak areas only
  const weakAxisNarratives = useMemo(() => {
    const scoreMap = {
      'concept-originality': scores.originality,
      'character-depth': scores.characterDepth,
      'pacing-structure': scores.pacing,
      'genre-fidelity': scores.genreFidelity,
      'commercial-viability': scores.commercialViability
    }
    
    return Object.entries(scoreMap)
      .filter(([, score]) => score < 70)
      .map(([axisId, score]) => ({
        axisId,
        score,
        ...getScoreNarrative(axisId, score)
      }))
      .sort((a, b) => a.score - b.score) // Sort by lowest score first
  }, [scores])
  
  // If score is great, show minimal narrative
  if (overallScore >= 80) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 p-3 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-lg border border-emerald-500/20"
      >
        <div className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-gray-300">{summary}</p>
            {scriptFocus.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Script phase focus: {scriptFocus.slice(0, 2).join('; ')}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    )
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 space-y-3"
    >
      {/* Overall Summary */}
      <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-300">{summary}</p>
        </div>
      </div>
      
      {/* Weak Areas with Phase Indicators */}
      {weakAxisNarratives.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider">
            Areas for Improvement
          </p>
          
          {weakAxisNarratives.slice(0, 3).map(({ axisId, score, explanation, bestFixedIn, tips }) => {
            const phaseBadge = PHASE_BADGES[bestFixedIn]
            const PhaseIcon = phaseBadge.icon
            const axisLabel = axisId
              .split('-')
              .map(w => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ')
            
            return (
              <div 
                key={axisId}
                className="p-2.5 bg-slate-800/20 rounded-lg border border-slate-700/20"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-white">{axisLabel}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{score}/100</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${phaseBadge.color}`}>
                      <PhaseIcon className="w-2.5 h-2.5" />
                      Best in {phaseBadge.label}
                    </span>
                  </div>
                </div>
                
                <p className="text-xs text-gray-400 mb-2">{explanation}</p>
                
                {tips.length > 0 && (
                  <div className="space-y-1">
                    {tips.slice(0, 2).map((tip, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                        <ChevronRight className="w-3 h-3 text-cyan-400" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      
      {/* Blueprint vs Script Focus Summary */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        {blueprintFocus.length > 0 && (
          <div className="p-2 bg-cyan-500/5 rounded-lg border border-cyan-500/10">
            <div className="flex items-center gap-1 text-cyan-400 mb-1">
              <Lightbulb className="w-3 h-3" />
              <span className="font-medium">Blueprint Focus</span>
            </div>
            <p className="text-gray-500">{blueprintFocus.length} area{blueprintFocus.length > 1 ? 's' : ''} to improve here</p>
          </div>
        )}
        
        {scriptFocus.length > 0 && (
          <div className="p-2 bg-purple-500/5 rounded-lg border border-purple-500/10">
            <div className="flex items-center gap-1 text-purple-400 mb-1">
              <FileText className="w-3 h-3" />
              <span className="font-medium">Script Focus</span>
            </div>
            <p className="text-gray-500">{scriptFocus.length} area{scriptFocus.length > 1 ? 's' : ''} to refine in script</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
