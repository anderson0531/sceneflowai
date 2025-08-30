import { NextResponse } from 'next/server';
import { performanceOptimizer } from '@/services/DOL/PerformanceOptimizer';

export async function GET() {
  try {
    const trends = await performanceOptimizer.monitorPerformanceTrends();
    
    return NextResponse.json({
      success: true,
      ...trends
    });

  } catch (error) {
    console.error('Error getting performance trends:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get performance trends', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
