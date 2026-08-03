import { NextRequest, NextResponse } from 'next/server';
import { getStorageClient } from '@/lib/storage/gcs';
import { getVertexAIAuthToken } from '@/lib/vertexai/client';
import { getImagenSafetyFilterLevel, getImagenPersonGeneration } from '@/lib/vertexai/safety';

export const maxDuration = 120; // Increased for new AI image models

export async function POST(req: NextRequest) {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    const { gcsUri, prompt, subjectDescription } = await req.json();

    if (!gcsUri) throw new Error('GCS URI is required');

    log(`1. Starting test for: ${gcsUri}`);
    
    // --- Step 1: Download Reference Image ---
    const match = gcsUri.match(/^gs:\/\/([^\/]+)\/(.+)$/);
    if (!match) throw new Error('Invalid GCS URI format. Must be gs://bucket/path');
    
    const [, bucket, object] = match;
    
    // Use the shared storage client which handles credentials properly
    const storage = getStorageClient();
    log(`2. Downloading from bucket: ${bucket}`);
    
    const [buf] = await storage.bucket(bucket).file(object).download();
    const base64Image = buf.toString('base64');
    log(`3. Image downloaded. Size: ${buf.length} bytes`);

    // --- Step 2: Prepare Vertex AI Request ---
    // Use the shared auth helper which handles credentials properly
    const accessToken = await getVertexAIAuthToken();
    
    const projectId = process.env.GCP_PROJECT || 'gen-lang-client-0596406756';
    const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-capability-001:predict`;

    // Construct the payload
    const payload = {
      instances: [{
        prompt: prompt || "A portrait of [1] in a studio setting.",
        referenceImages: [{
          referenceType: "REFERENCE_TYPE_SUBJECT",
          referenceId: 1,
          referenceImage: { bytesBase64Encoded: base64Image },
          subjectImageConfig: {
            subjectType: "SUBJECT_TYPE_PERSON",
            subjectDescription: subjectDescription || "person [1]"
          }
        }]
      }],
      parameters: {
        sampleCount: 1,
        aspectRatio: "1:1",
        personGeneration: getImagenPersonGeneration(),
        safetySetting: getImagenSafetyFilterLevel()
      }
    };

    log(`4. Sending request to Vertex AI...`);
    log(`   Prompt: "${payload.instances[0].prompt}"`);
    log(`   Subject Desc: "${payload.instances[0].referenceImages[0].subjectImageConfig.subjectDescription}"`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      log(`ERROR: API responded with ${response.status}`);
      throw new Error(JSON.stringify(result));
    }

    log(`5. Success! Image generated.`);

    const generatedBase64 = result.predictions?.[0]?.bytesBase64Encoded;

    return NextResponse.json({
      success: true,
      logs,
      referenceBase64: base64Image,
      generatedBase64: generatedBase64,
      rawResponse: result
    });

  } catch (error: any) {
    log(`FATAL ERROR: ${error.message}`);
    return NextResponse.json({
      success: false,
      logs,
      error: error.message
    }, { status: 500 });
  }
}
