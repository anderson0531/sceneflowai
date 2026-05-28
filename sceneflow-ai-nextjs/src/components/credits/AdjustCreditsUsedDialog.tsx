'use client'

import { useEffect, useState } from 'react'
import { Coins, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface AdjustCreditsUsedDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectTitle?: string
  currentCreditsUsed: number
  onSaved?: (creditsUsed: number) => void
}

export function AdjustCreditsUsedDialog({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  currentCreditsUsed,
  onSaved,
}: AdjustCreditsUsedDialogProps) {
  const [value, setValue] = useState(String(currentCreditsUsed))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setValue(String(currentCreditsUsed))
      setError(null)
    }
  }, [open, currentCreditsUsed])

  const handleSave = async () => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Enter a non-negative number of credits.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/budget`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditsUsed: Math.round(parsed) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update credits used')
      }

      onSaved?.(data.creditsUsed ?? Math.round(parsed))
      onOpenChange(false)
      window.dispatchEvent(new CustomEvent('project-updated'))
    } catch (err: any) {
      setError(err?.message || 'Failed to update credits used')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-sf-primary" />
            Adjust credits used
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {projectTitle
              ? `Set the total credits used for "${projectTitle}".`
              : 'Set the total credits used for this project.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label htmlFor="credits-used-input" className="text-sm text-gray-300">
            Credits used
          </label>
          <Input
            id="credits-used-input"
            type="number"
            min={0}
            step={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-sf-primary hover:bg-sf-accent text-white">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
