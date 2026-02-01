/**
 * A/B Test Manager Modal
 * 
 * Configuration interface for setting up split tests on screenings.
 * Allows creators to:
 * - Select Version A and Version B content
 * - Set split percentage
 * - Generate a single parent URL for distribution
 * - View test results
 * 
 * The backend randomly assigns testers to variants,
 * with assignment persisted in localStorage for consistency.
 * 
 * @see /src/lib/types/behavioralAnalytics.ts for types
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FlaskConical,
  X,
  Link2,
  Copy,
  Check,
  ArrowRight,
  Percent,
  Play,
  Pause,
  BarChart3,
  Users,
  TrendingUp,
  AlertCircle,
  Loader2,
  Film,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import type { ABTestConfig, ABTestVariant, ABTestResults } from '@/lib/types/behavioralAnalytics'

// ============================================================================
// Types
// ============================================================================

interface ABTestModalProps {
  isOpen: boolean
  onClose: () => void
  screeningId: string
  screeningTitle?: string
  
  // Available streams/videos to choose from
  availableStreams?: StreamOption[]
  
  // Existing config (for editing)
  existingConfig?: ABTestConfig
  
  // Callbacks
  onSave: (config: Omit<ABTestConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
}

interface StreamOption {
  id: string
  title: string
  type: 'stream' | 'external'
  thumbnail?: string
  duration?: number
}

// ============================================================================
// Component
// ============================================================================

export function ABTestModal({
  isOpen,
  onClose,
  screeningId,
  screeningTitle,
  availableStreams = [],
  existingConfig,
  onSave,
}: ABTestModalProps) {
  // ============================================================================
  // State
  // ============================================================================
  
  const [isActive, setIsActive] = useState(existingConfig?.isActive ?? true)
  const [splitPercentage, setSplitPercentage] = useState(existingConfig?.splitPercentage ?? 50)
  
  // Variant A
  const [variantALabel, setVariantALabel] = useState(existingConfig?.variantA.label ?? '')
  const [variantAStreamId, setVariantAStreamId] = useState(existingConfig?.variantA.streamId ?? '')
  const [variantADescription, setVariantADescription] = useState(existingConfig?.variantA.description ?? '')
  
  // Variant B
  const [variantBLabel, setVariantBLabel] = useState(existingConfig?.variantB.label ?? '')
  const [variantBStreamId, setVariantBStreamId] = useState(existingConfig?.variantB.streamId ?? '')
  const [variantBDescription, setVariantBDescription] = useState(existingConfig?.variantB.description ?? '')
  
  // UI State
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  // ============================================================================
  // Generate Share URL
  // ============================================================================
  
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/s/${screeningId}?ab=true`
    : ''
  
  // ============================================================================
  // Handlers
  // ============================================================================
  
  const handleSave = useCallback(async () => {
    // Validate
    if (!variantALabel.trim()) {
      setError('Please enter a label for Version A')
      return
    }
    if (!variantAStreamId) {
      setError('Please select a video for Version A')
      return
    }
    if (!variantBLabel.trim()) {
      setError('Please enter a label for Version B')
      return
    }
    if (!variantBStreamId) {
      setError('Please select a video for Version B')
      return
    }
    
    setIsSaving(true)
    setError(null)
    
    try {
      await onSave({
        screeningId,
        isActive,
        variantA: {
          id: existingConfig?.variantA.id || '',
          label: variantALabel.trim(),
          description: variantADescription.trim() || undefined,
          streamId: variantAStreamId,
        },
        variantB: {
          id: existingConfig?.variantB.id || '',
          label: variantBLabel.trim(),
          description: variantBDescription.trim() || undefined,
          streamId: variantBStreamId,
        },
        splitPercentage,
      })
      
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save A/B test configuration')
    } finally {
      setIsSaving(false)
    }
  }, [
    screeningId,
    isActive,
    splitPercentage,
    variantALabel,
    variantAStreamId,
    variantADescription,
    variantBLabel,
    variantBStreamId,
    variantBDescription,
    existingConfig,
    onSave,
    onClose,
  ])
  
  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [shareUrl])
  
  // ============================================================================
  // Render: Stream Selector
  // ============================================================================
  
  const renderStreamSelector = (
    selectedId: string,
    onSelect: (id: string) => void,
    variant: 'A' | 'B'
  ) => (
    <div className="grid grid-cols-2 gap-2">
      {availableStreams.map((stream) => (
        <button
          key={stream.id}
          onClick={() => onSelect(stream.id)}
          className={cn(
            "p-2 rounded-lg border text-left transition-all",
            selectedId === stream.id
              ? variant === 'A'
                ? "border-blue-500 bg-blue-500/10"
                : "border-purple-500 bg-purple-500/10"
              : "border-gray-700 hover:border-gray-600 bg-gray-800/50"
          )}
        >
          <div className="flex items-center gap-2">
            {stream.thumbnail ? (
              <img
                src={stream.thumbnail}
                alt={stream.title}
                className="w-12 h-8 object-cover rounded"
              />
            ) : (
              <div className="w-12 h-8 bg-gray-700 rounded flex items-center justify-center">
                {stream.type === 'external' ? (
                  <Video className="w-4 h-4 text-gray-500" />
                ) : (
                  <Film className="w-4 h-4 text-gray-500" />
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{stream.title}</p>
              <p className="text-xs text-gray-500">
                {stream.type === 'external' ? 'External' : 'Stream'}
              </p>
            </div>
          </div>
        </button>
      ))}
      
      {availableStreams.length === 0 && (
        <div className="col-span-2 p-4 text-center text-gray-500 text-sm">
          No streams available. Create a final cut first.
        </div>
      )}
    </div>
  )
  
  // ============================================================================
  // Render: Results Summary (if exists)
  // ============================================================================
  
  const renderResults = () => {
    if (!existingConfig?.results) return null
    
    const { variantAStats, variantBStats, winningVariant } = existingConfig.results
    
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          Current Results
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Variant A */}
          <div className={cn(
            "p-3 rounded-lg border",
            winningVariant === 'A'
              ? "border-green-500/50 bg-green-500/5"
              : "border-gray-700"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-400">A</span>
              </div>
              <span className="text-sm font-medium text-white">{existingConfig.variantA.label}</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Sessions</span>
                <span className="text-white">{variantAStats.sessionCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Completion</span>
                <span className="text-white">{Math.round(variantAStats.averageCompletionRate)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Engagement</span>
                <span className="text-white">{Math.round(variantAStats.averageEngagementScore)}</span>
              </div>
            </div>
          </div>
          
          {/* Variant B */}
          <div className={cn(
            "p-3 rounded-lg border",
            winningVariant === 'B'
              ? "border-green-500/50 bg-green-500/5"
              : "border-gray-700"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                <span className="text-xs font-bold text-purple-400">B</span>
              </div>
              <span className="text-sm font-medium text-white">{existingConfig.variantB.label}</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Sessions</span>
                <span className="text-white">{variantBStats.sessionCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Completion</span>
                <span className="text-white">{Math.round(variantBStats.averageCompletionRate)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Engagement</span>
                <span className="text-white">{Math.round(variantBStats.averageEngagementScore)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Winner */}
        {winningVariant && winningVariant !== 'tie' && (
          <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded text-sm text-center text-green-400">
            Version {winningVariant} is performing better
          </div>
        )}
      </div>
    )
  }
  
  // ============================================================================
  // Main Render
  // ============================================================================
  
  if (!isOpen) return null
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 rounded-2xl border border-gray-800 shadow-xl"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">A/B Test Configuration</h2>
                {screeningTitle && (
                  <p className="text-sm text-gray-400">{screeningTitle}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white">Enable A/B Testing</h3>
                <p className="text-xs text-gray-400">
                  Randomly assign viewers to different versions
                </p>
              </div>
              <button
                onClick={() => setIsActive(!isActive)}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors",
                  isActive ? "bg-purple-500" : "bg-gray-700"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                    isActive ? "translate-x-7" : "translate-x-1"
                  )}
                />
              </button>
            </div>
            
            {/* Existing Results */}
            {renderResults()}
            
            {/* Variants */}
            <div className="grid grid-cols-2 gap-6">
              {/* Variant A */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-400">A</span>
                  </div>
                  <span className="text-sm font-medium text-white">Version A</span>
                </div>
                
                <Input
                  placeholder="Label (e.g., 'Happy Ending')"
                  value={variantALabel}
                  onChange={(e) => setVariantALabel(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                />
                
                <Input
                  placeholder="Description (optional)"
                  value={variantADescription}
                  onChange={(e) => setVariantADescription(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                />
                
                <div>
                  <label className="text-xs text-gray-400 block mb-2">Select Video</label>
                  {renderStreamSelector(variantAStreamId, setVariantAStreamId, 'A')}
                </div>
              </div>
              
              {/* Variant B */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-purple-400">B</span>
                  </div>
                  <span className="text-sm font-medium text-white">Version B</span>
                </div>
                
                <Input
                  placeholder="Label (e.g., 'Ambiguous Ending')"
                  value={variantBLabel}
                  onChange={(e) => setVariantBLabel(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                />
                
                <Input
                  placeholder="Description (optional)"
                  value={variantBDescription}
                  onChange={(e) => setVariantBDescription(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                />
                
                <div>
                  <label className="text-xs text-gray-400 block mb-2">Select Video</label>
                  {renderStreamSelector(variantBStreamId, setVariantBStreamId, 'B')}
                </div>
              </div>
            </div>
            
            {/* Split Percentage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Traffic Split
                </h3>
                <span className="text-sm text-gray-400">
                  {splitPercentage}% / {100 - splitPercentage}%
                </span>
              </div>
              
              <div className="relative">
                <input
                  type="range"
                  min={10}
                  max={90}
                  step={5}
                  value={splitPercentage}
                  onChange={(e) => setSplitPercentage(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span className="text-blue-400">A: {splitPercentage}%</span>
                  <span className="text-purple-400">B: {100 - splitPercentage}%</span>
                </div>
              </div>
            </div>
            
            {/* Share URL */}
            <div>
              <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Share URL
              </h3>
              <div className="flex items-center gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="bg-gray-800 border-gray-700 text-gray-300"
                />
                <Button
                  variant="outline"
                  onClick={handleCopyUrl}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Testers will be automatically assigned to Version A or B when they visit this link.
              </p>
            </div>
            
            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 px-6 py-4 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FlaskConical className="w-4 h-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ABTestModal
