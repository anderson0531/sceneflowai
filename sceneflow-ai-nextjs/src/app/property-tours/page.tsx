'use client'

import React, { useCallback, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  Camera,
  Check,
  CloudUpload,
  Code2,
  Compass,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  Palette,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Terminal,
  Upload,
  Wand2,
} from 'lucide-react'
import { InteractivePropertyPlayer } from '@/components/property-tours/InteractivePropertyPlayer'
import {
  buildPropertyTourUrls,
  buildPublicDemoPropertyTourDTO,
  EXTRA_ACTIVE_LISTING_MONTHLY_CREDITS,
  INCLUDED_ACTIVE_LISTINGS_BY_TIER,
} from '@/lib/propertyTours/hostingPolicy'
import {
  COMPASS_DIRECTIONS,
  createDefaultRoom,
  PROPERTY_ADDITION_PRESETS,
  PROPERTY_EVENT_PRESETS,
  PROPERTY_LIFESTYLE_PRESETS,
  PROPERTY_LIGHTING_PRESETS,
  PROPERTY_STYLE_PRESETS,
  type CompassDirection,
  type PropertyAdditionId,
  type PropertyEventId,
  type PropertyLifestyleId,
  type PropertyLightingId,
  type PropertyRoom,
  type PropertyStyleId,
  type PropertyTourDTO,
} from '@/lib/propertyTours/types'

type PublicWorkspaceTab = 'player' | 'sandbox' | 'embed' | 'script'

const BRAND_SWATCHES = [
  { name: 'Coastal Cyan', hex: '#06b6d4' },
  { name: 'Luxury Gold', hex: '#d97706' },
  { name: 'Emerald Estate', hex: '#10b981' },
  { name: 'Sotheby Navy', hex: '#3b82f6' },
  { name: 'Architectural Rose', hex: '#e11d48' },
  { name: 'Monochrome Slate', hex: '#94a3b8' },
]

const DIRECTION_LABELS: Record<CompassDirection, string> = {
  N: 'North (Anchor Wall)',
  E: 'East (90° Right)',
  S: 'South (180° Opposite)',
  W: 'West (90° Left)',
}

/**
 * Resize a user's smartphone photo client-side (max 1440px JPEG) so it previews instantly
 * and uploads cleanly to Vercel AI Gateway + Vercel Blob without hitting serverless body limits.
 */
async function compressPhotoToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Unsupported image format'))
      img.onload = () => {
        const maxDim = 1440
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(String(reader.result || ''))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.84))
      }
      img.src = String(reader.result || '')
    }
    reader.readAsDataURL(file)
  })
}

export default function PublicPropertyToursPage() {
  const [tour, setTour] = useState<PropertyTourDTO>(() => buildPublicDemoPropertyTourDTO('demo'))
  const [activeTab, setActiveTab] = useState<PublicWorkspaceTab>('player')
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    () => buildPublicDemoPropertyTourDTO('demo').rooms[0]?.id || ''
  )
  const [newRoomName, setNewRoomName] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Vercel AI Gateway staging state (100% Vercel-native, zero GCP)
  const [genStyle, setGenStyle] = useState<PropertyStyleId>('modern_coastal')
  const [genLighting, setGenLighting] = useState<PropertyLightingId>('daylight')
  const [genLifestyle, setGenLifestyle] = useState<PropertyLifestyleId>('architectural')
  const [genEvent, setGenEvent] = useState<PropertyEventId>('none')
  const [genAddition, setGenAddition] = useState<PropertyAdditionId>('none')
  const [stagingDir, setStagingDir] = useState<CompassDirection | 'ALL' | null>(null)
  const [stagingMessage, setStagingMessage] = useState<string | null>(null)
  const [stagingError, setStagingError] = useState<string | null>(null)

  // Vercel Blob publish state (100% Vercel-native, zero GCP)
  const [publishing, setPublishing] = useState(false)
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://sceneflowai.studio'

  const activeSlug = publishedSlug || 'demo'
  const embedUrls = useMemo(() => buildPropertyTourUrls(activeSlug, origin), [activeSlug, origin])

  const selectedRoom: PropertyRoom | undefined = useMemo(
    () =>
      tour.rooms.find((r) => r.id === selectedRoomId) || tour.rooms[0],
    [tour.rooms, selectedRoomId]
  )

  const handleCopy = useCallback(async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000)
    } catch {
      // Clipboard fallback ignored
    }
  }, [])

  const updateBranding = useCallback(
    (patch: Partial<PropertyTourDTO['branding']>) => {
      setTour((prev) => ({
        ...prev,
        branding: {
          ...prev.branding,
          ...patch,
        },
      }))
    },
    []
  )

  const handleLocalPhotoDrop = useCallback(
    async (roomId: string, dir: CompassDirection, file: File | null) => {
      if (!file) return
      try {
        const dataUrl = await compressPhotoToDataUrl(file)
        setTour((prev) => ({
          ...prev,
          rooms: prev.rooms.map((room) => {
            if (room.id !== roomId) return room
            const existing = room.perspectives[dir]
            return {
              ...room,
              perspectives: {
                ...room.perspectives,
                [dir]: {
                  ...existing,
                  originalImageUrl: dataUrl,
                  variants: existing.variants.filter((v) => v.style !== 'as_is'),
                },
              },
            }
          }),
        }))
        setStagingMessage(`Loaded ${dir} wall photo (${file.name}). Click "AI Stage Wall" to generate a Before/After vision on Vercel!`)
        setStagingError(null)
      } catch (err: any) {
        setStagingError(err?.message || 'Could not load image file')
      }
    },
    []
  )

  const stageSingleWallOnVercel = useCallback(
    async (
      room: PropertyRoom,
      dir: CompassDirection,
      anchorOverrideUrl?: string | null
    ): Promise<string | null> => {
      const perspective = room.perspectives[dir]
      const originalUrl = perspective.originalImageUrl || ''
      const northPerspective = room.perspectives.N
      const existingNorthVariant = northPerspective.variants.find(
        (v) => v.style === genStyle && v.lighting === genLighting
      )
      const anchorUrl =
        dir === 'N'
          ? null
          : anchorOverrideUrl ||
            existingNorthVariant?.imageUrl ||
            northPerspective.variants[0]?.imageUrl ||
            northPerspective.originalImageUrl ||
            null

      const res = await fetch('/api/property-tours/vercel-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stage-photo',
          roomName: room.name,
          roomType: room.roomType,
          roomDescription: room.description,
          direction: dir,
          style: genStyle,
          lighting: genLighting,
          lifestyle: genLifestyle,
          event: genEvent,
          addition: genAddition,
          originalImageUrl: originalUrl,
          anchorImageUrl: anchorUrl,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.imageUrl) {
        throw new Error(data?.error || `Staging failed for ${dir} wall`)
      }

      const newVariant = {
        id: `vercel-${room.id}-${dir}-${genStyle}-${genEvent}-${genAddition}-${Date.now()}`,
        style: genStyle,
        lighting: genLighting,
        lifestyle: genLifestyle,
        event: genEvent,
        addition: genAddition,
        imageUrl: data.imageUrl as string,
        isVirtuallyModified: true,
        promptSummary: String(data.promptSummary || 'Vercel AI Gateway staged plate'),
        generatedAt: new Date().toISOString(),
        creditsUsed: 0,
      }

      setTour((prev) => ({
        ...prev,
        availableStyles: prev.availableStyles.includes(genStyle)
          ? prev.availableStyles
          : [...prev.availableStyles, genStyle],
        availableLighting: prev.availableLighting.includes(genLighting)
          ? prev.availableLighting
          : [...prev.availableLighting, genLighting],
        availableLifestyles: prev.availableLifestyles.includes(genLifestyle)
          ? prev.availableLifestyles
          : [...prev.availableLifestyles, genLifestyle],
        rooms: prev.rooms.map((r) => {
          if (r.id !== room.id) return r
          const prevP = r.perspectives[dir]
          const filtered = prevP.variants.filter(
            (v) => !(v.style === genStyle && v.lighting === genLighting && v.lifestyle === genLifestyle)
          )
          return {
            ...r,
            perspectives: {
              ...r.perspectives,
              [dir]: {
                ...prevP,
                variants: [newVariant, ...filtered],
              },
            },
          }
        }),
      }))

      return data.imageUrl as string
    },
    [genStyle, genLighting, genLifestyle, genEvent, genAddition]
  )

  const handleStageWall = useCallback(
    async (dir: CompassDirection) => {
      if (!selectedRoom || stagingDir) return
      setStagingDir(dir)
      setStagingError(null)
      setStagingMessage(`Generating ${dir} wall via Vercel AI Gateway...`)
      try {
        await stageSingleWallOnVercel(selectedRoom, dir)
        setStagingMessage(
          `Generated ${dir} wall (${genStyle.replace(/_/g, ' ')} · ${genLighting.replace(/_/g, ' ')}) on Vercel! Switch to "Live Interactive Player" to drag the Before/After slider.`
        )
      } catch (err: any) {
        setStagingError(err?.message || 'Vercel AI Gateway staging failed')
      } finally {
        setStagingDir(null)
      }
    },
    [selectedRoom, stagingDir, stageSingleWallOnVercel, genStyle, genLighting]
  )

  const handleStageAllWalls = useCallback(async () => {
    if (!selectedRoom || stagingDir) return
    setStagingDir('ALL')
    setStagingError(null)
    try {
      let northAnchorUrl: string | null = null
      for (const dir of COMPASS_DIRECTIONS) {
        setStagingMessage(
          dir === 'N'
            ? 'Generating North (Anchor Wall) via Vercel AI Gateway...'
            : `Generating ${dir} wall (cross-angle locked to North Anchor)...`
        )
        const generatedUrl = await stageSingleWallOnVercel(selectedRoom, dir, northAnchorUrl)
        if (dir === 'N' && generatedUrl) {
          northAnchorUrl = generatedUrl
        }
      }
      setStagingMessage(
        `All 4 cross-angle locked N/E/S/W walls generated for "${selectedRoom.name}" via Vercel AI Gateway + Vercel Blob!`
      )
    } catch (err: any) {
      setStagingError(err?.message || 'Cross-angle generation interrupted')
    } finally {
      setStagingDir(null)
    }
  }, [selectedRoom, stagingDir, stageSingleWallOnVercel])

  const handlePublishToVercelBlob = useCallback(async () => {
    if (publishing) return
    setPublishing(true)
    setPublishError(null)
    try {
      const res = await fetch('/api/property-tours/vercel-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish-tour',
          tour,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.slug) {
        throw new Error(data?.error || 'Failed to publish tour to Vercel Blob')
      }
      setPublishedSlug(String(data.slug))
      if (data.tour) {
        setTour(data.tour as PropertyTourDTO)
      }
      setActiveTab('embed')
    } catch (err: any) {
      setPublishError(err?.message || 'Publishing failed')
    } finally {
      setPublishing(false)
    }
  }, [publishing, tour])

  const handleAddLocalRoom = useCallback(() => {
    const trimmed = newRoomName.trim()
    if (!trimmed) return
    const created = createDefaultRoom({
      id: `local-room-${Date.now()}`,
      name: trimmed,
      roomType: 'living',
      orderIndex: tour.rooms.length,
    })
    setTour((prev) => ({
      ...prev,
      rooms: [...prev.rooms, created],
    }))
    setSelectedRoomId(created.id)
    setNewRoomName('')
  }, [newRoomName, tour.rooms.length])

  const handleResetDemo = useCallback(() => {
    const fresh = buildPublicDemoPropertyTourDTO('demo')
    setTour(fresh)
    setSelectedRoomId(fresh.rooms[0]?.id || '')
    setPublishedSlug(null)
    setStagingMessage(null)
    setStagingError(null)
  }, [])

  return (
    <div className="min-h-screen overflow-x-clip bg-slate-950 text-slate-100">
      {/* Standalone Public Header (No Login Required · 100% Vercel-Native) */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/"
              aria-label="Back to SceneFlow Studio"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 sm:px-2.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">SceneFlow</span>
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                <Compass className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs sm:text-sm font-bold tracking-tight text-white">
                    SceneFlow Immersive Tour™
                  </span>
                  <span className="hidden md:inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                    60+ Min Living Property Explorer · No Login
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden lg:block">
                  Agent-Directed · Buyer-Controlled · Aerials, N/E/S/W, Redesigns, Additions, Events, Lifestyle Match &amp; EN/ES/JA Sync
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link
              href={`/tour/${encodeURIComponent(activeSlug)}`}
              target="_blank"
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 sm:px-3 text-[11px] sm:text-xs font-semibold text-white hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              <ExternalLink className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span className="sm:hidden">Full Tour</span>
              <span className="hidden sm:inline">
                Standalone /tour/{activeSlug === 'demo' ? 'demo' : 'live'}
              </span>
            </Link>
            <button
              type="button"
              onClick={handlePublishToVercelBlob}
              disabled={publishing}
              className="inline-flex items-center gap-1 rounded-lg bg-cyan-500 px-2.5 py-1.5 sm:px-3 text-[11px] sm:text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              {publishing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              ) : (
                <CloudUpload className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="sm:hidden">{publishing ? 'Saving...' : 'Publish'}</span>
              <span className="hidden sm:inline">
                {publishing ? 'Publishing...' : 'Publish Shareable Link'}
              </span>
            </button>
          </div>
        </div>

        {/* Workspace Mode Tabs (single-line swipe rail on mobile) */}
        <div className="mx-auto max-w-7xl px-3 sm:px-6 border-t border-white/5">
          <div className="flex items-center gap-1 overflow-x-auto py-1.5 sm:py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setActiveTab('player')}
              className={`shrink-0 inline-flex items-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'player'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>1. Live Player</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sandbox')}
              className={`shrink-0 inline-flex items-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'sandbox'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              <span className="sm:hidden">2. Photos &amp; AI</span>
              <span className="hidden sm:inline">2. N/E/S/W Photos &amp; Vercel AI Staging</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('embed')}
              className={`shrink-0 inline-flex items-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'embed'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              <span className="sm:hidden">3. Embed &amp; SaaS</span>
              <span className="hidden sm:inline">3. Embed Code &amp; White-Label SaaS</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('script')}
              className={`shrink-0 inline-flex items-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'script'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span className="sm:hidden">4. Media Script</span>
              <span className="hidden sm:inline">4. Media Script (Clips · EN/ES/JA · Music)</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-6 space-y-4 sm:space-y-6">
        {publishError && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-xs text-rose-200">
            {publishError}
          </div>
        )}

        {activeTab === 'player' && (
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Live Standalone White-Label Player (FIRST above the fold on mobile, 2nd on desktop) */}
            <div className="order-1 sm:order-2 -mx-3 sm:mx-0 overflow-hidden sm:rounded-2xl border-y sm:border border-white/15 bg-black shadow-2xl">
              <InteractivePropertyPlayer
                tour={tour}
                isEmbed={false}
                isPreview={false}
                embeddedInPage
              />
            </div>

            {/* Quick Buyer Guidance Banner (below player on mobile so room hero loads immediately) */}
            <div className="order-2 sm:order-1 space-y-2.5">
              <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-r from-slate-900/90 via-cyan-950/25 to-slate-900/90 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-white">
                    Beyond 360° Cameras &amp; Static Listing Photos — Spend an Hour Immersing Yourself in the Property
                  </p>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    SceneFlow Blueprint &amp; Production builds 60+ minutes of aerials, N/E/S/W architectural rooms, AI remodels, structural additions, live events &amp; multilingual agent sales narration — delivered in one interactive buyer-controlled portal.
                  </p>
                </div>
                <span className="shrink-0 self-start sm:self-center rounded-full border border-cyan-500/35 bg-cyan-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-200">
                  5 Spaces · EN / ES / JA
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3 sm:p-3.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                    <Compass className="h-4 w-4 shrink-0" />
                    1. Aerial Arrival &amp; 4-Wall N/E/S/W Explorer
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Start with <strong className="text-white">Coastal Aerial &amp; Arrival</strong> (grounded in licensed exterior &amp; aerial captures with compliant neighborhood context), then swipe rooms or launch the <strong className="text-white">30s Intro</strong>.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3 sm:p-3.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                    <Layers className="h-4 w-4 shrink-0" />
                    2. Lifestyle Match, Redesigns &amp; Add-Ons
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Pick a <strong className="text-white">Lifestyle Match</strong> (Entertainer, Family, Executive, Investor), toggle Events &amp; Additions, or drag <strong className="text-white">Compare</strong> for Before/After.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3 sm:p-3.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                    <Palette className="h-4 w-4 shrink-0" />
                    3. Agent Sync vs. EN / ES / JA Narration
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Switch between <strong className="text-white">Narration</strong> and <strong className="text-white">Agent Sync</strong> in English, Español, or 日本語 with ambient music &amp; automatic voice ducking.
                  </p>
                </div>
              </div>
            </div>

            {/* Explicit AI Visualization & Property Grounding Disclaimer */}
            <div className="order-4 flex items-start gap-2.5 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-[11px] sm:text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-slate-200">AI Visualization &amp; Property Accuracy Disclosure:</strong>{' '}
                SceneFlow Immersive Tour™ scenes are AI-enhanced for visualization and buyer inspiration, grounded in actual property photography, structural dimensions, and existing architectural features. Use <strong className="text-white">Original (As-Is)</strong> or <strong className="text-white">Compare Original</strong> at any time to inspect unaltered listing photos. Renovation and addition estimates are illustrative and subject to local permitting and contractor bids.
              </p>
            </div>

            {/* Live White-Label Rebrand Bar */}
            <section className="order-3 rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-cyan-400" />
                    Live White-Label Agency Rebrand Preview
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Test how your brokerage or media agency delivers this player under 100% private branding — changes reflect instantly in the player above.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Demo
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Brokerage / Agency Name
                  </label>
                  <input
                    type="text"
                    value={tour.branding.agencyName || ''}
                    onChange={(e) => updateBranding({ agencyName: e.target.value })}
                    placeholder="Pacific Crest Luxury Estates"
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Listing Advisor Name
                  </label>
                  <input
                    type="text"
                    value={tour.branding.agentName || ''}
                    onChange={(e) => updateBranding({ agentName: e.target.value })}
                    placeholder="Elena Vance"
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Brand Accent Color
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    {BRAND_SWATCHES.map((swatch) => (
                      <button
                        key={swatch.hex}
                        type="button"
                        title={swatch.name}
                        onClick={() => updateBranding({ primaryColor: swatch.hex })}
                        className={`h-7 w-7 rounded-full border-2 transition-transform ${
                          tour.branding.primaryColor === swatch.hex
                            ? 'border-white scale-110'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col justify-between">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    SceneFlow Attribution
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      updateBranding({
                        hideSceneFlowBranding: !tour.branding.hideSceneFlowBranding,
                      })
                    }
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                      tour.branding.hideSceneFlowBranding
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                        : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {tour.branding.hideSceneFlowBranding ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        100% White-Label (Hidden)
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        Showing Powered By Badge
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'sandbox' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-5">
              <div>
                <h1 className="text-lg font-bold text-white">
                  N/E/S/W Blueprint Studio — Powered by Vercel AI Gateway &amp; Vercel Blob
                </h1>
                <p className="mt-1 text-xs text-slate-300 max-w-2xl">
                  Upload 1–4 real smartphone photos (<strong className="text-white">North, East, South, West</strong>), run live cross-angle AI virtual staging via <strong className="text-cyan-300">Vercel AI Gateway</strong>, and publish a permanent shareable white-label link on <strong className="text-cyan-300">Vercel Blob</strong> — zero login and zero GCP required.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('player')}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  <Compass className="h-4 w-4 text-cyan-400" />
                  Preview in Player
                </button>
                <button
                  type="button"
                  onClick={handlePublishToVercelBlob}
                  disabled={publishing}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-60 transition-colors"
                >
                  {publishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CloudUpload className="h-4 w-4" />
                  )}
                  Publish Live Link
                </button>
              </div>
            </div>

            {/* Room Selector + Add Room */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap">
                {tour.rooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`shrink-0 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                      selectedRoom?.id === room.id
                        ? 'border-cyan-500 bg-cyan-500/15 text-white'
                        : 'border-white/10 bg-slate-900/80 text-slate-400 hover:text-white'
                    }`}
                  >
                    {room.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 sm:ml-auto w-full sm:w-auto">
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddLocalRoom()
                  }}
                  placeholder="Add room (e.g. Primary Suite)"
                  className="min-w-0 flex-1 sm:w-52 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddLocalRoom}
                  className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
            </div>

            {/* Vercel AI Gateway Cross-Angle Staging Bar */}
            {selectedRoom && (
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-3.5 sm:p-4 space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Redesign Style
                    </label>
                    <select
                      value={genStyle}
                      onChange={(e) => setGenStyle(e.target.value as PropertyStyleId)}
                      className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    >
                      {PROPERTY_STYLE_PRESETS.filter((s) => s.id !== 'as_is').map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Lighting
                    </label>
                    <select
                      value={genLighting}
                      onChange={(e) => setGenLighting(e.target.value as PropertyLightingId)}
                      className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    >
                      {PROPERTY_LIGHTING_PRESETS.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-amber-300 mb-1">
                      Event Scenario
                    </label>
                    <select
                      value={genEvent}
                      onChange={(e) => setGenEvent(e.target.value as PropertyEventId)}
                      className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    >
                      {PROPERTY_EVENT_PRESETS.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-300 mb-1">
                      Architectural Addition
                    </label>
                    <select
                      value={genAddition}
                      onChange={(e) => setGenAddition(e.target.value as PropertyAdditionId)}
                      className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    >
                      {PROPERTY_ADDITION_PRESETS.map((add) => (
                        <option key={add.id} value={add.id}>
                          {add.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleStageAllWalls}
                    disabled={stagingDir !== null}
                    className="w-full sm:col-span-2 lg:col-span-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-400 px-4 py-2.5 lg:py-2 text-xs font-bold text-slate-950 hover:opacity-95 disabled:opacity-60 transition-opacity"
                  >
                    {stagingDir === 'ALL' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    {stagingDir === 'ALL'
                      ? 'Generating N→E→S→W...'
                      : 'Generate N→E→S→W'}
                  </button>
                </div>

                {/* Pre-Render Production Credit Guardrail */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-[11px] text-slate-300">
                  <span>
                    <strong className="text-emerald-300">Pre-Render Credit Estimate:</strong>{' '}
                    Single wall <span className="font-mono text-white">~30 cr</span> · All 4 N→E→S→W walls{' '}
                    <span className="font-mono text-white">~120 cr</span> · Full 60-Min Cinema + EN/ES/JA pack{' '}
                    <span className="font-mono text-white">~5,500–9,000 cr</span>
                  </span>
                  <span className="text-[10px] font-semibold text-cyan-300">
                    0 cr marginal viewer playback cost
                  </span>
                </div>

                {stagingMessage && (
                  <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-3 py-2 text-xs text-cyan-200">
                    {stagingMessage}
                  </div>
                )}
                {stagingError && (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">
                    {stagingError}
                  </div>
                )}
              </div>
            )}

            {/* 4-Wall N/E/S/W Upload & AI Stage Grid */}
            {selectedRoom && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {COMPASS_DIRECTIONS.map((dir) => {
                  const perspective = selectedRoom.perspectives[dir]
                  const stagedImg = perspective.variants[0]?.imageUrl || ''
                  const previewImg = stagedImg || perspective.originalImageUrl || ''
                  const inputKey = `${selectedRoom.id}-${dir}`
                  const isWallGenerating = stagingDir === dir || stagingDir === 'ALL'

                  return (
                    <div
                      key={dir}
                      className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/15 text-xs font-bold text-cyan-300 border border-cyan-500/30">
                            {dir}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-white">
                              {DIRECTION_LABELS[dir]}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {perspective.label || `${dir} Wall`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[inputKey]?.click()}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-white/10"
                          >
                            <Upload className="h-3 w-3 text-cyan-400" />
                            Upload Photo
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStageWall(dir)}
                            disabled={stagingDir !== null}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50"
                          >
                            {isWallGenerating ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                            AI Stage Wall
                          </button>
                        </div>
                        <input
                          ref={(el) => {
                            fileInputRefs.current[inputKey] = el
                          }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            void handleLocalPhotoDrop(
                              selectedRoom.id,
                              dir,
                              e.target.files?.[0] || null
                            )
                          }}
                        />
                      </div>

                      <div className="relative aspect-video bg-slate-950">
                        {previewImg ? (
                          <>
                            <img
                              src={previewImg}
                              alt={`${selectedRoom.name} ${dir}`}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute bottom-2 left-2 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-semibold text-slate-200 backdrop-blur-sm">
                              {stagedImg
                                ? `AI Vision (${perspective.variants.length} variant${perspective.variants.length === 1 ? '' : 's'})`
                                : 'Original Smartphone Photo'}
                            </div>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[inputKey]?.click()}
                            className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-500 hover:text-cyan-300 transition-colors"
                          >
                            <Camera className="h-8 w-8" />
                            <span className="text-xs font-medium">
                              Drop or select {dir} wall smartphone photo
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'embed' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Embed & Standalone Links */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-white">
                    {publishedSlug
                      ? 'Your Published Vercel Blob Tour is Live!'
                      : 'Standalone & Frameless Embed Links'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    {publishedSlug
                      ? 'Stored directly on Vercel Blob CDN — share this white-label link or embed it in any MLS/brokerage site right now.'
                      : 'Every tour works as a standalone white-label microsite (/tour/[slug]) and as a frameless iframe embed (?embed=1) with frame-ancestors * enabled.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePublishToVercelBlob}
                  disabled={publishing}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
                >
                  {publishing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CloudUpload className="h-3.5 w-3.5" />
                  )}
                  {publishedSlug ? 'Republish' : 'Publish Custom'}
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Standalone White-Label URL (Zero Login)
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      readOnly
                      value={embedUrls.shareUrl}
                      className="flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-cyan-300 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy('share', embedUrls.shareUrl)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                    >
                      {copiedKey === 'share' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Frameless Embed URL
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      readOnly
                      value={embedUrls.embedUrl}
                      className="flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-cyan-300 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy('embed', embedUrls.embedUrl)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                    >
                      {copiedKey === 'embed' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Responsive HTML &lt;iframe&gt; Snippet
                  </label>
                  <div className="mt-1 space-y-2">
                    <textarea
                      readOnly
                      rows={4}
                      value={embedUrls.iframeCode}
                      className="w-full rounded-lg border border-white/10 bg-slate-950 p-3 text-[11px] text-slate-300 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy('iframe', embedUrls.iframeCode)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
                    >
                      {copiedKey === 'iframe' ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Copy Embed Code
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Dual-Layer VSP Commercial Terms + Pre-Render Production Estimator */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-white">
                    Dual-Layer VSP Commercial Inputs (Hosting Slots vs. AI Credits)
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    SceneFlow cleanly separates <strong className="text-slate-200">Layer 1 (Platform Subscription &amp; Active Listing Hosting Slots)</strong> from <strong className="text-slate-200">Layer 2 (Vertex AI / AI Gateway Production Credits)</strong> — zero marginal AI cost on viewer playback.
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                  Illustrative Sample Portal Only
                </span>
              </div>

              {/* Layer 1: Hosting Slot Metering */}
              <div className="rounded-xl border border-white/10 bg-slate-950 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-cyan-300">
                    Layer 1 · Active Hosted Listing Slots (Idempotent Monthly Access)
                  </div>
                  <span className="text-[11px] font-semibold text-slate-300">
                    Extra Slot Add-On: {EXTRA_ACTIVE_LISTING_MONTHLY_CREDITS} cr/mo
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                  {[
                    { label: 'Explorer', slots: INCLUDED_ACTIVE_LISTINGS_BY_TIER.explorer },
                    { label: 'Creator', slots: INCLUDED_ACTIVE_LISTINGS_BY_TIER.hobbyist },
                    { label: 'Filmmaker', slots: INCLUDED_ACTIVE_LISTINGS_BY_TIER.starter },
                    { label: 'Operator Pro', slots: INCLUDED_ACTIVE_LISTINGS_BY_TIER.pro },
                    { label: 'Agency Studio', slots: INCLUDED_ACTIVE_LISTINGS_BY_TIER.studio },
                    { label: 'Enterprise', slots: 'Unlimited' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-2"
                    >
                      <span className="text-slate-400">{item.label}</span>
                      <span className="font-bold text-white">{item.slots}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Layer 2: Pre-Render Production Credit Estimator */}
              <div className="rounded-xl border border-white/10 bg-slate-950 p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-emerald-300">
                    Layer 2 · Pre-Render AI Production Credit Estimates (Before Generating)
                  </div>
                  <span className="text-[10px] text-slate-400">0 cr marginal playback cost</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  {[
                    {
                      config: 'Stills + Virtual Staging Pass (3–5 rooms × 4 walls)',
                      credits: '~360–600 cr',
                    },
                    {
                      config: 'Multi-Angle Motion + Events & Additions Pack',
                      credits: '~2,400–4,200 cr',
                    },
                    {
                      config: 'Full 60-Min Cinema + EN / ES / JA Narration & Agent Sync',
                      credits: '~5,500–9,000 cr',
                    },
                  ].map((row) => (
                    <div
                      key={row.config}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
                    >
                      <span className="text-slate-300">{row.config}</span>
                      <span className="shrink-0 font-mono font-bold text-white">{row.credits}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/25 bg-amber-950/15 px-3.5 py-2.5 text-[11px] text-slate-300">
                <strong className="text-amber-200">Illustrative Sample Portal Only:</strong>{' '}
                Downstream brokerage pricing, client bundles, and agency margins are determined
                entirely and independently by each VSP. SceneFlow bills strictly on VSP platform
                access, active hosting slots, and AI production credits.
              </div>

              <div className="pt-1">
                <Link
                  href="/dashboard/property-tours"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  Open Full Agency Cloud Dashboard (Multi-Listing Billing)
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'script' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-cyan-500/25 bg-slate-900/90 p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-cyan-400" />
                    All-in-One Media Production Script (`scripts/generate-property-tour-media.ts`)
                  </h2>
                  <p className="mt-1 text-xs text-slate-300 max-w-3xl">
                    Run one command to generate every asset supporting <strong className="text-white">Events</strong>, <strong className="text-white">Redesigns</strong>, <strong className="text-white">Additions</strong>, <strong className="text-white">In-Scene Agent Lip-Sync vs. Narration (EN / ES / JA)</strong>, and <strong className="text-white">Ambient Music</strong> — with optional direct upload to Vercel Blob CDN.
                  </p>
                </div>
                <a
                  href="/media/property-tours/demo/property-tour-media-manifest.json"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Inspect 30-Job Manifest JSON
                </a>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {[
                  {
                    key: 'cmd-openai',
                    title: '1. Studio EN/ES/JA Voice (OpenAI HD) + Music + Clip Manifest + Vercel Blob',
                    cmd: 'npx tsx scripts/generate-property-tour-media.ts --tts=openai --music=synth --clips=manifest --upload-blob',
                    note: 'Uses OPENAI_API_KEY (tts-1-hd: nova for Narration, shimmer for Agent Elena) across EN, ES, and JA + uploads MP3s & WAV loops to Vercel Blob.',
                  },
                  {
                    key: 'cmd-elevenlabs',
                    title: '2. Cloned Agent Voice (ElevenLabs Multilingual v2) + Music + Clips',
                    cmd: 'npx tsx scripts/generate-property-tour-media.ts --tts=elevenlabs --music=synth --clips=fal --upload-blob',
                    note: 'Uses ELEVENLABS_API_KEY (eleven_multilingual_v2) for cloned listing advisor voice across English, Spanish, and Japanese + queues 30 Kling/Lip-Sync clip jobs.',
                  },
                  {
                    key: 'cmd-free',
                    title: '3. Free Local Synth + Edge Neural TTS (Zero API Cost)',
                    cmd: 'npm run property-tours:generate-media',
                    note: 'Generates 18 neural MP3 voice tracks via edge-tts-universal + 2 stereo ambient WAV music loops + complete 30-job video & lip-sync manifest.',
                  },
                  {
                    key: 'cmd-dryrun',
                    title: '4. Dry-Run Preview & Cost Estimator',
                    cmd: 'npx tsx scripts/generate-property-tour-media.ts --dry-run',
                    note: 'Lists all 18 EN/ES/JA dialogue tracks, 2 ambient music loops, 12 N→E→S→W pan clips, Event/Addition motion loops, and 9 In-Scene Agent lip-sync clips without spending credits.',
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="rounded-xl border border-white/10 bg-slate-950 p-4 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white">{item.title}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.key, item.cmd)}
                        className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/10"
                      >
                        {copiedKey === item.key ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        Copy
                      </button>
                    </div>
                    <pre className="overflow-x-auto rounded-lg bg-black/70 p-2.5 text-[11px] text-cyan-300 font-mono">
                      {item.cmd}
                    </pre>
                    <p className="text-[11px] text-slate-400">{item.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
