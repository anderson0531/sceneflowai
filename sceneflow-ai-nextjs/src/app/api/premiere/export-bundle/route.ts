import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { put } from '@vercel/blob'
import archiver from 'archiver'
import { PassThrough } from 'stream'
import { appendSceneFlowCta, readPremiereDistribution } from '@/lib/premiere/distributionMetadata'
import '@/models'
import Project from '@/models/Project'
import { resolveUser } from '@/lib/userHelper'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

async function streamToBuffer(stream: PassThrough): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
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
      locale?: string
      title?: string
      description?: string
      tags?: string[]
      thumbnailUrl?: string
      includeSceneFlowCta?: boolean
    }

    const projectId = (body.projectId || '').trim()
    const videoUrl = (body.videoUrl || '').trim()
    const locale = body.locale || 'en'
    if (!projectId || !videoUrl) {
      return NextResponse.json({ error: 'projectId and videoUrl required' }, { status: 400 })
    }

    const user = await resolveUser(session.user.id)
    const project = await Project.findByPk(projectId)
    if (!project || project.user_id !== user.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const meta = (project.metadata as Record<string, unknown>) || {}
    const distribution = readPremiereDistribution(meta)
    const localeMeta = distribution?.locales?.[locale as keyof typeof distribution.locales]
    const title = body.title || localeMeta?.title || project.title || 'export'
    const description = appendSceneFlowCta(
      body.description || localeMeta?.description || `${title} — export bundle`,
      locale,
      body.includeSceneFlowCta !== false
    )
    const tags = body.tags || localeMeta?.tags || ['SceneFlow']
    const thumbnailUrl =
      body.thumbnailUrl ||
      localeMeta?.thumbnailUrl ||
      (meta.billboardUrl as string) ||
      (meta.billboardImageUrl as string)

    const archive = archiver('zip', { zlib: { level: 6 } })
    const passThrough = new PassThrough()
    archive.pipe(passThrough)

    const videoRes = await fetch(videoUrl)
    if (!videoRes.ok) throw new Error('Failed to fetch master video')
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer())
    archive.append(videoBuffer, { name: 'master.mp4' })

    if (thumbnailUrl) {
      try {
        const thumbRes = await fetch(thumbnailUrl)
        if (thumbRes.ok) {
          archive.append(Buffer.from(await thumbRes.arrayBuffer()), { name: 'thumbnail.jpg' })
        }
      } catch {
        /* optional thumbnail */
      }
    }

    archive.append(
      JSON.stringify(
        {
          title,
          description,
          tags,
          locale,
          platformHints: {
            youtube: { aspect: '16:9', maxDurationSec: null },
            youtubeShorts: { aspect: '9:16', maxDurationSec: 60 },
            instagramReels: { aspect: '9:16', maxDurationSec: 90 },
            tiktok: { aspect: '9:16', maxDurationSec: 180 },
          },
        },
        null,
        2
      ),
      { name: 'metadata.json' }
    )

    await archive.finalize()
    const zipBuffer = await streamToBuffer(passThrough)

    const safeSlug = title.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 40)
    const blob = await put(
      `premiere/bundles/${projectId}/${safeSlug}-${locale}-${Date.now()}.zip`,
      zipBuffer,
      {
        access: 'public',
        contentType: 'application/zip',
      }
    )

    return NextResponse.json({
      success: true,
      downloadUrl: blob.url,
      locale,
      title,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Export bundle failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
