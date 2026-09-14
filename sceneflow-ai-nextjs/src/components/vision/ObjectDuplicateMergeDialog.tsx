'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { VisualReference } from '@/types/visionReferences'
import { pickCanonicalObject } from '@/lib/vision/objectDuplicateClusters'

export function ObjectDuplicateMergeDialog({
  open,
  onOpenChange,
  groups,
  onMerge,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: VisualReference[][]
  onMerge: (primaryId: string, duplicateIds: string[]) => void | Promise<void>
}) {
  const [groupIndex, setGroupIndex] = useState(0)
  const [primaryId, setPrimaryId] = useState('')
  const [merging, setMerging] = useState(false)

  const safeIndex = groups.length === 0 ? 0 : Math.min(groupIndex, groups.length - 1)
  const group = groups[safeIndex] || []
  const duplicateIds = useMemo(
    () => group.filter((row) => row.id !== primaryId).map((row) => row.id),
    [group, primaryId]
  )

  useEffect(() => {
    if (!open) return
    setGroupIndex((index) => (groups.length === 0 ? 0 : Math.min(index, groups.length - 1)))
  }, [open, groups.length])

  const groupKey = group.map((row) => row.id).join('|')

  useEffect(() => {
    if (open && groups.length === 0) onOpenChange(false)
  }, [open, groups.length, onOpenChange])

  useEffect(() => {
    if (!open || group.length === 0) {
      setPrimaryId('')
      return
    }
    setPrimaryId((current) =>
      group.some((row) => row.id === current) ? current : pickCanonicalObject(group).id
    )
  }, [open, group, groupKey])

  if (group.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review duplicate objects</DialogTitle>
          <DialogDescription>
            These names match the same physical prop. Keep one reference still so frame
            generation does not attach every synonym.
            {groups.length > 1
              ? ` Group ${safeIndex + 1} of ${groups.length}.`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-200">Keep this object</label>
            <Select
              value={primaryId}
              onValueChange={setPrimaryId}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {group.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.name}
                    {row.imageUrl ? ' (has still)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-200">Will be merged</label>
            <div className="space-y-2 rounded-lg border border-gray-700 bg-gray-900/60 p-3">
              {group
                .filter((row) => row.id !== primaryId)
                .map((row) => (
                  <div key={row.id} className="flex items-center gap-2 text-sm text-gray-300">
                    {row.imageUrl ? (
                      <img
                        src={row.imageUrl}
                        alt=""
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-500" />
                    )}
                    <span>{row.name}</span>
                  </div>
                ))}
            </div>
            <p className="text-xs text-gray-500">
              Beat key props and saved prompt selections are rewritten onto the kept name.
              If the kept row has no still, one is copied from a merged row.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!primaryId || duplicateIds.length === 0 || merging}
            onClick={async () => {
              setMerging(true)
              try {
                await onMerge(primaryId, duplicateIds)
              } finally {
                setMerging(false)
              }
            }}
          >
            {merging ? 'Merging…' : 'Merge group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
