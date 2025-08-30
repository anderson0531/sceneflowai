import { NextResponse } from 'next/server';
import { performanceOptimizer } from '@/services/DOL/PerformanceOptimizer';

export async function GET() {
  try {
    const result = await performanceOptimizer.analyzePerformance();
    
    return NextResponse.json({
      success: true,
      metrics: result.metrics
    });

  } catch (error) {
    console.error('Error getting performance metrics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get performance metrics', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
