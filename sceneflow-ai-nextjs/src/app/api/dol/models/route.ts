import { NextResponse } from 'next/server';
import { getDOL } from '@/services/DOL/DynamicOptimizationLayer';

export async function GET() {
  try {
    const models = await getDOL().getAllModels();
    return NextResponse.json({ success: true, models });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.modelId || !body.features) {
      return NextResponse.json(
        { error: 'Missing required fields: modelId, features' },
        { status: 400 }
      );
    }

    await getDOL().updateModelFeatures(body.modelId, body.features);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Model features updated successfully' 
    });
  } catch (error) {
    console.error('Error updating model features:', error);
    return NextResponse.json(
      { error: 'Failed to update model features' },
      { status: 500 }
    );
  }
}
