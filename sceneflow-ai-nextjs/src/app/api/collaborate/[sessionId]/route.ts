import { NextRequest, NextResponse } from 'next/server';
import { collaborationSessions } from '@/lib/collaborationSessions';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

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

    // Convert votes Map to object for JSON serialization
    const votesObject: Record<string, { upvotes: number; downvotes: number; voters: string[] }> = {};
    session.votes.forEach((votes: { upvotes: number; downvotes: number; voters: Set<string> }, ideaId: string) => {
      votesObject[ideaId] = { upvotes: votes.upvotes, downvotes: votes.downvotes, voters: Array.from(votes.voters) };
    });

    return NextResponse.json({
      ...session,
      votes: votesObject,
    });
  } catch (error) {
    console.error('Error fetching collaboration session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaboration session' },
      { status: 500 }
    );
  }
}
