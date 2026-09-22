'use client'

import { Music } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

export function SceneScoreToggle({
  checked,
  onCheckedChange,
  className,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
}) {
  return (
    <label
      className={`flex items-center gap-1.5 shrink-0 cursor-pointer ${className ?? ''}`}
      onClick={(event) => event.stopPropagation()}
      title={
        checked
          ? 'Score plays on every beat it covers. Turn off to mute the score across those beats.'
          : 'Turn the score on for every beat it covers.'
      }
    >
      <Music className={`w-3.5 h-3.5 ${checked ? 'text-purple-300' : 'text-purple-300/50'}`} />
      <span className={`text-xs ${checked ? 'text-purple-200' : 'text-purple-200/60'}`}>Score</span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="scale-90 origin-left"
        aria-label="Score across beats"
      />
    </label>
  )
}
