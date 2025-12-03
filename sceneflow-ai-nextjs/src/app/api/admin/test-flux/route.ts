import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300; // 5 minutes for video generation

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Check if this is a video generation request
    if (body.mode === 'video') {
      return handleVideoGeneration(body);
    }
    
    // Otherwise, handle image generation
    return handleImageGeneration(body);
  } catch (error: any) {
    console.error("Flux API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function handleVideoGeneration(body: any) {
  const { prompt, sourceImage, duration = 5 } = body;

  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json(
      { success: false, error: 'REPLICATE_API_TOKEN is not set in environment variables' },
      { status: 500 }
    );
  }

  if (!sourceImage) {
    return NextResponse.json(
      { success: false, error: 'Source image is required for video generation' },
      { status: 400 }
    );
  }

  // Use Stable Video Diffusion via Replicate for image-to-video
  const input: any = {
    input_image: sourceImage,
    motion_bucket_id: 127, // Higher = more motion
    fps: 24,
    cond_aug: 0.02,
    decoding_t: 7,
    video_length: duration === 3 ? 'short' : duration === 10 ? 'long' : 'medium',
  };

  // If prompt is provided, use a text-to-video model instead
  // For now, we'll use the image-to-video approach with SVD

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438", // stable-video-diffusion
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
    
    if (response.status === 402) {
      errorMessage = "❌ Payment Required: Your Replicate account needs billing setup";
    } else if (response.status === 401) {
      errorMessage = "❌ Invalid API Token";
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      statusCode: response.status 
    }, { status: response.status });
  }

  const prediction = await response.json();
  let status = prediction.status;
  let logs = "";
  let output = null;

  // Poll for completion (video takes longer)
  const getUrl = prediction.urls.get;
  let attempts = 0;
  const maxAttempts = 180; // 3 minutes max polling
  
  while (status !== "succeeded" && status !== "failed" && status !== "canceled" && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between polls
    attempts++;
    
    const pollResponse = await fetch(getUrl, {
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
      },
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
    imagePromptStrength = 0.05
  } = body;

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'REPLICATE_API_TOKEN is not set in environment variables' },
        { status: 500 }
      );
    }

    // Build input object
    const input: any = {
      prompt,
      aspect_ratio: aspectRatio,
      safety_tolerance: safetyTolerance,
      output_format: outputFormat,
      output_quality: outputQuality,
      prompt_upsampling: promptUpsampling
    };

    // Add seed if provided
    if (seed !== undefined && seed !== null) {
      input.seed = seed;
    }

    // Add reference images if provided (up to 3)
    // Flux 1.1 Pro supports multiple image_prompt parameters
    if (referenceImages && referenceImages.length > 0) {
      // Use up to 3 reference images
      const imagesToUse = referenceImages.slice(0, 3);
      if (imagesToUse.length === 1) {
        input.image_prompt = imagesToUse[0];
      } else if (imagesToUse.length === 2) {
        input.image_prompt = imagesToUse[0];
        input.image_prompt_2 = imagesToUse[1];
      } else if (imagesToUse.length === 3) {
        input.image_prompt = imagesToUse[0];
        input.image_prompt_2 = imagesToUse[1];
        input.image_prompt_3 = imagesToUse[2];
      }
      // Set strength for all reference images
      input.image_prompt_strength = imagePromptStrength;
    }

    // 1. Create Prediction
    const response = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input }),
    });

    if (response.status !== 201) {
      const error = await response.json();
      let errorMessage = error.detail || "Failed to create prediction";
      
      // Provide specific error messages based on status code
      if (response.status === 402) {
        errorMessage = "❌ Payment Required: Your Replicate account needs billing setup or has insufficient credits. Please add payment method at replicate.com/account/billing";
      } else if (response.status === 401) {
        errorMessage = "❌ Invalid API Token: Please check your REPLICATE_API_TOKEN environment variable";
      } else if (response.status === 429) {
        errorMessage = "❌ Rate Limited: Too many requests. Please wait a moment and try again";
      }
      
      return NextResponse.json({ 
        success: false, 
        error: errorMessage,
        statusCode: response.status 
      }, { status: response.status });
    }

    const prediction = await response.json();
    let status = prediction.status;
    let logs = "";
    let output = null;

    // 2. Poll for completion
    const getUrl = prediction.urls.get;
    
    while (status !== "succeeded" && status !== "failed" && status !== "canceled") {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
      
      const pollResponse = await fetch(getUrl, {
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        },
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
      imageUrl: Array.isArray(output) ? output[0] : output, // Flux 1.1 Pro returns a string URL (or array of strings)
      logs
    });
}
