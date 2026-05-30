'use client'

import {
  formatBlueprintRuntime,
  getBlueprintCoreFields,
} from '@/lib/blueprint/formatBlueprintCore'

type Props = {
  variant: Record<string, unknown>
  omitTitleInCore?: boolean
  omitLoglineInCore?: boolean
}

export function BlueprintCoreContent({
  variant,
  omitTitleInCore,
  omitLoglineInCore,
}: Props) {
  const fields = getBlueprintCoreFields(variant)
  const runtime = formatBlueprintRuntime(fields.formatLength)
  const showTitle = !omitTitleInCore && !!fields.title
  const showLogline = !omitLoglineInCore && !!fields.logline
  const hasChips = !!fields.genre || !!runtime.display
  const hasAudience = !!fields.targetAudience
  const hasFooter = !!fields.authorWriter || !!fields.date

  if (!showTitle && !showLogline && !hasChips && !hasAudience && !hasFooter) {
    return <p className="sf-review-body-muted">No core information listed.</p>
  }

  return (
    <div className="space-y-4">
      {(showTitle || showLogline) && (
        <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 px-4 py-3 border-l-4 border-l-purple-500/50">
          {showTitle ? (
            <h3 className="sf-section-title text-xl sm:text-2xl">{fields.title}</h3>
          ) : null}
          {showLogline ? (
            <p className="sf-review-body-muted mt-2 italic">{fields.logline}</p>
          ) : null}
        </div>
      )}

      {hasChips ? (
        <div className="flex flex-wrap gap-2">
          {fields.genre ? (
            <span className="sf-core-chip sf-core-chip-genre">{fields.genre}</span>
          ) : null}
          {runtime.display ? (
            <span className="sf-core-chip sf-core-chip-format" title={runtime.raw}>
              {runtime.display}
            </span>
          ) : null}
        </div>
      ) : null}

      {hasAudience ? (
        <div className="sf-core-audience">
          <div className="sf-review-field-label text-purple-300/90 mb-2">Target audience</div>
          <p className="sf-review-body">{fields.targetAudience}</p>
        </div>
      ) : null}

      {hasFooter ? (
        <div className="sf-review-body-muted flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {fields.authorWriter ? (
            <span>
              <span className="sf-review-field-label normal-case tracking-normal">Writer: </span>
              {fields.authorWriter}
            </span>
          ) : null}
          {fields.date ? (
            <span>
              <span className="sf-review-field-label normal-case tracking-normal">Date: </span>
              {fields.date}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
