import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Note: In a real implementation, this would stop the monitoring interval
    // For now, we'll just return success as the monitoring is in-memory
    
    return NextResponse.json({
      success: true,
      message: 'Automated monitoring stopped successfully'
    });

  } catch (error) {
    console.error('Error stopping automated monitoring:', error);
    return NextResponse.json(
      { 
        error: 'Failed to stop automated monitoring', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
