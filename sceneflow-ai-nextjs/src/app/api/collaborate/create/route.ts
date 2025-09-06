import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { collaborationSessions } from '@/lib/collaborationSessions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectDescription, projectIdeas, projectDetails } = body;

    if (!projectDescription || !projectIdeas || projectIdeas.length === 0) {
      return NextResponse.json(
        { error: 'Project description and ideas are required' },
        { status: 400 }
      );
    }

    // Generate a unique session ID
    const sessionId = uuidv4();

    // Create collaboration session
    const session = {
      id: sessionId,
      projectDescription,
      projectIdeas,
      projectDetails,
      votes: new Map(), // ideaId -> { upvotes: number, downvotes: number }
      feedback: [], // Array of feedback objects
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };

    // Store session
    collaborationSessions.set(sessionId, session);

    return NextResponse.json({
      sessionId,
      message: 'Collaboration session created successfully',
    });
  } catch (error) {
    console.error('Error creating collaboration session:', error);
    return NextResponse.json(
      { error: 'Failed to create collaboration session' },
      { status: 500 }
    );
  }
}


