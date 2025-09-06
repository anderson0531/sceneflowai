import { NextRequest, NextResponse } from 'next/server';
import { collaborationSessions } from '@/lib/collaborationSessions';

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const body = await request.json();
    const { ideaId, voteType, voterId } = body; // voteType: 'upvote' | 'downvote'

    if (!ideaId || !voteType || !voterId) {
      return NextResponse.json(
        { error: 'ideaId, voteType, and voterId are required' },
        { status: 400 }
      );
    }

    if (!['upvote', 'downvote'].includes(voteType)) {
      return NextResponse.json(
        { error: 'voteType must be either "upvote" or "downvote"' },
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

    // Initialize votes for this idea if not exists
    if (!session.votes.has(ideaId)) {
      session.votes.set(ideaId, { upvotes: 0, downvotes: 0, voters: new Set() });
    }

    const ideaVotes = session.votes.get(ideaId);

    // Check if voter has already voted
    if (ideaVotes.voters.has(voterId)) {
      return NextResponse.json(
        { error: 'You have already voted on this idea' },
        { status: 400 }
      );
    }

    // Add vote
    if (voteType === 'upvote') {
      ideaVotes.upvotes++;
    } else {
      ideaVotes.downvotes++;
    }

    // Mark voter as having voted
    ideaVotes.voters.add(voterId);

    return NextResponse.json({
      success: true,
      votes: {
        upvotes: ideaVotes.upvotes,
        downvotes: ideaVotes.downvotes,
        total: ideaVotes.upvotes - ideaVotes.downvotes,
      },
    });
  } catch (error) {
    console.error('Error processing vote:', error);
    return NextResponse.json(
      { error: 'Failed to process vote' },
      { status: 500 }
    );
  }
}