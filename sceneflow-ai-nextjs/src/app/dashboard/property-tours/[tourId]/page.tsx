'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  AlertTriangle,
  Anchor,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Code2,
  Compass,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  Image as ImageIcon,
  Layers,
  Loader2,
  Mail,
  Moon,
  Palette,
  PauseCircle,
  Phone,
  Play,
  Plus,
  Save,
  Share2,
  Sparkles,
  Sun,
  Sunset,
  Trash2,
  Upload,
  Users,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { InteractivePropertyPlayer } from '@/components/property-tours/InteractivePropertyPlayer'
import { Button } from '@/components/ui/Button'
import { useLiveRateCard } from '@/hooks/useLiveRateCard'
import {
  GEMINI_PRO_STILL_MODEL_ID,
  quoteGenerationCredits,
} from '@/lib/credits/quoteGenerationCredits'
import {
  EXTRA_ACTIVE_LISTING_MONTHLY_CREDITS,
  buildPropertyTourUrls,
} from '@/lib/propertyTours/hostingPolicy'
import {
  COMPASS_DIRECTIONS,
  PROPERTY_LIFESTYLE_PRESETS,
  PROPERTY_LIGHTING_PRESETS,
  PROPERTY_ROOM_TYPE_LABELS,
  PROPERTY_STYLE_PRESETS,
  createDefaultRoom,
  type CompassDirection,
  type PropertyBranding,
  type PropertyLifestyleId,
  type PropertyLightingId,
  type PropertyRoom,
  type PropertyRoomType,
  type PropertySpecs,
  type PropertyStyleId,
  type PropertyTourDTO,
  type PropertyTourStatus,
} from '@/lib/propertyTours/types'

type StudioTab = 'rooms' | 'preview' | 'branding' | 'leads'

interface PropertyTourLeadRecord {
  id: string
  buyer_name?: string
  buyerName?: string
  buyer_email?: string
  buyerEmail?: string
  buyer_phone?: string | null
  buyerPhone?: string | null
  inquiry_type?: string
  inquiryType?: string
  selected_room_name?: string | null
  selectedRoomName?: string | null
  selected_style?: string | null
  selectedStyle?: string | null
  message?: string | null
  created_at?: string
  createdAt?: string
}

interface HostingEventRecord {
  id?: string
  billing_month?: string
  billingMonth?: string
  event_type?: string
  eventType?: string
  credits_charged?: number
  creditsCharged?: number
  status?: string
  created_at?: string
  createdAt?: string
}

interface TourDetailResponse {
  tour: PropertyTourDTO
  leads?: PropertyTourLeadRecord[]
  hostingEvents?: HostingEventRecord[]
  activeCount?: number
  includedSlots?: number
  error?: string
}

const COMPASS_TITLES: Record<CompassDirection, string> = {
  N: 'North',
  E: 'East',
  S: 'South',
  W: 'West',
}

const BRAND_COLOR_SWATCHES = [
  { name: 'Coastal Cyan', hex: '#06b6d4' },
  { name: 'Champagne Gold', hex: '#d97706' },
  { name: 'Estate Emerald', hex: '#10b981' },
  { name: 'Architectural Indigo', hex: '#6366f1' },
  { name: 'Warm Terracotta', hex: '#ea580c' },
  { name: 'Noir Rose', hex: '#e11d48' },
]

const STATUS_BADGE: Record<PropertyTourStatus, { label: string; className: string }> = {
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

const INQUIRY_LABELS: Record<string, { label: string; className: string }> = {
  schedule_showing: {
    label: 'Schedule Showing',
    className: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-300',
  },
  renovation_quote: {
    label: 'Renovation Quote',
    className: 'border-purple-500/30 bg-purple-500/15 text-purple-300',
  },
  financing_info: {
    label: 'Financing Info',
    className: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  },
  general: {
    label: 'General Inquiry',
    className: 'border-slate-600/40 bg-slate-800 text-slate-300',
  },
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatCompactUsd(amount?: number | null): string | null {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return null
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}k`
  return `$${Math.round(amount)}`
}

export default function PropertyTourStudioBuilderPage() {
  const params = useParams<{ tourId: string }>()
  const tourId = typeof params?.tourId === 'string' ? params.tourId : ''

  const { rateCard, isLive: isRateCardLive } = useLiveRateCard()

  const [tour, setTour] = useState<PropertyTourDTO | null>(null)
  const [leads, setLeads] = useState<PropertyTourLeadRecord[]>([])
  const [hostingEvents, setHostingEvents] = useState<HostingEventRecord[]>([])
  const [activeCount, setActiveCount] = useState(0)
  const [includedSlots, setIncludedSlots] = useState(1)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<StudioTab>('rooms')

  // Top bar actions
  const [togglingPublish, setTogglingPublish] = useState(false)
  const [publishCreditError, setPublishCreditError] = useState<string | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [copiedField, setCopiedField] = useState<'share' | 'embed' | 'iframe' | null>(null)

  // Rooms & N/E/S/W generator state
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [addRoomOpen, setAddRoomOpen] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomType, setNewRoomType] = useState<PropertyRoomType>('living')
  const [newRoomEstUsd, setNewRoomEstUsd] = useState('')
  const [newRoomDesc, setNewRoomDesc] = useState('')
  const [savingRoom, setSavingRoom] = useState(false)

  const [selectedDirections, setSelectedDirections] = useState<CompassDirection[]>([
    'N',
    'E',
    'S',
    'W',
  ])
  const [genStyle, setGenStyle] = useState<PropertyStyleId>('modern_coastal')
  const [genLighting, setGenLighting] = useState<PropertyLightingId>('daylight')
  const [genLifestyle, setGenLifestyle] = useState<PropertyLifestyleId>('architectural')
  const [customInstructions, setCustomInstructions] = useState('')
  const [generating, setGenerating] = useState(false)
  const [uploadingDir, setUploadingDir] = useState<CompassDirection | null>(null)
  const [cardPreviewMode, setCardPreviewMode] = useState<
    Record<CompassDirection, 'variant' | 'original'>
  >({
    N: 'variant',
    E: 'variant',
    S: 'variant',
    W: 'variant',
  })

  // Branding & Listing form state
  const [formTitle, setFormTitle] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formSpecs, setFormSpecs] = useState<PropertySpecs>({})
  const [formBranding, setFormBranding] = useState<PropertyBranding>({})
  const [formStyles, setFormStyles] = useState<PropertyStyleId[]>([])
  const [formLighting, setFormLighting] = useState<PropertyLightingId[]>([])
  const [formLifestyles, setFormLifestyles] = useState<PropertyLifestyleId[]>([])
  const [savingBranding, setSavingBranding] = useState(false)

  const fileInputRefs = useRef<Record<CompassDirection, HTMLInputElement | null>>({
    N: null,
    E: null,
    S: null,
    W: null,
  })

  const hydrateFormsFromTour = useCallback((t: PropertyTourDTO) => {
    setFormTitle(t.title || '')
    setFormAddress(t.propertyAddress || '')
    setFormSpecs({ ...(t.propertySpecs || {}) })
    setFormBranding({ ...(t.branding || {}) })
    setFormStyles([...(t.availableStyles || ['as_is', 'modern_coastal', 'chefs_remodel'])])
    setFormLighting([...(t.availableLighting || ['daylight', 'golden_hour', 'twilight'])])
    setFormLifestyles([...(t.availableLifestyles || ['architectural', 'quiet_morning', 'entertaining'])])
  }, [])

  const loadTourDetail = useCallback(async () => {
    if (!tourId) return
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(`/api/property-tours/${encodeURIComponent(tourId)}`, {
        cache: 'no-store',
      })
      const data = (await res.json().catch(() => ({}))) as TourDetailResponse
      if (!res.ok || !data?.tour) {
        throw new Error(data?.error || 'Could not load property tour')
      }
      setTour(data.tour)
      setLeads(Array.isArray(data.leads) ? data.leads : [])
      setHostingEvents(Array.isArray(data.hostingEvents) ? data.hostingEvents : [])
      setActiveCount(Number(data.activeCount ?? 0))
      setIncludedSlots(Number(data.includedSlots ?? 1))
      hydrateFormsFromTour(data.tour)

      setSelectedRoomId((prev) => {
        if (prev && data.tour.rooms?.some((r) => r.id === prev)) return prev
        return data.tour.defaultRoomId || data.tour.rooms?.[0]?.id || ''
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load property tour'
      setLoadError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [tourId, hydrateFormsFromTour])

  useEffect(() => {
    void loadTourDetail()
  }, [loadTourDetail])

  const sortedRooms = useMemo(
    () => [...(tour?.rooms || [])].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
    [tour?.rooms]
  )

  const activeRoom = useMemo(
    () => sortedRooms.find((r) => r.id === selectedRoomId) ?? sortedRooms[0] ?? null,
    [sortedRooms, selectedRoomId]
  )

  // Live Rate Card credit estimate (Pro 2K × selected directions)
  const perPlateQuote = useMemo(
    () =>
      quoteGenerationCredits({
        kind: 'still',
        model: GEMINI_PRO_STILL_MODEL_ID,
        resolution: '2k',
        rateCard,
        floorCredits: 30,
      }),
    [rateCard]
  )

  const estimatedCredits = perPlateQuote.credits * selectedDirections.length

  const wouldBeOverQuota = useMemo(() => {
    if (!tour) return false
    if (tour.status === 'published') return activeCount > includedSlots
    return activeCount + 1 > includedSlots
  }, [tour, activeCount, includedSlots])

  const handleTogglePublish = async () => {
    if (!tour) return
    const nextStatus: PropertyTourStatus = tour.status === 'published' ? 'paused' : 'published'
    setTogglingPublish(true)
    setPublishCreditError(null)
    try {
      const res = await fetch(`/api/property-tours/${encodeURIComponent(tour.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 402) {
        const msg =
          data?.message ||
          data?.error ||
          `Insufficient credits to publish an extra active listing (${EXTRA_ACTIVE_LISTING_MONTHLY_CREDITS} credits/mo required). Add credits or pause another listing.`
        setPublishCreditError(msg)
        toast.error(msg)
        return
      }
      if (!res.ok || !data?.tour) {
        throw new Error(data?.error || 'Could not update listing status')
      }
      const updated = data.tour as PropertyTourDTO
      setTour(updated)
      setActiveCount((prev) => {
        if (tour.status !== 'published' && updated.status === 'published') return prev + 1
        if (tour.status === 'published' && updated.status !== 'published') return Math.max(0, prev - 1)
        return prev
      })
      if (updated.status === 'published') {
        const billed = Number(data.hostingBilledCredits || 0)
        toast.success(
          billed > 0
            ? `Listing published! ${billed} credits billed for extra active hosting slot.`
            : 'Listing published and live at your white-label tour URL!'
        )
      } else {
        toast.success('Listing paused. Public viewers will see a paused message until republished.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Status update failed')
    } finally {
      setTogglingPublish(false)
    }
  }

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tour || !newRoomName.trim()) {
      toast.error('Please enter a room name.')
      return
    }
    setSavingRoom(true)
    try {
      const estNum = Number(newRoomEstUsd.replace(/[^0-9.]/g, ''))
      const roomId = `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
      const newRoom = createDefaultRoom({
        id: roomId,
        name: newRoomName.trim(),
        roomType: newRoomType,
        orderIndex: sortedRooms.length,
        description: newRoomDesc.trim() || undefined,
        renovationEstimateUsd: Number.isFinite(estNum) && estNum > 0 ? Math.round(estNum) : null,
      })

      const nextRooms = [...sortedRooms, newRoom]
      const res = await fetch(`/api/property-tours/${encodeURIComponent(tour.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rooms: nextRooms,
          defaultRoomId: tour.defaultRoomId || newRoom.id,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.tour) {
        throw new Error(data?.error || 'Could not add room')
      }
      setTour(data.tour as PropertyTourDTO)
      setSelectedRoomId(newRoom.id)
      setAddRoomOpen(false)
      setNewRoomName('')
      setNewRoomEstUsd('')
      setNewRoomDesc('')
      toast.success(`Added "${newRoom.name}" with N/E/S/W camera slots!`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add room')
    } finally {
      setSavingRoom(false)
    }
  }

  const handleDeleteRoom = async (room: PropertyRoom) => {
    if (!tour) return
    if (sortedRooms.length <= 1) {
      toast.error('A property tour needs at least one room.')
      return
    }
    const confirmed = window.confirm(`Remove "${room.name}" and its N/E/S/W perspectives?`)
    if (!confirmed) return

    const nextRooms = sortedRooms
      .filter((r) => r.id !== room.id)
      .map((r, idx) => ({ ...r, orderIndex: idx }))
    const nextDefault =
      tour.defaultRoomId === room.id ? nextRooms[0]?.id ?? null : tour.defaultRoomId

    try {
      const res = await fetch(`/api/property-tours/${encodeURIComponent(tour.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rooms: nextRooms, defaultRoomId: nextDefault }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.tour) {
        throw new Error(data?.error || 'Could not remove room')
      }
      setTour(data.tour as PropertyTourDTO)
      if (selectedRoomId === room.id) {
        setSelectedRoomId(nextRooms[0]?.id || '')
      }
      toast.success(`Removed "${room.name}".`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove room')
    }
  }

  const handleUploadPhoto = async (direction: CompassDirection, file: File) => {
    if (!tour || !activeRoom) return
    setUploadingDir(direction)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('roomId', activeRoom.id)
      fd.append('direction', direction)

      const res = await fetch(`/api/property-tours/${encodeURIComponent(tour.id)}/upload-photo`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.tour) {
        throw new Error(data?.error || 'Photo upload failed')
      }
      setTour(data.tour as PropertyTourDTO)
      setCardPreviewMode((prev) => ({ ...prev, [direction]: 'original' }))
      toast.success(`Uploaded ${COMPASS_TITLES[direction]} smartphone photo!`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingDir(null)
    }
  }

  const handlePerspectiveLabelBlur = async (direction: CompassDirection, label: string) => {
    if (!tour || !activeRoom) return
    const trimmed = label.trim()
    const currentLabel = activeRoom.perspectives?.[direction]?.label || ''
    if (trimmed === currentLabel) return

    const nextRooms = sortedRooms.map((r) => {
      if (r.id !== activeRoom.id) return r
      return {
        ...r,
        perspectives: {
          ...r.perspectives,
          [direction]: {
            ...r.perspectives[direction],
            label: trimmed || `${COMPASS_TITLES[direction]} View`,
          },
        },
      }
    })

    try {
      const res = await fetch(`/api/property-tours/${encodeURIComponent(tour.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rooms: nextRooms }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.tour) {
        setTour(data.tour as PropertyTourDTO)
      }
    } catch {
      // Non-fatal inline label save
    }
  }

  const toggleDirectionSelection = (dir: CompassDirection) => {
    setSelectedDirections((prev) => {
      if (prev.includes(dir)) {
        if (prev.length === 1) return prev
        return prev.filter((d) => d !== dir)
      }
      return COMPASS_DIRECTIONS.filter((d) => prev.includes(d) || d === dir)
    })
  }

  const handleGenerateRoom = async () => {
    if (!tour || !activeRoom) return
    if (selectedDirections.length === 0) {
      toast.error('Select at least one compass wall (N, E, S, or W) to generate.')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch(`/api/property-tours/${encodeURIComponent(tour.id)}/generate-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: activeRoom.id,
          style: genStyle,
          lighting: genLighting,
          lifestyle: genLifestyle,
          directions: selectedDirections,
          customInstructions: customInstructions.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.tour) {
        throw new Error(data?.error || 'Generation failed')
      }
      setTour(data.tour as PropertyTourDTO)
      const generatedDirs = Array.isArray(data.generatedDirections)
        ? (data.generatedDirections as CompassDirection[])
        : selectedDirections
      const charged = Number(data.totalCreditsCharged ?? 0)

      setCardPreviewMode((prev) => {
        const next = { ...prev }
        generatedDirs.forEach((d) => {
          next[d] = 'variant'
        })
        return next
      })

      if (Array.isArray(data.errors) && data.errors.length > 0) {
        toast.warning(
          `Generated ${generatedDirs.join(', ')} (${charged} credits), with ${data.errors.length} issue(s): ${data.errors[0]}`
        )
      } else {
        toast.success(
          `Generated ${generatedDirs.join(' · ')} cross-angle locked plates (${charged} credits)!`
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate room perspectives')
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveBrandingAndSpecs = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tour) return
    setSavingBranding(true)
    try {
      const res = await fetch(`/api/property-tours/${encodeURIComponent(tour.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim() || tour.title,
          propertyAddress: formAddress.trim() || null,
          propertySpecs: formSpecs,
          branding: formBranding,
          availableStyles: formStyles.length > 0 ? formStyles : ['as_is', 'modern_coastal'],
          availableLighting: formLighting.length > 0 ? formLighting : ['daylight', 'twilight'],
          availableLifestyles:
            formLifestyles.length > 0 ? formLifestyles : ['architectural', 'entertaining'],
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.tour) {
        throw new Error(data?.error || 'Could not save branding & listing details')
      }
      const updated = data.tour as PropertyTourDTO
      setTour(updated)
      hydrateFormsFromTour(updated)
      toast.success('White-label branding & listing settings saved!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSavingBranding(false)
    }
  }

  const shareUrls = useMemo(() => {
    if (!tour) return { shareUrl: '', embedUrl: '', iframeCode: '' }
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://sceneflowai.studio'
    return buildPropertyTourUrls(tour.slug, origin)
  }, [tour])

  const copyShareText = async (field: 'share' | 'embed' | 'iframe', value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      toast.success(
        field === 'iframe'
          ? 'Responsive <iframe> snippet copied!'
          : field === 'embed'
            ? 'Embed URL copied!'
            : 'Share URL copied!'
      )
      setTimeout(() => {
        setCopiedField((curr) => (curr === field ? null : curr))
      }, 2000)
    } catch {
      toast.error('Unable to copy to clipboard.')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white p-6">
        <Compass className="h-10 w-10 animate-spin text-cyan-400" />
        <p className="mt-3 text-sm text-gray-400">Loading N/E/S/W Property Blueprint Studio...</p>
      </div>
    )
  }

  if (!tour) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white p-6 text-center">
        <Building2 className="h-10 w-10 text-gray-600 mb-3" />
        <h1 className="text-lg font-bold">Property Tour Not Found</h1>
        <p className="mt-1 text-sm text-gray-400">{loadError || 'Unable to load this listing.'}</p>
        <Link
          href="/dashboard/property-tours"
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Property Tours
        </Link>
      </div>
    )
  }

  const statusMeta = STATUS_BADGE[tour.status] ?? STATUS_BADGE.draft
  const conversionRate =
    tour.viewCount > 0 ? `${((leads.length / tour.viewCount) * 100).toFixed(1)}%` : '0.0%'

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Studio Top Bar */}
      <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard/property-tours"
              aria-label="Back to Property Tours"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-800 bg-gray-900 text-gray-300 hover:border-gray-700 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-base font-bold text-white md:text-lg">
                  {tour.title}
                </h1>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusMeta.className}`}
                >
                  {statusMeta.label}
                </span>
              </div>
              <p className="truncate text-xs text-gray-400">
                {tour.propertyAddress || `/tour/${tour.slug}`} · Active Slots:{' '}
                <span className="text-gray-200">
                  {activeCount}/{includedSlots >= 9999 ? '∞' : includedSlots}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/tour/${encodeURIComponent(tour.slug)}?preview=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-xs font-semibold text-gray-200 hover:border-gray-700 hover:text-white transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
              Preview Live Player
            </Link>

            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-xs font-semibold text-gray-200 hover:border-gray-700 hover:text-white transition-colors"
            >
              <Share2 className="h-3.5 w-3.5 text-purple-400" />
              Share & Embed
            </button>

            <button
              type="button"
              onClick={() => void handleTogglePublish()}
              disabled={togglingPublish}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-md transition-all disabled:opacity-60 ${
                tour.status === 'published'
                  ? 'border border-amber-500/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                  : 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:from-emerald-500 hover:to-cyan-500'
              }`}
            >
              {togglingPublish ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : tour.status === 'published' ? (
                <PauseCircle className="h-3.5 w-3.5" />
              ) : (
                <Globe className="h-3.5 w-3.5" />
              )}
              <span>
                {tour.status === 'published'
                  ? 'Pause Listing'
                  : wouldBeOverQuota
                    ? `Publish Listing (${EXTRA_ACTIVE_LISTING_MONTHLY_CREDITS} cr/mo)`
                    : 'Publish Listing'}
              </span>
            </button>
          </div>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <nav
            aria-label="Property Blueprint Studio Sections"
            className="flex items-center gap-1 overflow-x-auto"
          >
            {(
              [
                { id: 'rooms', label: 'Rooms & N/E/S/W Generator', icon: Compass },
                { id: 'preview', label: 'Interactive Player Preview', icon: Play },
                { id: 'branding', label: 'White-Label Branding & Listing Info', icon: Palette },
                {
                  id: 'leads',
                  label: `Buyer Leads & Analytics (${leads.length})`,
                  icon: Users,
                },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors sm:text-sm ${
                    isActive
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-gray-400 hover:border-gray-700 hover:text-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Main Studio Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        {publishCreditError && (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <p className="font-semibold">Additional Active Hosting Slot Requires Credits</p>
                <p className="mt-0.5 text-xs text-amber-200/90">{publishCreditError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPublishCreditError(null)}
              aria-label="Dismiss credit warning"
              className="rounded-lg p-1 hover:bg-amber-500/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 1: ROOMS & N/E/S/W GENERATOR                             */}
        {/* ============================================================ */}
        {activeTab === 'rooms' && (
          <div className="space-y-6">
            {/* Room Selector Bar + Inline Add Room */}
            <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-white">Property Rooms & Spaces</h2>
                  <p className="text-xs text-gray-400">
                    Each room captures 4 cardinal camera walls (North Anchor + East, South, West)
                    for seamless spatial navigation.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setAddRoomOpen((v) => !v)}
                  className="gap-1.5 border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
                >
                  <Plus className="h-4 w-4" />
                  Add Room
                </Button>
              </div>

              {/* Room Pills */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {sortedRooms.map((room) => {
                  const isSelected = room.id === activeRoom?.id
                  const photoCount = COMPASS_DIRECTIONS.filter((d) =>
                    Boolean(room.perspectives?.[d]?.originalImageUrl)
                  ).length
                  const variantCount = COMPASS_DIRECTIONS.reduce(
                    (acc, d) => acc + (room.perspectives?.[d]?.variants?.length || 0),
                    0
                  )
                  const estShort = formatCompactUsd(room.renovationEstimateUsd)

                  return (
                    <div
                      key={room.id}
                      className={`group inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 transition-all ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-500/15 text-white shadow-sm'
                          : 'border-gray-800 bg-gray-950/70 text-gray-300 hover:border-gray-700 hover:text-white'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedRoomId(room.id)}
                        className="flex items-center gap-2 text-left"
                      >
                        <Layers
                          className={`h-3.5 w-3.5 ${isSelected ? 'text-cyan-400' : 'text-gray-500'}`}
                        />
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <span>{room.name}</span>
                            {estShort && (
                              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-cyan-200">
                                ~{estShort}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {PROPERTY_ROOM_TYPE_LABELS[room.roomType] || room.roomType} ·{' '}
                            {photoCount}/4 photos · {variantCount} AI plates
                          </div>
                        </div>
                      </button>
                      {sortedRooms.length > 1 && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteRoom(room)}
                          aria-label={`Remove ${room.name}`}
                          className="ml-1 rounded p-1 text-gray-500 opacity-70 hover:bg-rose-500/15 hover:text-rose-400 hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Inline + Add Room Form */}
              {addRoomOpen && (
                <form
                  onSubmit={handleAddRoom}
                  className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-cyan-500/30 bg-gray-950/90 p-4 md:grid-cols-12"
                >
                  <div className="md:col-span-4">
                    <label
                      htmlFor="add-room-name"
                      className="mb-1 block text-xs font-medium text-gray-300"
                    >
                      Room Name *
                    </label>
                    <input
                      id="add-room-name"
                      type="text"
                      required
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="e.g., Primary Suite or Chef's Kitchen"
                      className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label
                      htmlFor="add-room-type"
                      className="mb-1 block text-xs font-medium text-gray-300"
                    >
                      Room Type
                    </label>
                    <select
                      id="add-room-type"
                      value={newRoomType}
                      onChange={(e) => setNewRoomType(e.target.value as PropertyRoomType)}
                      className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    >
                      {(
                        Object.entries(PROPERTY_ROOM_TYPE_LABELS) as Array<
                          [PropertyRoomType, string]
                        >
                      ).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label
                      htmlFor="add-room-est"
                      className="mb-1 block text-xs font-medium text-gray-300"
                    >
                      Est. Remodel (USD)
                    </label>
                    <input
                      id="add-room-est"
                      type="number"
                      min={0}
                      value={newRoomEstUsd}
                      onChange={(e) => setNewRoomEstUsd(e.target.value)}
                      placeholder="75000"
                      className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-3 flex items-end justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddRoomOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={savingRoom}
                      className="gap-1.5"
                    >
                      {savingRoom ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Save Room
                    </Button>
                  </div>
                  <div className="md:col-span-12">
                    <input
                      type="text"
                      value={newRoomDesc}
                      onChange={(e) => setNewRoomDesc(e.target.value)}
                      placeholder="Optional architectural context (e.g., vaulted cedar ceiling, panoramic west ocean view)..."
                      aria-label="Optional room architectural context"
                      className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </form>
              )}
            </section>

            {/* 4-Card N · E · S · W Perspective Grid */}
            {activeRoom ? (
              <>
                <section>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-bold text-white">
                        {activeRoom.name} — 4-Wall N · E · S · W Blueprint
                      </h2>
                      <p className="text-xs text-gray-400">
                        Upload agent smartphone photos for each wall. North acts as the spatial
                        Anchor to lock materials, wood tones & lighting across East, South & West.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedDirections(['N', 'E', 'S', 'W'])}
                        className="rounded-lg border border-gray-800 bg-gray-900 px-2.5 py-1 text-gray-300 hover:border-cyan-500/40 hover:text-white"
                      >
                        Select All 4
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDirections(['N'])}
                        className="rounded-lg border border-gray-800 bg-gray-900 px-2.5 py-1 text-gray-300 hover:border-cyan-500/40 hover:text-white"
                      >
                        Anchor Only (N)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDirections(['E', 'S', 'W'])}
                        className="rounded-lg border border-gray-800 bg-gray-900 px-2.5 py-1 text-gray-300 hover:border-cyan-500/40 hover:text-white"
                      >
                        Follow-Up (E/S/W)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {COMPASS_DIRECTIONS.map((dir) => {
                      const persp = activeRoom.perspectives?.[dir]
                      const isAnchor = (activeRoom.anchorDirection || 'N') === dir
                      const isSelectedForGen = selectedDirections.includes(dir)
                      const isUploading = uploadingDir === dir

                      const matchingVariant =
                        persp?.variants?.find(
                          (v) =>
                            v.style === genStyle &&
                            v.lighting === genLighting &&
                            v.lifestyle === genLifestyle
                        ) ??
                        persp?.variants?.find((v) => v.style === genStyle) ??
                        persp?.variants?.[persp.variants.length - 1] ??
                        null

                      const mode = cardPreviewMode[dir] || 'variant'
                      const previewUrl =
                        mode === 'original'
                          ? persp?.originalImageUrl || matchingVariant?.imageUrl || null
                          : matchingVariant?.imageUrl || persp?.originalImageUrl || null

                      const showingOriginal =
                        Boolean(persp?.originalImageUrl) &&
                        (mode === 'original' || !matchingVariant)

                      return (
                        <div
                          key={dir}
                          className={`flex flex-col overflow-hidden rounded-2xl border transition-all ${
                            isSelectedForGen
                              ? 'border-cyan-500/50 bg-gray-900/90 shadow-lg shadow-cyan-950/20'
                              : 'border-gray-800 bg-gray-900/50'
                          }`}
                        >
                          {/* Card Top Header */}
                          <div className="flex items-center justify-between gap-2 border-b border-gray-800 px-4 py-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => toggleDirectionSelection(dir)}
                                aria-pressed={isSelectedForGen}
                                aria-label={`Include ${COMPASS_TITLES[dir]} wall in generation`}
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition-colors ${
                                  isSelectedForGen
                                    ? 'border-cyan-400 bg-cyan-500 text-slate-950'
                                    : 'border-gray-700 bg-gray-950 text-gray-400 hover:border-gray-500'
                                }`}
                              >
                                {dir}
                              </button>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-white">
                                    {COMPASS_TITLES[dir]}
                                    {isAnchor ? ' (Anchor)' : ''}
                                  </span>
                                  {isAnchor && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                                      <Anchor className="h-2.5 w-2.5" />
                                      Continuity Lock
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  defaultValue={persp?.label || `${COMPASS_TITLES[dir]} View`}
                                  key={`${activeRoom.id}-${dir}-${persp?.label || ''}`}
                                  onBlur={(e) =>
                                    void handlePerspectiveLabelBlur(dir, e.target.value)
                                  }
                                  aria-label={`${COMPASS_TITLES[dir]} wall perspective label`}
                                  className="mt-0.5 w-full bg-transparent text-[11px] text-gray-400 focus:text-white focus:outline-none"
                                />
                              </div>
                            </div>

                            {/* Original vs AI Variant Preview Toggle */}
                            {persp?.originalImageUrl && matchingVariant && (
                              <div className="flex shrink-0 items-center rounded-lg border border-gray-800 bg-gray-950 p-0.5 text-[11px]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCardPreviewMode((p) => ({ ...p, [dir]: 'original' }))
                                  }
                                  className={`rounded-md px-2 py-0.5 font-medium transition-colors ${
                                    showingOriginal
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : 'text-gray-400 hover:text-white'
                                  }`}
                                >
                                  Original
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCardPreviewMode((p) => ({ ...p, [dir]: 'variant' }))
                                  }
                                  className={`rounded-md px-2 py-0.5 font-medium transition-colors ${
                                    !showingOriginal
                                      ? 'bg-cyan-500/20 text-cyan-300'
                                      : 'text-gray-400 hover:text-white'
                                  }`}
                                >
                                  AI Vision
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Card Visual Stage */}
                          <div className="relative aspect-video w-full bg-gray-950">
                            {previewUrl ? (
                              <img
                                src={previewUrl}
                                alt={`${activeRoom.name} ${COMPASS_TITLES[dir]} wall`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-gray-500">
                                <ImageIcon className="h-8 w-8 mb-2 text-gray-700" />
                                <p className="text-xs font-medium text-gray-400">
                                  No smartphone photo uploaded yet
                                </p>
                                <p className="mt-0.5 text-[11px] text-gray-600">
                                  Upload a reference photo or generate from room context
                                </p>
                              </div>
                            )}

                            {/* Overlay Badges */}
                            <div className="absolute left-3 top-3 flex items-center gap-1.5">
                              {showingOriginal ? (
                                <span className="rounded-full border border-emerald-400/40 bg-black/75 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300 backdrop-blur-md">
                                  Original Photo
                                </span>
                              ) : matchingVariant ? (
                                <span className="rounded-full border border-cyan-400/40 bg-black/75 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-200 backdrop-blur-md">
                                  {PROPERTY_STYLE_PRESETS.find((s) => s.id === matchingVariant.style)
                                    ?.shortLabel || matchingVariant.style}{' '}
                                  ·{' '}
                                  {PROPERTY_LIGHTING_PRESETS.find(
                                    (l) => l.id === matchingVariant.lighting
                                  )?.shortLabel || matchingVariant.lighting}
                                </span>
                              ) : null}
                            </div>

                            {persp?.variants && persp.variants.length > 0 && (
                              <div className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/70 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
                                {persp.variants.length} AI plate
                                {persp.variants.length === 1 ? '' : 's'}
                              </div>
                            )}

                            {isUploading && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                                <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
                                <p className="mt-2 text-xs font-medium text-white">
                                  Uploading photo...
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Card Footer: Upload Photo & Variant Pills */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-800 px-4 py-3">
                            <input
                              ref={(el) => {
                                fileInputRefs.current[dir] = el
                              }}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  void handleUploadPhoto(dir, file)
                                }
                                e.target.value = ''
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRefs.current[dir]?.click()}
                              disabled={isUploading}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-1.5 text-xs font-medium text-gray-200 hover:border-cyan-500/40 hover:bg-gray-800 hover:text-white transition-colors"
                            >
                              <Upload className="h-3.5 w-3.5 text-cyan-400" />
                              {persp?.originalImageUrl ? 'Replace Photo' : 'Upload Photo'}
                            </button>

                            <div className="flex items-center gap-2 text-[11px] text-gray-400">
                              <label className="inline-flex cursor-pointer items-center gap-1.5 select-none">
                                <input
                                  type="checkbox"
                                  checked={isSelectedForGen}
                                  onChange={() => toggleDirectionSelection(dir)}
                                  className="h-3.5 w-3.5 rounded border-gray-700 bg-gray-900 accent-cyan-500"
                                />
                                <span>Include in AI run</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>

                {/* Cross-Angle Locked AI Generator Bar */}
                <section className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-gray-900 via-gray-900 to-slate-950 p-5 shadow-xl">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Wand2 className="h-5 w-5 text-cyan-400" />
                        <h2 className="text-base font-bold text-white">
                          Cross-Angle Locked AI Generator
                        </h2>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        Generates photorealistic 2K architectural plates grounded to your uploaded
                        wall photos, locking flooring, paint, stone veining & lighting from the
                        North Anchor across E, S & W.
                      </p>
                    </div>

                    {/* Live Rate Card Credit Estimate */}
                    <div className="rounded-xl border border-cyan-500/30 bg-gray-950/90 px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                        <Zap className="h-3 w-3" />
                        <span>
                          {isRateCardLive ? 'Live Rate Card Estimate' : 'Credit Estimate'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-lg font-bold text-white">
                        {estimatedCredits}{' '}
                        <span className="text-xs font-medium text-gray-400">credits</span>
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Pro 2K ({perPlateQuote.credits} cr) × {selectedDirections.length} wall
                        {selectedDirections.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>

                  {/* Style / Lighting / Lifestyle Selectors */}
                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {/* Style */}
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                        1. Design Style
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {PROPERTY_STYLE_PRESETS.map((preset) => {
                          const active = genStyle === preset.id
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setGenStyle(preset.id)}
                              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                                active
                                  ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-sm'
                                  : 'border-gray-800 bg-gray-950 text-gray-400 hover:border-gray-700 hover:text-white'
                              }`}
                            >
                              {preset.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Lighting */}
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                        2. Lighting Mood
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {PROPERTY_LIGHTING_PRESETS.map((preset) => {
                          const active = genLighting === preset.id
                          const Icon =
                            preset.id === 'daylight'
                              ? Sun
                              : preset.id === 'golden_hour'
                                ? Sunset
                                : Moon
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setGenLighting(preset.id)}
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                                active
                                  ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                                  : 'border-gray-800 bg-gray-950 text-gray-400 hover:border-gray-700 hover:text-white'
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {preset.shortLabel}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Lifestyle */}
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                        3. Lifestyle Staging
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {PROPERTY_LIFESTYLE_PRESETS.map((preset) => {
                          const active = genLifestyle === preset.id
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setGenLifestyle(preset.id)}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                                active
                                  ? 'border-purple-400 bg-purple-500/20 text-purple-200'
                                  : 'border-gray-800 bg-gray-950 text-gray-400 hover:border-gray-700 hover:text-white'
                              }`}
                            >
                              {preset.shortLabel}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Custom Prompt Directive & Generate CTA */}
                  <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end">
                    <div className="flex-1">
                      <label
                        htmlFor="pt-custom-directive"
                        className="mb-1.5 block text-xs font-medium text-gray-300"
                      >
                        Optional Custom Architectural Directive
                      </label>
                      <input
                        id="pt-custom-directive"
                        type="text"
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        placeholder="e.g., Retain exposed oak ceiling beams, upgrade island to honed Calacatta marble with brushed brass pendants..."
                        className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleGenerateRoom()}
                      disabled={generating || selectedDirections.length === 0}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-950/50 transition-all hover:brightness-110 disabled:opacity-60"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating {selectedDirections.join(' · ')}...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          {selectedDirections.length === 4
                            ? 'Generate 4-Wall Locked Perspectives'
                            : `Generate ${selectedDirections.length}-Wall Locked (${selectedDirections.join(' · ')})`}
                        </>
                      )}
                    </button>
                  </div>
                </section>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/40 p-10 text-center">
                <p className="text-sm font-medium text-gray-300">
                  Add your first room above to start uploading N/E/S/W photos and generating AI
                  perspectives.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: INTERACTIVE PLAYER PREVIEW                            */}
        {/* ============================================================ */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-3 text-xs text-gray-300">
              <span>
                Live interactive preview — test N/E/S/W compass rotation, arrow keys, Before/After
                compare slider, and your white-label lead drawer before publishing.
              </span>
              <Link
                href={`/tour/${encodeURIComponent(tour.slug)}?preview=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-cyan-400 hover:text-cyan-300"
              >
                Open Full-Screen Preview
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
            <InteractivePropertyPlayer tour={tour} isPreview />
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: WHITE-LABEL BRANDING & LISTING INFO                   */}
        {/* ============================================================ */}
        {activeTab === 'branding' && (
          <form onSubmit={handleSaveBrandingAndSpecs} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Column 1: White-Label Agency Branding */}
              <section className="space-y-4 rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
                <div className="border-b border-gray-800 pb-3">
                  <h2 className="text-base font-bold text-white">White-Label Brokerage Branding</h2>
                  <p className="text-xs text-gray-400">
                    Customize the standalone player and iframe embed to match your client&apos;s
                    brokerage identity.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="brand-agency-name"
                    className="mb-1 block text-xs font-medium text-gray-300"
                  >
                    Agency / Brokerage Name
                  </label>
                  <input
                    id="brand-agency-name"
                    type="text"
                    value={formBranding.agencyName || ''}
                    onChange={(e) =>
                      setFormBranding((b) => ({ ...b, agencyName: e.target.value }))
                    }
                    placeholder="e.g., Pacific Coast Luxury Realty"
                    className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3.5 py-2 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="brand-logo-url"
                    className="mb-1 block text-xs font-medium text-gray-300"
                  >
                    Agency Logo URL
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="brand-logo-url"
                      type="url"
                      value={formBranding.logoUrl || ''}
                      onChange={(e) => setFormBranding((b) => ({ ...b, logoUrl: e.target.value }))}
                      placeholder="https://example.com/brokerage-logo.png"
                      className="flex-1 rounded-xl border border-gray-800 bg-gray-950 px-3.5 py-2 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500 focus:outline-none"
                    />
                    {formBranding.logoUrl && (
                      <img
                        src={formBranding.logoUrl}
                        alt="Agency logo preview"
                        className="h-10 w-10 rounded-lg border border-gray-800 bg-white/5 object-contain p-1"
                      />
                    )}
                  </div>
                </div>

                {/* Primary Color Picker */}
                <div>
                  <label
                    htmlFor="brand-primary-color"
                    className="mb-1.5 block text-xs font-medium text-gray-300"
                  >
                    Primary Brand Accent Color
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      id="brand-primary-color"
                      type="color"
                      value={formBranding.primaryColor || '#06b6d4'}
                      onChange={(e) =>
                        setFormBranding((b) => ({ ...b, primaryColor: e.target.value }))
                      }
                      className="h-9 w-12 cursor-pointer rounded-lg border border-gray-700 bg-gray-950 p-1"
                    />
                    <input
                      type="text"
                      value={formBranding.primaryColor || '#06b6d4'}
                      onChange={(e) =>
                        setFormBranding((b) => ({ ...b, primaryColor: e.target.value }))
                      }
                      aria-label="Brand color hex code"
                      className="w-28 rounded-lg border border-gray-800 bg-gray-950 px-2.5 py-1.5 font-mono text-xs text-white"
                    />
                    <div className="flex items-center gap-1.5">
                      {BRAND_COLOR_SWATCHES.map((swatch) => (
                        <button
                          key={swatch.hex}
                          type="button"
                          title={swatch.name}
                          aria-label={`Select ${swatch.name}`}
                          onClick={() =>
                            setFormBranding((b) => ({ ...b, primaryColor: swatch.hex }))
                          }
                          className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                            (formBranding.primaryColor || '#06b6d4').toLowerCase() === swatch.hex
                              ? 'border-white scale-110'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: swatch.hex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Hide SceneFlow Branding Toggle */}
                <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-800 bg-gray-950/80 p-3.5">
                  <div>
                    <p className="text-sm font-semibold text-white">Hide SceneFlow Branding</p>
                    <p className="text-xs text-gray-400">
                      Removes the &ldquo;Powered by SceneFlow Studio&rdquo; badge for 100%
                      white-label agency delivery.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(formBranding.hideSceneFlowBranding)}
                    aria-label="Hide SceneFlow Branding"
                    onClick={() =>
                      setFormBranding((b) => ({
                        ...b,
                        hideSceneFlowBranding: !b.hideSceneFlowBranding,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      formBranding.hideSceneFlowBranding ? 'bg-cyan-500' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formBranding.hideSceneFlowBranding ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label
                    htmlFor="brand-disclosure"
                    className="mb-1 block text-xs font-medium text-gray-300"
                  >
                    MLS Compliance Disclosure Pill Text
                  </label>
                  <input
                    id="brand-disclosure"
                    type="text"
                    value={formBranding.disclosureText || ''}
                    onChange={(e) =>
                      setFormBranding((b) => ({ ...b, disclosureText: e.target.value }))
                    }
                    placeholder="Virtually Staged · Concept Visualization"
                    className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3.5 py-2 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Agent & CTA */}
                <div className="border-t border-gray-800 pt-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Listing Agent & Lead CTA
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="brand-agent-name"
                        className="mb-1 block text-xs font-medium text-gray-300"
                      >
                        Agent Name
                      </label>
                      <input
                        id="brand-agent-name"
                        type="text"
                        value={formBranding.agentName || ''}
                        onChange={(e) =>
                          setFormBranding((b) => ({ ...b, agentName: e.target.value }))
                        }
                        placeholder="Elena Vance"
                        className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="brand-agent-title"
                        className="mb-1 block text-xs font-medium text-gray-300"
                      >
                        Agent Title / DRE #
                      </label>
                      <input
                        id="brand-agent-title"
                        type="text"
                        value={formBranding.agentTitle || ''}
                        onChange={(e) =>
                          setFormBranding((b) => ({ ...b, agentTitle: e.target.value }))
                        }
                        placeholder="Luxury Estates Director · DRE #02019442"
                        className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="brand-agent-phone"
                        className="mb-1 block text-xs font-medium text-gray-300"
                      >
                        Agent Phone
                      </label>
                      <input
                        id="brand-agent-phone"
                        type="tel"
                        value={formBranding.agentPhone || ''}
                        onChange={(e) =>
                          setFormBranding((b) => ({ ...b, agentPhone: e.target.value }))
                        }
                        placeholder="(310) 555-0148"
                        className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="brand-agent-email"
                        className="mb-1 block text-xs font-medium text-gray-300"
                      >
                        Agent Email
                      </label>
                      <input
                        id="brand-agent-email"
                        type="email"
                        value={formBranding.agentEmail || ''}
                        onChange={(e) =>
                          setFormBranding((b) => ({ ...b, agentEmail: e.target.value }))
                        }
                        placeholder="elena@pacificluxury.com"
                        className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="brand-cta-label"
                        className="mb-1 block text-xs font-medium text-gray-300"
                      >
                        Primary CTA Button Label
                      </label>
                      <input
                        id="brand-cta-label"
                        type="text"
                        value={formBranding.ctaLabel || ''}
                        onChange={(e) =>
                          setFormBranding((b) => ({ ...b, ctaLabel: e.target.value }))
                        }
                        placeholder="Schedule Showing / Request Quote"
                        className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="brand-cta-url"
                        className="mb-1 block text-xs font-medium text-gray-300"
                      >
                        External Listing Website (Optional)
                      </label>
                      <input
                        id="brand-cta-url"
                        type="url"
                        value={formBranding.ctaUrl || ''}
                        onChange={(e) => setFormBranding((b) => ({ ...b, ctaUrl: e.target.value }))}
                        placeholder="https://brokerage.com/listings/21450-pch"
                        className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Column 2: Property Specs & Enabled Player Toggles */}
              <div className="space-y-6">
                <section className="space-y-4 rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
                  <div className="border-b border-gray-800 pb-3">
                    <h2 className="text-base font-bold text-white">Listing & Property Specs</h2>
                    <p className="text-xs text-gray-400">
                      Shown in the standalone player specs strip and lead drawer summary.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="spec-title"
                      className="mb-1 block text-xs font-medium text-gray-300"
                    >
                      Listing Title
                    </label>
                    <input
                      id="spec-title"
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="spec-address"
                      className="mb-1 block text-xs font-medium text-gray-300"
                    >
                      Property Address
                    </label>
                    <input
                      id="spec-address"
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="21450 Pacific Coast Hwy, Malibu, CA 90265"
                      className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="spec-price"
                        className="mb-1 block text-xs font-medium text-gray-300"
                      >
                        Price (USD)
                      </label>
                      <input
                        id="spec-price"
                        type="number"
                        min={0}
                        value={formSpecs.priceUsd ?? ''}
                        onChange={(e) =>
                          setFormSpecs((s) => ({
                            ...s,
                            priceUsd: e.target.value ? Number(e.target.value) : null,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="spec-sqft"
                        className="mb-1 block text-xs font-medium text-gray-300"
                      >
                        SqFt
                      </label>
                      <input
                        id="spec-sqft"
                        type="number"
                        min={0}
                        value={formSpecs.sqft ?? ''}
                        onChange={(e) =>
                          setFormSpecs((s) => ({
                            ...s,
                            sqft: e.target.value ? Number(e.target.value) : null,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="spec-beds"
                        className="mb-1 block text-xs font-medium text-gray-300"
                      >
                        Beds
                      </label>
                      <input
                        id="spec-beds"
                        type="number"
                        min={0}
                        value={formSpecs.beds ?? ''}
                        onChange={(e) =>
                          setFormSpecs((s) => ({
                            ...s,
                            beds: e.target.value ? Number(e.target.value) : null,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="spec-baths"
                        className="mb-1 block text-xs font-medium text-gray-300"
                      >
                        Baths
                      </label>
                      <input
                        id="spec-baths"
                        type="number"
                        min={0}
                        step="0.5"
                        value={formSpecs.baths ?? ''}
                        onChange={(e) =>
                          setFormSpecs((s) => ({
                            ...s,
                            baths: e.target.value ? Number(e.target.value) : null,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="spec-mls"
                        className="mb-1 block text-xs font-medium text-gray-300"
                      >
                        MLS Number
                      </label>
                      <input
                        id="spec-mls"
                        type="text"
                        value={formSpecs.mlsNumber || ''}
                        onChange={(e) =>
                          setFormSpecs((s) => ({ ...s, mlsNumber: e.target.value || null }))
                        }
                        placeholder="24-419820"
                        className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="spec-year"
                        className="mb-1 block text-xs font-medium text-gray-300"
                      >
                        Year Built
                      </label>
                      <input
                        id="spec-year"
                        type="number"
                        min={1800}
                        max={2100}
                        value={formSpecs.yearBuilt ?? ''}
                        onChange={(e) =>
                          setFormSpecs((s) => ({
                            ...s,
                            yearBuilt: e.target.value ? Number(e.target.value) : null,
                          }))
                        }
                        placeholder="2021"
                        className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </section>

                {/* Visible Player Toggles */}
                <section className="space-y-4 rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
                  <div className="border-b border-gray-800 pb-3">
                    <h2 className="text-base font-bold text-white">Enabled Player Controls</h2>
                    <p className="text-xs text-gray-400">
                      Choose which Design Styles, Lighting moods, and Lifestyle pills buyers can
                      toggle in the player.
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Design Styles
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {PROPERTY_STYLE_PRESETS.map((preset) => {
                        const enabled = formStyles.includes(preset.id)
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() =>
                              setFormStyles((prev) =>
                                prev.includes(preset.id)
                                  ? prev.filter((id) => id !== preset.id)
                                  : [...prev, preset.id]
                              )
                            }
                            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                              enabled
                                ? 'border-cyan-500/60 bg-cyan-500/20 text-cyan-200'
                                : 'border-gray-800 bg-gray-950 text-gray-500 hover:text-gray-300'
                            }`}
                          >
                            {preset.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Lighting
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {PROPERTY_LIGHTING_PRESETS.map((preset) => {
                        const enabled = formLighting.includes(preset.id)
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() =>
                              setFormLighting((prev) =>
                                prev.includes(preset.id)
                                  ? prev.filter((id) => id !== preset.id)
                                  : [...prev, preset.id]
                              )
                            }
                            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                              enabled
                                ? 'border-amber-500/60 bg-amber-500/20 text-amber-200'
                                : 'border-gray-800 bg-gray-950 text-gray-500 hover:text-gray-300'
                            }`}
                          >
                            {preset.shortLabel}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Lifestyle Staging
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {PROPERTY_LIFESTYLE_PRESETS.map((preset) => {
                        const enabled = formLifestyles.includes(preset.id)
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() =>
                              setFormLifestyles((prev) =>
                                prev.includes(preset.id)
                                  ? prev.filter((id) => id !== preset.id)
                                  : [...prev, preset.id]
                              )
                            }
                            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                              enabled
                                ? 'border-purple-500/60 bg-purple-500/20 text-purple-200'
                                : 'border-gray-800 bg-gray-950 text-gray-500 hover:text-gray-300'
                            }`}
                          >
                            {preset.shortLabel}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={savingBranding} className="gap-2">
                {savingBranding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving Settings...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Branding & Listing Settings
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* TAB 4: BUYER LEADS & ANALYTICS                               */}
        {/* ============================================================ */}
        {activeTab === 'leads' && (
          <div className="space-y-6">
            {/* KPI Strip */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Eye className="h-4 w-4 text-cyan-400" />
                  Total Tour Views
                </div>
                <p className="mt-2 text-2xl font-bold text-white">
                  {(tour.viewCount || 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Users className="h-4 w-4 text-emerald-400" />
                  Captured Buyer Leads
                </div>
                <p className="mt-2 text-2xl font-bold text-emerald-400">{leads.length}</p>
              </div>
              <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <CheckCircle2 className="h-4 w-4 text-purple-400" />
                  Lead Conversion
                </div>
                <p className="mt-2 text-2xl font-bold text-white">{conversionRate}</p>
              </div>
              <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Zap className="h-4 w-4 text-amber-400" />
                  Generation Credits Spent
                </div>
                <p className="mt-2 text-2xl font-bold text-amber-300">
                  {(tour.totalGenerationCredits || 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Incoming Buyer Inquiries Table */}
            <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/70">
              <div className="border-b border-gray-800 px-5 py-4">
                <h2 className="text-base font-bold text-white">Incoming Buyer Inquiries</h2>
                <p className="text-xs text-gray-400">
                  Every lead automatically captures the exact room and AI design style the buyer was
                  exploring when they clicked your CTA.
                </p>
              </div>

              {leads.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="mx-auto h-9 w-9 text-gray-600 mb-3" />
                  <p className="text-sm font-medium text-gray-300">No buyer leads yet</p>
                  <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
                    Publish and embed this tour on your brokerage website or MLS landing page.
                    Inquiries submitted via the white-label CTA drawer will appear here instantly.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-gray-800 bg-gray-950/70 text-[11px] uppercase tracking-wider text-gray-400">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Buyer</th>
                        <th className="px-4 py-3 font-semibold">Inquiry Type</th>
                        <th className="px-4 py-3 font-semibold">Room & Style Viewed</th>
                        <th className="px-4 py-3 font-semibold">Message</th>
                        <th className="px-4 py-3 font-semibold">Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/80">
                      {leads.map((lead) => {
                        const buyerName = lead.buyer_name ?? lead.buyerName ?? 'Unknown Buyer'
                        const buyerEmail = lead.buyer_email ?? lead.buyerEmail ?? ''
                        const buyerPhone = lead.buyer_phone ?? lead.buyerPhone ?? null
                        const inqType = lead.inquiry_type ?? lead.inquiryType ?? 'general'
                        const roomName = lead.selected_room_name ?? lead.selectedRoomName ?? null
                        const styleName = lead.selected_style ?? lead.selectedStyle ?? null
                        const createdAt = lead.created_at ?? lead.createdAt
                        const badge = INQUIRY_LABELS[inqType] ?? INQUIRY_LABELS.general

                        return (
                          <tr key={lead.id} className="hover:bg-gray-800/30 transition-colors">
                            <td className="px-5 py-3.5 align-top">
                              <p className="font-semibold text-white">{buyerName}</p>
                              {buyerEmail && (
                                <a
                                  href={`mailto:${buyerEmail}`}
                                  className="mt-0.5 inline-flex items-center gap-1 text-cyan-400 hover:underline"
                                >
                                  <Mail className="h-3 w-3" />
                                  {buyerEmail}
                                </a>
                              )}
                              {buyerPhone && (
                                <a
                                  href={`tel:${buyerPhone}`}
                                  className="mt-0.5 flex items-center gap-1 text-gray-400 hover:text-white"
                                >
                                  <Phone className="h-3 w-3" />
                                  {buyerPhone}
                                </a>
                              )}
                            </td>
                            <td className="px-4 py-3.5 align-top">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 align-top">
                              {roomName || styleName ? (
                                <div className="space-y-1">
                                  {roomName && (
                                    <p className="font-medium text-gray-200">{roomName}</p>
                                  )}
                                  {styleName && (
                                    <span className="inline-block rounded bg-white/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
                                      {styleName}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-500">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 align-top max-w-xs">
                              <p className="whitespace-pre-wrap text-gray-300">
                                {lead.message || <span className="text-gray-500">No message</span>}
                              </p>
                            </td>
                            <td className="px-4 py-3.5 align-top whitespace-nowrap text-gray-400">
                              {formatDateTime(createdAt)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Hosting Billing Events (if any) */}
            {hostingEvents.length > 0 && (
              <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
                <h3 className="text-sm font-bold text-white">Hosting Billing History</h3>
                <div className="mt-3 space-y-2">
                  {hostingEvents.map((ev, idx) => {
                    const rawEventType = ev.eventType ?? ev.event_type ?? ev.status ?? 'billed'
                    const eventLabel = rawEventType.replace(/_/g, ' ')
                    return (
                      <div
                        key={ev.id || idx}
                        className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-950/60 px-4 py-2.5 text-xs"
                      >
                        <span className="font-medium text-gray-300">
                          Billing Month: {ev.billing_month ?? ev.billingMonth ?? '—'}
                        </span>
                        <span className="text-gray-400">
                          {ev.credits_charged ?? ev.creditsCharged ?? 0} credits ·{' '}
                          <span className="capitalize text-emerald-300">{eventLabel}</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Share & Embed Modal */}
      {shareModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setShareModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-embed-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl border border-gray-800 bg-gray-950 p-6 text-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-800 pb-4">
              <div>
                <h2 id="share-embed-modal-title" className="text-lg font-bold text-white">
                  Share & Embed Interactive Tour
                </h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  Share the standalone white-label link or paste the responsive iframe into any
                  brokerage site, Webflow, WordPress, or Squarespace listing page.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                aria-label="Close share modal"
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {tour.status !== 'published' && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                <span>
                  This tour is currently <strong>{tour.status}</strong>. Publish it so buyers can
                  view the public URL and embed.
                </span>
                <button
                  type="button"
                  onClick={() => void handleTogglePublish()}
                  disabled={togglingPublish}
                  className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-slate-950 hover:bg-amber-400"
                >
                  Publish Now
                </button>
              </div>
            )}

            <div className="mt-5 space-y-4">
              {/* Direct Share URL */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-300">
                  Direct Standalone Share URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrls.shareUrl}
                    aria-label="Direct standalone share URL"
                    className="flex-1 rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 font-mono text-xs text-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => void copyShareText('share', shareUrls.shareUrl)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-700 bg-gray-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-gray-700"
                  >
                    {copiedField === 'share' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Embed URL */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-300">
                  Embed Player URL (?embed=1)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrls.embedUrl}
                    aria-label="Embed player URL"
                    className="flex-1 rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 font-mono text-xs text-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => void copyShareText('embed', shareUrls.embedUrl)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-700 bg-gray-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-gray-700"
                  >
                    {copiedField === 'embed' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Responsive Iframe Snippet */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-300">
                    Responsive 16:9 &lt;iframe&gt; Embed Code
                  </label>
                  <button
                    type="button"
                    onClick={() => void copyShareText('iframe', shareUrls.iframeCode)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/20 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/30"
                  >
                    {copiedField === 'iframe' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        Snippet Copied!
                      </>
                    ) : (
                      <>
                        <Code2 className="h-3.5 w-3.5" />
                        Copy Embed Snippet
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={4}
                  value={shareUrls.iframeCode}
                  aria-label="Responsive iframe embed code"
                  className="w-full rounded-xl border border-gray-800 bg-gray-900 p-3 font-mono text-[11px] leading-relaxed text-cyan-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end border-t border-gray-800 pt-4">
              <Button type="button" variant="secondary" onClick={() => setShareModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
