'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HardDrive,
  Archive,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  ChevronRight,
  Video,
  Music,
  Image as ImageIcon,
  FileText,
  TrendingUp,
  Download,
} from 'lucide-react'
import { STORAGE_ADDONS, CREDIT_EXCHANGE_RATE } from '@/lib/credits/creditCosts'
import { STORAGE_LIMITS, type SubscriptionTier } from '@/lib/credits/guardrails'

// =============================================================================
// TYPES
// =============================================================================

interface StorageBreakdown {
  totalBytes: number
  usedBytes: number
  availableBytes: number
  usagePercent: number
  byType: {
    video: number
    audio: number
    image: number
    other: number
  }
  byStorageClass: {
    standard: number
    nearline: number
    coldline: number
    archive: number
  }
  addons: {
    id: string
    sizeBytes: number
    price: number
  }[]
  warnings: string[]
}

interface StorageFile {
  id: string
  name: string
  path: string
  sizeBytes: number
  type: 'video' | 'audio' | 'image' | 'other'
  createdAt: Date
  lastAccessedAt: Date
  storageClass: 'STANDARD' | 'NEARLINE' | 'COLDLINE'
  projectId?: string
  projectName?: string
}

interface StorageManagerProps {
  userId: string
  tier: SubscriptionTier
  availableCredits: number
  onCreditsSpent?: (amount: number) => void
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function getFileIcon(type: string) {
  switch (type) {
    case 'video':
      return Video
    case 'audio':
      return Music
    case 'image':
      return ImageIcon
    default:
      return FileText
  }
}

function getStorageClassColor(storageClass: string) {
  switch (storageClass) {
    case 'STANDARD':
      return 'text-green-400 bg-green-500/10'
    case 'NEARLINE':
      return 'text-amber-400 bg-amber-500/10'
    case 'COLDLINE':
      return 'text-blue-400 bg-blue-500/10'
    default:
      return 'text-gray-400 bg-gray-500/10'
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function StorageManager({
  userId,
  tier,
  availableCredits,
  onCreditsSpent,
}: StorageManagerProps) {
  const [breakdown, setBreakdown] = useState<StorageBreakdown | null>(null)
  const [files, setFiles] = useState<StorageFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showAddons, setShowAddons] = useState(false)
  const [restoreProgress, setRestoreProgress] = useState<Map<string, number>>(new Map())

  // Fetch storage data
  const fetchStorageData = useCallback(async () => {
    setLoading(true)
    try {
      const [breakdownRes, filesRes] = await Promise.all([
        fetch(`/api/storage/breakdown?userId=${userId}`),
        fetch(`/api/storage/files?userId=${userId}`),
      ])

      if (breakdownRes.ok) {
        const data = await breakdownRes.json()
        setBreakdown(data)
      }

      if (filesRes.ok) {
        const data = await filesRes.json()
        setFiles(data.files || [])
      }
    } catch (error) {
      console.error('Failed to fetch storage data:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchStorageData()
  }, [fetchStorageData])

  // Toggle file selection
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(fileId)) {
        next.delete(fileId)
      } else {
        next.add(fileId)
      }
      return next
    })
  }

  // Select all files
  const selectAllFiles = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(files.map((f) => f.id)))
    }
  }

  // Archive selected files
  const handleArchive = async () => {
    if (selectedFiles.size === 0) return
    setActionLoading('archive')

    try {
      const res = await fetch('/api/storage/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          fileIds: Array.from(selectedFiles),
        }),
      })

      if (res.ok) {
        await fetchStorageData()
        setSelectedFiles(new Set())
      }
    } catch (error) {
      console.error('Archive failed:', error)
    } finally {
      setActionLoading(null)
    }
  }

  // Delete selected files
  const handleDelete = async () => {
    if (selectedFiles.size === 0) return
    if (!confirm(`Delete ${selectedFiles.size} files? This cannot be undone.`)) return
    setActionLoading('delete')

    try {
      const res = await fetch('/api/storage/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          fileIds: Array.from(selectedFiles),
        }),
      })

      if (res.ok) {
        await fetchStorageData()
        setSelectedFiles(new Set())
      }
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setActionLoading(null)
    }
  }

  // Restore files from archive
  const handleRestore = async () => {
    const archivedFiles = files.filter(
      (f) => selectedFiles.has(f.id) && f.storageClass !== 'STANDARD'
    )
    if (archivedFiles.length === 0) return

    const creditsCost = STORAGE_LIMITS.RESTORE_CREDITS * archivedFiles.length
    if (availableCredits < creditsCost) {
      alert(`Insufficient credits. Need ${creditsCost}, have ${availableCredits}.`)
      return
    }

    if (!confirm(`Restore ${archivedFiles.length} files for ${creditsCost} credits?`)) return
    setActionLoading('restore')

    try {
      const res = await fetch('/api/storage/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          fileIds: archivedFiles.map((f) => f.id),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        onCreditsSpent?.(data.creditsCost)

        // Start polling for restore progress
        const progressMap = new Map<string, number>()
        archivedFiles.forEach((f) => progressMap.set(f.id, 0))
        setRestoreProgress(progressMap)

        // Poll for progress
        const pollProgress = async () => {
          const progressRes = await fetch('/api/storage/restore-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              fileIds: archivedFiles.map((f) => f.id),
            }),
          })

          if (progressRes.ok) {
            const progressData = await progressRes.json()
            const newProgress = new Map<string, number>()
            progressData.forEach((p: { fileId: string; progress: number }) => {
              newProgress.set(p.fileId, p.progress)
            })
            setRestoreProgress(newProgress)

            // If not all complete, poll again
            const allComplete = progressData.every((p: { progress: number }) => p.progress >= 100)
            if (!allComplete) {
              setTimeout(pollProgress, 5000)
            } else {
              await fetchStorageData()
              setRestoreProgress(new Map())
            }
          }
        }

        pollProgress()
        setSelectedFiles(new Set())
      }
    } catch (error) {
      console.error('Restore failed:', error)
    } finally {
      setActionLoading(null)
    }
  }

  // Purchase storage addon
  const handlePurchaseAddon = async (addonId: keyof typeof STORAGE_ADDONS) => {
    setActionLoading(`addon-${addonId}`)

    try {
      const res = await fetch('/api/subscription/purchase-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, addonId }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl
        }
      }
    } catch (error) {
      console.error('Addon purchase failed:', error)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    )
  }

  const usagePercent = breakdown?.usagePercent || 0
  const usageColor =
    usagePercent >= 0.95
      ? 'bg-red-500'
      : usagePercent >= 0.8
        ? 'bg-amber-500'
        : 'bg-cyan-500'

  return (
    <div className="space-y-6">
      {/* Storage Overview */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
              <HardDrive className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Storage</h2>
              <p className="text-sm text-gray-400">
                {formatBytes(breakdown?.usedBytes || 0)} of{' '}
                {formatBytes(breakdown?.totalBytes || 0)} used
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddons(!showAddons)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium hover:bg-cyan-500/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Storage
          </button>
        </div>

        {/* Usage Bar */}
        <div className="mb-4">
          <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(usagePercent * 100, 100)}%` }}
              className={`h-full ${usageColor} transition-colors`}
            />
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-gray-400">
              {(usagePercent * 100).toFixed(1)}% used
            </span>
            <span className="text-gray-400">
              {formatBytes(breakdown?.availableBytes || 0)} available
            </span>
          </div>
        </div>

        {/* Warnings */}
        {breakdown?.warnings && breakdown.warnings.length > 0 && (
          <div className="space-y-2">
            {breakdown.warnings.map((warning, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg"
              >
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <span className="text-sm text-amber-200">{warning}</span>
              </div>
            ))}
          </div>
        )}

        {/* Storage by Type */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'video', label: 'Video', icon: Video, color: 'text-purple-400' },
            { key: 'audio', label: 'Audio', icon: Music, color: 'text-green-400' },
            { key: 'image', label: 'Images', icon: ImageIcon, color: 'text-blue-400' },
            { key: 'other', label: 'Other', icon: FileText, color: 'text-gray-400' },
          ].map((item) => {
            const Icon = item.icon
            const bytes = breakdown?.byType[item.key as keyof typeof breakdown.byType] || 0
            return (
              <div
                key={item.key}
                className="p-4 bg-slate-700/30 rounded-lg text-center"
              >
                <Icon className={`w-6 h-6 mx-auto mb-2 ${item.color}`} />
                <div className="text-white font-medium">{formatBytes(bytes)}</div>
                <div className="text-gray-500 text-sm">{item.label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Storage Addons */}
      <AnimatePresence>
        {showAddons && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50"
          >
            <h3 className="text-lg font-semibold text-white mb-4">
              Storage Addons
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(STORAGE_ADDONS).map(([id, addon]) => (
                <div
                  key={id}
                  className="p-4 bg-slate-700/30 rounded-xl border border-slate-600/30 hover:border-cyan-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-white">
                      +{addon.sizeGB}GB
                    </span>
                    <span className="text-cyan-400 font-semibold">
                      ${addon.price}/mo
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">{addon.name}</p>
                  <button
                    onClick={() => handlePurchaseAddon(id as keyof typeof STORAGE_ADDONS)}
                    disabled={actionLoading === `addon-${id}`}
                    className="w-full py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 rounded-lg text-white text-sm font-medium transition-colors"
                  >
                    {actionLoading === `addon-${id}` ? (
                      <RefreshCw className="w-4 h-4 mx-auto animate-spin" />
                    ) : (
                      'Add to Subscription'
                    )}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Management */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50">
        {/* Actions Bar */}
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFiles.size === files.length && files.length > 0}
                onChange={selectAllFiles}
                className="w-4 h-4 rounded border-slate-600 text-cyan-500"
              />
              <span className="text-sm text-gray-400">
                {selectedFiles.size > 0
                  ? `${selectedFiles.size} selected`
                  : 'Select all'}
              </span>
            </label>
          </div>

          {selectedFiles.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleArchive}
                disabled={actionLoading === 'archive'}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-sm hover:bg-amber-500/30 transition-colors disabled:opacity-50"
              >
                <Archive className="w-4 h-4" />
                Archive
              </button>
              <button
                onClick={handleRestore}
                disabled={actionLoading === 'restore'}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Restore
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading === 'delete'}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Files List */}
        <div className="divide-y divide-slate-700/30">
          {files.length === 0 ? (
            <div className="p-12 text-center">
              <HardDrive className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No files in storage</p>
            </div>
          ) : (
            files.map((file) => {
              const Icon = getFileIcon(file.type)
              const isSelected = selectedFiles.has(file.id)
              const isRestoring = restoreProgress.has(file.id)
              const progress = restoreProgress.get(file.id) || 0

              return (
                <div
                  key={file.id}
                  className={`p-4 flex items-center gap-4 hover:bg-slate-700/20 transition-colors ${
                    isSelected ? 'bg-cyan-500/5' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleFileSelection(file.id)}
                    className="w-4 h-4 rounded border-slate-600 text-cyan-500"
                  />

                  <div className="p-2 bg-slate-700/50 rounded-lg">
                    <Icon className="w-5 h-5 text-gray-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium truncate">
                        {file.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${getStorageClassColor(
                          file.storageClass
                        )}`}
                      >
                        {file.storageClass}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{formatBytes(file.sizeBytes)}</span>
                      <span>{file.projectName || 'No project'}</span>
                      <span>Last accessed {formatDate(file.lastAccessedAt)}</span>
                    </div>

                    {/* Restore Progress */}
                    {isRestoring && progress < 100 && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 text-sm text-cyan-400">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Restoring... {progress}%</span>
                        </div>
                        <div className="h-1 bg-slate-700 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-cyan-500 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button className="p-2 text-gray-400 hover:text-white transition-colors">
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Storage Policy Info */}
      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-400">
            <p className="mb-1">
              <strong className="text-gray-300">Auto-archive:</strong> Files not
              accessed for {STORAGE_LIMITS.DAYS_UNTIL_ARCHIVE} days are moved to
              cold storage.
            </p>
            <p className="mb-1">
              <strong className="text-gray-300">Auto-delete:</strong> Archived
              files are deleted after {STORAGE_LIMITS.DAYS_UNTIL_DELETE} days.
            </p>
            <p>
              <strong className="text-gray-300">Restore cost:</strong>{' '}
              {STORAGE_LIMITS.RESTORE_CREDITS} credits per file (
              ${(STORAGE_LIMITS.RESTORE_CREDITS / CREDIT_EXCHANGE_RATE).toFixed(2)})
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StorageManager
