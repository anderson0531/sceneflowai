/**
 * Orchestrate Express Audio + Express Scene (frames) in parallel.
 * Both lanes keep their own locks and progress overlays; this only starts them together.
 */
export async function runExpressGenerateAll(options: {
  runAudio: () => Promise<void>
  runFrames: () => Promise<void>
}): Promise<PromiseSettledResult<void>[]> {
  return Promise.allSettled([options.runAudio(), options.runFrames()])
}
