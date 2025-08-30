import { NextResponse } from 'next/server';
import { featureMonitor } from '@/services/DOL/FeatureMonitor';

export async function GET() {
  try {
    const featureUpdates = featureMonitor.getRecentFeatureUpdates();
    
    return NextResponse.json({
      success: true,
      updates: featureUpdates
    });

  } catch (error) {
    console.error('Error getting feature updates:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get feature updates', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
