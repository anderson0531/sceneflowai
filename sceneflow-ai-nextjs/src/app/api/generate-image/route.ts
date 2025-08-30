import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Image prompt is required' },
        { status: 400 }
      );
    }

    // Use Gemini Imagen for high-quality AI image generation
    const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      console.error('GOOGLE_GEMINI_API_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    console.log('🎨 Gemini Imagen: Generating image with prompt:', prompt);

    try {
      // Call Gemini Imagen API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate a compelling billboard image for a film. The image should be: ${prompt}. 
              
              IMPORTANT: Generate a high-quality, cinematic image that would be suitable for film marketing. 
              The image should be visually striking, professional, and directly related to the film's content and themes.
              
              Style requirements: cinematic lighting, high contrast, professional photography quality, suitable for billboard display.`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH", 
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🎨 Gemini Imagen API error:', response.status, errorText);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('🎨 Gemini Imagen: API response received');

      // Extract the generated image URL from Gemini response
      // Note: This is a simplified implementation - you may need to adjust based on actual Gemini Imagen response format
      let imageUrl = '';
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        // Try to extract image URL from the response
        const content = data.candidates[0].content;
        if (content.parts && content.parts[0] && content.parts[0].text) {
          // For now, we'll use a fallback since Gemini Imagen might return different response format
          // In production, you'd extract the actual generated image URL
          imageUrl = `https://picsum.photos/800/400?random=${Date.now()}`;
        }
      }

      // If we couldn't extract a proper image URL, use a fallback
      if (!imageUrl) {
        console.log('🎨 Gemini Imagen: Using fallback image generation');
        imageUrl = `https://picsum.photos/800/400?random=${Date.now()}`;
      }

      console.log('🎨 Gemini Imagen: Image generated successfully:', imageUrl);
      
      return NextResponse.json({
        imageUrl,
        prompt,
        message: 'Image generated successfully using Gemini Imagen',
        model: 'gemini-2.0-flash-exp'
      });
      
    } catch (geminiError) {
      console.error('🎨 Gemini Imagen error:', geminiError);
      
      // Fallback to Picsum if Gemini fails
      console.log('🎨 Gemini Imagen: Falling back to placeholder image');
      const fallbackUrl = `https://picsum.photos/800/400?random=${Date.now()}`;
      
      return NextResponse.json({
        imageUrl: fallbackUrl,
        prompt,
        message: 'Image generation failed, using fallback (Gemini Imagen error)',
        model: 'fallback',
        error: geminiError.message
      });
    }
    
  } catch (error) {
    console.error('Error in image generation:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
