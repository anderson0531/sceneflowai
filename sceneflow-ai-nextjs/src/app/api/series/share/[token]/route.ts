import { NextRequest, NextResponse } from 'next/server'
import { QueryTypes } from 'sequelize'
import '@/models'
import { Series } from '@/models/Series'
import { sequelize } from '@/config/database'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * GET /api/series/share/[token]
 * Public read-only Series Bible payload for share links.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params
    await sequelize.authenticate()

    const rows = await sequelize.query<{ id: string }>(
      `SELECT id FROM series WHERE metadata->>'shareToken' = :token LIMIT 1`,
      { replacements: { token }, type: QueryTypes.SELECT }
    )
    const row = Array.isArray(rows) ? rows[0] : undefined
    if (!row?.id) {
      return NextResponse.json({ success: false, error: 'Share link not found' }, { status: 404 })
    }

    const series = await Series.findByPk(row.id)
    if (!series) {
      return NextResponse.json({ success: false, error: 'Share link not found' }, { status: 404 })
    }

    const bible = series.production_bible || {}
    return NextResponse.json({
      success: true,
      title: series.title,
      logline: series.logline || bible.logline,
      genre: series.genre,
      bible: {
        version: bible.version,
        synopsis: bible.synopsis,
        setting: bible.setting,
        protagonist: bible.protagonist,
        characters: (bible.characters || []).map(
          (c: { name: string; role: string; description: string }) => ({
            name: c.name,
            role: c.role,
            description: c.description,
          })
        ),
        storyThreads: bible.storyThreads,
        keyEvents: bible.keyEvents,
      },
      episodeCount: series.episode_blueprints?.length || 0,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Load failed' },
      { status: 500 }
    )
  }
}
