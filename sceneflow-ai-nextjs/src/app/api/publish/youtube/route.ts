import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { list, put } from '@vercel/blob'
import { createPublishJob, updatePublishJob } from '@/lib/premiere/publishJobs'
import { appendSceneFlowCta } from '@/lib/premiere/distributionMetadata'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const CONNECTIONS_PREFIX = 'premiere/platform-connections/'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const listing = await list({ prefix: `${CONNECTIONS_PREFIX}${userId}/youtube.json`, limit: 1 })
    const blob = listing.blobs[0]
    if (!blob?.url) {
      const clientId = process.env.GOOGLE_CLIENT_ID
      return NextResponse.json({
        connected: false,
        authUrl: clientId
          ? `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(process.env.NEXTAUTH_URL + '/api/publish/youtube/callback')}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly')}&access_type=offline&prompt=consent`
          : null,
        message: clientId
          ? 'Connect your YouTube channel to publish directly.'
          : 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable YouTube OAuth.',
      })
    }

    const res = await fetch(blob.url, { cache: 'no-store' })
    const connection = res.ok ? await res.json() : null
    return NextResponse.json({
      connected: !!connection,
      accountName: connection?.accountName,
      channelId: connection?.channelId,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check connection'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      projectId?: string
      videoUrl?: string
      title?: string
      description?: string
      locale?: string
      privacyStatus?: string
      thumbnailUrl?: string
      tags?: string[]
      includeSceneFlowCta?: boolean
      categoryId?: string
      madeForKids?: boolean
    }

    const projectId = (body.projectId || '').trim()
    const videoUrl = (body.videoUrl || '').trim()
    const title = (body.title || '').trim()
    if (!projectId || !videoUrl || !title) {
      return NextResponse.json(
        { error: 'projectId, videoUrl, and title are required' },
        { status: 400 }
      )
    }

    const locale = body.locale || 'en'
    const description = appendSceneFlowCta(
      body.description || title,
      locale,
      body.includeSceneFlowCta !== false
    )

    const job = await createPublishJob({
      projectId,
      platform: 'youtube',
      videoUrl,
      title,
      description,
      locale,
      privacyStatus: body.privacyStatus || 'private',
      thumbnailUrl: body.thumbnailUrl,
    })

    const accessToken = process.env.YOUTUBE_ACCESS_TOKEN
    if (accessToken) {
      await updatePublishJob(projectId, job.id, { status: 'uploading' })
      try {
        const videoRes = await fetch(videoUrl)
        if (!videoRes.ok) throw new Error('Failed to fetch source video')
        const videoBuffer = Buffer.from(await videoRes.arrayBuffer())

        const metadata = {
          snippet: {
            title,
            description,
            tags: body.tags,
            categoryId: body.categoryId || '22',
            defaultLanguage: locale,
          },
          status: {
            privacyStatus: body.privacyStatus || 'private',
            selfDeclaredMadeForKids: body.madeForKids === true,
          },
        }

        const initRes = await fetch(
          'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'X-Upload-Content-Type': 'video/mp4',
              'X-Upload-Content-Length': String(videoBuffer.length),
            },
            body: JSON.stringify(metadata),
          }
        )

        if (!initRes.ok) {
          const errText = await initRes.text()
          throw new Error(errText || 'YouTube upload init failed')
        }

        const uploadUrl = initRes.headers.get('location')
        if (!uploadUrl) throw new Error('Missing YouTube upload URL')

        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'video/mp4' },
          body: videoBuffer,
        })

        if (!uploadRes.ok) {
          throw new Error(await uploadRes.text())
        }

        const result = await uploadRes.json()
        const videoId = result.id as string
        const platformUrl = `https://www.youtube.com/watch?v=${videoId}`

        if (body.thumbnailUrl) {
          try {
            const thumbRes = await fetch(body.thumbnailUrl)
            if (thumbRes.ok) {
              const thumbBuffer = Buffer.from(await thumbRes.arrayBuffer())
              await fetch(
                `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'image/jpeg',
                  },
                  body: thumbBuffer,
                }
              )
            }
          } catch {
            /* thumbnail optional */
          }
        }

        const completed = await updatePublishJob(projectId, job.id, {
          status: 'published',
          platformVideoId: videoId,
          platformUrl,
        })

        return NextResponse.json({ success: true, job: completed })
      } catch (uploadError: unknown) {
        const msg = uploadError instanceof Error ? uploadError.message : 'Upload failed'
        const failed = await updatePublishJob(projectId, job.id, {
          status: 'failed',
          error: msg,
        })
        return NextResponse.json({ success: false, job: failed, error: msg }, { status: 502 })
      }
    }

    const pending = await updatePublishJob(projectId, job.id, {
      status: 'pending',
      error:
        'YouTube OAuth not configured. Connect your channel or set YOUTUBE_ACCESS_TOKEN for server publish.',
    })

    return NextResponse.json({
      success: true,
      job: pending,
      message: 'Publish job saved. Connect YouTube to complete upload.',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Publish failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
