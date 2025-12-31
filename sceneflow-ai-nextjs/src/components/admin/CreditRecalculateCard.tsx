'use client'

import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { toast } from 'sonner'
import { Calculator, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'

interface RecalculateResult {
  projectId?: string
  projectName?: string
  previousCreditsUsed: number
  newCreditsUsed: number
  difference: number
  assetCounts: {
    images: number
    videos: number
    audioMinutes: number
  }
}

interface RecalculateAllResult {
  totalProjectsProcessed: number
  totalCreditsRecalculated: number
  results: RecalculateResult[]
}

export function CreditRecalculateCard() {
  const [loading, setLoading] = useState(false)
  const [dryRun, setDryRun] = useState(true)
  const [projectId, setProjectId] = useState('')
  const [results, setResults] = useState<RecalculateResult | RecalculateAllResult | null>(null)

  const handleRecalculateAll = async () => {
    if (!dryRun) {
      const confirmed = window.confirm(
        'Are you sure you want to recalculate credits for ALL projects? This will update credit usage in the database.'
      )
      if (!confirmed) return
    }

    setLoading(true)
    setResults(null)

    try {
      const response = await fetch(`/api/admin/recalculate-credits?dryRun=${dryRun}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to recalculate credits')
      }

      setResults(data)
      toast.success(
        dryRun
          ? `Preview: ${data.totalProjectsProcessed} projects analyzed`
          : `Successfully recalculated credits for ${data.totalProjectsProcessed} projects`
      )
    } catch (error: any) {
      toast.error(error.message || 'Failed to recalculate credits')
      console.error('Recalculation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRecalculateSingle = async () => {
    if (!projectId.trim()) {
      toast.error('Please enter a project ID')
      return
    }

    if (!dryRun) {
      const confirmed = window.confirm(
        `Are you sure you want to recalculate credits for project ${projectId}? This will update credit usage in the database.`
      )
      if (!confirmed) return
    }

    setLoading(true)
    setResults(null)

    try {
      const response = await fetch('/api/admin/recalculate-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, dryRun })
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to recalculate credits')
      }

      setResults(data)
      toast.success(
        dryRun
          ? `Preview: Credits would change by ${data.difference > 0 ? '+' : ''}${data.difference}`
          : `Successfully recalculated credits for project`
      )
    } catch (error: any) {
      toast.error(error.message || 'Failed to recalculate credits')
      console.error('Recalculation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const isSingleResult = (result: any): result is RecalculateResult => {
    return result && 'projectId' in result
  }

  const isAllResult = (result: any): result is RecalculateAllResult => {
    return result && 'totalProjectsProcessed' in result
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <Calculator className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">Recalculate Project Credits</h3>
          <p className="text-sm text-gray-400">
            Recalculate credit usage based on existing project assets (images, videos, audio).
            Use dry-run mode to preview changes before applying.
          </p>
        </div>
      </div>

      {/* Dry Run Toggle */}
      <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
        <input
          type="checkbox"
          id="dryRun"
          checked={dryRun}
          onChange={(e) => setDryRun(e.target.checked)}
          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-900"
        />
        <label htmlFor="dryRun" className="flex-1 text-sm text-gray-300 cursor-pointer">
          <span className="font-medium">Dry Run Mode</span>
          <span className="text-gray-400 block text-xs mt-0.5">
            {dryRun ? 'Preview changes without updating database' : 'Apply changes to database'}
          </span>
        </label>
        {!dryRun && (
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4" />
            Live Mode
          </div>
        )}
      </div>

      {/* Recalculate All Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-white">Recalculate All Projects</h4>
            <p className="text-xs text-gray-400 mt-0.5">
              Process all projects in the database
            </p>
          </div>
          <Button
            onClick={handleRecalculateAll}
            disabled={loading}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              'Recalculate All'
            )}
          </Button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-800" />

      {/* Recalculate Single Project Section */}
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-medium text-white mb-2">Recalculate Single Project</h4>
          <p className="text-xs text-gray-400 mb-3">
            Enter a specific project ID to recalculate
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="Enter project ID"
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <Button
            onClick={handleRecalculateSingle}
            disabled={loading || !projectId.trim()}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              'Recalculate'
            )}
          </Button>
        </div>
      </div>

      {/* Results Display */}
      {results && (
        <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            {dryRun ? 'Preview Results' : 'Recalculation Complete'}
          </div>

          {isSingleResult(results) && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Project ID</div>
                  <div className="text-white font-mono text-xs">{results.projectId}</div>
                </div>
                {results.projectName && (
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Project Name</div>
                    <div className="text-white text-xs">{results.projectName}</div>
                  </div>
                )}
              </div>
              
              <div className="border-t border-gray-700 pt-2 grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Previous Credits</div>
                  <div className="text-white font-medium">{results.previousCreditsUsed.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">New Credits</div>
                  <div className="text-white font-medium">{results.newCreditsUsed.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Difference</div>
                  <div className={`font-medium ${results.difference > 0 ? 'text-red-400' : results.difference < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                    {results.difference > 0 ? '+' : ''}{results.difference.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-2">
                <div className="text-xs text-gray-400 mb-2">Asset Breakdown</div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400">Images:</span>
                    <span className="text-white ml-1 font-medium">{results.assetCounts.images}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Videos:</span>
                    <span className="text-white ml-1 font-medium">{results.assetCounts.videos}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Audio:</span>
                    <span className="text-white ml-1 font-medium">{results.assetCounts.audioMinutes.toFixed(1)}m</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isAllResult(results) && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Projects Processed</div>
                  <div className="text-white font-medium text-lg">{results.totalProjectsProcessed}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Total Credits Adjusted</div>
                  <div className="text-white font-medium text-lg">{results.totalCreditsRecalculated.toLocaleString()}</div>
                </div>
              </div>

              {results.results.length > 0 && (
                <div className="border-t border-gray-700 pt-3">
                  <div className="text-xs text-gray-400 mb-2">
                    Recent Results (showing {Math.min(5, results.results.length)} of {results.results.length})
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {results.results.slice(0, 5).map((result, idx) => (
                      <div key={idx} className="p-2 bg-gray-900/50 rounded border border-gray-700/50">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-mono text-gray-300">{result.projectId}</div>
                          <div className={`text-xs font-medium ${result.difference > 0 ? 'text-red-400' : result.difference < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                            {result.difference > 0 ? '+' : ''}{result.difference.toLocaleString()}
                          </div>
                        </div>
                        <div className="flex gap-3 text-xs text-gray-400">
                          <span>{result.assetCounts.images} img</span>
                          <span>{result.assetCounts.videos} vid</span>
                          <span>{result.assetCounts.audioMinutes.toFixed(1)}m audio</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
