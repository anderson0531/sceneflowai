/**
 * Client-side resumable checkpoint store for the Production Agent.
 *
 * Persists active run options, progress, and telemetry so refreshing or reopening
 * the tab surfaces a 1-click "Resume Run" banner + Needs-Attention error tray
 * inside `ProductionAgentDock` instead of silently losing work.
 */

import type {
  ProductionBuilderOptions,
  ProductionAgentTelemetry,
  ProductionStageId,
} from '@/lib/production/runProductionAgent'

export interface PersistedProductionAgentRun {
  projectId: string
  status: 'running' | 'interrupted' | 'completed' | 'failed'
  options: ProductionBuilderOptions
  stage: ProductionStageId
  subtitle: string
  progressPct: number
  telemetry: ProductionAgentTelemetry
  startedAt: number
  updatedAt: number
}

const STORAGE_KEY_PREFIX = 'sceneflow:production-agent-run:'
const MAX_STALE_MS = 24 * 60 * 60 * 1000 // 24 hours

function storageKey(projectId: string): string {
  return `${STORAGE_KEY_PREFIX}${projectId}`
}

export function saveProductionAgentCheckpoint(run: PersistedProductionAgentRun): void {
  if (typeof window === 'undefined' || !run.projectId) return
  try {
    window.localStorage.setItem(
      storageKey(run.projectId),
      JSON.stringify({ ...run, updatedAt: Date.now() })
    )
  } catch {
    // Ignore quota / private-browsing storage errors
  }
}

export function loadProductionAgentCheckpoint(
  projectId: string
): PersistedProductionAgentRun | null {
  if (typeof window === 'undefined' || !projectId) return null
  try {
    const raw = window.localStorage.getItem(storageKey(projectId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedProductionAgentRun
    if (!parsed || parsed.projectId !== projectId || !parsed.options) return null
    if (Date.now() - (parsed.updatedAt || 0) > MAX_STALE_MS) {
      clearProductionAgentCheckpoint(projectId)
      return null
    }
    // If the previous tab closed while status was 'running', mark it as 'interrupted'
    if (parsed.status === 'running') {
      return { ...parsed, status: 'interrupted' }
    }
    return parsed
  } catch {
    return null
  }
}

export function clearProductionAgentCheckpoint(projectId: string): void {
  if (typeof window === 'undefined' || !projectId) return
  try {
    window.localStorage.removeItem(storageKey(projectId))
  } catch {
    // Ignore storage errors
  }
}
