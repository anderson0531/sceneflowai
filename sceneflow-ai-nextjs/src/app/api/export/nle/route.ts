/**
 * NLE Timeline Export API Route (FCPXML v1.10 for DaVinci Resolve, Final Cut Pro & Premiere Pro)
 *
 * POST /api/export/nle
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  buildFcpxmlDocument,
  type BuildFcpxmlTimelineInput,
} from '@/lib/export/fcpxmlExport'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BuildFcpxmlTimelineInput
    if (!Array.isArray(body.videoClips) || body.videoClips.length === 0) {
      return NextResponse.json(
        { error: 'At least one video or storyboard clip is required for NLE export.' },
        { status: 400 }
      )
    }

    const validVideoClips = body.videoClips.filter(
      (c) => typeof c.assetUrl === 'string' && c.assetUrl.trim().length > 0
    )
    if (validVideoClips.length === 0) {
      return NextResponse.json(
        { error: 'No clips with valid media URLs found.' },
        { status: 400 }
      )
    }

    const fcpxml = buildFcpxmlDocument({
      ...body,
      videoClips: validVideoClips,
    })

    const safeFileSlug = (body.projectTitle || 'sceneflow-episode')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'sceneflow-episode'

    return new NextResponse(fcpxml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFileSlug}.fcpxml"`,
      },
    })
  } catch (error) {
    console.error('[NLE Export] Failed to generate FCPXML:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to generate FCPXML timeline.',
      },
      { status: 500 }
    )
  }
}
