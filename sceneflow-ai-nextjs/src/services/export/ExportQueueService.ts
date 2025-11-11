import { PubSub, Topic } from '@google-cloud/pubsub'
import { ExportJob } from '@/models/ExportJob'

let pubsubClient: PubSub | null = null
let exportTopic: Topic | null = null

function getPubSub(): PubSub {
  if (!pubsubClient) {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON not configured for Pub/Sub publishing')
    }

    try {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
      pubsubClient = new PubSub({
        projectId: credentials.project_id,
        credentials,
      })
    } catch (error) {
      console.error('[ExportQueue] Failed to initialize Pub/Sub client', error)
      throw error
    }
  }

  return pubsubClient
}

function getJobTopic(): Topic {
  if (!exportTopic) {
    const topicName = process.env.EXPORT_JOBS_TOPIC
    if (!topicName) {
      throw new Error('EXPORT_JOBS_TOPIC environment variable not configured')
    }
    exportTopic = getPubSub().topic(topicName)
  }

  return exportTopic
}

export async function publishExportJob(job: ExportJob): Promise<void> {
  try {
    const topic = getJobTopic()
    const messageBuffer = Buffer.from(
      JSON.stringify({
        jobId: job.id,
        projectId: job.project_id,
        userId: job.user_id,
        payload: job.payload,
        metadata: job.metadata,
      })
    )

    await topic.publishMessage({ data: messageBuffer })
    console.log('[ExportQueue] Published export job', job.id)
  } catch (error) {
    console.error('[ExportQueue] Failed to publish job', job.id, error)
    throw error
  }
}
