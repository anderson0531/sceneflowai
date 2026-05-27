'use client'

import { useMemo } from 'react'
import {
  buildSceneProgressItems,
  type SceneProgressOptions,
} from '@/lib/production/sceneProgress'
import type { SceneProgressItem } from '@/components/vision/SceneProgressDashboard'
import type { SceneProductionData } from '@/components/vision/scene-production/types'

export function useSceneProgressItems(
  scenes: Record<string, unknown>[] | undefined,
  sceneProductionState: Record<string, SceneProductionData>,
  options: SceneProgressOptions = {}
): SceneProgressItem[] {
  return useMemo(() => {
    if (!scenes?.length) return []
    return buildSceneProgressItems(scenes, sceneProductionState, options)
  }, [scenes, sceneProductionState, options.language])
}
