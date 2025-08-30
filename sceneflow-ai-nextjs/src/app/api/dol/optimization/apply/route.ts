import { NextRequest, NextResponse } from 'next/server';
import { performanceOptimizer } from '@/services/DOL/PerformanceOptimizer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recommendations } = body;
    
    if (!recommendations || !Array.isArray(recommendations)) {
      return NextResponse.json(
        { error: 'Invalid recommendations data' },
        { status: 400 }
      );
    }

    const result = await performanceOptimizer.applyOptimizations(recommendations);
    
    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error applying optimizations:', error);
    return NextResponse.json(
      { 
        error: 'Failed to apply optimizations', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
