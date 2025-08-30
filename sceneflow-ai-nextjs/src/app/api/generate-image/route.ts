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

    // For demo purposes, we'll use Picsum to generate a random image
    // In production, this would call an actual AI image generation service
    const imageUrl = `https://picsum.photos/800/400?random=${Date.now()}`;
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return NextResponse.json({
      imageUrl,
      prompt,
      message: 'Image generated successfully (demo mode)'
    });
    
  } catch (error) {
    console.error('Error in image generation:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
