import { NextRequest, NextResponse } from 'next/server';
import { cueIntegrationService, CueMessage, CueContext } from '@/services/DOL/CueIntegrationService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages = (body?.messages || []) as CueMessage[];
    const context = (body?.context || {}) as CueContext;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    console.log('🧠 Cue DOL API: Processing request...');

    // Use the DOL-integrated Cue service
    const result = await cueIntegrationService.sendMessage(messages, context);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Cue DOL API error:', error);
    return NextResponse.json(
      { 
        error: 'Cue DOL respond failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Cue DOL-Integrated API',
    description: 'This endpoint uses DOL optimization for all Cue requests',
    endpoints: {
      POST: '/api/cue/respond-dol-integrated - Send message with DOL optimization',
      GET: '/api/cue/respond-dol-integrated - Get API information'
    }
  });
}
