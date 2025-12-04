'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'

interface NavigationWarningDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetHref: string
  targetLabel?: string
  onConfirm?: () => void
}

export function NavigationWarningDialog({
  open,
  onOpenChange,
  targetHref,
  targetLabel = 'The Blueprint',
  onConfirm,
}: NavigationWarningDialogProps) {
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

  const handleConfirm = () => {
    setIsNavigating(true)
    onConfirm?.()
    router.push(targetHref)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-left">Navigate to {targetLabel}?</DialogTitle>
              <DialogDescription className="text-left">
                Understanding how workflow navigation works
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* What's Safe */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-emerald-900 dark:text-emerald-100 mb-1">
                  Your Scene Studio work is saved
                </h4>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  You can navigate freely between workflow steps. Your script, scenes, images, 
                  audio, and video segments are automatically saved and will be here when you return.
                </p>
              </div>
            </div>
          </div>

          {/* What Will Be Lost */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-900 dark:text-red-100 mb-1">
                  Generating a new script will replace existing work
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300">
                  If you generate a <strong>new Film Treatment and Script</strong> from The Blueprint, 
                  it will replace your current Scene Studio content (script, scenes, and generated assets).
                </p>
              </div>
            </div>
          </div>

          {/* Tip */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Tip:</strong> To edit your existing treatment without losing work, 
              use the "Refine Treatment" option in The Blueprint instead of generating a completely new one.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isNavigating}
            className="flex-1 sm:flex-none"
          >
            Stay in Scene Studio
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isNavigating}
            className="flex-1 sm:flex-none"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {isNavigating ? 'Navigating...' : `Go to ${targetLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
