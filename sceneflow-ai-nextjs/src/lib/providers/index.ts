import type { VideoAdapter } from '@/lib/orchestration/VideoProductionService'

const registry: Record<string, VideoAdapter> = {}

export function registerVideoAdapter(name: string, adapter: VideoAdapter) {
  registry[name] = adapter
}

export function getVideoAdapter(name: string): VideoAdapter {
  const a = registry[name]
  if (!a) throw new Error(`Video adapter not registered: ${name}`)
  return a
}
