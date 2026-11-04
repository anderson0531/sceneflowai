import { create } from 'zustand'
import type { AgentRunItem, AgentRunItemStatus, AgentRunTone } from '@/components/vision/AgentRunDock'

/**
 * Non-blocking counterpart to `useOverlayStore`.
 *
 * Agent work that used to raise AnimatedProcessingOverlay reports here so the
 * page stays usable. `AgentRunStoreDocks` turns each record into an AgentRunDock.
 * Specialized docks (Audio, Express, Direct, …) stay page-owned; this store is
 * for the leftover freeze-overlay conversions that live in nested components.
 */
export type StoredAgentRun = {
  id: string
  title: string
  subtitle?: string
  meta?: string
  items: AgentRunItem[]
  progressPct?: number | null
  finished: boolean
  tone: AgentRunTone
  keepTabOpen?: boolean
  onCancel?: () => void
  cancelLabel?: string
  onAction?: () => void
  actionLabel?: string
}

type AgentRunState = {
  runs: StoredAgentRun[]
  upsert: (run: StoredAgentRun) => void
  patch: (id: string, patch: Partial<StoredAgentRun>) => void
  dismiss: (id: string) => void
}

export const useAgentRunStore = create<AgentRunState>((set) => ({
  runs: [],
  upsert: (run) =>
    set((state) => {
      const index = state.runs.findIndex((entry) => entry.id === run.id)
      if (index === -1) return { runs: [...state.runs, run] }
      const next = [...state.runs]
      next[index] = { ...next[index], ...run }
      return { runs: next }
    }),
  patch: (id, patch) =>
    set((state) => ({
      runs: state.runs.map((run) => (run.id === id ? { ...run, ...patch } : run)),
    })),
  dismiss: (id) =>
    set((state) => ({
      runs: state.runs.filter((run) => run.id !== id),
    })),
}))

function defaultItems(itemLabel?: string): AgentRunItem[] {
  return itemLabel ? [{ key: 'primary', label: itemLabel, status: 'running' }] : []
}

export function startAgentRun(input: {
  id: string
  title: string
  subtitle?: string
  meta?: string
  items?: AgentRunItem[]
  itemLabel?: string
  keepTabOpen?: boolean
  progressPct?: number | null
  onCancel?: () => void
  cancelLabel?: string
  onAction?: () => void
  actionLabel?: string
}): string {
  const items = input.items ?? defaultItems(input.itemLabel)
  useAgentRunStore.getState().upsert({
    id: input.id,
    title: input.title,
    subtitle: input.subtitle ?? 'you can keep editing',
    meta: input.meta,
    items,
    progressPct: input.progressPct ?? (items.some((item) => item.status === 'running') ? 8 : 0),
    finished: false,
    tone: 'running',
    keepTabOpen: input.keepTabOpen,
    onCancel: input.onCancel,
    cancelLabel: input.cancelLabel,
    onAction: input.onAction,
    actionLabel: input.actionLabel,
  })
  return input.id
}

export function patchAgentRun(id: string, patch: Partial<StoredAgentRun>): void {
  useAgentRunStore.getState().patch(id, patch)
}

export function setAgentRunItem(
  id: string,
  key: string,
  update: Partial<AgentRunItem> & { status: AgentRunItemStatus }
): void {
  const run = useAgentRunStore.getState().runs.find((entry) => entry.id === id)
  if (!run) return
  const items = run.items.map((item) => (item.key === key ? { ...item, ...update } : item))
  const settled = items.filter((item) => item.status === 'done' || item.status === 'error').length
  const progressPct =
    items.length === 0 ? run.progressPct : Math.round((settled / items.length) * 100)
  useAgentRunStore.getState().patch(id, { items, progressPct })
}

export function finishAgentRun(id: string, patch?: Partial<StoredAgentRun>): void {
  const run = useAgentRunStore.getState().runs.find((entry) => entry.id === id)
  if (!run) return
  const items =
    patch?.items ??
    run.items.map((item) => (item.status === 'error' ? item : { ...item, status: 'done' as const }))
  const failed = items.some((item) => item.status === 'error')
  useAgentRunStore.getState().patch(id, {
    progressPct: 100,
    onCancel: undefined,
    ...patch,
    items,
    finished: true,
    tone: patch?.tone ?? (failed ? 'warning' : 'success'),
  })
}

export function failAgentRun(id: string, error: string): void {
  const run = useAgentRunStore.getState().runs.find((entry) => entry.id === id)
  const items = (run?.items ?? []).map((item) =>
    item.status === 'running' || item.status === 'pending'
      ? { ...item, status: 'error' as const, error }
      : item
  )
  useAgentRunStore.getState().patch(id, {
    finished: true,
    tone: 'error',
    subtitle: error,
    items,
    progressPct: 100,
    onCancel: undefined,
  })
}

export function dismissAgentRun(id: string): void {
  useAgentRunStore.getState().dismiss(id)
}

/**
 * Drop-in replacement for `useProcessWithOverlay().execute` that reports into
 * the dock instead of freezing the page.
 */
export async function runWithAgentDock<T>(
  options: {
    id: string
    title: string
    subtitle?: string
    meta?: string
    items?: AgentRunItem[]
    itemLabel?: string
    keepTabOpen?: boolean
    onCancel?: () => void
    cancelLabel?: string
    onAction?: () => void
    actionLabel?: string
  },
  fn: (api: {
    setProgress: (progressPct: number) => void
    setSubtitle: (subtitle: string) => void
    setMeta: (meta: string) => void
    setItem: (
      key: string,
      update: Partial<AgentRunItem> & { status: AgentRunItemStatus }
    ) => void
    setFinishPatch: (patch: Partial<StoredAgentRun>) => void
  }) => Promise<T>
): Promise<T> {
  startAgentRun({
    id: options.id,
    title: options.title,
    subtitle: options.subtitle,
    meta: options.meta,
    items: options.items,
    itemLabel: options.itemLabel,
    keepTabOpen: options.keepTabOpen,
    onCancel: options.onCancel,
    cancelLabel: options.cancelLabel,
    onAction: options.onAction,
    actionLabel: options.actionLabel,
  })
  let finishPatch: Partial<StoredAgentRun> | undefined
  try {
    const result = await fn({
      setProgress: (progressPct) => patchAgentRun(options.id, { progressPct }),
      setSubtitle: (subtitle) => patchAgentRun(options.id, { subtitle }),
      setMeta: (meta) => patchAgentRun(options.id, { meta }),
      setItem: (key, update) => setAgentRunItem(options.id, key, update),
      setFinishPatch: (patch) => {
        finishPatch = { ...finishPatch, ...patch }
      },
    })
    finishAgentRun(options.id, finishPatch)
    return result
  } catch (error) {
    failAgentRun(options.id, error instanceof Error ? error.message : 'Failed')
    throw error
  }
}
