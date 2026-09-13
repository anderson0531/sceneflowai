/**
 * Crash-surviving diagnostics for the Screening Room player.
 *
 * A renderer OOM takes the console with it, so samples are mirrored to
 * sessionStorage as they arrive. After a crash, reload the same tab and call
 * `window.__sceneflowScreeningDiag()` to read the last second before death.
 *
 * Off by default. Enable with `?diag=screening` or
 * `window.__sceneflowScreeningDiag.enable()`. Disabled is an early return with
 * no allocation.
 */

export const SCREENING_DIAG_FLAG_KEY = 'sceneflow-screening-diag'
export const SCREENING_DIAG_BUFFER_KEY = 'sceneflow-screening-diag-buffer'
export const SCREENING_DIAG_MAX_ENTRIES = 300
export const SCREENING_DIAG_FLUSH_MS = 250
export const SCREENING_DIAG_SAMPLE_MS = 1000

export type ScreeningDiagEntry = {
  t: number
  kind: string
  [key: string]: unknown
}

export type ScreeningDiagAudioSnapshot = {
  live: number
  buffering: number
  bufferedSec: number
}

export type ScreeningDiagPlayhead = {
  sceneIndex: number
  beatIndex?: number
  beatId?: string
}

type MemoryInfo = { usedJSHeapSize?: number }

type ScreeningDiagDump = {
  enabled: boolean
  startedAt: number | null
  entries: ScreeningDiagEntry[]
}

type ScreeningDiagApi = {
  (): ScreeningDiagDump
  enable: () => void
  disable: () => void
  dump: () => ScreeningDiagDump
}

let enabled = false
let startedAt: number | null = null
let buffer: ScreeningDiagEntry[] | null = null
let dirty = false
let flushTimer: ReturnType<typeof setTimeout> | null = null
let sampleTimer: ReturnType<typeof setInterval> | null = null
let pagehideBound = false
let apiInstalled = false
let longTaskObserver: PerformanceObserver | null = null
let longTaskCount = 0
let longTaskMaxMs = 0
let rendersSinceSample = 0
let imageLoads = 0
let decodedMb = 0
let audioSnapshot: (() => ScreeningDiagAudioSnapshot | null) | null = null
let playhead: ScreeningDiagPlayhead | null = null

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
}

function readStorage(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // Private mode or a full quota — keep the in-memory buffer.
  }
}

function urlRequestsEnable(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('diag') === 'screening'
  } catch {
    return false
  }
}

function persistFlag(): void {
  writeStorage(SCREENING_DIAG_FLAG_KEY, '1')
}

function loadPersistedBuffer(): ScreeningDiagEntry[] {
  const raw = readStorage(SCREENING_DIAG_BUFFER_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as { startedAt?: number; entries?: ScreeningDiagEntry[] }
    if (typeof parsed.startedAt === 'number' && startedAt == null) {
      startedAt = parsed.startedAt
    }
    return Array.isArray(parsed.entries) ? parsed.entries : []
  } catch {
    return []
  }
}

function flushBuffer(): void {
  if (!dirty || !buffer) return
  dirty = false
  writeStorage(
    SCREENING_DIAG_BUFFER_KEY,
    JSON.stringify({ startedAt, entries: buffer })
  )
}

function scheduleFlush(): void {
  if (flushTimer != null) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flushBuffer()
  }, SCREENING_DIAG_FLUSH_MS)
}

function usedHeapBytes(): number | undefined {
  const memory = (performance as Performance & { memory?: MemoryInfo }).memory
  return typeof memory?.usedJSHeapSize === 'number' ? memory.usedJSHeapSize : undefined
}

function pushEntry(entry: ScreeningDiagEntry): void {
  if (!buffer) buffer = []
  buffer.push(entry)
  if (buffer.length > SCREENING_DIAG_MAX_ENTRIES) {
    buffer.splice(0, buffer.length - SCREENING_DIAG_MAX_ENTRIES)
  }
  dirty = true
  scheduleFlush()
}

function emitSample(): void {
  const audio = audioSnapshot?.() ?? null
  const heap = usedHeapBytes()
  const entry: ScreeningDiagEntry = {
    t: nowMs(),
    kind: 'sample',
    renders: rendersSinceSample,
    liveAudio: audio?.live ?? 0,
    bufferingAudio: audio?.buffering ?? 0,
    bufferedSec: audio?.bufferedSec ?? 0,
    imageLoads,
    decodedMb: Math.round(decodedMb * 100) / 100,
    longTasks: longTaskCount,
    longTaskMaxMs: Math.round(longTaskMaxMs * 10) / 10,
    sceneIndex: playhead?.sceneIndex,
    beatIndex: playhead?.beatIndex,
    beatId: playhead?.beatId,
  }
  if (heap != null) entry.usedJSHeapSize = heap
  rendersSinceSample = 0
  pushEntry(entry)
  console.log('[screening-diag]', entry)
}

function startLongTaskObserver(): void {
  if (longTaskObserver || typeof PerformanceObserver === 'undefined') return
  try {
    longTaskObserver = new PerformanceObserver((list) => {
      for (const item of list.getEntries()) {
        longTaskCount += 1
        if (item.duration > longTaskMaxMs) longTaskMaxMs = item.duration
      }
    })
    longTaskObserver.observe({ type: 'longtask', buffered: true })
  } catch {
    longTaskObserver = null
  }
}

function bindPagehide(): void {
  if (pagehideBound || typeof window === 'undefined') return
  pagehideBound = true
  window.addEventListener('pagehide', () => {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    flushBuffer()
  })
}

function installWindowApi(): void {
  if (apiInstalled || typeof window === 'undefined') return
  apiInstalled = true
  const dump = (): ScreeningDiagDump => {
    const snapshot = getScreeningDiagDump()
    const text = JSON.stringify(snapshot, null, 2)
    void navigator.clipboard?.writeText(text).catch(() => {
      // Clipboard can fail without a user gesture; the return value is enough.
    })
    console.log('[screening-diag] dump', snapshot)
    return snapshot
  }
  const api = dump as ScreeningDiagApi
  api.enable = enableScreeningPlayerDiagnostics
  api.disable = disableScreeningPlayerDiagnostics
  api.dump = dump
  window.__sceneflowScreeningDiag = api
}

function startSampler(): void {
  if (sampleTimer != null) return
  sampleTimer = setInterval(emitSample, SCREENING_DIAG_SAMPLE_MS)
}

function activate(): void {
  if (enabled) return
  enabled = true
  persistFlag()
  if (startedAt == null) startedAt = Date.now()
  if (!buffer) buffer = loadPersistedBuffer()
  bindPagehide()
  installWindowApi()
  startLongTaskObserver()
  startSampler()
  console.log('[screening-diag] enabled')
}

/** True only after enable() or a persisted/URL flag; never allocates. */
export function isScreeningDiagEnabled(): boolean {
  if (enabled) return true
  if (typeof window === 'undefined') return false
  if (readStorage(SCREENING_DIAG_FLAG_KEY) === '1' || urlRequestsEnable()) {
    activate()
    return true
  }
  installWindowApi()
  return false
}

export function enableScreeningPlayerDiagnostics(): void {
  persistFlag()
  activate()
}

export function disableScreeningPlayerDiagnostics(): void {
  enabled = false
  if (sampleTimer) {
    clearInterval(sampleTimer)
    sampleTimer = null
  }
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  flushBuffer()
}

export function recordScreeningDiag(kind: string, payload?: Record<string, unknown>): void {
  if (!isScreeningDiagEnabled()) return
  const entry: ScreeningDiagEntry = { t: nowMs(), kind, ...payload }
  pushEntry(entry)
  if (kind !== 'sample') console.log('[screening-diag]', kind, payload ?? {})
}

export function noteScreeningDiagRender(): void {
  if (!isScreeningDiagEnabled()) return
  rendersSinceSample += 1
}

export function setScreeningDiagAudioSnapshot(
  getter: (() => ScreeningDiagAudioSnapshot | null) | null
): void {
  audioSnapshot = getter
}

export function setScreeningDiagPlayhead(next: ScreeningDiagPlayhead | null): void {
  playhead = next
}

export function noteScreeningDiagImageLoad(info: {
  url: string
  naturalWidth: number
  naturalHeight: number
  optimized: boolean
}): void {
  if (!isScreeningDiagEnabled()) return
  const bytes = info.naturalWidth * info.naturalHeight * 4
  const mb = bytes / (1024 * 1024)
  imageLoads += 1
  decodedMb += mb
  recordScreeningDiag('image-load', {
    url: info.url.slice(0, 160),
    naturalWidth: info.naturalWidth,
    naturalHeight: info.naturalHeight,
    optimized: info.optimized,
    decodedMb: Math.round(mb * 100) / 100,
  })
}

export function getScreeningDiagDump(): ScreeningDiagDump {
  const persisted = !buffer ? loadPersistedBuffer() : buffer
  return {
    enabled,
    startedAt,
    entries: persisted.slice(),
  }
}

/** Test seam: drop in-memory state so a suite can observe a fresh session. */
export function resetScreeningPlayerDiagnostics(): void {
  enabled = false
  startedAt = null
  buffer = null
  dirty = false
  rendersSinceSample = 0
  imageLoads = 0
  decodedMb = 0
  longTaskCount = 0
  longTaskMaxMs = 0
  playhead = null
  audioSnapshot = null
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (sampleTimer) {
    clearInterval(sampleTimer)
    sampleTimer = null
  }
  longTaskObserver?.disconnect()
  longTaskObserver = null
}

declare global {
  interface Window {
    __sceneflowScreeningDiag?: ScreeningDiagApi
  }
}
