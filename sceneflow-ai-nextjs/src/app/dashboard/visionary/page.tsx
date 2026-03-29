'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { 
  Telescope, 
  Sparkles, 
  FileText, 
  Trash2, 
  Loader2,
  Search,
  ChevronRight,
} from 'lucide-react'
import { AnalysisOverlay } from './components/AnalysisOverlay'
import { ArbitrageHeatMap } from './components/ArbitrageHeatMap'
import { RegionDetailModal } from './components/RegionDetailModal'
import { OpportunityReport } from './components/OpportunityReport'
import { useVisionaryAnalysis } from '@/hooks/useVisionaryAnalysis'
import { useConceptGenerator } from '@/hooks/useConceptGenerator'
import { ConceptOptionsView } from './components/ConceptOptionsView'
import type { VisionaryReport, LanguageOpportunity } from '@/lib/visionary/types'

/**
 * VisionaryPage — Market Insights
 * 
 * Entry point for concept exploration, market-gap analysis,
 * language arbitrage mapping, and idea-to-production bridging.
 * 
 * Route: /dashboard/visionary
 */
export default function VisionaryPage() {
  const { data: session } = useSession()
  const {
    phase,
    progress,
    report,
    error,
    isRunning,
    startAnalysis,
    cancelAnalysis,
    reset,
  } = useVisionaryAnalysis()

  const {
    concepts,
    isLoading: isGeneratingConcepts,
    error: conceptError,
    generateConcepts,
  } = useConceptGenerator()

  // Form state
  const [concept, setConcept] = useState('')
  const [genre, setGenre] = useState('')

  // Report list
  const [pastReports, setPastReports] = useState<VisionaryReport[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState(true)
  const [selectedReport, setSelectedReport] = useState<VisionaryReport | null>(null)
  const [showGrid, setShowGrid] = useState(true)

  // Region detail modal
  const [selectedRegion, setSelectedRegion] = useState<LanguageOpportunity | null>(null)

  // View: 'input' | 'analysis' | 'report' | 'history'
  const [view, setView] = useState<'input' | 'analysis' | 'report' | 'history'>('input')

  // Guard to prevent duplicate/infinite fetches
  const hasFetchedRef = useRef(false)
  const isFetchingRef = useRef(false)

  // Fetch past reports
  const fetchReports = useCallback(async (force = false) => {
    // Prevent concurrent or duplicate fetches
    if (isFetchingRef.current) return
    if (hasFetchedRef.current && !force) return

    isFetchingRef.current = true
    try {
      const res = await fetch('/api/visionary/reports', {
        headers: { 'x-user-id': session?.user?.email || '' },
      })
      if (!res.ok) {
        console.warn(`[Market Insights] Reports API returned ${res.status}`)
        return
      }
      const data = await res.json()
      if (data.success) {
        setPastReports(data.reports)
        hasFetchedRef.current = true
      }
    } catch {
      // Silent fail — network errors
    } finally {
      setIsLoadingReports(false)
      isFetchingRef.current = false
    }
  }, [session?.user?.email])

  // Initial fetch when session is available
  useEffect(() => {
    if (session?.user?.email) fetchReports()
  }, [session?.user?.email, fetchReports])

  // Switch to analysis view when running
  useEffect(() => {
    if (isRunning) setView('analysis')
  }, [isRunning])

  // Switch to report view when complete
  useEffect(() => {
    if (phase === 'complete' && report) {
      setView('report')
      fetchReports(true) // Force refresh list after new analysis
    }
  }, [phase, report, fetchReports])

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!concept.trim()) return
    startAnalysis({
      concept: concept.trim(),
      genre: genre.trim() || undefined,
      userEmail: session?.user?.email || '',
    })
  }

  // Load a past report
  const loadPastReport = async (reportId: string) => {
    try {
      const res = await fetch(`/api/visionary/reports/${reportId}`, {
        headers: { 'x-user-id': session?.user?.email || '' },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.report) {
          setSelectedReport(data.report)
          setView('report')
        }
      }
    } catch (err) {
      console.error('Failed to load report:', err)
    }
  }

  // Delete a report
  const deleteReport = async (reportId: string) => {
    try {
      await fetch(`/api/visionary/reports/${reportId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': session?.user?.email || '' },
      })
      setPastReports(prev => prev.filter(r => r.id !== reportId))
    } catch (err) {
      console.error('Failed to delete report:', err)
    }
  }

  const activeReport = report || selectedReport

  if (concepts) {
    return <ConceptOptionsView concepts={concepts} />
  }

  if (isGeneratingConcepts) {
    return <div>Generating creative concepts...</div>
  }

  const genres = [
    'Drama', 'Comedy', 'Thriller', 'Horror', 'Sci-Fi', 'Romance',
    'Documentary', 'Animation', 'Action', 'Fantasy', 'Musical', 'Educational',
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Telescope className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Market Insights</h1>
              <p className="text-sm text-gray-400">AI-powered concept exploration, market analysis & opportunity mapping</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {view !== 'input' && (
              <button
                onClick={() => {
                  reset()
                  setSelectedReport(null)
                  setView('input')
                }}
                className="px-4 py-2 text-sm font-medium bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                New Analysis
              </button>
            )}
            <button
              onClick={() => setView(view === 'history' ? 'input' : 'history')}
              className="px-4 py-2 text-sm font-medium bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              {view === 'history' ? 'Back' : 'History'}
            </button>
          </div>
        </motion.div>

        {/* Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between"
          >
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={reset} className="text-xs text-red-400 hover:text-red-300">
              Dismiss
            </button>
          </motion.div>
        )}

        {/* Input View */}
        {view === 'input' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Concept Input */}
              <div className="bg-gray-800/60 border border-emerald-500/30 rounded-xl p-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  What&apos;s your concept or idea?
                </label>
                <textarea
                  value={concept}
                  onChange={e => setConcept(e.target.value)}
                  placeholder="Describe your film, series, or content concept... e.g. 'A cyberpunk noir detective series set in 2087 Tokyo'"
                  rows={4}
                  className="w-full bg-gray-900/60 border border-gray-700 rounded-lg p-4 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              {/* Genre Selection */}
              <div className="bg-gray-800/60 border border-teal-500/30 rounded-xl p-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Genre <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {genres.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGenre(genre === g ? '' : g)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        genre === g
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 border border-transparent'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!concept.trim() || isRunning}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-gray-700 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Analyze Market Opportunity
              </button>
            </form>

            {/* Quick Stats */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-gray-800/40 border border-emerald-500/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">{pastReports.length}</div>
                <div className="text-xs text-gray-500 mt-1">Reports Generated</div>
              </div>
              <div className="bg-gray-800/40 border border-blue-500/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {pastReports.filter(r => r.status === 'complete').length}
                </div>
                <div className="text-xs text-gray-500 mt-1">Completed</div>
              </div>
              <div className="bg-gray-800/40 border border-amber-500/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-amber-400">~110</div>
                <div className="text-xs text-gray-500 mt-1">Credits per Analysis</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Analysis View (in-progress) */}
        {view === 'analysis' && (
          <AnalysisOverlay
            phase={phase}
            progress={progress}
            isRunning={isRunning}
            concept={concept}
            genre={genre}
            onCancel={cancelAnalysis}
          />
        )}

        {/* Report View */}
        {view === 'report' && activeReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Report Header */}
            <div className="bg-gray-800/60 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">{activeReport.concept}</h2>
                {activeReport.genre && (
                  <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded mt-1 inline-block">
                    {activeReport.genre}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(activeReport.metadata?.timestamp || activeReport.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* Arbitrage Heat Map */}
            {activeReport.arbitrageMap && (
              <ArbitrageHeatMap
                data={activeReport.arbitrageMap}
                onSelectRegion={setSelectedRegion}
              />
            )}

            {/* --- THE GENERATE OPTIONS SECTION --- */}
            <div className="bg-gray-900/40 border border-emerald-500/20 rounded-xl p-6 text-center">
              {concepts ? (
                <ConceptOptionsView concepts={concepts} onSelect={(concept) => {
                  // This is where you would handle the selection
                  console.log('Selected Concept:', concept);
                }} />
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">Ready to bridge this data to a creative series?</p>
                  <button 
                    onClick={() => generateConcepts(activeReport)} 
                    disabled={isGeneratingConcepts}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white rounded-lg font-medium transition-all flex items-center gap-2 mx-auto"
                  >
                    {isGeneratingConcepts ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {isGeneratingConcepts ? 'Synthesizing Narrative Options...' : 'Generate 3 Series Concepts'}
                  </button>
                </div>
              )}
            </div>

            {/* Full Report */}
            <OpportunityReport report={activeReport} />
          </motion.div>
        )}

        {/* History View */}
        {view === 'history' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-4 h-4 text-gray-500" />
              <h2 className="text-lg font-semibold text-white">Past Analyses</h2>
            </div>

            {isLoadingReports ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : pastReports.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Telescope className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No analyses yet. Start your first one!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pastReports.map((r) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800/60 border border-teal-500/20 rounded-xl p-4 flex items-center justify-between hover:bg-gray-800/80 hover:border-teal-500/40 transition-colors group"
                  >
                    <button
                      onClick={() => loadPastReport(r.id)}
                      className="flex items-center gap-4 flex-1 text-left"
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        r.status === 'complete' ? 'bg-emerald-500/20' :
                        r.status === 'failed' ? 'bg-red-500/20' :
                        'bg-gray-700'
                      }`}>
                        {typeof r.overallScore === 'number' ? (
                          <span className="text-sm font-bold text-emerald-400">{r.overallScore}</span>
                        ) : (
                          <Telescope className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{r.concept}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          {r.genre && <span>{r.genre}</span>}
                          <span>·</span>
                          <span>{new Date(r.metadata?.timestamp || r.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteReport(r.id)
                      }}
                      className="p-2 ml-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Region Detail Modal */}
        <AnimatePresence>
          {selectedRegion && (
            <RegionDetailModal
              opportunity={selectedRegion}
              onClose={() => setSelectedRegion(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
