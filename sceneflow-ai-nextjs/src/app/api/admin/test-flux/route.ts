import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
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
    } = await req.json();

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
      return NextResponse.json({ success: false, error: error.detail || "Failed to create prediction" }, { status: response.status });
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

  } catch (error: any) {
    console.error("Flux API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
