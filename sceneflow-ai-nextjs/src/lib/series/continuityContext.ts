/**
 * Series Continuity Context Builder
 * 
 * Gathers story threads, key events, episode summaries, and consistency rules
 * from a series' Reference Library and assembles them into a prompt-ready block
 * for injection into AI generation and editing endpoints.
 * 
 * This is the single source of truth for cross-episode continuity context.
 * Used by: script generation, treatment optimization, scene expansion,
 * scene optimization, script optimization, and direction optimization.
 * 
 * @see /src/types/series.ts for type definitions
 */

import type {
  SeriesProductionBible,
  SeriesEpisodeBlueprint,
  StoryThread,
  KeyEvent,
  EpisodeSummary,
  SeriesContinuityContext,
} from '@/types/series'

// Maximum tokens (approximate) to keep the continuity block within budget.
// Full detail for the last 3 episodes, one-line summaries for older ones.
const MAX_RECENT_EPISODES_FULL = 3
const MAX_KEY_EVENTS_IN_PROMPT = 30
const MAX_STORY_THREADS_IN_PROMPT = 15

/**
 * Build a SeriesContinuityContext from raw series data.
 * This is a pure function — no DB calls. The caller loads the series first.
 * 
 * @param bible         The series reference library
 * @param blueprints    All episode blueprints (for fallback summaries/threads)
 * @param seriesTitle   Series title
 * @param seriesLogline Series logline
 * @param currentEpisodeNumber  The episode being generated/edited
 * @param totalEpisodes Total planned episodes
 */
export function buildContinuityContext(
  bible: SeriesProductionBible,
  blueprints: SeriesEpisodeBlueprint[],
  seriesTitle: string,
  seriesLogline: string,
  currentEpisodeNumber: number,
  totalEpisodes: number
): SeriesContinuityContext {
  // 1. Gather episode summaries from bible (canonical) or fall back to blueprint synopses
  const episodeSummaries = gatherEpisodeSummaries(bible, blueprints, currentEpisodeNumber)

  // 2. Gather active (unresolved) story threads
  const activeStoryThreads = gatherActiveStoryThreads(bible, blueprints, currentEpisodeNumber)

  // 3. Gather key events from previous episodes
  const keyEvents = gatherKeyEvents(bible, currentEpisodeNumber)

  // 4. Derive current character statuses from key events
  const characterStatuses = deriveCharacterStatuses(bible, keyEvents)

  // 5. Build the pre-formatted prompt block
  const continuityPromptBlock = formatContinuityPromptBlock({
    seriesTitle,
    seriesLogline,
    currentEpisodeNumber,
    totalEpisodes,
    setting: bible.setting || '',
    protagonist: bible.protagonist || { name: '', goal: '' },
    antagonistConflict: bible.antagonistConflict || { type: 'self', description: '' },
    episodeSummaries,
    activeStoryThreads,
    keyEvents,
    characterStatuses,
    consistencyRules: bible.consistencyRules || [],
    worldBuildingNotes: bible.worldBuildingNotes || [],
    toneGuidelines: bible.toneGuidelines,
    visualGuidelines: bible.visualGuidelines,
    audioGuidelines: bible.audioGuidelines,
    unresolvedHooks: bible.unresolvedHooks || [],
  })

  return {
    seriesTitle,
    seriesLogline,
    currentEpisodeNumber,
    totalEpisodes,
    setting: bible.setting || '',
    protagonist: bible.protagonist || { name: '', goal: '' },
    antagonistConflict: bible.antagonistConflict || { type: 'self', description: '' },
    episodeSummaries,
    activeStoryThreads,
    keyEvents,
    characterStatuses,
    consistencyRules: bible.consistencyRules || [],
    worldBuildingNotes: bible.worldBuildingNotes || [],
    toneGuidelines: bible.toneGuidelines,
    visualGuidelines: bible.visualGuidelines,
    audioGuidelines: bible.audioGuidelines,
    continuityPromptBlock,
  }
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function gatherEpisodeSummaries(
  bible: SeriesProductionBible,
  blueprints: SeriesEpisodeBlueprint[],
  currentEpisodeNumber: number
): EpisodeSummary[] {
  const summaries: EpisodeSummary[] = []

  // Canonical summaries from bible (preferred — these are human-approved)
  const bibleSummaries = bible.episodeSummaries || []

  for (const bp of blueprints) {
    if (bp.episodeNumber >= currentEpisodeNumber) continue // Only previous episodes
    if (bp.status === 'blueprint') continue // Skip episodes that haven't been started

    const canonical = bibleSummaries.find(s => s.episodeNumber === bp.episodeNumber)
    if (canonical) {
      summaries.push(canonical)
    } else {
      // Fallback: use blueprint synopsis as a summary
      summaries.push({
        episodeNumber: bp.episodeNumber,
        title: bp.title,
        summary: bp.synopsis || bp.logline || `Episode ${bp.episodeNumber}`,
        keyEventIds: [],
        createdAt: new Date().toISOString(),
      })
    }
  }

  return summaries.sort((a, b) => a.episodeNumber - b.episodeNumber)
}

function gatherActiveStoryThreads(
  bible: SeriesProductionBible,
  blueprints: SeriesEpisodeBlueprint[],
  currentEpisodeNumber: number
): StoryThread[] {
  // Priority: use bible-level aggregated threads if they exist
  if (bible.storyThreads && bible.storyThreads.length > 0) {
    return bible.storyThreads
      .filter(t => t.status !== 'resolved')
      .slice(0, MAX_STORY_THREADS_IN_PROMPT)
  }

  // Fallback: aggregate from episode blueprints (the seriesGenerationService pattern)
  const threadMap = new Map<string, StoryThread>()

  for (const ep of blueprints) {
    if (ep.episodeNumber >= currentEpisodeNumber) continue
    if (!ep.storyThreads) continue

    for (const thread of ep.storyThreads) {
      const key = thread.id || thread.name
      const existing = threadMap.get(key)
      if (existing) {
        // Update status to the latest episode's status
        existing.status = thread.status
        if (thread.description) existing.description = thread.description
      } else if (thread.status !== 'resolved') {
        threadMap.set(key, { ...thread })
      }
    }
  }

  return Array.from(threadMap.values()).slice(0, MAX_STORY_THREADS_IN_PROMPT)
}

function gatherKeyEvents(
  bible: SeriesProductionBible,
  currentEpisodeNumber: number
): KeyEvent[] {
  if (!bible.keyEvents) return []

  return bible.keyEvents
    .filter(e => e.episodeNumber < currentEpisodeNumber)
    .sort((a, b) => a.episodeNumber - b.episodeNumber)
    .slice(-MAX_KEY_EVENTS_IN_PROMPT)
}

function deriveCharacterStatuses(
  bible: SeriesProductionBible,
  keyEvents: KeyEvent[]
): Record<string, string> {
  const statuses: Record<string, string> = {}

  // Build character name lookup
  const charNameMap = new Map<string, string>()
  for (const c of bible.characters || []) {
    charNameMap.set(c.id, c.name)
  }

  // Process key events chronologically to build current status
  for (const event of keyEvents) {
    for (const charId of event.affectedCharacterIds) {
      const charName = charNameMap.get(charId) || charId
      switch (event.type) {
        case 'death':
          statuses[charName] = 'DECEASED (cannot appear in future episodes)'
          break
        case 'departure':
          statuses[charName] = `Departed / left the story (Ep ${event.episodeNumber})`
          break
        case 'relocation':
          statuses[charName] = `Relocated: ${event.description}`
          break
        case 'injury':
          statuses[charName] = `Injured: ${event.description}`
          break
        case 'transformation':
          statuses[charName] = `Transformed: ${event.description}`
          break
        case 'relationship_change':
          statuses[charName] = `Relationship changed: ${event.description}`
          break
        default:
          statuses[charName] = event.description
      }
    }
  }

  // Also incorporate bible-level episode summaries' characterStatuses
  const bibleSummaries = bible.episodeSummaries || []
  for (const summary of bibleSummaries) {
    if (summary.characterStatuses) {
      for (const [name, status] of Object.entries(summary.characterStatuses)) {
        statuses[name] = status
      }
    }
  }

  return statuses
}

function formatContinuityPromptBlock(ctx: {
  seriesTitle: string
  seriesLogline: string
  currentEpisodeNumber: number
  totalEpisodes: number
  setting: string
  protagonist: { name: string; goal: string; flaw?: string }
  antagonistConflict: { type: string; description: string }
  episodeSummaries: EpisodeSummary[]
  activeStoryThreads: StoryThread[]
  keyEvents: KeyEvent[]
  characterStatuses: Record<string, string>
  consistencyRules: string[]
  worldBuildingNotes: string[]
  toneGuidelines?: string
  visualGuidelines?: string
  audioGuidelines?: string
  unresolvedHooks: string[]
}): string {
  const lines: string[] = []

  lines.push('=== SERIES CONTINUITY CONTEXT (MUST FOLLOW) ===')
  lines.push(`Series: "${ctx.seriesTitle}"`)
  lines.push(`Episode: ${ctx.currentEpisodeNumber} of ${ctx.totalEpisodes}`)
  if (ctx.setting) lines.push(`Setting: ${ctx.setting}`)
  if (ctx.protagonist?.name) {
    lines.push(`Protagonist: ${ctx.protagonist.name} — Goal: ${ctx.protagonist.goal}${ctx.protagonist.flaw ? `, Flaw: ${ctx.protagonist.flaw}` : ''}`)
  }
  if (ctx.antagonistConflict?.description) {
    lines.push(`Conflict: ${ctx.antagonistConflict.description} (${ctx.antagonistConflict.type})`)
  }
  lines.push('')

  // Previous episode summaries — full for recent, one-line for older
  if (ctx.episodeSummaries.length > 0) {
    lines.push('PREVIOUS EPISODES:')
    for (const summary of ctx.episodeSummaries) {
      const isRecent = summary.episodeNumber > ctx.currentEpisodeNumber - MAX_RECENT_EPISODES_FULL - 1
      if (isRecent) {
        lines.push(`  Ep ${summary.episodeNumber} "${summary.title}": ${summary.summary}`)
      } else {
        // One-line summary for older episodes to save tokens
        const brief = summary.summary.length > 120 
          ? summary.summary.substring(0, 120) + '...'
          : summary.summary
        lines.push(`  Ep ${summary.episodeNumber}: ${brief}`)
      }
    }
    lines.push('')
  }

  // Active story threads
  if (ctx.activeStoryThreads.length > 0) {
    lines.push('ACTIVE STORY THREADS (continue or resolve these):')
    for (const thread of ctx.activeStoryThreads) {
      lines.push(`  - ${thread.name} (${thread.type}, ${thread.status}): ${thread.description || 'No description'}`)
    }
    lines.push('')
  }

  // Key events / canon constraints
  const irreversibleEvents = ctx.keyEvents.filter(e => e.irreversible)
  if (irreversibleEvents.length > 0) {
    lines.push('IRREVERSIBLE CANON EVENTS (DO NOT CONTRADICT):')
    for (const event of irreversibleEvents) {
      lines.push(`  - [Ep ${event.episodeNumber}] ${event.type.toUpperCase()}: ${event.description}`)
    }
    lines.push('')
  }

  // Non-irreversible key events (context)
  const contextEvents = ctx.keyEvents.filter(e => !e.irreversible)
  if (contextEvents.length > 0) {
    lines.push('KEY STORY EVENTS (for context):')
    for (const event of contextEvents) {
      lines.push(`  - [Ep ${event.episodeNumber}] ${event.description}`)
    }
    lines.push('')
  }

  // Character current statuses
  const statusEntries = Object.entries(ctx.characterStatuses)
  if (statusEntries.length > 0) {
    lines.push('CHARACTER CURRENT STATUS:')
    for (const [name, status] of statusEntries) {
      lines.push(`  - ${name}: ${status}`)
    }
    lines.push('')
  }

  // Unresolved hooks/cliffhangers
  if (ctx.unresolvedHooks.length > 0) {
    lines.push('UNRESOLVED HOOKS (address or continue):')
    for (const hook of ctx.unresolvedHooks) {
      lines.push(`  - ${hook}`)
    }
    lines.push('')
  }

  // Consistency rules
  if (ctx.consistencyRules.length > 0) {
    lines.push('CONSISTENCY RULES:')
    for (const rule of ctx.consistencyRules) {
      lines.push(`  - ${rule}`)
    }
    lines.push('')
  }

  // Guidelines
  if (ctx.toneGuidelines) lines.push(`Tone: ${ctx.toneGuidelines}`)
  if (ctx.visualGuidelines) lines.push(`Visual: ${ctx.visualGuidelines}`)
  if (ctx.audioGuidelines) lines.push(`Audio: ${ctx.audioGuidelines}`)

  lines.push('=== END SERIES CONTINUITY ===')
  lines.push('')

  return lines.join('\n')
}

// ─── Server-side helper (loads series from DB) ───────────────────────────────

/**
 * Load a series from the database and build its continuity context.
 * Use this in API routes where you have a seriesId but not the full series object.
 * 
 * @param seriesId The series UUID
 * @param currentEpisodeNumber The episode being worked on
 * @returns SeriesContinuityContext or null if series not found
 */
export async function loadSeriesContinuityContext(
  seriesId: string,
  currentEpisodeNumber: number
): Promise<SeriesContinuityContext | null> {
  try {
    // Dynamic import to avoid bundling Sequelize models in client code
    const { Series } = await import('@/models/Series')
    
    const series = await Series.findByPk(seriesId)
    if (!series) return null

    const bible = series.production_bible || {} as SeriesProductionBible
    const blueprints = series.episode_blueprints || []

    return buildContinuityContext(
      bible,
      blueprints,
      series.title,
      series.logline || '',
      currentEpisodeNumber,
      series.max_episodes || blueprints.length
    )
  } catch (error) {
    console.error('[ContinuityContext] Failed to load series context:', error)
    return null
  }
}

/**
 * Given a project (loaded from DB), determine if it belongs to a series
 * and return the continuity context if so.
 * 
 * @param project The Project model instance
 * @returns SeriesContinuityContext or null if not a series episode
 */
export async function loadContinuityContextForProject(
  project: any
): Promise<SeriesContinuityContext | null> {
  const seriesId = project.series_id
  if (!seriesId) return null

  const episodeNumber = project.episode_number || project.metadata?.episodeNumber || 1
  return loadSeriesContinuityContext(seriesId, episodeNumber)
}
