'use client'

import React, { useMemo, useState } from 'react'
import {
  Building2,
  Check,
  CheckCircle2,
  Compass,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Film,
  Globe,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { compileSceneFlowProjectToPropertyTour } from '@/lib/propertyTours/compileProjectToTour'
import type { PropertyTourDTO } from '@/lib/propertyTours/types'

export interface PublishToPropertyExplorerDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  projectTitle?: string
  userId?: string
  script?: unknown
  metadata?: unknown
  sceneProductionState?: Record<string, any> | null
  streams?: any[] | null
}

const ACCENT_SWATCHES = ['#06b6d4', '#d97706', '#10b981', '#3b82f6', '#e11d48', '#94a3b8']

export function PublishToPropertyExplorerDialog({
  open,
  onClose,
  projectId,
  projectTitle,
  userId,
  script,
  metadata,
  sceneProductionState,
  streams,
}: PublishToPropertyExplorerDialogProps) {
  const [agencyName, setAgencyName] = useState('Pacific Crest Luxury Estates')
  const [agentName, setAgentName] = useState('Elena Vance')
  const [agentEmail, setAgentEmail] = useState('')
  const [agentPhone, setAgentPhone] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#06b6d4')
  const [hideSceneFlowBranding, setHideSceneFlowBranding] = useState(false)
  const [propertyAddress, setPropertyAddress] = useState('')
  const [priceUsd, setPriceUsd] = useState('')
  const [beds, setBeds] = useState('')
  const [baths, setBaths] = useState('')
  const [sqft, setSqft] = useState('')

  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState<{
    slug: string
    shareUrl: string
    embedUrl: string
    iframeCode: string
    storage: string
    tour: PropertyTourDTO
  } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const previewCompile = useMemo(() => {
    if (!open) return null
    return compileSceneFlowProjectToPropertyTour({
      projectId,
      userId,
      title: projectTitle,
      script,
      metadata: (metadata && typeof metadata === 'object' ? metadata : {}) as Record<string, any>,
      sceneProductionState: sceneProductionState || {},
      streams: streams || [],
    })
  }, [open, projectId, userId, projectTitle, script, metadata, sceneProductionState, streams])

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000)
    } catch {
      toast.error('Unable to copy')
    }
  }

  const handlePublish = async () => {
    if (publishing) return
    setPublishing(true)
    try {
      const parsedPrice = Number(priceUsd.replace(/[^0-9.]/g, '')) || undefined
      const parsedBeds = Number(beds) || undefined
      const parsedBaths = Number(baths) || undefined
      const parsedSqft = Number(sqft.replace(/[^0-9.]/g, '')) || undefined

      const res = await fetch('/api/property-tours/publish-from-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId,
          title: projectTitle,
          script,
          metadata,
          sceneProductionState,
          streams,
          propertyAddress: propertyAddress.trim() || null,
          propertySpecs: {
            ...(parsedPrice ? { priceUsd: parsedPrice } : {}),
            ...(parsedBeds ? { beds: parsedBeds } : {}),
            ...(parsedBaths ? { baths: parsedBaths } : {}),
            ...(parsedSqft ? { sqft: parsedSqft } : {}),
          },
          branding: {
            agencyName: agencyName.trim() || 'Property Showcase',
            agentName: agentName.trim() || undefined,
            agentEmail: agentEmail.trim() || undefined,
            agentPhone: agentPhone.trim() || undefined,
            primaryColor,
            hideSceneFlowBranding,
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.shareUrl) {
        throw new Error(data?.error || 'Failed to publish to Interactive Property Explorer')
      }

      setPublished({
        slug: data.slug,
        shareUrl: data.shareUrl,
        embedUrl: data.embedUrl,
        iframeCode: data.iframeCode,
        storage: data.storage || 'vercel_blob',
        tour: data.tour,
      })
      toast.success('Published to Interactive Property Explorer!')
    } catch (err: any) {
      toast.error(err?.message || 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-950 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Compass className="h-5 w-5 text-cyan-400" />
            <span>Publish Production to Interactive Property Explorer</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Compiles your SceneFlow Blueprint &amp; Production scenes, N/E/S/W frames, video clips,
            multilingual agent voiceovers (EN / ES / JA), and music into a standalone white-label{' '}
            <code className="text-cyan-300">/tour/[slug]</code> &amp; embeddable player.
          </DialogDescription>
        </DialogHeader>

        {/* Live Compilation Preview */}
        {previewCompile && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-2">
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Spaces</div>
              <div className="mt-0.5 text-lg font-bold text-white">
                {previewCompile.stats.totalRooms}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Visual Plates</div>
              <div className="mt-0.5 text-lg font-bold text-cyan-300">
                {previewCompile.stats.totalVisualPlates}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Film className="h-3 w-3 text-emerald-400" />
                Video Clips
              </div>
              <div className="mt-0.5 text-lg font-bold text-emerald-300">
                {previewCompile.stats.totalVideoClips}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Globe className="h-3 w-3 text-amber-400" />
                Languages
              </div>
              <div className="mt-0.5 text-sm font-bold text-white">
                {previewCompile.stats.languagesDetected.map((l) => l.toUpperCase()).join(' · ')}
              </div>
              <div className="text-[10px] text-slate-400">
                ~{previewCompile.stats.estimatedMinutes} min compiled
              </div>
            </div>
          </div>
        )}

        {published ? (
          <div className="space-y-4 rounded-xl border border-emerald-500/35 bg-emerald-950/20 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
              Live White-Label Property Explorer Published!
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Standalone White-Label Share URL
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    readOnly
                    value={published.shareUrl}
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-cyan-300 font-mono"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy('share', published.shareUrl)}
                    className="border-white/15 text-white shrink-0"
                  >
                    {copiedKey === 'share' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Responsive MLS / Brokerage Embed Snippet
                </label>
                <textarea
                  readOnly
                  rows={3}
                  value={published.iframeCode}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 p-2.5 text-[11px] text-slate-300 font-mono"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleCopy('iframe', published.iframeCode)}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy Embed Code
                  </Button>
                  <a
                    href={published.shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
                    Open Live Player
                  </a>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPublished(null)}
                    className="border-white/15 text-slate-300 ml-auto"
                  >
                    Edit &amp; Republish
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* White-Label Brokerage Branding */}
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Building2 className="h-4 w-4 text-cyan-400" />
                White-Label Brokerage &amp; Listing Advisor
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Brokerage / Agency</label>
                  <input
                    type="text"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Listing Advisor Name</label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Lead Routing Email</label>
                  <input
                    type="email"
                    value={agentEmail}
                    onChange={(e) => setAgentEmail(e.target.value)}
                    placeholder="advisor@brokerage.com"
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Advisor Phone</label>
                  <input
                    type="text"
                    value={agentPhone}
                    onChange={(e) => setAgentPhone(e.target.value)}
                    placeholder="(310) 555-0194"
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Brand Color:</span>
                  {ACCENT_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setPrimaryColor(hex)}
                      className={`h-6 w-6 rounded-full border-2 ${
                        primaryColor === hex ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setHideSceneFlowBranding((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                    hideSceneFlowBranding
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                      : 'border-white/15 bg-white/5 text-slate-300'
                  }`}
                >
                  {hideSceneFlowBranding ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {hideSceneFlowBranding ? '100% White-Label' : 'Hide SceneFlow Badge'}
                </button>
              </div>
            </div>

            {/* Optional Property Listing Specs */}
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
              <div className="text-xs font-bold text-white">Property Listing Specs (Optional)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-400 mb-1">Property Address</label>
                  <input
                    type="text"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    placeholder="742 Oceanfront Terrace, Malibu, CA 90265"
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">List Price (USD)</label>
                  <input
                    type="text"
                    value={priceUsd}
                    onChange={(e) => setPriceUsd(e.target.value)}
                    placeholder="8450000"
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Beds</label>
                    <input
                      type="text"
                      value={beds}
                      onChange={(e) => setBeds(e.target.value)}
                      placeholder="5"
                      className="w-full rounded-lg border border-white/10 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Baths</label>
                    <input
                      type="text"
                      value={baths}
                      onChange={(e) => setBaths(e.target.value)}
                      placeholder="6.5"
                      className="w-full rounded-lg border border-white/10 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Sq Ft</label>
                    <input
                      type="text"
                      value={sqft}
                      onChange={(e) => setSqft(e.target.value)}
                      placeholder="6240"
                      className="w-full rounded-lg border border-white/10 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={publishing || (previewCompile?.stats.totalRooms ?? 0) === 0}
                onClick={() => void handlePublish()}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
              >
                {publishing ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1.5" />
                )}
                {publishing ? 'Compiling & Publishing...' : 'Compile & Publish Live /tour/[slug]'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
