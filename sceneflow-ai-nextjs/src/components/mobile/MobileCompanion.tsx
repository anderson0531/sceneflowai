'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import {
  Bell,
  CalendarDays,
  Check,
  CreditCard,
  ExternalLink,
  Link2,
  Loader2,
  LogOut,
  MessageSquare,
  Mic,
  MicOff,
  Plus,
  Share2,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppInstallCard } from '@/components/pwa/AppInstallCard'
import type { CompanionMilestoneStage, CompanionPlanCard } from '@/lib/companion/planCard'
import { appServiceWorkerRegistration } from '@/lib/pwa/appServiceWorker'

type TabId = 'inbox' | 'feedback' | 'plan'

type NotificationRow = {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
  project_id?: string | null
  metadata?: { source?: string; productionUrl?: string; kind?: string; stage?: string } | null
}

type JobRow = {
  id: string
  project_id: string
  job_type: string
  status: string
  progress: number
}

type FeedbackItem = {
  id: string
  source: 'blueprint' | 'continuity' | 'screening'
  projectId: string
  projectTitle: string
  reviewer: string
  score: number | null
  excerpt: string
  status: 'open' | 'in_review' | 'resolved' | null
  createdAt: string
  screeningId?: string
}

const JOB_TYPES = [
  'script_generation',
  'scene_audio',
  'segment_frames',
  'segment_video',
  'scene_render',
  'production_render',
  'reference_library',
  'reference_express',
  'kling_long_take',
  'script_analysis',
  'scene_polish',
  'blueprint_guided_revise',
] as const

const MILESTONE_ORDER: readonly CompanionMilestoneStage[] = [
  'blueprint',
  'resonance',
  'continuity',
  'production',
  'screening',
]

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

function readLaunchState(): { tab: TabId; projectId: string; openInitiate: boolean } {
  if (typeof window === 'undefined') {
    return { tab: 'inbox', projectId: '', openInitiate: false }
  }
  const params = new URLSearchParams(window.location.search)
  const companion = params.get('companion')
  if (companion === 'new') {
    return { tab: 'plan', projectId: '', openInitiate: true }
  }
  const tab: TabId = companion === 'feedback' || companion === 'plan' ? companion : 'inbox'
  return { tab, projectId: params.get('project') || '', openInitiate: false }
}

export function MobileCompanion() {
  const t = useTranslations('common.companion')
  const tNav = useTranslations('common.nav')
  const tStatus = useTranslations('common.status')
  const tErrors = useTranslations('common.errors')
  const tUnits = useTranslations('common.units')
  const tJobs = useTranslations('common.companion.jobs')
  const tInbox = useTranslations('common.companion.inbox')
  const tFeedback = useTranslations('common.companion.feedback')
  const tPlan = useTranslations('common.companion.plan')
  const tInitiate = useTranslations('common.companion.initiate')
  const tLinks = useTranslations('common.companion.links')
  const tStages = useTranslations('common.companion.stages')

  const launch = useMemo(() => readLaunchState(), [])
  const [tab, setTab] = useState<TabId>(launch.tab)
  const [projectId, setProjectId] = useState(launch.projectId)
  const [credits, setCredits] = useState<number | null>(null)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [plans, setPlans] = useState<CompanionPlanCard[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(
    launch.tab === 'plan' ? launch.projectId || null : null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [pushState, setPushState] = useState<'hidden' | 'offer' | 'on'>('hidden')
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [creatingContinuityFor, setCreatingContinuityFor] = useState<string | null>(null)

  // Initiate Project & Blueprint drawer state
  const [showInitiate, setShowInitiate] = useState(launch.openInitiate)
  const [newTitle, setNewTitle] = useState('')
  const [newVertical, setNewVertical] = useState('video_memoir')
  const [newBrief, setNewBrief] = useState('')
  const [requestPmSupport, setRequestPmSupport] = useState(true)
  const [pmEmail, setPmEmail] = useState('')
  const [budgetCap, setBudgetCap] = useState('')
  const [initiating, setInitiating] = useState(false)
  const [initiateError, setInitiateError] = useState<string | null>(null)
  const [dictating, setDictating] = useState(false)
  const recognitionRef = useRef<any>(null)

  const loadInbox = useCallback(async () => {
    const [notesRes, jobsRes] = await Promise.all([
      fetch('/api/notifications'),
      fetch('/api/jobs?active=true'),
    ])
    const notes = await notesRes.json()
    const jobBody = await jobsRes.json()
    if (!notesRes.ok) throw new Error('notifications')
    setNotifications(notes.notifications || [])
    setJobs(jobsRes.ok ? jobBody.jobs || [] : [])
  }, [])

  const loadFeedback = useCallback(async () => {
    const res = await fetch('/api/companion/feedback')
    const data = await res.json()
    if (!res.ok) throw new Error('feedback')
    setFeedback(data.items || [])
  }, [])

  const loadPlans = useCallback(async () => {
    const res = await fetch('/api/companion/plans')
    const data = await res.json()
    if (!res.ok) throw new Error('plans')
    setPlans(data.plans || [])
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      if (tab === 'inbox') await loadInbox()
      if (tab === 'feedback') await loadFeedback()
      if (tab === 'plan') await loadPlans()
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [loadFeedback, loadInbox, loadPlans, tab])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Auto-poll active jobs while Inbox has running jobs
  useEffect(() => {
    if (tab !== 'inbox' || jobs.length === 0) return
    const timer = window.setInterval(() => {
      void loadInbox().catch(() => {})
    }, 12000)
    return () => window.clearInterval(timer)
  }, [tab, jobs.length, loadInbox])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/user/credits')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && typeof data.total_credits === 'number') setCredits(data.total_credits)
      } catch {
        // Balance is optional chrome.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const enablePush = useCallback(async (announce: boolean) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setPushState('hidden')
      try {
        localStorage.setItem('sf-companion-push-dismissed', '1')
      } catch {
        // Ignore storage failures.
      }
      return
    }
    const configRes = await fetch('/api/push/config')
    const config = await configRes.json()
    if (!config.enabled || !config.publicKey) return
    const registration = await appServiceWorkerRegistration()
    const existing = await registration.pushManager.getSubscription()
    const subscription =
      existing ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey) as BufferSource,
      }))
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON()),
    })
    if (announce) setPushState('on')
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (localStorage.getItem('sf-companion-push-dismissed') === '1') return
      } catch {
        // Continue and offer alerts.
      }
      const res = await fetch('/api/push/config')
      const config = await res.json()
      if (cancelled || !config.enabled) return
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        await enablePush(false)
        return
      }
      if (typeof Notification === 'undefined' || Notification.permission === 'denied') return
      setPushState('offer')
    })().catch(() => {
      // Alerts stay off when the browser blocks them.
    })
    return () => {
      cancelled = true
    }
  }, [enablePush])

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    })
    await loadInbox()
  }

  const openNotification = async (note: NotificationRow) => {
    if (!note.read) {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [note.id] }),
      })
      setNotifications((current) =>
        current.map((row) => (row.id === note.id ? { ...row, read: true } : row))
      )
    }
    if (
      note.type === 'feedback' ||
      note.type === 'client_feedback_received' ||
      note.metadata?.source
    ) {
      setProjectId(note.project_id || '')
      setTab('feedback')
      return
    }
    if (note.project_id) {
      setSelectedPlanId(note.project_id)
      setTab('plan')
    }
  }

  const resolveFeedback = async (item: FeedbackItem) => {
    if (!item.screeningId) return
    setResolvingId(item.id)
    try {
      const res = await fetch('/api/premiere/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: item.projectId,
          screeningId: item.screeningId,
          feedbackId: item.id,
          status: 'resolved',
        }),
      })
      if (res.ok) {
        setFeedback((current) =>
          current.map((row) => (row.id === item.id ? { ...row, status: 'resolved' } : row))
        )
      }
    } finally {
      setResolvingId(null)
    }
  }

  const handleShareOrCopyLink = async (label: string, pathOrUrl: string) => {
    const fullUrl =
      pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')
        ? pathOrUrl
        : `${window.location.origin}${pathOrUrl}`
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: label, url: fullUrl })
        return
      } catch {
        // Fall through to clipboard copy if user dismissed native share sheet
      }
    }
    await navigator.clipboard?.writeText(fullUrl).catch(() => {})
    setCopiedUrl(pathOrUrl)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  const handleEnableContinuityLink = async (targetProjectId: string) => {
    setCreatingContinuityFor(targetProjectId)
    try {
      const res = await fetch('/api/share/continuity/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: targetProjectId,
          clientMode: false,
          allowUploads: true,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        await loadPlans()
        if (data.shareUrl) {
          await handleShareOrCopyLink('Continuity Review & Uploads', data.shareUrl)
        }
      }
    } finally {
      setCreatingContinuityFor(null)
    }
  }

  const toggleDictation = () => {
    if (dictating && recognitionRef.current) {
      recognitionRef.current.stop()
      setDictating(false)
      return
    }
    const SpeechRec =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null
    if (!SpeechRec) return
    const rec = new SpeechRec()
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (evt: any) => {
      const text = Array.from(evt.results)
        .slice(evt.resultIndex)
        .map((r: any) => r[0]?.transcript || '')
        .join(' ')
        .trim()
      if (text) {
        setNewBrief((prev) => (prev ? `${prev} ${text}` : text))
      }
    }
    rec.onend = () => setDictating(false)
    rec.onerror = () => setDictating(false)
    recognitionRef.current = rec
    setDictating(true)
    rec.start()
  }

  const handleInitiateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || newBrief.trim().length < 10) return
    setInitiating(true)
    setInitiateError(null)
    try {
      const res = await fetch('/api/companion/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          vertical: newVertical,
          brief: newBrief.trim(),
          requestPmSupport,
          pmEmail: pmEmail.trim() || undefined,
          creditBudgetCap: budgetCap ? Number(budgetCap) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setInitiateError(data.error || tErrors('generic'))
        return
      }
      setShowInitiate(false)
      setNewTitle('')
      setNewBrief('')
      setPmEmail('')
      setBudgetCap('')
      await loadPlans()
      setSelectedPlanId(data.projectId)
      setTab('plan')
    } catch {
      setInitiateError(tErrors('generic'))
    } finally {
      setInitiating(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Still clear the session.
    }
    await signOut({ callbackUrl: '/' })
  }

  const projectTitleMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of plans) map.set(p.projectId, p.title)
    for (const item of feedback) map.set(item.projectId, item.projectTitle)
    return map
  }, [plans, feedback])

  const projects = useMemo(() => [...projectTitleMap.entries()], [projectTitleMap])

  const visibleFeedback = projectId
    ? feedback.filter((item) => item.projectId === projectId)
    : feedback

  const selectedPlan = plans.find((plan) => plan.projectId === selectedPlanId) ?? null

  const paceLabel = (pace: CompanionPlanCard['schedulePace']) => {
    if (pace === 'ahead') return tPlan('ahead')
    if (pace === 'behind') return tPlan('behind')
    if (pace === 'on_pace') return tPlan('onPace')
    return ''
  }
  const spendLabel = (pace: CompanionPlanCard['spendPace']) => {
    if (pace === 'under') return tPlan('under')
    if (pace === 'over') return tPlan('over')
    if (pace === 'on_budget') return tPlan('onBudget')
    return ''
  }
  const statusLabel = (status: FeedbackItem['status']) => {
    if (status === 'resolved') return tFeedback('resolved')
    if (status === 'in_review') return tFeedback('inReview')
    if (status === 'open') return tFeedback('open')
    return ''
  }
  const feedbackSourceLabel = (source: FeedbackItem['source']) => {
    if (source === 'blueprint') return tFeedback('blueprint')
    if (source === 'continuity') return tFeedback('continuity')
    return tFeedback('screening')
  }
  const jobLabel = (type: string) =>
    (JOB_TYPES as readonly string[]).includes(type) ? tJobs(type as (typeof JOB_TYPES)[number]) : type
  const jobStatus = (status: string) =>
    status === 'queued' || status === 'processing' ? tJobs(status) : status

  const planHeadline = (plan: CompanionPlanCard) => {
    if (plan.plannedCredits == null) return tPlan('noSchedule')
    const amount = plan.plannedCredits.toLocaleString()
    return plan.finishLabel
      ? tPlan('headline', { amount, date: plan.finishLabel })
      : tPlan('amountOnly', { amount })
  }

  const actionStateLabel = (plan: CompanionPlanCard) => {
    if (plan.actionState === 'action_required') return tLinks('actionRequired')
    if (plan.actionState === 'waiting_on_client') return tLinks('waitingClient')
    if (plan.actionState === 'client_approved') return tLinks('approved')
    if (plan.pmSupportRequested) return tLinks('pmRequested')
    return null
  }

  const renderMilestoneBar = (activeStage: CompanionMilestoneStage) => {
    const activeIdx = MILESTONE_ORDER.indexOf(activeStage)
    return (
      <div className="mt-2.5 grid grid-cols-5 gap-1">
        {MILESTONE_ORDER.map((stage, idx) => {
          const done = idx < activeIdx
          const current = idx === activeIdx
          return (
            <div
              key={stage}
              title={tStages(stage)}
              className={cn(
                'rounded-md px-1 py-1 text-center text-[10px] font-medium truncate border',
                current
                  ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-200'
                  : done
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-800 bg-slate-900/60 text-slate-500'
              )}
            >
              {tStages(stage)}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950 text-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-cyan-300 truncate">{t('brand')}</p>
          {credits != null ? (
            <p className="text-xs text-slate-400">
              <span className="sr-only">{t('creditsLabel')}</span>
              {tUnits('creditsShort', { count: credits.toLocaleString() })}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title={tInitiate('button')}
            onClick={() => setShowInitiate((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-full bg-cyan-500 px-2.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span>{tInitiate('button')}</span>
          </button>
          <Link
            href="/dashboard/settings/billing"
            title="Billing"
            className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-cyan-300 hover:bg-slate-800"
          >
            <CreditCard className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden min-[380px]:inline">Billing</span>
          </Link>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            title={tNav('signOut')}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-900"
            aria-label={tNav('signOut')}
          >
            <LogOut className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-24">
        <AppInstallCard surface="phone-companion" authStatus="authenticated" pathname="/dashboard" />
        {pushState === 'offer' ? (
          <button
            type="button"
            onClick={() => void enablePush(true)}
            className="mb-4 w-full rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-left"
          >
            <p className="text-sm font-medium text-cyan-200">{t('enableAlerts')}</p>
            <p className="mt-1 text-xs text-slate-400">{t('alertsHint')}</p>
          </button>
        ) : null}
        {pushState === 'on' ? (
          <p className="mb-4 rounded-2xl border border-slate-800 px-4 py-3 text-xs text-slate-400">
            {t('alertsOn')}
          </p>
        ) : null}

        {showInitiate ? (
          <form
            onSubmit={handleInitiateProject}
            className="mb-5 rounded-2xl border border-cyan-500/40 bg-slate-900/90 p-4 space-y-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-cyan-400 shrink-0" />
                  {tInitiate('title')}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{tInitiate('subtitle')}</p>
              </div>
            </div>

            {initiateError && (
              <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {initiateError}
              </p>
            )}

            <label className="block text-xs text-slate-300">
              {tInitiate('projectTitle')}
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={tInitiate('projectTitlePlaceholder')}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </label>

            <label className="block text-xs text-slate-300">
              {tInitiate('vertical')}
              <select
                value={newVertical}
                onChange={(e) => setNewVertical(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                <option value="video_memoir">{tInitiate('verticalMemoir')}</option>
                <option value="real_estate_tour">{tInitiate('verticalRealEstate')}</option>
                <option value="education_module">{tInitiate('verticalEducation')}</option>
                <option value="brand_story">{tInitiate('verticalBrand')}</option>
                <option value="creator_film">{tInitiate('verticalFilm')}</option>
              </select>
            </label>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>{tInitiate('brief')}</span>
                <button
                  type="button"
                  onClick={toggleDictation}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium',
                    dictating
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-slate-800 text-cyan-300'
                  )}
                >
                  {dictating ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  <span>{dictating ? tInitiate('stopDictate') : tInitiate('dictate')}</span>
                </button>
              </div>
              <textarea
                required
                rows={3}
                value={newBrief}
                onChange={(e) => setNewBrief(e.target.value)}
                placeholder={tInitiate('briefPlaceholder')}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>

            <label className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/70 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requestPmSupport}
                onChange={(e) => setRequestPmSupport(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <div>
                <p className="text-xs font-semibold text-white">{tInitiate('pmSupport')}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{tInitiate('pmSupportHint')}</p>
              </div>
            </label>

            {requestPmSupport && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="block text-xs text-slate-300">
                  {tInitiate('pmEmail')}
                  <input
                    type="email"
                    value={pmEmail}
                    onChange={(e) => setPmEmail(e.target.value)}
                    placeholder="pm@studio.com"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </label>
                <label className="block text-xs text-slate-300">
                  {tInitiate('budgetCap')}
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={budgetCap}
                    onChange={(e) => setBudgetCap(e.target.value)}
                    placeholder="2500"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowInitiate(false)}
                className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300"
              >
                {tInitiate('cancel')}
              </button>
              <button
                type="submit"
                disabled={initiating || !newTitle.trim() || newBrief.trim().length < 10}
                className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50"
              >
                {initiating ? tStatus('saving') : tInitiate('submit')}
              </button>
            </div>
          </form>
        ) : null}

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {tStatus('loading')}
          </p>
        ) : null}
        {error ? <p className="text-sm text-rose-300">{tErrors('generic')}</p> : null}

        {!loading && !error && tab === 'inbox' ? (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">{t('tabs.inbox')}</h1>
              <button type="button" onClick={() => void markAllRead()} className="text-xs text-cyan-300">
                {tInbox('markAllRead')}
              </button>
            </div>
            <div>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                {tInbox('activeJobs')}
              </h2>
              {jobs.length === 0 ? (
                <p className="text-sm text-slate-500">{tInbox('noJobs')}</p>
              ) : (
                <ul className="space-y-2">
                  {jobs.map((job) => {
                    const projTitle = projectTitleMap.get(job.project_id)
                    return (
                      <li key={job.id} className="rounded-2xl border border-slate-800 px-3 py-3">
                        {projTitle ? (
                          <p className="text-[11px] font-medium text-cyan-300 truncate">{projTitle}</p>
                        ) : null}
                        <p className="text-sm font-medium">{jobLabel(job.job_type)}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {jobStatus(job.status)}
                          {' · '}
                          {tInbox('progress', { progress: Math.round(job.progress || 0) })}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-500">{tInbox('empty')}</p>
            ) : (
              <ul className="space-y-2">
                {notifications.map((note) => (
                  <li key={note.id}>
                    <button
                      type="button"
                      onClick={() => void openNotification(note)}
                      className={cn(
                        'w-full rounded-2xl border px-3 py-3 text-left',
                        note.read ? 'border-slate-800' : 'border-cyan-500/40 bg-cyan-500/5'
                      )}
                    >
                      <p className="text-sm font-medium">{note.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">{note.message}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-slate-500">{t('desktopOnly')}</p>
          </section>
        ) : null}

        {!loading && !error && tab === 'feedback' ? (
          <section className="space-y-4">
            <h1 className="text-lg font-semibold">{t('tabs.feedback')}</h1>
            <label className="block text-xs text-slate-400">
              {tFeedback('filterLabel')}
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              >
                <option value="">{tFeedback('allProjects')}</option>
                {projects.map(([id, title]) => (
                  <option key={id} value={id}>
                    {title}
                  </option>
                ))}
              </select>
            </label>
            {visibleFeedback.length === 0 ? (
              <p className="text-sm text-slate-500">{tFeedback('empty')}</p>
            ) : (
              <ul className="space-y-2">
                {visibleFeedback.map((item) => (
                  <li key={`${item.source}-${item.id}`} className="rounded-2xl border border-slate-800 px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          'text-xs font-medium',
                          item.source === 'continuity' ? 'text-purple-300' : 'text-cyan-300'
                        )}
                      >
                        {feedbackSourceLabel(item.source)}
                      </p>
                      {item.score != null ? (
                        <p className="text-xs text-slate-400">{tFeedback('score', { score: item.score })}</p>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm font-medium">{item.projectTitle}</p>
                    <p className="text-xs text-slate-400">{item.reviewer}</p>
                    {item.excerpt ? (
                      <p className="mt-2 text-sm leading-relaxed text-slate-200">{item.excerpt}</p>
                    ) : null}
                    {item.status ? (
                      <p className="mt-2 text-xs text-slate-500">{statusLabel(item.status)}</p>
                    ) : null}
                    {item.source === 'screening' && item.status !== 'resolved' && item.screeningId ? (
                      <button
                        type="button"
                        disabled={resolvingId === item.id}
                        onClick={() => void resolveFeedback(item)}
                        className="mt-3 text-xs font-medium text-cyan-300"
                      >
                        {resolvingId === item.id ? tStatus('saving') : tFeedback('resolve')}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-slate-500">{t('desktopOnly')}</p>
          </section>
        ) : null}

        {!loading && !error && tab === 'plan' ? (
          <section className="space-y-4">
            {selectedPlan ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setSelectedPlanId(null)}
                  className="text-xs text-cyan-300"
                >
                  {tPlan('back')}
                </button>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h1 className="text-lg font-semibold leading-snug">{selectedPlan.title}</h1>
                    {selectedPlan.resonanceScore != null ? (
                      <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                        ARA {selectedPlan.resonanceScore}
                      </span>
                    ) : null}
                  </div>
                  {renderMilestoneBar(selectedPlan.milestoneStage)}
                </div>

                {/* 4-Link Collaboration & Mobile Upload Card */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-cyan-300 flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5 shrink-0" />
                      {tLinks('heading')}
                    </h2>
                    {actionStateLabel(selectedPlan) ? (
                      <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-medium text-purple-200">
                        {actionStateLabel(selectedPlan)}
                      </span>
                    ) : null}
                  </div>

                  {selectedPlan.continuitySummary ? (
                    <p className="text-xs text-slate-400">
                      {tLinks('continuity')}: {selectedPlan.continuitySummary.approvedSlots}/
                      {selectedPlan.continuitySummary.totalSlots}
                      {selectedPlan.continuitySummary.pendingUploads > 0
                        ? ` · +${selectedPlan.continuitySummary.pendingUploads} photos`
                        : ''}
                    </p>
                  ) : null}

                  <div className="space-y-2">
                    {(
                      [
                        ['blueprint', selectedPlan.shareLinks.blueprintUrl],
                        ['resonance', selectedPlan.shareLinks.resonanceUrl],
                        ['continuity', selectedPlan.shareLinks.continuityUrl],
                        ['screening', selectedPlan.shareLinks.screeningUrl],
                      ] as const
                    ).map(([key, url]) => {
                      const label = tLinks(key)
                      if (!url) {
                        if (key === 'continuity') {
                          return (
                            <button
                              key={key}
                              type="button"
                              disabled={creatingContinuityFor === selectedPlan.projectId}
                              onClick={() => void handleEnableContinuityLink(selectedPlan.projectId)}
                              className="w-full rounded-xl border border-dashed border-cyan-500/40 bg-cyan-500/5 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-500/10"
                            >
                              {creatingContinuityFor === selectedPlan.projectId
                                ? tStatus('saving')
                                : tLinks('createContinuity')}
                            </button>
                          )
                        }
                        return null
                      }
                      const isCopied = copiedUrl === url
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2"
                        >
                          <span className="text-xs font-medium text-slate-200 truncate">{label}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              title={tLinks('open')}
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-cyan-300 hover:bg-slate-700"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>{tLinks('open')}</span>
                            </a>
                            <button
                              type="button"
                              title={tLinks('share')}
                              onClick={() => void handleShareOrCopyLink(label, url)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800"
                            >
                              {isCopied ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Share2 className="h-3 w-3" />
                              )}
                              <span>{isCopied ? tLinks('copied') : tLinks('share')}</span>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Budget & Schedule Summary */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3.5 space-y-2.5">
                  <p className="text-sm font-medium text-slate-100">{planHeadline(selectedPlan)}</p>
                  {selectedPlan.plannedCredits != null && selectedPlan.plannedCredits > 0 ? (
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-400 transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((selectedPlan.creditsUsed / selectedPlan.plannedCredits) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {selectedPlan.schedulePace ? (
                      <p className="rounded-xl border border-slate-800 px-3 py-2">
                        {paceLabel(selectedPlan.schedulePace)}
                      </p>
                    ) : null}
                    {selectedPlan.spendPace ? (
                      <p className="rounded-xl border border-slate-800 px-3 py-2">
                        {spendLabel(selectedPlan.spendPace)}
                      </p>
                    ) : null}
                  </div>
                  {selectedPlan.scenesPlanned != null ? (
                    <p className="text-sm text-slate-300">
                      {tPlan('scenes', {
                        finished: selectedPlan.scenesFinished ?? 0,
                        planned: selectedPlan.scenesPlanned,
                      })}
                    </p>
                  ) : null}
                  <p className="text-sm text-slate-400">
                    {tPlan('used', { amount: selectedPlan.creditsUsed.toLocaleString() })}
                  </p>
                  {selectedPlan.plannedThroughToday != null ? (
                    <p className="text-sm text-slate-400">
                      {tPlan('throughToday', {
                        amount: selectedPlan.plannedThroughToday.toLocaleString(),
                      })}
                    </p>
                  ) : null}
                </div>

                <div>
                  <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    {tPlan('upcoming')}
                  </h2>
                  {selectedPlan.upcoming.length === 0 ? (
                    <p className="text-sm text-slate-500">{tPlan('noUpcoming')}</p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedPlan.upcoming.map((row) => (
                        <li
                          key={row.date}
                          className="flex items-center justify-between rounded-xl border border-slate-800 px-3 py-2 text-sm"
                        >
                          <span>{row.label}</span>
                          <span className="text-slate-400">
                            {tPlan('creditsOnDate', { amount: row.cumulativeCredits.toLocaleString() })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {selectedPlan.chapterEnds.length > 0 ? (
                  <div>
                    <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      {tPlan('chapters')}
                    </h2>
                    <ul className="space-y-2">
                      {selectedPlan.chapterEnds.map((chapter) => (
                        <li key={chapter.key} className="flex items-center justify-between text-sm">
                          <span>{chapter.title}</span>
                          <span className="text-slate-400">{chapter.date}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <h1 className="text-lg font-semibold">{t('tabs.plan')}</h1>
                  {credits != null ? (
                    <span className="rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-cyan-300">
                      {tUnits('creditsShort', { count: credits.toLocaleString() })}
                    </span>
                  ) : null}
                </div>
                {plans.length === 0 ? (
                  <p className="text-sm text-slate-500">{tPlan('empty')}</p>
                ) : (
                  <ul className="space-y-2.5">
                    {plans.map((plan) => {
                      const badge = actionStateLabel(plan)
                      return (
                        <li key={plan.projectId}>
                          <button
                            type="button"
                            onClick={() => setSelectedPlanId(plan.projectId)}
                            className="w-full rounded-2xl border border-slate-800 bg-slate-900/40 px-3.5 py-3 text-left hover:border-slate-700"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium leading-snug">{plan.title}</p>
                              {badge ? (
                                <span className="shrink-0 rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-medium text-purple-200">
                                  {badge}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-slate-300">
                              {planHeadline(plan)}
                              {plan.creditsUsed > 0
                                ? ` · ${tPlan('used', { amount: plan.creditsUsed.toLocaleString() })}`
                                : ''}
                            </p>
                            {plan.schedulePace ? (
                              <p className="mt-1 text-xs text-slate-500">
                                {paceLabel(plan.schedulePace)}
                                {plan.spendPace ? ` · ${spendLabel(plan.spendPace)}` : ''}
                              </p>
                            ) : null}
                            {renderMilestoneBar(plan.milestoneStage)}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </>
            )}
            <p className="text-xs text-slate-500">{t('desktopOnly')}</p>
          </section>
        ) : null}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-[81] grid grid-cols-3 border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)]">
        {(
          [
            ['inbox', Bell],
            ['feedback', MessageSquare],
            ['plan', CalendarDays],
          ] as const
        ).map(([id, Icon]) => (
          <button
            key={id}
            type="button"
            title={t(`tabs.${id}`)}
            onClick={() => {
              setTab(id)
              if (id !== 'plan') setSelectedPlanId(null)
            }}
            className={cn(
              'flex flex-col items-center gap-1 py-3 text-xs',
              tab === id ? 'text-cyan-300' : 'text-slate-500'
            )}
          >
            <Icon className="h-5 w-5" />
            {t(`tabs.${id}`)}
          </button>
        ))}
      </nav>
    </div>
  )
}
