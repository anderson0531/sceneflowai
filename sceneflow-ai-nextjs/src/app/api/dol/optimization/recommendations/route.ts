import { NextResponse } from 'next/server';
import { performanceOptimizer } from '@/services/DOL/PerformanceOptimizer';

export async function GET() {
  try {
    const result = await performanceOptimizer.analyzePerformance();
    
    return NextResponse.json({
      success: true,
      recommendations: result.recommendations
    });

  } catch (error) {
    console.error('Error getting optimization recommendations:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get optimization recommendations', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
