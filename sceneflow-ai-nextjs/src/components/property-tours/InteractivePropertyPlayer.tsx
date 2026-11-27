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
  Globe,
  Hammer,
  Home,
  Image as ImageIcon,
  Info,
  Loader2,
  Mail,
  MapPin,
  Maximize2,
  MessageSquare,
  Mic,
  Minimize2,
  Moon,
  Music,
  PartyPopper,
  Pause,
  Phone,
  Play,
  Send,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Sunset,
  UserCheck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import {
  COMPASS_DIRECTIONS,
  PROPERTY_ADDITION_PRESETS,
  PROPERTY_EVENT_PRESETS,
  PROPERTY_LANGUAGE_PRESETS,
  PROPERTY_LIFESTYLE_PRESETS,
  PROPERTY_LIGHTING_PRESETS,
  PROPERTY_STYLE_PRESETS,
  getNextClockwiseDirection,
  getPrevClockwiseDirection,
  resolvePerspectiveAsset,
  type CompassDirection,
  type PropertyAdditionId,
  type PropertyEventId,
  type PropertyGuideMode,
  type PropertyLanguageCode,
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
  /** When rendered inside a surrounding marketing/sandbox page (e.g. /property-tours), avoid forcing min-h-screen */
  embeddedInPage?: boolean
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
  embeddedInPage = false,
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

  const availableEventPresets = useMemo(() => {
    const allowed = new Set<PropertyEventId>(
      tour.availableEvents?.length
        ? tour.availableEvents
        : ['none', 'family_gathering', 'cocktail_party', 'private_dinner', 'holiday_celebration']
    )
    const filtered = PROPERTY_EVENT_PRESETS.filter((p) => allowed.has(p.id))
    return filtered.length > 0 ? filtered : PROPERTY_EVENT_PRESETS
  }, [tour.availableEvents])

  const availableAdditionPresets = useMemo(() => {
    const allowed = new Set<PropertyAdditionId>(
      tour.availableAdditions?.length
        ? tour.availableAdditions
        : ['none', 'wine_cellar_bar', 'outdoor_kitchen', 'infinity_pool', 'adu_casita']
    )
    const filtered = PROPERTY_ADDITION_PRESETS.filter((p) => allowed.has(p.id))
    return filtered.length > 0 ? filtered : PROPERTY_ADDITION_PRESETS
  }, [tour.availableAdditions])

  const availableLanguages = useMemo(() => {
    const allowed = new Set<PropertyLanguageCode>(
      tour.availableLanguages?.length ? tour.availableLanguages : ['en', 'es', 'ja']
    )
    const filtered = PROPERTY_LANGUAGE_PRESETS.filter((l) => allowed.has(l.code))
    return filtered.length > 0 ? filtered : PROPERTY_LANGUAGE_PRESETS
  }, [tour.availableLanguages])

  const musicTracks = useMemo(() => tour.musicTracks || [], [tour.musicTracks])

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
  const [selectedEvent, setSelectedEvent] = useState<PropertyEventId>('none')
  const [selectedAddition, setSelectedAddition] = useState<PropertyAdditionId>('none')

  // Guide Mode (Silent vs Multilingual Narration vs In-Scene Agent Lip-Sync) + Ambient Music
  const [guideMode, setGuideMode] = useState<PropertyGuideMode>('off')
  const [guideLanguage, setGuideLanguage] = useState<PropertyLanguageCode>('en')
  const [isGuidePlaying, setIsGuidePlaying] = useState(false)
  const [activeMusicTrackId, setActiveMusicTrackId] = useState<string>('off')

  const guideAudioRef = useRef<HTMLAudioElement | null>(null)
  const musicAudioRef = useRef<HTMLAudioElement | null>(null)

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
        event: selectedEvent,
        addition: selectedAddition,
        showOriginal: selectedStyle === 'as_is' && selectedEvent === 'none' && selectedAddition === 'none',
      }),
    [activePerspective, selectedStyle, selectedLighting, selectedLifestyle, selectedEvent, selectedAddition]
  )

  const activeGuideTrack = useMemo(() => {
    if (!activeRoom || guideMode === 'off') return null
    if (guideMode === 'agent_sync') {
      return (
        activeRoom.agentSyncByLanguage?.[guideLanguage] ||
        activeRoom.agentSyncByLanguage?.en ||
        activeRoom.narrationByLanguage?.[guideLanguage] ||
        (activeRoom.narrationScript
          ? { script: activeRoom.narrationScript, audioUrl: activeRoom.narrationAudioUrl }
          : null)
      )
    }
    return (
      activeRoom.narrationByLanguage?.[guideLanguage] ||
      activeRoom.narrationByLanguage?.en ||
      (activeRoom.narrationScript
        ? { script: activeRoom.narrationScript, audioUrl: activeRoom.narrationAudioUrl }
        : null)
    )
  }, [activeRoom, guideMode, guideLanguage])

  const activeMusicTrack = useMemo(
    () => musicTracks.find((m) => m.id === activeMusicTrackId) ?? null,
    [musicTracks, activeMusicTrackId]
  )

  const stopSpeechSynthesis = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
      } catch {}
    }
  }, [])

  const speakFallbackTranscript = useCallback(
    (script: string, langCode: PropertyLanguageCode) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window) || !script.trim()) return
      try {
        window.speechSynthesis.cancel()
        const preset = PROPERTY_LANGUAGE_PRESETS.find((l) => l.code === langCode) ?? PROPERTY_LANGUAGE_PRESETS[0]
        const utter = new SpeechSynthesisUtterance(script)
        utter.lang = preset.speechLang
        utter.rate = 0.98
        utter.onstart = () => setIsGuidePlaying(true)
        utter.onend = () => setIsGuidePlaying(false)
        utter.onerror = () => setIsGuidePlaying(false)
        window.speechSynthesis.speak(utter)
      } catch {
        setIsGuidePlaying(false)
      }
    },
    []
  )

  // Play or stop localized Guide Audio (MP3 with automatic Web Speech API fallback)
  useEffect(() => {
    const audioEl = guideAudioRef.current
    stopSpeechSynthesis()
    if (audioEl) {
      audioEl.pause()
      audioEl.currentTime = 0
    }

    if (guideMode === 'off' || !activeGuideTrack) {
      setIsGuidePlaying(false)
      return
    }

    if (activeGuideTrack.audioUrl && audioEl) {
      audioEl.src = activeGuideTrack.audioUrl
      const playPromise = audioEl.play()
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => setIsGuidePlaying(true))
          .catch(() => {
            // If MP3 not yet generated or blocked, fall back gracefully to browser speech synthesis
            speakFallbackTranscript(activeGuideTrack.script, guideLanguage)
          })
      }
    } else if (activeGuideTrack.script) {
      speakFallbackTranscript(activeGuideTrack.script, guideLanguage)
    }

    return () => {
      stopSpeechSynthesis()
      if (audioEl) {
        audioEl.pause()
      }
    }
  }, [guideMode, guideLanguage, activeRoom?.id, activeGuideTrack, stopSpeechSynthesis, speakFallbackTranscript])

  // Ambient Background Music playback + automatic voice ducking
  useEffect(() => {
    const musicEl = musicAudioRef.current
    if (!musicEl) return
    if (!activeMusicTrack?.audioUrl) {
      musicEl.pause()
      return
    }
    if (musicEl.getAttribute('data-track-id') !== activeMusicTrack.id) {
      musicEl.src = activeMusicTrack.audioUrl
      musicEl.setAttribute('data-track-id', activeMusicTrack.id)
    }
    musicEl.loop = true
    musicEl.volume = isGuidePlaying ? 0.12 : 0.34
    musicEl.play().catch(() => {})
  }, [activeMusicTrack, isGuidePlaying])

  const toggleGuidePlayPause = useCallback(() => {
    if (guideMode === 'off') {
      setGuideMode('narration')
      return
    }
    const audioEl = guideAudioRef.current
    if (isGuidePlaying) {
      audioEl?.pause()
      stopSpeechSynthesis()
      setIsGuidePlaying(false)
    } else if (activeGuideTrack?.audioUrl && audioEl) {
      audioEl
        .play()
        .then(() => setIsGuidePlaying(true))
        .catch(() => {
          if (activeGuideTrack?.script) {
            speakFallbackTranscript(activeGuideTrack.script, guideLanguage)
          }
        })
    } else if (activeGuideTrack?.script) {
      speakFallbackTranscript(activeGuideTrack.script, guideLanguage)
    }
  }, [guideMode, isGuidePlaying, activeGuideTrack, guideLanguage, stopSpeechSynthesis, speakFallbackTranscript])

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

  const stageKey = `${activeRoom?.id ?? 'none'}-${direction}-${resolved.variant?.id ?? (resolved.isOriginal ? 'orig' : 'empty')}-${selectedStyle}-${selectedLighting}-${selectedLifestyle}-${selectedEvent}-${selectedAddition}`

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

  const rootClasses =
    isPreview || embeddedInPage
      ? 'relative flex flex-col w-full overflow-x-clip bg-slate-950 text-white'
      : isEmbed
        ? 'relative flex flex-col w-full h-[100dvh] min-h-[500px] bg-slate-950 text-white overflow-hidden'
        : 'relative flex flex-col w-full min-h-[100dvh] overflow-x-clip bg-slate-950 text-white'

  return (
    <div
      ref={containerRef}
      className={rootClasses}
      style={{ '--brand-color': brandColor } as React.CSSProperties}
    >
      {/* Top White-Label Agency & Agent Bar */}
      <header
        className={`z-20 flex items-center justify-between gap-2 border-b border-white/10 bg-slate-950/95 backdrop-blur-md ${
          isEmbed ? 'px-2.5 py-2 sm:px-3' : 'px-3 py-2.5 sm:px-6 sm:py-3'
        }`}
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          {tour.branding?.logoUrl ? (
            <img
              src={tour.branding.logoUrl}
              alt={tour.branding.agencyName || tour.title}
              className="h-8 sm:h-9 w-auto max-w-[110px] sm:max-w-[140px] rounded-md object-contain bg-white/5 p-1 shrink-0"
            />
          ) : (
            <div
              className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white shadow-inner"
              style={{ backgroundColor: `${brandColor}24`, borderColor: `${brandColor}55` }}
            >
              <Building2 className="h-4 w-4" style={{ color: brandColor }} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {tour.branding?.agencyName && (
                <span
                  className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate"
                  style={{ color: brandColor }}
                >
                  {tour.branding.agencyName}
                </span>
              )}
              {isPreview && (
                <span className="shrink-0 rounded-full border border-amber-400/40 bg-amber-500/15 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                  Preview
                </span>
              )}
            </div>
            <h1 className="truncate text-xs sm:text-sm md:text-base font-semibold text-white">
              {tour.title}
            </h1>
          </div>
        </div>

        {/* Agent Contact & Primary CTA */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
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
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors"
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
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-sm font-semibold text-slate-950 shadow-lg transition-transform hover:brightness-110 active:scale-[0.98] whitespace-nowrap"
            style={{ backgroundColor: brandColor }}
          >
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="sm:hidden">Inquire</span>
            <span className="hidden sm:inline">{ctaLabel}</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 transition-colors shrink-0"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Property Specs Strip (single-line swipeable on mobile, wrapped on desktop) */}
      {hasSpecsStrip && (!isEmbed || showEmbedSpecs) && (
        <div className="z-10 flex items-center gap-4 overflow-x-auto whitespace-nowrap border-b border-white/10 bg-slate-900/80 px-3 py-2 text-[11px] sm:text-xs text-slate-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:justify-between sm:px-6">
          <div className="flex items-center gap-3.5 sm:gap-4 shrink-0">
            {formattedPrice && (
              <span className="text-xs sm:text-sm font-bold text-white">{formattedPrice}</span>
            )}
            {specs.beds != null && specs.beds > 0 && (
              <span className="inline-flex items-center gap-1">
                <BedDouble className="h-3.5 w-3.5 text-slate-400" />
                <strong className="text-white">{specs.beds}</strong> Beds
              </span>
            )}
            {specs.baths != null && specs.baths > 0 && (
              <span className="inline-flex items-center gap-1">
                <Bath className="h-3.5 w-3.5 text-slate-400" />
                <strong className="text-white">{specs.baths}</strong> Baths
              </span>
            )}
            {formattedSqft && (
              <span className="inline-flex items-center gap-1">
                <Home className="h-3.5 w-3.5 text-slate-400" />
                <strong className="text-white">{formattedSqft}</strong> Sq Ft
              </span>
            )}
            {specs.mlsNumber && (
              <span className="text-slate-400">MLS #{specs.mlsNumber}</span>
            )}
          </div>
          {tour.propertyAddress && (
            <div className="inline-flex items-center gap-1.5 text-slate-300 shrink-0">
              <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: brandColor }} />
              <span>{tour.propertyAddress}</span>
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
              ? 'h-full min-h-[240px]'
              : 'aspect-[4/3] sm:aspect-video min-h-[260px] sm:min-h-[360px] max-h-[68vh] mx-auto'
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
          <div className="absolute left-2.5 top-2.5 z-20 flex max-w-[58%] items-center gap-1.5 sm:left-4 sm:top-4 sm:max-w-none">
            {!resolved.isOriginal && resolved.isVirtuallyModified && (
              <div className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-2.5 py-1 text-[10px] sm:px-3 sm:text-[11px] font-medium text-white backdrop-blur-md shadow-md">
                <Sparkles className="h-3 w-3 shrink-0" style={{ color: brandColor }} />
                <span className="truncate">{disclosureText}</span>
              </div>
            )}
            {resolved.isOriginal && resolved.imageUrl && (
              <div className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-emerald-400/30 bg-black/70 px-2.5 py-1 text-[10px] sm:px-3 sm:text-[11px] font-medium text-emerald-200 backdrop-blur-md">
                <ImageIcon className="h-3 w-3 shrink-0 text-emerald-400" />
                <span className="truncate">Original Photo</span>
              </div>
            )}
          </div>

          {/* Top-Right Stage Action Pills: Compare Original + Motion/Still Toggle */}
          <div
            className="absolute right-2.5 top-2.5 z-20 flex items-center gap-1.5 sm:right-4 sm:top-4 sm:gap-2"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {resolved.motionVideoUrl && !compareMode && (
              <button
                type="button"
                onClick={() => setPreferMotion((m) => !m)}
                aria-label={preferMotion ? 'Switch to still image' : 'Play motion loop'}
                className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/70 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-medium text-white backdrop-blur-md hover:bg-black/85 transition-colors"
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
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-semibold backdrop-blur-md transition-all shadow-md"
                style={
                  compareMode
                    ? {
                        backgroundColor: brandColor,
                        borderColor: brandColor,
                        color: '#020617',
                      }
                    : {
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        borderColor: 'rgba(255,255,255,0.25)',
                        color: '#ffffff',
                      }
                }
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="sm:hidden">{compareMode ? 'Exit' : 'Compare'}</span>
                <span className="hidden sm:inline">{compareMode ? 'Exit Compare' : 'Compare Original'}</span>
              </button>
            )}
          </div>

          {/* Left / Right Rotate Arrows on Stage (hidden on mobile; swipe + compass handle navigation cleanly) */}
          {!compareMode && (
            <>
              <button
                type="button"
                onClick={rotateCounterClockwise}
                aria-label="Rotate camera counter-clockwise (Left Arrow)"
                className="hidden sm:flex absolute left-3 top-1/2 z-20 -translate-y-1/2 h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur-md transition-all hover:bg-black/80 hover:scale-105 active:scale-95"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={rotateClockwise}
                aria-label="Rotate camera clockwise (Right Arrow)"
                className="hidden sm:flex absolute right-3 top-1/2 z-20 -translate-y-1/2 h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur-md transition-all hover:bg-black/80 hover:scale-105 active:scale-95"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Desktop Overlay: In-Scene Agent Sync Presenter Card OR Voiceover Narration Subtitle */}
          {guideMode === 'agent_sync' && activeGuideTrack && !compareMode && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="hidden sm:block absolute right-4 bottom-20 z-20 w-72 md:w-80 overflow-hidden rounded-2xl border border-white/20 bg-slate-950/90 shadow-2xl backdrop-blur-md"
            >
              <div className="relative aspect-video bg-slate-900">
                {activeGuideTrack.videoUrl ? (
                  <video
                    key={activeGuideTrack.videoUrl}
                    src={activeGuideTrack.videoUrl}
                    poster={activeGuideTrack.posterImageUrl || undefined}
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : activeGuideTrack.posterImageUrl ? (
                  <img
                    src={activeGuideTrack.posterImageUrl}
                    alt={tour.branding?.agentName || 'In-Scene Property Advisor'}
                    className="h-full w-full object-cover"
                  />
                ) : null}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`h-2 w-2 rounded-full ${isGuidePlaying ? 'animate-pulse bg-emerald-400' : 'bg-slate-400'}`}
                    />
                    <span className="truncate text-[11px] font-semibold text-white">
                      {tour.branding?.agentName || 'Listing Advisor'} · In-Scene Sync ({guideLanguage.toUpperCase()})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleGuidePlayPause}
                    aria-label={isGuidePlaying ? 'Pause agent guide' : 'Play agent guide'}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                  >
                    {isGuidePlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </button>
                </div>
              </div>
              <div className="px-3 py-2 text-[11px] leading-relaxed text-slate-200 max-h-20 overflow-y-auto">
                {activeGuideTrack.script}
              </div>
            </div>
          )}

          {guideMode === 'narration' && activeGuideTrack && !compareMode && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="hidden sm:block absolute left-1/2 bottom-20 z-20 w-[90%] max-w-2xl -translate-x-1/2 rounded-xl border border-white/15 bg-black/80 px-4 py-2.5 text-center backdrop-blur-md shadow-xl"
            >
              <div className="flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-cyan-300 mb-1">
                <Mic className="h-3 w-3" />
                <span>
                  Audio Narration · {PROPERTY_LANGUAGE_PRESETS.find((l) => l.code === guideLanguage)?.nativeLabel}
                </span>
                <button
                  type="button"
                  onClick={toggleGuidePlayPause}
                  className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white hover:bg-white/20"
                >
                  {isGuidePlaying ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5" />}
                  {isGuidePlaying ? 'Pause' : 'Play'}
                </button>
              </div>
              <p className="text-xs leading-relaxed text-white">{activeGuideTrack.script}</p>
            </div>
          )}

          {/* Hidden Audio Elements for Guide Track & Looping Ambient Music */}
          <audio
            ref={guideAudioRef}
            onPlay={() => setIsGuidePlaying(true)}
            onPause={() => setIsGuidePlaying(false)}
            onEnded={() => setIsGuidePlaying(false)}
            onError={() => {
              if (guideMode !== 'off' && activeGuideTrack?.script) {
                speakFallbackTranscript(activeGuideTrack.script, guideLanguage)
              }
            }}
            className="hidden"
          />
          <audio ref={musicAudioRef} loop className="hidden" />

          {/* Bottom Stage Overlay: Perspective Label + Interactive 4-Point Compass */}
          <div
            className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-2 px-3 py-2.5 sm:px-5 sm:py-4"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 flex-1 pr-1">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                <span className="truncate">{activeRoom?.name || 'Property Space'}</span>
                {activeRoom?.renovationEstimateUsd ? (
                  <span
                    className="hidden sm:inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
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
              <p className="mt-0.5 truncate text-xs sm:text-base font-semibold text-white drop-shadow">
                {activePerspective?.label || `${COMPASS_FULL_LABELS[direction]} Perspective`}
              </p>
            </div>

            {/* Interactive 4-Point N / E / S / W Compass Control */}
            <div
              role="group"
              aria-label="4-point compass perspective navigation"
              className="shrink-0 flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/20 bg-slate-950/85 px-2 py-1 sm:px-2.5 sm:py-1.5 backdrop-blur-md shadow-xl"
            >
              <div
                className="hidden sm:flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/5"
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
              <div className="flex items-center gap-0.5 sm:gap-1">
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
                      className={`relative flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-[11px] sm:text-xs font-bold transition-all ${
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
                          className="absolute bottom-0.5 sm:bottom-1 h-1 w-1 rounded-full"
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

      {/* Mobile Below-Stage Guide Strip (never covers the room photo on small screens) */}
      {guideMode !== 'off' && activeGuideTrack && !compareMode && (
        <div className="sm:hidden border-t border-white/10 bg-slate-900/95 px-3 py-2.5">
          <div className="flex items-start gap-3">
            {guideMode === 'agent_sync' && activeGuideTrack.posterImageUrl && (
              <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-slate-950">
                {activeGuideTrack.videoUrl ? (
                  <video
                    key={activeGuideTrack.videoUrl}
                    src={activeGuideTrack.videoUrl}
                    poster={activeGuideTrack.posterImageUrl}
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={activeGuideTrack.posterImageUrl}
                    alt={tour.branding?.agentName || 'Advisor'}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300 truncate">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${isGuidePlaying ? 'animate-pulse bg-emerald-400' : 'bg-slate-400'}`}
                  />
                  {guideMode === 'agent_sync'
                    ? `${tour.branding?.agentName || 'Advisor'} · Agent Sync`
                    : `Narration · ${PROPERTY_LANGUAGE_PRESETS.find((l) => l.code === guideLanguage)?.nativeLabel}`}
                </span>
                <button
                  type="button"
                  onClick={toggleGuidePlayPause}
                  className="shrink-0 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white"
                >
                  {isGuidePlaying ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5" />}
                  {isGuidePlaying ? 'Pause' : 'Play'}
                </button>
              </div>
              <p className="text-xs leading-relaxed text-slate-200">{activeGuideTrack.script}</p>
            </div>
          </div>
        </div>
      )}

      {/* Zero-Latency Instant Toggle Control Dock (Single-Line Swipe Rails on Mobile, Wrapped on Desktop) */}
      <div
        className={`z-20 border-t border-white/10 bg-slate-950/95 backdrop-blur-xl ${
          isEmbed ? 'px-2.5 py-2 space-y-2 sm:px-3 sm:py-2.5' : 'px-3 py-3 space-y-2.5 sm:px-6 sm:py-4 sm:space-y-3.5'
        }`}
      >
        {/* Row 1: Room Selector Rail */}
        {sortedRooms.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-0.5">
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
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
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

        {/* Row 2: Redesign & Lighting Instant Pills */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
          {/* Redesign Styles */}
          <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap">
            <span className="shrink-0 mr-0.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Redesign
            </span>
            {availableStylePresets.map((preset) => {
              const isActive =
                selectedStyle === preset.id && selectedEvent === 'none' && selectedAddition === 'none'
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
                    setSelectedEvent('none')
                    setSelectedAddition('none')
                    setSelectedStyle(preset.id)
                  }}
                  aria-pressed={isActive}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 sm:py-1 text-xs font-medium transition-all ${
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

          {/* Lighting */}
          <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:hidden">
              Light
            </span>
            <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-slate-900/80 p-0.5">
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
                    className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
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
          </div>
        </div>

        {/* Row 3: Events (Parties, Family Gatherings) + Architectural Additions */}
        <div className="flex flex-col gap-2 border-t border-white/5 pt-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:pt-2.5">
          {/* Events */}
          <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap">
            <span className="shrink-0 mr-0.5 inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-amber-400/90">
              <PartyPopper className="h-3 w-3" />
              Events
            </span>
            {availableEventPresets.map((preset) => {
              const isActive = selectedEvent === preset.id
              const hasEventPlate =
                preset.id === 'none' ||
                Boolean(activePerspective?.variants?.some((v) => v.event === preset.id))
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setSlideDir(0)
                    setSelectedAddition('none')
                    setSelectedEvent(preset.id)
                  }}
                  aria-pressed={isActive}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 sm:py-1 text-xs font-medium transition-all ${
                    isActive
                      ? 'border-amber-400 bg-amber-500/20 text-amber-100 shadow-sm'
                      : 'border-white/10 bg-slate-900/80 text-slate-300 hover:border-white/25 hover:text-white'
                  }`}
                >
                  <span>{preset.shortLabel}</span>
                  {preset.id !== 'none' && hasEventPlate && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Additions */}
          <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap">
            <span className="shrink-0 mr-0.5 inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-emerald-400/90">
              <Hammer className="h-3 w-3" />
              Additions
            </span>
            {availableAdditionPresets.map((preset) => {
              const isActive = selectedAddition === preset.id
              const hasAdditionPlate =
                preset.id === 'none' ||
                Boolean(activePerspective?.variants?.some((v) => v.addition === preset.id))
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setSlideDir(0)
                    setSelectedEvent('none')
                    setSelectedAddition(preset.id)
                  }}
                  aria-pressed={isActive}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 sm:py-1 text-xs font-medium transition-all ${
                    isActive
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100 shadow-sm'
                      : 'border-white/10 bg-slate-900/80 text-slate-300 hover:border-white/25 hover:text-white'
                  }`}
                >
                  <span>{preset.shortLabel}</span>
                  {preset.id !== 'none' && hasAdditionPlate && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Row 4: Guide Mode (In-Scene Agent Sync vs Narration in EN / ES / JA) + Ambient Music */}
        <div className="flex flex-col gap-2 border-t border-white/5 pt-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:pt-2.5">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap">
            <span className="shrink-0 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-cyan-400/90">
              Guide
            </span>
            <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-slate-900/80 p-0.5">
              <button
                type="button"
                onClick={() => setGuideMode('off')}
                aria-pressed={guideMode === 'off'}
                className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all ${
                  guideMode === 'off' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <VolumeX className="h-3.5 w-3.5" />
                Silent
              </button>
              <button
                type="button"
                onClick={() => setGuideMode('narration')}
                aria-pressed={guideMode === 'narration'}
                className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  guideMode === 'narration'
                    ? 'text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
                style={guideMode === 'narration' ? { backgroundColor: brandColor } : undefined}
              >
                <Mic className="h-3.5 w-3.5" />
                Narration
              </button>
              <button
                type="button"
                onClick={() => setGuideMode('agent_sync')}
                aria-pressed={guideMode === 'agent_sync'}
                className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  guideMode === 'agent_sync'
                    ? 'text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
                style={guideMode === 'agent_sync' ? { backgroundColor: brandColor } : undefined}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Agent Sync</span>
              </button>
            </div>

            {/* Language Selector (English / Spanish / Japanese) */}
            <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-slate-900/80 p-0.5">
              <Globe className="ml-1.5 h-3.5 w-3.5 text-slate-400 shrink-0" />
              {availableLanguages.map((lang) => {
                const isActive = guideLanguage === lang.code
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setGuideLanguage(lang.code)
                      if (guideMode === 'off') setGuideMode('narration')
                    }}
                    aria-pressed={isActive}
                    className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang.nativeLabel}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Ambient Music Track Selector */}
          {musicTracks.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <Music className="h-3 w-3 text-cyan-400" />
                Music
              </span>
              <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-slate-900/80 p-0.5">
                <button
                  type="button"
                  onClick={() => setActiveMusicTrackId('off')}
                  aria-pressed={activeMusicTrackId === 'off'}
                  className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium transition-all ${
                    activeMusicTrackId === 'off'
                      ? 'bg-white/15 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Off
                </button>
                {musicTracks.map((track) => {
                  const isActive = activeMusicTrackId === track.id
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => setActiveMusicTrackId(track.id)}
                      aria-pressed={isActive}
                      title={track.mood}
                      className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-200 font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {isActive && <Volume2 className="h-3 w-3 text-cyan-300" />}
                      {track.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
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
