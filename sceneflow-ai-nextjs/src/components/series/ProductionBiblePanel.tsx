'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Upload,
  Download,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Users,
  MapPin,
  Palette,
  Eye,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import { useProductionBible } from '@/hooks/useSeries'
import type { BibleSyncDiff, SeriesCharacterResponse, SeriesLocationResponse } from '@/types/series'
import { toast } from 'sonner'

interface ProductionBiblePanelProps {
  seriesId: string | null
  projectId: string
  seriesTitle?: string
  bibleVersion?: string
  lastSynced?: string
  onSyncComplete?: () => void
}

export function ProductionBiblePanel({
  seriesId,
  projectId,
  seriesTitle,
  bibleVersion,
  lastSynced,
  onSyncComplete
}: ProductionBiblePanelProps) {
  const {
    isSyncing,
    pendingDiff,
    error,
    previewSync,
    pushToBible,
    pullFromBible,
    clearPendingDiff
  } = useProductionBible(seriesId)

  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedFields, setSelectedFields] = useState<string[]>(['characters', 'locations', 'aesthetic'])
  const [syncDirection, setSyncDirection] = useState<'push' | 'pull' | null>(null)
  const [showDiffPreview, setShowDiffPreview] = useState(false)

  if (!seriesId) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
        <div className="flex items-center gap-3 text-gray-500">
          <BookOpen className="w-5 h-5" />
          <div>
            <p className="text-sm font-medium">Production Bible</p>
            <p className="text-xs">This project is not part of a series</p>
          </div>
        </div>
      </div>
    )
  }

  const handlePreviewPush = async () => {
    setSyncDirection('push')
    try {
      await previewSync({
        projectId,
        syncFields: selectedFields as any[],
        preview: true
      })
      setShowDiffPreview(true)
    } catch (err) {
      toast.error('Failed to preview changes')
    }
  }

  const handleConfirmPush = async () => {
    try {
      const result = await pushToBible({
        projectId,
        syncFields: selectedFields as any[],
        preview: false,
        mergeStrategy: 'merge'
      })
      toast.success(`Saved to Series Bible v${result.newVersion}`)
      setShowDiffPreview(false)
      onSyncComplete?.()
    } catch (err) {
      toast.error('Failed to save to bible')
    }
  }

  const handlePull = async () => {
    setSyncDirection('pull')
    try {
      const result = await pullFromBible(projectId, selectedFields)
      toast.success(`Synced from Series Bible v${result.bibleVersion}`)
      onSyncComplete?.()
    } catch (err) {
      toast.error('Failed to pull from bible')
    }
  }

  const toggleField = (field: string) => {
    setSelectedFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    )
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-amber-500/30 to-orange-600/30 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-white">Production Bible</p>
            <p className="text-xs text-gray-500">
              {seriesTitle || 'Series'} • v{bibleVersion || '1.0.0'}
              {lastSynced && ` • Synced ${new Date(lastSynced).toLocaleDateString()}`}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-700"
          >
            <div className="p-4 space-y-4">
              {/* Sync Fields Selection */}
              <div>
                <label className="text-xs font-medium text-gray-400 mb-2 block">
                  Sync Fields
                </label>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <Checkbox
                      checked={selectedFields.includes('characters')}
                      onCheckedChange={() => toggleField('characters')}
                    />
                    <Users className="w-4 h-4 text-blue-400" />
                    Characters
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <Checkbox
                      checked={selectedFields.includes('locations')}
                      onCheckedChange={() => toggleField('locations')}
                    />
                    <MapPin className="w-4 h-4 text-green-400" />
                    Locations
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <Checkbox
                      checked={selectedFields.includes('aesthetic')}
                      onCheckedChange={() => toggleField('aesthetic')}
                    />
                    <Palette className="w-4 h-4 text-purple-400" />
                    Visual Style
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviewPush}
                  disabled={isSyncing || selectedFields.length === 0}
                  className="flex-1 border-amber-600/50 text-amber-400 hover:bg-amber-600/20"
                >
                  {isSyncing && syncDirection === 'push' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Save to Bible
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePull}
                  disabled={isSyncing || selectedFields.length === 0}
                  className="flex-1 border-blue-600/50 text-blue-400 hover:bg-blue-600/20"
                >
                  {isSyncing && syncDirection === 'pull' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Load from Bible
                </Button>
              </div>

              {/* Info Text */}
              <p className="text-xs text-gray-500">
                <strong>Save:</strong> Push project changes to the Series Bible (with diff preview).
                <br />
                <strong>Load:</strong> Pull latest Bible data into this project.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Diff Preview Dialog */}
      {showDiffPreview && pendingDiff && (
        <DiffPreviewDialog
          diff={pendingDiff}
          onConfirm={handleConfirmPush}
          onCancel={() => {
            setShowDiffPreview(false)
            clearPendingDiff()
          }}
          isSubmitting={isSyncing}
        />
      )}
    </div>
  )
}

interface DiffPreviewDialogProps {
  diff: BibleSyncDiff
  onConfirm: () => void
  onCancel: () => void
  isSubmitting: boolean
}

function DiffPreviewDialog({ diff, onConfirm, onCancel, isSubmitting }: DiffPreviewDialogProps) {
  const hasChanges =
    diff.characters.added.length > 0 ||
    diff.characters.updated.length > 0 ||
    diff.characters.removed.length > 0 ||
    diff.locations.added.length > 0 ||
    diff.locations.updated.length > 0 ||
    diff.locations.removed.length > 0

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-xl border border-gray-700 max-w-lg w-full max-h-[80vh] overflow-hidden"
      >
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-semibold text-white">Review Changes</h3>
              <p className="text-xs text-gray-500">These changes will be saved to the Series Bible</p>
            </div>
          </div>
        </div>

        <div className="p-4 max-h-[50vh] overflow-y-auto space-y-4">
          {/* Characters Changes */}
          {(diff.characters.added.length > 0 || diff.characters.updated.length > 0) && (
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Characters
              </h4>
              {diff.characters.added.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs text-green-400">+ Adding {diff.characters.added.length} character(s)</span>
                  <div className="mt-1 space-y-1">
                    {diff.characters.added.slice(0, 3).map((char) => (
                      <div key={char.id} className="text-xs text-gray-300 pl-4">
                        • {char.name} ({char.role})
                      </div>
                    ))}
                    {diff.characters.added.length > 3 && (
                      <div className="text-xs text-gray-500 pl-4">
                        ...and {diff.characters.added.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}
              {diff.characters.updated.length > 0 && (
                <div>
                  <span className="text-xs text-blue-400">~ Updating {diff.characters.updated.length} character(s)</span>
                  <div className="mt-1 space-y-1">
                    {diff.characters.updated.slice(0, 3).map((update) => (
                      <div key={update.id} className="text-xs text-gray-300 pl-4">
                        • {update.id}: {update.fields.join(', ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Locations Changes */}
          {(diff.locations.added.length > 0 || diff.locations.updated.length > 0) && (
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Locations
              </h4>
              {diff.locations.added.length > 0 && (
                <div>
                  <span className="text-xs text-green-400">+ Adding {diff.locations.added.length} location(s)</span>
                  <div className="mt-1 space-y-1">
                    {diff.locations.added.slice(0, 3).map((loc) => (
                      <div key={loc.id} className="text-xs text-gray-300 pl-4">
                        • {loc.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aesthetic Changes */}
          {diff.aesthetic.after && Object.keys(diff.aesthetic.after).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Visual Style
              </h4>
              <span className="text-xs text-blue-400">~ Updating aesthetic settings</span>
            </div>
          )}

          {/* No Changes */}
          {!hasChanges && (
            <div className="text-center py-4">
              <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No changes to sync</p>
              <p className="text-xs text-gray-500">Your project is up to date with the Series Bible</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 border-gray-600"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!hasChanges || isSubmitting}
            className="flex-1 bg-amber-600 hover:bg-amber-700"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Confirm & Save
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

export default ProductionBiblePanel
