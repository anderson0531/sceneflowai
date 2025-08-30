import { NextResponse } from 'next/server';
import { featureMonitor } from '@/services/DOL/FeatureMonitor';

export async function GET() {
  try {
    const platformHealth = featureMonitor.getAllPlatformHealth();
    
    return NextResponse.json({
      success: true,
      platforms: platformHealth
    });

  } catch (error) {
    console.error('Error getting platform health:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get platform health', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
