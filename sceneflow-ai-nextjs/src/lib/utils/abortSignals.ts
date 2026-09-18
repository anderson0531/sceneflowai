/**
 * Merge AbortSignals so a timeout or a parent cancel both stop the same fetch.
 */

export function combineAbortSignals(
  ...signals: Array<AbortSignal | undefined>
): AbortSignal {
  const live = signals.filter((signal): signal is AbortSignal => !!signal)
  if (live.length === 0) {
    return new AbortController().signal
  }
  if (live.length === 1) return live[0]!
  const controller = new AbortController()
  const abort = () => {
    if (!controller.signal.aborted) controller.abort()
  }
  for (const signal of live) {
    if (signal.aborted) {
      abort()
      break
    }
    signal.addEventListener('abort', abort, { once: true })
  }
  return controller.signal
}
