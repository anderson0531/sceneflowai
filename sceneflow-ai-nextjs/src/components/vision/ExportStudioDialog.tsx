'use client'

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { getExportBridge } from '@/lib/export/exportBridge'
import { WebAudioMixer, type SceneAudioConfig } from '@/lib/audio/webAudioMixer'
import {
  getInstallersByPlatform,
  getLatestRendererRelease
} from '@/lib/export/rendererInstallers'
import type { RendererArtifact } from '@/lib/export/rendererInstallers'
import { Badge } from '@/components/ui/badge'
import { trackCta } from '@/lib/analytics'
import type {
  ExportBridge,
  ExportScene,
  ExportStartPayload,
  ExportProgressPayload,
  ExportCompletePayload,
  ExportErrorPayload,
  ExportAudioMix,
  ExportVideoOptions,
  ExportStartAck
} from '@/types/export-api'
import {
  AlertTriangle,
  CheckCircle2,
  MonitorPlay,
  Film,
  FolderOpen,
  GaugeCircle,
  Info,
  Music2,
  SlidersVertical,
  Volume2,
  FileText,
  HardDrive
} from 'lucide-react'
import { toast } from 'sonner'

export type ExportStudioScene = ExportScene

type MixerTrack = 'narration' | 'dialogue' | 'music' | 'sfx'

type MixerTrackState = {
  value: number
  muted: boolean
  solo: boolean
}

type MixerState = Record<MixerTrack, MixerTrackState>

type ExportStatus = 'idle' | 'running' | 'completed' | 'error'

type PresetMixerConfig = Record<MixerTrack, number>

interface ExportPreset {
  id: string
  label: string
  description: string
  video: ExportVideoOptions
  mixer: PresetMixerConfig
  normalize: boolean
  duckMusic: boolean
}

interface ExportStudioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectTitle: string
  scenes: ExportStudioScene[]
}

const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'youtube-1080',
    label: 'YouTube 1080p (Recommended)',
    description: '16:9 landscape, high quality H.264 output for YouTube uploads.',
    video: {
      width: 1920,
      height: 1080,
      fps: 30,
      quality: 'high',
      format: 'mp4'
    },
    mixer: {
      narration: 1.0,
      dialogue: 1.0,
      music: 0.6,
      sfx: 0.8
    },
    normalize: true,
    duckMusic: true
  },
  {
    id: 'tiktok-vertical',
    label: 'TikTok Vertical (9:16)',
    description: '1080x1920 vertical delivery with lighter audio bed for mobile.',
    video: {
      width: 1080,
      height: 1920,
      fps: 30,
      quality: 'standard',
      format: 'mp4'
    },
    mixer: {
      narration: 1.0,
      dialogue: 1.0,
      music: 0.45,
      sfx: 0.7
    },
    normalize: true,
    duckMusic: true
  },
  {
    id: 'draft-fast',
    label: 'Draft (Fast Review)',
    description: 'Quick H.264 draft at half resolution for rapid iteration.',
    video: {
      width: 1280,
      height: 720,
      fps: 24,
      quality: 'draft',
      format: 'mp4'
    },
    mixer: {
      narration: 1.0,
      dialogue: 1.0,
      music: 0.5,
      sfx: 0.6
    },
    normalize: false,
    duckMusic: true
  }
]

const createMixerState = (config: PresetMixerConfig): MixerState => ({
  narration: { value: config.narration, muted: false, solo: false },
  dialogue: { value: config.dialogue, muted: false, solo: false },
  music: { value: config.music, muted: false, solo: false },
  sfx: { value: config.sfx, muted: false, solo: false }
})

const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds)) {
    return '0:00'
  }

  const total = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(total / 60)
  const remaining = total % 60
  return `${minutes}:${remaining.toString().padStart(2, '0')}`
}

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, exponent)
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

const phaseLabels: Record<ExportProgressPayload['phase'], string> = {
  preparing: 'Preparing assets',
  'video-render': 'Rendering scenes',
  'video-concat': 'Concatenating video',
  'audio-assembly': 'Assembling audio tracks',
  'audio-mix': 'Mixing audio',
  mux: 'Muxing audio & video',
  finalizing: 'Finalizing export'
}

const progressWeights = {
  preparing: 0.02,
  'video-render': 0.28,
  'video-concat': 0.1,
  'audio-assembly': 0.25,
  'audio-mix': 0.15,
  mux: 0.15,
  finalizing: 0.05
} as const

const phaseOrder = [
  'preparing',
  'video-render',
  'video-concat',
  'audio-assembly',
  'audio-mix',
  'mux',
  'finalizing'
] as const

const stagePhaseMap: Record<string, keyof typeof progressWeights> = {
  'pass1-scenes': 'video-render',
  'pass2-concat': 'video-concat',
  'pass3-audio': 'audio-assembly',
  'pass4-mix': 'audio-mix',
  'pass5-mux': 'mux'
}

const labelForStage = (stage?: string) => {
  if (!stage) return null
  const phase = stagePhaseMap[stage]
  if (phase) {
    return phaseLabels[phase]
  }
  return stage
}

const MixerFader: React.FC<{
  label: string
  value: number
  muted: boolean
  solo: boolean
  color: string
  max?: number
  onChange: (value: number) => void
  onToggleMute: () => void
  onToggleSolo: () => void
}> = ({
  label,
  value,
  muted,
  solo,
  color,
  max = 1.5,
  onChange,
  onToggleMute,
  onToggleSolo
}) => {
  const displayPercent = Math.round((muted ? 0 : value) * 100)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Math.min(max, Math.max(0, parseFloat(event.target.value))))
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-300">
        <SlidersVertical className="h-4 w-4 text-slate-400" />
        {label}
      </div>
      <div className="flex h-40 items-center">
        <input
          type="range"
          min={0}
          max={max}
          step={0.05}
          value={value}
          onChange={handleChange}
          orient="vertical"
          className={cn(
            'mixer-slider appearance-none',
            'h-40 w-6 cursor-pointer rounded-full bg-slate-800'
          )}
          style={{ '--accent': color } as React.CSSProperties}
        />
      </div>
      <div className="text-xs font-mono text-slate-400">
        {muted ? 'Muted' : `${displayPercent}%`}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant={muted ? 'primary' : 'outline'}
          size="sm"
          className="h-8 w-[42px] text-xs"
          onClick={onToggleMute}
        >
          M
        </Button>
        <Button
          variant={solo ? 'primary' : 'outline'}
          size="sm"
          className="h-8 w-[42px] text-xs"
          onClick={onToggleSolo}
        >
          S
        </Button>
      </div>
      <style jsx>{`
        .mixer-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: var(--accent, #38bdf8);
          border: 2px solid rgba(15, 23, 42, 0.8);
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.35);
        }
        .mixer-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: var(--accent, #38bdf8);
          border: none;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.35);
        }
        .mixer-slider {
          writing-mode: bt-lr;
          -webkit-appearance: slider-vertical;
          background-image: linear-gradient(to top, var(--accent, #38bdf8), rgba(148, 163, 184, 0.2));
        }
      `}</style>
    </div>
  )
}

const colorTokens: Record<MixerTrack, string> = {
  narration: '#38bdf8',
  dialogue: '#10b981',
  music: '#a855f7',
  sfx: '#f59e0b'
}

const mapTrackToLabel: Record<MixerTrack, string> = {
  narration: 'Narration',
  dialogue: 'Dialogue',
  music: 'Music',
  sfx: 'SFX'
}

type DesktopPlatform = 'mac' | 'windows'

type DownloadOption = {
  key: string
  platform: DesktopPlatform
  arch: RendererArtifact['arch']
  label: string
  installer: RendererArtifact
}

const detectPlatform = (): DesktopPlatform | null => {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('win')) return 'windows'
  if (ua.includes('mac')) return 'mac'
  return null
}

export function ExportStudioDialog({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  scenes
}: ExportStudioDialogProps) {
  const defaultPreset = EXPORT_PRESETS[0]

  const [selectedPresetId, setSelectedPresetId] = useState<string>(defaultPreset.id)
  const [videoOptions, setVideoOptions] = useState<ExportVideoOptions>({ ...defaultPreset.video })
  const [mixerState, setMixerState] = useState<MixerState>(() => createMixerState(defaultPreset.mixer))
  const [normalizeAudio, setNormalizeAudio] = useState<boolean>(defaultPreset.normalize)
  const [autoDucking, setAutoDucking] = useState<boolean>(defaultPreset.duckMusic)
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle')
  const [statusMessage, setStatusMessage] = useState<string>('Ready to export')
  const [progress, setProgress] = useState<ExportProgressPayload | null>(null)
  const [workspaceInfo, setWorkspaceInfo] = useState<{ id: string; path: string } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [bridgeAvailable, setBridgeAvailable] = useState<boolean>(false)
  const [aggregatedProgress, setAggregatedProgress] = useState<number>(0)
  const [currentPhase, setCurrentPhase] = useState<string>('preparing')
  const [completionInfo, setCompletionInfo] = useState<{ filePath: string; durationSeconds: number; fileSizeBytes: number } | null>(null)
  const [metadataDraft, setMetadataDraft] = useState<{ title: string; description: string }>({
    title: projectTitle || 'Untitled Project',
    description: ''
  })
  const [previewSceneIndex, setPreviewSceneIndex] = useState(0)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const publishFeatureEnabled = process.env.NEXT_PUBLIC_EXPORT_PUBLISH_ENABLED === 'true'
  const hardwareDefault = process.env.NEXT_PUBLIC_EXPORT_HWACCEL_DEFAULT === 'true'
  const [publishStatus, setPublishStatus] = useState<string | null>(null)
  const [publishingPlatform, setPublishingPlatform] = useState<'youtube' | 'tiktok' | null>(null)
  const [errorStage, setErrorStage] = useState<string | null>(null)
  const [useHardwareAcceleration, setUseHardwareAcceleration] = useState<boolean>(hardwareDefault)
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null)
  const [feedbackVisible, setFeedbackVisible] = useState(false)
  const feedbackUrl = process.env.NEXT_PUBLIC_EXPORT_FEEDBACK_URL
  const rendererRelease = useMemo(() => getLatestRendererRelease(), [])
  const installersByPlatform = useMemo(() => getInstallersByPlatform(rendererRelease), [rendererRelease])
  const downloadOptions = useMemo<DownloadOption[]>(() => {
    const options: DownloadOption[] = []

    const groupByArch = (artifacts: RendererArtifact[]) => {
      const groups = new Map<RendererArtifact['arch'], RendererArtifact[]>()
      artifacts.forEach((artifact) => {
        const key = artifact.arch ?? 'universal'
        const current = groups.get(key) ?? []
        current.push(artifact)
        groups.set(key, current)
      })
      return groups
    }

    const macGroups = groupByArch(installersByPlatform.mac)
    const macOrder: RendererArtifact['arch'][] = ['arm64', 'x64', 'universal']
    macOrder.forEach((arch) => {
      const artifacts = macGroups.get(arch)
      if (!artifacts || artifacts.length === 0) return
      const preferred = artifacts.find((artifact) => artifact.type === 'dmg') ?? artifacts[0]
      const label =
        arch === 'arm64'
          ? 'Download for macOS (Apple Silicon)'
          : arch === 'x64'
            ? 'Download for macOS (Intel)'
            : 'Download for macOS'
      options.push({
        key: `mac-${arch}`,
        platform: 'mac',
        arch,
        label,
        installer: preferred
      })
    })

    const windowsGroups = groupByArch(installersByPlatform.windows)
    const windowsOrder: RendererArtifact['arch'][] = ['x64', 'arm64', 'universal']
    windowsOrder.forEach((arch) => {
      const artifacts = windowsGroups.get(arch)
      if (!artifacts || artifacts.length === 0) return
      const preferred = artifacts.find((artifact) => artifact.type === 'nsis') ?? artifacts[0]
      options.push({
        key: `windows-${arch}`,
        platform: 'windows',
        arch,
        label: 'Download for Windows',
        installer: preferred
      })
    })

    return options
  }, [installersByPlatform])
  const [detectedPlatform, setDetectedPlatform] = useState<DesktopPlatform | null>(null)
  useEffect(() => {
    if (!open) {
      setDetectedPlatform(null)
      return
    }
    setDetectedPlatform(detectPlatform())
  }, [open])
  const explicitRecommendedKey = useMemo(() => {
    if (!detectedPlatform) return null
    const option = downloadOptions.find((candidate) => candidate.platform === detectedPlatform)
    return option?.key ?? null
  }, [detectedPlatform, downloadOptions])
  const recommendedDownloadKey = useMemo(
    () => explicitRecommendedKey ?? (downloadOptions[0]?.key ?? null),
    [explicitRecommendedKey, downloadOptions]
  )
  const handleInstallerDownload = useCallback(
    (option: DownloadOption) => {
      trackCta({
        event: 'export_studio_renderer_download',
        location: 'ExportStudioDialog',
        label: option.platform,
        value: `${option.installer.type}-${option.installer.arch}-${rendererRelease?.version ?? 'unknown'}`
      })

      if (typeof window !== 'undefined') {
        window.open(option.installer.url, '_blank', 'noopener,noreferrer')
      }
    },
    [rendererRelease?.version]
  )

  const audioMixerRef = useRef<WebAudioMixer | null>(null)
  const mixerStateRef = useRef<MixerState>(mixerState)

  useEffect(() => {
    mixerStateRef.current = mixerState
  }, [mixerState])

  useEffect(() => {
    if (!open) return
    if (typeof window === 'undefined') return

    const storageKey = `export-metadata-${projectId}`
    try {
      const stored = window.localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && typeof parsed === 'object') {
          setMetadataDraft({
            title: parsed.title || projectTitle || 'Untitled Project',
            description: parsed.description || ''
          })
          return
        }
      }
    } catch (error) {
      console.warn('[ExportStudio] Failed to load metadata draft', error)
    }

    setMetadataDraft({
      title: projectTitle || 'Untitled Project',
      description: ''
    })
  }, [open, projectId, projectTitle])

  const listenerCleanup = useRef<(() => void)[]>([])
  const bridgeRef = useRef<ExportBridge | null>(null)

  const cleanupListeners = useCallback(() => {
    listenerCleanup.current.forEach(unsubscribe => {
      try {
        unsubscribe()
      } catch (error) {
        console.warn('[ExportStudio] Listener cleanup error', error)
      }
    })
    listenerCleanup.current = []
  }, [])

  const pushVolumesToMixer = useCallback((state: MixerState) => {
    const mixer = audioMixerRef.current
    if (!mixer) return

    const anySolo = Object.values(state).some(track => track.solo)
    const compute = (track: MixerTrackState) => {
      if (anySolo) {
        return track.solo && !track.muted ? Number(track.value.toFixed(2)) : 0
      }
      return track.muted ? 0 : Number(track.value.toFixed(2))
    }

    mixer.setVolume('narration', compute(state.narration))
    mixer.setVolume('dialogue', compute(state.dialogue))
    mixer.setVolume('music', compute(state.music))
    mixer.setVolume('sfx', compute(state.sfx))
  }, [])

  const updateAggregatedProgress = useCallback((phase: keyof typeof progressWeights, phaseProgress?: number | null) => {
    const index = phaseOrder.indexOf(phase)
    if (index === -1) return

    const completedWeight = phaseOrder.slice(0, index).reduce((sum, key) => sum + progressWeights[key], 0)
    const weight = progressWeights[phase]
    const normalizedProgress = phaseProgress != null ? Math.min(1, Math.max(0, phaseProgress)) : 0
    const total = completedWeight + normalizedProgress * weight
    setAggregatedProgress(Math.min(0.999, Math.max(0, total)))
  }, [])

  const persistMetadataDraft = useCallback((next: { title: string; description: string }) => {
    setMetadataDraft(next)
    if (typeof window === 'undefined') return
    try {
      const storageKey = `export-metadata-${projectId}`
      window.localStorage.setItem(storageKey, JSON.stringify(next))
    } catch (error) {
      console.warn('[ExportStudio] Failed to persist metadata draft', error)
    }
  }, [projectId])

  const resetState = useCallback(() => {
    const preset = EXPORT_PRESETS[0]
    const initialMixerState = createMixerState(preset.mixer)
    setSelectedPresetId(preset.id)
    setVideoOptions({ ...preset.video })
    setMixerState(initialMixerState)
    mixerStateRef.current = initialMixerState
    pushVolumesToMixer(initialMixerState)
    setNormalizeAudio(preset.normalize)
    setAutoDucking(preset.duckMusic)
    setExportStatus('idle')
    setStatusMessage('Ready to export')
    setProgress(null)
    setAggregatedProgress(0)
    setCurrentPhase('preparing')
    setCompletionInfo(null)
    setWorkspaceInfo(null)
    setPublishStatus(null)
    setPublishingPlatform(null)
    setErrorStage(null)
    setEtaSeconds(null)
    setUseHardwareAcceleration(hardwareDefault)
    setErrorMessage(null)
    setFeedbackVisible(false)
    cleanupListeners()
  }, [cleanupListeners, pushVolumesToMixer, hardwareDefault])

  useEffect(() => {
    if (open) {
      resetState()
      const bridge = getExportBridge()
      bridgeRef.current = bridge

      if (bridge) {
        const verifyBridge = async () => {
          try {
            await bridge.ping()
            setBridgeAvailable(true)
          } catch (error) {
            console.error('[ExportStudio] Bridge ping failed', error)
            setBridgeAvailable(false)
          }
        }
        verifyBridge()
      } else {
        setBridgeAvailable(false)
      }
    } else {
      cleanupListeners()
    }
  }, [open, resetState, cleanupListeners])

  useEffect(() => () => cleanupListeners(), [cleanupListeners])

  useEffect(() => {
    if (!open) {
      if (audioMixerRef.current) {
        audioMixerRef.current.stop()
        audioMixerRef.current.dispose()
        audioMixerRef.current = null
      }
      setIsPreviewing(false)
      return
    }

    const mixer = new WebAudioMixer()
    audioMixerRef.current = mixer
    pushVolumesToMixer(mixerStateRef.current)

    return () => {
      mixer.stop()
      mixer.dispose()
      audioMixerRef.current = null
    }
  }, [open, pushVolumesToMixer])

  useEffect(() => {
    if (scenes.length === 0) {
      setPreviewSceneIndex(0)
      return
    }
    setPreviewSceneIndex(prev => Math.min(prev, scenes.length - 1))
  }, [scenes.length])

  const activePreset = useMemo(
    () => EXPORT_PRESETS.find(preset => preset.id === selectedPresetId) ?? EXPORT_PRESETS[0],
    [selectedPresetId]
  )

  const totalDurationSeconds = useMemo(
    () => scenes.reduce((sum, scene) => sum + Math.max(0, Number(scene.duration) || 0), 0),
    [scenes]
  )

  const isPresetCustomized = useMemo(() => {
    const preset = activePreset
    if (!preset) return false

    const videoMatches =
      videoOptions.width === preset.video.width &&
      videoOptions.height === preset.video.height &&
      videoOptions.fps === preset.video.fps &&
      videoOptions.quality === preset.video.quality &&
      videoOptions.format === preset.video.format

    const mixerMatches = (['narration', 'dialogue', 'music', 'sfx'] as MixerTrack[]).every(track => {
      const state = mixerState[track]
      const presetValue = preset.mixer[track]
      return Math.abs(state.value - presetValue) < 0.01 && !state.muted && !state.solo
    })

    const togglesMatch = normalizeAudio === preset.normalize && autoDucking === preset.duckMusic

    return !(videoMatches && mixerMatches && togglesMatch)
  }, [activePreset, videoOptions, mixerState, normalizeAudio, autoDucking])

  const soloActive = useMemo(
    () => Object.values(mixerState).some(track => track.solo),
    [mixerState]
  )

  const handlePresetChange = (value: string) => {
    const preset = EXPORT_PRESETS.find(item => item.id === value)
    if (!preset) return

    const nextMixerState = createMixerState(preset.mixer)
    setSelectedPresetId(preset.id)
    setVideoOptions({ ...preset.video })
    setMixerState(nextMixerState)
    mixerStateRef.current = nextMixerState
    pushVolumesToMixer(nextMixerState)
    setNormalizeAudio(preset.normalize)
    setAutoDucking(preset.duckMusic)
  }

  const updateMixerValue = (track: MixerTrack, value: number) => {
    setMixerState(prev => {
      const next: MixerState = {
        ...prev,
        [track]: { ...prev[track], value }
      }
      mixerStateRef.current = next
      pushVolumesToMixer(next)
      return next
    })
  }

  const toggleMute = (track: MixerTrack) => {
    setMixerState(prev => {
      const next: MixerState = {
        ...prev,
        [track]: {
          ...prev[track],
          muted: !prev[track].muted,
          solo: prev[track].muted ? prev[track].solo : false
        }
      }
      mixerStateRef.current = next
      pushVolumesToMixer(next)
      return next
    })
  }

  const toggleSolo = (track: MixerTrack) => {
    setMixerState(prev => {
      const isSolo = !prev[track].solo
      const next: MixerState = { ...prev }

      (Object.keys(next) as MixerTrack[]).forEach(key => {
        next[key] = {
          ...prev[key],
          solo: key === track ? isSolo : false
        }
      })

      mixerStateRef.current = next
      pushVolumesToMixer(next)
      return next
    })
  }

  const handleVideoOptionChange = (key: keyof ExportVideoOptions, nextValue: number | ExportVideoOptions['quality'] | ExportVideoOptions['format']) => {
    setVideoOptions(prev => ({
      ...prev,
      [key]: nextValue
    }))
  }

  const handleStartExport = async () => {
    const bridge = bridgeRef.current ?? getExportBridge()

    if (!bridge) {
      setBridgeAvailable(false)
      setErrorMessage('Export engine is not available. Launch the desktop renderer to continue.')
      setExportStatus('error')
      return
    }

    cleanupListeners()
    if (isPreviewing && audioMixerRef.current) {
      audioMixerRef.current.stop()
      setIsPreviewing(false)
    }
    setPublishStatus(null)
    setPublishingPlatform(null)
    setErrorStage(null)
    setEtaSeconds(null)
    setCompletionInfo(null)
    setFeedbackVisible(false)
    setExportStatus('running')
    setStatusMessage('Preparing export pipeline...')
    setErrorMessage(null)
    setProgress({
      progress: 0,
      phase: 'preparing',
      detail: 'Initializing workspace'
    })
    updateAggregatedProgress('preparing', 0)
    setCurrentPhase('preparing')

    trackCta({
      event: 'export_studio_start',
      location: 'ExportStudioDialog',
      value: scenes.length,
      label: useHardwareAcceleration ? 'hardware' : 'cpu'
    })

    const calculateVolume = (track: MixerTrackState): number => {
      if (soloActive) {
        return track.solo && !track.muted ? Number(track.value.toFixed(2)) : 0
      }
      if (track.muted) {
        return 0
      }
      return Number(track.value.toFixed(2))
    }

    const audioMix: ExportAudioMix = {
      narration: calculateVolume(mixerState.narration),
      dialogue: calculateVolume(mixerState.dialogue),
      music: calculateVolume(mixerState.music),
      sfx: calculateVolume(mixerState.sfx),
      normalize: normalizeAudio,
      duckMusic: autoDucking
    }

    const payload: ExportStartPayload = {
      projectId,
      projectTitle,
      scenes,
      video: videoOptions,
      audio: audioMix,
      engine: {
        useHardwareAcceleration
      },
      metadata: {
        preset: activePreset.label,
        presetId: activePreset.id,
        sceneCount: scenes.length,
        title: metadataDraft.title,
        description: metadataDraft.description
      }
    }

    const progressHandler = (update: ExportProgressPayload) => {
      setProgress(update)
      setStatusMessage(update.detail || phaseLabels[update.phase])
      setCurrentPhase(update.phase)
      if (typeof update.overallProgress === 'number') {
        setAggregatedProgress(update.overallProgress)
      } else {
        updateAggregatedProgress(update.phase as keyof typeof progressWeights, update.progress ?? undefined)
      }
      if (typeof update.etaSeconds === 'number') {
        setEtaSeconds(update.etaSeconds)
      }
    }

    const completionHandler = (result: ExportCompletePayload) => {
      setExportStatus('completed')
      setCompletionInfo(result)
      setStatusMessage('Export complete')
      setProgress({
        progress: 1,
        phase: 'finalizing',
        detail: 'Export finished successfully'
      })
      setCurrentPhase('finalizing')
      updateAggregatedProgress('finalizing', 1)
      setEtaSeconds(null)
      trackCta({
        event: 'export_studio_complete',
        location: 'ExportStudioDialog',
        value: result.durationSeconds,
        label: useHardwareAcceleration ? 'hardware' : 'cpu'
      })
      if (feedbackUrl) {
        setFeedbackVisible(true)
      }
      cleanupListeners()
    }

    const errorHandler = (error: ExportErrorPayload) => {
      setExportStatus('error')
      setErrorMessage(error.message)
      setErrorStage(error.stage || null)
      const phase = error.stage ? stagePhaseMap[error.stage] || 'finalizing' : 'finalizing'
      setCurrentPhase(phase)
      updateAggregatedProgress(phase as keyof typeof progressWeights, 0.01)
      setStatusMessage(error.stage ? `Failed during ${phaseLabels[phase as keyof typeof phaseLabels]}` : 'Export failed')
      setEtaSeconds(null)
      toast.error(`${error.stage ? `[${labelForStage(error.stage)}] ` : ''}${error.message}`)
      trackCta({
        event: 'export_studio_error',
        location: 'ExportStudioDialog',
        label: error.stage || 'unknown',
        value: error.recoverable ? 'recoverable' : 'fatal'
      })
      cleanupListeners()
    }

    listenerCleanup.current.push(bridge.onProgress(progressHandler))
    listenerCleanup.current.push(bridge.onComplete(completionHandler))
    listenerCleanup.current.push(bridge.onError(errorHandler))

    try {
      const ack: ExportStartAck = await bridge.startExport(payload)
      if (ack.workspaceId && ack.workspacePath) {
        setWorkspaceInfo({ id: ack.workspaceId, path: ack.workspacePath })
      }
      setStatusMessage('Scenes queued — rendering has started')
      updateAggregatedProgress('preparing', 1)
      setEtaSeconds(null)
    } catch (error: any) {
      console.error('[ExportStudio] Failed to start export', error)
      setExportStatus('error')
      setErrorMessage(error?.message || 'Unable to start export')
      setStatusMessage('Export failed to initialize')
      updateAggregatedProgress('finalizing')
      cleanupListeners()
    }
  }

  const handlePreview = async () => {
    const mixer = audioMixerRef.current ?? new WebAudioMixer()
    if (!audioMixerRef.current) {
      audioMixerRef.current = mixer
      pushVolumesToMixer(mixerStateRef.current)
    }

    if (isPreviewing) {
      mixer.stop()
      setIsPreviewing(false)
      return
    }

    const scene = scenes[previewSceneIndex]
    if (!scene) {
      setPreviewError('No scene selected for preview')
      return
    }

    if (
      !scene.audio.narration &&
      !scene.audio.dialogue?.length &&
      !scene.audio.music &&
      !scene.audio.sfx?.length
    ) {
      setPreviewError('Selected scene does not contain any audio elements')
      return
    }

    const config: SceneAudioConfig = {
      narration: scene.audio.narration,
      music: scene.audio.music,
      dialogue: scene.audio.dialogue?.map(item => ({
        url: item.url,
        startTime: item.startTime,
        duration: item.duration
      })),
      sfx: scene.audio.sfx?.map(item => ({
        url: item.url,
        startTime: item.startTime,
        duration: item.duration
      })),
      sceneDuration: scene.duration
    }

    try {
      setPreviewError(null)
      setIsPreviewing(true)
      pushVolumesToMixer(mixerStateRef.current)
      await mixer.playScene(config)
    } catch (error: any) {
      console.error('[ExportStudio] Preview playback failed', error)
      setPreviewError(error?.message || 'Preview failed')
    } finally {
      setIsPreviewing(false)
    }
  }

  const handlePublish = useCallback(async (platform: 'youtube' | 'tiktok') => {
    if (!completionInfo) {
      toast.error('Render must complete before publishing')
      return
    }

    const bridge = bridgeRef.current ?? getExportBridge()
    if (!bridge?.startPublish) {
      toast.error('Publishing bridge unavailable')
      return
    }

    setPublishingPlatform(platform)
    setPublishStatus(`Connecting to ${platform}...`)

    trackCta({
      event: 'export_studio_publish_request',
      location: 'ExportStudioDialog',
      label: platform
    })

    try {
      const response = await bridge.startPublish({
        platform,
        videoPath: completionInfo.filePath,
        metadata: {
          title: metadataDraft.title,
          description: metadataDraft.description
        }
      })

      if (response.ok) {
        toast.success(response.message || `Stubbed ${platform} upload queued.`)
        setPublishStatus(response.message || 'Upload queued')
        trackCta({
          event: 'export_studio_publish_success',
          location: 'ExportStudioDialog',
          label: platform
        })
      } else {
        toast.error(response.message || 'Publish stub failed')
        setPublishStatus(response.message || 'Publish failed')
        trackCta({
          event: 'export_studio_publish_error',
          location: 'ExportStudioDialog',
          label: platform,
          value: response.message
        })
      }
    } catch (error: any) {
      console.error('[ExportStudio] Publish error', error)
      toast.error(error?.message || 'Publish request failed')
      setPublishStatus('Publish failed')
      trackCta({
        event: 'export_studio_publish_error',
        location: 'ExportStudioDialog',
        label: platform,
        value: error?.message
      })
    } finally {
      setPublishingPlatform(null)
    }
  }, [completionInfo, metadataDraft.title, metadataDraft.description])

  const startDisabled =
    !bridgeAvailable ||
    scenes.length === 0 ||
    exportStatus === 'running'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl border border-slate-800 bg-[#070b19] text-white sm:max-w-[1200px] overflow-hidden p-0"
        style={{ maxHeight: '85vh' }}
      >
        <div className="flex h-full flex-col">
          <DialogHeader className="space-y-2 px-6 pt-6">
            <DialogTitle className="flex items-center gap-3 text-2xl font-semibold text-slate-50">
              <Film className="h-6 w-6 text-blue-400" />
              Export Studio
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-400">
              {!bridgeAvailable
                ? 'Waiting for the desktop renderer to connect.'
                : `Overall progress: ${Math.round(aggregatedProgress * 100)}% · ${phaseLabels[currentPhase as keyof typeof phaseLabels] || 'Preparing'}${etaSeconds != null ? ` · ETA ~${Math.max(0, Math.ceil(etaSeconds))}s` : ''}`}
            </DialogDescription>
          </DialogHeader>

          {!bridgeAvailable && (
            <div className="px-6 pb-4">
              <div className="flex flex-col gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-amber-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Renderer unavailable</p>
                    <p className="text-xs text-amber-100/90">
                      Launch the SceneFlow desktop renderer to enable hardware-accelerated exports. Once connected, this dialog will update automatically.
                    </p>
                  </div>
                </div>
                {rendererRelease && downloadOptions.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      {downloadOptions.map(option => (
                        <Button
                          key={option.key}
                          variant={option.key === recommendedDownloadKey ? 'primary' : 'outline'}
                          size="sm"
                          className={cn(
                            'flex items-center gap-2',
                            option.key === recommendedDownloadKey
                              ? 'bg-amber-400 text-slate-900 hover:bg-amber-300 focus-visible:ring-amber-200'
                              : 'border-amber-400/60 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20'
                          )}
                          onClick={() => handleInstallerDownload(option)}
                        >
                          {option.label}
                          <span className="text-[11px] font-mono uppercase tracking-wide">
                            v{rendererRelease.version}
                          </span>
                        </Button>
                      ))}
                    </div>
                    <p className="text-[11px] text-amber-100/85">
                      Latest desktop renderer build v{rendererRelease.version}
                      {detectedPlatform ? ` · detected ${detectedPlatform === 'mac' ? 'macOS' : 'Windows'} environment` : ''}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-amber-100/90">
                    Desktop installers are not yet published. After running <code className="rounded bg-amber-500/20 px-1 py-0.5">npm run electron:build</code> followed by <code className="rounded bg-amber-500/20 px-1 py-0.5">npm run electron:upload</code>, download links will appear here automatically.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="flex flex-col gap-6">
                <section className="space-y-4">
                  <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                    {completionInfo?.filePath ? (
                      <video
                        key={completionInfo.filePath}
                        controls
                        className="h-full w-full object-cover"
                        src={completionInfo.filePath}
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
                        <MonitorPlay className="h-12 w-12 text-slate-600" />
                        <p className="text-sm">Render preview will appear here once export completes.</p>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">Scenes</p>
                      <p className="text-lg font-semibold text-slate-100">{scenes.length}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">Duration</p>
                      <p className="text-lg font-semibold text-slate-100">{formatDuration(totalDurationSeconds)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">Output</p>
                      <p className="text-lg font-semibold text-slate-100">
                        {videoOptions.width}×{videoOptions.height} · {videoOptions.fps} fps
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <Volume2 className="h-4 w-4 text-blue-300" />
                    Audio Mixer
                  </div>
                  {scenes.length > 0 && (
                    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <Select
                          value={String(previewSceneIndex)}
                          onValueChange={value => setPreviewSceneIndex(Number(value))}
                        >
                          <SelectTrigger className="h-10 w-48 border-slate-700 bg-slate-950 text-slate-100">
                            <SelectValue placeholder="Choose scene" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 border-slate-700 bg-slate-900 text-slate-100">
                            {scenes.map((scene, idx) => (
                              <SelectItem key={scene.id ?? idx} value={String(idx)}>
                                Scene {scene.number}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 border-slate-700 bg-slate-950 text-slate-100"
                          onClick={handlePreview}
                        >
                          {isPreviewing ? (
                            <>
                              <span className="h-3 w-3 animate-ping rounded-full bg-emerald-400" />
                              Stop Preview
                            </>
                          ) : (
                            <>
                              <Music2 className="h-4 w-4" />
                              Preview Scene
                            </>
                          )}
                        </Button>
                      </div>
                      {previewError && <p className="text-xs text-rose-300">{previewError}</p>}
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {(Object.keys(mixerState) as MixerTrack[]).map(track => (
                      <MixerFader
                        key={track}
                        label={mapTrackToLabel[track]}
                        value={mixerState[track].value}
                        muted={mixerState[track].muted}
                        solo={mixerState[track].solo}
                        color={colorTokens[track]}
                        onChange={value => updateMixerValue(track, value)}
                        onToggleMute={() => toggleMute(track)}
                        onToggleSolo={() => toggleSolo(track)}
                      />
                    ))}
                  </div>
                </section>
              </div>

              <div className="flex flex-col gap-6">
                <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <Music2 className="h-4 w-4 text-green-300" />
                    Smart Audio Features
                  </div>
                  <div className="space-y-2 text-sm text-slate-300">
                    <label className="flex items-start gap-3">
                      <Checkbox
                        checked={autoDucking}
                        onCheckedChange={checked => setAutoDucking(Boolean(checked))}
                        className="mt-0.5 border-slate-600 data-[state=checked]:bg-blue-500"
                      />
                      <span>
                        <span className="font-medium text-slate-200">Auto-duck music during speech</span>
                        <span className="block text-xs text-slate-400">
                          Sidechain compression automatically lowers the music bed whenever narration or dialogue is present.
                        </span>
                      </span>
                    </label>
                    <label className="flex items-start gap-3">
                      <Checkbox
                        checked={normalizeAudio}
                        onCheckedChange={checked => setNormalizeAudio(Boolean(checked))}
                        className="mt-0.5 border-slate-600 data-[state=checked]:bg-blue-500"
                      />
                      <span>
                        <span className="font-medium text-slate-200">Loudness normalization</span>
                        <span className="block text-xs text-slate-400">
                          Balances overall mix levels using EBU R128 compliant normalization for consistent playback across platforms.
                        </span>
                      </span>
                    </label>
                    <label className="flex items-start gap-3">
                      <Checkbox
                        checked={useHardwareAcceleration}
                        onCheckedChange={checked => setUseHardwareAcceleration(Boolean(checked))}
                        className="mt-0.5 border-slate-600 data-[state=checked]:bg-blue-500"
                      />
                      <span>
                        <span className="font-medium text-slate-200">Hardware-accelerated encoding (beta)</span>
                        <span className="block text-xs text-slate-400">
                          Attempts to use GPU-assisted FFmpeg encoders when available. Falls back to CPU if unsupported.
                        </span>
                      </span>
                    </label>
                  </div>
                </section>

                <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <FolderOpen className="h-4 w-4 text-slate-300" />
                    Metadata
                  </div>
                  <div className="space-y-3 text-sm text-slate-300">
                    <div>
                      <label className="text-xs uppercase tracking-wide text-slate-400">Title</label>
                      <Input
                        value={metadataDraft.title}
                        onChange={(event) => persistMetadataDraft({
                          title: event.target.value,
                          description: metadataDraft.description
                        })}
                        placeholder="Export title"
                        className="mt-1 border-slate-700 bg-slate-950 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wide text-slate-400">Description / Notes</label>
                      <Textarea
                        value={metadataDraft.description}
                        onChange={(event) => persistMetadataDraft({
                          title: metadataDraft.title,
                          description: event.target.value
                        })}
                        placeholder="Add context for collaborators or upload platforms"
                        className="mt-1 min-h-[96px] border-slate-700 bg-slate-950 text-slate-100"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">Saved per project for quick reuse.</p>
                    </div>
                  </div>
                </section>

                {publishFeatureEnabled && (
                  <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                        <FolderOpen className="h-4 w-4 text-blue-300" />
                        Publish & Share
                      </div>
                      <Badge className="border border-blue-400/40 bg-blue-500/10 text-blue-200" variant="secondary">
                        Beta
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">
                      Stubbed integrations for YouTube and TikTok uploads. Enable `EXPORT_ENABLE_PUBLISH=true` on desktop to test workflow.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        disabled={!completionInfo || !!publishingPlatform}
                        onClick={() => handlePublish('youtube')}
                      >
                        {publishingPlatform === 'youtube' ? 'Publishing…' : 'Upload to YouTube'}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!completionInfo || !!publishingPlatform}
                        onClick={() => handlePublish('tiktok')}
                      >
                        {publishingPlatform === 'tiktok' ? 'Publishing…' : 'Upload to TikTok'}
                      </Button>
                    </div>
                    {publishStatus && (
                      <p className="text-[11px] text-slate-400">{publishStatus}</p>
                    )}
                  </section>
                )}

                <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-xs text-slate-300">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <Info className="h-4 w-4 text-slate-300" />
                    Status
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Phase</span>
                      <span className="text-xs text-slate-400">{progress ? phaseLabels[progress.phase] : 'Idle'}</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, Math.round(aggregatedProgress * 100)))}%` }}
                      />
                    </div>
                    <p className="mt-3 text-sm text-slate-200">{statusMessage}</p>
                    {workspaceInfo && (
                      <div className="mt-3 flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-[11px] text-slate-400">
                        <FolderOpen className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
                        <span className="truncate" title={workspaceInfo.path}>
                          {workspaceInfo.path}
                        </span>
                      </div>
                    )}
                    {completionInfo && (
                      <div className="mt-3 space-y-2 text-[11px] text-slate-300">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex flex-1 items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-emerald-100">
                            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate" title={completionInfo.filePath}>
                              {completionInfo.filePath}
                            </span>
                          </div>
                          {feedbackVisible && feedbackUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-blue-500/40 bg-blue-500/10 text-blue-100"
                              onClick={() => {
                                setFeedbackVisible(false)
                                trackCta({
                                  event: 'export_studio_feedback_open',
                                  location: 'ExportStudioDialog'
                                })
                                window.open(feedbackUrl, '_blank', 'noopener,noreferrer')
                              }}
                            >
                              Share Feedback
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-400">
                          <HardDrive className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
                          <span>{formatBytes(completionInfo.fileSizeBytes)} · {formatDuration(completionInfo.durationSeconds)}</span>
                        </div>
                        <div className="flex flex-col gap-1 rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-200">
                          <div className="flex items-center gap-2 text-slate-300">
                            <FileText className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
                            <span className="font-medium truncate" title={metadataDraft.title}>{metadataDraft.title}</span>
                          </div>
                          {metadataDraft.description && (
                            <p className="text-left text-[10px] text-slate-400 line-clamp-3" title={metadataDraft.description}>
                              {metadataDraft.description}
                            </p>
                          )}
                        </div>
                        {completionInfo.qa?.duration && (
                          <div className={`rounded-md border px-3 py-2 ${completionInfo.qa.duration.withinTolerance ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-100' : 'border-amber-500/40 bg-amber-500/10 text-amber-100'}`}>
                            <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide">
                              <span>Duration QA</span>
                              {completionInfo.qa.duration.withinTolerance ? '✓' : '⚠'}
                            </p>
                            <p className="text-[11px]">
                              Expected {completionInfo.qa.duration.expected.toFixed(2)}s · Video {completionInfo.qa.duration.video.toFixed(2)}s
                            </p>
                            {completionInfo.qa.duration.warnings?.length ? (
                              <ul className="mt-1 list-disc space-y-1 pl-4 text-[10px]">
                                {completionInfo.qa.duration.warnings.map((warning, idx) => (
                                  <li key={idx}>{warning}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-[10px]">All track durations within tolerance.</p>
                            )}
                          </div>
                        )}
                        {completionInfo.performance?.stages && completionInfo.performance.stages.length > 0 && (
                          <div className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-[11px] text-slate-300">
                            <p className="text-[10px] uppercase tracking-wide text-slate-500">Performance</p>
                            <p className="text-[11px]">
                              Total {((completionInfo.performance.totalDurationMs ?? 0) / 1000).toFixed(1)}s
                            </p>
                            <ul className="mt-1 space-y-1">
                              {completionInfo.performance.stages.map((stage, idx) => (
                                <li key={idx} className="flex justify-between gap-4 text-[11px]">
                                  <span>{stage.label}</span>
                                  <span>{(stage.durationMs / 1000).toFixed(1)}s</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    {errorMessage && (
                      <div className="mt-3 flex flex-col gap-1 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{errorMessage}</span>
                        </div>
                        {errorStage && (
                          <span className="text-[10px] uppercase tracking-wide text-rose-200/80">
                            Stage: {labelForStage(errorStage)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-0 flex flex-col gap-3 border-t border-slate-800 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col text-xs text-slate-400">
              <span>Exports run locally via hardware-accelerated FFmpeg (5-pass pipeline).</span>
              <span>Keep the desktop renderer running until completion.</span>
            </div>
            <div className="flex items-center gap-3">
              {completionInfo && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const a = document.createElement('a')
                      a.href = completionInfo.filePath
                      a.download = `${projectTitle.replace(/[^a-z0-9-_]/gi, '-').toLowerCase() || 'export'}.mp4`
                      a.target = '_blank'
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      trackCta({
                        event: 'export_studio_download',
                        location: 'ExportStudioDialog'
                      })
                    }}
                  >
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(completionInfo.filePath)
                        toast.success('Video URL copied to clipboard')
                        trackCta({
                          event: 'export_studio_copy_link',
                          location: 'ExportStudioDialog'
                        })
                      } catch (error) {
                        toast.error('Unable to copy video link')
                        console.error('[ExportStudio] Copy failed', error)
                      }
                    }}
                  >
                    Copy Link
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={exportStatus === 'running'}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="lg"
                disabled={startDisabled}
                onClick={handleStartExport}
                className="flex items-center gap-2"
              >
                {exportStatus === 'running' ? (
                  <>
                    <span className="flex h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Rendering…
                  </>
                ) : (
                  <>
                    <Music2 className="h-4 w-4" />
                    Start Export
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
