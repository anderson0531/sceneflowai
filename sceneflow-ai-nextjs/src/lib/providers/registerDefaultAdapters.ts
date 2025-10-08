import { registerVideoAdapter } from '@/lib/providers'
import { createVeoAdapter } from '@/lib/providers/video/veo'

export function registerDefaultAdapters() {
  try { registerVideoAdapter('veo', createVeoAdapter()) } catch {}
}
