import { NextRequest, NextResponse } from 'next/server'
import { getVertexAIAuthToken } from '@/lib/vertexai/client'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import { writeFile, readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic)
}

async function convertAudio(inputBuffer: Buffer): Promise<Buffer> {
  const inputPath = join(tmpdir(), `${uuidv4()}_in.tmp`)
  const outputPath = join(tmpdir(), `${uuidv4()}_out.wav`)

  try {
    await writeFile(inputPath, inputBuffer)

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec('pcm_s16le') // LINEAR16
        .audioFrequency(24000)   // 24kHz
        .audioChannels(1)        // mono
        .format('wav')
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(outputPath)
    })

    const outputBuffer = await readFile(outputPath)
    return outputBuffer
  } finally {
    try { await unlink(inputPath) } catch (e) {}
    try { await unlink(outputPath) } catch (e) {}
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // We expect consentAudio and files (training audio)
    const consentAudioFile = formData.get('consentAudio') as File
    const files = formData.getAll('files') as File[]

    if (!consentAudioFile) {
      return NextResponse.json({ error: 'Consent audio is required for Google Voice Cloning' }, { status: 400 })
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Training audio samples are required' }, { status: 400 })
    }

    // Get Auth Token
    const apiKey = process.env.GOOGLE_API_KEY
    let accessToken: string | null = null

    try {
      accessToken = await getVertexAIAuthToken()
    } catch (e) {
      console.log('[Google Voice Clone] No service account token available, checking API key.')
    }

    if (!accessToken && !apiKey) {
      return NextResponse.json({ error: 'Google API credentials not configured' }, { status: 500 })
    }

    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (accessToken) {
      authHeaders['Authorization'] = `Bearer ${accessToken}`
    } else {
      authHeaders['X-Goog-Api-Key'] = apiKey!
    }

    // Process Consent Audio
    const consentBuffer = Buffer.from(await consentAudioFile.arrayBuffer())
    const convertedConsentBuffer = await convertAudio(consentBuffer)

    // Process Training Audio (We will concatenate them if there are multiple, or just use the first one since Google typically needs ~10s)
    // To keep it simple, we'll convert and concatenate the training files
    const convertedTrainingBuffers: Buffer[] = []
    for (const file of files) {
      const buf = Buffer.from(await file.arrayBuffer())
      convertedTrainingBuffers.push(await convertAudio(buf))
    }

    // For WAV (LINEAR16), we can't just concat the raw buffers because of WAV headers.
    // However, if we just use the first file, it's easier and usually sufficient (since the director prompt is ~10-15s).
    // Let's use the first one as referenceAudio.
    const referenceAudioBuffer = convertedTrainingBuffers[0]

    const requestBody = {
      languageCode: 'en-US',
      consentScript: "I am the owner of this voice and I consent to Google using this voice to create a synthetic voice model.",
      referenceAudio: {
        audioConfig: {
          audioEncoding: "LINEAR16",
          sampleRateHertz: 24000
        },
        audioBytes: referenceAudioBuffer.toString('base64')
      },
      voiceTalentConsent: {
        audioConfig: {
          audioEncoding: "LINEAR16",
          sampleRateHertz: 24000
        },
        audioBytes: convertedConsentBuffer.toString('base64')
      }
    }

    const apiUrl = 'https://texttospeech.googleapis.com/v1beta1/voices:generateVoiceCloningKey'

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(requestBody),
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error('[Google Voice Clone] API Error:', responseData)
      return NextResponse.json(
        { error: responseData.error?.message || 'Failed to generate voice cloning key' },
        { status: response.status }
      )
    }

    // responseData should contain { voiceCloningKey: "..." }
    if (!responseData.voiceCloningKey) {
      return NextResponse.json({ error: 'No voice cloning key returned from Google' }, { status: 500 })
    }

    return NextResponse.json({
      voice: {
        id: responseData.voiceCloningKey,
        name: formData.get('name') || 'Google Custom Voice'
      }
    })

  } catch (error) {
    console.error('[Google Voice Clone] Server Error:', error)
    return NextResponse.json({ error: 'Internal server error during voice cloning' }, { status: 500 })
  }
}
