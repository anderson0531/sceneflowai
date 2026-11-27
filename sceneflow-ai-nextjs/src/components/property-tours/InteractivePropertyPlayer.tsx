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
  HeartHandshake,
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
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Subtitles,
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
type BuyerLifestyleProfile = 'explorer' | 'entertainer' | 'family' | 'executive' | 'investor'
type PrimaryExploreTab = 'original' | 'redesign' | 'events' | 'additions' | 'lifestyle'
type DisplayLocaleUnit = 'usd_sqft' | 'eur_sqm' | 'jpy_sqm'

const BUYER_LIFESTYLE_MATCHES: Array<{
  id: BuyerLifestyleProfile
  label: string
  decisionCues: string[]
  recommendation: string
  ctaText: string
  targetRoomMatch: RegExp
  targetEvent?: PropertyEventId
  targetAddition?: PropertyAdditionId
  targetStyle?: PropertyStyleId
  targetLighting?: PropertyLightingId
}> = [
  {
    id: 'explorer',
    label: 'All Spaces',
    decisionCues: ['4-wall N/E/S/W compass', '1-tap Original Compare', 'Guided 30s Intro'],
    recommendation:
      'Free buyer-controlled exploration — steer N/E/S/W angles, compare unedited photos, or launch a 30s guided intro.',
    ctaText: 'Start 30s Intro',
    targetRoomMatch: /great|living|aerial/i,
  },
  {
    id: 'entertainer',
    label: 'Entertainer',
    decisionCues: ['Indoor-outdoor flow for 35+ guests', '+ Wine Bar concept ($40K–$60K)', 'Twilight firepit deck'],
    recommendation:
      'Recommended: Sunset Cocktail Party in the Great Room + Glass Wine Bar addition + Twilight Infinity Terrace.',
    ctaText: 'Preview Party Flow',
    targetRoomMatch: /great|living/i,
    targetEvent: 'cocktail_party',
    targetLighting: 'twilight',
  },
  {
    id: 'family',
    label: 'Growing Family',
    decisionCues: ['Open kitchen-to-pool sightlines', '5 Beds · 6.5 Baths privacy', 'Multi-gen Guest Casita option'],
    recommendation:
      'Recommended: Sunday Family Gathering in the Great Room, open remodeled Kitchen sightlines, and optional Guest Casita.',
    ctaText: 'Preview Family Living',
    targetRoomMatch: /great|living/i,
    targetEvent: 'family_gathering',
    targetLighting: 'golden_hour',
  },
  {
    id: 'executive',
    label: 'Remote Executive',
    decisionCues: ['Acoustic Primary Suite separation', 'Golden morning natural light', 'Detached ADU private studio'],
    recommendation:
      'Recommended: Serene Primary Ocean Suite plus detached Glass Guest Casita ADU ideal as a quiet oceanfront studio.',
    ctaText: 'Preview Executive Suite',
    targetRoomMatch: /primary|suite|office/i,
    targetStyle: 'modern_coastal',
    targetLighting: 'golden_hour',
  },
  {
    id: 'investor',
    label: 'Equity & Investor',
    decisionCues: ['Kitchen remodel appraisal lift', 'Detached ADU dual-key appeal', 'Malibu coastal scarcity'],
    recommendation:
      'Recommended: Chef Kitchen Remodel (est. $85K–$110K concept) + Detached Guest Casita ADU for dual-key rental appeal.',
    ctaText: 'Preview Equity Upside',
    targetRoomMatch: /kitchen/i,
    targetStyle: 'chefs_remodel',
    targetLighting: 'daylight',
  },
]

function formatLocalizedListingPrice(priceUsd?: number | null, unit: DisplayLocaleUnit = 'usd_sqft'): string | null {
  if (priceUsd == null || !Number.isFinite(priceUsd) || priceUsd <= 0) return null
  if (unit === 'eur_sqm') {
    const eur = Math.round(priceUsd * 0.92)
    return `~€${new Intl.NumberFormat('de-DE').format(eur)}`
  }
  if (unit === 'jpy_sqm') {
    const jpy = Math.round((priceUsd * 152) / 1_000_000) * 1_000_000
    return `~¥${new Intl.NumberFormat('ja-JP').format(jpy)}`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(priceUsd)
}

function formatLocalizedArea(sqft?: number | null, unit: DisplayLocaleUnit = 'usd_sqft'): { value: string; label: string } | null {
  if (sqft == null || !Number.isFinite(sqft) || sqft <= 0) return null
  if (unit === 'eur_sqm' || unit === 'jpy_sqm') {
    const sqm = Math.round(sqft * 0.092903)
    return { value: new Intl.NumberFormat('en-US').format(sqm), label: 'm²' }
  }
  return { value: new Intl.NumberFormat('en-US').format(Math.round(sqft)), label: 'Sq Ft' }
}

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
  const [buyerProfile, setBuyerProfile] = useState<BuyerLifestyleProfile>('explorer')
  const [autoTourActive, setAutoTourActive] = useState(false)
  const [disclosureModalOpen, setDisclosureModalOpen] = useState(false)
  const [exploreTab, setExploreTab] = useState<PrimaryExploreTab>('redesign')
  const [tourControlsOpen, setTourControlsOpen] = useState(false)
  const [captionsEnabled, setCaptionsEnabled] = useState(false)
  const [displayUnit, setDisplayUnit] = useState<DisplayLocaleUnit>('usd_sqft')
  const [smartIntroDismissed, setSmartIntroDismissed] = useState(false)
  const [quickViewOriginal, setQuickViewOriginal] = useState(false)

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
        showOriginal:
          quickViewOriginal ||
          (selectedStyle === 'as_is' && selectedEvent === 'none' && selectedAddition === 'none'),
      }),
    [
      activePerspective,
      selectedStyle,
      selectedLighting,
      selectedLifestyle,
      selectedEvent,
      selectedAddition,
      quickViewOriginal,
    ]
  )

  const activeGuideTrack = useMemo(() => {
    if (!activeRoom) return null
    if (guideMode === 'off' && !captionsEnabled) return null
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
  }, [activeRoom, guideMode, guideLanguage, captionsEnabled])

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

  const activeBuyerMatch = useMemo(
    () => BUYER_LIFESTYLE_MATCHES.find((m) => m.id === buyerProfile) ?? BUYER_LIFESTYLE_MATCHES[0],
    [buyerProfile]
  )

  const handleChangeLanguage = useCallback((lang: PropertyLanguageCode) => {
    setGuideLanguage(lang)
    setDisplayUnit(lang === 'es' ? 'eur_sqm' : lang === 'ja' ? 'jpy_sqm' : 'usd_sqft')
  }, [])

  const startSmartIntro = useCallback(() => {
    setSmartIntroDismissed(true)
    setQuickViewOriginal(false)
    setCaptionsEnabled(true)
    setGuideMode('narration')
    setAutoTourActive(true)
    const aerialOrFirst =
      sortedRooms.find((r) => /aerial|arrival|great/i.test(r.name)) ?? sortedRooms[0]
    if (aerialOrFirst) {
      setActiveRoomId(aerialOrFirst.id)
      setDirection(aerialOrFirst.anchorDirection ?? 'N')
    }
  }, [sortedRooms])

  const applyLifestyleRecommendation = useCallback(
    (profileId: BuyerLifestyleProfile) => {
      setSmartIntroDismissed(true)
      setQuickViewOriginal(false)
      setBuyerProfile(profileId)
      const match = BUYER_LIFESTYLE_MATCHES.find((m) => m.id === profileId)
      if (!match) return
      if (profileId === 'explorer') {
        setAutoTourActive(false)
        setSelectedEvent('none')
        setSelectedAddition('none')
        return
      }
      setAutoTourActive(false)
      const targetRoom =
        sortedRooms.find((r) => match.targetRoomMatch.test(r.name)) ?? sortedRooms[0]
      if (targetRoom) {
        setActiveRoomId(targetRoom.id)
        setDirection(targetRoom.anchorDirection ?? 'N')
      }
      setSlideDir(0)
      setSelectedEvent(match.targetEvent ?? 'none')
      setSelectedAddition(match.targetAddition ?? 'none')
      if (match.targetStyle) setSelectedStyle(match.targetStyle)
      if (match.targetLighting) setSelectedLighting(match.targetLighting)
    },
    [sortedRooms, startSmartIntro]
  )

  // Guided Auto-Tour loop: smoothly rotates N->E->S->W and advances rooms every 6s
  useEffect(() => {
    if (!autoTourActive || compareMode) return
    const timer = setInterval(() => {
      setDirection((prevDir) => {
        if (prevDir === 'W' && sortedRooms.length > 1) {
          const curIdx = sortedRooms.findIndex((r) => r.id === activeRoom?.id)
          const nextRoom = sortedRooms[(curIdx + 1) % sortedRooms.length]
          if (nextRoom) {
            setActiveRoomId(nextRoom.id)
            setSlideDir(0)
            return nextRoom.anchorDirection ?? 'N'
          }
        }
        setSlideDir(1)
        return getNextClockwiseDirection(prevDir)
      })
    }, 6000)
    return () => clearInterval(timer)
  }, [autoTourActive, compareMode, sortedRooms, activeRoom?.id])

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
      setSmartIntroDismissed(true)
      setAutoTourActive(false)
      setDirection((prev) => {
        if (prev === next) return prev
        setSlideDir(getRotationSign(prev, next))
        return next
      })
    },
    []
  )

  const rotateClockwise = useCallback(() => {
    setSmartIntroDismissed(true)
    setAutoTourActive(false)
    setDirection((prev) => {
      setSlideDir(1)
      return getNextClockwiseDirection(prev)
    })
  }, [])

  const rotateCounterClockwise = useCallback(() => {
    setSmartIntroDismissed(true)
    setAutoTourActive(false)
    setDirection((prev) => {
      setSlideDir(-1)
      return getPrevClockwiseDirection(prev)
    })
  }, [])

  const handleSelectRoom = useCallback(
    (room: PropertyRoom) => {
      setSmartIntroDismissed(true)
      setAutoTourActive(false)
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

  const activeEventLabel =
    selectedEvent !== 'none'
      ? PROPERTY_EVENT_PRESETS.find((e) => e.id === selectedEvent)?.label
      : null
  const activeAdditionLabel =
    selectedAddition !== 'none'
      ? PROPERTY_ADDITION_PRESETS.find((a) => a.id === selectedAddition)?.label
      : null
  const activeVisionPlainLabel =
    activeAdditionLabel ||
    activeEventLabel ||
    (quickViewOriginal ? 'Unedited Original Photo' : activeStylePreset.label)

  const buyerContextSummary = [
    activeRoom?.name ? `Space: ${activeRoom.name} (${COMPASS_FULL_LABELS[direction]})` : null,
    `Vision: ${activeVisionPlainLabel}`,
    buyerProfile !== 'explorer' ? `Buyer Profile: ${activeBuyerMatch.label}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

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
          selectedStyle: activeVisionPlainLabel,
          message:
            [buyerContextSummary, buyerMessage.trim()].filter(Boolean).join('\n\n') || undefined,
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
  const formattedPrice = formatLocalizedListingPrice(specs.priceUsd, displayUnit)
  const formattedArea = formatLocalizedArea(specs.sqft, displayUnit)
  const hasSpecsStrip = Boolean(
    formattedPrice ||
      specs.beds ||
      specs.baths ||
      formattedArea ||
      tour.propertyAddress ||
      specs.mlsNumber
  )

  const stageKey = `${activeRoom?.id ?? 'none'}-${direction}-${resolved.variant?.id ?? (resolved.isOriginal ? 'orig' : 'empty')}-${selectedStyle}-${selectedLighting}-${selectedLifestyle}-${selectedEvent}-${selectedAddition}-${quickViewOriginal ? 'orig' : 'ai'}`

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
            {formattedArea && (
              <span className="inline-flex items-center gap-1">
                <Home className="h-3.5 w-3.5 text-slate-400" />
                <strong className="text-white">{formattedArea.value}</strong> {formattedArea.label}
              </span>
            )}
            {displayUnit !== 'usd_sqft' && (
              <span className="text-[10px] text-slate-400">(Approx. localized)</span>
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

          {/* Top-Left: Clickable AI Visualization & Architectural Accuracy Disclosure Pill (concise on mobile) */}
          <div
            className="absolute left-2.5 top-2.5 z-20 flex max-w-[44%] items-center gap-1.5 sm:left-4 sm:top-4 sm:max-w-[52%]"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {!resolved.isOriginal && resolved.isVirtuallyModified && (
              <button
                type="button"
                onClick={() => setDisclosureModalOpen(true)}
                title="View AI Visualization & Architectural Accuracy Disclosure"
                className="inline-flex min-w-0 items-center gap-1 sm:gap-1.5 rounded-full border border-white/25 bg-black/75 px-2 py-1 text-[10px] sm:px-3 sm:text-[11px] font-medium text-white backdrop-blur-md shadow-md hover:bg-black/90 transition-colors"
              >
                <Sparkles className="h-3 w-3 shrink-0" style={{ color: brandColor }} />
                <span className="sm:hidden truncate">AI-Enhanced</span>
                <span className="hidden sm:inline truncate">{disclosureText}</span>
                <Info className="h-3 w-3 shrink-0 text-slate-300" />
              </button>
            )}
            {resolved.isOriginal && resolved.imageUrl && (
              <button
                type="button"
                onClick={() => setDisclosureModalOpen(true)}
                className="inline-flex min-w-0 items-center gap-1 sm:gap-1.5 rounded-full border border-emerald-400/35 bg-black/75 px-2 py-1 text-[10px] sm:px-3 sm:text-[11px] font-medium text-emerald-200 backdrop-blur-md hover:bg-black/90 transition-colors"
              >
                <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-400" />
                <span className="sm:hidden truncate">Original</span>
                <span className="hidden sm:inline truncate">Verified Original Photo</span>
              </button>
            )}
          </div>

          {/* Top-Right Stage Action Pills: Auto-Tour (sm+) + 1-Tap Original + Compare + Motion/Still */}
          <div
            className="absolute right-2.5 top-2.5 z-20 flex items-center gap-1.5 sm:right-4 sm:top-4 sm:gap-2"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {!compareMode && (
              <button
                type="button"
                onClick={() => {
                  setSmartIntroDismissed(true)
                  setAutoTourActive((v) => !v)
                }}
                aria-pressed={autoTourActive}
                title={autoTourActive ? 'Pause guided auto-walkthrough' : 'Resume guided tour'}
                className={`hidden sm:inline-flex items-center gap-1 rounded-full border px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-semibold backdrop-blur-md transition-colors ${
                  autoTourActive
                    ? 'border-emerald-400 bg-emerald-500/25 text-emerald-100'
                    : 'border-white/20 bg-black/70 text-white hover:bg-black/85'
                }`}
              >
                {autoTourActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                <span className="hidden md:inline">
                  {autoTourActive ? 'Pause Tour' : 'Guided Tour'}
                </span>
              </button>
            )}

            {activePerspective?.originalImageUrl && !compareMode && (
              <button
                type="button"
                onClick={() => {
                  setSmartIntroDismissed(true)
                  setQuickViewOriginal((v) => !v)
                }}
                aria-pressed={quickViewOriginal}
                title="One-tap toggle to inspect the unedited original property photo"
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-semibold backdrop-blur-md transition-colors ${
                  quickViewOriginal
                    ? 'border-emerald-400 bg-emerald-500/25 text-emerald-100'
                    : 'border-white/20 bg-black/70 text-white hover:bg-black/85'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {quickViewOriginal ? 'Viewing Original' : 'View Original'}
                </span>
                <span className="sm:hidden">{quickViewOriginal ? 'AI' : 'Orig'}</span>
              </button>
            )}

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
                onClick={() => {
                  setSmartIntroDismissed(true)
                  setQuickViewOriginal(false)
                  setCompareMode((c) => !c)
                }}
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
                <span className="hidden sm:inline">{compareMode ? 'Exit Compare' : 'Compare'}</span>
              </button>
            )}
          </div>

          {/* Desktop Non-Blocking 30-Second Smart Intro Hook (on mobile, renders below stage so the room photo stays unobstructed) */}
          {!smartIntroDismissed && !compareMode && !isEmbed && guideMode === 'off' && !autoTourActive && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="hidden sm:flex absolute left-1/2 bottom-20 z-20 w-[92%] max-w-lg -translate-x-1/2 rounded-2xl border border-white/20 bg-slate-950/90 px-4 py-2.5 backdrop-blur-md shadow-2xl items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">
                  30-Second Smart Intro or Explore Freely
                </p>
                <p className="text-[11px] text-slate-300">
                  Preview signature spaces &amp; Before/After highlights, or steer any wall yourself.
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={startSmartIntro}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-950 transition-transform hover:brightness-110"
                  style={{ backgroundColor: brandColor }}
                >
                  <Play className="h-3 w-3" />
                  30s Intro
                </button>
                <button
                  type="button"
                  onClick={() => setSmartIntroDismissed(true)}
                  className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/10"
                >
                  Explore Freely
                </button>
              </div>
            </div>
          )}

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

          {(guideMode === 'narration' || (guideMode === 'off' && captionsEnabled)) &&
            activeGuideTrack &&
            !compareMode && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="hidden sm:block absolute left-1/2 bottom-20 z-20 w-[90%] max-w-2xl -translate-x-1/2 rounded-xl border border-white/15 bg-black/80 px-4 py-2.5 text-center backdrop-blur-md shadow-xl"
            >
              <div className="flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-cyan-300 mb-1">
                {guideMode === 'narration' ? <Mic className="h-3 w-3" /> : <Subtitles className="h-3 w-3" />}
                <span>
                  {guideMode === 'narration' ? 'Audio Narration' : 'Silent Captions'} ·{' '}
                  {PROPERTY_LANGUAGE_PRESETS.find((l) => l.code === guideLanguage)?.nativeLabel}
                </span>
                <button
                  type="button"
                  onClick={toggleGuidePlayPause}
                  className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white hover:bg-white/20"
                >
                  {isGuidePlaying ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5" />}
                  {isGuidePlaying ? 'Pause' : 'Listen'}
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
                    Illustrative Remodel Concept
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

      {/* Mobile Below-Stage 30-Second Smart Intro Hook (keeps mobile architectural canvas 100% unobstructed) */}
      {!smartIntroDismissed && !compareMode && !isEmbed && guideMode === 'off' && !autoTourActive && (
        <div className="sm:hidden border-t border-white/10 bg-slate-900/95 px-3 py-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-white truncate">30s Smart Intro</p>
            <p className="text-[10px] text-slate-400 truncate">Guided highlights or steer freely</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={startSmartIntro}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold text-slate-950"
              style={{ backgroundColor: brandColor }}
            >
              <Play className="h-3 w-3" />
              Intro
            </button>
            <button
              type="button"
              onClick={() => setSmartIntroDismissed(true)}
              className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-200"
            >
              Explore
            </button>
          </div>
        </div>
      )}

      {/* Mobile Below-Stage Guide & Silent Captions Strip (never covers the room photo on small screens) */}
      {(guideMode !== 'off' || captionsEnabled) && activeGuideTrack && !compareMode && (
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
                    : guideMode === 'narration'
                      ? `Narration · ${PROPERTY_LANGUAGE_PRESETS.find((l) => l.code === guideLanguage)?.nativeLabel}`
                      : `Silent Captions · ${PROPERTY_LANGUAGE_PRESETS.find((l) => l.code === guideLanguage)?.nativeLabel}`}
                </span>
                {guideMode !== 'off' ? (
                  <button
                    type="button"
                    onClick={toggleGuidePlayPause}
                    className="shrink-0 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white"
                  >
                    {isGuidePlaying ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5" />}
                    {isGuidePlaying ? 'Pause' : 'Play'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCaptionsEnabled(false)}
                    className="shrink-0 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300"
                  >
                    Hide CC
                  </button>
                )}
              </div>
              <p className="text-xs leading-relaxed text-slate-200">{activeGuideTrack.script}</p>
            </div>
          </div>
        </div>
      )}

      {/* Streamlined 2-Row Primary Control Bar + Compact Expandable Tour Controls Drawer */}
      <div
        className={`z-20 border-t border-white/10 bg-slate-950/95 backdrop-blur-xl ${
          isEmbed ? 'px-2.5 py-2 space-y-2 sm:px-3 sm:py-2.5' : 'px-3 py-2.5 space-y-2 sm:px-6 sm:py-3.5 sm:space-y-2.5'
        }`}
      >
        {/* PRIMARY ROW 1: Spaces Rail + Compact Tour Controls Drawer Toggle */}
        <div className="flex items-center justify-between gap-2">
          {sortedRooms.length > 0 && (
            <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2 overflow-x-auto whitespace-nowrap pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="shrink-0 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-0.5">
                Spaces
              </span>
              {sortedRooms.map((room) => {
                const isSelected = room.id === activeRoom?.id
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => {
                      setSmartIntroDismissed(true)
                      handleSelectRoom(room)
                    }}
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
                  </button>
                )
              })}
            </div>
          )}

          {/* Compact Tour Controls Popover/Drawer Trigger (Lighting, Guide, CC, Language, Units, Music) */}
          <button
            type="button"
            onClick={() => setTourControlsOpen((open) => !open)}
            aria-expanded={tourControlsOpen}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold transition-all ${
              tourControlsOpen
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
                : 'border-white/15 bg-white/5 text-slate-200 hover:border-white/30 hover:bg-white/10'
            }`}
          >
            <Settings2 className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Tour Controls</span>
            <span className="sm:hidden">Controls</span>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-300">
              {guideLanguage.toUpperCase()}
              {captionsEnabled ? '·CC' : ''}
            </span>
          </button>
        </div>

        {/* PRIMARY ROW 2: Explore Mode Switcher (Original / Redesign / Events / Additions / Lifestyle) + Contextual Sub-Pills */}
        <div className="space-y-2 border-t border-white/5 pt-2">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            {/* Mode Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="shrink-0 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-0.5">
                Explore
              </span>
              <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-slate-900/80 p-0.5">
                {(
                  [
                    { id: 'original', label: 'As-Is Original' },
                    { id: 'redesign', label: 'Redesign' },
                    { id: 'events', label: 'Events' },
                    { id: 'additions', label: 'Additions' },
                    { id: 'lifestyle', label: 'Lifestyle Match' },
                  ] as Array<{ id: PrimaryExploreTab; label: string }>
                ).map((tab) => {
                  const isActive = exploreTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setSmartIntroDismissed(true)
                        setExploreTab(tab.id)
                        if (tab.id === 'original') {
                          setQuickViewOriginal(false)
                          setSelectedEvent('none')
                          setSelectedAddition('none')
                          setSelectedStyle('as_is')
                        } else if (tab.id === 'redesign') {
                          setQuickViewOriginal(false)
                          setSelectedEvent('none')
                          setSelectedAddition('none')
                          if (selectedStyle === 'as_is') {
                            const firstAiStyle = availableStylePresets.find((s) => s.id !== 'as_is')
                            if (firstAiStyle) setSelectedStyle(firstAiStyle.id)
                          }
                        } else if (tab.id === 'events') {
                          setQuickViewOriginal(false)
                          setSelectedAddition('none')
                          if (selectedEvent === 'none') {
                            const firstEvt = availableEventPresets.find((e) => e.id !== 'none')
                            if (firstEvt) setSelectedEvent(firstEvt.id)
                          }
                        } else if (tab.id === 'additions') {
                          setQuickViewOriginal(false)
                          setSelectedEvent('none')
                          if (selectedAddition === 'none') {
                            const firstAdd = availableAdditionPresets.find((a) => a.id !== 'none')
                            if (firstAdd) setSelectedAddition(firstAdd.id)
                          }
                        }
                      }}
                      aria-pressed={isActive}
                      className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                        isActive
                          ? 'text-slate-950 shadow-sm'
                          : 'text-slate-300 hover:text-white'
                      }`}
                      style={isActive ? { backgroundColor: brandColor } : undefined}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Active Mode Contextual Sub-Pills (Only 1 category visible at a time to eliminate clutter) */}
            {exploreTab === 'original' && (
              <div className="flex items-center gap-2 text-[11px] text-emerald-300 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span>Inspecting unedited original listing photography.</span>
                {canCompare && (
                  <button
                    type="button"
                    onClick={() => setCompareMode(true)}
                    className="shrink-0 rounded-md border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-500/25"
                  >
                    Open Split Compare
                  </button>
                )}
              </div>
            )}

            {exploreTab === 'redesign' && (
              <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {availableStylePresets
                  .filter((p) => p.id !== 'as_is')
                  .map((preset) => {
                    const isActive =
                      !quickViewOriginal &&
                      selectedStyle === preset.id &&
                      selectedEvent === 'none' &&
                      selectedAddition === 'none'
                    const hasVariantForStyle = Boolean(
                      activePerspective?.variants?.some((v) => v.style === preset.id)
                    )
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSlideDir(0)
                          setQuickViewOriginal(false)
                          setSelectedEvent('none')
                          setSelectedAddition('none')
                          setSelectedStyle(preset.id)
                        }}
                        aria-pressed={isActive}
                        className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
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
            )}

            {exploreTab === 'events' && (
              <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {availableEventPresets.map((preset) => {
                  const isActive = !quickViewOriginal && selectedEvent === preset.id
                  const hasEventPlate =
                    preset.id === 'none' ||
                    Boolean(activePerspective?.variants?.some((v) => v.event === preset.id))
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSlideDir(0)
                        setQuickViewOriginal(false)
                        setSelectedAddition('none')
                        setSelectedEvent(preset.id)
                      }}
                      aria-pressed={isActive}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                        isActive
                          ? 'border-amber-400 bg-amber-500/20 text-amber-100 shadow-sm'
                          : 'border-white/10 bg-slate-900/80 text-slate-300 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      <PartyPopper className="h-3 w-3 text-amber-400/90" />
                      <span>{preset.shortLabel}</span>
                      {preset.id !== 'none' && hasEventPlate && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {exploreTab === 'additions' && (
              <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {availableAdditionPresets.map((preset) => {
                  const isActive = !quickViewOriginal && selectedAddition === preset.id
                  const hasAdditionPlate =
                    preset.id === 'none' ||
                    Boolean(activePerspective?.variants?.some((v) => v.addition === preset.id))
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSlideDir(0)
                        setQuickViewOriginal(false)
                        setSelectedEvent('none')
                        setSelectedAddition(preset.id)
                      }}
                      aria-pressed={isActive}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                        isActive
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100 shadow-sm'
                          : 'border-white/10 bg-slate-900/80 text-slate-300 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      <Hammer className="h-3 w-3 text-emerald-400/90" />
                      <span>{preset.shortLabel}</span>
                      {preset.estimatedCostRange && (
                        <span className="text-[10px] text-emerald-300/90">
                          ({preset.estimatedCostRange})
                        </span>
                      )}
                      {preset.id !== 'none' && hasAdditionPlate && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {exploreTab === 'lifestyle' && (
              <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {BUYER_LIFESTYLE_MATCHES.map((match) => {
                  const isSelected = buyerProfile === match.id
                  return (
                    <button
                      key={match.id}
                      type="button"
                      onClick={() => applyLifestyleRecommendation(match.id)}
                      aria-pressed={isSelected}
                      className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all ${
                        isSelected
                          ? 'border-violet-400 bg-violet-500/20 text-violet-100'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      <HeartHandshake className="h-3 w-3 text-violet-300" />
                      {match.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Additions Illustrative Cost Range Disclaimer */}
          {exploreTab === 'additions' && selectedAddition !== 'none' && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/25 bg-emerald-950/20 px-3 py-1.5 text-[11px] text-emerald-100">
              <span>
                <strong>Illustrative Concept Cost Range:</strong> Shown ranges are non-binding concept estimates only — subject to local zoning, lot coverage, setbacks, HOA review, and licensed contractor bids.
              </span>
            </div>
          )}

          {/* Lifestyle Matcher Decision Cues Card */}
          {exploreTab === 'lifestyle' && (
            <div className="flex flex-col gap-2 rounded-lg border border-violet-500/25 bg-violet-950/25 px-3 py-2 text-[11px] text-violet-100 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {activeBuyerMatch.decisionCues.map((cue) => (
                    <span
                      key={cue}
                      className="rounded-full border border-violet-400/35 bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-100"
                    >
                      ✓ {cue}
                    </span>
                  ))}
                </div>
                <p className="text-slate-200">{activeBuyerMatch.recommendation}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  buyerProfile === 'explorer'
                    ? startSmartIntro()
                    : applyLifestyleRecommendation(buyerProfile)
                }
                className="shrink-0 self-start sm:self-center rounded-md bg-violet-500/35 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-violet-500/50"
              >
                {activeBuyerMatch.ctaText}
              </button>
            </div>
          )}
        </div>

        {/* EXPANDABLE COMPACT TOUR CONTROLS DRAWER (Lighting, Guide, Silent CC, Language, Localized Units/Currency, Music) */}
        <AnimatePresence initial={false}>
          {tourControlsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-white/10"
            >
              <div className="pt-2.5 pb-1 grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3 text-xs">
                {/* Lighting */}
                <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Lighting
                  </span>
                  <div className="inline-flex items-center gap-1">
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
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all ${
                            isActive ? 'text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
                          }`}
                          style={isActive ? { backgroundColor: brandColor } : undefined}
                        >
                          <Icon className="h-3 w-3" />
                          <span>{preset.shortLabel}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Guide Mode & Silent Captions */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                    Guide &amp; CC
                  </span>
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setGuideMode('off')}
                      aria-pressed={guideMode === 'off'}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ${
                        guideMode === 'off' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <VolumeX className="h-3 w-3" />
                      Off
                    </button>
                    <button
                      type="button"
                      onClick={() => setGuideMode('narration')}
                      aria-pressed={guideMode === 'narration'}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ${
                        guideMode === 'narration' ? 'text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
                      }`}
                      style={guideMode === 'narration' ? { backgroundColor: brandColor } : undefined}
                    >
                      <Mic className="h-3 w-3" />
                      Voice
                    </button>
                    <button
                      type="button"
                      onClick={() => setGuideMode('agent_sync')}
                      aria-pressed={guideMode === 'agent_sync'}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ${
                        guideMode === 'agent_sync' ? 'text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
                      }`}
                      style={guideMode === 'agent_sync' ? { backgroundColor: brandColor } : undefined}
                    >
                      <UserCheck className="h-3 w-3" />
                      Agent
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaptionsEnabled((v) => !v)}
                      aria-pressed={captionsEnabled}
                      title="Toggle Silent Captions (browse quietly in transit or offices)"
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${
                        captionsEnabled
                          ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Subtitles className="h-3 w-3" />
                      CC
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSmartIntroDismissed(true)
                        setAutoTourActive((v) => !v)
                      }}
                      aria-pressed={autoTourActive}
                      title="Toggle Guided Auto-Tour"
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${
                        autoTourActive
                          ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {autoTourActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      Auto
                    </button>
                  </div>
                </div>

                {/* Language + Localized Units/Currency */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2">
                  <div className="inline-flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5 text-slate-400" />
                    {availableLanguages.map((lang) => {
                      const isActive = guideLanguage === lang.code
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => handleChangeLanguage(lang.code)}
                          aria-pressed={isActive}
                          className={`rounded-md px-2 py-1 text-[11px] font-medium ${
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
                  <div className="inline-flex items-center gap-1 border-l border-white/10 pl-2">
                    {(
                      [
                        { id: 'usd_sqft', label: 'USD·ft²' },
                        { id: 'eur_sqm', label: 'EUR·m²' },
                        { id: 'jpy_sqm', label: 'JPY·m²' },
                      ] as Array<{ id: DisplayLocaleUnit; label: string }>
                    ).map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setDisplayUnit(u.id)}
                        aria-pressed={displayUnit === u.id}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          displayUnit === u.id
                            ? 'bg-cyan-500/25 text-cyan-200'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ambient Music Track Selector */}
                {musicTracks.length > 0 && (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 md:col-span-2 lg:col-span-3">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      <Music className="h-3.5 w-3.5 text-cyan-400" />
                      Ambient Music (Auto-Ducks for Voice)
                    </span>
                    <div className="inline-flex items-center gap-1 overflow-x-auto whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setActiveMusicTrackId('off')}
                        aria-pressed={activeMusicTrackId === 'off'}
                        className={`rounded-md px-2 py-1 text-[11px] font-medium ${
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
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium ${
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Persistent AI Visualization & Architectural Accuracy Disclaimer + Optional Attribution */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-[10px] sm:text-[11px] text-slate-400">
          <button
            type="button"
            onClick={() => setDisclosureModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-left hover:text-white transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
            <span>
              <strong className="text-slate-200">AI-Enhanced Visualization:</strong> Grounded in actual property photos, dimensions &amp; features. Tap for full disclosure.
            </span>
          </button>
          {!hideSceneFlowBranding && (
            <span className="inline-flex items-center gap-1 text-slate-400 shrink-0">
              <Sparkles className="h-3 w-3 text-cyan-400" />
              SceneFlow Immersive Tour™
            </span>
          )}
        </div>
      </div>

      {/* AI Visualization & Architectural Grounding Disclosure Modal */}
      <AnimatePresence>
        {disclosureModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            onClick={() => setDisclosureModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="AI Visualization and Architectural Accuracy Disclosure"
              className="w-full max-w-lg rounded-2xl border border-white/15 bg-slate-950 p-5 sm:p-6 text-white shadow-2xl space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      AI Visualization &amp; Property Accuracy Disclosure
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Transparency &amp; MLS Compliance Notice
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDisclosureModalOpen(false)}
                  aria-label="Close disclosure"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs leading-relaxed text-slate-300">
                <p>
                  This interactive tour is <strong className="text-white">AI-enhanced for buyer visualization and inspiration</strong>, grounded directly in actual VSP/broker-captured property photography, licensed exterior &amp; aerial captures (with compliant official map/neighborhood embeds where enabled), structural room dimensions, window placements, sightlines, and existing architectural features.
                </p>
                <p>
                  <strong className="text-white">Inspect Unaltered Photos Anytime:</strong> Tap{' '}
                  <span className="text-cyan-300 font-semibold">View Original</span>, select{' '}
                  <span className="text-cyan-300 font-semibold">As-Is Original</span>, or open{' '}
                  <span className="text-cyan-300 font-semibold">Compare</span> to inspect raw, unedited listing photography side-by-side.
                </p>
                <p>
                  <strong className="text-white">Illustrative Remodel &amp; Addition Concept Ranges:</strong> Virtually staged furnishings, interior redesigns, live event scenarios, structural additions (e.g., wine bar, outdoor kitchen, infinity pool, Guest Casita / ADU), and displayed concept cost ranges are non-binding visualizations only and subject to independent inspection, local zoning/permitting, setbacks, HOA rules, and licensed contractor bids.
                </p>
                <p>
                  <strong className="text-white">Exported Clips &amp; Social Snapshots:</strong> Any exported clips, stills, or social teasers generated from AI-enhanced scenes carry an unmistakable AI-enhanced / illustrative visualization disclosure notice where applicable.
                </p>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setDisclosureModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-bold text-slate-950"
                  style={{ backgroundColor: brandColor }}
                >
                  Got It — Return to Tour
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                {/* Plain-Language Context Shared with Advisor */}
                <div className="mb-5 rounded-xl border border-cyan-500/25 bg-slate-900/90 p-3.5 text-xs space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                    Context Shared with Your Advisor
                  </p>
                  <p className="text-xs leading-relaxed text-slate-200">
                    {buyerContextSummary}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white">
                      {activeRoom?.name || 'Property Overview'}
                    </span>
                    <span
                      className="rounded-md px-2 py-0.5 text-[11px] font-medium text-white"
                      style={{ backgroundColor: `${brandColor}30`, color: brandColor }}
                    >
                      {activeVisionPlainLabel}
                    </span>
                    {buyerProfile !== 'explorer' && (
                      <span className="rounded-md border border-violet-400/35 bg-violet-500/20 px-2 py-0.5 text-[11px] font-medium text-violet-200">
                        {activeBuyerMatch.label}
                      </span>
                    )}
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
