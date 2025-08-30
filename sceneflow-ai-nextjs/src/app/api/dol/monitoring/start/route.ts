import { NextResponse } from 'next/server';
import { featureMonitor } from '@/services/DOL/FeatureMonitor';

export async function POST() {
  try {
    await featureMonitor.startAutomatedMonitoring();
    
    return NextResponse.json({
      success: true,
      message: 'Automated monitoring started successfully'
    });

  } catch (error) {
    console.error('Error starting automated monitoring:', error);
    return NextResponse.json(
      { 
        error: 'Failed to start automated monitoring', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
