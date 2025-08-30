import { NextRequest, NextResponse } from 'next/server';
import { productionHealthMonitor } from '@/services/DOL/ProductionHealthMonitor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId } = body;
    
    if (!alertId) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      );
    }

    productionHealthMonitor.acknowledgeAlert(alertId);
    
    return NextResponse.json({
      success: true,
      message: 'Alert acknowledged successfully'
    });

  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return NextResponse.json(
      { 
        error: 'Failed to acknowledge alert', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
