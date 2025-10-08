import { redirect } from 'next/navigation'

interface Character {
  name: string;
  role: string;
  description: string;
  importance: string;
}

interface Beat {
  beat_number: number;
  beat_title: string;
  beat_description: string;
  duration_estimate: string;
  key_elements: string[];
}

interface Act {
  title: string;
  duration: string;
  beats: Beat[];
}

interface ActStructure {
  act_1: Act;
  act_2: Act;
  act_3: Act;
}

interface ProjectIdea {
  id: string;
  title: string;
  synopsis: string;
  film_treatment: string;
  narrative_structure: string;
  characters: Character[];
  act_structure: ActStructure;
  thumbnail_prompt: string;
  strength_rating: number;
  details: {
    genre: string;
    duration: string;
    targetAudience: string;
    tone: string;
  };
}

interface CollaborationSession {
  id: string;
  projectDescription: string;
  projectIdeas: ProjectIdea[];
  projectDetails: any;
  votes: Record<string, { upvotes: number; downvotes: number; voters: Set<string> }>;
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

export default function LegacyCollaborationRedirect({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params
  redirect(`/c/${sessionId}`)
}