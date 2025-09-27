import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
      const startedAt = Date.now();
      const traceId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      // Create a compelling image prompt for the film billboard
      const sanitize = (p: string) => p
        .replace(/\b(16\s*[:x]\s*9|9\s*[:x]\s*16)\b/gi, '')
        .replace(/\b(1024|1536|1792)\s*x\s*(1024|1536|1792)\b/gi, '')
        .replace(/aspect\s*ratio\s*:?\s*[^\n]+/gi, '')
        .replace(/resolution\s*:?\s*[^\n]+/gi, '')
        .trim();
      const enhancedPrompt = `Create a cinematic billboard image for a film with the following requirements: ${sanitize(prompt)}
      
      Style: Professional film poster, cinematic lighting, high contrast, suitable for billboard display
      Quality: High-resolution, professional photography, visually striking
      Composition: Dramatic, eye-catching, film marketing quality
      Camera: Wide angle, cinematic framing
      Lighting: Dramatic, high contrast, professional studio lighting
      Aspect ratio: 16:9 landscape for billboard display`;
      
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
            // Provider-compatible automatic sizing
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

      // Prefer Imagen 4.0 Ultra; gracefully fall back to Imagen 4.0 Balanced → Fast → OpenAI
      let response: Response | undefined;
      let primaryStatus = 0;
      let primaryBodyText: string | undefined;
      let billingRequired = false;
      let rateLimited = false;
      let providerUsed: 'gemini' | 'openai' | 'imagen' | 'none' = 'none';

      let data: any = null;
      let selectedModel: string = 'imagen-4.0-ultra-generate-001';
      let usedPath: 'imagen4-ultra' | 'imagen4-balanced' | 'imagen4-fast' | 'openai' = 'imagen4-ultra';

      // Try Imagen 4.0 Ultra via generateContent (returns inline image data in parts)
      try {
        const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${googleApiKey}`;
        const imagenBody = {
          contents: [{ parts: [{ text: enhancedPrompt }] }],
          generationConfig: {
            temperature: 0.6,
            topK: 40,
            topP: 0.95,
            responseMimeType: 'image/png'
          }
        } as const;

        response = await fetch(imagenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(imagenBody)
        });
        primaryStatus = response.status;
        if (!response.ok) {
          try { primaryBodyText = await response.clone().text(); } catch {}
          usedPath = 'imagen4-balanced';
        } else {
          data = await response.json();
          providerUsed = 'imagen';
        }
      } catch {
        usedPath = 'imagen4-balanced';
      }

      // If Ultra path failed to produce bytes, try Imagen 4.0 balanced
      if (usedPath === 'imagen4-balanced' && !data?.candidates) {
        try {
          selectedModel = 'imagen-4.0-generate-001';
          const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${googleApiKey}`;
          const body = {
            contents: [{ parts: [{ text: enhancedPrompt }] }],
            generationConfig: {
              temperature: 0.6,
              topK: 40,
              topP: 0.95,
              responseMimeType: 'image/png'
            }
          } as const;
          response = await fetch(imagenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          primaryStatus = response.status;
          if (!response.ok) {
            try { primaryBodyText = await response.clone().text(); } catch {}
            usedPath = 'imagen4-fast';
          } else {
            data = await response.json();
            providerUsed = 'imagen';
          }
        } catch {
          usedPath = 'imagen4-fast';
        }
      }

      // If balanced also fails, try fast generate
      if (usedPath === 'imagen4-fast' && !data?.candidates) {
        try {
          selectedModel = 'imagen-4.0-fast-generate-001';
          const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${googleApiKey}`;
          const body = {
            contents: [{ parts: [{ text: enhancedPrompt }] }],
            generationConfig: {
              temperature: 0.6,
              topK: 40,
              topP: 0.95,
              responseMimeType: 'image/png'
            }
          } as const;
          response = await fetch(imagenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          primaryStatus = response.status;
          if (!response.ok) {
            try { primaryBodyText = await response.clone().text(); } catch {}
            usedPath = 'openai';
          } else {
            data = await response.json();
            providerUsed = 'imagen';
          }
        } catch {
          usedPath = 'openai';
        }
      }

      // No Imagen path; we will use OpenAI as the only fallback
      const fallbackStatus = undefined as unknown as number | undefined;
      console.log('🎨 Google: API response received');

      // Extract the generated image from Imagen response
      let imageUrl = '';
      const images: { dataUrl: string; mimeType: string }[] = [];
      
      let partsCount = 0;
      let partKinds: string[] = [];
      try {
        // Imagen 4.0 returns inlineData/fileData under candidates
        if (data?.candidates?.[0]?.content?.parts?.length) {
          partsCount = data.candidates[0].content.parts.length;
          for (const part of data.candidates[0].content.parts) {
            const inlineA = part.inlineData || part.inline_data;
            const fileA = part.fileData || part.file_data;
            if (inlineA?.mimeType?.startsWith('image/') && inlineA?.data) {
              imageUrl = `data:${inlineA.mimeType};base64,${inlineA.data}`;
              images.push({ dataUrl: imageUrl, mimeType: inlineA.mimeType });
              break;
            }
            if (fileA?.mimeType?.startsWith('image/') && fileA?.data) {
              imageUrl = `data:${fileA.mimeType};base64,${fileA.data}`;
              images.push({ dataUrl: imageUrl, mimeType: fileA.mimeType });
              break;
            }
            if (typeof part.text === 'string' && part.text.startsWith('data:image/')) {
              imageUrl = part.text;
              images.push({ dataUrl: imageUrl, mimeType: 'image/png' });
              break;
            }
          }
        }

        // Extra fallback: some Imagen responses nest base64 under grounded content
        if (!imageUrl && typeof data === 'object') {
          const deep = (obj: any): string | undefined => {
            if (!obj || typeof obj !== 'object') return undefined;
            if (typeof obj.data === 'string' && (obj.mimeType || obj.mime_type)?.startsWith?.('image/')) {
              return `data:${obj.mimeType || obj.mime_type};base64,${obj.data}`;
            }
            for (const k of Object.keys(obj)) {
              const v = obj[k];
              const r = deep(v);
              if (r) return r;
            }
            return undefined;
          };
          const nested = deep(data);
          if (nested) {
            imageUrl = nested;
            images.push({ dataUrl: imageUrl, mimeType: 'image/png' });
          }
        }

      } catch (e) {
        console.warn('🎨 Could not parse inline image data:', e)
      }

      // Detect safety block or non-image content
      if (!imageUrl && data && data?.promptFeedback) {
        primaryBodyText = JSON.stringify(data.promptFeedback);
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
        partKinds,
        durationMs: Date.now() - startedAt
      } as const;

      if (!imageUrl) {
        // Final fallback: try OpenAI Images API (gpt-image-1 / DALL·E 3)
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
                // Provider-compatible automatic sizing
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
            } else {
              try { primaryBodyText = await openaiResp.text(); } catch {}
            }
          }
        } catch (e) {
          // ignore and continue returning detailed error below
        }

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
        // Final attempt: force OpenAI even if not requested
        try {
          const openaiKey = process.env.OPENAI_API_KEY
          if (openaiKey) {
            const openaiResp = await fetch('https://api.openai.com/v1/images/generations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
              body: JSON.stringify({ model: 'gpt-image-1', prompt: enhancedPrompt, size: 'auto', quality: 'high', n: 1 })
            })
            if (openaiResp.ok) {
              const oj = await openaiResp.json()
              const b64 = oj?.data?.[0]?.b64_json
              if (typeof b64 === 'string' && b64.length > 50) {
                const openaiImage = `data:image/png;base64,${b64}`
                return NextResponse.json({ success: true, imageUrl: openaiImage, images: [{ dataUrl: openaiImage, mimeType: 'image/png' }], prompt: enhancedPrompt, model: 'gpt-image-1', provider: 'openai', traceId })
              }
            }
          }
        } catch {}
        // As a last resort, return a placeholder SVG to avoid breaking the UI
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='675' viewBox='0 0 1200 675' fill='none'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#0f172a'/><stop offset='100%' stop-color='#1e293b'/></linearGradient></defs><rect width='1200' height='675' fill='url(#g)'/><g fill='#64748b'><rect x='80' y='120' width='1040' height='435' rx='16' ry='16' fill-opacity='0.25' stroke='#334155' stroke-width='2'/><text x='600' y='300' font-family='Inter, system-ui, -apple-system' font-size='42' text-anchor='middle' fill='#cbd5e1'>Billboard Preview</text><text x='600' y='360' font-family='Inter, system-ui, -apple-system' font-size='20' text-anchor='middle' fill='#94a3b8'>Image will appear here once generated</text></g></svg>`
        const placeholder = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
        return NextResponse.json({ success: true, ...payload, imageUrl: placeholder, images: [{ dataUrl: placeholder, mimeType: 'image/svg+xml' }], providerUsed, message: 'Placeholder returned: no image bytes from providers', primaryBodyText })
      }

      return NextResponse.json({ success: true, ...payload, providerUsed });
      
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
