import { NextResponse } from 'next/server';
import { dolDatabaseService } from '@/services/DOL/DOLDatabaseService';

export async function GET() {
  try {
    const templates = await dolDatabaseService.getTemplatePerformanceMetrics();
    
    return NextResponse.json({
      success: true,
      templates
    });

  } catch (error) {
    console.error('Error getting template performance metrics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get template performance metrics', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
