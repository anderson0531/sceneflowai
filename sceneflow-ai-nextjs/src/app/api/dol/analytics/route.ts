import { NextResponse } from 'next/server';
import { dolDatabaseService } from '@/services/DOL/DOLDatabaseService';

export async function GET() {
  try {
    const analytics = await dolDatabaseService.getDOLAnalytics();
    
    return NextResponse.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Error getting DOL analytics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get DOL analytics', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
