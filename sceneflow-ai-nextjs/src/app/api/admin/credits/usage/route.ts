import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for demo (would be replaced with database in production)
// This tracks API calls made to Google and ElevenLabs

interface UsageRecord {
  timestamp: Date;
  provider: 'google' | 'elevenlabs';
  service: string;
  count: number;
  metadata?: Record<string, unknown>;
}

// Mock usage data - in production this would come from a database
const usageRecords: UsageRecord[] = [];

// Cost estimates per operation (in USD)
const COST_ESTIMATES: Record<string, Record<string, number>> = {
  google: {
    'gemini-text': 0.00001,      // per token (roughly $0.01 per 1K tokens)
    'imagen-3': 0.04,            // per image
    'veo-2': 0.10,               // per second of video
  },
  elevenlabs: {
    'voice-synthesis': 0.0003,   // per character ($0.30 per 1K chars)
    'sound-effects': 0.10,       // per generation
  }
};

// Helper to generate mock data for the selected period
function generateMockData(period: string) {
  const now = new Date();
  let days = 1;
  
  switch (period) {
    case 'today':
      days = 1;
      break;
    case 'week':
      days = 7;
      break;
    case 'month':
      days = 30;
      break;
  }

  const multiplier = period === 'today' ? 1 : period === 'week' ? 7 : 30;
  
  // Generate realistic-looking usage data
  const geminiTokens = Math.floor(Math.random() * 500000 * multiplier) + 100000 * multiplier;
  const imagenImages = Math.floor(Math.random() * 200 * multiplier) + 50 * multiplier;
  const veoSeconds = Math.floor(Math.random() * 100 * multiplier) + 20 * multiplier;
  const voiceChars = Math.floor(Math.random() * 50000 * multiplier) + 10000 * multiplier;
  const sfxCount = Math.floor(Math.random() * 50 * multiplier) + 10 * multiplier;

  const googleCost = 
    (geminiTokens * COST_ESTIMATES.google['gemini-text']) +
    (imagenImages * COST_ESTIMATES.google['imagen-3']) +
    (veoSeconds * COST_ESTIMATES.google['veo-2']);

  const elevenlabsCost =
    (voiceChars * COST_ESTIMATES.elevenlabs['voice-synthesis']) +
    (sfxCount * COST_ESTIMATES.elevenlabs['sound-effects']);

  const breakdown = [
    { 
      provider: 'Google', 
      service: 'Gemini Text Generation', 
      count: geminiTokens, 
      estimatedCost: geminiTokens * COST_ESTIMATES.google['gemini-text'],
      lastUsed: '2 min ago' 
    },
    { 
      provider: 'Google', 
      service: 'Imagen 3 (Images)', 
      count: imagenImages, 
      estimatedCost: imagenImages * COST_ESTIMATES.google['imagen-3'],
      lastUsed: '5 min ago' 
    },
    { 
      provider: 'Google', 
      service: 'Veo 2 (Video)', 
      count: veoSeconds, 
      estimatedCost: veoSeconds * COST_ESTIMATES.google['veo-2'],
      lastUsed: '1 hour ago' 
    },
    { 
      provider: 'ElevenLabs', 
      service: 'Voice Synthesis', 
      count: voiceChars, 
      estimatedCost: voiceChars * COST_ESTIMATES.elevenlabs['voice-synthesis'],
      lastUsed: '10 min ago' 
    },
    { 
      provider: 'ElevenLabs', 
      service: 'Sound Effects', 
      count: sfxCount, 
      estimatedCost: sfxCount * COST_ESTIMATES.elevenlabs['sound-effects'],
      lastUsed: '30 min ago' 
    },
  ];

  // Generate daily usage for charts
  const dailyUsage = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    dailyUsage.push({
      date: date.toISOString().split('T')[0],
      google: Math.floor(Math.random() * 50) + 10,
      elevenlabs: Math.floor(Math.random() * 20) + 5,
      totalCost: Math.random() * (googleCost + elevenlabsCost) / days,
    });
  }

  return {
    totalEstimatedCost: googleCost + elevenlabsCost,
    googleCost,
    elevenlabsCost,
    breakdown,
    dailyUsage,
    period,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'week';

  try {
    // In production, this would query a database
    const data = generateMockData(period);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch credit usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credit usage' },
      { status: 500 }
    );
  }
}

// POST endpoint to record new usage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, service, count, metadata } = body;

    if (!provider || !service || !count) {
      return NextResponse.json(
        { error: 'Missing required fields: provider, service, count' },
        { status: 400 }
      );
    }

    const record: UsageRecord = {
      timestamp: new Date(),
      provider,
      service,
      count,
      metadata,
    };

    usageRecords.push(record);

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error('Failed to record usage:', error);
    return NextResponse.json(
      { error: 'Failed to record usage' },
      { status: 500 }
    );
  }
}
