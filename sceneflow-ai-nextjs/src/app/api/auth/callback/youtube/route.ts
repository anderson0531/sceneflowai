import { NextRequest } from 'next/server'
import { handleYouTubeOAuthCallback } from '@/lib/publish/youtubeOAuthCallback'

export const dynamic = 'force-dynamic'

/** Google OAuth redirect registered for https://sceneflowai.studio. */
export async function GET(req: NextRequest) {
  return handleYouTubeOAuthCallback(req)
}
