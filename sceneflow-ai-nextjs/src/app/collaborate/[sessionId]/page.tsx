'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, ThumbsDown, MessageCircle, Users, Clock } from 'lucide-react';

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

export default function CollaborationPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voterId] = useState(() => `voter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [votingStates, setVotingStates] = useState<Record<string, 'upvote' | 'downvote' | null>>({});
  const [feedbackStates, setFeedbackStates] = useState<Record<string, boolean>>({});
  const [newFeedback, setNewFeedback] = useState<Record<string, string>>({});
  const [feedbackAuthor, setFeedbackAuthor] = useState({ name: '', email: '' });
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/collaborate/${sessionId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Collaboration session not found');
        } else if (response.status === 410) {
          setError('This collaboration session has expired');
        } else {
          setError('Failed to load collaboration session');
        }
        return;
      }

      const data = await response.json();
      setSession(data);
    } catch (error) {
      console.error('Error fetching session:', error);
      setError('Failed to load collaboration session');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (ideaId: string, voteType: 'upvote' | 'downvote') => {
    try {
      const response = await fetch(`/api/collaborate/${sessionId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ideaId,
          voteType,
          voterId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to vote');
        return;
      }

      // Update local state
      setVotingStates(prev => ({
        ...prev,
        [ideaId]: voteType,
      }));

      // Refresh session data
      fetchSession();
    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to vote. Please try again.');
    }
  };

  const handleSubmitFeedback = async (ideaId: string) => {
    const feedback = newFeedback[ideaId];
    if (!feedback.trim()) {
      alert('Please enter feedback before submitting.');
      return;
    }

    if (!feedbackAuthor.name.trim()) {
      alert('Please enter your name.');
      return;
    }

    try {
      const response = await fetch(`/api/collaborate/${sessionId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ideaId,
          feedback,
          authorName: feedbackAuthor.name,
          authorEmail: feedbackAuthor.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to submit feedback');
        return;
      }

      // Clear feedback form
      setNewFeedback(prev => ({
        ...prev,
        [ideaId]: '',
      }));
      setFeedbackStates(prev => ({
        ...prev,
        [ideaId]: false,
      }));

      // Refresh session data
      fetchSession();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    }
  };

  const toggleFeedbackForm = (ideaId: string) => {
    setFeedbackStates(prev => ({
      ...prev,
      [ideaId]: !prev[ideaId],
    }));
  };

  const toggleCardExpansion = (ideaId: string) => {
    const newExpandedCards = new Set(expandedCards);
    if (newExpandedCards.has(ideaId)) {
      newExpandedCards.delete(ideaId);
    } else {
      newExpandedCards.add(ideaId);
    }
    setExpandedCards(newExpandedCards);
  };

  if (loading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading collaboration session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Session Error</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">No session data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Project Ideas Collaboration</h1>
              <p className="text-gray-400">Vote and provide feedback on these project ideas</p>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Session: {sessionId.slice(0, 8)}...</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Expires: {new Date(session.expiresAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Project Description */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">Project Description</h2>
          <p className="text-gray-300 text-lg leading-relaxed">{session.projectDescription}</p>
        </div>

        {/* Feedback Author Form */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Your Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
              <input
                type="text"
                value={feedbackAuthor.name}
                onChange={(e) => setFeedbackAuthor(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email (optional)</label>
              <input
                type="email"
                value={feedbackAuthor.email}
                onChange={(e) => setFeedbackAuthor(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>
          </div>
        </div>

        {/* Project Ideas */}
        <div className="space-y-6">
          {session.projectIdeas.map((idea) => {
            const votes = session.votes[idea.id] || { upvotes: 0, downvotes: 0 };
            const totalVotes = votes.upvotes - votes.downvotes;
            const hasVoted = votingStates[idea.id];
            const ideaFeedback = session.feedback.filter(f => f.ideaId === idea.id);

            return (
              <Card key={idea.id} className="bg-gray-800/50 border border-gray-700/50">
                <CardContent className="p-8">
                  {/* Header with voting and show details */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-2xl font-semibold text-white">{idea.title}</h3>
                        <button
                          onClick={() => toggleCardExpansion(idea.id)}
                          className="text-blue-400 hover:text-blue-300 text-base font-medium transition-colors"
                        >
                          {expandedCards.has(idea.id) ? 'Hide Details' : 'Show Details'}
                        </button>
                      </div>
                      <p className="text-gray-300 text-lg leading-relaxed mb-4">{idea.synopsis}</p>
                      
                      {/* Quick Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gray-700/50 rounded-lg p-4">
                          <div className="text-gray-400 text-sm uppercase tracking-wide mb-2">Genre</div>
                          <div className="text-white text-base font-medium">{idea.details.genre}</div>
                        </div>
                        <div className="bg-gray-700/50 rounded-lg p-4">
                          <div className="text-gray-400 text-sm uppercase tracking-wide mb-2">Duration</div>
                          <div className="text-white text-base font-medium">{idea.details.duration}</div>
                        </div>
                        <div className="bg-gray-700/50 rounded-lg p-4">
                          <div className="text-gray-400 text-sm uppercase tracking-wide mb-2">Audience</div>
                          <div className="text-white text-base font-medium">{idea.details.targetAudience}</div>
                        </div>
                        <div className="bg-gray-700/50 rounded-lg p-4">
                          <div className="text-gray-400 text-sm uppercase tracking-wide mb-2">Tone</div>
                          <div className="text-white text-base font-medium">{idea.details.tone}</div>
                        </div>
                      </div>

                      {/* Narrative Structure - Always visible */}
                      <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                        <div className="text-gray-400 text-sm uppercase tracking-wide mb-2">Structure</div>
                        <div className="text-white text-base font-medium">{idea.narrative_structure}</div>
                      </div>
                    </div>

                    {/* Voting Section */}
                    <div className="flex flex-col items-center ml-6">
                      <div className="text-center mb-4">
                        <div className="text-3xl font-bold text-white mb-1">{totalVotes}</div>
                        <div className="text-sm text-gray-400">Total Score</div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => handleVote(idea.id, 'upvote')}
                          disabled={hasVoted === 'upvote'}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${
                            hasVoted === 'upvote'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-green-600 hover:text-white'
                          }`}
                        >
                          <ThumbsUp className="w-4 h-4 mr-2" />
                          {votes.upvotes}
                        </Button>
                        
                        <Button
                          onClick={() => handleVote(idea.id, 'downvote')}
                          disabled={hasVoted === 'downvote'}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${
                            hasVoted === 'downvote'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white'
                          }`}
                        >
                          <ThumbsDown className="w-4 h-4 mr-2" />
                          {votes.downvotes}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Content */}
                  {expandedCards.has(idea.id) && (
                    <div className="border-t border-gray-700 pt-8 mt-8 space-y-8">
                      {/* Film Treatment */}
                      <div>
                        <h4 className="text-white font-semibold text-xl mb-4">Film Treatment</h4>
                        <div className="bg-gray-800/50 p-6 rounded-lg">
                          <p className="text-gray-300 text-lg leading-relaxed">
                            {idea.film_treatment}
                          </p>
                        </div>
                      </div>

                      {/* Characters */}
                      <div>
                        <h4 className="text-white font-semibold text-xl mb-4">Characters</h4>
                        <div className="space-y-4">
                          {idea.characters.map((character, index) => (
                            <div key={index} className="bg-gray-800/50 p-6 rounded-lg">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="text-white font-medium text-lg">{character.name}</h5>
                                <div className="flex items-center gap-3">
                                  <span className={`px-3 py-1 rounded-md text-sm font-medium ${
                                    character.importance === 'High' ? 'bg-red-600/20 text-red-400 border border-red-600/30' :
                                    character.importance === 'Medium' ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30' :
                                    'bg-gray-600/20 text-gray-400 border border-gray-600/30'
                                  }`}>
                                    {character.importance}
                                  </span>
                                  <span className="text-blue-400 text-sm font-medium uppercase tracking-wide">{character.role}</span>
                                </div>
                              </div>
                              <p className="text-gray-300 text-base leading-relaxed">{character.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Act Structure */}
                      <div>
                        <h4 className="text-white font-semibold text-xl mb-6">{idea.narrative_structure} Act Structure</h4>
                        <div className="space-y-8">
                          {/* Act 1 */}
                          <div className="bg-gray-800/30 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="text-blue-400 font-semibold text-xl">Act 1: {idea.act_structure.act_1.title}</h5>
                              <span className="text-blue-300 text-base font-medium bg-blue-600/20 px-3 py-1 rounded-md">{idea.act_structure.act_1.duration}</span>
                            </div>
                            <div className="space-y-4">
                              {idea.act_structure.act_1.beats.map((beat, index) => (
                                <div key={index} className="bg-gray-700/50 p-4 rounded-lg">
                                  <div className="flex items-center justify-between mb-3">
                                    <h6 className="text-white font-medium text-lg">
                                      Beat {beat.beat_number}: {beat.beat_title}
                                    </h6>
                                    <span className="text-gray-400 text-sm font-medium bg-gray-600/20 px-2 py-1 rounded">{beat.duration_estimate}</span>
                                  </div>
                                  <p className="text-gray-300 text-base mb-4 leading-relaxed">{beat.beat_description}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {beat.key_elements.map((element, elemIndex) => (
                                      <span key={elemIndex} className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-md text-sm font-medium">
                                        {element}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Act 2 */}
                          <div className="bg-gray-800/30 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="text-green-400 font-semibold text-xl">Act 2: {idea.act_structure.act_2.title}</h5>
                              <span className="text-green-300 text-base font-medium bg-green-600/20 px-3 py-1 rounded-md">{idea.act_structure.act_2.duration}</span>
                            </div>
                            <div className="space-y-4">
                              {idea.act_structure.act_2.beats.map((beat, index) => (
                                <div key={index} className="bg-gray-700/50 p-4 rounded-lg">
                                  <div className="flex items-center justify-between mb-3">
                                    <h6 className="text-white font-medium text-lg">
                                      Beat {beat.beat_number}: {beat.beat_title}
                                    </h6>
                                    <span className="text-gray-400 text-sm font-medium bg-gray-600/20 px-2 py-1 rounded">{beat.duration_estimate}</span>
                                  </div>
                                  <p className="text-gray-300 text-base mb-4 leading-relaxed">{beat.beat_description}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {beat.key_elements.map((element, elemIndex) => (
                                      <span key={elemIndex} className="bg-green-600/20 text-green-300 px-3 py-1 rounded-md text-sm font-medium">
                                        {element}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Act 3 */}
                          <div className="bg-gray-800/30 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="text-purple-400 font-semibold text-xl">Act 3: {idea.act_structure.act_3.title}</h5>
                              <span className="text-purple-300 text-base font-medium bg-purple-600/20 px-3 py-1 rounded-md">{idea.act_structure.act_3.duration}</span>
                            </div>
                            <div className="space-y-4">
                              {idea.act_structure.act_3.beats.map((beat, index) => (
                                <div key={index} className="bg-gray-700/50 p-4 rounded-lg">
                                  <div className="flex items-center justify-between mb-3">
                                    <h6 className="text-white font-medium text-lg">
                                      Beat {beat.beat_number}: {beat.beat_title}
                                    </h6>
                                    <span className="text-gray-400 text-sm font-medium bg-gray-600/20 px-2 py-1 rounded">{beat.duration_estimate}</span>
                                  </div>
                                  <p className="text-gray-300 text-base mb-4 leading-relaxed">{beat.beat_description}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {beat.key_elements.map((element, elemIndex) => (
                                      <span key={elemIndex} className="bg-purple-600/20 text-purple-300 px-3 py-1 rounded-md text-sm font-medium">
                                        {element}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feedback Section */}
                  <div className="border-t border-gray-700 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-white flex items-center">
                        <MessageCircle className="w-5 h-5 mr-2" />
                        Feedback ({ideaFeedback.length})
                      </h4>
                      <Button
                        onClick={() => toggleFeedbackForm(idea.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium"
                      >
                        {feedbackStates[idea.id] ? 'Cancel' : 'Add Feedback'}
                      </Button>
                    </div>

                    {/* Feedback Form */}
                    {feedbackStates[idea.id] && (
                      <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                        <Textarea
                          value={newFeedback[idea.id] || ''}
                          onChange={(e) => setNewFeedback(prev => ({
                            ...prev,
                            [idea.id]: e.target.value,
                          }))}
                          placeholder="Share your thoughts on this project idea..."
                          className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 text-base mb-4"
                          rows={4}
                        />
                        <div className="flex justify-end">
                          <Button
                            onClick={() => handleSubmitFeedback(idea.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 text-sm font-medium"
                          >
                            Submit Feedback
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Existing Feedback */}
                    {ideaFeedback.length > 0 && (
                      <div className="space-y-4">
                        {ideaFeedback.map((feedback) => (
                          <div key={feedback.id} className="bg-gray-700/30 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium text-white">{feedback.authorName}</div>
                              <div className="text-sm text-gray-400">
                                {new Date(feedback.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <p className="text-gray-300 text-base leading-relaxed">{feedback.feedback}</p>
          </div>
        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}