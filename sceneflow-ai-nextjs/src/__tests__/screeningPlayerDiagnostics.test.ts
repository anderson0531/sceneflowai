import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SCREENING_DIAG_BUFFER_KEY,
  SCREENING_DIAG_FLAG_KEY,
  SCREENING_DIAG_MAX_ENTRIES,
  disableScreeningPlayerDiagnostics,
  enableScreeningPlayerDiagnostics,
  getScreeningDiagDump,
  isScreeningDiagEnabled,
  recordScreeningDiag,
  resetScreeningPlayerDiagnostics,
} from '@/lib/storyboard/screeningPlayerDiagnostics'

function installStorage() {
  const store = new Map<string, string>()
  const sessionStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }
  vi.stubGlobal('sessionStorage', sessionStorage)
  vi.stubGlobal('window', {
    sessionStorage,
    location: { search: '' },
    addEventListener: () => {},
    __sceneflowScreeningDiag: undefined,
  })
  return store
}

describe('screeningPlayerDiagnostics', () => {
  let store: Map<string, string>

  beforeEach(() => {
    resetScreeningPlayerDiagnostics()
    store = installStorage()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    disableScreeningPlayerDiagnostics()
    resetScreeningPlayerDiagnostics()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('is a no-op when disabled', () => {
    expect(isScreeningDiagEnabled()).toBe(false)
    recordScreeningDiag('beat-advance', { sceneIndex: 0 })
    expect(getScreeningDiagDump().entries).toHaveLength(0)
    expect(store.size).toBe(0)
  })

  it('caps the ring buffer', () => {
    enableScreeningPlayerDiagnostics()
    for (let i = 0; i < SCREENING_DIAG_MAX_ENTRIES + 25; i++) {
      recordScreeningDiag('beat-advance', { i })
    }
    const dump = getScreeningDiagDump()
    expect(dump.entries.length).toBe(SCREENING_DIAG_MAX_ENTRIES)
    expect(dump.entries[0]?.i).toBe(25)
    expect(dump.entries[dump.entries.length - 1]?.i).toBe(SCREENING_DIAG_MAX_ENTRIES + 24)
  })

  it('round-trips the buffer through sessionStorage', () => {
    vi.useFakeTimers()
    enableScreeningPlayerDiagnostics()
    expect(store.get(SCREENING_DIAG_FLAG_KEY)).toBe('1')
    recordScreeningDiag('scene-mount', { beats: 22, uniqueAudioUrls: 45 })
    vi.advanceTimersByTime(250)

    const persisted = store.get(SCREENING_DIAG_BUFFER_KEY)
    expect(persisted).toBeTruthy()

    // Simulate a crash: drop memory, keep the tab's sessionStorage.
    resetScreeningPlayerDiagnostics()
    store.set(SCREENING_DIAG_FLAG_KEY, '1')
    store.set(SCREENING_DIAG_BUFFER_KEY, persisted!)

    expect(isScreeningDiagEnabled()).toBe(true)
    const dump = getScreeningDiagDump()
    expect(dump.entries.some((entry) => entry.kind === 'scene-mount')).toBe(true)
    vi.useRealTimers()
  })
})
