'use client'

import { useEffect, useState } from 'react'
import { GitMerge, Loader2, Trash2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import type { VisualReference } from '@/types/visionReferences'
import {
  ignorePairsForGroup,
  ignorePairsForObject,
  pickCanonicalObject,
} from '@/lib/vision/objectDuplicateClusters'
import { cn } from '@/lib/utils'

export interface ObjectDuplicateMergeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: VisualReference[][]
  onMerge: (keepId: string, mergeIds: string[]) => void | Promise<void>
  onDeleteObjects: (ids: string[], keeperId?: string) => void | Promise<void>
  onIgnorePairs: (pairs: string[]) => void | Promise<void>
}

function groupKey(group: VisualReference[]): string {
  return group.map((row) => row.id).filter(Boolean).sort().join('|')
}

function groupHeading(group: VisualReference[]): string {
  return [...group].sort((a, b) => b.name.length - a.name.length)[0]?.name ?? group[0]?.name ?? ''
}

export function ObjectDuplicateMergeDialog({
  open,
  onOpenChange,
  groups,
  onMerge,
  onDeleteObjects,
  onIgnorePairs,
}: ObjectDuplicateMergeDialogProps) {
  const [keepByGroup, setKeepByGroup] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setKeepByGroup((prev) => {
      const next: Record<string, string> = {}
      for (const group of groups) {
        const key = groupKey(group)
        if (!key) continue
        const current = prev[key]
        next[key] =
          current && group.some((member) => member.id === current)
            ? current
            : pickCanonicalObject(group).id
      }
      return next
    })
  }, [groups])

  useEffect(() => {
    if (open && groups.length === 0) {
      onOpenChange(false)
    }
  }, [open, groups.length, onOpenChange])

  const run = async (action: () => void | Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  if (groups.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="object-duplicate-dialog"
        className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 space-y-1.5 border-b px-6 py-4 text-left">
          <DialogTitle>Review duplicate objects</DialogTitle>
          <DialogDescription>
            {groups.length} group{groups.length === 1 ? '' : 's'} look like the same prop. Keep one
            name per group, merge the rest, delete extras, or mark names that are not duplicates.
          </DialogDescription>
        </DialogHeader>

        <div
          data-testid="object-duplicate-scroll"
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4"
        >
          {groups.map((group) => {
            const key = groupKey(group)
            const heading = groupHeading(group)
            const keepId = keepByGroup[key] ?? pickCanonicalObject(group).id
            return (
              <section
                key={key}
                data-testid="object-duplicate-group"
                className="rounded-lg border border-border bg-muted/20 p-3"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{heading}</h3>
                    <p className="text-xs text-muted-foreground">
                      {group.length} names in this group
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    className="h-8 shrink-0 text-xs"
                    onClick={() => void run(() => onIgnorePairs(ignorePairsForGroup(group)))}
                  >
                    Ignore group
                  </Button>
                </div>

                <RadioGroup
                  value={keepId}
                  onValueChange={(value) =>
                    setKeepByGroup((prev) => ({ ...prev, [key]: value }))
                  }
                  className="gap-2"
                  disabled={busy}
                >
                  {group.map((member) => (
                    <div
                      key={member.id}
                      className={cn(
                        'flex items-start gap-3 rounded-md border bg-background p-2',
                        member.id === keepId ? 'border-primary/40' : 'border-border',
                      )}
                    >
                      <RadioGroupItem
                        value={member.id}
                        id={`dup-keep-${key}-${member.id}`}
                        className="mt-1"
                      />
                      <Label
                        htmlFor={`dup-keep-${key}-${member.id}`}
                        className="min-w-0 flex-1 cursor-pointer font-normal"
                      >
                        <div className="flex items-center gap-2">
                          {member.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={member.imageUrl}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                              No still
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{member.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {member.imageUrl ? 'Has still' : 'No still'}
                              {member.id === keepId ? ' · Keep this name' : ''}
                            </p>
                          </div>
                        </div>
                      </Label>
                      <div className="flex shrink-0 flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          className="h-7 px-2 text-xs text-muted-foreground"
                          onClick={() =>
                            void run(() => onIgnorePairs(ignorePairsForObject(group, member.id)))
                          }
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Not a duplicate
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={() =>
                            void run(() => {
                              const remaining = group.filter((row) => row.id !== member.id)
                              const keeper =
                                remaining.length > 0
                                  ? remaining.some((row) => row.id === keepId)
                                    ? keepId
                                    : remaining[0].id
                                  : undefined
                              return onDeleteObjects([member.id], keeper)
                            })
                          }
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </RadioGroup>

                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy || group.length < 2}
                    onClick={() =>
                      void run(() => {
                        const dropIds = group
                          .filter((member) => member.id !== keepId)
                          .map((member) => member.id)
                        return onMerge(keepId, dropIds)
                      })
                    }
                  >
                    {busy ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <GitMerge className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Merge group
                  </Button>
                </div>
              </section>
            )
          })}
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-3 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
