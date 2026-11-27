/**
 * Safe Admin Preview & Canary Model Override Store
 *
 * Production defaults remain strictly git-pinned in `modelConfig.ts`.
 * This store enables safe, reversible Admin Preview (`admin_only`) or
 * percentage-bucketed Canary (`canary_percent`) overrides so SceneFlow can
 * evaluate candidate models on real traffic before committing a Git pin bump.
 */

export type CanarySurface =
  | 'blueprint'
  | 'showrunner_pitch'
  | 'script_chunk'
  | 'script_ledger'
  | 'audience_resonance'
  | 'eval_judge'

export type CanaryMode = 'off' | 'admin_only' | 'canary_percent'

export interface SurfaceCanaryOverride {
  surface: CanarySurface
  mode: CanaryMode
  /** Target model ID (e.g. 'gemini-3.8-flash' or 'anthropic/claude-sonnet-4.6') */
  candidateModelId: string
  /** Optional provider preference: 'vertex' | 'ai_gateway' | 'auto' */
  provider: 'vertex' | 'ai_gateway' | 'auto'
  /** Percentage of traffic (0–100) when mode === 'canary_percent' */
  percent: number
  updatedAt: string
  updatedBy?: string
  note?: string
}

const VALID_SURFACES: readonly CanarySurface[] = [
  'blueprint',
  'showrunner_pitch',
  'script_chunk',
  'script_ledger',
  'audience_resonance',
  'eval_judge',
]

const overrides = new Map<CanarySurface, SurfaceCanaryOverride>()

function hashBucket(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % 100
}

/**
 * Optionally hydrate overrides from `SCENEFLOW_CANARY_OVERRIDES_JSON` env/Edge Config snapshot.
 */
function readEnvOverrides(): Partial<Record<CanarySurface, SurfaceCanaryOverride>> {
  const raw = process.env.SCENEFLOW_CANARY_OVERRIDES_JSON?.trim()
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const result: Partial<Record<CanarySurface, SurfaceCanaryOverride>> = {}
    for (const surface of VALID_SURFACES) {
      const entry = (parsed as Record<string, any>)[surface]
      if (entry && typeof entry === 'object' && typeof entry.candidateModelId === 'string') {
        result[surface] = {
          surface,
          mode: entry.mode === 'admin_only' || entry.mode === 'canary_percent' ? entry.mode : 'off',
          candidateModelId: entry.candidateModelId.trim(),
          provider:
            entry.provider === 'vertex' || entry.provider === 'ai_gateway' ? entry.provider : 'auto',
          percent: Math.max(0, Math.min(100, Number(entry.percent) || 0)),
          updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : new Date().toISOString(),
          updatedBy: typeof entry.updatedBy === 'string' ? entry.updatedBy : 'env',
          note: typeof entry.note === 'string' ? entry.note : undefined,
        }
      }
    }
    return result
  } catch {
    return {}
  }
}

export function listCanaryOverrides(): SurfaceCanaryOverride[] {
  const envMap = readEnvOverrides()
  const merged = new Map<CanarySurface, SurfaceCanaryOverride>()
  for (const [k, v] of Object.entries(envMap)) {
    if (v) merged.set(k as CanarySurface, v)
  }
  for (const [k, v] of overrides.entries()) {
    merged.set(k, v)
  }
  return Array.from(merged.values())
}

export function getCanaryOverride(surface: CanarySurface): SurfaceCanaryOverride | null {
  const mem = overrides.get(surface)
  if (mem) return mem
  const envMap = readEnvOverrides()
  return envMap[surface] ?? null
}

export function setCanaryOverride(input: {
  surface: CanarySurface
  mode: CanaryMode
  candidateModelId: string
  provider?: 'vertex' | 'ai_gateway' | 'auto'
  percent?: number
  updatedBy?: string
  note?: string
}): SurfaceCanaryOverride {
  if (!VALID_SURFACES.includes(input.surface)) {
    throw new Error(`Unsupported canary surface: ${input.surface}`)
  }
  const entry: SurfaceCanaryOverride = {
    surface: input.surface,
    mode: input.mode,
    candidateModelId: input.candidateModelId.trim(),
    provider: input.provider || 'auto',
    percent: Math.max(0, Math.min(100, Math.round(input.percent ?? 0))),
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy,
    note: input.note,
  }
  if (entry.mode === 'off' || !entry.candidateModelId) {
    overrides.delete(input.surface)
    return { ...entry, mode: 'off' }
  }
  overrides.set(input.surface, entry)
  return entry
}

export function clearAllCanaryOverrides(): void {
  overrides.clear()
}

/**
 * Resolve whether a request on `surface` should use an active canary model override.
 */
export function resolveCanaryModelForRequest(input: {
  surface: CanarySurface
  isAdmin?: boolean
  bucketKey?: string
}): { active: boolean; modelId?: string; provider?: 'vertex' | 'ai_gateway' | 'auto' } {
  const override = getCanaryOverride(input.surface)
  if (!override || override.mode === 'off' || !override.candidateModelId) {
    return { active: false }
  }
  if (override.mode === 'admin_only') {
    if (!input.isAdmin) return { active: false }
    return { active: true, modelId: override.candidateModelId, provider: override.provider }
  }
  if (override.mode === 'canary_percent') {
    if (override.percent <= 0) return { active: false }
    if (override.percent >= 100) {
      return { active: true, modelId: override.candidateModelId, provider: override.provider }
    }
    const bucket = hashBucket(`${input.surface}:${input.bucketKey || Math.random().toString(36)}`)
    if (bucket < override.percent) {
      return { active: true, modelId: override.candidateModelId, provider: override.provider }
    }
  }
  return { active: false }
}
