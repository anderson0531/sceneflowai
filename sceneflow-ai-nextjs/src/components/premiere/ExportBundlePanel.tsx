'use client'

import React, { useState } from 'react'
import { Package, Loader2, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ExportBundlePanelProps {
  projectId?: string
  videoUrl?: string
  title?: string
  thumbnailUrl?: string
  locale?: string
  className?: string
}

export function ExportBundlePanel({
  projectId,
  videoUrl,
  title,
  thumbnailUrl,
  locale = 'en',
  className,
}: ExportBundlePanelProps) {
  const [loading, setLoading] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  const exportBundle = async () => {
    if (!projectId || !videoUrl) return
    setLoading(true)
    try {
      const res = await fetch('/api/premiere/export-bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          videoUrl,
          locale,
          title,
          thumbnailUrl,
          includeSceneFlowCta: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDownloadUrl(data.downloadUrl)
      toast.success('Export bundle ready')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn('rounded-xl border border-zinc-700/70 bg-zinc-900/60 p-4', className)}>
      <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
        <Package className="w-4 h-4 text-emerald-400" />
        Export bundle
      </h3>
      <p className="text-xs text-zinc-500 mb-4">
        ZIP with master MP4, thumbnail, and metadata.json ({locale.toUpperCase()}).
      </p>
      <Button size="sm" onClick={exportBundle} disabled={loading || !videoUrl || !projectId}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Package className="w-4 h-4 mr-1" />}
        Build bundle
      </Button>
      {downloadUrl && (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-emerald-200"
        >
          <Download className="w-3.5 h-3.5" />
          Download ZIP
        </a>
      )}
    </div>
  )
}
