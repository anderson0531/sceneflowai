import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { Series, DEFAULT_MAX_EPISODES } from '@/models/Series'
import { sequelize } from '@/config/database'
import { resolveUser } from '@/lib/userHelper'
import type { SeriesCharacter, SeriesProductionBible } from '@/models/Series'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function buildMarketInsightsIdeaTopic(concept: Record<string, unknown>): string {
  const lines: string[] = []
  const title = typeof concept.title === 'string' ? concept.title : ''
  const logline = typeof concept.logline === 'string' ? concept.logline : ''
  const synopsis = typeof concept.synopsis === 'string' ? concept.synopsis : ''
  const marketLogic = typeof concept.marketLogic === 'string' ? concept.marketLogic : ''

  if (title) lines.push(`Series title: ${title}`)
  if (logline) lines.push(`Logline: ${logline}`)
  if (synopsis) lines.push(`Synopsis:\n${synopsis}`)
  if (marketLogic) lines.push(`Market / resonance angle:\n${marketLogic}`)

  const protagonist = concept.protagonist as Record<string, string> | undefined
  if (protagonist && typeof protagonist.name === 'string') {
    const role = protagonist.role || ''
    const flaw = protagonist.flaw || ''
    lines.push(`Protagonist: ${protagonist.name}${role ? ` (${role})` : ''}${flaw ? ` — flaw: ${flaw}` : ''}`)
  }

  const episodes = concept.episodes
  if (Array.isArray(episodes) && episodes.length > 0) {
    lines.push('Episode direction:')
    episodes.slice(0, 10).forEach((ep: unknown, i: number) => {
      const e = ep as Record<string, string>
      const t = e?.title || e?.name || 'Episode'
      const h = e?.hook || ''
      lines.push(`  ${i + 1}. ${t}${h ? `: ${h}` : ''}`)
    })
  }

  return lines.filter(Boolean).join('\n\n').trim() || title || 'Market Insights concept'
}

function seedCharactersFromConcept(concept: Record<string, unknown>): SeriesCharacter[] {
  const protagonist = concept.protagonist as Record<string, string> | undefined
  if (!protagonist?.name) return []
  const now = new Date().toISOString()
  return [
    {
      id: 'char-protagonist-seed',
      name: protagonist.name,
      role: 'protagonist',
      description: [protagonist.role, protagonist.flaw ? `Flaw: ${protagonist.flaw}` : ''].filter(Boolean).join(' — '),
      appearance: '',
      createdAt: now,
      updatedAt: now,
    },
  ]
}

function emptyProductionBible(concept: Record<string, unknown>): SeriesProductionBible {
  const protagonist = concept.protagonist as Record<string, string> | undefined
  const chars = seedCharactersFromConcept(concept)
  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    logline: '',
    synopsis: '',
    setting: '',
    protagonist: {
      characterId: protagonist?.name ? 'char-protagonist-seed' : '',
      name: protagonist?.name || 'TBD',
      goal: protagonist?.role || 'TBD',
      flaw: protagonist?.flaw || '',
    },
    antagonistConflict: {
      type: 'society',
      description: 'To be refined when you generate the full series storyline.',
    },
    aesthetic: {},
    characters: chars,
    locations: [],
  }
}

/**
 * POST /api/series/initialize
 *
 * Creates a real Series row (UUID) from a Market Insights generated concept
 * and seeds metadata.ideaTopic for the Series studio ideation textarea.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { selectedConcept, userEmail, genre: bodyGenre } = body || {}

    if (!selectedConcept || typeof selectedConcept !== 'object') {
      return NextResponse.json({ success: false, error: 'No concept selected' }, { status: 400 })
    }

    const userKey = userEmail || req.headers.get('x-user-id')
    if (!userKey) {
      return NextResponse.json({ success: false, error: 'User identity required' }, { status: 401 })
    }

    await sequelize.authenticate()
    const user = await resolveUser(userKey)

    const concept = selectedConcept as Record<string, unknown>
    const title =
      (typeof concept.title === 'string' && concept.title.trim()) ||
      'New series from Market Insights'
    const shortLogline =
      (typeof concept.logline === 'string' && concept.logline.trim()) || ''

    const ideaTopic = buildMarketInsightsIdeaTopic(concept)
    const genre = typeof bodyGenre === 'string' && bodyGenre.trim() ? bodyGenre.trim() : undefined

    const series = await Series.create({
      user_id: user.id,
      title: title.slice(0, 255),
      logline: shortLogline || undefined,
      genre,
      status: 'draft',
      max_episodes: DEFAULT_MAX_EPISODES,
      production_bible: emptyProductionBible(concept),
      episode_blueprints: [],
      metadata: {
        source: 'market_insights',
        ideaTopic,
        marketInsightsConcept: {
          title: concept.title,
          logline: concept.logline,
        },
      },
    })

    return NextResponse.json({
      success: true,
      seriesId: series.id,
      projectId: series.id,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Initialize failed'
    console.error('[POST /api/series/initialize]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
