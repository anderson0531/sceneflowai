import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import Series from '@/models/Series'
import { sequelize } from '@/config/database'
import { uploadImageToBlob } from '@/lib/storage/blob'
import {
  assertSeriesImageGenConfigured,
  cloneSeriesMetadata,
  generateSeriesThumbnailImage,
} from '@/lib/series/thumbnailPrompt'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  try {
    const { seriesId } = await params

    if (!seriesId) {
      return NextResponse.json(
        { success: false, error: 'Series ID is required' },
        { status: 400 }
      )
    }

    const configError = assertSeriesImageGenConfigured()
    if (configError) {
      return NextResponse.json({ success: false, error: configError }, { status: 500 })
    }

    await sequelize.authenticate()

    const series = await Series.findByPk(seriesId)
    if (!series) {
      return NextResponse.json({
        success: false,
        error: 'Series not found',
      }, { status: 404 })
    }

    let customPrompt: string | undefined
    try {
      const body = await request.json()
      customPrompt = typeof body?.customPrompt === 'string' ? body.customPrompt : undefined
    } catch {
      // Empty body is fine for default prompt
    }

    console.log('[Series Thumbnail] Generating with Vertex Imagen...')
    const { base64: base64Image, promptUsed: enhancedPrompt, attempt } =
      await generateSeriesThumbnailImage(series, customPrompt)
    console.log('[Series Thumbnail] Succeeded on attempt', attempt)

    console.log('[Series Thumbnail] Uploading to GCS...')
    const blobUrl = await uploadImageToBlob(
      base64Image,
      `thumbnails/${seriesId}-${Date.now()}.png`,
      seriesId
    )
    console.log('[Series Thumbnail] Uploaded:', blobUrl)

    const existingMeta = cloneSeriesMetadata(series.metadata)
    const updatedMetadata = {
      ...existingMeta,
      thumbnailUrl: blobUrl,
      thumbnail: blobUrl,
      thumbnailPrompt: enhancedPrompt,
      thumbnailGeneratedAt: new Date().toISOString(),
    }

    await series.update({ metadata: updatedMetadata })
    await series.reload()

    console.log('[Series Thumbnail] Saved thumbnail for series:', seriesId)

    return NextResponse.json({
      success: true,
      thumbnailUrl: blobUrl,
      promptUsed: enhancedPrompt,
      model: 'imagen-3.0-fast-generate-001',
      provider: 'vertex-ai-imagen',
      storageType: 'gcs',
    })
  } catch (error) {
    console.error('[Series Thumbnail] Generation error:', error)
    const message =
      error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
