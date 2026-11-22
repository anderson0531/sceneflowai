'use client'

import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Download, Printer, QrCode, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export interface KeepsakeQrCardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shareUrl: string
  defaultTitle: string
  studioBrandName?: string
  thumbnailUrl?: string | null
}

type CardTheme = 'obsidian_gold' | 'ivory_heirloom' | 'midnight_cyan'

const THEME_STYLES: Record<
  CardTheme,
  {
    label: string
    bg: string
    border: string
    titleColor: string
    subColor: string
    accentHex: string
    qrDark: string
    qrLight: string
    canvasBg: string
    canvasText: string
    canvasSub: string
  }
> = {
  obsidian_gold: {
    label: 'Obsidian & Gold',
    bg: 'bg-zinc-950',
    border: 'border-amber-400/50',
    titleColor: 'text-amber-100',
    subColor: 'text-zinc-300',
    accentHex: '#f59e0b',
    qrDark: '#09090b',
    qrLight: '#ffffff',
    canvasBg: '#09090b',
    canvasText: '#fef3c7',
    canvasSub: '#d4d4d8',
  },
  ivory_heirloom: {
    label: 'Ivory Heirloom',
    bg: 'bg-stone-50',
    border: 'border-stone-300',
    titleColor: 'text-stone-900',
    subColor: 'text-stone-600',
    accentHex: '#92400e',
    qrDark: '#1c1917',
    qrLight: '#ffffff',
    canvasBg: '#fafaf9',
    canvasText: '#1c1917',
    canvasSub: '#57534e',
  },
  midnight_cyan: {
    label: 'Studio Midnight',
    bg: 'bg-slate-950',
    border: 'border-cyan-400/50',
    titleColor: 'text-white',
    subColor: 'text-slate-300',
    accentHex: '#06b6d4',
    qrDark: '#020617',
    qrLight: '#ffffff',
    canvasBg: '#020617',
    canvasText: '#f8fafc',
    canvasSub: '#cbd5e1',
  },
}

/**
 * Generates a print-ready Family Keepsake QR Card (4x6 / 1200x1800 PNG + browser Print)
 * linked directly to the private white-label Screening Room URL—ideal for photo albums,
 * anniversary gifts, family reunions, and memorial programs.
 */
export function KeepsakeQrCardDialog({
  open,
  onOpenChange,
  shareUrl,
  defaultTitle,
  studioBrandName = 'Private Family Screening',
}: KeepsakeQrCardDialogProps) {
  const [cardTitle, setCardTitle] = useState(defaultTitle || 'Our Family Story')
  const [dedication, setDedication] = useState(
    'Scan with your phone camera to watch our private 4K keepsake film anytime.'
  )
  const [footerLine, setFooterLine] = useState(studioBrandName)
  const [theme, setTheme] = useState<CardTheme>('obsidian_gold')
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    setCardTitle(defaultTitle || 'Our Family Story')
  }, [defaultTitle])

  useEffect(() => {
    if (!open || !shareUrl) return
    const style = THEME_STYLES[theme]
    void QRCode.toDataURL(shareUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 640,
      color: {
        dark: style.qrDark,
        light: style.qrLight,
      },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''))
  }, [open, shareUrl, theme])

  const renderPrintPngDataUrl = async (): Promise<string> => {
    const style = THEME_STYLES[theme]
    const width = 1200
    const height = 1800
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')

    // Background
    ctx.fillStyle = style.canvasBg
    ctx.fillRect(0, 0, width, height)

    // Double heirloom border
    ctx.strokeStyle = style.accentHex
    ctx.lineWidth = 4
    ctx.strokeRect(56, 56, width - 112, height - 112)
    ctx.globalAlpha = 0.45
    ctx.lineWidth = 2
    ctx.strokeRect(72, 72, width - 144, height - 144)
    ctx.globalAlpha = 1

    // Top small kicker
    ctx.fillStyle = style.accentHex
    ctx.font = '600 26px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('PRIVATE KEEPSAKE FILM', width / 2, 165)

    // Card Title (wrapped up to 2 lines)
    ctx.fillStyle = style.canvasText
    ctx.font = '700 64px Georgia, serif'
    const words = cardTitle.trim().split(/\s+/)
    const lines: string[] = []
    let current = ''
    for (const w of words) {
      const test = current ? `${current} ${w}` : w
      if (ctx.measureText(test).width > width - 220 && current) {
        lines.push(current)
        current = w
      } else {
        current = test
      }
    }
    if (current) lines.push(current)
    lines.slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, width / 2, 275 + i * 78)
    })

    // QR White Frame
    const qrSize = 660
    const qrX = (width - qrSize) / 2
    const qrY = 470
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(qrX - 28, qrY - 28, qrSize + 56, qrSize + 56)
    ctx.strokeStyle = style.accentHex
    ctx.lineWidth = 3
    ctx.strokeRect(qrX - 28, qrY - 28, qrSize + 56, qrSize + 56)

    if (qrDataUrl) {
      await new Promise<void>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          ctx.drawImage(img, qrX, qrY, qrSize, qrSize)
          resolve()
        }
        img.onerror = reject
        img.src = qrDataUrl
      })
    }

    // Dedication text (wrapped up to 3 lines)
    ctx.fillStyle = style.canvasSub
    ctx.font = '400 34px system-ui, -apple-system, sans-serif'
    const dedWords = dedication.trim().split(/\s+/)
    const dedLines: string[] = []
    let cur = ''
    for (const w of dedWords) {
      const test = cur ? `${cur} ${w}` : w
      if (ctx.measureText(test).width > width - 240 && cur) {
        dedLines.push(cur)
        cur = w
      } else {
        cur = test
      }
    }
    if (cur) dedLines.push(cur)
    dedLines.slice(0, 3).forEach((line, i) => {
      ctx.fillText(line, width / 2, 1270 + i * 48)
    })

    // Footer studio brand + short URL
    ctx.fillStyle = style.accentHex
    ctx.font = '600 28px system-ui, -apple-system, sans-serif'
    ctx.fillText(footerLine.trim() || 'Private Screening Room', width / 2, 1590)

    ctx.fillStyle = style.canvasSub
    ctx.globalAlpha = 0.7
    ctx.font = '400 22px ui-monospace, monospace'
    ctx.fillText(shareUrl.replace(/^https?:\/\//, '').slice(0, 62), width / 2, 1650)
    ctx.globalAlpha = 1

    return canvas.toDataURL('image/png')
  }

  const handleDownloadPng = async () => {
    setExporting(true)
    try {
      const pngUrl = await renderPrintPngDataUrl()
      const a = document.createElement('a')
      a.href = pngUrl
      const safeName = cardTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48) || 'keepsake'
      a.download = `${safeName}-qr-keepsake-card.png`
      a.click()
      toast.success('4×6 Print-Ready QR Keepsake Card PNG downloaded!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export keepsake card')
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = async () => {
    setExporting(true)
    try {
      const pngUrl = await renderPrintPngDataUrl()
      const win = window.open('', '_blank', 'width=820,height=1040')
      if (!win) {
        toast.error('Please allow pop-ups to open the print sheet')
        return
      }
      win.document.write(
        `<!doctype html><html><head><title>${cardTitle} — Keepsake QR Card</title>` +
          `<style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff;}` +
          `img{max-width:4.5in;max-height:6.5in;box-shadow:0 6px 24px rgba(0,0,0,0.15);}` +
          `@media print{img{box-shadow:none;max-width:100%;max-height:100%;}}</style></head>` +
          `<body><img src="${pngUrl}" onload="window.print()" /></body></html>`
      )
      win.document.close()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open print preview')
    } finally {
      setExporting(false)
    }
  }

  const activeStyle = THEME_STYLES[theme]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-950 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <QrCode className="w-5 h-5 text-amber-400" />
            Printable QR Keepsake Card
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Create a print-ready 4×6 heirloom card (for photo albums, anniversary gifts, or memorial
            programs) linking straight to this private Screening Room.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-5 pt-2 items-start">
          {/* Controls */}
          <div className="space-y-3.5">
            <div>
              <span className="block text-xs font-medium text-slate-300 mb-1.5">Card Theme</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(THEME_STYLES) as CardTheme[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTheme(key)}
                    className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition ${
                      theme === key
                        ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {THEME_STYLES[key].label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-xs text-slate-300">
              <span>Card Title</span>
              <input
                type="text"
                value={cardTitle}
                onChange={(e) => setCardTitle(e.target.value)}
                className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
              />
            </label>

            <label className="block text-xs text-slate-300">
              <span>Dedication / Scan Instructions</span>
              <textarea
                rows={3}
                value={dedication}
                onChange={(e) => setDedication(e.target.value)}
                className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
              />
            </label>

            <label className="block text-xs text-slate-300">
              <span>Footer Credit / Studio Brand</span>
              <input
                type="text"
                value={footerLine}
                onChange={(e) => setFooterLine(e.target.value)}
                className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
              />
            </label>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                disabled={exporting || !qrDataUrl}
                onClick={() => void handleDownloadPng()}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Download Print-Ready PNG (1200×1800)
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={exporting || !qrDataUrl}
                onClick={() => void handlePrint()}
                className="w-full border-slate-700 text-slate-200 hover:bg-slate-800 text-xs"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Print 4×6 Keepsake Card
              </Button>
            </div>
          </div>

          {/* Live Card Preview */}
          <div
            className={`rounded-2xl border-2 p-5 flex flex-col items-center text-center space-y-3 shadow-xl ${activeStyle.bg} ${activeStyle.border}`}
          >
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{ color: activeStyle.accentHex }}
            >
              <Sparkles className="w-3 h-3" />
              Private Keepsake Film
            </span>
            <h3 className={`text-lg font-serif font-bold leading-tight ${activeStyle.titleColor}`}>
              {cardTitle || 'Our Family Story'}
            </h3>
            <div
              className="rounded-xl bg-white p-2.5 border-2 shadow-sm"
              style={{ borderColor: activeStyle.accentHex }}
            >
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="Screening QR Code" className="w-44 h-44 object-contain" />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
                  Generating QR…
                </div>
              )}
            </div>
            <p className={`text-xs leading-relaxed px-2 ${activeStyle.subColor}`}>{dedication}</p>
            <div className="pt-1 space-y-0.5">
              <p
                className="text-[11px] font-semibold tracking-wide"
                style={{ color: activeStyle.accentHex }}
              >
                {footerLine || 'Private Screening Room'}
              </p>
              <p className={`text-[9px] font-mono opacity-65 truncate max-w-[230px] ${activeStyle.subColor}`}>
                {shareUrl.replace(/^https?:\/\//, '')}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
