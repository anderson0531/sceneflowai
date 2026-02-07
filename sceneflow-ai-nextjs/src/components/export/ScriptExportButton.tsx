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
  FileText, 
  FileCode, 
  FileJson,
  Film,
  ChevronDown,
  Loader2,
  Check
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  exportToFountain,
  exportToText,
  exportToJSON,
  exportSceneDirection,
  visionPhaseToScriptData,
  downloadExport,
  ExportScriptOptions
} from '@/lib/script/scriptExporter'

interface ScriptExportButtonProps {
  projectId: string
  projectTitle?: string
  visionPhase: any
  variant?: 'default' | 'compact' | 'icon'
  className?: string
}

/**
 * Script Export Button with dropdown for format selection
 * 
 * Exports scripts to Fountain (industry standard), plain text, 
 * JSON (for backup), and scene direction notes.
 */
export function ScriptExportButton({
  projectId,
  projectTitle = 'Untitled Script',
  visionPhase,
  variant = 'default',
  className,
}: ScriptExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [showOptionsDialog, setShowOptionsDialog] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<string>('fountain')
  const [exportOptions, setExportOptions] = useState<Partial<ExportScriptOptions>>({
    includeTitle: true,
    includeSceneNumbers: true,
    includeCharacterList: false,
    includeNotes: false,
    includeDurations: false,
  })

  const hasScript = visionPhase?.script?.scenes?.length > 0 || visionPhase?.scenes?.length > 0

  const handleQuickExport = useCallback(async (format: string) => {
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
        case 'fountain':
          content = exportToFountain(scriptData, exportOptions)
          filename = `${safeTitle}.fountain`
          mimeType = 'text/plain'
          break
        case 'text':
          content = exportToText(scriptData, exportOptions)
          filename = `${safeTitle}.txt`
          mimeType = 'text/plain'
          break
        case 'json':
          content = exportToJSON(scriptData)
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
  }, [visionPhase, projectTitle, hasScript, exportOptions])

  const handleExportWithOptions = useCallback(() => {
    setShowOptionsDialog(true)
  }, [])

  const handleConfirmExport = useCallback(() => {
    handleQuickExport(selectedFormat)
    setShowOptionsDialog(false)
  }, [selectedFormat, handleQuickExport])

  if (variant === 'icon') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={!hasScript || isExporting}
            className={cn(
              'p-2 rounded-lg hover:bg-white/10 text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center',
              (!hasScript || isExporting) && 'opacity-50 cursor-not-allowed',
              className
            )}
            title={!hasScript ? 'Generate a script first to enable export' : 'Export Script'}
          >
            {isExporting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
          </button>
        </DropdownMenuTrigger>
        <ExportMenuContent onExport={handleQuickExport} onShowOptions={handleExportWithOptions} />
      </DropdownMenu>
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
            {variant === 'compact' ? 'Export' : 'Export Script'}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <ExportMenuContent onExport={handleQuickExport} onShowOptions={handleExportWithOptions} />
      </DropdownMenu>

      {/* Export Options Dialog */}
      <Dialog open={showOptionsDialog} onOpenChange={setShowOptionsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Script Options</DialogTitle>
            <DialogDescription>
              Configure export settings for your script.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Format Selection */}
            <div className="space-y-2">
              <Label>Format</Label>
              <div className="grid grid-cols-2 gap-2">
                <FormatOption
                  value="fountain"
                  selected={selectedFormat === 'fountain'}
                  onSelect={setSelectedFormat}
                  icon={FileCode}
                  label="Fountain"
                  description="Industry standard"
                />
                <FormatOption
                  value="text"
                  selected={selectedFormat === 'text'}
                  onSelect={setSelectedFormat}
                  icon={FileText}
                  label="Plain Text"
                  description="Human readable"
                />
                <FormatOption
                  value="json"
                  selected={selectedFormat === 'json'}
                  onSelect={setSelectedFormat}
                  icon={FileJson}
                  label="JSON"
                  description="For backup"
                />
                <FormatOption
                  value="direction"
                  selected={selectedFormat === 'direction'}
                  onSelect={setSelectedFormat}
                  icon={Film}
                  label="Scene Direction"
                  description="Production notes"
                />
              </div>
            </div>

            <DropdownMenuSeparator />

            {/* Options */}
            <div className="space-y-3">
              <Label>Include</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeTitle"
                  checked={exportOptions.includeTitle}
                  onCheckedChange={(checked) => 
                    setExportOptions(prev => ({ ...prev, includeTitle: !!checked }))
                  }
                />
                <Label htmlFor="includeTitle" className="text-sm font-normal">Title page</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeSceneNumbers"
                  checked={exportOptions.includeSceneNumbers}
                  onCheckedChange={(checked) => 
                    setExportOptions(prev => ({ ...prev, includeSceneNumbers: !!checked }))
                  }
                />
                <Label htmlFor="includeSceneNumbers" className="text-sm font-normal">Scene numbers</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeCharacterList"
                  checked={exportOptions.includeCharacterList}
                  onCheckedChange={(checked) => 
                    setExportOptions(prev => ({ ...prev, includeCharacterList: !!checked }))
                  }
                />
                <Label htmlFor="includeCharacterList" className="text-sm font-normal">Character list</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeNotes"
                  checked={exportOptions.includeNotes}
                  onCheckedChange={(checked) => 
                    setExportOptions(prev => ({ ...prev, includeNotes: !!checked }))
                  }
                />
                <Label htmlFor="includeNotes" className="text-sm font-normal">Visual/Audio notes</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeDurations"
                  checked={exportOptions.includeDurations}
                  onCheckedChange={(checked) => 
                    setExportOptions(prev => ({ ...prev, includeDurations: !!checked }))
                  }
                />
                <Label htmlFor="includeDurations" className="text-sm font-normal">Scene durations</Label>
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
  onExport, 
  onShowOptions 
}: { 
  onExport: (format: string) => void
  onShowOptions: () => void 
}) {
  return (
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuItem onClick={() => onExport('fountain')}>
        <FileCode className="w-4 h-4 mr-2" />
        <div className="flex-1">
          <div className="font-medium">Fountain</div>
          <div className="text-xs text-muted-foreground">Industry standard screenplay</div>
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onExport('text')}>
        <FileText className="w-4 h-4 mr-2" />
        <div className="flex-1">
          <div className="font-medium">Plain Text</div>
          <div className="text-xs text-muted-foreground">Human readable format</div>
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onExport('direction')}>
        <Film className="w-4 h-4 mr-2" />
        <div className="flex-1">
          <div className="font-medium">Scene Direction</div>
          <div className="text-xs text-muted-foreground">Production notes only</div>
        </div>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onExport('json')}>
        <FileJson className="w-4 h-4 mr-2" />
        <div className="flex-1">
          <div className="font-medium">JSON</div>
          <div className="text-xs text-muted-foreground">Backup / transfer</div>
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
