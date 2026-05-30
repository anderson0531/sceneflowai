'use client'

import {
  formatBlueprintRuntime,
  getBlueprintCoreFields,
} from '@/lib/blueprint/formatBlueprintCore'
import { BlueprintFieldCard } from '@/components/blueprint/BlueprintFieldCard'

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
  const hasAny =
    showTitle ||
    showLogline ||
    !!fields.genre ||
    !!runtime.display ||
    !!fields.targetAudience ||
    !!fields.authorWriter ||
    !!fields.date

  if (!hasAny) {
    return <p className="sf-review-body-muted">No core information listed.</p>
  }

  return (
    <div className="space-y-3">
      {showTitle ? (
        <BlueprintFieldCard
          sectionId="core"
          label="Title"
          value={fields.title}
          emphasis="prominent"
        />
      ) : null}
      {showLogline ? (
        <BlueprintFieldCard
          sectionId="core"
          label="Logline"
          value={fields.logline}
          valueClassName="italic text-gray-300"
        />
      ) : null}
      <BlueprintFieldCard sectionId="core" label="Genre" value={fields.genre} />
      <BlueprintFieldCard
        sectionId="core"
        label="Format"
        hideWhenEmpty={!runtime.display}
      >
        <span className="sf-review-body font-medium" title={runtime.raw || undefined}>
          {runtime.display}
        </span>
      </BlueprintFieldCard>
      <BlueprintFieldCard sectionId="core" label="Target audience" value={fields.targetAudience} />
      <BlueprintFieldCard sectionId="core" label="Writer" value={fields.authorWriter} />
      <BlueprintFieldCard sectionId="core" label="Date" value={fields.date} />
    </div>
  )
}
