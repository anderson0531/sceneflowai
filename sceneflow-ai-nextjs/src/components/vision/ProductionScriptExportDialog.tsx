'use client'

import React, { useMemo, useRef, useState } from 'react'
import { useReactToPrint } from 'react-to-print'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import {
  BookOpen,
  Camera,
  Check,
  Clapperboard,
  Code2,
  Copy,
  Download,
  Eye,
  FileCode,
  FileJson,
  FileSpreadsheet,
  FileText,
  Film,
  Layers,
  MessageSquare,
  Printer,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  buildProductionScriptData,
  DEFAULT_EXPORT_SCRIPT_OPTIONS,
  downloadExport,
  ExportScriptFormat,
  ExportScriptOptions,
  exportScriptByFormat,
  exportToText,
  formatDuration,
  ScriptData,
} from '@/lib/script/scriptExporter'
import { ScriptRenderer } from '@/components/reports/renderers/ScriptRenderer'
import { BlueprintBeatInput } from '@/lib/script/sceneDecomposition'

export interface ProductionScriptExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  logline?: string
  author?: string
  scenes: any[]
  characters?: any[]
  blueprintBeats?: BlueprintBeatInput[]
  metadata?: Record<string, any> | null
}

type PreviewTab = 'formatted' | 'fountain' | 'fdx' | 'markdown' | 'text' | 'json'

interface FormatOption {
  id: ExportScriptFormat
  label: string
  ext: string
  badge: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const EXPORT_FORMATS: FormatOption[] = [
  {
    id: 'fdx',
    label: 'Final Draft',
    ext: '.fdx',
    badge: 'Industry Standard',
    description: 'XML screenplay format for Final Draft, Fade In & Movie Magic',
    icon: Film,
  },
  {
    id: 'fountain',
    label: 'Fountain',
    ext: '.fountain',
    badge: 'Screenplay Markup',
    description: 'Universal plain-text screenplay format (Highland, WriterDuet, Slugline)',
    icon: FileCode,
  },
  {
    id: 'markdown',
    label: 'Markdown',
    ext: '.md',
    badge: 'Documentation',
    description: 'Formatted production script for Notion, Docs & team wikis',
    icon: FileSpreadsheet,
  },
  {
    id: 'text',
    label: 'Plain Text',
    ext: '.txt',
    badge: 'Universal',
    description: 'Clean readable production script with ASCII section dividers',
    icon: FileText,
  },
  {
    id: 'json',
    label: 'Structured JSON',
    ext: '.json',
    badge: 'Data Pipeline',
    description: 'Complete structured script, cast, chapter, scene & shot data',
    icon: FileJson,
  },
]

const SECTION_TOGGLES: Array<{
  key: keyof ExportScriptOptions
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  {
    key: 'includeCharacterList',
    label: 'Characters & Wardrobe',
    description: 'Cast bios, roles, physical descriptions & wardrobe continuity',
    icon: Users,
  },
  {
    key: 'includeChapters',
    label: 'Chapter Descriptions',
    description: 'Chapter headings, narrative synopses & estimated runtimes',
    icon: BookOpen,
  },
  {
    key: 'includeSceneDescriptions',
    label: 'Scene Descriptions',
    description: 'Scene overview, narrative summary & visual descriptions',
    icon: Layers,
  },
  {
    key: 'includeSceneDirection',
    label: 'Scene Direction',
    description: 'Location, atmosphere, camera, lighting, talent & audio notes',
    icon: Clapperboard,
  },
  {
    key: 'includeShotDirection',
    label: 'Shot Direction',
    description: 'Shot framing, camera movement, cast wardrobe, blocking & lighting',
    icon: Camera,
  },
  {
    key: 'includeShotActionDialogue',
    label: 'Shot Dialogue & Action',
    description: 'Shot action lines, spoken character dialogue, V.O. & parentheticals',
    icon: MessageSquare,
  },
]

export function ProductionScriptExportDialog({
  open,
  onOpenChange,
  title,
  logline,
  author,
  scenes,
  characters = [],
  blueprintBeats,
  metadata,
}: ProductionScriptExportDialogProps) {
  const [options, setOptions] = useState<ExportScriptOptions>({
    ...DEFAULT_EXPORT_SCRIPT_OPTIONS,
  })
  const [previewTab, setPreviewTab] = useState<PreviewTab>('formatted')
  const [copied, setCopied] = useState(false)
  const printComponentRef = useRef<HTMLDivElement>(null)

  const scriptData: ScriptData = useMemo(
    () =>
      buildProductionScriptData({
        script: author ? { metadata: { author } } : undefined,
        projectTitle: title || 'Untitled Project',
        projectLogline: logline,
        scenes: scenes || [],
        characters: characters || [],
        blueprintBeats,
        projectMetadata: metadata,
      }),
    [title, logline, author, scenes, characters, blueprintBeats, metadata]
  )

  const totalShots = scriptData.metadata?.totalShots || 0
  const totalDurationSeconds = scriptData.metadata?.totalDuration || 0

  const rawSourcePreview = useMemo(() => {
    if (previewTab === 'formatted') return ''
    return exportScriptByFormat(scriptData, previewTab as ExportScriptFormat, options).content
  }, [scriptData, previewTab, options])

  const handlePrintPdf = useReactToPrint({
    contentRef: printComponentRef,
    documentTitle: `${(scriptData.title || 'Production_Script').replace(/\s+/g, '_')}_Production_Script`,
  })

  const handleDownloadFormat = (format: ExportScriptFormat) => {
    try {
      const { content, filename, mimeType } = exportScriptByFormat(scriptData, format, options)
      downloadExport(content, filename, mimeType)
      const fmtMeta = EXPORT_FORMATS.find(f => f.id === format)
      toast.success(`Exported ${fmtMeta?.label || format.toUpperCase()} (${fmtMeta?.ext || ''})`)
    } catch (err) {
      console.error('[ProductionScriptExportDialog] Export error:', err)
      toast.error('Failed to export script')
    }
  }

  const handleCopy = async () => {
    try {
      const contentToCopy =
        previewTab === 'formatted'
          ? exportToText(scriptData, options)
          : exportScriptByFormat(scriptData, previewTab as ExportScriptFormat, options).content
      await navigator.clipboard.writeText(contentToCopy)
      setCopied(true)
      toast.success('Script copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy script to clipboard')
    }
  }

  const toggleOption = (key: keyof ExportScriptOptions) => {
    setOptions(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const applyPreset = (preset: 'full' | 'screenplay' | 'director') => {
    if (preset === 'full') {
      setOptions(prev => ({
        ...prev,
        includeCharacterList: true,
        includeChapters: true,
        includeSceneDescriptions: true,
        includeSceneDirection: true,
        includeShotDirection: true,
        includeShotActionDialogue: true,
      }))
    } else if (preset === 'screenplay') {
      setOptions(prev => ({
        ...prev,
        includeCharacterList: true,
        includeChapters: true,
        includeSceneDescriptions: true,
        includeSceneDirection: false,
        includeShotDirection: false,
        includeShotActionDialogue: true,
      }))
    } else if (preset === 'director') {
      setOptions(prev => ({
        ...prev,
        includeCharacterList: true,
        includeChapters: true,
        includeSceneDescriptions: true,
        includeSceneDirection: true,
        includeShotDirection: true,
        includeShotActionDialogue: false,
      }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[96vw] h-[92vh] flex flex-col p-0 gap-0 bg-zinc-950 border-zinc-800 text-zinc-100 overflow-hidden">
        {/* Top Header */}
        <DialogHeader className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold text-white truncate">
                  Production Script Preview &amp; Export
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400 flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="font-medium text-zinc-300 truncate max-w-[260px]">
                    {scriptData.title}
                  </span>
                  <span>•</span>
                  <span>{scriptData.characters?.length || 0} Characters</span>
                  {scriptData.chapters && scriptData.chapters.length > 0 && (
                    <>
                      <span>•</span>
                      <span>{scriptData.chapters.length} Chapters</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{scriptData.scenes.length} Scenes</span>
                  <span>•</span>
                  <span>{totalShots} Shots</span>
                  {totalDurationSeconds > 0 && (
                    <>
                      <span>•</span>
                      <span>Est. {formatDuration(totalDurationSeconds)}</span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 h-8 text-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copy Script
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePrintPdf()}
                className="border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 h-8 text-xs"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                Print / Save PDF
              </Button>

              <Button
                size="sm"
                onClick={() => handleDownloadFormat('fdx')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white h-8 text-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export .FDX
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-zinc-400 hover:text-white h-8 w-8 p-0 ml-1"
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Main Workspace Body */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* Left Control Sidebar: Content Toggles + Industry Format Exports */}
          <aside className="w-full lg:w-80 xl:w-88 border-b lg:border-b-0 lg:border-r border-zinc-800/80 bg-zinc-900/40 flex flex-col overflow-y-auto shrink-0">
            {/* Section Inclusion Toggles */}
            <div className="p-4 border-b border-zinc-800/80">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Script Sections</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => applyPreset('full')}
                    className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                    title="Include all production & shot details"
                  >
                    Full
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('screenplay')}
                    className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                    title="Classic screenplay (dialogue & action only)"
                  >
                    Screenplay
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('director')}
                    className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                    title="Director breakdown (scene & shot direction)"
                  >
                    Director
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {SECTION_TOGGLES.map(item => {
                  const Icon = item.icon
                  const checked = Boolean(options[item.key])
                  return (
                    <label
                      key={item.key}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        checked
                          ? 'bg-indigo-950/35 border-indigo-500/45 !text-zinc-100'
                          : 'bg-zinc-900/50 border-zinc-800 !text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOption(item.key)}
                        className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-600 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold leading-tight">
                          <Icon
                            className={`w-3.5 h-3.5 shrink-0 ${
                              checked ? '!text-indigo-400' : '!text-zinc-500'
                            }`}
                          />
                          <span className={checked ? '!text-white' : '!text-zinc-300'}>
                            {item.label}
                          </span>
                        </div>
                        <p className="text-[11px] !text-zinc-400 leading-snug mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Industry Standard Export Formats */}
            <div className="p-4 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider !text-zinc-300 mb-3">
                <Sparkles className="w-3.5 h-3.5 !text-amber-400" />
                <span className="!text-zinc-200">Industry Standard Formats</span>
              </div>

              <div className="space-y-2">
                {/* PDF / Print Option */}
                <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Printer className="w-4 h-4 !text-indigo-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold !text-white">
                            PDF Production Script
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 !text-indigo-300 border border-indigo-500/30">
                            .pdf
                          </span>
                        </div>
                        <p className="text-[11px] !text-zinc-400 truncate">
                          Formatted screenplay &amp; shot breakdown for print/PDF
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrintPdf()}
                      className="h-7 px-2.5 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700 !text-zinc-100 shrink-0"
                    >
                      Print / PDF
                    </Button>
                  </div>
                </div>

                {/* File Downloads */}
                {EXPORT_FORMATS.map(fmt => {
                  const Icon = fmt.icon
                  const isPreviewing = previewTab === fmt.id
                  return (
                    <div
                      key={fmt.id}
                      className={`p-2.5 rounded-lg border transition-colors ${
                        isPreviewing
                          ? 'border-indigo-500/60 bg-indigo-950/30'
                          : 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="w-4 h-4 !text-indigo-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold !text-white">
                                {fmt.label}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 !text-zinc-300 border border-zinc-700">
                                {fmt.ext}
                              </span>
                            </div>
                            <p className="text-[11px] !text-zinc-400 leading-snug mt-0.5">
                              {fmt.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setPreviewTab(
                                isPreviewing ? 'formatted' : (fmt.id as PreviewTab)
                              )
                            }
                            className={`h-7 px-2 text-[11px] ${
                              isPreviewing
                                ? '!text-indigo-300 bg-indigo-500/20'
                                : '!text-zinc-400 hover:!text-zinc-200'
                            }`}
                            title={`Preview ${fmt.label} source`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadFormat(fmt.id)}
                            className="h-7 px-2.5 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700 !text-zinc-100"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Export
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </aside>

          {/* Right Preview Area */}
          <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-zinc-950">
            {/* Preview Mode Switcher Bar */}
            <div className="px-4 py-2.5 border-b border-zinc-800/80 bg-zinc-900/60 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setPreviewTab('formatted')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    previewTab === 'formatted'
                      ? 'bg-indigo-600 !text-white shadow-sm'
                      : '!text-zinc-400 hover:!text-zinc-100 hover:bg-zinc-800/60'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className={previewTab === 'formatted' ? '!text-white' : '!text-zinc-300'}>
                    Formatted Preview
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTab('fountain')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    previewTab === 'fountain'
                      ? 'bg-indigo-600 !text-white shadow-sm'
                      : '!text-zinc-400 hover:!text-zinc-100 hover:bg-zinc-800/60'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span className={previewTab === 'fountain' ? '!text-white' : '!text-zinc-300'}>
                    Fountain (.fountain)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTab('fdx')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    previewTab === 'fdx'
                      ? 'bg-indigo-600 !text-white shadow-sm'
                      : '!text-zinc-400 hover:!text-zinc-100 hover:bg-zinc-800/60'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span className={previewTab === 'fdx' ? '!text-white' : '!text-zinc-300'}>
                    Final Draft (.fdx)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTab('markdown')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    previewTab === 'markdown'
                      ? 'bg-indigo-600 !text-white shadow-sm'
                      : '!text-zinc-400 hover:!text-zinc-100 hover:bg-zinc-800/60'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className={previewTab === 'markdown' ? '!text-white' : '!text-zinc-300'}>
                    Markdown (.md)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTab('text')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    previewTab === 'text'
                      ? 'bg-indigo-600 !text-white shadow-sm'
                      : '!text-zinc-400 hover:!text-zinc-100 hover:bg-zinc-800/60'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className={previewTab === 'text' ? '!text-white' : '!text-zinc-300'}>
                    Plain Text (.txt)
                  </span>
                </button>
              </div>

              {previewTab !== 'formatted' && (
                <Button
                  size="sm"
                  onClick={() => handleDownloadFormat(previewTab as ExportScriptFormat)}
                  className="h-7 px-3 text-xs bg-indigo-600 hover:bg-indigo-500 !text-white"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Download .
                  {previewTab === 'markdown'
                    ? 'md'
                    : previewTab === 'text'
                    ? 'txt'
                    : previewTab}
                </Button>
              )}
            </div>

            {/* Scrollable Preview Viewport */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-900/70">
              {previewTab === 'formatted' ? (
                <div className="max-w-4xl mx-auto shadow-2xl rounded-md overflow-hidden border border-zinc-300 bg-white">
                  <ScriptRenderer
                    ref={printComponentRef}
                    data={scriptData}
                    options={options}
                  />
                </div>
              ) : (
                <div className="max-w-4xl mx-auto rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden">
                  <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-xs !text-zinc-300">
                    <span className="font-mono !text-zinc-300">
                      {scriptData.title.replace(/\s+/g, '_')}_script.
                      {previewTab === 'markdown'
                        ? 'md'
                        : previewTab === 'text'
                        ? 'txt'
                        : previewTab}
                    </span>
                    <span className="!text-zinc-400">{rawSourcePreview.split('\n').length} lines</span>
                  </div>
                  <pre className="p-5 text-xs font-mono !text-zinc-100 bg-zinc-950 whitespace-pre-wrap break-words leading-relaxed overflow-x-auto">
                    {rawSourcePreview}
                  </pre>
                </div>
              )}
            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ProductionScriptExportDialog
