'use client'

import { useEffect, useMemo, useState } from 'react'
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
  duplicateClusterKey,
  ignorePairsForGroup,
  ignorePairsForObject,
  pickCanonicalObject,
  type DuplicateObjectBeatGroupsResult,
} from '@/lib/vision/objectDuplicateClusters'
import { cn } from '@/lib/utils'

export interface ObjectDuplicateMergeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: DuplicateObjectBeatGroupsResult<VisualReference>
  onMerge: (keepId: string, mergeIds: string[]) => void | Promise<void>
  onDeleteObjects: (ids: string[], keeperId?: string) => void | Promise<void>
  onIgnorePairs: (pairs: string[]) => void | Promise<void>
}

function collectClusterMembers(
  groups: DuplicateObjectBeatGroupsResult<VisualReference>
): Record<string, VisualReference[]> {
  const byKey: Record<string, VisualReference[]> = {}
  for (const scene of groups.scenes) {
    for (const beat of scene.beats) {
      for (const collision of beat.collisions) {
        byKey[collision.clusterKey] = collision.members
      }
    }
  }
  for (const cluster of groups.unreferenced) {
    const key = duplicateClusterKey(cluster)
    if (key) byKey[key] = cluster
  }
  return byKey
}

function ClusterMemberList({
  clusterKey,
  members,
  keepId,
  busy,
  unused,
  onKeepChange,
  onMerge,
  onDeleteObjects,
  onIgnorePairs,
  run,
}: {
  clusterKey: string
  members: VisualReference[]
  keepId: string
  busy: boolean
  unused?: boolean
  onKeepChange: (keepId: string) => void
  onMerge: (keepId: string, mergeIds: string[]) => void | Promise<void>
  onDeleteObjects: (ids: string[], keeperId?: string) => void | Promise<void>
  onIgnorePairs: (pairs: string[]) => void | Promise<void>
  run: (action: () => void | Promise<void>) => Promise<void>
}) {
  return (
    <>
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {unused
            ? `${members.length} names in this group`
            : `${members.length} names attached for the same prop`}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          className="h-8 shrink-0 text-xs"
          onClick={() => void run(() => onIgnorePairs(ignorePairsForGroup(members)))}
        >
          Ignore group
        </Button>
      </div>

      <RadioGroup
        value={keepId}
        onValueChange={onKeepChange}
        className="gap-2"
        disabled={busy}
      >
        {members.map((member) => (
          <div
            key={member.id}
            className={cn(
              'flex items-start gap-3 rounded-md border bg-background p-2',
              member.id === keepId ? 'border-primary/40' : 'border-border',
            )}
          >
            <RadioGroupItem
              value={member.id}
              id={`dup-keep-${clusterKey}-${member.id}`}
              className="mt-1"
            />
            <Label
              htmlFor={`dup-keep-${clusterKey}-${member.id}`}
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
                  void run(() => onIgnorePairs(ignorePairsForObject(members, member.id)))
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
                    const remaining = members.filter((row) => row.id !== member.id)
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
          disabled={busy || members.length < 2}
          onClick={() =>
            void run(() => {
              const dropIds = members
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
    </>
  )
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
  const clusterMembers = useMemo(() => collectClusterMembers(groups), [groups])
  const reviewCount = groups.scenes.reduce((sum, scene) => sum + scene.beats.length, 0)
    + groups.unreferenced.length

  useEffect(() => {
    setKeepByGroup((prev) => {
      const next: Record<string, string> = {}
      for (const [key, members] of Object.entries(clusterMembers)) {
        const current = prev[key]
        next[key] =
          current && members.some((member) => member.id === current)
            ? current
            : pickCanonicalObject(members).id
      }
      return next
    })
  }, [clusterMembers])

  useEffect(() => {
    if (open && reviewCount === 0) {
      onOpenChange(false)
    }
  }, [open, reviewCount, onOpenChange])

  const run = async (action: () => void | Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  const keepFor = (clusterKey: string, members: VisualReference[]) => {
    const stored = keepByGroup[clusterKey]
    if (stored && members.some((member) => member.id === stored)) return stored
    return pickCanonicalObject(members).id
  }

  if (reviewCount === 0) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="object-duplicate-dialog"
        className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 space-y-1.5 border-b px-6 py-4 text-left">
          <DialogTitle>Review duplicate objects</DialogTitle>
          <DialogDescription>
            These beats attach more than one library still for the same prop. Keep one name,
            merge the rest, delete extras, or mark names that are not duplicates.
          </DialogDescription>
        </DialogHeader>

        <div
          data-testid="object-duplicate-scroll"
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4"
        >
          {groups.scenes.map((scene) => (
            <section
              key={scene.sceneNumber}
              data-testid="object-duplicate-scene"
              className="rounded-lg border border-border bg-muted/20 p-3"
            >
              <h3 className="text-sm font-semibold text-foreground">
                Scene {scene.sceneNumber}
                {scene.heading ? ` · ${scene.heading}` : ''}
              </h3>
              <div className="mt-3 space-y-3">
                {scene.beats.map((beat) => (
                  <div
                    key={`${scene.sceneNumber}-${beat.beatIndex}-${beat.beatId ?? ''}`}
                    data-testid="object-duplicate-group"
                    className="rounded-md border border-border bg-background/60 p-3"
                  >
                    <p className="text-sm font-medium text-foreground">Beat {beat.beatIndex + 1}</p>
                    {beat.snippet ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{beat.snippet}</p>
                    ) : null}
                    <div className="mt-3 space-y-4">
                      {beat.collisions.map((collision) => (
                        <ClusterMemberList
                          key={`${beat.beatIndex}-${collision.clusterKey}`}
                          clusterKey={`${scene.sceneNumber}-${beat.beatIndex}-${collision.clusterKey}`}
                          members={collision.members}
                          keepId={keepFor(collision.clusterKey, collision.members)}
                          busy={busy}
                          onKeepChange={(value) =>
                            setKeepByGroup((prev) => ({
                              ...prev,
                              [collision.clusterKey]: value,
                            }))
                          }
                          onMerge={onMerge}
                          onDeleteObjects={onDeleteObjects}
                          onIgnorePairs={onIgnorePairs}
                          run={run}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {groups.unreferenced.length > 0 ? (
            <section
              data-testid="object-duplicate-unreferenced"
              className="rounded-lg border border-border bg-muted/20 p-3"
            >
              <h3 className="text-sm font-semibold text-foreground">Not tagged on a beat</h3>
              <p className="mb-3 text-xs text-muted-foreground">
                These synonym rows are in the library but no beat prompt attaches more than one
                of them.
              </p>
              <div className="space-y-4">
                {groups.unreferenced.map((cluster) => {
                  const key = duplicateClusterKey(cluster)
                  return (
                    <div
                      key={key}
                      data-testid="object-duplicate-group"
                      className="rounded-md border border-border bg-background/60 p-3"
                    >
                      <ClusterMemberList
                        clusterKey={`unused-${key}`}
                        members={cluster}
                        keepId={keepFor(key, cluster)}
                        busy={busy}
                        unused
                        onKeepChange={(value) =>
                          setKeepByGroup((prev) => ({ ...prev, [key]: value }))
                        }
                        onMerge={onMerge}
                        onDeleteObjects={onDeleteObjects}
                        onIgnorePairs={onIgnorePairs}
                        run={run}
                      />
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}
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
