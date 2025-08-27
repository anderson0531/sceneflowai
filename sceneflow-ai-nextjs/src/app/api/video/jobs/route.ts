import { NextRequest, NextResponse } from 'next/server'
import { AsyncJobManager } from '@/services/AsyncJobManager'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const projectId = searchParams.get('projectId')
    const jobId = searchParams.get('jobId')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    const jobManager = AsyncJobManager.getInstance()

    // Get specific job status
    if (jobId) {
      const jobStatus = jobManager.getJobStatus(jobId)
      if (!jobStatus) {
        return NextResponse.json({
          success: false,
          error: 'Job not found'
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        job: jobStatus
      })
    }

    // Get all jobs for user or project
    let jobs
    if (projectId) {
      jobs = jobManager.getProjectJobs(projectId)
    } else {
      jobs = jobManager.getUserJobs(userId)
    }

    return NextResponse.json({
      success: true,
      jobs,
      count: jobs.length
    })

  } catch (error) {
    console.error('Error getting job status:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { action, jobId, userId } = body

    if (!action || !jobId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Action, job ID, and user ID are required'
      }, { status: 400 })
    }

    const jobManager = AsyncJobManager.getInstance()
    let success = false

    switch (action) {
      case 'cancel':
        success = jobManager.cancelJob(jobId)
        break
      case 'retry':
        success = jobManager.retryJob(jobId)
        break
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: cancel, retry'
        }, { status: 400 })
    }

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Job ${action} successful`,
        jobStatus: jobManager.getJobStatus(jobId)
      })
    } else {
      return NextResponse.json({
        success: false,
        error: `Failed to ${action} job`
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Error performing job action:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
