'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  Clapperboard,
  Film,
  Eye,
  Edit3,
  Check,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Play,
  Lock,
  Layers,
  Camera,
  Volume2,
  AlertCircle,
} from 'lucide-react'
import { SegmentBuilder } from './SegmentBuilder'
import type {
  SceneProductionData,
  SceneProductionReferences,
  SceneSegment,
} from './types'

// ============================================================================
// Scene Production Director
// ============================================================================
// 
// A professional "Director's Chair" component that replaces the basic
// initialization card with a stepper-based production pipeline.
// 
// Architecture decision: FC1 (Extend SegmentBuilder)
// - Wraps SegmentBuilder inline in the Action tab
// - Provides production status bar and phase-gated progression
// - Hard gates scene direction with inline CTA (FC2)
// - Maintains backward compatibility with existing segments (FC3)
// ============================================================================

type DirectorPhase = 'ready' | 'building' | 'complete'

interface SceneProductionDirectorProps {
  sceneId: string
  sceneNumber: number
  scene: any
  projectId: string
  productionData?: SceneProductionData | null
  references: SceneProductionReferences
  hasSceneDirection: boolean
  hasSceneImage: boolean
  hasAudio: boolean
  onSegmentsCreated: (segments: SceneSegment[]) => void
  onNavigateToDirection?: () => void
  onNavigateToImage?: () => void
  onNavigateToAudio?: () => void
}

// Production readiness check item
interface ReadinessItem {
  id: string
  label: string
  description: string
  status: 'ready' | 'recommended' | 'missing'
  icon: React.ReactNode
  action?: () => void
  actionLabel?: string
}

export function SceneProductionDirector({
  sceneId,
  sceneNumber,
  scene,
  projectId,
  productionData,
  references,
  hasSceneDirection,
  hasSceneImage,
  hasAudio,
  onSegmentsCreated,
  onNavigateToDirection,
  onNavigateToImage,
  onNavigateToAudio,
}: SceneProductionDirectorProps) {
  const [phase, setPhase] = useState<DirectorPhase>('ready')
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)

  // Check if this scene already has segments (backward compat - FC3)
  const hasExistingSegments = useMemo(() => {
    return productionData?.isSegmented && (productionData?.segments?.length ?? 0) > 0
  }, [productionData])

  // Production readiness items
  const readinessItems: ReadinessItem[] = useMemo(() => {
    const items: ReadinessItem[] = [
      {
        id: 'direction',
        label: 'Scene Direction',
        description: hasSceneDirection 
          ? 'Camera, lighting, and talent direction configured'
          : 'Required — AI needs direction to plan segments',
        status: hasSceneDirection ? 'ready' : 'missing',
        icon: <Clapperboard className="w-4 h-4" />,
        action: onNavigateToDirection,
        actionLabel: 'Configure',
      },
      {
        id: 'image',
        label: 'Scene Frame',
        description: hasSceneImage
          ? 'Reference frame available for I2V generation'
          : 'Recommended — enables Image-to-Video for first segment',
        status: hasSceneImage ? 'ready' : 'recommended',
        icon: <Camera className="w-4 h-4" />,
        action: onNavigateToImage,
        actionLabel: 'Generate',
      },
      {
        id: 'audio',
        label: 'Audio Generated',
        description: hasAudio
          ? 'Narration and dialogue audio ready'
          : 'Recommended — enables audio-driven segment timing',
        status: hasAudio ? 'ready' : 'recommended',
        icon: <Volume2 className="w-4 h-4" />,
        action: onNavigateToAudio,
        actionLabel: 'Generate',
      },
    ]
    return items
  }, [hasSceneDirection, hasSceneImage, hasAudio, onNavigateToDirection, onNavigateToImage, onNavigateToAudio])

  const readyCount = readinessItems.filter(i => i.status === 'ready').length
  const isBlocked = readinessItems.some(i => i.status === 'missing')

  // Handle segment builder completion
  const handleSegmentsGenerated = useCallback((segments: SceneSegment[]) => {
    // Phase 2 output - segments with prompts generated
  }, [])

  const handleSegmentsFinalized = useCallback((segments: SceneSegment[]) => {
    setPhase('complete')
    setIsBuilderOpen(false)
    onSegmentsCreated(segments)
  }, [onSegmentsCreated])

  const handleStartBuilding = useCallback(() => {
    setPhase('building')
    setIsBuilderOpen(true)
  }, [])

  // ============================================================================
  // RENDER: Complete State (segments exist)
  // ============================================================================
  if (hasExistingSegments) {
    return null // Let SceneProductionManager handle existing segments
  }

  // ============================================================================
  // RENDER: Builder Active (inline SegmentBuilder)
  // ============================================================================
  if (phase === 'building' && isBuilderOpen) {
    return (
      <div className="space-y-3">
        {/* Production Status Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30">
              <Film className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-200">Scene {sceneNumber} — Segment Director</p>
              <p className="text-xs text-indigo-300/60">AI-powered shot breakdown and prompt generation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Phase Steps (mini) */}
            {[
              { icon: <Sparkles className="w-3 h-3" />, label: 'Analyze' },
              { icon: <Eye className="w-3 h-3" />, label: 'Direct' },
              { icon: <Edit3 className="w-3 h-3" />, label: 'Prompts' },
              { icon: <Check className="w-3 h-3" />, label: 'Finalize' },
            ].map((step, idx) => (
              <React.Fragment key={step.label}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {step.icon}
                  <span className="hidden md:inline">{step.label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Inline Segment Builder */}
        <div className="border border-indigo-500/20 rounded-lg overflow-hidden bg-background">
          <SegmentBuilder
            sceneId={sceneId}
            sceneNumber={sceneNumber}
            scene={scene}
            productionData={productionData}
            references={references}
            projectId={projectId}
            onSegmentsGenerated={handleSegmentsGenerated}
            onSegmentsFinalized={handleSegmentsFinalized}
            onClose={() => {
              setPhase('ready')
              setIsBuilderOpen(false)
            }}
          />
        </div>
      </div>
    )
  }

  // ============================================================================
  // RENDER: Ready State (initialization / pre-flight)
  // ============================================================================
  return (
    <Card className="border border-dashed border-indigo-500/30 bg-gradient-to-br from-indigo-950/20 via-background to-purple-950/20 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center gap-4 p-5 pb-0">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
            <Clapperboard className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground">
              Scene {sceneNumber} — Production Director
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              AI will analyze your scene direction, script, and audio to propose a professional shot breakdown with cinematic prompts.
            </p>
          </div>
        </div>

        {/* Readiness Checklist */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pre-Production Checklist</span>
            <Badge variant="outline" className={cn(
              "text-xs",
              readyCount === readinessItems.length 
                ? "text-green-400 border-green-500/30" 
                : isBlocked
                ? "text-red-400 border-red-500/30"
                : "text-amber-400 border-amber-500/30"
            )}>
              {readyCount}/{readinessItems.length} Ready
            </Badge>
          </div>

          {readinessItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                item.status === 'ready' && "bg-green-500/5 border-green-500/20",
                item.status === 'recommended' && "bg-amber-500/5 border-amber-500/20",
                item.status === 'missing' && "bg-red-500/5 border-red-500/20",
              )}
            >
              {/* Status Icon */}
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg",
                item.status === 'ready' && "bg-green-500/20 text-green-400",
                item.status === 'recommended' && "bg-amber-500/20 text-amber-400",
                item.status === 'missing' && "bg-red-500/20 text-red-400",
              )}>
                {item.status === 'ready' ? (
                  <Check className="w-4 h-4" />
                ) : item.status === 'missing' ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  item.icon
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.status === 'ready' && (
                    <Badge variant="outline" className="text-[10px] h-4 text-green-400 border-green-500/30">
                      ✓ Ready
                    </Badge>
                  )}
                  {item.status === 'recommended' && (
                    <Badge variant="outline" className="text-[10px] h-4 text-amber-400 border-amber-500/30">
                      Recommended
                    </Badge>
                  )}
                  {item.status === 'missing' && (
                    <Badge variant="outline" className="text-[10px] h-4 text-red-400 border-red-500/30">
                      Required
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
              </div>

              {/* Action Button */}
              {item.status !== 'ready' && item.action && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    item.action?.()
                  }}
                  className="h-7 text-xs shrink-0"
                >
                  {item.actionLabel}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between p-5 pt-2 border-t border-border/30">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" />
            AI analyzes direction, script, and audio to propose segment cuts
          </p>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleStartBuilding}
              disabled={isBlocked}
              className={cn(
                "flex items-center gap-2",
                !isBlocked && "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
              )}
            >
              <Play className="w-4 h-4" />
              Begin Production
            </Button>
          </div>
        </div>

        {/* Blocked Message */}
        {isBlocked && (
          <div className="px-5 pb-4">
            <p className="text-xs text-red-400/80 flex items-center gap-1.5">
              <Lock className="w-3 h-3" />
              Complete required items above before starting production
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
