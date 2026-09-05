import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import '@/models'
import { Series } from '@/models/Series'
import { sequelize } from '@/config/database'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ seriesId: string }>
}

/**
 * POST /api/series/[seriesId]/share
 * Creates or returns a public read-only share link for the Series Bible.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { seriesId } = await params
    await sequelize.authenticate()

    const series = await Series.findByPk(seriesId)
    if (!series) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 })
    }

    const metadata = { ...(series.metadata || {}) } as Record<string, unknown>
    let token = metadata.shareToken as string | undefined
    if (!token) {
      token = randomBytes(16).toString('hex')
      metadata.shareToken = token
      metadata.shareCreatedAt = new Date().toISOString()
      await series.update({ metadata })
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://sceneflow.ai'
    return NextResponse.json({
      success: true,
      token,
      url: `${origin}/s/series/${token}`,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Share failed' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/series/[seriesId]/share — revoke public link
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { seriesId } = await params
    await sequelize.authenticate()
    const series = await Series.findByPk(seriesId)
    if (!series) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 })
    }

    const metadata = { ...(series.metadata || {}) } as Record<string, unknown>
    delete metadata.shareToken
    delete metadata.shareCreatedAt
    await series.update({ metadata })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Revoke failed' },
      { status: 500 }
    )
  }
}
