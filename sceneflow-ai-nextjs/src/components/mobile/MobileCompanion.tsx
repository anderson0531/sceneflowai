'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Bell, CalendarDays, Loader2, LogOut, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppInstallCard } from '@/components/pwa/AppInstallCard'
import type { CompanionPlanCard } from '@/lib/companion/planCard'
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
  metadata?: { source?: string } | null
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
  source: 'blueprint' | 'screening'
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

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

function readLaunchState(): { tab: TabId; projectId: string } {
  if (typeof window === 'undefined') return { tab: 'inbox', projectId: '' }
  const params = new URLSearchParams(window.location.search)
  const companion = params.get('companion')
  const tab: TabId = companion === 'feedback' || companion === 'plan' ? companion : 'inbox'
  return { tab, projectId: params.get('project') || '' }
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
    if (note.type === 'feedback' || note.metadata?.source) {
      setProjectId(note.project_id || '')
      setTab('feedback')
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

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Still clear the session.
    }
    await signOut({ callbackUrl: '/' })
  }

  const projects = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of feedback) map.set(item.projectId, item.projectTitle)
    return [...map.entries()]
  }, [feedback])

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

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950 text-white">
      <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-cyan-300">{t('brand')}</p>
          {credits != null ? (
            <p className="text-xs text-slate-400">
              <span className="sr-only">{t('creditsLabel')}</span>
              {tUnits('creditsShort', { count: credits.toLocaleString() })}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs text-slate-300"
          aria-label={tNav('signOut')}
        >
          <LogOut className="h-4 w-4" />
          {tNav('signOut')}
        </button>
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
                  {jobs.map((job) => (
                    <li key={job.id} className="rounded-2xl border border-slate-800 px-3 py-3">
                      <p className="text-sm font-medium">{jobLabel(job.job_type)}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {jobStatus(job.status)}
                        {' · '}
                        {tInbox('progress', { progress: Math.round(job.progress || 0) })}
                      </p>
                    </li>
                  ))}
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
                      <p className="text-xs text-cyan-300">
                        {item.source === 'blueprint' ? tFeedback('blueprint') : tFeedback('screening')}
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
                <h1 className="text-lg font-semibold">{selectedPlan.title}</h1>
                <p className="text-sm text-slate-200">{planHeadline(selectedPlan)}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selectedPlan.schedulePace ? (
                    <p className="rounded-xl border border-slate-800 px-3 py-2">{paceLabel(selectedPlan.schedulePace)}</p>
                  ) : null}
                  {selectedPlan.spendPace ? (
                    <p className="rounded-xl border border-slate-800 px-3 py-2">{spendLabel(selectedPlan.spendPace)}</p>
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
                <div>
                  <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    {tPlan('upcoming')}
                  </h2>
                  {selectedPlan.upcoming.length === 0 ? (
                    <p className="text-sm text-slate-500">{tPlan('noUpcoming')}</p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedPlan.upcoming.map((row) => (
                        <li key={row.date} className="flex items-center justify-between rounded-xl border border-slate-800 px-3 py-2 text-sm">
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
                <h1 className="text-lg font-semibold">{t('tabs.plan')}</h1>
                {plans.length === 0 ? (
                  <p className="text-sm text-slate-500">{tPlan('empty')}</p>
                ) : (
                  <ul className="space-y-2">
                    {plans.map((plan) => (
                      <li key={plan.projectId}>
                        <button
                          type="button"
                          onClick={() => setSelectedPlanId(plan.projectId)}
                          className="w-full rounded-2xl border border-slate-800 px-3 py-3 text-left"
                        >
                          <p className="text-sm font-medium">{plan.title}</p>
                          <p className="mt-1 text-xs text-slate-300">{planHeadline(plan)}</p>
                          {plan.schedulePace ? (
                            <p className="mt-1 text-xs text-slate-500">
                              {paceLabel(plan.schedulePace)}
                              {plan.spendPace ? ` · ${spendLabel(plan.spendPace)}` : ''}
                            </p>
                          ) : null}
                        </button>
                      </li>
                    ))}
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
