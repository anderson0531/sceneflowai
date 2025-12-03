import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (body.mode === 'video') {
      return handleVideoGeneration(body);
    }
    
    return handleImageGeneration(body);
  } catch (error: any) {
    console.error("Image Generation Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function handleVideoGeneration(body: any) {
  const { sourceImage } = body;

  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json(
      { success: false, error: 'REPLICATE_API_TOKEN is not set' },
      { status: 500 }
    );
  }

  if (!sourceImage) {
    return NextResponse.json(
      { success: false, error: 'Source image is required for video generation' },
      { status: 400 }
    );
  }

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": "Token " + process.env.REPLICATE_API_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
      input: {
        input_image: sourceImage,
        motion_bucket_id: 127,
        fps: 24,
        cond_aug: 0.02,
        decoding_t: 7,
      }
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    let errorMessage = error.detail || "Failed to create video prediction";
    if (response.status === 402) errorMessage = "Payment Required";
    else if (response.status === 401) errorMessage = "Invalid API Token";
    return NextResponse.json({ success: false, error: errorMessage }, { status: response.status });
  }

  const prediction = await response.json();
  let status = prediction.status;
  let logs = "";
  let output = null;
  const getUrl = prediction.urls.get;
  let attempts = 0;
  
  while (status !== "succeeded" && status !== "failed" && status !== "canceled" && attempts < 180) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
    
    const pollResponse = await fetch(getUrl, {
      headers: { "Authorization": "Token " + process.env.REPLICATE_API_TOKEN },
    });
    
    const pollData = await pollResponse.json();
    status = pollData.status;
    logs = pollData.logs || "";
    output = pollData.output;
    
    if (status === "failed") {
      return NextResponse.json({ success: false, error: pollData.error || "Video generation failed", logs }, { status: 500 });
    }
  }

  if (status !== "succeeded") {
    return NextResponse.json({ success: false, error: "Video generation timed out", logs }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    videoUrl: Array.isArray(output) ? output[0] : output,
    logs
  });
}

async function handleImageGeneration(body: any) {
  const { 
    prompt, 
    aspectRatio = "16:9", 
    referenceImages = [], 
    outputQuality = 90,
    outputFormat = "jpg",
    safetyTolerance = 2,
    seed,
    promptUpsampling = true,
    imagePromptStrength = 0.05,
    platform = "fal",
    model = "flux-pro"
  } = body;

  if (platform === "imagen") {
    return handleImagenGeneration({ prompt, aspectRatio });
  } else if (platform === "fal") {
    return handleFalGeneration({ prompt, aspectRatio, model, referenceImages, imagePromptStrength });
  } else {
    return handleReplicateGeneration({ 
      prompt, aspectRatio, referenceImages, outputQuality, outputFormat, 
      safetyTolerance, seed, promptUpsampling, imagePromptStrength, model 
    });
  }
}

async function handleFalGeneration(params: any) {
  const { prompt, aspectRatio, model, referenceImages, imagePromptStrength } = params;

  if (!process.env.FAL_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'FAL_API_KEY is not set in environment variables' },
      { status: 500 }
    );
  }

  const modelMap: Record<string, string> = {
    "flux-pro": "fal-ai/flux-pro/v1.1",
    "flux-dev": "fal-ai/flux/dev",
    "flux-schnell": "fal-ai/flux/schnell",
  };

  const falModel = modelMap[model] || "fal-ai/flux-pro/v1.1";

  const input: any = {
    prompt,
    image_size: aspectRatio === "16:9" ? "landscape_16_9" : 
                aspectRatio === "9:16" ? "portrait_16_9" :
                aspectRatio === "1:1" ? "square" : "landscape_16_9",
    num_images: 1,
    enable_safety_checker: true,
  };

  if (referenceImages && referenceImages.length > 0) {
    input.image_url = referenceImages[0];
    input.strength = 1 - imagePromptStrength;
  }

  try {
    const submitResponse = await fetch("https://queue.fal.run/" + falModel, {
      method: "POST",
      headers: {
        "Authorization": "Key " + process.env.FAL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!submitResponse.ok) {
      const error = await submitResponse.json();
      throw new Error(error.detail || error.message || "FAL submission failed");
    }

    const submitData = await submitResponse.json();
    
    if (submitData.images && submitData.images.length > 0) {
      return NextResponse.json({
        success: true,
        imageUrl: submitData.images[0].url,
        provider: "fal",
        model: falModel,
      });
    }

    const requestId = submitData.request_id;
    let attempts = 0;

    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      const statusResponse = await fetch("https://queue.fal.run/" + falModel + "/requests/" + requestId + "/status", {
        headers: { "Authorization": "Key " + process.env.FAL_API_KEY },
      });

      const statusData = await statusResponse.json();

      if (statusData.status === "COMPLETED") {
        const resultResponse = await fetch("https://queue.fal.run/" + falModel + "/requests/" + requestId, {
          headers: { "Authorization": "Key " + process.env.FAL_API_KEY },
        });
        const resultData = await resultResponse.json();
        
        if (resultData.images && resultData.images.length > 0) {
          return NextResponse.json({
            success: true,
            imageUrl: resultData.images[0].url,
            provider: "fal",
            model: falModel,
          });
        }
      } else if (statusData.status === "FAILED") {
        throw new Error(statusData.error || "FAL generation failed");
      }
    }

    throw new Error("FAL generation timed out");
  } catch (error: any) {
    console.error("FAL Error:", error);
    console.log("Falling back to Replicate...");
    return handleReplicateGeneration({
      prompt,
      aspectRatio,
      referenceImages,
      imagePromptStrength,
      model,
      outputQuality: 90,
      outputFormat: "jpg",
      safetyTolerance: 2,
      promptUpsampling: true,
    });
  }
}

async function handleImagenGeneration(params: any) {
  const { prompt, aspectRatio } = params;

  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    return NextResponse.json(
      { success: false, error: 'GOOGLE_CLOUD_PROJECT is not set. Imagen requires Vertex AI setup.' },
      { status: 500 }
    );
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(baseUrl + "/api/admin/test-imagen", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, aspectRatio }),
    });

    const data = await response.json();
    
    if (data.success) {
      return NextResponse.json({
        success: true,
        imageUrl: data.imageUrl,
        provider: "imagen",
        model: "imagen-3",
      });
    } else {
      throw new Error(data.error || "Imagen generation failed");
    }
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: "Imagen error: " + error.message 
    }, { status: 500 });
  }
}

async function handleReplicateGeneration(params: any) {
  const { 
    prompt, aspectRatio, referenceImages, outputQuality, outputFormat, 
    safetyTolerance, seed, promptUpsampling, imagePromptStrength, model 
  } = params;

  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json(
      { success: false, error: 'REPLICATE_API_TOKEN is not set' },
      { status: 500 }
    );
  }

  const modelEndpoints: Record<string, string> = {
    "flux-pro": "black-forest-labs/flux-1.1-pro",
    "flux-dev": "black-forest-labs/flux-dev",
    "flux-schnell": "black-forest-labs/flux-schnell",
  };

  const replicateModel = modelEndpoints[model] || "black-forest-labs/flux-1.1-pro";

  const input: any = {
    prompt,
    aspect_ratio: aspectRatio,
    safety_tolerance: safetyTolerance,
    output_format: outputFormat,
    output_quality: outputQuality,
    prompt_upsampling: promptUpsampling
  };

  if (seed !== undefined && seed !== null) {
    input.seed = seed;
  }

  if (referenceImages && referenceImages.length > 0) {
    const imagesToUse = referenceImages.slice(0, 3);
    if (imagesToUse.length >= 1) input.image_prompt = imagesToUse[0];
    if (imagesToUse.length >= 2) input.image_prompt_2 = imagesToUse[1];
    if (imagesToUse.length >= 3) input.image_prompt_3 = imagesToUse[2];
    input.image_prompt_strength = imagePromptStrength;
  }

  const response = await fetch("https://api.replicate.com/v1/models/" + replicateModel + "/predictions", {
    method: "POST",
    headers: {
      "Authorization": "Token " + process.env.REPLICATE_API_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input }),
  });

  if (response.status !== 201) {
    const error = await response.json();
    let errorMessage = error.detail || "Failed to create prediction";
    if (response.status === 402) errorMessage = "Payment Required";
    else if (response.status === 401) errorMessage = "Invalid API Token";
    else if (response.status === 429) errorMessage = "Queue is full; wait and retry";
    return NextResponse.json({ success: false, error: errorMessage }, { status: response.status });
  }

  const prediction = await response.json();
  let status = prediction.status;
  let logs = "";
  let output = null;
  const getUrl = prediction.urls.get;
  
  while (status !== "succeeded" && status !== "failed" && status !== "canceled") {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const pollResponse = await fetch(getUrl, {
      headers: { "Authorization": "Token " + process.env.REPLICATE_API_TOKEN },
    });
    
    const pollData = await pollResponse.json();
    status = pollData.status;
    logs = pollData.logs;
    output = pollData.output;
    
    if (status === "failed") {
      return NextResponse.json({ success: false, error: pollData.error, logs }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    imageUrl: Array.isArray(output) ? output[0] : output,
    provider: "replicate",
    model: replicateModel,
    logs
  });
}
