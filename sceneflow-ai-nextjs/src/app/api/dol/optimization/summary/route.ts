import { NextResponse } from 'next/server';
import { performanceOptimizer } from '@/services/DOL/PerformanceOptimizer';

export async function GET() {
  try {
    const summary = await performanceOptimizer.getOptimizationSummary();
    
    return NextResponse.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('Error getting optimization summary:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get optimization summary', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
