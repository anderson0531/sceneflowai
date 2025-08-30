import { NextResponse } from 'next/server';
import { featureMonitor } from '@/services/DOL/FeatureMonitor';

export async function GET() {
  try {
    const metrics = featureMonitor.getPlatformMetrics();
    
    return NextResponse.json({
      success: true,
      metrics
    });

  } catch (error) {
    console.error('Error getting platform metrics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get platform metrics', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
