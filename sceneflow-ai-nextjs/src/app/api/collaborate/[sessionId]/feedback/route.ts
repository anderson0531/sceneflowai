import { NextRequest, NextResponse } from 'next/server';
import { collaborationSessions } from '@/lib/collaborationSessions';

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const body = await request.json();
    const { ideaId, feedback, authorName, authorEmail } = body;

    if (!ideaId || !feedback || !authorName) {
      return NextResponse.json(
        { error: 'ideaId, feedback, and authorName are required' },
        { status: 400 }
      );
    }

    const session = collaborationSessions.get(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Collaboration session not found' },
        { status: 404 }
      );
    }

    // Check if session has expired
    if (new Date() > new Date(session.expiresAt)) {
      collaborationSessions.delete(sessionId);
      return NextResponse.json(
        { error: 'Collaboration session has expired' },
        { status: 410 }
      );
    }

    // Add feedback
    const feedbackEntry = {
      id: Date.now().toString(),
      ideaId,
      feedback,
      authorName,
      authorEmail: authorEmail || null,
      createdAt: new Date().toISOString(),
    };

    session.feedback.push(feedbackEntry);

    return NextResponse.json({
      success: true,
      feedback: feedbackEntry,
    });
  } catch (error) {
    console.error('Error adding feedback:', error);
    return NextResponse.json(
      { error: 'Failed to add feedback' },
      { status: 500 }
    );
  }
}