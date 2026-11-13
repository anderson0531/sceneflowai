'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  Briefcase,
  ShieldCheck,
  Palette,
  MessageSquare,
  Copy,
  Check,
  Image as ImageIcon,
  Users,
  Plus,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'

interface ProducerProfileDto {
  id: string
  brandName: string | null
  brandLogoUrl: string | null
  primaryColor: string | null
  supportEmail: string | null
  customTermsUrl: string | null
  hideSceneFlowBranding: boolean
  defaultMaxRounds: number
  dailyPublicIntakeCreditCap: number
  commercialAddendumAcceptedAt: string | null
  commercialAddendumVersion: string | null
}

interface WorkspaceMemberDto {
  id: string
  memberUserId: string | null
  memberEmail: string
  role: 'admin' | 'project_manager'
  status: 'invited' | 'active' | 'revoked'
  accessAllProjects: boolean
  monthlyCreditLimit: number | null
  creditsUsedMonth: number
  assignedProjectIds: string[]
}

interface ProjectSummaryItem {
  id: string
  title: string
  currentStep?: string
  metadata?: {
    clientOrder?: {
      isClientProject?: boolean
      stage?: string
      actionState?: string
      customerName?: string
      customerLabel?: string
    }
  }
}

interface SubmissionItem {
  id: string
  slot_type: 'character' | 'location' | 'prop'
  slot_key: string
  slot_label: string
  blob_url: string
  mime_type: string
  caption: string | null
  quarantine_status: 'pending' | 'clean' | 'flagged' | 'promoted' | 'rejected'
  quarantine_reason: string | null
  exif_stripped: boolean
  promoted_reference_id: string | null
  created_at: string
}

const VERTICAL_OPTIONS = [
  { value: 'video_memoir', label: 'Video Memoir / Family Legacy ($300 Hybrid Preset)' },
  { value: 'real_estate_tour', label: 'Real Estate Property Tour' },
  { value: 'education_module', label: 'Education / Training Module' },
  { value: 'brand_story', label: 'Brand / Small Business Story' },
] as const

const LOCALE_OPTIONS = [
  { value: 'en', label: 'English (en)' },
  { value: 'es', label: 'Español (es)' },
  { value: 'pt', label: 'Português (pt)' },
  { value: 'hi', label: 'हिन्दी (hi)' },
  { value: 'zh-CN', label: '简体中文 (zh-CN)' },
  { value: 'ar', label: 'العربية (ar)' },
  { value: 'th', label: 'ไทย (th)' },
] as const

export default function ProducerSettingsPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)

  // Section 1: Producer Profile & Addendum
  const [profile, setProfile] = useState<ProducerProfileDto | null>(null)
  const [brandName, setBrandName] = useState('')
  const [brandLogoUrl, setBrandLogoUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#06b6d4')
  const [supportEmail, setSupportEmail] = useState('')
  const [customTermsUrl, setCustomTermsUrl] = useState('')
  const [hideBranding, setHideBranding] = useState(true)
  const [defaultMaxRounds, setDefaultMaxRounds] = useState(2)
  const [dailyPublicCap, setDailyPublicCap] = useState(200)
  const [addendumChecked, setAddendumChecked] = useState(false)

  // Section 2: Intake Link & Embed Generator
  const [intakeVertical, setIntakeVertical] = useState<string>('video_memoir')
  const [intakeLocale, setIntakeLocale] = useState<string>('en')
  const [intakeMode, setIntakeMode] = useState<'single_project' | 'public_lead'>('single_project')
  const [customerLabel, setCustomerLabel] = useState('')
  const [clientPriceUsd, setClientPriceUsd] = useState('300')
  const [creditBudgetCap, setCreditBudgetCap] = useState('950')
  const [maxCustomerTurns, setMaxCustomerTurns] = useState('8')
  const [intakeMaxRounds, setIntakeMaxRounds] = useState('2')
  const [creatingIntake, setCreatingIntake] = useState(false)
  const [generatedIntake, setGeneratedIntake] = useState<{
    shareUrl: string
    embedUrl: string
    iframeSnippet: string
    projectId: string | null
  } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Section 3: Continuity Portal & Quarantine Review
  const [projects, setProjects] = useState<ProjectSummaryItem[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [continuityLocale, setContinuityLocale] = useState('en')
  const [continuityMaxRounds, setContinuityMaxRounds] = useState('2')
  const [clientGroupSlug, setClientGroupSlug] = useState('')
  const [creatingContinuity, setCreatingContinuity] = useState(false)
  const [generatedContinuityUrl, setGeneratedContinuityUrl] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [promotingId, setPromotingId] = useState<string | null>(null)

  // Section 4: Universal Team Accounts
  const [members, setMembers] = useState<WorkspaceMemberDto[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'project_manager' | 'admin'>('project_manager')
  const [inviteCreditLimit, setInviteCreditLimit] = useState('1500')
  const [inviteAllProjects, setInviteAllProjects] = useState(false)
  const [inviteProjectIds, setInviteProjectIds] = useState<string[]>([])
  const [invitingMember, setInvitingMember] = useState(false)

  const copyToClipboard = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [profRes, memRes] = await Promise.all([
        fetch('/api/producer/profile'),
        fetch('/api/workspace/members'),
      ])
      const profJson = await profRes.json().catch(() => ({}))
      if (profJson.success && profJson.profile) {
        const p: ProducerProfileDto = profJson.profile
        setProfile(p)
        setBrandName(p.brandName || '')
        setBrandLogoUrl(p.brandLogoUrl || '')
        setPrimaryColor(p.primaryColor || '#06b6d4')
        setSupportEmail(p.supportEmail || '')
        setCustomTermsUrl(p.customTermsUrl || '')
        setHideBranding(Boolean(p.hideSceneFlowBranding))
        setDefaultMaxRounds(Number(p.defaultMaxRounds || 2))
        setDailyPublicCap(Number(p.dailyPublicIntakeCreditCap || 200))
        setAddendumChecked(Boolean(p.commercialAddendumAcceptedAt))
      }

      const memJson = await memRes.json().catch(() => ({}))
      if (memJson.success && Array.isArray(memJson.members)) {
        setMembers(memJson.members)
      }

      const userKey = session?.user?.email || (session?.user as { id?: string })?.id
      if (userKey) {
        const projRes = await fetch(
          `/api/projects?userId=${encodeURIComponent(userKey)}&summary=1&pageSize=50`
        )
        const projJson = await projRes.json().catch(() => ({}))
        if (projJson.success && Array.isArray(projJson.projects)) {
          const list = projJson.projects.filter(
            (pr: ProjectSummaryItem) => pr.id && !pr.id.startsWith('demo-')
          )
          setProjects(list)
          if (list.length > 0 && !selectedProjectId) {
            setSelectedProjectId(list[0].id)
          }
        }
      }
    } catch (err) {
      console.error('[ProducerSettingsPage] load error:', err)
    } finally {
      setLoading(false)
    }
  }, [session?.user, selectedProjectId])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const loadProjectSubmissions = useCallback(async (projectId: string) => {
    if (!projectId) {
      setSubmissions([])
      return
    }
    setLoadingSubmissions(true)
    try {
      const res = await fetch(
        `/api/share/continuity/manage/promote?projectId=${encodeURIComponent(projectId)}`
      )
      const data = await res.json().catch(() => ({}))
      if (data.success && Array.isArray(data.submissions)) {
        setSubmissions(data.submissions)
      } else {
        setSubmissions([])
      }
    } catch {
      setSubmissions([])
    } finally {
      setLoadingSubmissions(false)
    }
  }, [])

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectSubmissions(selectedProjectId)
    }
  }, [selectedProjectId, loadProjectSubmissions])

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      const res = await fetch('/api/producer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: brandName.trim() || null,
          brandLogoUrl: brandLogoUrl.trim() || null,
          primaryColor: primaryColor.trim() || '#06b6d4',
          supportEmail: supportEmail.trim() || null,
          customTermsUrl: customTermsUrl.trim() || null,
          hideSceneFlowBranding: hideBranding,
          defaultMaxRounds: Number(defaultMaxRounds) || 2,
          dailyPublicIntakeCreditCap: Number(dailyPublicCap) || 200,
          acceptCommercialAddendum: addendumChecked,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save Producer Profile')
      }
      setProfile(data.profile)
      toast.success('Producer profile & Commercial Addendum saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleCreateIntakeLink = async () => {
    if (!profile?.commercialAddendumAcceptedAt) {
      toast.error('Please accept and save the Commercial Producer Addendum above first.')
      return
    }
    setCreatingIntake(true)
    try {
      const res = await fetch('/api/intake/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vertical: intakeVertical,
          mode: intakeMode,
          locale: intakeLocale,
          customerLabel: customerLabel.trim() || undefined,
          clientPriceUsd: Number(clientPriceUsd) > 0 ? Number(clientPriceUsd) : undefined,
          creditBudgetCap: Number(creditBudgetCap) > 0 ? Number(creditBudgetCap) : undefined,
          maxCustomerTurns: Number(maxCustomerTurns) || 8,
          maxFeedbackRounds: Number(intakeMaxRounds) || 2,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate intake link')
      }
      setGeneratedIntake({
        shareUrl: data.hostedUrl || data.shareUrl,
        embedUrl: data.embedUrl,
        iframeSnippet: data.iframeSnippet,
        projectId: data.projectId || null,
      })
      toast.success('Client Onboarding Interview link generated!')
      loadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create intake link')
    } finally {
      setCreatingIntake(false)
    }
  }

  const handleCreateContinuityLink = async () => {
    if (!selectedProjectId) {
      toast.error('Select a project first')
      return
    }
    setCreatingContinuity(true)
    try {
      const res = await fetch('/api/share/continuity/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          locale: continuityLocale,
          maxRounds: Number(continuityMaxRounds) || 2,
          clientGroupSlug: clientGroupSlug.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate Continuity Portal link')
      }
      setGeneratedContinuityUrl(data.url || data.shareUrl)
      toast.success('Continuity Upload & Approval Portal ready!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create Continuity link')
    } finally {
      setCreatingContinuity(false)
    }
  }

  const handlePromoteSubmission = async (submissionId: string) => {
    if (!selectedProjectId) return
    setPromotingId(submissionId)
    try {
      const res = await fetch('/api/share/continuity/manage/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          projectId: selectedProjectId,
          saveToReusableVault: true,
          clientGroupSlug: clientGroupSlug.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to promote photo')
      }
      toast.success('Photo promoted to Project Continuity & Client Reference Vault')
      loadProjectSubmissions(selectedProjectId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Promotion failed')
    } finally {
      setPromotingId(null)
    }
  }

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Enter a team member email')
      return
    }
    setInvitingMember(true)
    try {
      const res = await fetch('/api/workspace/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          accessAllProjects: inviteRole === 'admin' ? true : inviteAllProjects,
          monthlyCreditLimit: Number(inviteCreditLimit) > 0 ? Number(inviteCreditLimit) : null,
          projectIds: inviteProjectIds,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add team member')
      }
      setInviteEmail('')
      setInviteProjectIds([])
      toast.success('Team member access saved')
      loadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to invite member')
    } finally {
      setInvitingMember(false)
    }
  }

  const handleRevokeMember = async (memberId: string) => {
    try {
      const res = await fetch(`/api/workspace/members?memberId=${encodeURIComponent(memberId)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to revoke access')
      }
      toast.success('Team member access revoked')
      loadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke member')
    }
  }

  const toggleProjectAssignmentSelection = (projectId: string) => {
    setInviteProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-48 rounded-xl border border-gray-700/60 bg-gray-800/40 animate-pulse"
          />
        ))}
      </div>
    )
  }

  const addendumAccepted = Boolean(profile?.commercialAddendumAcceptedAt)

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-gray-900/90 to-indigo-950/40 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-300 border border-cyan-500/30 mb-2">
              <Briefcase className="w-3.5 h-3.5" />
              Video Service Provider & Team Studio
            </div>
            <h1 className="text-xl font-bold text-white">
              White-Label Client Portals & Universal Team Access
            </h1>
            <p className="text-sm text-gray-300 mt-1">
              Run a high-margin video production business (Memoirs, Real Estate, Education, Brand
              Stories) on your own website and payment checkout while automating intake, Continuity
              uploads, and round-capped client approvals.
            </p>
          </div>
          <Link href="/dashboard/projects">
            <Button variant="secondary" className="shrink-0 border border-gray-700">
              Open Client Triage →
            </Button>
          </Link>
        </div>
      </div>

      {/* SECTION 1: Commercial Addendum & White-Label Brand Profile */}
      <section className="rounded-xl border border-gray-700/60 bg-gray-800/60 p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                1. Commercial Producer Addendum & White-Label Brand
              </h2>
              <p className="text-xs text-gray-400">
                Required once before generating public or white-labeled Customer links.
              </p>
            </div>
          </div>
          {addendumAccepted ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-3 py-1 text-xs font-medium text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Addendum Active ({profile?.commercialAddendumVersion || 'v1'})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 px-3 py-1 text-xs font-medium text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5" />
              Acceptance Required
            </span>
          )}
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-900/70 p-4 text-xs text-gray-300 space-y-2">
          <p className="font-medium text-white">Zero End-Customer Privity & Biometric/Estate Shield</p>
          <p>
            You act as the sole Merchant of Record and contracting party for your End-Customers.
            SceneFlow AI LLC has zero contractual privity with your Customers, processes customer
            uploads in isolated quarantine without penalizing your account standing, and requires
            mandatory clickwrap media/likeness consent on every client portal. Live interactive
            consent is strictly required for any custom voice cloning.
          </p>
          <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={addendumChecked}
              onChange={(e) => setAddendumChecked(e.target.checked)}
              className="mt-0.5 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-gray-200">
              I accept the{' '}
              <Link
                href="/terms#commercial-producer-addendum"
                target="_blank"
                className="text-cyan-400 hover:underline"
              >
                Commercial Production Services & Zero-Privity Addendum (§5.1 & §12.2)
              </Link>{' '}
              and attest that I will secure valid client rights for all commercial deliverables.
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Studio / Brand Name (shown on all Client Portals)
            </label>
            <Input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g., Heritage Memoir Films"
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Brand Logo URL (HTTPS)
            </label>
            <Input
              value={brandLogoUrl}
              onChange={(e) => setBrandLogoUrl(e.target.value)}
              placeholder="https://yourstudio.com/logo.png"
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Support Email (for Customer Inquiries)
            </label>
            <Input
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="producer@yourstudio.com"
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Custom Client Terms / Refund Policy URL (Optional)
            </label>
            <Input
              value={customTermsUrl}
              onChange={(e) => setCustomTermsUrl(e.target.value)}
              placeholder="https://yourstudio.com/client-terms"
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Brand Accent Color & White-Label Mode
            </label>
            <div className="flex items-center gap-3">
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-32 bg-gray-900 border-gray-700 text-white"
              />
              <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideBranding}
                  onChange={(e) => setHideBranding(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-800 text-cyan-500"
                />
                Hide SceneFlow branding on Client links
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Default Client Revision Rounds
              </label>
              <Input
                type="number"
                min={1}
                max={10}
                value={defaultMaxRounds}
                onChange={(e) => setDefaultMaxRounds(Number(e.target.value))}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Public Widget Daily Credit Cap
              </label>
              <Input
                type="number"
                min={20}
                max={10000}
                value={dailyPublicCap}
                onChange={(e) => setDailyPublicCap(Number(e.target.value))}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="flex items-center gap-2"
          >
            <Palette className="w-4 h-4" />
            {savingProfile ? 'Saving…' : 'Save Brand Profile & Addendum'}
          </Button>
        </div>
      </section>

      {/* SECTION 2: Embeddable Client Onboarding Interview */}
      <section className="rounded-xl border border-gray-700/60 bg-gray-800/60 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              2. Embeddable Client Onboarding Interview (Blueprint Intake)
            </h2>
            <p className="text-xs text-gray-400">
              Voice + text conversational interviewer across 6 languages. Automatically creates a
              Draft Project Blueprint and Continuity checklist when the Customer submits.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Service Vertical</label>
            <select
              value={intakeVertical}
              onChange={(e) => setIntakeVertical(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
            >
              {VERTICAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Default Client Language
            </label>
            <select
              value={intakeLocale}
              onChange={(e) => setIntakeLocale(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
            >
              {LOCALE_OPTIONS.map((loc) => (
                <option key={loc.value} value={loc.value}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Token Mode</label>
            <select
              value={intakeMode}
              onChange={(e) =>
                setIntakeMode(e.target.value === 'public_lead' ? 'public_lead' : 'single_project')
              }
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
            >
              <option value="single_project">Paid Single-Project Order (Recommended)</option>
              <option value="public_lead">Public Website Lead-Capture Widget</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Customer / Order Label (Optional)
            </label>
            <Input
              value={customerLabel}
              onChange={(e) => setCustomerLabel(e.target.value)}
              placeholder="e.g., Robert & Margaret 50th Anniversary"
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Client Price ($ USD)
              </label>
              <Input
                type="number"
                min={0}
                value={clientPriceUsd}
                onChange={(e) => setClientPriceUsd(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Project Credit Cap
              </label>
              <Input
                type="number"
                min={0}
                value={creditBudgetCap}
                onChange={(e) => setCreditBudgetCap(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Max Interview Turns
              </label>
              <Input
                type="number"
                min={3}
                max={15}
                value={maxCustomerTurns}
                onChange={(e) => setMaxCustomerTurns(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Included Revisions
              </label>
              <Input
                type="number"
                min={1}
                max={10}
                value={intakeMaxRounds}
                onChange={(e) => setIntakeMaxRounds(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleCreateIntakeLink}
            disabled={creatingIntake}
            className="flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {creatingIntake ? 'Generating…' : 'Generate Client Intake Link & Embed Code'}
          </Button>
        </div>

        {generatedIntake && (
          <div className="rounded-lg border border-cyan-500/30 bg-gray-900/90 p-4 space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
                <span className="font-semibold text-cyan-300">Direct Client Intake URL</span>
                <div className="flex items-center gap-2">
                  <a
                    href={generatedIntake.shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
                  >
                    Preview <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('intake-url', generatedIntake.shareUrl)}
                    className="inline-flex items-center gap-1 rounded bg-gray-800 px-2 py-1 text-gray-200 hover:bg-gray-700"
                  >
                    {copiedKey === 'intake-url' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    Copy URL
                  </button>
                </div>
              </div>
              <code className="block truncate rounded bg-black/50 px-3 py-2 text-xs text-gray-200">
                {generatedIntake.shareUrl}
              </code>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
                <span className="font-semibold text-cyan-300">
                  Website Embed Snippet (Post-Checkout / Portal Page)
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard('intake-iframe', generatedIntake.iframeSnippet)}
                  className="inline-flex items-center gap-1 rounded bg-gray-800 px-2 py-1 text-gray-200 hover:bg-gray-700"
                >
                  {copiedKey === 'intake-iframe' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  Copy &lt;iframe&gt;
                </button>
              </div>
              <pre className="overflow-x-auto rounded bg-black/50 p-3 text-[11px] text-gray-300">
                {generatedIntake.iframeSnippet}
              </pre>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 3: Shared Continuity Upload Portal & Quarantine Promotion */}
      <section className="rounded-xl border border-gray-700/60 bg-gray-800/60 p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                3. Shared Continuity Library Portal & Quarantine Review
              </h2>
              <p className="text-xs text-gray-400">
                Invite Customers to upload personal/property/course photos into Blueprint slots
                (EXIF GPS auto-stripped) and promote verified photos into Continuity & Reusable
                Series Vaults.
              </p>
            </div>
          </div>
          {selectedProjectId && (
            <button
              type="button"
              onClick={() => loadProjectSubmissions(selectedProjectId)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-gray-300 hover:text-white"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Uploads
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-300 mb-1">Select Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
            >
              {projects.length === 0 ? (
                <option value="">No projects found</option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Reusable Client Vault Slug
            </label>
            <Input
              value={clientGroupSlug}
              onChange={(e) => setClientGroupSlug(e.target.value)}
              placeholder="e.g., smith-family"
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Locale</label>
              <select
                value={continuityLocale}
                onChange={(e) => setContinuityLocale(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-2 text-sm text-white"
              >
                {LOCALE_OPTIONS.map((loc) => (
                  <option key={loc.value} value={loc.value}>
                    {loc.value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Max Rounds</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={continuityMaxRounds}
                onChange={(e) => setContinuityMaxRounds(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleCreateContinuityLink}
            disabled={creatingContinuity || !selectedProjectId}
            className="flex items-center gap-2"
          >
            <ImageIcon className="w-4 h-4" />
            {creatingContinuity ? 'Generating…' : 'Generate Client Continuity Upload Link'}
          </Button>
        </div>

        {generatedContinuityUrl && (
          <div className="rounded-lg border border-purple-500/30 bg-gray-900/90 p-3 flex items-center justify-between gap-3">
            <code className="truncate text-xs text-purple-200">{generatedContinuityUrl}</code>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={generatedContinuityUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-purple-300 hover:underline"
              >
                Open <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={() => copyToClipboard('cont-url', generatedContinuityUrl)}
                className="inline-flex items-center gap-1 rounded bg-gray-800 px-2.5 py-1 text-xs text-gray-200 hover:bg-gray-700"
              >
                {copiedKey === 'cont-url' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                Copy
              </button>
            </div>
          </div>
        )}

        {/* Quarantine Staging Review List */}
        <div className="pt-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Customer Uploaded Photos in Quarantine ({submissions.length})
          </h3>
          {loadingSubmissions ? (
            <p className="text-xs text-gray-500">Loading customer uploads…</p>
          ) : submissions.length === 0 ? (
            <p className="text-xs text-gray-500">
              No customer photo uploads yet for this project.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-lg border border-gray-700 bg-gray-900/80 p-3 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sub.blob_url}
                      alt={sub.slot_label}
                      className="w-16 h-16 rounded-md object-cover border border-gray-700 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white truncate">
                        {sub.slot_label}
                      </div>
                      <div className="text-[11px] text-gray-400 capitalize">
                        Slot: {sub.slot_type} · {sub.exif_stripped ? 'EXIF GPS Stripped' : 'Staged'}
                      </div>
                      {sub.caption && (
                        <p className="text-[11px] text-gray-300 mt-1 line-clamp-2">{sub.caption}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-800">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        sub.quarantine_status === 'promoted'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : sub.quarantine_status === 'flagged'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-cyan-500/20 text-cyan-300'
                      }`}
                    >
                      {sub.quarantine_status}
                    </span>
                    {sub.quarantine_status !== 'promoted' && sub.quarantine_status !== 'flagged' && (
                      <button
                        type="button"
                        disabled={promotingId === sub.id}
                        onClick={() => handlePromoteSubmission(sub.id)}
                        className="rounded bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                      >
                        {promotingId === sub.id ? 'Promoting…' : 'Promote to Continuity'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 4: Universal Team Accounts (Admins & Customer Project Managers) */}
      <section className="rounded-xl border border-gray-700/60 bg-gray-800/60 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              4. Universal Team Access & Customer Project Managers
            </h2>
            <p className="text-xs text-gray-400">
              Assign Project Managers to specific Customer projects with monthly credit spend caps.
              Generation charges draw from your workspace pool while billing & BYOK settings stay
              owner-locked.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Team Member Email
            </label>
            <Input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="pm@yourstudio.com"
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Role</label>
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value === 'admin' ? 'admin' : 'project_manager')
              }
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
            >
              <option value="project_manager">Customer Project Manager</option>
              <option value="admin">Workspace Admin (All Projects)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Monthly Credit Limit
            </label>
            <Input
              type="number"
              min={0}
              value={inviteCreditLimit}
              onChange={(e) => setInviteCreditLimit(e.target.value)}
              placeholder="1500"
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
        </div>

        {inviteRole === 'project_manager' && (
          <div className="rounded-lg border border-gray-700 bg-gray-900/60 p-3 space-y-2">
            <label className="inline-flex items-center gap-2 text-xs text-gray-200 cursor-pointer">
              <input
                type="checkbox"
                checked={inviteAllProjects}
                onChange={(e) => setInviteAllProjects(e.target.checked)}
                className="rounded border-gray-600 bg-gray-800 text-cyan-500"
              />
              Grant access to all workspace projects
            </label>
            {!inviteAllProjects && projects.length > 0 && (
              <div className="pt-1">
                <p className="text-[11px] text-gray-400 mb-1.5">
                  Or select specific assigned projects:
                </p>
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                  {projects.map((p) => {
                    const checked = inviteProjectIds.includes(p.id)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleProjectAssignmentSelection(p.id)}
                        className={`rounded-full px-2.5 py-1 text-xs border transition-colors ${
                          checked
                            ? 'bg-indigo-500/25 border-indigo-400 text-indigo-200'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        {p.title}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleInviteMember}
            disabled={invitingMember}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {invitingMember ? 'Saving…' : 'Invite / Update Team Member'}
          </Button>
        </div>

        {members.length > 0 && (
          <div className="space-y-2 pt-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-700 bg-gray-900/80 px-4 py-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{m.memberEmail}</span>
                    <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[11px] text-indigo-300">
                      {m.role === 'admin' ? 'Admin' : 'Project Manager'}
                    </span>
                    <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[11px] text-gray-300 capitalize">
                      {m.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {m.accessAllProjects
                      ? 'All Projects'
                      : `${m.assignedProjectIds.length} assigned project(s)`}{' '}
                    · Credits this month: {m.creditsUsedMonth.toLocaleString()}
                    {m.monthlyCreditLimit ? ` / ${m.monthlyCreditLimit.toLocaleString()}` : ' (No cap)'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevokeMember(m.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-950/30 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-900/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
