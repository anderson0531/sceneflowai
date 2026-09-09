'use client'

import React, { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useReactToPrint } from 'react-to-print'
import { Download, FileText, FileJson, Printer } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { TreatmentRenderer } from '@/components/reports/renderers/TreatmentRenderer'
import type { FilmTreatmentData } from '@/lib/types/reports'
import {
  exportTreatmentContent,
  type BlueprintExportFormat,
  type TreatmentExportInput,
} from '@/lib/blueprint/exportTreatment'
import { downloadExport } from '@/lib/script/scriptExporter'
import { toast } from 'sonner'

interface BlueprintExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant: TreatmentExportInput | null
  projectName?: string
}

const FORMAT_OPTIONS: Array<{
  id: BlueprintExportFormat | 'pdf'
  icon: React.ReactNode
}> = [
  { id: 'pdf', icon: <Printer className="h-4 w-4" /> },
  { id: 'fountain', icon: <FileText className="h-4 w-4" /> },
  { id: 'markdown', icon: <FileText className="h-4 w-4" /> },
  { id: 'json', icon: <FileJson className="h-4 w-4" /> },
]

export function BlueprintExportDialog({
  open,
  onOpenChange,
  variant,
  projectName = 'Blueprint',
}: BlueprintExportDialogProps) {
  const t = useTranslations('blueprint.export')
  const printRef = useRef<HTMLDivElement>(null)
  const [selectedFormat, setSelectedFormat] = useState<BlueprintExportFormat | 'pdf'>('markdown')
  const [exporting, setExporting] = useState(false)

  const documentTitle = `${projectName}_blueprint_${new Date().toISOString().split('T')[0]}`

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle,
  })

  const handleExport = async () => {
    if (!variant) {
      toast.error(t('noVariant'))
      return
    }
    setExporting(true)
    try {
      if (selectedFormat === 'pdf') {
        if (!printRef.current) {
          toast.error(t('pdfNotReady'))
          return
        }
        handlePrint()
        toast.success(t('pdfHint'))
        return
      }
      const { content, filename, mimeType } = exportTreatmentContent(variant, selectedFormat)
      downloadExport(content, filename, mimeType)
      toast.success(t('downloadSuccess', { format: selectedFormat.toUpperCase() }))
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('exportFailed'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 py-2">
          {FORMAT_OPTIONS.map(({ id, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedFormat(id)}
              className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                selectedFormat === id
                  ? 'border-purple-500/50 bg-purple-500/10'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-900/40'
              }`}
            >
              <span className="mt-0.5 text-purple-300">{icon}</span>
              <span>
                <span className="block text-sm font-medium text-white">{t(`formats.${id}.label`)}</span>
                <span className="block text-[11px] text-gray-400 mt-0.5 leading-snug">
                  {t(`formats.${id}.hint`)}
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Hidden print root for PDF */}
        {variant ? (
          <div className="sr-only" aria-hidden>
            <TreatmentRenderer ref={printRef} data={variant as FilmTreatmentData} />
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={() => void handleExport()} disabled={!variant || exporting}>
            <Download className="h-4 w-4 mr-2" />
            {selectedFormat === 'pdf' ? t('savePdf') : t('download')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
