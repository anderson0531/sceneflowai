'use client'

import React, { useRef, useEffect } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { ReportType, ReportData } from '@/lib/types/reports'
import { Printer, Download, Eye } from 'lucide-react'

// Import Renderers
import { TreatmentRenderer } from './renderers/TreatmentRenderer'
import { ScriptRenderer } from './renderers/ScriptRenderer'
import { StoryboardRenderer } from './renderers/StoryboardRenderer'
import { SceneDirectionRenderer } from './renderers/SceneDirectionRenderer'

// Fallback renderer
const FallbackRenderer = React.forwardRef<HTMLDivElement, { type: ReportType }>(({ type }, ref) => (
  <div ref={ref} className="p-8 bg-white">Preview not yet available for {type}.</div>
))
FallbackRenderer.displayName = 'FallbackRenderer'

// Map report types to renderers
const RENDERER_MAP: Record<string, React.ForwardRefExoticComponent<any>> = {
  [ReportType.FILM_TREATMENT]: TreatmentRenderer,
  [ReportType.PROFESSIONAL_SCRIPT]: ScriptRenderer,
  [ReportType.STORYBOARD]: StoryboardRenderer,
  [ReportType.SCENE_DIRECTION]: SceneDirectionRenderer,
}

interface ReportPreviewModalProps {
  trigger?: React.ReactNode
  type: ReportType
  data: ReportData
  projectName: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({ 
  trigger, 
  type, 
  data, 
  projectName,
  open,
  onOpenChange 
}) => {
  const contentRef = useRef<HTMLDivElement>(null)
  
  const RendererComponent = RENDERER_MAP[type] || FallbackRenderer
  
  // Simplify documentTitle - don't call function, pass string directly
  const documentTitle = `${projectName}_${type.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}`
  
  const handlePrint = useReactToPrint({
    contentRef: contentRef,
    documentTitle: documentTitle,
    onBeforePrint: async () => {
      console.log('[ReportPreview] Starting print...')
      console.log('[ReportPreview] contentRef.current:', contentRef.current)
      if (!contentRef.current) {
        console.error('[ReportPreview] Content ref is null')
      }
    },
    onAfterPrint: async () => {
      console.log('[ReportPreview] Print completed')
    },
    onPrintError: (errorLocation, error) => {
      console.error('[ReportPreview] Print error:', errorLocation, error)
    },
    pageStyle: `
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          color: black;
          background-color: white;
        }
        .report-container {
          box-shadow: none;
          padding: 0 !important;
        }
        .script-format {
          font-size: 12pt !important;
          line-height: 1.5 !important;
        }
      }
      @page {
        size: auto;
        margin: 1in;
      }
    `,
  })
  
  // Add debug useEffect
  useEffect(() => {
    console.log('[ReportPreview] handlePrint is:', handlePrint)
    console.log('[ReportPreview] contentRef.current:', contentRef.current)
  }, [handlePrint])
  
  // Wrap handlers to prevent Promise expectations
  const handlePrintClick = () => {
    console.log('[ReportPreview] handlePrint:', handlePrint)
    console.log('[ReportPreview] contentRef.current:', contentRef.current)
    
    if (!handlePrint) {
      console.error('[ReportPreview] handlePrint is undefined!')
      alert('Print function is not available. Please try refreshing the page.')
      return
    }
    
    if (!contentRef.current) {
      console.error('[ReportPreview] Content ref is null!')
      alert('Content is not ready for printing.')
      return
    }
    
    try {
      handlePrint()
    } catch (error: any) {
      console.error('[ReportPreview] Print failed:', error)
      alert(`Print failed: ${error.message}`)
    }
  }

  const handleDownloadClick = () => {
    console.log('[ReportPreview] handlePrint:', handlePrint)
    console.log('[ReportPreview] contentRef.current:', contentRef.current)
    
    if (!handlePrint) {
      console.error('[ReportPreview] handlePrint is undefined!')
      alert('Download function is not available. Please try refreshing the page.')
      return
    }
    
    if (!contentRef.current) {
      console.error('[ReportPreview] Content ref is null!')
      alert('Content is not ready for downloading.')
      return
    }
    
    try {
      handlePrint()
    } catch (error: any) {
      console.error('[ReportPreview] Download failed:', error)
      alert(`Download failed: ${error.message}`)
    }
  }
  
  const defaultTrigger = (
    <Button variant="secondary">
      <Eye className="w-4 h-4 mr-2"/> Preview {type}
    </Button>
  )
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b">
          <DialogTitle>Preview: {type}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
          <div className="shadow-lg max-w-4xl mx-auto">
            <RendererComponent ref={contentRef} data={data} type={type} />
          </div>
        </div>
        
        <DialogFooter className="p-6 border-t">
          <Button variant="outline" onClick={handlePrintClick}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleDownloadClick}>
            <Download className="w-4 h-4 mr-2" />
            Download (PDF)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

