import { NextRequest, NextResponse } from 'next/server'
import { Op } from 'sequelize'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { AIUsage } from '@/models'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function periodToDays(period: string): number {
  if (period === 'today') return 1
  if (period === 'month') return 30
  return 7
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return 'No usage'
  const diffMin = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000))
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hr ago`
  return `${Math.floor(diffHr / 24)}d ago`
}

/**
 * GET /api/admin/credits/usage
 * Real Postgres-backed COGS & usage breakdown from `ai_usage` (replaces legacy mock data).
 */
export async function GET(request: NextRequest) {
  const session = await requireAdminSession()
  if (!session.authorized) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'week'
  const days = periodToDays(period)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  try {
    const rows = await AIUsage.findAll({
      where: {
        created_at: { [Op.gte]: since },
      },
      order: [['created_at', 'DESC']],
      limit: 10_000,
    })

    const breakdownMap = new Map<
      string,
      {
        provider: string
        service: string
        count: number
        estimatedCost: number
        lastUsedDate: Date | null
      }
    >()

    const dailyMap = new Map<
      string,
      { date: string; google: number; elevenlabs: number; totalCost: number }
    >()

    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      dailyMap.set(key, { date: key, google: 0, elevenlabs: 0, totalCost: 0 })
    }

    let googleCost = 0
    let elevenlabsCost = 0
    let totalEstimatedCost = 0

    for (const row of rows as any[]) {
      const cogs = Number(row.cogs_usd || 0)
      const model = String(row.model || 'unknown')
      const category = String(row.category || 'other')
      const meta = (row.meta || {}) as Record<string, unknown>
      const opLower = String(meta.operation || '').toLowerCase()
      const vendorLower = String(meta.vendor || '').toLowerCase()
      const modelLower = model.toLowerCase()
      const isEleven =
        vendorLower === 'elevenlabs' ||
        modelLower.includes('eleven') ||
        opLower.includes('eleven')
      const isKling =
        vendorLower === 'kling' || modelLower.includes('kling') || opLower.includes('kling')
      const isFal = vendorLower === 'fal' || modelLower.includes('fal') || opLower.includes('fal')
      const isOpenAI =
        vendorLower === 'openai' ||
        row.provider === 'openai' ||
        modelLower.includes('gpt-image') ||
        modelLower.includes('dall')
      const isAggregator = vendorLower === 'aggregator' || opLower.includes('aggregator')
      const isCloudRun = vendorLower === 'cloud_run' || opLower.includes('render')
      const providerLabel = isEleven
        ? 'ElevenLabs'
        : isKling
          ? 'Kling AI'
          : isFal
            ? 'Fal AI'
            : isAggregator
              ? 'Video Aggregator'
              : isOpenAI
                ? 'OpenAI'
                : isCloudRun
                  ? 'GCP Cloud Run'
                  : meta.providerBackend === 'ai_gateway'
                    ? 'Vercel AI Gateway'
                    : 'Google Vertex AI'

      const serviceLabel =
        category === 'text'
          ? `LLM Text (${model})`
          : category === 'video'
            ? `Video (${model})`
            : category === 'images'
              ? `Image (${model})`
              : category === 'tts'
                ? `Audio / TTS (${model})`
                : `Other (${model})`

      const key = `${providerLabel}::${serviceLabel}`
      const existing = breakdownMap.get(key) ?? {
        provider: providerLabel,
        service: serviceLabel,
        count: 0,
        estimatedCost: 0,
        lastUsedDate: null,
      }

      const units =
        category === 'text'
          ? Number(row.input_tokens || 0) + Number(row.output_tokens || 0)
          : category === 'images'
            ? Math.max(1, Number(row.image_count || 1))
            : 1

      existing.count += units
      existing.estimatedCost += cogs
      const rowDate = row.created_at ? new Date(row.created_at) : null
      if (rowDate && (!existing.lastUsedDate || rowDate > existing.lastUsedDate)) {
        existing.lastUsedDate = rowDate
      }
      breakdownMap.set(key, existing)

      totalEstimatedCost += cogs
      if (isEleven) elevenlabsCost += cogs
      else googleCost += cogs

      if (rowDate) {
        const dayKey = rowDate.toISOString().split('T')[0]
        const dayEntry = dailyMap.get(dayKey)
        if (dayEntry) {
          if (isEleven) dayEntry.elevenlabs += 1
          else dayEntry.google += 1
          dayEntry.totalCost = Number((dayEntry.totalCost + cogs).toFixed(4))
        }
      }
    }

    const breakdown = Array.from(breakdownMap.values())
      .map((item) => ({
        provider: item.provider,
        service: item.service,
        count: item.count,
        estimatedCost: Number(item.estimatedCost.toFixed(4)),
        lastUsed: formatRelativeTime(item.lastUsedDate),
      }))
      .sort((a, b) => b.estimatedCost - a.estimatedCost)

    return NextResponse.json({
      source: 'database',
      totalEstimatedCost: Number(totalEstimatedCost.toFixed(4)),
      googleCost: Number(googleCost.toFixed(4)),
      elevenlabsCost: Number(elevenlabsCost.toFixed(4)),
      breakdown,
      dailyUsage: Array.from(dailyMap.values()),
      period,
    })
  } catch (error) {
    console.error('Failed to fetch real credit usage:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credit usage' },
      { status: 500 }
    )
  }
}
