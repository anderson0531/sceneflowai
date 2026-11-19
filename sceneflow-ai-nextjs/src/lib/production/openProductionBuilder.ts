/**
 * Unified entrypoint for opening the SceneFlow Production Agent ("Production Builder")
 * with optional context-aware defaults (e.g. pre-scoped to the active scene and stage).
 */

import type { ProductionBuilderLaunchContext } from '@/components/vision/ProductionBuilderDialog'

export const OPEN_PRODUCTION_BUILDER_EVENT = 'sceneflow:open-production-builder'

export function openProductionBuilder(context?: ProductionBuilderLaunchContext): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<ProductionBuilderLaunchContext | undefined>(
      OPEN_PRODUCTION_BUILDER_EVENT,
      { detail: context }
    )
  )
}
