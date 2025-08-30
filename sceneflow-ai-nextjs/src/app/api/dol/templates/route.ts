import { NextRequest, NextResponse } from 'next/server';
import { dol } from '@/services/DOL/DynamicOptimizationLayer';

export async function GET() {
  try {
    const templates = await dol.getAllTemplates();
    return NextResponse.json({ success: true, templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.templateId || !body.modelId || !body.taskType || !body.templateString) {
      return NextResponse.json(
        { error: 'Missing required fields: templateId, modelId, taskType, templateString' },
        { status: 400 }
      );
    }

    const template = await dol.createTemplate(body);
    
    return NextResponse.json({ 
      success: true, 
      template,
      message: 'Template created successfully' 
    });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.templateId || !body.newScore) {
      return NextResponse.json(
        { error: 'Missing required fields: templateId, newScore' },
        { status: 400 }
      );
    }

    await dol.updateTemplateScore(body.templateId, body.newScore);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Template score updated successfully' 
    });
  } catch (error) {
    console.error('Error updating template score:', error);
    return NextResponse.json(
      { error: 'Failed to update template score' },
      { status: 500 }
    );
  }
}
