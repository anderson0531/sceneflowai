/** Wait for React commit + browser paint before hiding processing overlays. */
export function waitForUiPaint(extraMs = 0): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (extraMs > 0) {
          setTimeout(resolve, extraMs)
        } else {
          resolve()
        }
      })
    })
  })
}
