import { NextResponse } from 'next/server';
import { productionHealthMonitor } from '@/services/DOL/ProductionHealthMonitor';

export async function GET() {
  try {
    const healthStatus = await productionHealthMonitor.performHealthCheck();
    const systemStatus = productionHealthMonitor.getSystemStatus();
    
    return NextResponse.json({
      success: true,
      healthStatus,
      systemStatus
    });

  } catch (error) {
    console.error('Error getting production health status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get production health status', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
