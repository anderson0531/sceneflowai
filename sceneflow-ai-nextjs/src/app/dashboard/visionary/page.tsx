'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { 
  Telescope, 
  Sparkles, 
  FileText, 
  Loader2,
} from 'lucide-react'
import { AnalysisOverlay } from './components/AnalysisOverlay'
import { ArbitrageHeatMap } from './components/ArbitrageHeatMap'
import { RegionDetailModal } from './components/RegionDetailModal'
import { OpportunityReport } from './components/OpportunityReport'
import { useVisionaryAnalysis } from '@/hooks/useVisionaryAnalysis'
import { useConceptGenerator } from '@/hooks/useConceptGenerator'
import { ConceptOptionsView } from './components/ConceptOptionsView'
import GeneratingOverlay from '@/components/ui/GeneratingOverlay'
import type { VisionaryReport, LanguageOpportunity } from '@/lib/visionary/types'
import { useRouter } from 'next/navigation'

const GENRES = [
  'Drama', 'Comedy', 'Thriller', 'Horror', 'Sci-Fi', 'Romance',
  'Documentary', 'Animation', 'Action', 'Fantasy', 'Musical', 'Educational',
]

export default function VisionaryPage() {
  const { data: session } = useSession()
  const router = useRouter()
  
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

  const [concept, setConcept] = useState('')
  const [genre, setGenre] = useState('')
  const [isInitializing, setIsInitializing] = useState(false)
  const [pastReports, setPastReports] = useState<VisionaryReport[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState(true)
  const [selectedReport, setSelectedReport] = useState<VisionaryReport | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<LanguageOpportunity | null>(null)
  const [view, setView] = useState<'input' | 'analysis' | 'report' | 'history'>('input')

  const hasFetchedRef = useRef(false)
  const isFetchingRef = useRef(false)

  const fetchReports = useCallback(async (force = false) => {
    if (isFetchingRef.current) return
    if (hasFetchedRef.current && !force) return
    isFetchingRef.current = true
    try {
      const res = await fetch('/api/visionary/reports', {
        headers: { 'x-user-id': session?.user?.email || '' },
      })
      const data = await res.json()
      if (data.success) {
        setPastReports(data.reports)
        hasFetchedRef.current = true
      }
    } catch (e) { console.error('Fetch reports failed:', e) } finally {
      setIsLoadingReports(false)
      isFetchingRef.current = false
    }
  }, [session?.user?.email])

  useEffect(() => {
    if (session?.user?.email) fetchReports()
  }, [session?.user?.email, fetchReports])

  useEffect(() => {
    if (isRunning) setView('analysis')
  }, [isRunning])

  useEffect(() => {
    if (phase === 'complete' && report) {
      setView('report')
      fetchReports(true)
    }
  }, [phase, report, fetchReports])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!concept.trim()) return
    startAnalysis({
      concept: concept.trim(),
      genre: genre.trim() || undefined,
      userEmail: session?.user?.email || '',
    })
  }

  const handleInitializeSeries = async (conceptData: any) => {
    setIsInitializing(true)
    try {
      const res = await fetch('/api/series/initialize', {
        method: 'POST',
        body: JSON.stringify({ 
          selectedConcept: conceptData,
          userEmail: session?.user?.email 
        }),
      })
      const data = await res.json()
      if (data.success) {
        router.push(`/dashboard/series/${data.projectId}`)
      } else {
        throw new Error(data.error)
      }
    } catch {
      alert("Initialization failed. Please try again.")
    } finally {
      setIsInitializing(false)
    }
  }

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

  const summarizeConceptTitle = (text: string) => {
    const cleaned = text.replace(/\s+/g, ' ').trim()
    if (!cleaned) return 'Market Insights Brief'
    const sentence = cleaned.split(/[.!?]/)[0]?.trim() || cleaned
    const words = sentence.split(' ').filter(Boolean)
    if (words.length <= 12) return sentence
    return `${words.slice(0, 12).join(' ')}...`
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Telescope className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Market Insights</h1>
              <p className="text-sm text-gray-400">AI-powered concept exploration & opportunity mapping</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {view !== 'input' && (
              <button onClick={() => { reset(); setSelectedReport(null); setView('input') }} className="px-4 py-2 text-sm font-medium bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                New Analysis
              </button>
            )}
            <button onClick={() => setView(view === 'history' ? 'input' : 'history')} className="px-4 py-2 text-sm font-medium bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {view === 'history' ? 'Back' : 'History'}
            </button>
          </div>
        </motion.div>

        {/* Error Banner */}
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={reset} className="text-xs text-red-400 hover:text-red-300">Dismiss</button>
          </motion.div>
        )}
        {conceptError && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-sm text-red-300">Concept generation failed: {conceptError}</p>
          </motion.div>
        )}

        {/* Input View */}
        {view === 'input' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-gray-800/60 border border-emerald-500/30 rounded-xl p-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  What&apos;s your concept or idea?
                </label>
                <textarea
                  value={concept}
                  onChange={e => setConcept(e.target.value)}
                  placeholder="Describe your film or series concept..."
                  rows={4}
                  className="w-full bg-gray-900/60 border border-gray-700 rounded-lg p-4 text-white resize-none focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div className="bg-gray-800/60 border border-teal-500/30 rounded-xl p-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">Genre</label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map(g => (
                    <button key={g} type="button" onClick={() => setGenre(genre === g ? '' : g)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${genre === g ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={!concept.trim() || isRunning} className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                <Sparkles className="w-5 h-5" />
                Analyze Market Opportunity
              </button>
            </form>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Analysis heading */}
            <div className="bg-gray-800/60 border border-emerald-500/20 rounded-xl p-5">
              <p className="text-xs uppercase tracking-wider text-emerald-300/80 mb-2">
                Analysis Focus
              </p>
              <h2 className="text-xl md:text-2xl font-semibold text-white leading-snug">
                {summarizeConceptTitle(activeReport.concept || '')}
              </h2>
              {activeReport.genre && (
                <p className="text-sm text-gray-400 mt-2">{activeReport.genre}</p>
              )}
            </div>

            {/* Target Markets Grid */}
            {activeReport.arbitrageMap && (
              <ArbitrageHeatMap
                data={activeReport.arbitrageMap}
                onSelectRegion={setSelectedRegion}
              />
            )}

            {/* Market Analysis & Recommended Structure */}
            <OpportunityReport report={activeReport} />

            {/* Generate Series Concepts CTA (below Recommended Structure) */}
            {!concepts && (
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Ready to develop this concept?</p>
                    <p className="text-xs text-gray-400">Generate 3 series concept variations based on market data</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await new Promise(resolve => setTimeout(resolve, 200))
                    generateConcepts(activeReport)
                  }}
                  disabled={isGeneratingConcepts}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg flex items-center gap-2 disabled:opacity-50 shrink-0 transition-colors"
                >
                  {isGeneratingConcepts ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isGeneratingConcepts ? 'Generating...' : 'Generate Concepts'}
                </button>
              </div>
            )}

            {/* Generated Concepts */}
            {(concepts || isGeneratingConcepts) && (
              <ConceptOptionsView
                concepts={concepts}
                onSelect={handleInitializeSeries}
                isStreaming={isGeneratingConcepts}
              />
            )}
          </motion.div>
        )}

        {/* History View */}
        {view === 'history' && (
          <div className="space-y-3">
            {pastReports.length === 0 && !isLoadingReports && (
              <p className="text-sm text-gray-500 text-center py-8">No past analyses yet.</p>
            )}
            {pastReports.map((r) => (
              <div key={r.id} className="bg-gray-800/60 border border-teal-500/20 rounded-xl p-4 flex items-center justify-between">
                <button onClick={() => r.id && loadPastReport(r.id)} className="flex-1 text-left">
                  <div className="text-sm font-medium text-white">{r.concept}</div>
                  {r.genre && <span className="text-xs text-gray-500">{r.genre}</span>}
                </button>
              </div>
            ))}
          </div>
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

      <GeneratingOverlay
        visible={isGeneratingConcepts || isInitializing}
        title={isInitializing ? "Initializing Series Bible..." : "Synthesizing Creative Options..."}
        subtext={isInitializing ? "Building your 10-episode production framework." : "Developing narrative arcs and character concepts."}
      />
    </div>
  )
}
