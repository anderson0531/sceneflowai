'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  HelpCircle,
  Sparkles,
  PlayCircle,
  CheckCircle2,
  Circle,
  Search,
  Zap,
  Coins,
  BookOpen,
  Film,
  Layers,
  Building2,
  Compass,
  Calculator,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  AlertCircle,
  ExternalLink,
  Home,
  Settings,
  MessageCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  JIT_CONTEXT_GUIDES,
  INTERACTIVE_TUTORIALS,
  CREATOR_PLAYBOOKS,
  CREDIT_ESTIMATOR_PRESETS,
  HELP_KNOWLEDGE_ARTICLES,
  calculateEstimatedCredits,
  type JitContextId,
} from '@/config/help/helpAcademyConfig'
import { AnnotatedStudioScreenshot } from '@/components/help/AnnotatedStudioScreenshot'
import {
  openJitHelp,
  ACADEMY_PROGRESS_STORAGE_KEY,
} from '@/components/help/JitHelpDrawer'

type AcademyTab = 'tutorials' | 'screens' | 'playbooks' | 'calculator'

const PLAYBOOK_ICONS = {
  BookOpen,
  Film,
  Layers,
  Building2,
}

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState<AcademyTab>('tutorials')
  const [selectedTutorialId, setSelectedTutorialId] = useState<string>(
    INTERACTIVE_TUTORIALS[0].id
  )
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0)
  const [selectedContextId, setSelectedContextId] =
    useState<JitContextId>('blueprint')
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Interactive Credit Calculator State
  const [sceneCount, setSceneCount] = useState<number>(8)
  const [keyframePairsPerScene, setKeyframePairsPerScene] = useState<number>(3)
  const [videoClipsPerScene, setVideoClipsPerScene] = useState<number>(1)
  const [languagesCount, setLanguagesCount] = useState<number>(2)

  // Read initial `?tab=` query parameter + persisted tutorial progress
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab') as AcademyTab | null
      if (
        tabParam &&
        ['tutorials', 'screens', 'playbooks', 'calculator'].includes(tabParam)
      ) {
        setActiveTab(tabParam)
      }
      const saved = localStorage.getItem(ACADEMY_PROGRESS_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) setCompletedStepIds(parsed)
      }
    } catch {
      // ignore
    }

    const handleProgressSync = () => {
      try {
        const saved = localStorage.getItem(ACADEMY_PROGRESS_STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) setCompletedStepIds(parsed)
        }
      } catch {
        // ignore
      }
    }
    window.addEventListener('sceneflow:academy-progress-updated', handleProgressSync)
    return () => {
      window.removeEventListener(
        'sceneflow:academy-progress-updated',
        handleProgressSync
      )
    }
  }, [])

  const toggleStepCompleted = (stepId: string) => {
    setCompletedStepIds((prev) => {
      const next = prev.includes(stepId)
        ? prev.filter((id) => id !== stepId)
        : [...prev, stepId]
      try {
        localStorage.setItem(ACADEMY_PROGRESS_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  const totalAvailableSteps = useMemo(
    () => INTERACTIVE_TUTORIALS.reduce((acc, c) => acc + c.steps.length, 0),
    []
  )

  const activeTutorial =
    INTERACTIVE_TUTORIALS.find((t) => t.id === selectedTutorialId) ||
    INTERACTIVE_TUTORIALS[0]
  const currentStep =
    activeTutorial.steps[activeStepIdx] || activeTutorial.steps[0]
  const activeGuide =
    JIT_CONTEXT_GUIDES[selectedContextId] || JIT_CONTEXT_GUIDES.blueprint

  const creditEstimate = useMemo(
    () =>
      calculateEstimatedCredits({
        sceneCount,
        keyframePairsPerScene,
        videoClipsPerScene,
        languagesCount,
      }),
    [sceneCount, keyframePairsPerScene, videoClipsPerScene, languagesCount]
  )

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return HELP_KNOWLEDGE_ARTICLES
    return HELP_KNOWLEDGE_ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)) ||
        a.bullets.some((b) => b.toLowerCase().includes(q))
    )
  }, [searchQuery])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* =================================================================== */}
      {/* STUDIO ACADEMY HERO HEADER                                          */}
      {/* =================================================================== */}
      <div className="border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold mb-3">
                <GraduationCap className="w-4 h-4" />
                <span>SceneFlow Studio Academy &amp; Just-In-Time Training</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                Master AI Filmmaking in Minutes
              </h1>
              <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-2xl">
                Interactive visual screen maps, step-by-step guided simulations, and a
                context-aware <strong className="text-slate-200">Just-In-Time (JIT) Coach</strong>{' '}
                accessible from any studio screen via{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 text-xs">
                  ?
                </kbd>
                .
              </p>
            </div>

            {/* Right Hero Card: Mastery Progress & Quick JIT Trigger */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 flex flex-col gap-3 min-w-[290px] sm:min-w-[340px]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Your Training Progress
                  </span>
                  <p className="text-lg font-extrabold text-white">
                    {completedStepIds.length} of {totalAvailableSteps} Steps Mastered
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {Math.round(
                    (completedStepIds.length / Math.max(1, totalAvailableSteps)) *
                      100
                  )}
                  %
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (completedStepIds.length /
                          Math.max(1, totalAvailableSteps)) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => openJitHelp({ tab: 'jit' })}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Open JIT Coach Drawer</span>
                </button>
                <Link
                  href="/dashboard/studio/new-project"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors"
                >
                  <span>Start Film →</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Primary Navigation Bar */}
          <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('tutorials')}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all',
                  activeTab === 'tutorials'
                    ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                )}
              >
                <PlayCircle className="w-4 h-4" />
                <span>1. Interactive Tutorials</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('screens')}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all',
                  activeTab === 'screens'
                    ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                )}
              >
                <Compass className="w-4 h-4" />
                <span>2. Visual Screen Maps (JIT)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('playbooks')}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all',
                  activeTab === 'playbooks'
                    ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                )}
              >
                <BookOpen className="w-4 h-4" />
                <span>3. Creator Playbooks</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('calculator')}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all',
                  activeTab === 'calculator'
                    ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                )}
              >
                <Calculator className="w-4 h-4" />
                <span>4. Credit Calculator &amp; FAQ</span>
              </button>
            </div>

            {/* Instant Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (e.target.value.trim() && activeTab !== 'calculator') {
                    setActiveTab('calculator')
                  }
                }}
                placeholder="Search any tool or topic..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MAIN ACADEMY CONTENT AREA                                           */}
      {/* =================================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ================================================================= */}
        {/* TAB 1: INTERACTIVE STEP-BY-STEP TUTORIALS                         */}
        {/* ================================================================= */}
        {activeTab === 'tutorials' && (
          <div className="space-y-8">
            {/* Course Selector Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      setActiveStepIdx(0)
                    }}
                    className={cn(
                      'p-4 rounded-2xl border text-left transition-all flex flex-col justify-between',
                      isSelected
                        ? 'bg-gradient-to-br from-cyan-950/70 via-slate-900 to-purple-950/50 border-cyan-400 shadow-lg shadow-cyan-950/40'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                          {course.level} • {course.totalDuration}
                        </span>
                        <span className="text-xs font-bold text-emerald-400">
                          {doneCount}/{course.steps.length}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white mb-1">
                        {course.title}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {course.subtitle}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-cyan-300">
                      <span>{course.steps.length} Interactive Steps</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Active Tutorial Interactive Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Course Stepper Rail */}
              <div className="lg:col-span-4 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    Active Course
                  </span>
                  <h2 className="text-lg font-bold text-white mt-0.5">
                    {activeTutorial.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {activeTutorial.outcome}
                  </p>
                </div>

                <div className="space-y-2">
                  {activeTutorial.steps.map((step, idx) => {
                    const isCurrent = idx === activeStepIdx
                    const isDone = completedStepIds.includes(step.id)
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setActiveStepIdx(idx)}
                        title={`Step ${step.stepNumber}: ${step.title} (${step.duration}) — ${step.objective}`}
                        className={cn(
                          'w-full p-3 rounded-xl border text-left transition-all flex items-start gap-3',
                          isCurrent
                            ? 'bg-cyan-500/15 border-cyan-500/50 text-white'
                            : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        )}
                      >
                        <span
                          className={cn(
                            'w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5',
                            isDone
                              ? 'bg-emerald-500 text-slate-950'
                              : isCurrent
                                ? 'bg-cyan-400 text-slate-950'
                                : 'bg-slate-800 text-slate-400'
                          )}
                        >
                          {isDone ? '✓' : step.stepNumber}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-white leading-snug">
                              {step.title}
                            </span>
                            <span className="text-[10px] text-slate-400 flex-shrink-0">
                              {step.duration}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                            {step.objective}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Right Column: Interactive Screenshot + Instructions */}
              <div className="lg:col-span-8 space-y-5">
                <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 mb-1">
                        <span>
                          STEP {currentStep.stepNumber} OF{' '}
                          {activeTutorial.steps.length}
                        </span>
                        <span>•</span>
                        <span>{currentStep.duration}</span>
                      </div>
                      <h3 className="text-xl font-extrabold text-white">
                        {currentStep.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 mt-1">
                        {currentStep.objective}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleStepCompleted(currentStep.id)}
                      className={cn(
                        'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all flex-shrink-0',
                        completedStepIds.includes(currentStep.id)
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      )}
                    >
                      {completedStepIds.includes(currentStep.id) ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Completed</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4" />
                          <span>Mark Step Complete</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Annotated Screenshot Focused on This Step */}
                  <AnnotatedStudioScreenshot
                    screenshotSrc={currentStep.screenshotSrc}
                    screenshotAlt={currentStep.title}
                    hotspots={
                      JIT_CONTEXT_GUIDES[currentStep.contextId]?.hotspots || []
                    }
                    initialHotspotNumber={currentStep.focusHotspotNumber}
                  />

                  {/* Actionable Step Instructions */}
                  <div className="mt-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Step-by-Step Instructions
                    </h4>
                    <div className="grid grid-cols-1 gap-2.5">
                      {currentStep.instructions.map((inst, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800"
                        >
                          <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </span>
                          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                            {inst}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key Takeaway Banner */}
                  <div className="mt-5 rounded-xl bg-purple-500/10 border border-purple-500/30 p-4 flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-purple-300 flex-shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-purple-100 leading-relaxed">
                      <strong className="text-purple-300">Key Director Takeaway: </strong>
                      {currentStep.keyTakeaway}
                    </p>
                  </div>

                  {/* Bottom Step Navigation */}
                  <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={activeStepIdx === 0}
                      onClick={() => setActiveStepIdx((i) => Math.max(0, i - 1))}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous Step</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {currentStep.tryActionHref && (
                        <Link
                          href={currentStep.tryActionHref}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{currentStep.tryActionLabel}</span>
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (!completedStepIds.includes(currentStep.id)) {
                            toggleStepCompleted(currentStep.id)
                          }
                          if (activeStepIdx < activeTutorial.steps.length - 1) {
                            setActiveStepIdx((i) => i + 1)
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md"
                      >
                        <span>
                          {activeStepIdx < activeTutorial.steps.length - 1
                            ? 'Complete & Next Step'
                            : 'Complete Course'}
                        </span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: VISUAL SCREEN MAPS & JIT WORKSPACE EXPLORER                */}
        {/* ================================================================= */}
        {activeTab === 'screens' && (
          <div className="space-y-6">
            {/* Workspace Selector Bar */}
            <div className="flex flex-wrap items-center gap-2">
              {Object.values(JIT_CONTEXT_GUIDES).map((guide) => {
                const isSelected = guide.id === selectedContextId
                return (
                  <button
                    key={guide.id}
                    type="button"
                    onClick={() => setSelectedContextId(guide.id)}
                    className={cn(
                      'px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all',
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                    )}
                  >
                    {guide.shortTitle}
                  </button>
                )
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 8 Columns: Annotated Visual Screenshot */}
              <div className="lg:col-span-8 space-y-4">
                <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                        {activeGuide.badge}
                      </span>
                      <h2 className="text-xl font-extrabold text-white">
                        {activeGuide.title}
                      </h2>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300">
                      ⏱ {activeGuide.estimatedTime}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 mb-4">
                    {activeGuide.summary}
                  </p>

                  <AnnotatedStudioScreenshot
                    screenshotSrc={activeGuide.screenshotSrc}
                    screenshotAlt={activeGuide.screenshotAlt}
                    hotspots={activeGuide.hotspots}
                  />
                </div>
              </div>

              {/* Right 4 Columns: 60s Action Checklist + Credit Guardrail + Q&A */}
              <div className="lg:col-span-4 space-y-5">
                <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <span>60-Second Action Checklist</span>
                  </h3>
                  <div className="space-y-3">
                    {activeGuide.quickSteps.map((step) => (
                      <div
                        key={step.id}
                        className="p-3 rounded-xl bg-slate-950/80 border border-slate-800"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-bold text-white">
                            {step.stepNumber}. {step.title}
                          </span>
                          {step.creditBadge && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-semibold">
                              {step.creditBadge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-emerald-950/30 border border-emerald-500/30 p-5">
                  <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">
                    <Coins className="w-4 h-4" />
                    <span>{activeGuide.creditGuardrail.title}</span>
                  </div>
                  <p className="text-xs font-semibold text-white mb-1.5">
                    {activeGuide.creditGuardrail.typicalCost}
                  </p>
                  <p className="text-xs text-emerald-200/80 leading-relaxed">
                    {activeGuide.creditGuardrail.proSavingsRule}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span>Unstuck in 10 Seconds</span>
                  </h3>
                  <div className="space-y-3">
                    {activeGuide.troubleshooting.map((t, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-950/80 border border-slate-800"
                      >
                        <p className="text-xs font-bold text-slate-100 mb-1">
                          {t.question}
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {t.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: ROLE-BASED CREATOR PLAYBOOKS                               */}
        {/* ================================================================= */}
        {activeTab === 'playbooks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CREATOR_PLAYBOOKS.map((playbook) => {
              const IconComp = PLAYBOOK_ICONS[playbook.iconName] || BookOpen
              return (
                <div
                  key={playbook.id}
                  className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">
                            {playbook.persona}
                          </h3>
                          <span className="text-xs text-emerald-400 font-semibold">
                            Recommended: {playbook.recommendedPlan}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 italic mb-3">
                      &ldquo;{playbook.tagline}&rdquo;
                    </p>
                    <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                      {playbook.workflowSummary}
                    </p>

                    <div className="space-y-3">
                      {playbook.milestones.map((m, i) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-bold text-cyan-300">
                              {m.phase}
                            </span>
                            <span className="text-[11px] text-emerald-300 font-medium">
                              {m.creditTip}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {m.action}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                    <Link
                      href={playbook.recommendedPlanHref}
                      className="text-xs font-bold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                    >
                      <span>View {playbook.recommendedPlan}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href="/dashboard/studio/new-project"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                    >
                      <span>Launch This Workflow</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: INTERACTIVE CREDIT CALCULATOR & KNOWLEDGE BASE             */}
        {/* ================================================================= */}
        {activeTab === 'calculator' && (
          <div className="space-y-10">
            {/* Interactive Credit Calculator */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    Interactive Production Budgeter
                  </span>
                  <h2 className="text-xl font-extrabold text-white">
                    Credit &amp; Plan Estimator
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Select a project preset or adjust the sliders to compare{' '}
                    <strong className="text-slate-200">Animatic Cut</strong> vs.{' '}
                    <strong className="text-slate-200">Full Motion Video Master</strong>.
                  </p>
                </div>

                {/* Preset Buttons */}
                <div className="flex flex-wrap gap-2">
                  {CREDIT_ESTIMATOR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSceneCount(preset.sceneCount)
                        setKeyframePairsPerScene(preset.keyframePairsPerScene)
                        setVideoClipsPerScene(preset.videoClipsPerScene)
                        setLanguagesCount(preset.languagesCount)
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Sliders */}
                <div className="lg:col-span-7 space-y-4 bg-slate-950/70 border border-slate-800 rounded-xl p-5">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-300">Number of Scenes</span>
                      <span className="text-cyan-400">{sceneCount} scenes</span>
                    </div>
                    <input
                      type="range"
                      min={3}
                      max={80}
                      value={sceneCount}
                      onChange={(e) => setSceneCount(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-300">
                        Start/End Keyframe Pairs per Scene
                      </span>
                      <span className="text-cyan-400">
                        {keyframePairsPerScene} pairs ({keyframePairsPerScene * 2}{' '}
                        frames/scene)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={6}
                      value={keyframePairsPerScene}
                      onChange={(e) =>
                        setKeyframePairsPerScene(Number(e.target.value))
                      }
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-300">
                        Motion Video Clips per Scene
                      </span>
                      <span className="text-purple-400">
                        {videoClipsPerScene} clips/scene
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={5}
                      value={videoClipsPerScene}
                      onChange={(e) => setVideoClipsPerScene(Number(e.target.value))}
                      className="w-full accent-purple-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-300">
                        Audio Languages (Original + Dubs)
                      </span>
                      <span className="text-emerald-400">
                        {languagesCount}{' '}
                        {languagesCount === 1 ? 'language' : 'languages'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={13}
                      value={languagesCount}
                      onChange={(e) => setLanguagesCount(Number(e.target.value))}
                      className="w-full accent-emerald-400"
                    />
                  </div>
                </div>

                {/* Output Summary Card */}
                <div className="lg:col-span-5 rounded-xl bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40 border border-cyan-500/30 p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                      <span className="text-[11px] font-bold uppercase text-cyan-400">
                        Voiced Animatic Cut
                      </span>
                      <p className="text-2xl font-extrabold text-white mt-1">
                        {creditEstimate.animaticTotal.toLocaleString()}{' '}
                        <span className="text-xs font-normal text-slate-400">cr</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Blueprint + Vault + Keyframes + Full Voice/SFX/Score
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/40">
                      <span className="text-[11px] font-bold uppercase text-purple-300">
                        With Motion Video
                      </span>
                      <p className="text-2xl font-extrabold text-white mt-1">
                        {creditEstimate.fullProductionTotal.toLocaleString()}{' '}
                        <span className="text-xs font-normal text-slate-400">cr</span>
                      </p>
                      <p className="text-[11px] text-purple-200/80 mt-1">
                        Includes {sceneCount * videoClipsPerScene} motion clips &amp;{' '}
                        {languagesCount} language tracks
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1.5 pt-2 border-t border-slate-800">
                    <div className="flex justify-between">
                      <span>Blueprint + Audience Resonance:</span>
                      <span className="font-semibold">
                        {creditEstimate.blueprintAndResonance} cr
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Continuity Vault References:</span>
                      <span className="font-semibold">
                        {creditEstimate.continuityRefs} cr
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Start/End Keyframes:</span>
                      <span className="font-semibold">
                        {creditEstimate.keyframesCost.toLocaleString()} cr
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dialogue, SFX &amp; Musical Score:</span>
                      <span className="font-semibold">
                        {creditEstimate.audioAndScoreCost.toLocaleString()} cr
                      </span>
                    </div>
                    <div className="flex justify-between text-purple-300">
                      <span>AI Motion Video Clips:</span>
                      <span className="font-semibold">
                        {creditEstimate.videoMotionCost.toLocaleString()} cr
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] text-slate-400 block">
                        Best-Fit Tier:
                      </span>
                      <span className="text-xs font-bold text-emerald-400">
                        {creditEstimate.recommendedTier}
                      </span>
                    </div>
                    <Link
                      href={creditEstimate.recommendedTierHref}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors"
                    >
                      <span>View Plan →</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Searchable Reference Library */}
            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-cyan-400" />
                  <span>Studio Reference Guides ({filteredArticles.length})</span>
                </h3>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-cyan-400 hover:underline"
                  >
                    Clear search filter
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredArticles.map((article) => (
                  <div
                    key={article.id}
                    className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300">
                          {JIT_CONTEXT_GUIDES[article.category]?.shortTitle ||
                            article.category}
                        </span>
                        <span className="text-xs text-slate-400">
                          {article.readTime}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white mb-1.5">
                        {article.title}
                      </h4>
                      <p className="text-xs text-slate-300 mb-3">
                        {article.summary}
                      </p>
                      <ul className="space-y-1.5 mb-4">
                        {article.bullets.map((bullet, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-slate-400 flex items-start gap-2"
                          >
                            <span className="text-cyan-400 mt-0.5">•</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3 text-xs text-emerald-200">
                      <strong className="text-emerald-300">Pro Tip: </strong>
                      {article.proTip}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Quick Navigation Bar */}
        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 hover:text-cyan-300 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Back to Command Center</span>
            </Link>
            <Link
              href="/dashboard/settings/billing"
              className="inline-flex items-center gap-1.5 hover:text-cyan-300 transition-colors"
            >
              <Coins className="w-4 h-4" />
              <span>Plans &amp; Credit Vault</span>
            </Link>
            <Link
              href="/dashboard/settings/integrations"
              className="inline-flex items-center gap-1.5 hover:text-cyan-300 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>BYOK Cloud Keys</span>
            </Link>
          </div>
          <a
            href="mailto:support@sceneflowai.studio"
            className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Need 1-on-1 Studio Onboarding? Contact Support</span>
          </a>
        </div>
      </div>
    </div>
  )
}
