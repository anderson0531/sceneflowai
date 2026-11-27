'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Check,
  Code2,
  Compass,
  ExternalLink,
  Eye,
  Home,
  Layers,
  Loader2,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { ProductPageHeader, ProductPageShell } from '@/components/product'
import { Button } from '@/components/ui/Button'
import {
  EXTRA_ACTIVE_LISTING_MONTHLY_CREDITS,
  buildPropertyTourUrls,
} from '@/lib/propertyTours/hostingPolicy'
import {
  COMPASS_DIRECTIONS,
  type PropertyTourDTO,
  type PropertyTourStatus,
} from '@/lib/propertyTours/types'

interface PropertyToursListResponse {
  tours: PropertyTourDTO[]
  activeCount: number
  includedSlots: number
  extraListingMonthlyCredits: number
  tierName: string
}

const STATUS_BADGE_STYLES: Record<PropertyTourStatus, { label: string; className: string }> = {
  published: {
    label: 'Published',
    className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  },
  draft: {
    label: 'Draft',
    className: 'border-slate-600/50 bg-slate-800/80 text-slate-300',
  },
  paused: {
    label: 'Paused',
    className: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  },
  archived: {
    label: 'Archived',
    className: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  },
}

function getTourCoverImage(tour: PropertyTourDTO): string | null {
  for (const room of tour.rooms || []) {
    const anchor = room.perspectives?.[room.anchorDirection]
    if (anchor?.variants?.[0]?.imageUrl) return anchor.variants[0].imageUrl
    if (anchor?.originalImageUrl) return anchor.originalImageUrl
    for (const dir of COMPASS_DIRECTIONS) {
      const p = room.perspectives?.[dir]
      if (p?.variants?.[0]?.imageUrl) return p.variants[0].imageUrl
      if (p?.originalImageUrl) return p.originalImageUrl
    }
  }
  return null
}

function formatPriceUsd(priceUsd?: number | null): string | null {
  if (priceUsd == null || !Number.isFinite(priceUsd) || priceUsd <= 0) return null
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(priceUsd)
}

export default function PropertyToursHubPage() {
  const router = useRouter()

  const [tours, setTours] = useState<PropertyTourDTO[]>([])
  const [activeCount, setActiveCount] = useState(0)
  const [includedSlots, setIncludedSlots] = useState(1)
  const [extraMonthlyCredits, setExtraMonthlyCredits] = useState(
    EXTRA_ACTIVE_LISTING_MONTHLY_CREDITS
  )
  const [tierName, setTierName] = useState('Explorer')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | PropertyTourStatus>('all')

  const [launchingDemo, setLaunchingDemo] = useState(false)
  const [copiedTourId, setCopiedTourId] = useState<string | null>(null)
  const [deletingTourId, setDeletingTourId] = useState<string | null>(null)

  // New Property Tour modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newBeds, setNewBeds] = useState('')
  const [newBaths, setNewBaths] = useState('')
  const [newSqft, setNewSqft] = useState('')

  const loadTours = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/property-tours', { cache: 'no-store' })
      const data = (await res.json().catch(() => ({}))) as Partial<PropertyToursListResponse> & {
        error?: string
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load property tours')
      }
      setTours(Array.isArray(data.tours) ? data.tours : [])
      setActiveCount(Number(data.activeCount ?? 0))
      setIncludedSlots(Number(data.includedSlots ?? 1))
      setExtraMonthlyCredits(
        Number(data.extraListingMonthlyCredits ?? EXTRA_ACTIVE_LISTING_MONTHLY_CREDITS)
      )
      if (data.tierName) {
        setTierName(data.tierName)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to fetch property tours'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTours()
  }, [loadTours])

  const handleLaunchDemo = async () => {
    setLaunchingDemo(true)
    try {
      const res = await fetch('/api/property-tours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Malibu Oceanfront Architectural Residence',
          propertyAddress: '21450 Pacific Coast Hwy, Malibu, CA 90265',
          propertySpecs: {
            priceUsd: 6850000,
            beds: 5,
            baths: 6,
            sqft: 5400,
            yearBuilt: 2021,
            propertyType: 'Single Family Residence',
          },
          seedDemo: true,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.tour?.id) {
        throw new Error(data?.error || 'Could not create demo property tour')
      }
      toast.success('Demo property tour launched! Opening N/E/S/W Blueprint Studio...')
      router.push(`/dashboard/property-tours/${data.tour.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to launch demo tour')
    } finally {
      setLaunchingDemo(false)
    }
  }

  const handleCreateTour = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) {
      toast.error('Please enter a property title.')
      return
    }
    setCreating(true)
    try {
      const parseNum = (raw: string) => {
        const cleaned = raw.replace(/[^0-9.]/g, '')
        if (!cleaned) return undefined
        const n = Number(cleaned)
        return Number.isFinite(n) && n > 0 ? n : undefined
      }

      const res = await fetch('/api/property-tours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          propertyAddress: newAddress.trim() || undefined,
          propertySpecs: {
            priceUsd: parseNum(newPrice),
            beds: parseNum(newBeds),
            baths: parseNum(newBaths),
            sqft: parseNum(newSqft),
          },
          seedDemo: false,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.tour?.id) {
        throw new Error(data?.error || 'Failed to create property tour')
      }
      toast.success('Property tour created!')
      setCreateModalOpen(false)
      setNewTitle('')
      setNewAddress('')
      setNewPrice('')
      setNewBeds('')
      setNewBaths('')
      setNewSqft('')
      router.push(`/dashboard/property-tours/${data.tour.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create property tour')
    } finally {
      setCreating(false)
    }
  }

  const handleCopyEmbedCode = async (tour: PropertyTourDTO) => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sceneflowai.studio'
      const { iframeCode } = buildPropertyTourUrls(tour.slug, origin)
      await navigator.clipboard.writeText(iframeCode)
      setCopiedTourId(tour.id)
      toast.success('Responsive embed <iframe> copied to clipboard!')
      setTimeout(() => {
        setCopiedTourId((curr) => (curr === tour.id ? null : curr))
      }, 2200)
    } catch {
      toast.error('Failed to copy embed code.')
    }
  }

  const handleDeleteTour = async (tour: PropertyTourDTO) => {
    const confirmed = window.confirm(
      `Delete "${tour.title}"? This removes the tour, its room blueprint, and associated buyer leads.`
    )
    if (!confirmed) return

    setDeletingTourId(tour.id)
    try {
      const res = await fetch(`/api/property-tours/${encodeURIComponent(tour.id)}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to delete property tour')
      }
      setTours((prev) => prev.filter((t) => t.id !== tour.id))
      if (tour.status === 'published') {
        setActiveCount((c) => Math.max(0, c - 1))
      }
      toast.success('Property tour deleted.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to delete tour')
    } finally {
      setDeletingTourId(null)
    }
  }

  const filteredTours = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return tours.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (!q) return true
      return (
        t.title.toLowerCase().includes(q) ||
        (t.propertyAddress || '').toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q)
      )
    })
  }, [tours, searchQuery, statusFilter])

  const totalViews = useMemo(
    () => tours.reduce((sum, t) => sum + (t.viewCount || 0), 0),
    [tours]
  )
  const totalLeads = useMemo(
    () => tours.reduce((sum, t) => sum + (t.leadCount || 0), 0),
    [tours]
  )
  const totalGenCredits = useMemo(
    () => tours.reduce((sum, t) => sum + (t.totalGenerationCredits || 0), 0),
    [tours]
  )

  const extraActiveCount = Math.max(0, activeCount - includedSlots)
  const quotaPct =
    includedSlots > 0 ? Math.min(100, Math.round((activeCount / includedSlots) * 100)) : 100
  const extraPriceUsd = ((extraMonthlyCredits || 150) * 0.01).toFixed(2)

  return (
    <ProductPageShell>
      <ProductPageHeader
        icon={<Compass className="h-6 w-6" />}
        eyebrow="White-Label Real Estate Studio"
        title="Interactive Property Tours"
        subtitle="Create white-label, embeddable N/E/S/W property blueprints with cross-angle locked AI staging, interactive Before/After sliders, and built-in lead capture."
        secondaryActions={
          <Button
            type="button"
            variant="secondary"
            onClick={handleLaunchDemo}
            disabled={launchingDemo}
            className="gap-2 border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
          >
            {launchingDemo ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4 text-cyan-400" />
            )}
            Launch Demo Property Tour
          </Button>
        }
        primaryAction={
          <Button
            type="button"
            variant="primary"
            onClick={() => setCreateModalOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Property Tour
          </Button>
        }
      />

      {/* Active Listings Hosting Quota Bar */}
      <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900/70 p-5 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-white">
                Active Listings Hosting Quota
              </span>
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-medium capitalize text-cyan-300">
                {tierName} Plan
              </span>
              {extraActiveCount > 0 && (
                <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                  +{extraActiveCount} Extra Active Listing{extraActiveCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              <strong className="text-white">
                {activeCount} / {includedSlots >= 9999 ? 'Unlimited' : includedSlots}
              </strong>{' '}
              included in your plan ·{' '}
              <span className="text-gray-300">
                {extraMonthlyCredits} credits (${extraPriceUsd})/mo per additional active listing
              </span>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-gray-800 pt-3 lg:border-t-0 lg:pt-0">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-500">Total Views</p>
              <p className="text-lg font-bold text-white">{totalViews.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-500">Buyer Leads</p>
              <p className="text-lg font-bold text-emerald-400">{totalLeads.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-500">Gen Credits</p>
              <p className="text-lg font-bold text-cyan-400">{totalGenCredits.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Quota Progress Bar */}
        {includedSlots < 9999 && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                extraActiveCount > 0
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                  : 'bg-gradient-to-r from-cyan-500 to-indigo-500'
              }`}
              style={{ width: `${Math.max(activeCount > 0 ? 6 : 0, quotaPct)}%` }}
            />
          </div>
        )}
      </section>

      {/* Filter & Search Toolbar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search listings by title, address, or slug..."
            aria-label="Search property tours"
            className="w-full rounded-xl border border-gray-800 bg-gray-900 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', 'published', 'draft', 'paused'] as const).map((status) => {
            const active = statusFilter === status
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  active
                    ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                    : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700 hover:text-white'
                }`}
              >
                {status}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tours Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/70"
            >
              <div className="aspect-video animate-pulse bg-gray-800" />
              <div className="p-5 space-y-3">
                <div className="h-5 w-3/4 animate-pulse rounded bg-gray-800" />
                <div className="h-3.5 w-1/2 animate-pulse rounded bg-gray-800" />
                <div className="h-9 w-full animate-pulse rounded-lg bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
          <p className="text-sm font-medium text-rose-200">{error}</p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void loadTours()}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      ) : filteredTours.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/40 p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
            <Building2 className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold text-white">
            {tours.length === 0 ? 'No Property Tours Yet' : 'No Matching Listings'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
            {tours.length === 0
              ? 'Launch our pre-seeded interactive Malibu demo to test N/E/S/W compass navigation & Before/After staging immediately, or start a fresh brokerage listing.'
              : 'Try clearing your search filter or status filter to see all listings.'}
          </p>
          {tours.length === 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleLaunchDemo}
                disabled={launchingDemo}
                className="gap-2 border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
              >
                {launchingDemo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                )}
                Launch Demo Property Tour
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => setCreateModalOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                New Property Tour
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTours.map((tour) => {
            const cover = getTourCoverImage(tour)
            const badge = STATUS_BADGE_STYLES[tour.status] ?? STATUS_BADGE_STYLES.draft
            const priceText = formatPriceUsd(tour.propertySpecs?.priceUsd)
            const liveHref =
              tour.status === 'published'
                ? `/tour/${encodeURIComponent(tour.slug)}`
                : `/tour/${encodeURIComponent(tour.slug)}?preview=1`
            const isCopied = copiedTourId === tour.id

            return (
              <article
                key={tour.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/75 transition-all hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-950/30"
              >
                {/* Cover Image */}
                <Link
                  href={`/dashboard/property-tours/${tour.id}`}
                  className="relative aspect-video w-full overflow-hidden bg-gray-950 block"
                >
                  {cover ? (
                    <img
                      src={cover}
                      alt={tour.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-gray-950 to-slate-900 text-gray-600">
                      <Home className="h-9 w-9 mb-1.5" />
                      <span className="text-xs">Upload N/E/S/W Photos</span>
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

                  <div className="absolute left-3 top-3 flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    {tour.branding?.hideSceneFlowBranding && (
                      <span className="rounded-full border border-purple-400/30 bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-200 backdrop-blur-md">
                        White-Label
                      </span>
                    )}
                  </div>

                  {priceText && (
                    <div className="absolute bottom-3 left-3 rounded-lg bg-black/70 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md">
                      {priceText}
                    </div>
                  )}
                </Link>

                {/* Card Content */}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/property-tours/${tour.id}`}
                        className="block truncate text-base font-bold text-white hover:text-cyan-300 transition-colors"
                      >
                        {tour.title}
                      </Link>
                      {tour.propertyAddress ? (
                        <p className="mt-1 flex items-center gap-1 truncate text-xs text-gray-400">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                          <span className="truncate">{tour.propertyAddress}</span>
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-gray-500">No address added yet</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteTour(tour)}
                      disabled={deletingTourId === tour.id}
                      aria-label={`Delete ${tour.title}`}
                      className="rounded-lg p-1.5 text-gray-500 hover:bg-rose-500/15 hover:text-rose-400 transition-colors"
                    >
                      {deletingTourId === tour.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Stats Grid */}
                  <div className="mt-4 grid grid-cols-4 gap-2 rounded-xl border border-gray-800 bg-gray-950/70 p-2.5 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-xs font-bold text-white">
                        <Layers className="h-3 w-3 text-cyan-400" />
                        {tour.rooms?.length ?? 0}
                      </div>
                      <p className="text-[10px] text-gray-500">Rooms</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-xs font-bold text-white">
                        <Eye className="h-3 w-3 text-indigo-400" />
                        {tour.viewCount ?? 0}
                      </div>
                      <p className="text-[10px] text-gray-500">Views</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-xs font-bold text-emerald-400">
                        <Users className="h-3 w-3" />
                        {tour.leadCount ?? 0}
                      </div>
                      <p className="text-[10px] text-gray-500">Leads</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-xs font-bold text-amber-300">
                        <Zap className="h-3 w-3" />
                        {tour.totalGenerationCredits ?? 0}
                      </div>
                      <p className="text-[10px] text-gray-500">Credits</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex flex-col gap-2 pt-1">
                    <Link
                      href={`/dashboard/property-tours/${tour.id}`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md hover:from-cyan-500 hover:to-indigo-500 transition-all"
                    >
                      <Compass className="h-3.5 w-3.5" />
                      Open Studio Builder
                    </Link>

                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={liveHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-700 bg-gray-800/80 px-2.5 py-2 text-xs font-medium text-gray-200 hover:border-gray-600 hover:bg-gray-800 hover:text-white transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
                        View Live Player
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleCopyEmbedCode(tour)}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-700 bg-gray-800/80 px-2.5 py-2 text-xs font-medium text-gray-200 hover:border-gray-600 hover:bg-gray-800 hover:text-white transition-colors"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Code2 className="h-3.5 w-3.5 text-purple-400" />
                            Copy Embed Code
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Create New Property Tour Modal */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => !creating && setCreateModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-property-tour-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-950 p-6 text-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-800 pb-4">
              <div>
                <h2 id="new-property-tour-title" className="text-lg font-bold text-white">
                  New Property Tour
                </h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  Start a white-label N/E/S/W property blueprint. You can upload smartphone photos
                  and generate cross-angle variants in the Studio Builder.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                aria-label="Close new property tour dialog"
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTour} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="new-tour-title"
                  className="mb-1 block text-xs font-medium text-gray-300"
                >
                  Listing Title *
                </label>
                <input
                  id="new-tour-title"
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Sunset Hills Modern Estate"
                  className="w-full rounded-xl border border-gray-800 bg-gray-900 px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="new-tour-address"
                  className="mb-1 block text-xs font-medium text-gray-300"
                >
                  Property Address
                </label>
                <input
                  id="new-tour-address"
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g., 1420 Ocean View Dr, Santa Barbara, CA 93108"
                  className="w-full rounded-xl border border-gray-800 bg-gray-900 px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="new-tour-price"
                    className="mb-1 block text-xs font-medium text-gray-300"
                  >
                    Asking Price (USD)
                  </label>
                  <input
                    id="new-tour-price"
                    type="number"
                    min={0}
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="2450000"
                    className="w-full rounded-xl border border-gray-800 bg-gray-900 px-3.5 py-2 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-tour-sqft"
                    className="mb-1 block text-xs font-medium text-gray-300"
                  >
                    Square Feet
                  </label>
                  <input
                    id="new-tour-sqft"
                    type="number"
                    min={0}
                    value={newSqft}
                    onChange={(e) => setNewSqft(e.target.value)}
                    placeholder="3850"
                    className="w-full rounded-xl border border-gray-800 bg-gray-900 px-3.5 py-2 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="new-tour-beds"
                    className="mb-1 block text-xs font-medium text-gray-300"
                  >
                    Bedrooms
                  </label>
                  <input
                    id="new-tour-beds"
                    type="number"
                    min={0}
                    step="1"
                    value={newBeds}
                    onChange={(e) => setNewBeds(e.target.value)}
                    placeholder="4"
                    className="w-full rounded-xl border border-gray-800 bg-gray-900 px-3.5 py-2 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-tour-baths"
                    className="mb-1 block text-xs font-medium text-gray-300"
                  >
                    Bathrooms
                  </label>
                  <input
                    id="new-tour-baths"
                    type="number"
                    min={0}
                    step="0.5"
                    value={newBaths}
                    onChange={(e) => setNewBaths(e.target.value)}
                    placeholder="4.5"
                    className="w-full rounded-xl border border-gray-800 bg-gray-900 px-3.5 py-2 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={creating} className="gap-2">
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create & Open Studio
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProductPageShell>
  )
}
