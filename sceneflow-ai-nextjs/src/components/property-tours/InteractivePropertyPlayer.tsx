'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BedDouble,
  Bath,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  ExternalLink,
  Film,
  Home,
  Image as ImageIcon,
  Info,
  Loader2,
  Mail,
  MapPin,
  Maximize2,
  MessageSquare,
  Minimize2,
  Moon,
  Phone,
  Send,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Sunset,
  X,
} from 'lucide-react'
import {
  COMPASS_DIRECTIONS,
  PROPERTY_LIFESTYLE_PRESETS,
  PROPERTY_LIGHTING_PRESETS,
  PROPERTY_STYLE_PRESETS,
  getNextClockwiseDirection,
  getPrevClockwiseDirection,
  resolvePerspectiveAsset,
  type CompassDirection,
  type PropertyLifestyleId,
  type PropertyLightingId,
  type PropertyRoom,
  type PropertyStyleId,
  type PropertyTourDTO,
} from '@/lib/propertyTours/types'

export interface InteractivePropertyPlayerProps {
  tour: PropertyTourDTO
  isEmbed?: boolean
  isPreview?: boolean
}

type InquiryType = 'schedule_showing' | 'renovation_quote' | 'financing_info' | 'general'

const COMPASS_FULL_LABELS: Record<CompassDirection, string> = {
  N: 'North',
  E: 'East',
  S: 'South',
  W: 'West',
}

const COMPASS_ROTATION_DEG: Record<CompassDirection, number> = {
  N: 0,
  E: 90,
  S: 180,
  W: 270,
}

const INQUIRY_TYPE_OPTIONS: Array<{ id: InquiryType; label: string; description: string }> = [
  {
    id: 'schedule_showing',
    label: 'Schedule Private Showing',
    description: 'Book an in-person or live virtual walkthrough',
  },
  {
    id: 'renovation_quote',
    label: 'Request Renovation Quote',
    description: 'Get contractor pricing for the AI design concept shown',
  },
  {
    id: 'financing_info',
    label: 'Financing & Reno Loan Info',
    description: 'Explore purchase + renovation loan options',
  },
  {
    id: 'general',
    label: 'General Property Inquiry',
    description: 'Ask about disclosures, HOA, or neighborhood details',
  },
]

function formatCurrencyFull(amount?: number | null): string | null {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return null
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatCurrencyCompact(amount?: number | null): string | null {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return null
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000
    return `$${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(2)}M`
  }
  if (amount >= 1_000) {
    return `$${Math.round(amount / 1_000)}k`
  }
  return `$${Math.round(amount)}`
}

function formatNumber(val?: number | null): string | null {
  if (val == null || !Number.isFinite(val) || val <= 0) return null
  return new Intl.NumberFormat('en-US').format(val)
}

function getRotationSign(from: CompassDirection, to: CompassDirection): 1 | -1 | 0 {
  if (from === to) return 0
  if (getNextClockwiseDirection(from) === to) return 1
  if (getPrevClockwiseDirection(from) === to) return -1
  return 0
}

function pickInitialStyle(
  room: PropertyRoom | undefined,
  availableStyles: PropertyStyleId[]
): PropertyStyleId {
  const styles = availableStyles.length > 0 ? availableStyles : (['as_is', 'modern_coastal'] as PropertyStyleId[])
  if (room) {
    const anchor = room.perspectives[room.anchorDirection] ?? room.perspectives.N
    const firstVariant = anchor?.variants?.[0]
    if (firstVariant && styles.includes(firstVariant.style)) {
      return firstVariant.style
    }
  }
  const firstModified = styles.find((s) => s !== 'as_is')
  return firstModified ?? styles[0] ?? 'as_is'
}

export function InteractivePropertyPlayer({
  tour,
  isEmbed = false,
  isPreview = false,
}: InteractivePropertyPlayerProps) {
  const sortedRooms = useMemo(
    () => [...(tour.rooms || [])].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
    [tour.rooms]
  )

  const initialRoom = useMemo(() => {
    if (tour.defaultRoomId) {
      const found = sortedRooms.find((r) => r.id === tour.defaultRoomId)
      if (found) return found
    }
    return sortedRooms[0]
  }, [sortedRooms, tour.defaultRoomId])

  const availableStylePresets = useMemo(() => {
    const allowed = new Set<PropertyStyleId>(
      tour.availableStyles?.length ? tour.availableStyles : ['as_is', 'modern_coastal']
    )
    const filtered = PROPERTY_STYLE_PRESETS.filter((p) => allowed.has(p.id))
    return filtered.length > 0 ? filtered : PROPERTY_STYLE_PRESETS.slice(0, 2)
  }, [tour.availableStyles])

  const availableLightingPresets = useMemo(() => {
    const allowed = new Set<PropertyLightingId>(
      tour.availableLighting?.length ? tour.availableLighting : ['daylight', 'golden_hour', 'twilight']
    )
    const filtered = PROPERTY_LIGHTING_PRESETS.filter((p) => allowed.has(p.id))
    return filtered.length > 0 ? filtered : PROPERTY_LIGHTING_PRESETS
  }, [tour.availableLighting])

  const availableLifestylePresets = useMemo(() => {
    const allowed = new Set<PropertyLifestyleId>(
      tour.availableLifestyles?.length
        ? tour.availableLifestyles
        : ['architectural', 'quiet_morning', 'entertaining']
    )
    const filtered = PROPERTY_LIFESTYLE_PRESETS.filter((p) => allowed.has(p.id))
    return filtered.length > 0 ? filtered : PROPERTY_LIFESTYLE_PRESETS
  }, [tour.availableLifestyles])

  const [activeRoomId, setActiveRoomId] = useState<string>(initialRoom?.id ?? '')
  const [direction, setDirection] = useState<CompassDirection>(initialRoom?.anchorDirection ?? 'N')
  const [slideDir, setSlideDir] = useState<1 | -1 | 0>(0)
  const [selectedStyle, setSelectedStyle] = useState<PropertyStyleId>(() =>
    pickInitialStyle(initialRoom, tour.availableStyles || [])
  )
  const [selectedLighting, setSelectedLighting] = useState<PropertyLightingId>(
    () => availableLightingPresets[0]?.id ?? 'daylight'
  )
  const [selectedLifestyle, setSelectedLifestyle] = useState<PropertyLifestyleId>(
    () => availableLifestylePresets[0]?.id ?? 'architectural'
  )

  const [compareMode, setCompareMode] = useState(false)
  const [splitPercent, setSplitPercent] = useState(50)
  const [isDraggingSplit, setIsDraggingSplit] = useState(false)
  const [preferMotion, setPreferMotion] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showEmbedSpecs, setShowEmbedSpecs] = useState(false)

  // Lead drawer state
  const [leadDrawerOpen, setLeadDrawerOpen] = useState(false)
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [inquiryType, setInquiryType] = useState<InquiryType>('schedule_showing')
  const [buyerMessage, setBuyerMessage] = useState('')
  const [leadSubmitting, setLeadSubmitting] = useState(false)
  const [leadError, setLeadError] = useState<string | null>(null)
  const [leadSuccessMsg, setLeadSuccessMsg] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  // Sync activeRoomId if tour rooms update (e.g. inside live Studio Preview)
  useEffect(() => {
    if (!sortedRooms.length) return
    if (!sortedRooms.some((r) => r.id === activeRoomId)) {
      const nextRoom =
        (tour.defaultRoomId && sortedRooms.find((r) => r.id === tour.defaultRoomId)) || sortedRooms[0]
      if (nextRoom) {
        setActiveRoomId(nextRoom.id)
        setDirection(nextRoom.anchorDirection ?? 'N')
      }
    }
  }, [sortedRooms, activeRoomId, tour.defaultRoomId])

  const activeRoom = useMemo(
    () => sortedRooms.find((r) => r.id === activeRoomId) ?? sortedRooms[0],
    [sortedRooms, activeRoomId]
  )

  const activePerspective = activeRoom?.perspectives?.[direction]

  const resolved = useMemo(
    () =>
      resolvePerspectiveAsset(activePerspective, {
        style: selectedStyle,
        lighting: selectedLighting,
        lifestyle: selectedLifestyle,
        showOriginal: selectedStyle === 'as_is',
      }),
    [activePerspective, selectedStyle, selectedLighting, selectedLifestyle]
  )

  const canCompare = Boolean(
    activePerspective?.originalImageUrl && !resolved.isOriginal && resolved.imageUrl
  )

  // Turn off compare mode automatically if current view doesn't support before/after
  useEffect(() => {
    if (!canCompare && compareMode) {
      setCompareMode(false)
    }
  }, [canCompare, compareMode])

  const brandColor = tour.branding?.primaryColor?.trim() || '#06b6d4'
  const hideSceneFlowBranding = Boolean(tour.branding?.hideSceneFlowBranding)
  const disclosureText =
    tour.branding?.disclosureText?.trim() || 'Virtually Staged · Concept Visualization'
  const ctaLabel = tour.branding?.ctaLabel?.trim() || 'Schedule Showing / Request Quote'

  const activeStylePreset = useMemo(
    () => PROPERTY_STYLE_PRESETS.find((s) => s.id === selectedStyle) ?? PROPERTY_STYLE_PRESETS[0],
    [selectedStyle]
  )

  const navigateToDirection = useCallback(
    (next: CompassDirection) => {
      setDirection((prev) => {
        if (prev === next) return prev
        setSlideDir(getRotationSign(prev, next))
        return next
      })
    },
    []
  )

  const rotateClockwise = useCallback(() => {
    setDirection((prev) => {
      setSlideDir(1)
      return getNextClockwiseDirection(prev)
    })
  }, [])

  const rotateCounterClockwise = useCallback(() => {
    setDirection((prev) => {
      setSlideDir(-1)
      return getPrevClockwiseDirection(prev)
    })
  }, [])

  const handleSelectRoom = useCallback(
    (room: PropertyRoom) => {
      setSlideDir(0)
      setActiveRoomId(room.id)
      setDirection(room.anchorDirection ?? 'N')
    },
    []
  )

  // Keyboard shortcuts (ArrowLeft / ArrowRight)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (leadDrawerOpen) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        rotateClockwise()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        rotateCounterClockwise()
      } else if (e.key === 'Escape' && compareMode) {
        setCompareMode(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [rotateClockwise, rotateCounterClockwise, leadDrawerOpen, compareMode])

  // Fullscreen listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement && containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen()
      } else if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen()
      }
    } catch {
      // Ignore fullscreen restrictions in sandboxed iframes
    }
  }, [])

  // Compare slider pointer handling
  const updateSplitFromClientX = useCallback((clientX: number) => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0) return
    const pct = ((clientX - rect.left) / rect.width) * 100
    setSplitPercent(Math.max(4, Math.min(96, pct)))
  }, [])

  const handleSplitPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!compareMode) return
      e.currentTarget.setPointerCapture(e.pointerId)
      setIsDraggingSplit(true)
      updateSplitFromClientX(e.clientX)
    },
    [compareMode, updateSplitFromClientX]
  )

  const handleSplitPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!compareMode || !isDraggingSplit) return
      updateSplitFromClientX(e.clientX)
    },
    [compareMode, isDraggingSplit, updateSplitFromClientX]
  )

  const handleSplitPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    setIsDraggingSplit(false)
  }, [])

  // Touch swipe left/right on stage (disabled while Compare slider is active)
  const handleStageTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (compareMode || e.touches.length !== 1) return
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    },
    [compareMode]
  )

  const handleStageTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (compareMode || !touchStartRef.current || e.changedTouches.length !== 1) return
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y
      touchStartRef.current = null
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        if (dx < 0) {
          rotateClockwise()
        } else {
          rotateCounterClockwise()
        }
      }
    },
    [compareMode, rotateClockwise, rotateCounterClockwise]
  )

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!buyerName.trim() || !buyerEmail.trim()) {
      setLeadError('Please provide your name and email address.')
      return
    }
    setLeadSubmitting(true)
    setLeadError(null)
    try {
      const res = await fetch(`/api/tour/${encodeURIComponent(tour.slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerName: buyerName.trim(),
          buyerEmail: buyerEmail.trim(),
          buyerPhone: buyerPhone.trim() || undefined,
          inquiryType,
          selectedRoomName: activeRoom?.name || undefined,
          selectedStyle: activeStylePreset.label,
          message: buyerMessage.trim() || undefined,
          website: '',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Could not submit inquiry. Please try again.')
      }
      setLeadSuccessMsg(
        data.message || 'Your inquiry has been sent directly to the listing specialist.'
      )
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : 'Unable to send inquiry.')
    } finally {
      setLeadSubmitting(false)
    }
  }

  const resetLeadForm = () => {
    setLeadSuccessMsg(null)
    setLeadError(null)
    setBuyerMessage('')
  }

  const specs = tour.propertySpecs || {}
  const formattedPrice = formatCurrencyFull(specs.priceUsd)
  const formattedSqft = formatNumber(specs.sqft)
  const hasSpecsStrip = Boolean(
    formattedPrice ||
      specs.beds ||
      specs.baths ||
      formattedSqft ||
      tour.propertyAddress ||
      specs.mlsNumber
  )

  const stageKey = `${activeRoom?.id ?? 'none'}-${direction}-${resolved.variant?.id ?? (resolved.isOriginal ? 'orig' : 'empty')}-${selectedStyle}-${selectedLighting}-${selectedLifestyle}`

  const showMotionVideo = Boolean(resolved.motionVideoUrl && preferMotion && !compareMode)

  const stageVariants = {
    enter: (dir: number) => ({
      opacity: 0,
      x: dir === 0 ? 0 : dir > 0 ? 72 : -72,
      scale: dir === 0 ? 1.015 : 1,
    }),
    center: {
      opacity: 1,
      x: 0,
      scale: 1,
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir === 0 ? 0 : dir > 0 ? -72 : 72,
      scale: dir === 0 ? 0.99 : 1,
    }),
  }

  const rootClasses = isPreview
    ? 'relative flex flex-col w-full rounded-2xl overflow-hidden bg-slate-950 text-white border border-slate-800 shadow-2xl'
    : isEmbed
      ? 'relative flex flex-col w-full h-screen min-h-[540px] bg-slate-950 text-white overflow-hidden'
      : 'relative flex flex-col w-full min-h-screen bg-slate-950 text-white'

  return (
    <div
      ref={containerRef}
      className={rootClasses}
      style={{ '--brand-color': brandColor } as React.CSSProperties}
    >
      {/* Top White-Label Agency & Agent Bar */}
      <header
        className={`z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-950/90 backdrop-blur-md ${
          isEmbed ? 'px-3 py-2' : 'px-4 py-3 md:px-6'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {tour.branding?.logoUrl ? (
            <img
              src={tour.branding.logoUrl}
              alt={tour.branding.agencyName || tour.title}
              className="h-9 w-auto max-w-[140px] rounded-md object-contain bg-white/5 p-1"
            />
          ) : (
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white shadow-inner"
              style={{ backgroundColor: `${brandColor}24`, borderColor: `${brandColor}55` }}
            >
              <Building2 className="h-4 w-4" style={{ color: brandColor }} />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {tour.branding?.agencyName && (
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider truncate"
                  style={{ color: brandColor }}
                >
                  {tour.branding.agencyName}
                </span>
              )}
              {isPreview && (
                <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                  Studio Preview
                </span>
              )}
            </div>
            <h1 className="truncate text-sm font-semibold text-white md:text-base">
              {tour.title}
            </h1>
          </div>
        </div>

        {/* Agent Contact & Primary CTA */}
        <div className="flex items-center gap-2 sm:gap-3">
          {(tour.branding?.agentName || tour.branding?.agentPhone) && !isEmbed && (
            <div className="hidden items-center gap-2.5 border-r border-white/10 pr-3 lg:flex">
              {tour.branding?.agentPhotoUrl ? (
                <img
                  src={tour.branding.agentPhotoUrl}
                  alt={tour.branding.agentName || 'Listing Agent'}
                  className="h-8 w-8 rounded-full object-cover ring-1 ring-white/20"
                />
              ) : null}
              <div className="text-right leading-tight">
                {tour.branding?.agentName && (
                  <p className="text-xs font-semibold text-white">{tour.branding.agentName}</p>
                )}
                <div className="flex items-center justify-end gap-2 text-[11px] text-slate-400">
                  {tour.branding?.agentTitle && <span>{tour.branding.agentTitle}</span>}
                  {tour.branding?.agentPhone && (
                    <a
                      href={`tel:${tour.branding.agentPhone}`}
                      className="inline-flex items-center gap-1 text-slate-300 hover:text-white transition-colors"
                    >
                      <Phone className="h-3 w-3" />
                      {tour.branding.agentPhone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {isEmbed && hasSpecsStrip && (
            <button
              type="button"
              onClick={() => setShowEmbedSpecs((s) => !s)}
              aria-label="Toggle property specifications"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors"
            >
              <Info className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Specs</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              resetLeadForm()
              setLeadDrawerOpen(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-950 shadow-lg transition-transform hover:brightness-110 active:scale-[0.98] sm:text-sm"
            style={{ backgroundColor: brandColor }}
          >
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>{ctaLabel}</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Property Specs Strip (always visible in standalone/preview, collapsible in embed) */}
      {hasSpecsStrip && (!isEmbed || showEmbedSpecs) && (
        <div className="z-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-white/10 bg-slate-900/80 px-4 py-2 text-xs text-slate-300 md:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {formattedPrice && (
              <span className="text-sm font-bold text-white">{formattedPrice}</span>
            )}
            {specs.beds != null && specs.beds > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <BedDouble className="h-3.5 w-3.5 text-slate-400" />
                <strong className="text-white">{specs.beds}</strong> Beds
              </span>
            )}
            {specs.baths != null && specs.baths > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Bath className="h-3.5 w-3.5 text-slate-400" />
                <strong className="text-white">{specs.baths}</strong> Baths
              </span>
            )}
            {formattedSqft && (
              <span className="inline-flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5 text-slate-400" />
                <strong className="text-white">{formattedSqft}</strong> Sq Ft
              </span>
            )}
            {specs.mlsNumber && (
              <span className="text-slate-400">MLS #{specs.mlsNumber}</span>
            )}
          </div>
          {tour.propertyAddress && (
            <div className="inline-flex items-center gap-1.5 text-slate-300">
              <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: brandColor }} />
              <span className="truncate">{tour.propertyAddress}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Cinema Stage Viewport */}
      <div
        className={`relative flex-1 bg-black ${
          isEmbed ? 'min-h-0' : 'w-full'
        }`}
      >
        <div
          ref={stageRef}
          onTouchStart={handleStageTouchStart}
          onTouchEnd={handleStageTouchEnd}
          onPointerDown={handleSplitPointerDown}
          onPointerMove={handleSplitPointerMove}
          onPointerUp={handleSplitPointerUp}
          onPointerCancel={handleSplitPointerUp}
          className={`relative w-full overflow-hidden bg-slate-950 select-none ${
            isEmbed
              ? 'h-full min-h-[280px]'
              : 'aspect-video max-h-[72vh] mx-auto'
          } ${compareMode ? 'cursor-ew-resize touch-none' : ''}`}
        >
          {/* Animated N/E/S/W Perspective Visual */}
          <AnimatePresence initial={false} custom={slideDir} mode="popLayout">
            <motion.div
              key={stageKey}
              custom={slideDir}
              variants={stageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 h-full w-full"
            >
              {resolved.imageUrl ? (
                compareMode && activePerspective?.originalImageUrl ? (
                  <>
                    {/* Right Layer: AI Vision */}
                    <img
                      src={resolved.imageUrl}
                      alt={`${activeRoom?.name || 'Room'} — ${COMPASS_FULL_LABELS[direction]} AI Vision`}
                      draggable={false}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    {/* Left Layer: Original Property Photo clipped at splitPercent */}
                    <div
                      className="absolute inset-0 h-full w-full overflow-hidden"
                      style={{ clipPath: `inset(0 ${100 - splitPercent}% 0 0)` }}
                    >
                      <img
                        src={activePerspective.originalImageUrl}
                        alt={`${activeRoom?.name || 'Room'} — ${COMPASS_FULL_LABELS[direction]} Original Photo`}
                        draggable={false}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                  </>
                ) : showMotionVideo && resolved.motionVideoUrl ? (
                  <video
                    key={resolved.motionVideoUrl}
                    src={resolved.motionVideoUrl}
                    poster={resolved.imageUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={resolved.imageUrl}
                    alt={`${activeRoom?.name || 'Property'} — ${COMPASS_FULL_LABELS[direction]} view`}
                    draggable={false}
                    className="h-full w-full object-cover"
                  />
                )
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 text-center">
                  <Compass className="mb-3 h-10 w-10 text-slate-600" />
                  <p className="text-sm font-medium text-slate-300">
                    No perspective uploaded for {activeRoom?.name || 'this room'} (
                    {COMPASS_FULL_LABELS[direction]})
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Rotate the compass to inspect other walls or upload a photo in Studio Builder.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Subtle top & bottom gradient scrims for legible overlays */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 via-black/25 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Split-Screen Divider Handle & Labels */}
          {compareMode && canCompare && (
            <>
              <div
                className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-white shadow-[0_0_14px_rgba(0,0,0,0.85)]"
                style={{ left: `${splitPercent}%` }}
              >
                <div
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-950/90 text-white shadow-xl"
                  style={{ borderColor: brandColor }}
                >
                  <SlidersHorizontal className="h-4 w-4" style={{ color: brandColor }} />
                </div>
              </div>
              {/* Accessible keyboard slider for compare position */}
              <input
                type="range"
                min={4}
                max={96}
                value={Math.round(splitPercent)}
                onChange={(e) => setSplitPercent(Number(e.target.value))}
                aria-label="Compare original photo and AI vision"
                className="sr-only"
              />
              <div className="pointer-events-none absolute left-4 bottom-16 z-20 rounded-full border border-white/20 bg-black/75 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                Original Property Photo
              </div>
              <div
                className="pointer-events-none absolute right-4 bottom-16 z-20 rounded-full border px-3 py-1 text-xs font-semibold text-white backdrop-blur-md"
                style={{
                  backgroundColor: 'rgba(2, 6, 23, 0.8)',
                  borderColor: `${brandColor}99`,
                }}
              >
                AI Vision · {activeStylePreset.shortLabel}
              </div>
            </>
          )}

          {/* Top-Left: MLS Compliance Disclosure Pill (auto-hidden when viewing Original) */}
          <div className="absolute left-3 top-3 z-20 flex flex-wrap items-center gap-2 sm:left-4 sm:top-4">
            {!resolved.isOriginal && resolved.isVirtuallyModified && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/65 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md shadow-md">
                <Sparkles className="h-3 w-3 shrink-0" style={{ color: brandColor }} />
                <span>{disclosureText}</span>
              </div>
            )}
            {resolved.isOriginal && resolved.imageUrl && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-black/65 px-3 py-1 text-[11px] font-medium text-emerald-200 backdrop-blur-md">
                <ImageIcon className="h-3 w-3 shrink-0 text-emerald-400" />
                <span>Original Property Photo</span>
              </div>
            )}
          </div>

          {/* Top-Right Stage Action Pills: Compare Original + Motion/Still Toggle */}
          <div
            className="absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-4 sm:top-4"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {resolved.motionVideoUrl && !compareMode && (
              <button
                type="button"
                onClick={() => setPreferMotion((m) => !m)}
                aria-label={preferMotion ? 'Switch to still image' : 'Play motion loop'}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/65 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md hover:bg-black/85 transition-colors"
              >
                {preferMotion ? (
                  <>
                    <Film className="h-3.5 w-3.5" style={{ color: brandColor }} />
                    <span>Motion</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-3.5 w-3.5 text-slate-300" />
                    <span>Still</span>
                  </>
                )}
              </button>
            )}

            {canCompare && (
              <button
                type="button"
                onClick={() => setCompareMode((c) => !c)}
                aria-pressed={compareMode}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition-all shadow-md"
                style={
                  compareMode
                    ? {
                        backgroundColor: brandColor,
                        borderColor: brandColor,
                        color: '#020617',
                      }
                    : {
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        borderColor: 'rgba(255,255,255,0.25)',
                        color: '#ffffff',
                      }
                }
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>{compareMode ? 'Exit Compare' : 'Compare Original'}</span>
              </button>
            )}
          </div>

          {/* Left / Right Rotate Arrows on Stage */}
          {!compareMode && (
            <>
              <button
                type="button"
                onClick={rotateCounterClockwise}
                aria-label="Rotate camera counter-clockwise (Left Arrow)"
                className="absolute left-3 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur-md transition-all hover:bg-black/80 hover:scale-105 active:scale-95 sm:h-11 sm:w-11"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={rotateClockwise}
                aria-label="Rotate camera clockwise (Right Arrow)"
                className="absolute right-3 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur-md transition-all hover:bg-black/80 hover:scale-105 active:scale-95 sm:h-11 sm:w-11"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Bottom Stage Overlay: Perspective Label + Interactive 4-Point Compass */}
          <div
            className="absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-end justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 max-w-lg">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                <span>{activeRoom?.name || 'Property Space'}</span>
                {activeRoom?.renovationEstimateUsd ? (
                  <span
                    className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      borderColor: `${brandColor}66`,
                      backgroundColor: `${brandColor}22`,
                      color: '#ffffff',
                    }}
                  >
                    Est. Remodel ~{formatCurrencyCompact(activeRoom.renovationEstimateUsd)}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 truncate text-sm font-semibold text-white drop-shadow sm:text-base">
                {activePerspective?.label || `${COMPASS_FULL_LABELS[direction]} Perspective`}
              </p>
            </div>

            {/* Interactive 4-Point N / E / S / W Compass Control */}
            <div
              role="group"
              aria-label="4-point compass perspective navigation"
              className="flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/80 px-2.5 py-1.5 backdrop-blur-md shadow-xl"
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/5"
                title={`Facing ${COMPASS_FULL_LABELS[direction]}`}
              >
                <Compass
                  className="h-4 w-4 transition-transform duration-300"
                  style={{
                    color: brandColor,
                    transform: `rotate(${COMPASS_ROTATION_DEG[direction]}deg)`,
                  }}
                />
              </div>
              <div className="flex items-center gap-1">
                {COMPASS_DIRECTIONS.map((dir) => {
                  const persp = activeRoom?.perspectives?.[dir]
                  const hasAsset = Boolean(persp?.originalImageUrl || persp?.variants?.length)
                  const isActive = direction === dir
                  return (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => navigateToDirection(dir)}
                      aria-label={`View ${COMPASS_FULL_LABELS[dir]} wall${persp?.label ? `: ${persp.label}` : ''}`}
                      aria-pressed={isActive}
                      className={`relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        isActive
                          ? 'text-slate-950 shadow-md scale-105'
                          : hasAsset
                            ? 'text-white hover:bg-white/15'
                            : 'text-slate-500 hover:bg-white/10'
                      }`}
                      style={isActive ? { backgroundColor: brandColor } : undefined}
                    >
                      {dir}
                      {hasAsset && !isActive && (
                        <span
                          className="absolute bottom-1 h-1 w-1 rounded-full"
                          style={{ backgroundColor: brandColor }}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Zero-Latency Instant Toggle Control Dock */}
      <div
        className={`z-20 border-t border-white/10 bg-slate-950/95 backdrop-blur-xl ${
          isEmbed ? 'px-3 py-2.5 space-y-2' : 'px-4 py-4 md:px-6 space-y-3.5'
        }`}
      >
        {/* Row 1: Room Selector Rail */}
        {sortedRooms.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-1">
              Spaces
            </span>
            {sortedRooms.map((room) => {
              const isSelected = room.id === activeRoom?.id
              const compactEst = formatCurrencyCompact(room.renovationEstimateUsd)
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => handleSelectRoom(room)}
                  aria-pressed={isSelected}
                  className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    isSelected
                      ? 'text-slate-950 shadow-sm'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:bg-white/10 hover:text-white'
                  }`}
                  style={
                    isSelected
                      ? { backgroundColor: brandColor, borderColor: brandColor }
                      : undefined
                  }
                >
                  <span>{room.name}</span>
                  {compactEst && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        isSelected ? 'bg-black/20 text-slate-950' : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      ~{compactEst}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Row 2: Design Style, Lighting & Lifestyle Instant Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Design Styles */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Design
            </span>
            {availableStylePresets.map((preset) => {
              const isActive = selectedStyle === preset.id
              const hasVariantForStyle =
                preset.id === 'as_is'
                  ? Boolean(activePerspective?.originalImageUrl)
                  : Boolean(activePerspective?.variants?.some((v) => v.style === preset.id))
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setSlideDir(0)
                    setSelectedStyle(preset.id)
                  }}
                  aria-pressed={isActive}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                    isActive
                      ? 'text-white shadow-sm'
                      : 'border-white/10 bg-slate-900/80 text-slate-300 hover:border-white/25 hover:text-white'
                  }`}
                  style={
                    isActive
                      ? {
                          borderColor: brandColor,
                          backgroundColor: `${brandColor}28`,
                        }
                      : undefined
                  }
                >
                  <span>{preset.label}</span>
                  {hasVariantForStyle && (
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: isActive ? brandColor : 'rgba(148, 163, 184, 0.7)',
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Lighting */}
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900/80 p-0.5">
              {availableLightingPresets.map((preset) => {
                const isActive = selectedLighting === preset.id
                const Icon =
                  preset.id === 'daylight' ? Sun : preset.id === 'golden_hour' ? Sunset : Moon
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSlideDir(0)
                      setSelectedLighting(preset.id)
                    }}
                    aria-pressed={isActive}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                      isActive ? 'text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
                    }`}
                    style={isActive ? { backgroundColor: brandColor } : undefined}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{preset.shortLabel}</span>
                  </button>
                )
              })}
            </div>

            {/* Lifestyle */}
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900/80 p-0.5">
              {availableLifestylePresets.map((preset) => {
                const isActive = selectedLifestyle === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSlideDir(0)
                      setSelectedLifestyle(preset.id)
                    }}
                    aria-pressed={isActive}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {preset.shortLabel}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer Attribution (ONLY shown when hideSceneFlowBranding is false) */}
        {!hideSceneFlowBranding && (
          <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[11px] text-slate-500">
            <span>Use ← / → keys or swipe to rotate N · E · S · W perspectives</span>
            <span className="inline-flex items-center gap-1 text-slate-400">
              <Sparkles className="h-3 w-3 text-cyan-400" />
              Powered by SceneFlow Studio
            </span>
          </div>
        )}
      </div>

      {/* White-Label Built-In Lead Capture Drawer */}
      <AnimatePresence>
        {leadDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"
            onClick={() => setLeadDrawerOpen(false)}
          >
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              aria-label="Property Inquiry Form"
              className="flex h-full w-full max-w-md flex-col border-l border-white/15 bg-slate-950 text-white shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
                <div>
                  {tour.branding?.agencyName && (
                    <p
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: brandColor }}
                    >
                      {tour.branding.agencyName}
                    </p>
                  )}
                  <h2 className="mt-0.5 text-lg font-bold text-white">{ctaLabel}</h2>
                  <p className="mt-1 text-xs text-slate-400">{tour.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLeadDrawerOpen(false)}
                  aria-label="Close inquiry drawer"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-5">
                {/* Active Viewing Context Pill */}
                <div className="mb-5 rounded-xl border border-white/10 bg-slate-900/90 p-3 text-xs">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Attached Viewing Context
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-white/10 px-2 py-0.5 font-medium text-white">
                      {activeRoom?.name || 'Property Overview'}
                    </span>
                    <span
                      className="rounded-md px-2 py-0.5 font-medium text-white"
                      style={{ backgroundColor: `${brandColor}30`, color: brandColor }}
                    >
                      {activeStylePreset.label}
                    </span>
                  </div>
                </div>

                {leadSuccessMsg ? (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
                    <h3 className="mt-3 text-base font-semibold text-white">Inquiry Received</h3>
                    <p className="mt-2 text-sm text-slate-300">{leadSuccessMsg}</p>
                    {(tour.branding?.agentName ||
                      tour.branding?.agentPhone ||
                      tour.branding?.agentEmail) && (
                      <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/70 p-3 text-left text-xs space-y-1">
                        {tour.branding.agentName && (
                          <p className="font-semibold text-white">{tour.branding.agentName}</p>
                        )}
                        {tour.branding.agentTitle && (
                          <p className="text-slate-400">{tour.branding.agentTitle}</p>
                        )}
                        {tour.branding.agentPhone && (
                          <a
                            href={`tel:${tour.branding.agentPhone}`}
                            className="flex items-center gap-1.5 text-slate-200 hover:underline pt-1"
                          >
                            <Phone className="h-3.5 w-3.5" style={{ color: brandColor }} />
                            {tour.branding.agentPhone}
                          </a>
                        )}
                        {tour.branding.agentEmail && (
                          <a
                            href={`mailto:${tour.branding.agentEmail}`}
                            className="flex items-center gap-1.5 text-slate-200 hover:underline"
                          >
                            <Mail className="h-3.5 w-3.5" style={{ color: brandColor }} />
                            {tour.branding.agentEmail}
                          </a>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setLeadDrawerOpen(false)}
                      className="mt-5 w-full rounded-lg py-2.5 text-sm font-semibold text-slate-950"
                      style={{ backgroundColor: brandColor }}
                    >
                      Return to Property Tour
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleLeadSubmit} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-300">
                        How can we help?
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {INQUIRY_TYPE_OPTIONS.map((opt) => {
                          const active = inquiryType === opt.id
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setInquiryType(opt.id)}
                              className={`rounded-xl border p-2.5 text-left transition-all ${
                                active
                                  ? 'bg-white/10 text-white'
                                  : 'border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/25'
                              }`}
                              style={active ? { borderColor: brandColor } : undefined}
                            >
                              <div className="text-xs font-semibold">{opt.label}</div>
                              <div className="text-[11px] text-slate-400">{opt.description}</div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="pt-buyer-name"
                        className="mb-1 block text-xs font-medium text-slate-300"
                      >
                        Full Name *
                      </label>
                      <input
                        id="pt-buyer-name"
                        type="text"
                        required
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="Alex Morgan"
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="pt-buyer-email"
                        className="mb-1 block text-xs font-medium text-slate-300"
                      >
                        Email Address *
                      </label>
                      <input
                        id="pt-buyer-email"
                        type="email"
                        required
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        placeholder="alex@example.com"
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="pt-buyer-phone"
                        className="mb-1 block text-xs font-medium text-slate-300"
                      >
                        Phone Number (Optional)
                      </label>
                      <input
                        id="pt-buyer-phone"
                        type="tel"
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        placeholder="(310) 555-0192"
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="pt-buyer-message"
                        className="mb-1 block text-xs font-medium text-slate-300"
                      >
                        Notes / Preferred Times
                      </label>
                      <textarea
                        id="pt-buyer-message"
                        rows={3}
                        value={buyerMessage}
                        onChange={(e) => setBuyerMessage(e.target.value)}
                        placeholder="Interested in seeing the kitchen remodel concept in person this weekend..."
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    {leadError && (
                      <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                        {leadError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={leadSubmitting}
                      className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-slate-950 shadow-lg transition-all hover:brightness-110 disabled:opacity-60"
                      style={{ backgroundColor: brandColor }}
                    >
                      {leadSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending Inquiry...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send Request
                        </>
                      )}
                    </button>

                    {tour.branding?.ctaUrl && (
                      <a
                        href={tour.branding.ctaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open Listing Website
                      </a>
                    )}
                  </form>
                )}

                {/* Agent Card at Bottom of Drawer */}
                {(tour.branding?.agentName || tour.branding?.agentPhone) && !leadSuccessMsg && (
                  <div className="mt-6 flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-3">
                    {tour.branding.agentPhotoUrl ? (
                      <img
                        src={tour.branding.agentPhotoUrl}
                        alt={tour.branding.agentName || 'Agent'}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                        <MessageSquare className="h-4 w-4" style={{ color: brandColor }} />
                      </div>
                    )}
                    <div className="min-w-0 text-xs">
                      {tour.branding.agentName && (
                        <p className="font-semibold text-white truncate">
                          {tour.branding.agentName}
                        </p>
                      )}
                      {tour.branding.agentTitle && (
                        <p className="text-slate-400 truncate">{tour.branding.agentTitle}</p>
                      )}
                      {tour.branding.agentPhone && (
                        <a
                          href={`tel:${tour.branding.agentPhone}`}
                          className="text-slate-300 hover:text-white"
                        >
                          {tour.branding.agentPhone}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default InteractivePropertyPlayer
