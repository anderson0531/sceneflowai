// In-memory storage for collaboration sessions (in production, use a database)
export const collaborationSessions = new Map();

export interface CollaborationSession {
  id: string;
  projectDescription: string;
  projectIdeas: any[];
  projectDetails: any;
  votes: Map<string, { upvotes: number; downvotes: number; voters: Set<string> }>;
  feedback: Array<{
    id: string;
    ideaId: string;
    feedback: string;
    authorName: string;
    authorEmail?: string;
    createdAt: string;
  }>;
  createdAt: string;
  expiresAt: string;
}
