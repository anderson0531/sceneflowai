'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  HelpCircle,
  X,
  Sparkles,
  PlayCircle,
  CheckCircle2,
  Circle,
  Search,
  Zap,
  Coins,
  BookOpen,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Compass,
  Lightbulb,
  AlertCircle,
  GraduationCap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  JIT_CONTEXT_GUIDES,
  INTERACTIVE_TUTORIALS,
  HELP_KNOWLEDGE_ARTICLES,
  getJitContextIdForPath,
  type JitContextId,
  type JitQuickStep,
} from '@/config/help/helpAcademyConfig'
import { AnnotatedStudioScreenshot } from './AnnotatedStudioScreenshot'

export const JIT_HELP_OPEN_EVENT = 'sceneflow:open-jit-help'
export const ACADEMY_PROGRESS_STORAGE_KEY = 'sceneflow-academy-completed-steps-v1'
const JIT_BEACON_DISMISSED_KEY = 'sceneflow-jit-beacon-dismissed-v1'

export interface OpenJitHelpDetail {
  contextId?: JitContextId
  tab?: 'jit' | 'tutorial' | 'search'
  tutorialId?: string
}

/**
 * Helper to open the global Just-In-Time (JIT) Help Drawer from anywhere in the app.
 */
export function openJitHelp(detail: OpenJitHelpDetail = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<OpenJitHelpDetail>(JIT_HELP_OPEN_EVENT, { detail }))
}

export function JitHelpDrawer() {
  const pathname = usePathname()
  const detectedContextId = useMemo(() => getJitContextIdForPath(pathname), [pathname])

  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'jit' | 'tutorial' | 'search'>('jit')
  const [selectedContextId, setSelectedContextId] = useState<JitContextId>(detectedContextId)
  const [selectedTutorialId, setSelectedTutorialId] = useState<string>(
    INTERACTIVE_TUTORIALS[0].id
  )
  const [activeTutorialStepIdx, setActiveTutorialStepIdx] = useState<number>(0)
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [beaconDismissed, setBeaconDismissed] = useState(false)

  // Keep JIT context synced when user navigates between studio routes
  useEffect(() => {
    setSelectedContextId(detectedContextId)
  }, [detectedContextId])

  // Load persisted tutorial progress & beacon state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ACADEMY_PROGRESS_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) setCompletedStepIds(parsed)
      }
      if (localStorage.getItem(JIT_BEACON_DISMISSED_KEY) === '1') {
        setBeaconDismissed(true)
      }
    } catch {
      // ignore storage errors
    }
  }, [])

  const toggleStepCompleted = useCallback((stepId: string) => {
    setCompletedStepIds((prev) => {
      const next = prev.includes(stepId)
        ? prev.filter((id) => id !== stepId)
        : [...prev, stepId]
      try {
        localStorage.setItem(ACADEMY_PROGRESS_STORAGE_KEY, JSON.stringify(next))
        window.dispatchEvent(new CustomEvent('sceneflow:academy-progress-updated'))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  // Listen for global custom event + keyboard shortcuts (`?` or `Cmd/Ctrl + /`)
  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      const custom = e as CustomEvent<OpenJitHelpDetail>
      const detail = custom.detail || {}
      if (detail.contextId) {
        setSelectedContextId(detail.contextId)
      } else {
        setSelectedContextId(getJitContextIdForPath(window.location.pathname))
      }
      if (detail.tab) {
        setActiveTab(detail.tab)
      }
      if (detail.tutorialId) {
        setSelectedTutorialId(detail.tutorialId)
        setActiveTutorialStepIdx(0)
        setActiveTab('tutorial')
      }
      setIsOpen(true)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
        return
      }
      if (!isEditable && e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener(JIT_HELP_OPEN_EVENT, handleOpenEvent)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener(JIT_HELP_OPEN_EVENT, handleOpenEvent)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const activeGuide = JIT_CONTEXT_GUIDES[selectedContextId] || JIT_CONTEXT_GUIDES.dashboard
  const activeTutorial =
    INTERACTIVE_TUTORIALS.find((t) => t.id === selectedTutorialId) ||
    INTERACTIVE_TUTORIALS[0]
  const currentTutorialStep =
    activeTutorial.steps[activeTutorialStepIdx] || activeTutorial.steps[0]

  const handleRunQuickStep = (step: JitQuickStep) => {
    if (step.actionEvent && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(step.actionEvent))
      setIsOpen(false)
    }
  }

  // Search results across hotspots, quick steps, troubleshooting, and knowledge base
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return { articles: HELP_KNOWLEDGE_ARTICLES, hotspots: [], faqs: [] }

    const articles = HELP_KNOWLEDGE_ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)) ||
        a.bullets.some((b) => b.toLowerCase().includes(q))
    )

    const hotspots: {
      contextId: JitContextId
      contextTitle: string
      label: string
      summary: string
      proTip: string
    }[] = []
    const faqs: {
      contextId: JitContextId
      contextTitle: string
      question: string
      answer: string
    }[] = []

    Object.values(JIT_CONTEXT_GUIDES).forEach((guide) => {
      guide.hotspots.forEach((h) => {
        if (
          h.label.toLowerCase().includes(q) ||
          h.summary.toLowerCase().includes(q) ||
          h.proTip.toLowerCase().includes(q)
        ) {
          hotspots.push({
            contextId: guide.id,
            contextTitle: guide.shortTitle,
            label: h.label,
            summary: h.summary,
            proTip: h.proTip,
          })
        }
      })
      guide.troubleshooting.forEach((item) => {
        if (
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q)
        ) {
          faqs.push({
            contextId: guide.id,
            contextTitle: guide.shortTitle,
            question: item.question,
            answer: item.answer,
          })
        }
      })
    })

    return { articles, hotspots, faqs }
  }, [searchQuery])

  // Hide floating beacon on `/dashboard/help` itself to avoid visual clutter
  const isOnHelpPage = (pathname || '').startsWith('/dashboard/help')

  return (
    <>
      {/* Subtle Floating Just-In-Time (JIT) Coach Pill in Bottom-Right */}
      {!isOpen && !isOnHelpPage && !beaconDismissed && (
        <div className="fixed bottom-4 left-4 z-[95] hidden sm:flex items-center gap-1 rounded-full bg-slate-900/95 border border-cyan-500/40 pl-3 pr-1.5 py-1.5 shadow-xl shadow-cyan-950/50 backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              setSelectedContextId(detectedContextId)
              setActiveTab('jit')
              setIsOpen(true)
            }}
            className="flex items-center gap-2 text-xs font-semibold text-slate-100 hover:text-cyan-300 transition-colors"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            <span>JIT Guide: {JIT_CONTEXT_GUIDES[detectedContextId].shortTitle}</span>
            <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-slate-800 text-cyan-300 border border-slate-700">
              ?
            </kbd>
          </button>
          <button
            type="button"
            onClick={() => {
              setBeaconDismissed(true)
              try {
                localStorage.setItem(JIT_BEACON_DISMISSED_KEY, '1')
              } catch {
                // ignore
              }
            }}
            className="p-1 text-slate-500 hover:text-slate-300 rounded-full"
            aria-label="Dismiss floating JIT guide pill"
            title="Hide floating pill (you can still open JIT Help via ? in the header)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Slide-Over Backdrop & Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-[140] flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Container */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="SceneFlow Just-In-Time Studio Help & Interactive Training"
            className="relative z-10 w-full max-w-2xl bg-slate-950 border-l border-slate-800 text-slate-100 h-full flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Top Drawer Header */}
            <div className="px-5 py-4 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/25 to-purple-500/25 border border-cyan-500/40 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-cyan-300" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white truncate">
                      Just-In-Time Studio Coach
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      ● Auto-Synced
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    Detected Screen:{' '}
                    <span className="text-cyan-300 font-medium">
                      {JIT_CONTEXT_GUIDES[detectedContextId].title}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href="/dashboard/help"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Full Academy</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  aria-label="Close Just-In-Time Help"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Primary Mode Tabs */}
            <div className="px-5 pt-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('jit')}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-colors',
                    activeTab === 'jit'
                      ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 rounded-t-lg'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  )}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>This Screen (JIT)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('tutorial')}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-colors',
                    activeTab === 'tutorial'
                      ? 'border-purple-400 text-purple-300 bg-purple-500/10 rounded-t-lg'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  )}
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>Interactive Tutorial</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('search')}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-colors',
                    activeTab === 'search'
                      ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10 rounded-t-lg'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  )}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search &amp; Answers</span>
                </button>
              </div>

              {/* Screen Context Switcher (when in JIT mode) */}
              {activeTab === 'jit' && (
                <select
                  aria-label="Inspect another workspace screen"
                  value={selectedContextId}
                  onChange={(e) => setSelectedContextId(e.target.value as JitContextId)}
                  className="mb-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  {Object.values(JIT_CONTEXT_GUIDES).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.id === detectedContextId ? `★ ${g.shortTitle} (Current)` : g.shortTitle}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* ========================================================= */}
              {/* TAB 1: THIS SCREEN (JUST-IN-TIME CONTEXT GUIDE)           */}
              {/* ========================================================= */}
              {activeTab === 'jit' && (
                <>
                  {/* Context Header Banner */}
                  <div className="rounded-xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-purple-950/40 border border-cyan-500/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {activeGuide.badge}
                      </span>
                      <span className="text-xs text-slate-400">
                        ⏱ Typical time: {activeGuide.estimatedTime}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{activeGuide.title}</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {activeGuide.summary}
                    </p>
                  </div>

                  {/* Interactive Annotated Screenshot with Hotspot Pins */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
                      <span>Interactive Visual Screen Map</span>
                      <span className="text-cyan-400 font-normal">
                        Click pins 1–{activeGuide.hotspots.length} to highlight UI controls
                      </span>
                    </h4>
                    <AnnotatedStudioScreenshot
                      screenshotSrc={activeGuide.screenshotSrc}
                      screenshotAlt={activeGuide.screenshotAlt}
                      hotspots={activeGuide.hotspots}
                      compact
                      onActionTriggered={() => setIsOpen(false)}
                    />
                  </div>

                  {/* 60-Second Action Checklist ("What to Do Next") */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      <span>What to Do Right Now (60-Second Checklist)</span>
                    </h4>
                    <div className="space-y-2.5">
                      {activeGuide.quickSteps.map((step) => (
                        <div
                          key={step.id}
                          className="rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                              {step.stepNumber}
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-white">
                                  {step.title}
                                </span>
                                {step.creditBadge && (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                                    {step.creditBadge}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                {step.description}
                              </p>
                            </div>
                          </div>

                          {step.actionLabel && (
                            <div className="flex-shrink-0 pl-9 sm:pl-0">
                              {step.actionHref ? (
                                <Link
                                  href={step.actionHref}
                                  onClick={() => setIsOpen(false)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500 text-cyan-200 hover:text-slate-950 border border-cyan-500/40 transition-colors"
                                >
                                  <span>{step.actionLabel}</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRunQuickStep(step)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500 text-cyan-200 hover:text-slate-950 border border-cyan-500/40 transition-colors"
                                >
                                  <Zap className="w-3 h-3" />
                                  <span>{step.actionLabel}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Credit Efficiency Guardrail */}
                  <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/30 p-4">
                    <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">
                      <Coins className="w-4 h-4" />
                      <span>{activeGuide.creditGuardrail.title}</span>
                    </div>
                    <p className="text-xs font-semibold text-white mb-1">
                      Typical Usage: {activeGuide.creditGuardrail.typicalCost}
                    </p>
                    <p className="text-xs text-emerald-200/80 leading-relaxed">
                      {activeGuide.creditGuardrail.proSavingsRule}
                    </p>
                  </div>

                  {/* Unstuck in 10 Seconds (Contextual Troubleshooting) */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Unstuck in 10 Seconds (Common Questions Here)</span>
                    </h4>
                    <div className="space-y-2.5">
                      {activeGuide.troubleshooting.map((item, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl bg-slate-900/70 border border-slate-800 p-3.5"
                        >
                          <p className="text-xs font-bold text-slate-100 mb-1">
                            Q: {item.question}
                          </p>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {item.answer}
                          </p>
                          {item.fixActionLabel && (
                            <div className="mt-2.5">
                              {item.fixActionHref ? (
                                <Link
                                  href={item.fixActionHref}
                                  onClick={() => setIsOpen(false)}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                                >
                                  <span>{item.fixActionLabel}</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.fixActionEvent) {
                                      window.dispatchEvent(
                                        new CustomEvent(item.fixActionEvent)
                                      )
                                      setIsOpen(false)
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                                >
                                  <Zap className="w-3 h-3" />
                                  <span>{item.fixActionLabel}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ========================================================= */}
              {/* TAB 2: INTERACTIVE STEP-BY-STEP TUTORIAL SIMULATOR        */}
              {/* ========================================================= */}
              {activeTab === 'tutorial' && (
                <>
                  {/* Course Selector Pills */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Select Guided Course
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {INTERACTIVE_TUTORIALS.map((course) => {
                        const isSelected = course.id === activeTutorial.id
                        const doneCount = course.steps.filter((s) =>
                          completedStepIds.includes(s.id)
                        ).length
                        return (
                          <button
                            key={course.id}
                            type="button"
                            onClick={() => {
                              setSelectedTutorialId(course.id)
                              setActiveTutorialStepIdx(0)
                            }}
                            title={`${course.title} (${course.level} • ${course.totalDuration}) — ${course.subtitle}`}
                            className={cn(
                              'p-3 rounded-xl border text-left transition-all',
                              isSelected
                                ? 'bg-purple-500/15 border-purple-500/50 text-white shadow-sm'
                                : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                            )}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-purple-300">
                                {course.level} • {course.totalDuration}
                              </span>
                              <span className="text-[11px] font-semibold text-emerald-400">
                                {doneCount}/{course.steps.length} done
                              </span>
                            </div>
                            <p className="text-xs font-bold text-white leading-snug">
                              {course.title}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Step Progress Bar */}
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div>
                        <span className="text-xs font-bold text-purple-300">
                          Step {currentTutorialStep.stepNumber} of {activeTutorial.steps.length}
                        </span>
                        <h3 className="text-base font-bold text-white">
                          {currentTutorialStep.title}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleStepCompleted(currentTutorialStep.id)}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors',
                          completedStepIds.includes(currentTutorialStep.id)
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                        )}
                      >
                        {completedStepIds.includes(currentTutorialStep.id) ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Completed</span>
                          </>
                        ) : (
                          <>
                            <Circle className="w-3.5 h-3.5" />
                            <span>Mark Complete</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Step Dots */}
                    <div className="flex items-center gap-1.5 mb-4">
                      {activeTutorial.steps.map((step, idx) => {
                        const isDone = completedStepIds.includes(step.id)
                        const isCurrent = idx === activeTutorialStepIdx
                        return (
                          <button
                            key={step.id}
                            type="button"
                            onClick={() => setActiveTutorialStepIdx(idx)}
                            className={cn(
                              'h-2 flex-1 rounded-full transition-all',
                              isCurrent
                                ? 'bg-purple-400'
                                : isDone
                                  ? 'bg-emerald-500/70'
                                  : 'bg-slate-800 hover:bg-slate-700'
                            )}
                            aria-label={`Go to step ${step.stepNumber}: ${step.title}`}
                          />
                        )
                      })}
                    </div>

                    <p className="text-xs text-slate-300 mb-3">
                      <strong className="text-white">Goal: </strong>
                      {currentTutorialStep.objective}
                    </p>

                    {/* Annotated Screenshot Focused on the Step's Hotspot */}
                    <AnnotatedStudioScreenshot
                      screenshotSrc={currentTutorialStep.screenshotSrc}
                      screenshotAlt={currentTutorialStep.title}
                      hotspots={
                        JIT_CONTEXT_GUIDES[currentTutorialStep.contextId]?.hotspots || []
                      }
                      initialHotspotNumber={currentTutorialStep.focusHotspotNumber}
                      compact
                      onActionTriggered={() => setIsOpen(false)}
                    />

                    {/* Step-by-Step Instructions */}
                    <div className="mt-4 space-y-2">
                      {currentTutorialStep.instructions.map((inst, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 text-xs text-slate-200 bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5"
                        >
                          <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center flex-shrink-0">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed">{inst}</span>
                        </div>
                      ))}
                    </div>

                    {/* Key Takeaway */}
                    <div className="mt-3 rounded-lg bg-cyan-500/10 border border-cyan-500/25 p-3 flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-cyan-200">
                        <strong>Key Takeaway: </strong>
                        {currentTutorialStep.keyTakeaway}
                      </p>
                    </div>

                    {/* Step Navigation Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        disabled={activeTutorialStepIdx === 0}
                        onClick={() =>
                          setActiveTutorialStepIdx((i) => Math.max(0, i - 1))
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Previous</span>
                      </button>

                      {currentTutorialStep.tryActionHref ? (
                        <Link
                          href={currentTutorialStep.tryActionHref}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{currentTutorialStep.tryActionLabel}</span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (currentTutorialStep.tryActionEvent) {
                              window.dispatchEvent(
                                new CustomEvent(currentTutorialStep.tryActionEvent)
                              )
                              setIsOpen(false)
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>{currentTutorialStep.tryActionLabel}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (!completedStepIds.includes(currentTutorialStep.id)) {
                            toggleStepCompleted(currentTutorialStep.id)
                          }
                          if (activeTutorialStepIdx < activeTutorial.steps.length - 1) {
                            setActiveTutorialStepIdx((i) => i + 1)
                          }
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white"
                      >
                        <span>
                          {activeTutorialStepIdx < activeTutorial.steps.length - 1
                            ? 'Complete & Next'
                            : 'Finish Course'}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ========================================================= */}
              {/* TAB 3: INSTANT SEARCH & KNOWLEDGE BASE                    */}
              {/* ========================================================= */}
              {activeTab === 'search' && (
                <>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Continuity Vault, motion video, Audience Resonance, credits, dubbing..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                      autoFocus
                    />
                  </div>

                  {/* Matching Hotspots */}
                  {searchResults.hotspots.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">
                        Matching Screen Controls ({searchResults.hotspots.length})
                      </h4>
                      <div className="space-y-2">
                        {searchResults.hotspots.map((h, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setSelectedContextId(h.contextId)
                              setActiveTab('jit')
                            }}
                            className="w-full text-left rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 p-3 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-bold text-white">
                                {h.label}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300">
                                {h.contextTitle} →
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">{h.summary}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Knowledge Base Articles */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Studio Guides ({searchResults.articles.length})</span>
                    </h4>
                    <div className="space-y-3">
                      {searchResults.articles.map((article) => (
                        <div
                          key={article.id}
                          className="rounded-xl bg-slate-900/80 border border-slate-800 p-4"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h5 className="text-sm font-bold text-white">
                              {article.title}
                            </h5>
                            <span className="text-[10px] text-slate-400 flex-shrink-0">
                              {article.readTime}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mb-2.5">
                            {article.summary}
                          </p>
                          <ul className="space-y-1.5 mb-3">
                            {article.bullets.map((b, idx) => (
                              <li
                                key={idx}
                                className="text-xs text-slate-400 flex items-start gap-2"
                              >
                                <span className="text-cyan-400 mt-0.5">•</span>
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                            <strong>Pro Tip: </strong>
                            {article.proTip}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="px-5 py-3 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <span>
                  Shortcut: Press{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                    ?
                  </kbd>{' '}
                  or{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                    ⌘/
                  </kbd>{' '}
                  anytime
                </span>
              </div>
              <Link
                href="/dashboard/help"
                onClick={() => setIsOpen(false)}
                className="font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
              >
                <span>Open Studio Academy</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
