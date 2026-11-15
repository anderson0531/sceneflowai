'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import { toast } from 'sonner'
import {
  AlertCircle,
  Camera,
  Check,
  Columns2,
  Crop,
  FlipHorizontal2,
  Focus,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Sun,
  Timer,
  Upload,
  VideoOff,
  Wand2,
  ZoomIn,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import {
  buildArtStyleSpecFromValue,
  isPhotorealisticArtStyle,
} from '@/lib/artStyle/globalArtStyle'
import type {
  SelfieBackdropMode,
  SelfieCollarMode,
  SelfieEnhanceOptions,
  SelfieExpressionMode,
  SelfieFramingPreset,
  SelfieLightingMode,
  SelfieSkinComplexionMode,
} from '@/lib/character/characterReferencePrompts'
import {
  applyPixelDragToSelfieTransform,
  clampSelfieCropTransform,
  computeAutoCenterTransformFromFaceBox,
  DEFAULT_SELFIE_CROP_TRANSFORM,
  detectPrimaryFaceBox,
  drawFramedSelfieToCanvas,
  evaluateSelfieLighting,
  exportFramedSelfie,
  SELFIE_MAX_ROTATION_DEG,
  SELFIE_MAX_ZOOM,
  SELFIE_MIN_ZOOM,
  type SelfieCropTransform,
  type SelfieLightingAssessment,
} from '@/lib/character/selfieFraming'

export type SelfieSaveTarget =
  | 'identity'
  | 'likeness_primary'
  | 'likeness_secondary'

export interface CharacterSelfieSaveResult {
  target: SelfieSaveTarget
  imageUrl: string
  visionDescription?: string | null
  syncAppearance: boolean
  wasAiEnhanced: boolean
  enhanceIterationCount?: number
  rawFile?: File
}

export interface CharacterSelfieStudioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId?: string
  characterId: string
  characterName: string
  existingAppearance?: string | null
  wardrobeDescription?: string | null
  defaultArtStyle?: string
  target?: SelfieSaveTarget
  onSaveSelfie: (result: CharacterSelfieSaveResult) => Promise<void> | void
  onFallbackUploadClick?: () => void
}

interface EnhancedSelfieCandidate {
  id: string
  passNumber: number
  imageUrl: string
  sourceFramedDataUrl: string
  visionDescription: string | null
  qualityFeedback?: {
    originalScore: number
    issuesFixed: string[]
    improvements: string[]
  }
}

type StudioStageMode = 'capture' | 'studio'
type PreviewDisplayMode = 'crop' | 'split' | 'enhanced'
type PresetKey =
  | 'studio_headshot'
  | 'groom_and_beautify'
  | 'natural_portrait'
  | 'casting_neutral'
  | 'custom'

const ENHANCE_CREDITS = IMAGE_CREDITS.GEMINI_EDIT
const MAX_ENHANCE_PASSES = 3

const PRESET_CONFIGS: Record<Exclude<PresetKey, 'custom'>, SelfieEnhanceOptions> = {
  studio_headshot: {
    framingPreset: 'casting_headshot',
    backdropMode: 'neutral_gray',
    lightingMode: 'studio_key_fill',
    fixLensDistortion: true,
    fixEyeContact: true,
    removeGlassesGlare: true,
    skinComplexionMode: 'camera_ready_polish',
    groomHairAndBeard: true,
    fixRedEye: true,
    harmonizeSymmetry: false,
    expressionMode: 'keep_natural',
    collarMode: 'keep_original',
  },
  groom_and_beautify: {
    framingPreset: 'casting_headshot',
    backdropMode: 'neutral_gray',
    lightingMode: 'studio_key_fill',
    fixLensDistortion: true,
    fixEyeContact: true,
    removeGlassesGlare: true,
    skinComplexionMode: 'studio_makeup_retouch',
    groomHairAndBeard: true,
    fixRedEye: true,
    harmonizeSymmetry: true,
    expressionMode: 'keep_natural',
    collarMode: 'keep_original',
  },
  natural_portrait: {
    framingPreset: 'casting_headshot',
    backdropMode: 'soft_blur_original',
    lightingMode: 'natural_daylight',
    fixLensDistortion: true,
    fixEyeContact: true,
    removeGlassesGlare: true,
    skinComplexionMode: 'natural_texture',
    groomHairAndBeard: false,
    fixRedEye: true,
    harmonizeSymmetry: false,
    expressionMode: 'keep_natural',
    collarMode: 'keep_original',
  },
  casting_neutral: {
    framingPreset: 'casting_headshot',
    backdropMode: 'neutral_gray',
    lightingMode: 'studio_key_fill',
    fixLensDistortion: true,
    fixEyeContact: true,
    removeGlassesGlare: true,
    skinComplexionMode: 'camera_ready_polish',
    groomHairAndBeard: true,
    fixRedEye: true,
    harmonizeSymmetry: true,
    expressionMode: 'neutral_casting',
    collarMode: 'neutral_crewneck',
  },
}

export function CharacterSelfieStudioDialog({
  open,
  onOpenChange,
  projectId,
  characterId,
  characterName,
  existingAppearance,
  wardrobeDescription,
  defaultArtStyle,
  target = 'identity',
  onSaveSelfie,
  onFallbackUploadClick,
}: CharacterSelfieStudioDialogProps) {
  // Stage state
  const [stageMode, setStageMode] = useState<StudioStageMode>('capture')
  const [previewMode, setPreviewMode] = useState<PreviewDisplayMode>('crop')

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lightingSampleCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const capturedSourceCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const cropPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [isStartingCamera, setIsStartingCamera] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [feedResolution, setFeedResolution] = useState<{ w: number; h: number } | null>(null)
  const [mirrorViewfinder, setMirrorViewfinder] = useState(true)
  const [useCountdownTimer, setUseCountdownTimer] = useState(true)
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null)
  const [lightingStatus, setLightingStatus] = useState<SelfieLightingAssessment | null>(null)

  // Crop & interactive pan state
  const [capturedVersion, setCapturedVersion] = useState(0)
  const [cropTransform, setCropTransform] = useState<SelfieCropTransform>(
    DEFAULT_SELFIE_CROP_TRANSFORM
  )
  const [isDraggingCrop, setIsDraggingCrop] = useState(false)
  const dragLastPointRef = useRef<{ x: number; y: number } | null>(null)
  const [isAutoCentering, setIsAutoCentering] = useState(false)

  // Pre-save AI framing & enhancement state
  const [activePreset, setActivePreset] = useState<PresetKey>('studio_headshot')
  const [selfieOptions, setSelfieOptions] = useState<SelfieEnhanceOptions>(
    PRESET_CONFIGS.studio_headshot
  )
  const isStylizedProject = useMemo(
    () => Boolean(defaultArtStyle && !isPhotorealisticArtStyle(defaultArtStyle)),
    [defaultArtStyle]
  )
  const stylizedArtStyleTitle = useMemo(() => {
    if (!isStylizedProject || !defaultArtStyle) return null
    return buildArtStyleSpecFromValue(defaultArtStyle).title
  }, [defaultArtStyle, isStylizedProject])
  const [applyProjectArtStyle, setApplyProjectArtStyle] = useState(true)

  const [candidates, setCandidates] = useState<EnhancedSelfieCandidate[]>([])
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | 'raw'>('raw')
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [splitPosition, setSplitPosition] = useState(50)
  const [isSaving, setIsSaving] = useState(false)

  const [syncAppearance, setSyncAppearance] = useState<boolean>(
    () => !existingAppearance?.trim()
  )

  const selectedCandidate = useMemo(
    () =>
      selectedCandidateId === 'raw'
        ? null
        : candidates.find((c) => c.id === selectedCandidateId) || null,
    [candidates, selectedCandidateId]
  )

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {
          // ignore
        }
      })
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraReady(false)
  }, [])

  // Reset modal session cleanly when opened/closed
  useEffect(() => {
    if (open) {
      setStageMode('capture')
      setPreviewMode('crop')
      setCameraError(null)
      setCountdownRemaining(null)
      setCropTransform(DEFAULT_SELFIE_CROP_TRANSFORM)
      setActivePreset('studio_headshot')
      setSelfieOptions(PRESET_CONFIGS.studio_headshot)
      setApplyProjectArtStyle(true)
      setCandidates([])
      setSelectedCandidateId('raw')
      setSplitPosition(50)
      setSyncAppearance(!existingAppearance?.trim())
    } else {
      stopCameraStream()
      setCountdownRemaining(null)
    }
  }, [open, existingAppearance, stopCameraStream])

  // Ensure hardware webcam LED always turns off on unmount or tab backgrounding
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        stopCameraStream()
        setCountdownRemaining(null)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      stopCameraStream()
    }
  }, [stopCameraStream])

  const startCamera = useCallback(
    async (deviceIdOverride?: string) => {
      if (!open) return
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          'Camera capture requires a secure browser context (HTTPS) with webcam support.'
        )
        return
      }

      stopCameraStream()
      setIsStartingCamera(true)
      setCameraError(null)

      const targetDevice = deviceIdOverride ?? selectedDeviceId

      try {
        let mediaStream: MediaStream
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              ...(targetDevice
                ? { deviceId: { exact: targetDevice } }
                : { facingMode: 'user' }),
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          })
        } catch {
          // Fallback for cameras that reject 1080p or exact device constraints
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: targetDevice ? { deviceId: targetDevice } : true,
            audio: false,
          })
        }

        streamRef.current = mediaStream

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          await videoRef.current.play().catch(() => undefined)
          const vw = videoRef.current.videoWidth
          const vh = videoRef.current.videoHeight
          if (vw > 0 && vh > 0) {
            setFeedResolution({ w: vw, h: vh })
          }
        }

        const activeTrack = mediaStream.getVideoTracks()[0]
        const activeDeviceId = activeTrack?.getSettings?.().deviceId || ''
        if (activeDeviceId && !targetDevice) {
          setSelectedDeviceId(activeDeviceId)
        }

        if (navigator.mediaDevices.enumerateDevices) {
          const allDevices = await navigator.mediaDevices.enumerateDevices()
          const videos = allDevices.filter((d) => d.kind === 'videoinput')
          setCameraDevices(videos)
        }

        setCameraReady(true)
      } catch (err) {
        const name = err instanceof DOMException ? err.name : ''
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCameraError(
            'Camera permission was denied. Allow camera access in your browser address bar, then click Retry Camera.'
          )
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setCameraError(
            'No desktop camera was detected. Connect a webcam or Continuity Camera, or upload an existing photo.'
          )
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          setCameraError(
            'Your camera is currently in use by another app (e.g. Zoom or FaceTime). Close the other app and click Retry Camera.'
          )
        } else {
          setCameraError(
            err instanceof Error ? err.message : 'Unable to start desktop camera.'
          )
        }
      } finally {
        setIsStartingCamera(false)
      }
    },
    [open, selectedDeviceId, stopCameraStream]
  )

  // Start camera whenever we enter capture mode while dialog is open
  useEffect(() => {
    if (open && stageMode === 'capture') {
      void startCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stageMode])

  // Live lighting & resolution sampler in capture mode
  useEffect(() => {
    if (!open || stageMode !== 'capture' || !cameraReady) {
      setLightingStatus(null)
      return
    }

    const interval = window.setInterval(() => {
      const video = videoRef.current
      if (!video || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) {
        return
      }
      setFeedResolution((prev) =>
        prev?.w === video.videoWidth && prev?.h === video.videoHeight
          ? prev
          : { w: video.videoWidth, h: video.videoHeight }
      )

      let sampleCanvas = lightingSampleCanvasRef.current
      if (!sampleCanvas) {
        sampleCanvas = document.createElement('canvas')
        lightingSampleCanvasRef.current = sampleCanvas
      }
      const sampleW = 160
      const sampleH = Math.max(90, Math.round((video.videoHeight / video.videoWidth) * sampleW))
      sampleCanvas.width = sampleW
      sampleCanvas.height = sampleH
      const ctx = sampleCanvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return

      ctx.drawImage(video, 0, 0, sampleW, sampleH)
      const imgData = ctx.getImageData(0, 0, sampleW, sampleH)
      setLightingStatus(evaluateSelfieLighting(imgData.data, sampleW, sampleH))
    }, 650)

    return () => window.clearInterval(interval)
  }, [open, stageMode, cameraReady])

  const captureCurrentVideoFrame = useCallback(async () => {
    const video = videoRef.current
    if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
      toast.error('Camera feed is not ready yet')
      return
    }

    const sourceCanvas = document.createElement('canvas')
    sourceCanvas.width = video.videoWidth
    sourceCanvas.height = video.videoHeight
    const ctx = sourceCanvas.getContext('2d')
    if (!ctx) {
      toast.error('Unable to initialize capture canvas')
      return
    }

    // Native getUserMedia video pixels are true un-mirrored likeness.
    ctx.drawImage(video, 0, 0, sourceCanvas.width, sourceCanvas.height)
    capturedSourceCanvasRef.current = sourceCanvas

    // Stop webcam hardware immediately so camera LED turns off in Step 2!
    stopCameraStream()

    // Progressive-enhancement auto-face center on capture
    let initialTransform = DEFAULT_SELFIE_CROP_TRANSFORM
    const detectedFace = await detectPrimaryFaceBox(sourceCanvas)
    if (detectedFace) {
      initialTransform = computeAutoCenterTransformFromFaceBox(
        sourceCanvas.width,
        sourceCanvas.height,
        detectedFace
      )
    }

    setCropTransform(initialTransform)
    setCapturedVersion((v) => v + 1)
    setPreviewMode('crop')
    setStageMode('studio')
  }, [stopCameraStream])

  // Countdown timer effect
  useEffect(() => {
    if (countdownRemaining === null) return
    if (countdownRemaining <= 0) {
      setCountdownRemaining(null)
      void captureCurrentVideoFrame()
      return
    }
    const timer = window.setTimeout(() => {
      setCountdownRemaining((prev) => (prev !== null ? prev - 1 : null))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [countdownRemaining, captureCurrentVideoFrame])

  const handleShutterClick = () => {
    if (!cameraReady) return
    if (countdownRemaining !== null) {
      setCountdownRemaining(null)
      return
    }
    if (useCountdownTimer) {
      setCountdownRemaining(3)
    } else {
      void captureCurrentVideoFrame()
    }
  }

  // Redraw interactive 9:16 crop canvas whenever transform or captured frame updates
  useEffect(() => {
    if (stageMode !== 'studio') return
    const source = capturedSourceCanvasRef.current
    const preview = cropPreviewCanvasRef.current
    if (!source || !preview) return
    drawFramedSelfieToCanvas(source, preview, cropTransform, 540, 960)
  }, [stageMode, previewMode, cropTransform, capturedVersion])

  const handleAutoCenterFace = async () => {
    const source = capturedSourceCanvasRef.current
    if (!source) return
    setIsAutoCentering(true)
    try {
      const box = await detectPrimaryFaceBox(source)
      if (box) {
        setCropTransform((prev) =>
          computeAutoCenterTransformFromFaceBox(source.width, source.height, box, prev)
        )
        toast.success('Centered face on 9:16 casting eye-line')
      } else {
        setCropTransform((prev) => ({
          ...DEFAULT_SELFIE_CROP_TRANSFORM,
          flipHorizontal: prev.flipHorizontal,
        }))
        toast.info('Reset to centered 9:16 head-and-shoulders guide')
      }
    } finally {
      setIsAutoCentering(false)
    }
  }

  const updateOption = <K extends keyof SelfieEnhanceOptions>(
    key: K,
    value: SelfieEnhanceOptions[K]
  ) => {
    setActivePreset('custom')
    setSelfieOptions((prev) => ({ ...prev, [key]: value }))
  }

  const applyPreset = (preset: Exclude<PresetKey, 'custom'>) => {
    setActivePreset(preset)
    setSelfieOptions(PRESET_CONFIGS[preset])
  }

  const handleRunAiEnhance = async () => {
    const source = capturedSourceCanvasRef.current
    if (!source) {
      toast.error('Please capture a photo first')
      return
    }
    if (candidates.length >= MAX_ENHANCE_PASSES) {
      toast.error('Maximum 3 AI passes per capture — click Retake for a fresh photo')
      return
    }

    setIsEnhancing(true)
    try {
      const framed = await exportFramedSelfie(
        source,
        cropTransform,
        `selfie-source-${characterId}`,
        0.9
      )

      const effectiveArtStyle =
        isStylizedProject && !applyProjectArtStyle ? 'photorealistic' : defaultArtStyle

      const response = await fetch('/api/character/enhance-reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          characterId,
          characterName: characterName || 'Character',
          appearanceDescription: existingAppearance || undefined,
          wardrobeDescription: wardrobeDescription || undefined,
          sourceImageDataUrl: framed.dataUrl,
          iterationCount: candidates.length,
          artStyle: effectiveArtStyle,
          selfieOptions,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        if (response.status === 402 || data?.code === 'INSUFFICIENT_CREDITS') {
          throw new Error(
            `Insufficient credits (${data?.required ?? ENHANCE_CREDITS} credits required). You can still save the framed photo for free.`
          )
        }
        throw new Error(data?.error || 'AI Studio enhancement failed')
      }

      const newCandidate: EnhancedSelfieCandidate = {
        id: `pass-${Date.now()}`,
        passNumber: candidates.length + 1,
        imageUrl: data.enhancedImageUrl,
        sourceFramedDataUrl: framed.dataUrl,
        visionDescription: data.visionDescription ?? null,
        qualityFeedback: data.qualityFeedback,
      }

      setCandidates((prev) => [...prev, newCandidate])
      setSelectedCandidateId(newCandidate.id)
      setPreviewMode('split')
      toast.success(`AI Studio portrait ready (Pass ${newCandidate.passNumber}/${MAX_ENHANCE_PASSES})`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI enhancement failed')
    } finally {
      setIsEnhancing(false)
    }
  }

  const handleSaveRawFramed = async () => {
    const source = capturedSourceCanvasRef.current
    if (!source) return
    setIsSaving(true)
    try {
      const framed = await exportFramedSelfie(
        source,
        cropTransform,
        `selfie-${characterId}`,
        0.92
      )

      const blob = await upload(
        `characters/selfie-${characterId}-${Date.now()}.jpg`,
        framed.file,
        {
          access: 'public',
          handleUploadUrl: '/api/character/upload-url',
        }
      )

      let visionDescription: string | null = null
      if (target === 'identity') {
        try {
          const processRes = await fetch('/api/character/process-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              blobUrl: blob.url,
              characterName: characterName || 'Character',
            }),
          })
          if (processRes.ok) {
            const processJson = await processRes.json()
            visionDescription = processJson?.visionDescription ?? null
          }
        } catch {
          // Non-fatal: still save the uploaded selfie URL cleanly
        }
      }

      await onSaveSelfie({
        target,
        imageUrl: blob.url,
        visionDescription,
        syncAppearance,
        wasAiEnhanced: false,
        rawFile: framed.file,
      })

      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save framed selfie')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAiCandidate = async () => {
    if (!selectedCandidate) return
    setIsSaving(true)
    try {
      await onSaveSelfie({
        target,
        imageUrl: selectedCandidate.imageUrl,
        visionDescription: selectedCandidate.visionDescription,
        syncAppearance,
        wasAiEnhanced: true,
        enhanceIterationCount: selectedCandidate.passNumber,
      })
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save enhanced identity')
    } finally {
      setIsSaving(false)
    }
  }

  const targetBadgeText =
    target === 'likeness_primary'
      ? 'Reference Likeness Donor [1]'
      : target === 'likeness_secondary'
        ? 'Family Blend Donor [2]'
        : 'Primary Character Identity'

  const remainingPasses = Math.max(0, MAX_ENHANCE_PASSES - candidates.length)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto bg-zinc-950 border-zinc-800 text-zinc-100 p-0 gap-0">
        {/* Top Lens-Gaze Beacon during 3s Countdown */}
        {stageMode === 'capture' && countdownRemaining !== null && (
          <div className="bg-gradient-to-r from-emerald-600/95 via-cyan-600/95 to-emerald-600/95 text-white px-4 py-2 text-center text-xs font-semibold tracking-wide flex items-center justify-center gap-2 animate-pulse">
            <Focus className="w-4 h-4" />
            <span>
              Look directly up into your camera lens — capturing in {countdownRemaining}…
            </span>
          </div>
        )}

        <DialogHeader className="px-6 pt-5 pb-3 border-b border-zinc-800/80">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold text-white">
              <span className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                <Camera className="w-4 h-4" />
              </span>
              <span>Selfie Studio — {characterName || 'Character'}</span>
              <span className="rounded-full bg-zinc-800 border border-zinc-700 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300">
                {targetBadgeText}
              </span>
            </DialogTitle>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span
                className={`px-2 py-0.5 rounded-full border ${
                  stageMode === 'capture'
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200 font-medium'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                1. Capture
              </span>
              <span className="text-zinc-600">→</span>
              <span
                className={`px-2 py-0.5 rounded-full border ${
                  stageMode === 'studio'
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-200 font-medium'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                2. Frame &amp; AI Studio Enhance
              </span>
            </div>
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            {stageMode === 'capture'
              ? 'Position your head and shoulders inside the 9:16 casting guide with eyes near the upper line — no grooming or makeup prep needed.'
              : 'Fine-tune your 9:16 portrait framing for free, or apply AI Grooming, Correction & Studio Enhancement while retaining 100% of your base identity.'}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: LIVE DESKTOP CAMERA VIEWFINDER */}
        {stageMode === 'capture' && (
          <div className="p-6 space-y-4">
            {/* Top Camera Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {cameraDevices.length > 1 && (
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => {
                      const nextId = e.target.value
                      setSelectedDeviceId(nextId)
                      void startCamera(nextId)
                    }}
                    className="h-8 rounded-md bg-zinc-900 border border-zinc-700 px-2.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                    aria-label="Select camera"
                  >
                    {cameraDevices.map((dev, idx) => (
                      <option key={dev.deviceId || idx} value={dev.deviceId}>
                        {dev.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => setUseCountdownTimer((v) => !v)}
                  className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-xs transition-colors ${
                    useCountdownTimer
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Give yourself 3 seconds to look up into the camera lens"
                >
                  <Timer className="w-3.5 h-3.5" />
                  <span>3s Gaze Timer {useCountdownTimer ? 'On' : 'Off'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMirrorViewfinder((v) => !v)}
                  className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-xs transition-colors ${
                    mirrorViewfinder
                      ? 'bg-zinc-800 border-zinc-600 text-zinc-200'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Mirrors the live preview for natural positioning; captured photo uses true un-mirrored likeness"
                >
                  <FlipHorizontal2 className="w-3.5 h-3.5" />
                  <span>Mirror Preview</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                {feedResolution && (
                  <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 tabular-nums">
                    {feedResolution.w}×{feedResolution.h}
                  </span>
                )}
                {lightingStatus && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${
                      lightingStatus.status === 'good'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                    }`}
                  >
                    <Sun className="w-3 h-3 shrink-0" />
                    <span>
                      {lightingStatus.status === 'good'
                        ? 'Good lighting'
                        : lightingStatus.message}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Live Video Stage with 9:16 Casting Overlay */}
            <div className="relative mx-auto w-full max-w-3xl aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800 shadow-2xl">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`w-full h-full object-cover transition-opacity duration-200 ${
                  cameraReady ? 'opacity-100' : 'opacity-0'
                } ${mirrorViewfinder ? '-scale-x-100' : ''}`}
              />

              {/* 9:16 Portrait Mask & Head-and-Shoulders Silhouette Guide */}
              {cameraReady && !cameraError && (
                <div className="absolute inset-0 pointer-events-none flex items-stretch justify-center">
                  <div className="flex-1 bg-black/60 backdrop-blur-[1px]" />
                  <div className="relative h-full aspect-[9/16] border-x-2 border-cyan-400/70 shadow-[0_0_0_1px_rgba(0,0,0,0.5)]">
                    {/* Corner brackets */}
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-300 rounded-tl-sm" />
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-300 rounded-tr-sm" />
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-300 rounded-bl-sm" />
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-300 rounded-br-sm" />

                    {/* Upper-third eye-level dashed guide */}
                    <div
                      className="absolute left-3 right-3 border-t border-dashed border-cyan-300/65 flex justify-end"
                      style={{ top: '35%' }}
                    >
                      <span className="-mt-4 px-1.5 py-0.5 rounded bg-black/65 text-[9px] uppercase tracking-wider text-cyan-200">
                        Eye Line
                      </span>
                    </div>

                    {/* Subtle Head & Shoulders SVG Guide */}
                    <svg
                      viewBox="0 0 180 320"
                      className="w-full h-full opacity-35 text-cyan-200"
                      fill="none"
                    >
                      <ellipse
                        cx="90"
                        cy="115"
                        rx="40"
                        ry="52"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeDasharray="5 5"
                      />
                      <path
                        d="M18 288 C24 226, 54 198, 90 198 C126 198, 156 226, 162 288"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeDasharray="5 5"
                      />
                    </svg>

                    <div className="absolute bottom-2.5 inset-x-0 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-black/70 text-[10px] text-zinc-200 border border-white/10">
                        9:16 Casting Frame
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 bg-black/60 backdrop-blur-[1px]" />
                </div>
              )}

              {/* Countdown Big Number */}
              {countdownRemaining !== null && countdownRemaining > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
                  <div className="w-20 h-20 rounded-full bg-black/70 border-2 border-cyan-400 flex items-center justify-center text-4xl font-bold text-white shadow-xl">
                    {countdownRemaining}
                  </div>
                </div>
              )}

              {/* Loading / Permission Error Overlay */}
              {(isStartingCamera || cameraError || !cameraReady) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950/90">
                  {isStartingCamera ? (
                    <>
                      <Loader2 className="w-9 h-9 text-cyan-400 animate-spin mb-3" />
                      <p className="text-sm font-medium text-zinc-200">
                        Starting desktop camera…
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        Approve browser camera access if prompted
                      </p>
                    </>
                  ) : cameraError ? (
                    <div className="max-w-md space-y-3">
                      <div className="mx-auto w-11 h-11 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-300">
                        <VideoOff className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-medium text-zinc-100">Camera Unavailable</p>
                      <p className="text-xs text-zinc-400 leading-relaxed">{cameraError}</p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void startCamera()}
                          className="border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                          Retry Camera
                        </Button>
                        {onFallbackUploadClick && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              onOpenChange(false)
                              onFallbackUploadClick()
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                          >
                            <Upload className="w-3.5 h-3.5 mr-1.5" />
                            Upload Existing Photo
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Capture Shutter Bar */}
            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>

              <Button
                type="button"
                disabled={!cameraReady || isStartingCamera}
                onClick={handleShutterClick}
                className="h-11 px-7 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-950/50"
              >
                <Camera className="w-4 h-4 mr-2" />
                {countdownRemaining !== null
                  ? `Cancel (${countdownRemaining}s)`
                  : useCountdownTimer
                    ? 'Take Photo (3s Timer)'
                    : 'Take Photo Now'}
              </Button>

              <div className="text-[11px] text-zinc-500 hidden sm:block">
                True-likeness un-mirrored capture
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PRE-SAVE FRAMING & AI STUDIO WORKBENCH */}
        {stageMode === 'studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-6">
            {/* LEFT COLUMN: 9:16 Interactive Crop / Split Compare Canvas */}
            <div className="lg:col-span-5 flex flex-col items-center space-y-3">
              {/* View Mode Switcher */}
              <div className="w-full flex items-center justify-between gap-2">
                <div className="inline-flex rounded-lg bg-zinc-900 border border-zinc-800 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewMode('crop')
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                      previewMode === 'crop' || !selectedCandidate
                        ? 'bg-zinc-800 text-white font-medium'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Crop className="w-3.5 h-3.5" />
                    <span>Adjust Frame</span>
                  </button>
                  {selectedCandidate && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPreviewMode('split')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                          previewMode === 'split'
                            ? 'bg-purple-600/30 text-purple-200 font-medium'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <Columns2 className="w-3.5 h-3.5" />
                        <span>Before / After</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode('enhanced')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                          previewMode === 'enhanced'
                            ? 'bg-purple-600/30 text-purple-200 font-medium'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Result</span>
                      </button>
                    </>
                  )}
                </div>

                <span className="text-[11px] text-zinc-500">9:16 Portrait</span>
              </div>

              {/* Main 9:16 Viewport */}
              <div className="relative w-full max-w-[300px] aspect-[9/16] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700 shadow-xl select-none">
                {/* Interactive Crop Canvas */}
                <canvas
                  ref={cropPreviewCanvasRef}
                  onPointerDown={(e) => {
                    if (selectedCandidate && previewMode !== 'crop') return
                    e.currentTarget.setPointerCapture(e.pointerId)
                    setIsDraggingCrop(true)
                    dragLastPointRef.current = { x: e.clientX, y: e.clientY }
                  }}
                  onPointerMove={(e) => {
                    if (!isDraggingCrop || !dragLastPointRef.current) return
                    const source = capturedSourceCanvasRef.current
                    if (!source) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    const dx = e.clientX - dragLastPointRef.current.x
                    const dy = e.clientY - dragLastPointRef.current.y
                    dragLastPointRef.current = { x: e.clientX, y: e.clientY }
                    setCropTransform((prev) =>
                      applyPixelDragToSelfieTransform(
                        source.width,
                        source.height,
                        rect.width,
                        rect.height,
                        dx,
                        dy,
                        prev
                      )
                    )
                  }}
                  onPointerUp={() => {
                    setIsDraggingCrop(false)
                    dragLastPointRef.current = null
                  }}
                  onPointerCancel={() => {
                    setIsDraggingCrop(false)
                    dragLastPointRef.current = null
                  }}
                  onWheel={(e) => {
                    if (selectedCandidate && previewMode !== 'crop') return
                    e.preventDefault()
                    const delta = -e.deltaY * 0.0015
                    setCropTransform((prev) =>
                      clampSelfieCropTransform({ ...prev, zoom: prev.zoom + delta })
                    )
                  }}
                  className={`w-full h-full block ${
                    !selectedCandidate || previewMode === 'crop'
                      ? isDraggingCrop
                        ? 'cursor-grabbing'
                        : 'cursor-grab'
                      : 'hidden'
                  }`}
                />

                {/* Subtle Rule-of-Thirds & Eye-Line Guide while adjusting manual crop */}
                {(!selectedCandidate || previewMode === 'crop') && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div
                      className="absolute inset-x-3 border-t border-dashed border-cyan-300/50"
                      style={{ top: '36%' }}
                    />
                    <div className="absolute bottom-2 inset-x-0 text-center">
                      <span className="px-2 py-0.5 rounded bg-black/65 text-[10px] text-zinc-300">
                        Drag to pan • Scroll to zoom
                      </span>
                    </div>
                  </div>
                )}

                {/* Split Before / After Comparison */}
                {selectedCandidate && previewMode === 'split' && (
                  <div className="relative w-full h-full">
                    <img
                      src={selectedCandidate.imageUrl}
                      alt="AI Enhanced Studio Portrait"
                      className="w-full h-full object-cover"
                    />
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{ clipPath: `inset(0 ${100 - splitPosition}% 0 0)` }}
                    >
                      <img
                        src={selectedCandidate.sourceFramedDataUrl}
                        alt="Captured Framed Original"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div
                      className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)] pointer-events-none"
                      style={{ left: `${splitPosition}%` }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white text-zinc-900 flex items-center justify-center shadow-md text-[10px] font-bold">
                        ↔
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={splitPosition}
                      onChange={(e) => setSplitPosition(Number(e.target.value))}
                      aria-label="Compare captured photo and AI enhanced portrait"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-zinc-200 pointer-events-none">
                      Captured
                    </span>
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-purple-950/85 border border-purple-400/40 text-[10px] text-purple-200 pointer-events-none">
                      AI Studio
                    </span>
                  </div>
                )}

                {/* Full AI Enhanced View */}
                {selectedCandidate && previewMode === 'enhanced' && (
                  <img
                    src={selectedCandidate.imageUrl}
                    alt="AI Studio Portrait"
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Enhancing Loading Overlay */}
                {isEnhancing && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-20">
                    <Loader2 className="w-9 h-9 text-purple-400 animate-spin mb-2.5" />
                    <p className="text-xs font-semibold text-white">
                      Applying AI Studio Framing &amp; Lighting…
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Preserving exact facial likeness at 2K 9:16
                    </p>
                  </div>
                )}
              </div>

              {/* Manual Framing Sliders (shown when adjusting crop or no AI candidate active) */}
              {(!selectedCandidate || previewMode === 'crop') && (
                <div className="w-full max-w-[300px] space-y-2 rounded-lg bg-zinc-900/90 border border-zinc-800 p-3">
                  <div className="flex items-center gap-2">
                    <ZoomIn className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="text-[11px] text-zinc-400 w-10">Zoom</span>
                    <input
                      type="range"
                      min={SELFIE_MIN_ZOOM}
                      max={SELFIE_MAX_ZOOM}
                      step={0.02}
                      value={cropTransform.zoom}
                      onChange={(e) =>
                        setCropTransform((prev) =>
                          clampSelfieCropTransform({
                            ...prev,
                            zoom: Number(e.target.value),
                          })
                        )
                      }
                      className="flex-1 accent-cyan-400 h-1.5"
                    />
                    <span className="text-[10px] text-zinc-400 w-9 text-right tabular-nums">
                      {cropTransform.zoom.toFixed(1)}×
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="text-[11px] text-zinc-400 w-10">Tilt</span>
                    <input
                      type="range"
                      min={-SELFIE_MAX_ROTATION_DEG}
                      max={SELFIE_MAX_ROTATION_DEG}
                      step={0.5}
                      value={cropTransform.rotationDeg}
                      onChange={(e) =>
                        setCropTransform((prev) =>
                          clampSelfieCropTransform({
                            ...prev,
                            rotationDeg: Number(e.target.value),
                          })
                        )
                      }
                      className="flex-1 accent-cyan-400 h-1.5"
                    />
                    <span className="text-[10px] text-zinc-400 w-9 text-right tabular-nums">
                      {cropTransform.rotationDeg > 0 ? '+' : ''}
                      {cropTransform.rotationDeg.toFixed(0)}°
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    <button
                      type="button"
                      disabled={isAutoCentering}
                      onClick={() => void handleAutoCenterFace()}
                      className="flex-1 inline-flex items-center justify-center gap-1 h-7 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-cyan-200 border border-zinc-700"
                    >
                      <Focus className="w-3 h-3" />
                      <span>Auto-Center</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCropTransform((prev) => ({
                          ...prev,
                          flipHorizontal: !prev.flipHorizontal,
                        }))
                      }
                      className={`inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded text-[11px] border ${
                        cropTransform.flipHorizontal
                          ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                      }`}
                      title="Flip horizontally"
                    >
                      <FlipHorizontal2 className="w-3 h-3" />
                      <span>Flip</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCropTransform(DEFAULT_SELFIE_CROP_TRANSFORM)}
                      className="inline-flex items-center justify-center h-7 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-400 border border-zinc-700"
                      title="Reset manual crop"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}

              {/* Version Strip (Framed Raw vs AI Passes) */}
              {candidates.length > 0 && (
                <div className="w-full max-w-[300px] space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                    Select Version to Save
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCandidateId('raw')
                        setPreviewMode('crop')
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                        selectedCandidateId === 'raw'
                          ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100 font-medium'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Framed Photo (Free)
                    </button>
                    {candidates.map((cand) => (
                      <button
                        key={cand.id}
                        type="button"
                        onClick={() => {
                          setSelectedCandidateId(cand.id)
                          if (previewMode === 'crop') setPreviewMode('split')
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border transition-colors ${
                          selectedCandidateId === cand.id
                            ? 'bg-purple-500/25 border-purple-400/60 text-purple-100 font-medium'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        <span>AI Pass {cand.passNumber}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Pre-Save AI Framing & Studio Enhancement Controls */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                {/* Quick Presets */}
                <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-purple-400" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                        AI Studio Presets (Pre-Save)
                      </h3>
                    </div>
                    <span className="text-[11px] text-emerald-300/90 font-medium">
                      Retains 100% base identity
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(
                      [
                        {
                          key: 'studio_headshot',
                          title: 'Studio Headshot',
                          desc: 'Neutral gray backdrop, 85mm lens fix, hair/beard tidy & camera-ready polish',
                        },
                        {
                          key: 'groom_and_beautify',
                          title: 'Groom & Beautify',
                          desc: 'Zero-prep hair/beard groom, studio makeup retouch, red-eye & symmetry fix',
                        },
                        {
                          key: 'natural_portrait',
                          title: 'Natural Portrait',
                          desc: 'Soft portrait bokeh room cleanup, daylight balance & raw skin texture',
                        },
                        {
                          key: 'casting_neutral',
                          title: 'Casting Neutral',
                          desc: 'Calm neutral look, dark crewneck collar, groomed & symmetry-balanced',
                        },
                      ] as const
                    ).map((p) => {
                      const active = activePreset === p.key
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => applyPreset(p.key)}
                          className={`text-left rounded-lg border p-2.5 transition-all ${
                            active
                              ? 'bg-purple-500/15 border-purple-400/60 shadow-sm'
                              : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-zinc-100">
                              {p.title}
                            </span>
                            {active && <Check className="w-3.5 h-3.5 text-purple-400" />}
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-1 leading-snug">
                            {p.desc}
                          </p>
                        </button>
                      )
                    })}
                  </div>

                  {/* Global Art Style Awareness Banner when project is stylized */}
                  {isStylizedProject && stylizedArtStyleTitle && (
                    <label className="flex items-center justify-between gap-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30 px-3 py-2 cursor-pointer">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-indigo-200">
                          Match Project Global Art Style ({stylizedArtStyleTitle})
                        </p>
                        <p className="text-[10px] text-indigo-300/80">
                          Translates your facial likeness into {stylizedArtStyleTitle} for scene continuity
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={applyProjectArtStyle}
                        onChange={(e) => setApplyProjectArtStyle(e.target.checked)}
                        className="rounded accent-indigo-500 w-4 h-4 shrink-0"
                      />
                    </label>
                  )}
                </div>

                {/* AI Smart Framing + Studio Polish Controls */}
                <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-4 space-y-3.5">
                  {/* AI Reframe Mode */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300 block">
                      AI Smart Framing
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {(
                        [
                          {
                            id: 'casting_headshot',
                            label: 'Head & Shoulders',
                            hint: 'Outpaints/reframes 9:16',
                          },
                          {
                            id: 'close_portrait',
                            label: 'Tight Headshot',
                            hint: 'Closer facial framing',
                          },
                          {
                            id: 'upper_torso',
                            label: 'Upper Torso',
                            hint: 'Chest-up portrait',
                          },
                          {
                            id: 'preserve_crop',
                            label: 'Lock Manual Crop',
                            hint: 'Keep exact framing',
                          },
                        ] as Array<{
                          id: SelfieFramingPreset
                          label: string
                          hint: string
                        }>
                      ).map((opt) => {
                        const selected =
                          (selfieOptions.framingPreset ?? 'casting_headshot') === opt.id
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => updateOption('framingPreset', opt.id)}
                            className={`rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                              selected
                                ? 'bg-cyan-500/15 border-cyan-400/60 text-cyan-100'
                                : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                            }`}
                          >
                            <div className="text-[11px] font-medium leading-tight">
                              {opt.label}
                            </div>
                            <div className="text-[9px] text-zinc-500 mt-0.5">{opt.hint}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Backdrop & Lighting Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400 block">
                        Backdrop
                      </label>
                      <select
                        value={selfieOptions.backdropMode ?? 'neutral_gray'}
                        onChange={(e) =>
                          updateOption(
                            'backdropMode',
                            e.target.value as SelfieBackdropMode
                          )
                        }
                        className="w-full h-8 rounded-md bg-zinc-950 border border-zinc-700 px-2.5 text-xs text-zinc-200"
                      >
                        <option value="neutral_gray">Neutral Casting Gray (Recommended)</option>
                        <option value="warm_studio">Warm Charcoal Studio</option>
                        <option value="soft_blur_original">Soft Bokeh (Clean Room)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400 block">
                        Studio Lighting
                      </label>
                      <select
                        value={selfieOptions.lightingMode ?? 'studio_key_fill'}
                        onChange={(e) =>
                          updateOption(
                            'lightingMode',
                            e.target.value as SelfieLightingMode
                          )
                        }
                        className="w-full h-8 rounded-md bg-zinc-950 border border-zinc-700 px-2.5 text-xs text-zinc-200"
                      >
                        <option value="studio_key_fill">
                          Studio Key + Remove Screen Cast
                        </option>
                        <option value="natural_daylight">Soft Window Daylight</option>
                        <option value="preserve_original">Keep Ambient Lighting</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400 block">
                        Expression
                      </label>
                      <select
                        value={selfieOptions.expressionMode ?? 'keep_natural'}
                        onChange={(e) =>
                          updateOption(
                            'expressionMode',
                            e.target.value as SelfieExpressionMode
                          )
                        }
                        className="w-full h-8 rounded-md bg-zinc-950 border border-zinc-700 px-2.5 text-xs text-zinc-200"
                      >
                        <option value="keep_natural">Keep Captured Expression</option>
                        <option value="neutral_casting">Calm Neutral Casting Look</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400 block">
                        Neckline / Collar
                      </label>
                      <select
                        value={selfieOptions.collarMode ?? 'keep_original'}
                        onChange={(e) =>
                          updateOption('collarMode', e.target.value as SelfieCollarMode)
                        }
                        className="w-full h-8 rounded-md bg-zinc-950 border border-zinc-700 px-2.5 text-xs text-zinc-200"
                      >
                        <option value="keep_original">Keep Captured Top</option>
                        <option value="neutral_crewneck">
                          Clean Dark Crewneck (Casting Base)
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Grooming, Complexion & Beautification Section */}
                  <div className="rounded-lg bg-zinc-950/70 border border-zinc-800/90 p-3 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        Grooming, Complexion &amp; Correction
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        Saves grooming/makeup prep • Keeps pores &amp; bone structure
                      </span>
                    </div>

                    {/* Complexion / Makeup Retouch Mode */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      {(
                        [
                          {
                            id: 'camera_ready_polish',
                            label: 'Camera-Ready Polish',
                            hint: 'Clears blemishes, tired eyes & shine',
                          },
                          {
                            id: 'studio_makeup_retouch',
                            label: 'Studio Makeup & Retouch',
                            hint: 'Even concealer, matte finish & glow',
                          },
                          {
                            id: 'natural_texture',
                            label: 'Raw Skin Texture',
                            hint: 'Lighting balance only',
                          },
                        ] as Array<{
                          id: SelfieSkinComplexionMode
                          label: string
                          hint: string
                        }>
                      ).map((mode) => {
                        const selected =
                          (selfieOptions.skinComplexionMode ?? 'natural_texture') === mode.id
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => updateOption('skinComplexionMode', mode.id)}
                            className={`rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                              selected
                                ? 'bg-purple-500/15 border-purple-400/60 text-purple-100'
                                : 'bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                            }`}
                          >
                            <div className="text-[11px] font-medium leading-tight">
                              {mode.label}
                            </div>
                            <div className="text-[9px] text-zinc-500 mt-0.5">{mode.hint}</div>
                          </button>
                        )
                      })}
                    </div>

                    {/* Grooming + Optical Correction Toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
                      <label
                        className="flex items-center gap-2 rounded-lg bg-zinc-900/70 border border-zinc-800 px-2.5 py-1.5 cursor-pointer text-[11px] text-zinc-200"
                        title="Tames bedhead, cowlicks & flyaways and neatly tidies existing beard, mustache, stubble & eyebrows without changing your hairstyle or hairline"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(selfieOptions.groomHairAndBeard)}
                          onChange={(e) =>
                            updateOption('groomHairAndBeard', e.target.checked)
                          }
                          className="rounded accent-purple-500"
                        />
                        <span>Groom Hair &amp; Beard</span>
                      </label>

                      <label
                        className="flex items-center gap-2 rounded-lg bg-zinc-900/70 border border-zinc-800 px-2.5 py-1.5 cursor-pointer text-[11px] text-zinc-200"
                        title="Eliminates flash red-eye, webcam pupil glare, and tired/bloodshot sclera redness while preserving exact iris color"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(selfieOptions.fixRedEye)}
                          onChange={(e) => updateOption('fixRedEye', e.target.checked)}
                          className="rounded accent-purple-500"
                        />
                        <span>Remove Red-Eye</span>
                      </label>

                      <label
                        className="flex items-center gap-2 rounded-lg bg-zinc-900/70 border border-zinc-800 px-2.5 py-1.5 cursor-pointer text-[11px] text-zinc-200"
                        title="Subtly balances webcam squint, head tilt & off-axis facial skew without altering your true bone structure or likeness"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(selfieOptions.harmonizeSymmetry)}
                          onChange={(e) =>
                            updateOption('harmonizeSymmetry', e.target.checked)
                          }
                          className="rounded accent-purple-500"
                        />
                        <span>Facial Symmetry Fix</span>
                      </label>

                      <label
                        className="flex items-center gap-2 rounded-lg bg-zinc-900/70 border border-zinc-800 px-2.5 py-1.5 cursor-pointer text-[11px] text-zinc-300"
                        title="Corrects close-range wide-angle webcam distortion to a natural 85mm portrait lens look"
                      >
                        <input
                          type="checkbox"
                          checked={selfieOptions.fixLensDistortion !== false}
                          onChange={(e) =>
                            updateOption('fixLensDistortion', e.target.checked)
                          }
                          className="rounded accent-purple-500"
                        />
                        <span>85mm Lens Fix</span>
                      </label>

                      <label
                        className="flex items-center gap-2 rounded-lg bg-zinc-900/70 border border-zinc-800 px-2.5 py-1.5 cursor-pointer text-[11px] text-zinc-300"
                        title="Subtly aligns downward screen gaze directly into the camera lens"
                      >
                        <input
                          type="checkbox"
                          checked={selfieOptions.fixEyeContact !== false}
                          onChange={(e) => updateOption('fixEyeContact', e.target.checked)}
                          className="rounded accent-purple-500"
                        />
                        <span>Align Eye Contact</span>
                      </label>

                      <label
                        className="flex items-center gap-2 rounded-lg bg-zinc-900/70 border border-zinc-800 px-2.5 py-1.5 cursor-pointer text-[11px] text-zinc-300"
                        title="Removes computer monitor glare and reflections from eyeglasses while keeping frames intact"
                      >
                        <input
                          type="checkbox"
                          checked={selfieOptions.removeGlassesGlare !== false}
                          onChange={(e) =>
                            updateOption('removeGlassesGlare', e.target.checked)
                          }
                          className="rounded accent-purple-500"
                        />
                        <span>Remove Lens Glare</span>
                      </label>
                    </div>
                  </div>

                  {/* Generate AI Preview Button */}
                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                    <Button
                      type="button"
                      disabled={isEnhancing || isSaving || remainingPasses <= 0}
                      onClick={() => void handleRunAiEnhance()}
                      className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium"
                    >
                      {isEnhancing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      {candidates.length > 0
                        ? `Generate New AI Pass (${ENHANCE_CREDITS} cr)`
                        : `Apply AI Framing & Enhance (${ENHANCE_CREDITS} cr)`}
                    </Button>
                    <span className="text-[11px] text-zinc-500">
                      {remainingPasses} preview pass{remainingPasses === 1 ? '' : 'es'} left
                    </span>
                  </div>
                </div>

                {/* Applied Quality Feedback Summary */}
                {selectedCandidate?.qualityFeedback &&
                  selectedCandidate.qualityFeedback.improvements.length > 0 && (
                    <div className="rounded-xl bg-emerald-950/25 border border-emerald-500/25 p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-emerald-300 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          Studio Enhancements Applied (Pass {selectedCandidate.passNumber})
                        </span>
                        {typeof selectedCandidate.qualityFeedback.originalScore ===
                          'number' && (
                          <span className="text-[11px] text-zinc-400">
                            Raw capture score:{' '}
                            {selectedCandidate.qualityFeedback.originalScore}/100
                          </span>
                        )}
                      </div>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-zinc-300">
                        {selectedCandidate.qualityFeedback.improvements.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-emerald-400 mt-0.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {selectedCandidateId === 'raw' && candidates.length === 0 && (
                  <div className="rounded-lg bg-zinc-900/50 border border-zinc-800/80 px-3 py-2 flex items-start gap-2 text-[11px] text-zinc-400">
                    <AlertCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      Tip: <strong>AI Framing &amp; Enhance</strong> grooms hair &amp; facial
                      hair, clears red-eye &amp; tired skin/shine, balances subtle facial
                      symmetry, and replaces room clutter with an 85mm studio headshot while
                      strictly keeping your true base identity.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FOOTER: RETAKE + APPEARANCE SYNC + SAVE ACTIONS */}
        {stageMode === 'studio' && (
          <DialogFooter className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-950/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={isEnhancing || isSaving}
                onClick={() => {
                  setCountdownRemaining(null)
                  setStageMode('capture')
                }}
                className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Retake Photo
              </Button>

              {target === 'identity' && (
                <label className="inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={syncAppearance}
                    onChange={(e) => setSyncAppearance(e.target.checked)}
                    className="rounded accent-cyan-500"
                  />
                  <span>Update appearance &amp; casting brief from photo</span>
                </label>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant={selectedCandidate ? 'outline' : 'default'}
                disabled={isEnhancing || isSaving}
                onClick={() => void handleSaveRawFramed()}
                className={
                  selectedCandidate
                    ? 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white font-medium'
                }
              >
                {isSaving && !selectedCandidate ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-1.5" />
                )}
                Save Framed Photo (Free)
              </Button>

              {selectedCandidate && (
                <Button
                  type="button"
                  disabled={isEnhancing || isSaving}
                  onClick={() => void handleSaveAiCandidate()}
                  className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold shadow-lg"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-1.5" />
                  )}
                  {target === 'identity'
                    ? `Save Enhanced Identity (Pass ${selectedCandidate.passNumber})`
                    : `Save Enhanced Donor Photo`}
                </Button>
              )}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
