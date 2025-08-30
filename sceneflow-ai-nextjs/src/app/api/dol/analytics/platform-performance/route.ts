import { NextResponse } from 'next/server';
import { dolDatabaseService } from '@/services/DOL/DOLDatabaseService';

export async function GET() {
  try {
    const platforms = await dolDatabaseService.getPlatformPerformanceMetrics();
    
    return NextResponse.json({
      success: true,
      platforms
    });

  } catch (error) {
    console.error('Error getting platform performance metrics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get platform performance metrics', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
