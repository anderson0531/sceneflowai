'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  Users, 
  Film, 
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react'
import { 
  ValidationResult, 
  getValidationStatus, 
  getValidationThresholds,
  SAMPLE_SCREENPLAY_FORMAT 
} from '@/lib/script/scriptValidator'
import { ParsedScript } from '@/lib/script/scriptParser'
import {
  type CompletenessResult,
  getCompletenessStatus,
  hasErrorLevelGaps,
  hasImprovableGaps,
} from '@/lib/script/scriptCompleteness'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

type ImportReadiness = 'blocked' | 'warning' | 'success'

interface ScriptImportFeedbackProps {
  validation: ValidationResult | null
  parsedScript: ParsedScript | null
  completeness?: CompletenessResult | null
  gapFillSummary?: string | null
  isProcessing: boolean
  onProceed: () => void
  onCancel: () => void
  onImagineGaps?: () => void
  onFixFormat?: () => void // legacy alias; format errors use sample format only
}

function deriveImportReadiness(
  validation: ValidationResult,
  completeness: CompletenessResult | null | undefined
): ImportReadiness {
  const t = getValidationThresholds()
  if (validation.confidence < t.ERROR) return 'blocked'
  if (completeness && hasErrorLevelGaps(completeness.gaps)) return 'blocked'
  if (validation.confidence < t.WARNING || (completeness && completeness.gaps.length > 0)) {
    return 'warning'
  }
  return 'success'
}

export function ScriptImportFeedback({
  validation,
  parsedScript,
  completeness,
  gapFillSummary,
  isProcessing,
  onProceed,
  onCancel,
  onImagineGaps,
  onFixFormat,
}: ScriptImportFeedbackProps) {
  const [showIssues, setShowIssues] = useState(true)
  const [showCompleteness, setShowCompleteness] = useState(true)
  const [showSample, setShowSample] = useState(false)
  const [copied, setCopied] = useState(false)

  const thresholds = getValidationThresholds()
  const formatStatus = validation ? getValidationStatus(validation.confidence) : null
  const readiness = validation ? deriveImportReadiness(validation, completeness) : 'blocked'
  const completenessStatus = completeness
    ? getCompletenessStatus(completeness.completenessScore)
    : null

  const handleCopySample = useCallback(() => {
    navigator.clipboard.writeText(SAMPLE_SCREENPLAY_FORMAT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  if (!validation) return null

  const readinessConfig = {
    success: {
      icon: CheckCircle2,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      title: 'Import Readiness: Ready',
      description: 'Format and content look good. Proceed to Vision with your script pre-loaded.',
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      title: 'Import Readiness: Review Recommended',
      description:
        'Your script can be imported, but format or content gaps may affect storyboard quality.',
    },
    blocked: {
      icon: XCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      title: 'Import Readiness: Cannot Proceed',
      description: 'Fix critical format or content issues before importing.',
    },
  }

  const config = readinessConfig[readiness]
  const StatusIcon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border p-6 space-y-6',
        config.bgColor,
        config.borderColor
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={cn('p-3 rounded-lg', config.bgColor)}>
          <StatusIcon className={cn('w-6 h-6', config.color)} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">{config.title}</h3>
          <p className="text-sm text-white/60 mt-1">{config.description}</p>
        </div>
        <div className="text-right">
          <div className={cn('text-2xl font-bold', config.color)}>
            {validation.confidence}%
          </div>
          <div className="text-xs text-white/40">Confidence</div>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-white/50">
          <span>Parse Quality</span>
          <span>
            {validation.confidence < thresholds.ERROR && 'Cannot proceed'}
            {validation.confidence >= thresholds.ERROR && validation.confidence < thresholds.WARNING && 'May have issues'}
            {validation.confidence >= thresholds.WARNING && 'Good quality'}
          </span>
        </div>
        <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${validation.confidence}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={cn(
              'absolute inset-y-0 left-0 rounded-full',
              formatStatus === 'success' && 'bg-green-500',
              formatStatus === 'warning' && 'bg-yellow-500',
              formatStatus === 'error' && 'bg-red-500'
            )}
          />
          {/* Threshold markers */}
          <div 
            className="absolute top-0 bottom-0 w-px bg-white/30" 
            style={{ left: `${thresholds.ERROR}%` }} 
          />
          <div 
            className="absolute top-0 bottom-0 w-px bg-white/30" 
            style={{ left: `${thresholds.WARNING}%` }} 
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={Film}
          label="Scenes"
          value={validation.stats.sceneHeadings}
          subtext={validation.stats.sceneHeadings > 0 ? 'detected' : 'none found'}
          status={validation.stats.sceneHeadings > 0 ? 'success' : 'error'}
        />
        <StatCard
          icon={Users}
          label="Characters"
          value={validation.stats.detectedCharacters.length}
          subtext={validation.stats.detectedCharacters.slice(0, 3).join(', ') || 'none'}
          status={validation.stats.detectedCharacters.length > 0 ? 'success' : 'warning'}
        />
        <StatCard
          icon={FileText}
          label="Dialogue"
          value={validation.stats.dialogueBlocks}
          subtext="blocks"
          status={validation.stats.dialogueBlocks > 0 ? 'success' : 'warning'}
        />
        <StatCard
          icon={Clock}
          label="Est. Duration"
          value={parsedScript ? formatDuration(parsedScript.metadata.totalDuration) : '--'}
          subtext="runtime"
          status="neutral"
        />
      </div>

      {/* Completeness Section */}
      {completeness && (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white/80">Content Completeness</span>
            <span
              className={cn(
                'text-lg font-bold',
                completenessStatus === 'success' && 'text-green-400',
                completenessStatus === 'warning' && 'text-yellow-400',
                completenessStatus === 'error' && 'text-red-400'
              )}
            >
              {completeness.completenessScore}%
            </span>
          </div>

          {gapFillSummary && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg px-3 py-2 text-sm text-purple-200">
              <Sparkles className="inline w-4 h-4 mr-1.5 -mt-0.5" />
              {gapFillSummary}
            </div>
          )}

          {completeness.gaps.length > 0 && (
            <>
              <button
                onClick={() => setShowCompleteness(!showCompleteness)}
                className="flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
              >
                {showCompleteness ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {completeness.gaps.length} Content Gap{completeness.gaps.length !== 1 ? 's' : ''}
              </button>
              <AnimatePresence>
                {showCompleteness && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    {completeness.gaps.map((gap, idx) => (
                      <IssueCard
                        key={`gap-${idx}`}
                        issue={{
                          type: gap.type,
                          code: gap.code,
                          message: gap.message,
                          suggestion: gap.suggestion,
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      )}

      {/* Format Issues Section */}
      {validation.issues.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowIssues(!showIssues)}
            className="flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
          >
            {showIssues ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {validation.issues.length} Issue{validation.issues.length !== 1 ? 's' : ''} Found
          </button>
          
          <AnimatePresence>
            {showIssues && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {validation.issues.map((issue, idx) => (
                  <IssueCard key={idx} issue={issue} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Suggestions */}
      {validation.suggestions.length > 0 && readiness !== 'success' && (
        <div className="bg-white/5 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-white/80">
            <Info className="w-4 h-4" />
            Suggestions
          </div>
          <ul className="text-sm text-white/60 space-y-1 ml-6 list-disc">
            {validation.suggestions.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2">
        {readiness === 'blocked' && (
          <Button variant="outline" onClick={() => setShowSample(true)} className="flex-1">
            <FileText className="w-4 h-4 mr-2" />
            View Sample Format
          </Button>
        )}

        {readiness === 'warning' && (
          <>
            {onImagineGaps && completeness && hasImprovableGaps(completeness.gaps) && (
              <Button
                onClick={onImagineGaps}
                disabled={isProcessing}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {isProcessing ? 'Imagining gaps...' : 'Let SceneFlow Imagine Gaps'}
              </Button>
            )}
            <Button
              onClick={onProceed}
              disabled={isProcessing}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700"
            >
              {isProcessing ? 'Creating Project...' : 'Proceed As-Is'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" onClick={() => setShowSample(true)} className="flex-1 sm:flex-none">
              <FileText className="w-4 h-4 mr-2" />
              Sample Format
            </Button>
          </>
        )}

        {readiness === 'success' && (
          <Button
            onClick={onProceed}
            disabled={isProcessing}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? 'Creating Project...' : 'Proceed to Production'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {onFixFormat && readiness === 'blocked' && (
          <Button
            onClick={onFixFormat}
            disabled={isProcessing}
            variant="outline"
            className="flex-1"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Auto-Fix Format
          </Button>
        )}

        <Button variant="ghost" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
      </div>

      {/* Sample Format Dialog */}
      <Dialog open={showSample} onOpenChange={setShowSample}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Sample Screenplay Format</DialogTitle>
            <DialogDescription>
              Use this format as a reference for importing your script. The system recognizes standard Fountain/screenplay formatting.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            <div className="relative">
              <pre className="bg-zinc-900 rounded-lg p-4 text-sm text-white/80 font-mono whitespace-pre-wrap overflow-x-auto">
                {SAMPLE_SCREENPLAY_FORMAT}
              </pre>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopySample}
                className="absolute top-2 right-2"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
            <h4 className="font-medium text-blue-400 mb-2">Key Format Elements</h4>
            <ul className="text-sm text-white/70 space-y-1">
              <li>• <strong>Scene Headings:</strong> Start with INT. or EXT. (e.g., INT. COFFEE SHOP - DAY)</li>
              <li>• <strong>Character Names:</strong> ALL CAPS on their own line before dialogue</li>
              <li>• <strong>Parentheticals:</strong> (in parentheses) below character name</li>
              <li>• <strong>Dialogue:</strong> Regular text below character name</li>
              <li>• <strong>Action:</strong> Description of what happens, not in caps</li>
              <li>• <strong>Transitions:</strong> CUT TO:, FADE OUT., etc. (optional)</li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// Helper components

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext, 
  status 
}: { 
  icon: React.ElementType
  label: string
  value: string | number
  subtext: string
  status: 'success' | 'warning' | 'error' | 'neutral'
}) {
  const colors = {
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
    neutral: 'text-white/80'
  }

  return (
    <div className="bg-white/5 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-white/40" />
        <span className="text-xs text-white/50">{label}</span>
      </div>
      <div className={cn('text-xl font-semibold', colors[status])}>
        {value}
      </div>
      <div className="text-xs text-white/40 truncate">{subtext}</div>
    </div>
  )
}

const ISSUE_TYPE_CONFIG = {
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
} as const

function IssueCard({ issue }: { issue: { type: string; code: string; message: string; suggestion?: string } }) {
  const config =
    ISSUE_TYPE_CONFIG[issue.type as keyof typeof ISSUE_TYPE_CONFIG] ?? ISSUE_TYPE_CONFIG.error

  const Icon = config.icon

  return (
    <div className={cn('rounded-lg p-3 flex items-start gap-3', config.bg)}>
      <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', config.color)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80">{issue.message}</p>
        {issue.suggestion && (
          <p className="text-xs text-white/50 mt-1">{issue.suggestion}</p>
        )}
      </div>
    </div>
  )
}

function formatDuration(seconds: number): string {
  if (!seconds) return '--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

export default ScriptImportFeedback
