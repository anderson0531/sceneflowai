import { NextResponse } from 'next/server'

export async function POST(_req: Request, { params }: { params: { episodeId: string } }) {
  // TODO: persist lock
  return NextResponse.json({ ok: true, episodeId: params.episodeId })
}
