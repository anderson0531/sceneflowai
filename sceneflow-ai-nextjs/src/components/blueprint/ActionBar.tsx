import React from 'react'
import { Button } from '../../components/ui/Button'

export function ActionBar({ onPrimary, onSecondary }: { onPrimary: () => void; onSecondary?: () => void }) {
  return (
    <div className="sticky bottom-0 z-20 w-full bg-gray-950/80 backdrop-blur border-t border-gray-800 px-4 py-3 flex items-center justify-end gap-2">
      {/* Deprecated: composer now renders primary and conditional save. Retain for compatibility if used elsewhere. */}
      {onSecondary && (
        <Button variant="outline" onClick={onSecondary} className="border-gray-700 text-gray-200">Save Draft</Button>
      )}
      <Button onClick={onPrimary} className="bg-sf-primary text-sf-background hover:bg-sf-accent">Generate Treatment ⌘⏎</Button>
    </div>
  )
}
