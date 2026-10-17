'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Download,
  Eye,
  FileText,
  FileCode,
  FileJson,
  FileSpreadsheet,
  Film,
  ChevronDown,
  Loader2,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  exportToFDX,
  exportToFountain,
  exportToMarkdown,
  exportToText,
  exportToJSON,
  exportSceneDirection,
  visionPhaseToScriptData,
  downloadExport,
  DEFAULT_EXPORT_SCRIPT_OPTIONS,
  ExportScriptOptions,
} from '@/lib/script/scriptExporter'
import { ProductionScriptExportDialog } from '@/components/vision/ProductionScriptExportDialog'

interface ScriptExportButtonProps {
  projectId: string
  projectTitle?: string
  visionPhase: any
  variant?: 'default' | 'compact' | 'icon'
  className?: string
}

/**
 * Script Export Button with Preview & Industry Standard format selection
 */
export function ScriptExportButton({
  projectId,
  projectTitle = 'Untitled Script',
  visionPhase,
  variant = 'default',
  className,
}: ScriptExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [showOptionsDialog, setShowOptionsDialog] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<string>('fdx')
  const [exportOptions, setExportOptions] = useState<ExportScriptOptions>({
    ...DEFAULT_EXPORT_SCRIPT_OPTIONS,
  })

  const scenes = visionPhase?.script?.script?.scenes || visionPhase?.script?.scenes || visionPhase?.scenes || []
  const characters = visionPhase?.characters || visionPhase?.script?.characters || []
  const hasScript = scenes.length > 0

  const handleQuickExport = useCallback(
    async (format: string) => {
      if (!hasScript) {
        toast.error('No script to export. Generate a script first.')
        return
      }

      setIsExporting(true)
      try {
        const scriptData = visionPhaseToScriptData(visionPhase, projectTitle)

        let content: string
        let filename: string
        let mimeType: string

        const safeTitle = projectTitle.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)

        switch (format) {
          case 'fdx':
            content = exportToFDX(scriptData, exportOptions)
            filename = `${safeTitle}.fdx`
            mimeType = 'application/xml'
            break
          case 'fountain':
            content = exportToFountain(scriptData, exportOptions)
            filename = `${safeTitle}.fountain`
            mimeType = 'text/plain'
            break
          case 'markdown':
            content = exportToMarkdown(scriptData, exportOptions)
            filename = `${safeTitle}.md`
            mimeType = 'text/markdown'
            break
          case 'text':
            content = exportToText(scriptData, exportOptions)
            filename = `${safeTitle}.txt`
            mimeType = 'text/plain'
            break
          case 'json':
            content = exportToJSON(scriptData, exportOptions)
            filename = `${safeTitle}.json`
            mimeType = 'application/json'
            break
          case 'direction':
            content = exportSceneDirection(scriptData)
            filename = `${safeTitle}_scene_direction.txt`
            mimeType = 'text/plain'
            break
          default:
            throw new Error('Unknown format')
        }

        downloadExport(content, filename, mimeType)
        toast.success(`Script exported as ${format.toUpperCase()}`)
      } catch (err: any) {
        console.error('Export error:', err)
        toast.error('Failed to export script: ' + (err?.message || 'Unknown error'))
      } finally {
        setIsExporting(false)
      }
    },
    [visionPhase, projectTitle, hasScript, exportOptions]
  )

  const handleOpenPreview = useCallback(() => {
    if (!hasScript) {
      toast.error('No script to preview. Generate a script first.')
      return
    }
    setShowPreviewDialog(true)
  }, [hasScript])

  const handleExportWithOptions = useCallback(() => {
    setShowOptionsDialog(true)
  }, [])

  const handleConfirmExport = useCallback(() => {
    handleQuickExport(selectedFormat)
    setShowOptionsDialog(false)
  }, [selectedFormat, handleQuickExport])

  if (variant === 'icon') {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={!hasScript || isExporting}
              className={cn(
                'p-2 rounded-lg hover:bg-white/10 text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center',
                (!hasScript || isExporting) && 'opacity-50 cursor-not-allowed',
                className
              )}
              title={!hasScript ? 'Generate a script first to enable export' : 'Preview & Export Script'}
            >
              {isExporting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </button>
          </DropdownMenuTrigger>
          <ExportMenuContent
            onPreview={handleOpenPreview}
            onExport={handleQuickExport}
            onShowOptions={handleExportWithOptions}
          />
        </DropdownMenu>

        <ProductionScriptExportDialog
          open={showPreviewDialog}
          onOpenChange={setShowPreviewDialog}
          title={projectTitle}
          logline={visionPhase?.logline || visionPhase?.script?.logline}
          scenes={scenes}
          characters={characters}
          metadata={visionPhase}
        />
      </>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={variant === 'compact' ? 'sm' : 'default'}
            disabled={!hasScript || isExporting}
            className={cn('gap-2', className)}
            title={!hasScript ? 'Generate a script first to enable export' : undefined}
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {variant === 'compact' ? 'Script' : 'Export Script'}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <ExportMenuContent
          onPreview={handleOpenPreview}
          onExport={handleQuickExport}
          onShowOptions={handleExportWithOptions}
        />
      </DropdownMenu>

      <ProductionScriptExportDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        title={projectTitle}
        logline={visionPhase?.logline || visionPhase?.script?.logline}
        scenes={scenes}
        characters={characters}
        metadata={visionPhase}
      />

      {/* Export Options Dialog */}
      <Dialog open={showOptionsDialog} onOpenChange={setShowOptionsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Script Options</DialogTitle>
            <DialogDescription>Configure export settings for your script.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Format Selection */}
            <div className="space-y-2">
              <Label>Format</Label>
              <div className="grid grid-cols-2 gap-2">
                <FormatOption
                  value="fdx"
                  selected={selectedFormat === 'fdx'}
                  onSelect={setSelectedFormat}
                  icon={Film}
                  label="Final Draft (.fdx)"
                  description="Industry XML"
                />
                <FormatOption
                  value="fountain"
                  selected={selectedFormat === 'fountain'}
                  onSelect={setSelectedFormat}
                  icon={FileCode}
                  label="Fountain"
                  description="Screenplay markup"
                />
                <FormatOption
                  value="markdown"
                  selected={selectedFormat === 'markdown'}
                  onSelect={setSelectedFormat}
                  icon={FileSpreadsheet}
                  label="Markdown (.md)"
                  description="Readable docs"
                />
                <FormatOption
                  value="text"
                  selected={selectedFormat === 'text'}
                  onSelect={setSelectedFormat}
                  icon={FileText}
                  label="Plain Text"
                  description="Human readable"
                />
              </div>
            </div>

            <DropdownMenuSeparator />

            {/* Options */}
            <div className="space-y-3">
              <Label>Include Sections</Label>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeCharacterList"
                  checked={exportOptions.includeCharacterList}
                  onCheckedChange={checked =>
                    setExportOptions(prev => ({ ...prev, includeCharacterList: !!checked }))
                  }
                />
                <Label htmlFor="includeCharacterList" className="text-sm font-normal">
                  Characters &amp; wardrobe
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeChapters"
                  checked={exportOptions.includeChapters}
                  onCheckedChange={checked =>
                    setExportOptions(prev => ({ ...prev, includeChapters: !!checked }))
                  }
                />
                <Label htmlFor="includeChapters" className="text-sm font-normal">
                  Chapter descriptions
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeSceneDescriptions"
                  checked={exportOptions.includeSceneDescriptions}
                  onCheckedChange={checked =>
                    setExportOptions(prev => ({ ...prev, includeSceneDescriptions: !!checked }))
                  }
                />
                <Label htmlFor="includeSceneDescriptions" className="text-sm font-normal">
                  Scene descriptions
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeSceneDirection"
                  checked={exportOptions.includeSceneDirection}
                  onCheckedChange={checked =>
                    setExportOptions(prev => ({ ...prev, includeSceneDirection: !!checked }))
                  }
                />
                <Label htmlFor="includeSceneDirection" className="text-sm font-normal">
                  Scene direction
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeShotDirection"
                  checked={exportOptions.includeShotDirection}
                  onCheckedChange={checked =>
                    setExportOptions(prev => ({ ...prev, includeShotDirection: !!checked }))
                  }
                />
                <Label htmlFor="includeShotDirection" className="text-sm font-normal">
                  Shot direction
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeShotActionDialogue"
                  checked={exportOptions.includeShotActionDialogue}
                  onCheckedChange={checked =>
                    setExportOptions(prev => ({ ...prev, includeShotActionDialogue: !!checked }))
                  }
                />
                <Label htmlFor="includeShotActionDialogue" className="text-sm font-normal">
                  Shot dialogue &amp; action
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOptionsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Dropdown menu content
function ExportMenuContent({
  onPreview,
  onExport,
  onShowOptions,
}: {
  onPreview: () => void
  onExport: (format: string) => void
  onShowOptions: () => void
}) {
  return (
    <DropdownMenuContent align="end" className="w-60">
      <DropdownMenuItem onClick={onPreview}>
        <Eye className="w-4 h-4 mr-2 text-indigo-400" />
        <div className="flex-1">
          <div className="font-medium">Preview &amp; Export Script...</div>
          <div className="text-xs text-muted-foreground">Formatted preview &amp; all formats</div>
        </div>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onExport('fdx')}>
        <Film className="w-4 h-4 mr-2" />
        <div className="flex-1">
          <div className="font-medium">Final Draft (.fdx)</div>
          <div className="text-xs text-muted-foreground">Industry standard XML</div>
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onExport('fountain')}>
        <FileCode className="w-4 h-4 mr-2" />
        <div className="flex-1">
          <div className="font-medium">Fountain (.fountain)</div>
          <div className="text-xs text-muted-foreground">Open screenplay markup</div>
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onExport('markdown')}>
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        <div className="flex-1">
          <div className="font-medium">Markdown (.md)</div>
          <div className="text-xs text-muted-foreground">Structured production doc</div>
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onExport('text')}>
        <FileText className="w-4 h-4 mr-2" />
        <div className="flex-1">
          <div className="font-medium">Plain Text (.txt)</div>
          <div className="text-xs text-muted-foreground">Human readable format</div>
        </div>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onExport('json')}>
        <FileJson className="w-4 h-4 mr-2" />
        <div className="flex-1">
          <div className="font-medium">JSON (.json)</div>
          <div className="text-xs text-muted-foreground">Structured backup / data</div>
        </div>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={onShowOptions}>
        <Download className="w-4 h-4 mr-2" />
        <div className="font-medium">Export with options...</div>
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}

// Format selection option
function FormatOption({
  value,
  selected,
  onSelect,
  icon: Icon,
  label,
  description,
}: {
  value: string
  selected: boolean
  onSelect: (value: string) => void
  icon: React.ElementType
  label: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        'flex flex-col items-center justify-center p-3 rounded-lg border transition-colors',
        selected
          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
          : 'border-gray-700 hover:border-gray-600 text-gray-400 hover:text-gray-300'
      )}
    >
      <Icon className="w-5 h-5 mb-1" />
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs opacity-60">{description}</span>
      {selected && <Check className="w-3 h-3 mt-1" />}
    </button>
  )
}

export default ScriptExportButton
