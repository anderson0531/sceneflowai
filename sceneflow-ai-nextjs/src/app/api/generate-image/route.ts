import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const { prompt, options } = await req.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Image prompt is required' },
        { status: 400 }
      );
    }

    // Use Google Generative AI (Gemini/Imagen) for image generation
    const googleApiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    
    if (!googleApiKey) {
      console.error('Google API key not found in environment variables (GOOGLE_GEMINI_API_KEY / GOOGLE_API_KEY)');
      return NextResponse.json(
        { error: 'Google API key not configured' },
        { status: 500 }
      );
    }

    console.log('🎨 Google: Generating image with prompt:', prompt);

    try {
      const traceId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      // Create a compelling image prompt for the film billboard
      const enhancedPrompt = `Create a cinematic billboard image for a film with the following requirements: ${prompt}
      
      Style: Professional film poster, cinematic lighting, high contrast, suitable for billboard display
      Quality: High-resolution, professional photography, visually striking
      Composition: Dramatic, eye-catching, film marketing quality
      Camera: Wide angle, cinematic framing
      Lighting: Dramatic, high contrast, professional studio lighting
      Aspect ratio: 16:9 landscape for billboard display`;
      
      console.log('🎨 Enhanced prompt created:', enhancedPrompt);

      // Try SDK first with Gemini 2.5 Pro (if it supports inline image generation)
      // Fallback to Imagen 3 predict endpoint if SDK path doesn't yield image bytes
      const genAI = new GoogleGenerativeAI(googleApiKey);
      const sdkModel = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

      let response: Response | undefined;
      let primaryStatus = 0;
      let primaryBodyText: string | undefined;
      let billingRequired = false;
      let rateLimited = false;

      let data: any = null;
      let selectedModel: string = 'gemini-2.5-pro';
      let usedPath: 'sdk' | 'predict' = 'sdk';
      try {
        const sdkResult = await sdkModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: enhancedPrompt }] }]
        });
        data = sdkResult?.response;
      } catch (sdkErr) {
        // If SDK fails or doesn't return inlineData, go to predict endpoint
        usedPath = 'predict';
      }

      if (usedPath === 'predict') {
        selectedModel = 'imagen-3.0-generate-002';
        const primaryUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:predict?key=${googleApiKey}`;
        const requestBody = {
          instances: [
            {
              prompt: enhancedPrompt
            }
          ],
          parameters: {
            sampleCount: Math.min(Math.max(Number(options?.numberOfImages) || 1, 1), 4),
            aspectRatio: typeof options?.aspectRatio === 'string' ? options.aspectRatio : '16:9'
          }
        } as const;

        response = await fetch(primaryUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        primaryStatus = response.status;
        if (!response.ok) {
          try { primaryBodyText = await response.clone().text(); } catch {}
          try {
            const maybeErr = primaryBodyText ? JSON.parse(primaryBodyText) : undefined;
            const errMsg: string | undefined = maybeErr?.error?.message || maybeErr?.message;
            if (typeof errMsg === 'string' && errMsg.toLowerCase().includes('billed users')) {
              billingRequired = true;
            }
            if ((maybeErr?.error?.code === 429) || (maybeErr?.error?.status === 'RESOURCE_EXHAUSTED') || (typeof errMsg === 'string' && errMsg.toLowerCase().includes('quota'))) {
              rateLimited = true;
            }
          } catch {}
        }

        try {
          data = await response.json();
        } catch {}
      }

      // No secondary fallback to non-existent models; keep single-source of truth
      const fallbackStatus = undefined as unknown as number | undefined;
      console.log('🎨 Google: API response received');

      // Extract the generated image from Imagen response
      let imageUrl = '';
      const images: { dataUrl: string; mimeType: string }[] = [];
      
      let partsCount = 0;
      let partKinds: string[] = [];
      try {
        // New Imagen 3 predict format: look for predictions array
        if (Array.isArray(data?.predictions) && data.predictions.length > 0) {
          const first = data.predictions[0];
          // Common fields that may contain image bytes
          const b64 = first?.bytesBase64Encoded || first?.b64Image || first?.image || first?.data;
          const mime = first?.mimeType || first?.mime || (typeof b64 === 'string' ? 'image/png' : undefined);
          if (typeof b64 === 'string') {
            imageUrl = b64.startsWith('data:') ? b64 : `data:${mime || 'image/png'};base64,${b64}`;
            images.push({ dataUrl: imageUrl, mimeType: mime || 'image/png' });
          }
          // Some responses may include an array of images
          if (!imageUrl && Array.isArray(first?.images) && first.images.length > 0) {
            const img0 = first.images[0];
            const imgB64 = img0?.bytesBase64Encoded || img0?.b64Image || img0?.data;
            const imgMime = img0?.mimeType || 'image/png';
            if (typeof imgB64 === 'string') {
              imageUrl = `data:${imgMime};base64,${imgB64}`;
              images.push({ dataUrl: imageUrl, mimeType: imgMime });
            }
          }
          // Collect any additional images if provided
          if (Array.isArray(first?.images)) {
            for (let i = 1; i < first.images.length; i++) {
              const im = first.images[i];
              const b = im?.bytesBase64Encoded || im?.b64Image || im?.data;
              const m = im?.mimeType || 'image/png';
              if (typeof b === 'string') {
                images.push({ dataUrl: `data:${m};base64,${b}`, mimeType: m });
              }
            }
          }
        }

        // Back-compat: Responses API style
        if (data?.candidates?.[0]?.content?.parts?.length) {
          partsCount = data.candidates[0].content.parts.length;
          for (const part of data.candidates[0].content.parts) {
            const kind = (part.inlineData || part.inline_data) ? 'inlineData' : (part.fileData || part.file_data ? 'fileData' : (part.text ? 'text' : 'unknown'));
            partKinds.push(kind);
            const inlineA = part.inlineData;
            const inlineB = part.inline_data;
            const fileA = part.fileData;
            const fileB = part.file_data;
            if (inlineA?.mimeType?.startsWith('image/') && inlineA?.data) {
              imageUrl = `data:${inlineA.mimeType};base64,${inlineA.data}`;
              images.push({ dataUrl: imageUrl, mimeType: inlineA.mimeType });
              break;
            }
            if (inlineB?.mimeType?.startsWith('image/') && inlineB?.data) {
              imageUrl = `data:${inlineB.mimeType};base64,${inlineB.data}`;
              images.push({ dataUrl: imageUrl, mimeType: inlineB.mimeType });
              break;
            }
            // Some responses may nest under 'fileData' or provide 'data' with default mime
            if (fileA?.mimeType?.startsWith('image/') && fileA?.data) {
              imageUrl = `data:${fileA.mimeType};base64,${fileA.data}`;
              images.push({ dataUrl: imageUrl, mimeType: fileA.mimeType });
              break;
            }
            if (fileB?.mimeType?.startsWith('image/') && fileB?.data) {
              imageUrl = `data:${fileB.mimeType};base64,${fileB.data}`;
              images.push({ dataUrl: imageUrl, mimeType: fileB.mimeType });
              break;
            }
          }
        }
      } catch (e) {
        console.warn('🎨 Could not parse inline image data:', e)
      }

      // Additional fallbacks: check for top-level image fields some SDKs return
      if (!imageUrl) {
        const maybe = (data?.candidates?.[0]?.content?.parts?.[0]?.data) || data?.image || data?.imageUrl;
        if (typeof maybe === 'string') {
          imageUrl = maybe.startsWith('data:') || maybe.startsWith('http') ? maybe : `data:image/png;base64,${maybe}`
          images.push({ dataUrl: imageUrl, mimeType: 'image/png' });
        }
      }

      const payload = {
        imageUrl,
        images,
        prompt: enhancedPrompt,
        message: imageUrl ? 'Image generated successfully' : 'No image bytes returned',
        model: selectedModel,
        traceId,
        primaryStatus,
        fallbackStatus,
        partsCount,
        partKinds
      } as const;

      if (!imageUrl) {
        if (billingRequired) {
          return NextResponse.json({ 
            success: false, 
            ...payload, 
            primaryBodyText, 
            errorCode: 'BILLING_REQUIRED',
            message: 'Google Imagen requires a billed Google AI Studio project. Add billing to your API key and try again.'
          }, { status: 402 });
        }
        if (rateLimited) {
          return NextResponse.json({
            success: false,
            ...payload,
            primaryBodyText,
            errorCode: 'RATE_LIMITED',
            message: 'Rate limit exceeded. Please wait a minute and try again.'
          }, { status: 429 });
        }
        return NextResponse.json({ success: false, ...payload, primaryBodyText }, { status: 502 });
      }

      return NextResponse.json({ success: true, ...payload });
      
    } catch (imagenError) {
      console.error('🎨 Google image generation error:', imagenError);
      
      // Return error with details
      return NextResponse.json({
        success: false,
        error: 'Failed to generate image with Google',
        details: imagenError instanceof Error ? imagenError.message : 'Unknown error',
        prompt
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error in image generation:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
