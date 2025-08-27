import { NextRequest, NextResponse } from 'next/server'
import { CollaborationService } from '@/services/CollaborationService'

export async function POST(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const form = await req.formData()
  const ideaId = String(form.get('ideaId') || '')
  const content = String(form.get('content') || '')
  if (!content) return NextResponse.redirect(new URL(`/collaborate/${params.sessionId}`, req.url))

  const collabId = 'guest_' + Math.random().toString(36).slice(2, 9)
  await CollaborationService.submitFeedback(params.sessionId, collabId, ideaId, 'general', content)

  return NextResponse.redirect(new URL(`/collaborate/${params.sessionId}`, req.url))
}
