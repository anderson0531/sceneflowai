import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * @deprecated Full-balance edits use POST /api/treatment/guided-revise/start (Inngest job).
 * Single-section edits use POST /api/treatment/refine.
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      message:
        'This endpoint is deprecated. Use POST /api/treatment/guided-revise/start for full-balance edits, or POST /api/treatment/refine for a single section.',
      code: 'deprecated_route',
    },
    { status: 410 }
  )
}
