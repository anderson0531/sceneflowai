import { NextRequest, NextResponse } from 'next/server';
import { generateImageWithGemini } from '@/lib/gemini/imageClient';
import { GEMINI_IMAGE_MODELS } from '@/lib/config/modelConfig';

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const { prompt, options } = await req.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Image prompt is required' },
        { status: 400 }
      );
    }

    // Use Vertex AI for image generation (pay-as-you-go, no free tier limits)
    const projectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID;
    const location = process.env.VERTEX_LOCATION || process.env.GCP_REGION || 'us-central1';
    
    if (!projectId) {
      console.error('Vertex AI not configured (VERTEX_PROJECT_ID required)');
      return NextResponse.json(
        { error: 'Vertex AI not configured' },
        { status: 500 }
      );
    }

    console.log('🎨 Vertex AI: Generating image with prompt:', prompt);

    try {
      const startedAt = Date.now();
      const traceId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      
      // Create a compelling image prompt for the film thumbnail
      const sanitize = (p: string) => p
        .replace(/\b(16\s*[:x]\s*9|9\s*[:x]\s*16)\b/gi, '')
        .replace(/\b(1024|1536|1792)\s*x\s*(1024|1536|1792)\b/gi, '')
        .replace(/aspect\s*ratio\s*:?\s*[^\n]+/gi, '')
        .replace(/resolution\s*:?\s*[^\n]+/gi, '')
        .trim();
      const enhancedPrompt = `Create an engaging and cinematic 16:9 thumbnail image for a film with the following requirements: ${sanitize(prompt)}
      
      Style: Professional film poster, cinematic lighting, high contrast, suitable for thumbnail display
      Quality: High-resolution, professional photography, visually striking
      Composition: Dramatic, eye-catching, film marketing quality
      Camera: Wide angle, cinematic framing
      Lighting: Dramatic, high contrast, professional studio lighting
      Aspect ratio: 16:9 landscape for thumbnail display`;
      
      console.log('🎨 Enhanced prompt created:', enhancedPrompt);

      // If caller requests OpenAI directly, use it immediately
      if (options?.forceOpenAI) {
        const openaiKey = process.env.OPENAI_API_KEY
        if (!openaiKey) {
          return NextResponse.json({ success: false, error: 'OPENAI_API_KEY not configured', traceId }, { status: 500 })
        }
        const openaiResp = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: 'gpt-image-1',
            prompt: enhancedPrompt,
            size: 'auto',
            quality: 'high',
            n: 1
          })
        })
        if (openaiResp.ok) {
          const oj = await openaiResp.json()
          const b64 = oj?.data?.[0]?.b64_json
          if (typeof b64 === 'string' && b64.length > 50) {
            const openaiImage = `data:image/png;base64,${b64}`
            return NextResponse.json({ success: true, imageUrl: openaiImage, images: [{ dataUrl: openaiImage, mimeType: 'image/png' }], prompt: enhancedPrompt, model: 'gpt-image-1', provider: 'openai', traceId })
          }
        }
        return NextResponse.json({ success: false, error: 'OpenAI image generation failed', traceId }, { status: 500 })
      }

      // Gemini Image on Vertex (Imagen endpoints were retired 2026-06-30)
      let imageUrl = '';
      const images: { dataUrl: string; mimeType: string }[] = [];
      const selectedModel = GEMINI_IMAGE_MODELS.flash;
      let providerUsed: 'vertex-gemini' | 'openai' | 'none' = 'none';
      let primaryStatus = 0;
      let primaryBodyText: string | undefined;

      try {
        const dataUrl = await generateImageWithGemini(enhancedPrompt, {
          aspectRatio: '16:9',
          numberOfImages: 1,
          quality: 'fast',
        });

        const match = dataUrl.match(/^data:([^;]+);base64,/);
        if (match) {
          imageUrl = dataUrl;
          images.push({ dataUrl, mimeType: match[1] });
          providerUsed = 'vertex-gemini';
          primaryStatus = 200;
        }
      } catch (imageError) {
        primaryBodyText = imageError instanceof Error ? imageError.message : String(imageError);
        console.error('🎨 Vertex Gemini Image request failed:', primaryBodyText);
      }

      const payload = {
        imageUrl,
        images,
        prompt: enhancedPrompt,
        message: imageUrl ? 'Image generated successfully' : 'No image bytes returned',
        model: selectedModel,
        traceId,
        primaryStatus,
        durationMs: Date.now() - startedAt
      } as const;

      if (!imageUrl) {
        // Fallback to OpenAI if Vertex AI fails
        try {
          const openaiKey = process.env.OPENAI_API_KEY
          if (openaiKey) {
            const openaiResp = await fetch('https://api.openai.com/v1/images/generations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${openaiKey}`
              },
              body: JSON.stringify({
                model: 'gpt-image-1',
                prompt: enhancedPrompt,
                size: 'auto',
                quality: 'high',
                n: 1
              })
            })
            if (openaiResp.ok) {
              const oj = await openaiResp.json()
              const b64 = oj?.data?.[0]?.b64_json
              if (typeof b64 === 'string' && b64.length > 50) {
                const openaiImage = `data:image/png;base64,${b64}`
                return NextResponse.json({
                  success: true,
                  imageUrl: openaiImage,
                  images: [{ dataUrl: openaiImage, mimeType: 'image/png' }],
                  prompt: enhancedPrompt,
                  model: 'gpt-image-1',
                  provider: 'openai',
                  traceId
                })
              }
            }
          }
        } catch (e) {
          console.error('🎨 OpenAI fallback failed:', e);
        }

        // Return placeholder if all providers fail
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='675' viewBox='0 0 1200 675' fill='none'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#0f172a'/><stop offset='100%' stop-color='#1e293b'/></linearGradient></defs><rect width='1200' height='675' fill='url(#g)'/><g fill='#64748b'><rect x='80' y='120' width='1040' height='435' rx='16' ry='16' fill-opacity='0.25' stroke='#334155' stroke-width='2'/><text x='600' y='300' font-family='Inter, system-ui, -apple-system' font-size='42' text-anchor='middle' fill='#cbd5e1'>Thumbnail Preview</text><text x='600' y='360' font-family='Inter, system-ui, -apple-system' font-size='20' text-anchor='middle' fill='#94a3b8'>Image will appear here once generated</text></g></svg>`
        const placeholder = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
        return NextResponse.json({ success: true, ...payload, imageUrl: placeholder, images: [{ dataUrl: placeholder, mimeType: 'image/svg+xml' }], providerUsed, message: 'Placeholder returned: no image bytes from providers', primaryBodyText })
      }

      return NextResponse.json({ success: true, ...payload, providerUsed });
      
    } catch (imagenError) {
      console.error('🎨 Image generation error:', imagenError);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to generate image',
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
