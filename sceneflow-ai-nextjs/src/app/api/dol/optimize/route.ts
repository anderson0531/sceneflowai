import { NextRequest, NextResponse } from 'next/server';
import { dol } from '@/services/DOL/DynamicOptimizationLayer';
import { TaskType, TaskComplexity } from '@/types/dol';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body.taskType || !body.complexity || !body.userInput) {
      return NextResponse.json(
        { error: 'Missing required fields: taskType, complexity, userInput' },
        { status: 400 }
      );
    }

    // Validate task type
    if (!Object.values(TaskType).includes(body.taskType)) {
      return NextResponse.json(
        { error: `Invalid taskType. Must be one of: ${Object.values(TaskType).join(', ')}` },
        { status: 400 }
      );
    }

    // Validate complexity
    if (!Object.values(TaskComplexity).includes(body.complexity)) {
      return NextResponse.json(
        { error: `Invalid complexity. Must be one of: ${Object.values(TaskComplexity).join(', ')}` },
        { status: 400 }
      );
    }

    // Create DOL request
    const dolRequest = {
      taskType: body.taskType,
      complexity: body.complexity,
      userInput: body.userInput,
      byokPlatformId: body.byUrl,
      userPreferences: body.userPreferences,
      budget: body.budget,
      qualityRequirement: body.qualityRequirement
    };

    // Call DOL optimization
    const result = await dol.optimize(dolRequest);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: result.error || 'Optimization failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('DOL API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'DOL Optimization API',
    endpoints: {
      POST: '/api/dol/optimize - Optimize task with DOL',
      GET: '/api/dol/models - Get all available models',
      GET: '/api/dol/templates - Get all prompt templates'
    }
  });
}
