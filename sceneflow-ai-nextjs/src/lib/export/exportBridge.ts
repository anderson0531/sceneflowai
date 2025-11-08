import type { ExportBridge } from '@/types/export-api'

const isBrowser = typeof window !== 'undefined'

type BridgeAccessor = () => ExportBridge | null

export const getExportBridge: BridgeAccessor = () => {
  if (!isBrowser) {
    return null
  }

  return window.exportAPI ?? null
}
