/**
 * Vitest-only. Production pacing stays on; tests opt in by setting the interval.
 * An interval of 0 makes `acquireVertexDispatchSlot` return before any sleep.
 */
if (process.env.VERTEX_IMAGE_DISPATCH_INTERVAL_MS === undefined) {
  process.env.VERTEX_IMAGE_DISPATCH_INTERVAL_MS = '0'
}
if (process.env.VERTEX_VIDEO_DISPATCH_INTERVAL_MS === undefined) {
  process.env.VERTEX_VIDEO_DISPATCH_INTERVAL_MS = '0'
}
