'use client'

import { AgentRunDock, type AgentRunItem } from '@/components/vision/AgentRunDock'

/**
 * The "update all directions" batch, reported without locking the page.
 *
 * This is one API call per stale scene, so a 26-scene script spent minutes
 * behind the full-screen overlay — with the script it was rewriting directly
 * underneath and unreadable.
 */
export function DirectionRunDock({
  items,
  finished,
  onClose,
}: {
  items: AgentRunItem[]
  finished: boolean
  onClose: () => void
}) {
  const done = items.filter((item) => item.status === 'done').length
  const failed = items.filter((item) => item.status === 'error').length
  const total = items.length
  const pct = total === 0 ? 0 : Math.round(((done + failed) / total) * 100)

  const tone = !finished ? 'running' : failed > 0 ? 'warning' : 'success'

  const subtitle = !finished
    ? 'Rewriting stale directions — you can keep editing'
    : failed > 0
      ? `${failed} scene${failed === 1 ? '' : 's'} failed — retry from the scene`
      : 'Every stale direction updated'

  return (
    <AgentRunDock
      title="Scene directions"
      subtitle={subtitle}
      tone={tone}
      items={items}
      meta={
        <>
          {done}/{total} scenes
          {failed > 0 ? ` · ${failed} failed` : ''}
          {' · '}
          {pct}%
        </>
      }
      progressPct={Math.max(finished ? 0 : 4, pct)}
      onClose={finished ? onClose : undefined}
    />
  )
}

export default DirectionRunDock
