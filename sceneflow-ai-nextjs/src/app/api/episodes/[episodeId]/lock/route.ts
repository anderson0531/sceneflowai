import { NextResponse } from 'next/server'

export async function POST(_req: Request, { params }: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = await params
  // TODO: persist lock
  return NextResponse.json({ ok: true, episodeId })
}
