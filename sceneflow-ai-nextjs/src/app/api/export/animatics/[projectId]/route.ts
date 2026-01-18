/**
 * Animatic Streams API
 * 
 * Get all animatic render jobs for a project.
 * Used by the Final Cut phase to display available animatic production streams.
 */

import { NextRequest, NextResponse } from 'next/server'
import RenderJob from '@/models/RenderJob'
import { Op } from 'sequelize'

export interface AnimaticStream {
  id: string
  language: string
  languageLabel: string
  status: 'pending' | 'rendering' | 'complete' | 'failed'
  progress: number
  mp4Url: string | null
  resolution: '720p' | '1080p' | '4K'
  duration: number | null
  createdAt: string
  completedAt: string | null
  error: string | null
}

// Map RenderJob status to AnimaticStream status
function mapStatus(jobStatus: string): AnimaticStream['status'] {
  switch (jobStatus) {
    case 'QUEUED':
      return 'pending'
    case 'PROCESSING':
      return 'rendering'
    case 'COMPLETED':
      return 'complete'
    case 'FAILED':
    case 'CANCELLED':
      return 'failed'
    default:
      return 'pending'
  }
}

// Language code to label mapping
const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  'pt-br': 'Portuguese (Brazil)',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  hi: 'Hindi',
  ar: 'Arabic',
  ru: 'Russian',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId' },
        { status: 400 }
      )
    }

    // Get all animatic render jobs for this project
    const renderJobs = await RenderJob.findAll({
      where: {
        project_id: projectId,
        render_type: 'animatic',
      },
      order: [['created_at', 'DESC']],
    })

    // Group by language and take the most recent for each
    const latestByLanguage = new Map<string, typeof renderJobs[0]>()
    for (const job of renderJobs) {
      const lang = job.language || 'en'
      if (!latestByLanguage.has(lang)) {
        latestByLanguage.set(lang, job)
      }
    }

    // Convert to AnimaticStream format
    const streams: AnimaticStream[] = Array.from(latestByLanguage.values()).map(job => ({
      id: job.id,
      language: job.language || 'en',
      languageLabel: LANGUAGE_LABELS[job.language || 'en'] || job.language || 'English',
      status: mapStatus(job.status),
      progress: job.progress || 0,
      mp4Url: job.download_url,
      resolution: job.resolution,
      duration: job.estimated_duration,
      createdAt: job.created_at?.toISOString() || new Date().toISOString(),
      completedAt: job.completed_at?.toISOString() || null,
      error: job.error,
    }))

    // Sort by language label
    streams.sort((a, b) => a.languageLabel.localeCompare(b.languageLabel))

    return NextResponse.json({
      success: true,
      projectId,
      streams,
      totalRenders: renderJobs.length,
    })
  } catch (error) {
    console.error('[Animatics API] Error fetching animatic streams:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch animatic streams',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
