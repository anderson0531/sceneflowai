'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '../ui/Button'
import { toast } from 'sonner'
import { Calculator, RefreshCw, AlertCircle, CheckCircle2, Copy, Search, Filter, ChevronLeft, ChevronRight, AlertTriangle, Download } from 'lucide-react'

// Matches API response for single project (POST)
interface SingleProjectResult {
  success: boolean
  dryRun: boolean
  project: {
    projectId: string
    title: string
    previousCreditsUsed: number
    newCreditsUsed: number
    creditDifference: number
    assetCounts: {
      treatmentImages: number
      sceneImages: number
      frameImages: number
      videos: number
      audioMinutes: number
      voiceClones: number
    }
    breakdown: {
      treatmentVisuals: number
      sceneImages: number
      frameImages: number
      videos: number
      audio: number
      voiceClones: number
      total: number
    }
    updated: boolean
  }
  timestamp: string
}

// Project data from the all-projects response
interface ProjectData {
  projectId: string
  title: string
  previousCreditsUsed: number
  newCreditsUsed: number
  assetCounts: {
    treatmentImages: number
    sceneImages: number
    frameImages: number
    videos: number
    audioMinutes: number
    voiceClones: number
  }
  breakdown: {
    treatmentVisuals: number
    sceneImages: number
    frameImages: number
    videos: number
    audio: number
    voiceClones: number
    total: number
  }
  updated: boolean
}

// Matches API response for all projects (GET)
interface AllProjectsResult {
  success: boolean
  dryRun: boolean
  summary: {
    projectsProcessed: number
    projectsUpdated: number
    totalPreviousCredits: number
    totalNewCredits: number
    creditDifference: number
  }
  projects: ProjectData[]
  timestamp: string
}

type RecalculateResult = SingleProjectResult | AllProjectsResult

// Filter options for auditing
type FilterOption = 'all' | 'discrepancy' | 'anomaly' | 'updated' | 'zero-credits' | 'has-assets'

const FILTER_OPTIONS: { value: FilterOption; label: string; description: string }[] = [
  { value: 'all', label: 'All Projects', description: 'Show all projects' },
  { value: 'discrepancy', label: 'With Discrepancies', description: 'Credits changed' },
  { value: 'anomaly', label: 'Anomalies', description: 'Has assets but 0 credits' },
  { value: 'updated', label: 'Updated Only', description: 'Database was updated' },
  { value: 'zero-credits', label: 'Zero Credits', description: 'No credits calculated' },
  { value: 'has-assets', label: 'Has Assets', description: 'Projects with any assets' },
]

const ITEMS_PER_PAGE = 25

export function CreditRecalculateCard() {
  const [loading, setLoading] = useState(false)
  const [dryRun, setDryRun] = useState(true)
  const [projectId, setProjectId] = useState('')
  const [results, setResults] = useState<RecalculateResult | null>(null)
  
  // Filtering and pagination state
  const [filter, setFilter] = useState<FilterOption>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const handleRecalculateAll = async () => {
    if (!dryRun) {
      const confirmed = window.confirm(
        'Are you sure you want to recalculate credits for ALL projects? This will update credit usage in the database.'
      )
      if (!confirmed) return
    }

    setLoading(true)
    setResults(null)
    setCurrentPage(1) // Reset pagination

    try {
      const response = await fetch(`/api/admin/recalculate-credits?dryRun=${dryRun}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to recalculate credits')
      }

      setResults(data)
      toast.success(
        dryRun
          ? `Preview: ${data.summary?.projectsProcessed || 0} projects analyzed`
          : `Successfully recalculated credits for ${data.summary?.projectsUpdated || 0} projects`
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
          ? `Preview: Credits would change by ${data.project?.creditDifference > 0 ? '+' : ''}${data.project?.creditDifference || 0}`
          : `Successfully recalculated credits for project "${data.project?.title || projectId}"`
      )
    } catch (error: any) {
      toast.error(error.message || 'Failed to recalculate credits')
      console.error('Recalculation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const isSingleResult = (result: any): result is SingleProjectResult => {
    return result && 'project' in result && result.project?.projectId
  }

  const isAllResult = (result: any): result is AllProjectsResult => {
    return result && 'summary' in result && 'projects' in result
  }

  // Filter and search projects
  const filteredProjects = useMemo(() => {
    if (!results || !isAllResult(results)) return []
    
    let projects = results.projects
    
    // Apply filter
    switch (filter) {
      case 'discrepancy':
        projects = projects.filter(p => p.newCreditsUsed !== p.previousCreditsUsed)
        break
      case 'anomaly':
        projects = projects.filter(p => {
          const totalAssets = p.assetCounts.treatmentImages + p.assetCounts.sceneImages + 
            p.assetCounts.frameImages + p.assetCounts.videos + p.assetCounts.audioMinutes
          return totalAssets > 0 && p.newCreditsUsed === 0
        })
        break
      case 'updated':
        projects = projects.filter(p => p.updated)
        break
      case 'zero-credits':
        projects = projects.filter(p => p.newCreditsUsed === 0)
        break
      case 'has-assets':
        projects = projects.filter(p => {
          const totalAssets = p.assetCounts.treatmentImages + p.assetCounts.sceneImages + 
            p.assetCounts.frameImages + p.assetCounts.videos + p.assetCounts.audioMinutes
          return totalAssets > 0
        })
        break
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      projects = projects.filter(p => 
        p.title?.toLowerCase().includes(query) ||
        p.projectId.toLowerCase().includes(query)
      )
    }
    
    return projects
  }, [results, filter, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE)
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset to page 1 when filter or search changes
  const handleFilterChange = (newFilter: FilterOption) => {
    setFilter(newFilter)
    setCurrentPage(1)
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
  }

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredProjects.length) return
    
    const headers = ['Project ID', 'Title', 'Previous Credits', 'New Credits', 'Difference', 'Treatment', 'Scenes', 'Frames', 'Videos', 'Audio (min)', 'Updated']
    const rows = filteredProjects.map(p => [
      p.projectId,
      `"${(p.title || 'Untitled').replace(/"/g, '""')}"`,
      p.previousCreditsUsed,
      p.newCreditsUsed,
      p.newCreditsUsed - p.previousCreditsUsed,
      p.assetCounts.treatmentImages,
      p.assetCounts.sceneImages,
      p.assetCounts.frameImages,
      p.assetCounts.videos,
      p.assetCounts.audioMinutes,
      p.updated ? 'Yes' : 'No'
    ])
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `credit-recalculation-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported to CSV')
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
                  <div className="flex items-center gap-2">
                    <div className="text-white font-mono text-xs truncate max-w-[180px]">{results.project.projectId}</div>
                    <button
                      onClick={() => copyToClipboard(results.project.projectId)}
                      className="p-1 hover:bg-gray-700 rounded transition-colors"
                      title="Copy ID"
                    >
                      <Copy className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                </div>
                {results.project.title && (
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Project Name</div>
                    <div className="text-white text-xs">{results.project.title}</div>
                  </div>
                )}
              </div>
              
              <div className="border-t border-gray-700 pt-2 grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Previous Credits</div>
                  <div className="text-white font-medium">{results.project.previousCreditsUsed.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">New Credits</div>
                  <div className="text-white font-medium">{results.project.newCreditsUsed.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Difference</div>
                  <div className={`font-medium ${results.project.creditDifference > 0 ? 'text-red-400' : results.project.creditDifference < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                    {results.project.creditDifference > 0 ? '+' : ''}{results.project.creditDifference.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-2">
                <div className="text-xs text-gray-400 mb-2">Asset Breakdown</div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400">Treatment:</span>
                    <span className="text-white ml-1 font-medium">{results.project.assetCounts.treatmentImages}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Scenes:</span>
                    <span className="text-white ml-1 font-medium">{results.project.assetCounts.sceneImages}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Frames:</span>
                    <span className="text-white ml-1 font-medium">{results.project.assetCounts.frameImages}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Videos:</span>
                    <span className="text-white ml-1 font-medium">{results.project.assetCounts.videos}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Audio:</span>
                    <span className="text-white ml-1 font-medium">{results.project.assetCounts.audioMinutes}m</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Voice Clones:</span>
                    <span className="text-white ml-1 font-medium">{results.project.assetCounts.voiceClones}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-2">
                <div className="text-xs text-gray-400 mb-2">Credit Breakdown</div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400">Treatment:</span>
                    <span className="text-cyan-400 ml-1 font-medium">{results.project.breakdown.treatmentVisuals.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Scenes:</span>
                    <span className="text-cyan-400 ml-1 font-medium">{results.project.breakdown.sceneImages.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Frames:</span>
                    <span className="text-cyan-400 ml-1 font-medium">{results.project.breakdown.frameImages.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Videos:</span>
                    <span className="text-cyan-400 ml-1 font-medium">{results.project.breakdown.videos.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Audio:</span>
                    <span className="text-cyan-400 ml-1 font-medium">{results.project.breakdown.audio.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Total:</span>
                    <span className="text-emerald-400 ml-1 font-bold">{results.project.breakdown.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {!dryRun && (
                <div className="border-t border-gray-700 pt-2">
                  <div className={`text-xs font-medium ${results.project.updated ? 'text-green-400' : 'text-gray-400'}`}>
                    {results.project.updated ? '✓ Database updated' : 'No changes needed'}
                  </div>
                </div>
              )}
            </div>
          )}

          {isAllResult(results) && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Projects Processed</div>
                  <div className="text-white font-medium text-lg">{results.summary.projectsProcessed}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Projects Updated</div>
                  <div className="text-white font-medium text-lg">{results.summary.projectsUpdated}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Previous Total</div>
                  <div className="text-white font-medium">{results.summary.totalPreviousCredits.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">New Total</div>
                  <div className="text-white font-medium">{results.summary.totalNewCredits.toLocaleString()}</div>
                </div>
              </div>

              <div className="p-2 bg-gray-900/50 rounded border border-gray-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Net Credit Difference</span>
                  <span className={`text-sm font-bold ${results.summary.creditDifference > 0 ? 'text-red-400' : results.summary.creditDifference < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                    {results.summary.creditDifference > 0 ? '+' : ''}{results.summary.creditDifference.toLocaleString()}
                  </span>
                </div>
              </div>

              {results.projects.length > 0 && (
                <div className="border-t border-gray-700 pt-3 space-y-3">
                  {/* Filter and Search Controls */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* Filter Dropdown */}
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-400" />
                      <select
                        value={filter}
                        onChange={(e) => handleFilterChange(e.target.value as FilterOption)}
                        className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        {FILTER_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Search Input */}
                    <div className="flex-1 relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Search by project name or ID..."
                        className="w-full pl-8 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    {/* Export Button */}
                    <button
                      onClick={handleExportCSV}
                      disabled={!filteredProjects.length}
                      className="flex items-center gap-1 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 hover:text-white hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Export to CSV"
                    >
                      <Download className="w-3 h-3" />
                      <span className="hidden sm:inline">Export</span>
                    </button>
                  </div>

                  {/* Filter Summary */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="text-gray-400">
                      Showing {filteredProjects.length} of {results.projects.length} projects
                      {filter !== 'all' && (
                        <span className="ml-1 text-purple-400">
                          ({FILTER_OPTIONS.find(o => o.value === filter)?.description})
                        </span>
                      )}
                    </div>
                    {filteredProjects.some(p => {
                      const totalAssets = p.assetCounts.treatmentImages + p.assetCounts.sceneImages + 
                        p.assetCounts.frameImages + p.assetCounts.videos + p.assetCounts.audioMinutes
                      return totalAssets > 0 && p.newCreditsUsed === 0
                    }) && filter !== 'anomaly' && (
                      <div className="flex items-center gap-1 text-amber-400">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Anomalies detected</span>
                      </div>
                    )}
                  </div>

                  {/* Project List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {paginatedProjects.map((proj, idx) => {
                      const diff = proj.newCreditsUsed - proj.previousCreditsUsed
                      const totalImages = proj.assetCounts.treatmentImages + proj.assetCounts.sceneImages + proj.assetCounts.frameImages
                      const totalAssets = totalImages + proj.assetCounts.videos + proj.assetCounts.audioMinutes
                      const isAnomaly = totalAssets > 0 && proj.newCreditsUsed === 0
                      
                      return (
                        <div 
                          key={proj.projectId} 
                          className={`p-2 rounded border ${
                            isAnomaly 
                              ? 'bg-amber-900/20 border-amber-500/30' 
                              : 'bg-gray-900/50 border-gray-700/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {isAnomaly && (
                                <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" title="Anomaly: Has assets but 0 credits" />
                              )}
                              <div className="text-xs text-white truncate max-w-[180px]" title={proj.title}>
                                {proj.title || 'Untitled'}
                              </div>
                              <button
                                onClick={() => copyToClipboard(proj.projectId)}
                                className="p-1 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                                title={`Copy ID: ${proj.projectId}`}
                              >
                                <Copy className="w-3 h-3 text-gray-400" />
                              </button>
                            </div>
                            <div className={`text-xs font-medium ${diff > 0 ? 'text-red-400' : diff < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                              {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                            </div>
                          </div>
                          <div className="flex gap-3 text-xs text-gray-400">
                            <span>{totalImages} img</span>
                            <span>{proj.assetCounts.videos} vid</span>
                            <span>{proj.assetCounts.audioMinutes}m audio</span>
                            <span className="text-cyan-400 ml-auto">{proj.newCreditsUsed.toLocaleString()} credits</span>
                          </div>
                        </div>
                      )
                    })}
                    
                    {filteredProjects.length === 0 && (
                      <div className="text-center py-4 text-gray-500 text-xs">
                        No projects match your filter criteria
                      </div>
                    )}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-3 h-3" />
                        Previous
                      </button>
                      
                      <div className="text-xs text-gray-400">
                        Page {currentPage} of {totalPages}
                      </div>
                      
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
