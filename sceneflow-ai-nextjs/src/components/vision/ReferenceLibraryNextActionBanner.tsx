'use client'

import { Loader2, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import type {
  LibraryActionReason,
  LibraryPrimaryAction,
  LibraryRequiredActionsSummary,
} from '@/lib/vision/libraryKindAgents'

const REASON_MESSAGE_KEY: Record<LibraryActionReason, string> = {
  'missing-library-bases': 'nextAction.missingLibraryBases',
  'missing-location-bases': 'nextAction.missingLocationBases',
  'stale-location-versions': 'nextAction.staleLocationVersions',
  'missing-location-versions': 'nextAction.missingLocationVersions',
  'missing-cast-identity': 'nextAction.missingCastIdentity',
  'stale-cast-wardrobes': 'nextAction.staleCastWardrobes',
  'missing-objects': 'nextAction.missingObjects',
}

const RUN_LABEL_KEY: Record<LibraryPrimaryAction, string> = {
  library: 'nextAction.runLibraryAgent',
  location: 'nextAction.runLocationAgent',
  cast: 'nextAction.runCastAgent',
  object: 'nextAction.runObjectAgent',
}

export function ReferenceLibraryNextActionBanner({
  summary,
  onRun,
  disabled = false,
  isRunning = false,
}: {
  summary: LibraryRequiredActionsSummary
  onRun: () => void
  disabled?: boolean
  isRunning?: boolean
}) {
  const t = useTranslations('production.foundation.referenceLibrary')

  if (!summary.primaryAction || !summary.reason) return null

  return (
    <div
      className="mb-3 flex flex-shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2"
      data-testid="reference-library-next-action"
    >
      <p className="min-w-0 text-xs text-amber-100">
        {t(REASON_MESSAGE_KEY[summary.reason], { count: summary.reasonCount })}
      </p>
      <Button
        type="button"
        size="sm"
        onClick={onRun}
        disabled={disabled || isRunning}
        className="h-7 shrink-0 text-xs bg-amber-500 text-zinc-950 border-amber-400 hover:bg-amber-400 hover:border-amber-300"
      >
        {isRunning ? (
          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
        ) : (
          <Zap className="w-3.5 h-3.5 mr-1" />
        )}
        {isRunning ? t('nextAction.generating') : t(RUN_LABEL_KEY[summary.primaryAction])}
      </Button>
    </div>
  )
}
