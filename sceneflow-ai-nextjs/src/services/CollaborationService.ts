import { ThumbnailGenerationService } from './ThumbnailGenerationService'

export interface CollaborationSession {
  id: string
  projectId: string
  userId: string
  title: string
  description: string
  ideas: CollaborationIdea[]
  collaborators: Collaborator[]
  settings: CollaborationSettings
  createdAt: Date
  expiresAt: Date
  isActive: boolean
}

export interface CollaborationIdea {
  id: string
  title: string
  synopsis: string
  scene_outline: string[]
  thumbnail_prompt: string
  strength_rating: number
  votes: Vote[]
  feedback: Feedback[]
  averageRating: number
  totalVotes: number
}

export interface Collaborator {
  id: string
  name: string
  email: string
  role: 'viewer' | 'commenter' | 'voter' | 'admin'
  joinedAt: Date
  lastActive: Date
  avatar?: string
}

export interface Vote {
  id: string
  collaboratorId: string
  ideaId: string
  rating: number // 1-5 scale
  comment?: string
  createdAt: Date
}

export interface Feedback {
  id: string
  collaboratorId: string
  ideaId: string
  type: 'general' | 'specific' | 'suggestion' | 'question'
  content: string
  createdAt: Date
  isResolved: boolean
}

export interface CollaborationSettings {
  allowAnonymousVoting: boolean
  requireEmail: boolean
  allowComments: boolean
  allowRating: boolean
  maxCollaborators: number
  sessionDuration: number // in hours
  autoClose: boolean
}

export interface CollaborationInvite {
  id: string
  sessionId: string
  email: string
  role: 'viewer' | 'commenter' | 'voter'
  expiresAt: Date
  isAccepted: boolean
  acceptedAt?: Date
}

export interface CollaborationStats {
  totalCollaborators: number
  totalVotes: number
  totalFeedback: number
  averageRating: number
  mostVotedIdea: string
  leastVotedIdea: string
  topRatedIdea: string
  sessionDuration: number
}

export class CollaborationService {
  private static sessions: Map<string, CollaborationSession> = new Map()
  private static invites: Map<string, CollaborationInvite> = new Map()
  
  /**
   * Create a new collaboration session
   */
  static async createSession(
    projectId: string,
    userId: string,
    title: string,
    description: string,
    ideas: any[],
    settings?: Partial<CollaborationSettings>
  ): Promise<CollaborationSession> {
    const sessionId = this.generateSessionId()
    
    const defaultSettings: CollaborationSettings = {
      allowAnonymousVoting: false,
      requireEmail: true,
      allowComments: true,
      allowRating: true,
      maxCollaborators: 50,
      sessionDuration: 72, // 3 days
      autoClose: true,
      ...settings
    }
    
    const session: CollaborationSession = {
      id: sessionId,
      projectId,
      userId,
      title,
      description,
      ideas: ideas.map(idea => ({
        ...idea,
        votes: [],
        feedback: [],
        averageRating: idea.strength_rating,
        totalVotes: 0
      })),
      collaborators: [{
        id: userId,
        name: 'Project Owner',
        email: 'owner@example.com',
        role: 'admin',
        joinedAt: new Date(),
        lastActive: new Date()
      }],
      settings: defaultSettings,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + defaultSettings.sessionDuration * 60 * 60 * 1000),
      isActive: true
    }
    
    this.sessions.set(sessionId, session)
    
    // In production, save to database
    console.log('Collaboration session created:', sessionId)
    
    return session
  }
  
  /**
   * Get collaboration session by ID
   */
  static async getSession(sessionId: string): Promise<CollaborationSession | null> {
    const session = this.sessions.get(sessionId)
    
    if (!session) return null
    
    // Check if session has expired
    if (session.expiresAt < new Date() && session.settings.autoClose) {
      session.isActive = false
      this.sessions.set(sessionId, session)
    }
    
    return session
  }
  
  /**
   * Generate unique session ID
   */
  private static generateSessionId(): string {
    return 'collab_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36)
  }
  
  /**
   * Generate shareable link for collaboration session
   */
  static generateShareLink(sessionId: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return `${baseUrl}/collaborate/${sessionId}`
  }
  
  /**
   * Invite collaborators to session
   */
  static async inviteCollaborators(
    sessionId: string,
    invites: Array<{ email: string; role: 'viewer' | 'commenter' | 'voter' }>
  ): Promise<CollaborationInvite[]> {
    const session = await this.getSession(sessionId)
    if (!session) {
      throw new Error('Session not found')
    }
    
    if (session.collaborators.length + invites.length > session.settings.maxCollaborators) {
      throw new Error('Maximum collaborators limit exceeded')
    }
    
    const createdInvites: CollaborationInvite[] = []
    
    for (const invite of invites) {
      const inviteId = this.generateInviteId()
      const collaborationInvite: CollaborationInvite = {
        id: inviteId,
        sessionId,
        email: invite.email,
        role: invite.role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        isAccepted: false
      }
      
      this.invites.set(inviteId, collaborationInvite)
      createdInvites.push(collaborationInvite)
      
      // In production, send email invitation
      console.log(`Invitation sent to ${invite.email} for session ${sessionId}`)
    }
    
    return createdInvites
  }
  
  /**
   * Generate unique invite ID
   */
  private static generateInviteId(): string {
    return 'invite_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36)
  }
  
  /**
   * Accept collaboration invitation
   */
  static async acceptInvitation(
    inviteId: string,
    collaboratorInfo: { name: string; email: string; avatar?: string }
  ): Promise<CollaborationSession | null> {
    const invite = this.invites.get(inviteId)
    if (!invite || invite.isAccepted || invite.expiresAt < new Date()) {
      return null
    }
    
    const session = await this.getSession(invite.sessionId)
    if (!session || !session.isActive) {
      return null
    }
    
    // Add collaborator to session
    const collaborator: Collaborator = {
      id: this.generateCollaboratorId(),
      name: collaboratorInfo.name,
      email: collaboratorInfo.email,
      role: invite.role,
      joinedAt: new Date(),
      lastActive: new Date(),
      avatar: collaboratorInfo.avatar
    }
    
    session.collaborators.push(collaborator)
    invite.isAccepted = true
    invite.acceptedAt = new Date()
    
    this.sessions.set(invite.sessionId, session)
    this.invites.set(inviteId, invite)
    
    return session
  }
  
  /**
   * Generate unique collaborator ID
   */
  private static generateCollaboratorId(): string {
    return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36)
  }
  
  /**
   * Submit vote for an idea
   */
  static async submitVote(
    sessionId: string,
    collaboratorId: string,
    ideaId: string,
    rating: number,
    comment?: string
  ): Promise<boolean> {
    const session = await this.getSession(sessionId)
    if (!session || !session.isActive) {
      return false
    }
    
    // Validate rating
    if (rating < 1 || rating > 5) {
      return false
    }
    
    // Check if collaborator has already voted
    const existingVoteIndex = session.ideas
      .find(idea => idea.id === ideaId)
      ?.votes.findIndex(vote => vote.collaboratorId === collaboratorId)
    
    const vote: Vote = {
      id: this.generateVoteId(),
      collaboratorId,
      ideaId,
      rating,
      comment,
      createdAt: new Date()
    }
    
    const idea = session.ideas.find(i => i.id === ideaId)
    if (!idea) return false
    
    if (existingVoteIndex !== undefined && existingVoteIndex >= 0) {
      // Update existing vote
      idea.votes[existingVoteIndex] = vote
    } else {
      // Add new vote
      idea.votes.push(vote)
    }
    
    // Recalculate average rating
    idea.totalVotes = idea.votes.length
    idea.averageRating = idea.votes.reduce((sum, v) => sum + v.rating, 0) / idea.votes.length
    
    this.sessions.set(sessionId, session)
    
    return true
  }
  
  /**
   * Generate unique vote ID
   */
  private static generateVoteId(): string {
    return 'vote_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36)
  }
  
  /**
   * Submit feedback for an idea
   */
  static async submitFeedback(
    sessionId: string,
    collaboratorId: string,
    ideaId: string,
    type: 'general' | 'specific' | 'suggestion' | 'question',
    content: string
  ): Promise<boolean> {
    const session = await this.getSession(sessionId)
    if (!session || !session.isActive) {
      return false
    }
    
    if (!session.settings.allowComments) {
      return false
    }
    
    const feedback: Feedback = {
      id: this.generateFeedbackId(),
      collaboratorId,
      ideaId,
      type,
      content,
      createdAt: new Date(),
      isResolved: false
    }
    
    const idea = session.ideas.find(i => i.id === ideaId)
    if (!idea) return false
    
    idea.feedback.push(feedback)
    this.sessions.set(sessionId, session)
    
    return true
  }
  
  /**
   * Generate unique feedback ID
   */
  private static generateFeedbackId(): string {
    return 'feedback_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36)
  }
  
  /**
   * Get collaboration statistics
   */
  static async getSessionStats(sessionId: string): Promise<CollaborationStats | null> {
    const session = await this.getSession(sessionId)
    if (!session) return null
    
    const totalVotes = session.ideas.reduce((sum, idea) => sum + idea.totalVotes, 0)
    const totalFeedback = session.ideas.reduce((sum, idea) => sum + idea.feedback.length, 0)
    
    const allRatings = session.ideas.flatMap(idea => 
      idea.votes.map(vote => vote.rating)
    )
    const averageRating = allRatings.length > 0 
      ? allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length 
      : 0
    
    const mostVotedIdea = session.ideas.reduce((max, idea) => 
      idea.totalVotes > max.totalVotes ? idea : max
    )
    
    const leastVotedIdea = session.ideas.reduce((min, idea) => 
      idea.totalVotes < min.totalVotes ? idea : min
    )
    
    const topRatedIdea = session.ideas.reduce((top, idea) => 
      idea.averageRating > top.averageRating ? idea : top
    )
    
    const sessionDuration = (Date.now() - session.createdAt.getTime()) / (1000 * 60 * 60) // hours
    
    return {
      totalCollaborators: session.collaborators.length,
      totalVotes,
      totalFeedback,
      averageRating,
      mostVotedIdea: mostVotedIdea.title,
      leastVotedIdea: leastVotedIdea.title,
      topRatedIdea: topRatedIdea.title,
      sessionDuration
    }
  }
  
  /**
   * Get real-time updates for collaboration session
   */
  static async getSessionUpdates(sessionId: string, lastUpdate?: Date): Promise<{
    hasUpdates: boolean
    updates: {
      newVotes: number
      newFeedback: number
      newCollaborators: number
      ideasUpdated: string[]
    }
  }> {
    const session = await this.getSession(sessionId)
    if (!session) {
      return { hasUpdates: false, updates: { newVotes: 0, newFeedback: 0, newCollaborators: 0, ideasUpdated: [] } }
    }
    
    if (!lastUpdate) {
      return { hasUpdates: false, updates: { newVotes: 0, newFeedback: 0, newCollaborators: 0, ideasUpdated: [] } }
    }
    
    const newVotes = session.ideas.reduce((sum, idea) => 
      sum + idea.votes.filter(vote => vote.createdAt > lastUpdate).length, 0
    )
    
    const newFeedback = session.ideas.reduce((sum, idea) => 
      sum + idea.feedback.filter(feedback => feedback.createdAt > lastUpdate).length, 0
    )
    
    const newCollaborators = session.collaborators.filter(collaborator => 
      collaborator.joinedAt > lastUpdate
    ).length
    
    const ideasUpdated = session.ideas
      .filter(idea => 
        idea.votes.some(vote => vote.createdAt > lastUpdate) ||
        idea.feedback.some(feedback => feedback.createdAt > lastUpdate)
      )
      .map(idea => idea.title)
    
    const hasUpdates = newVotes > 0 || newFeedback > 0 || newCollaborators > 0 || ideasUpdated.length > 0
    
    return {
      hasUpdates,
      updates: {
        newVotes,
        newFeedback,
        newCollaborators,
        ideasUpdated
      }
    }
  }
  
  /**
   * Close collaboration session
   */
  static async closeSession(sessionId: string, userId: string): Promise<boolean> {
    const session = await this.getSession(sessionId)
    if (!session || session.userId !== userId) {
      return false
    }
    
    session.isActive = false
    session.expiresAt = new Date()
    
    this.sessions.set(sessionId, session)
    
    // In production, send notifications to collaborators
    console.log(`Collaboration session ${sessionId} closed by ${userId}`)
    
    return true
  }
  
  /**
   * Extend collaboration session
   */
  static async extendSession(
    sessionId: string, 
    userId: string, 
    additionalHours: number
  ): Promise<boolean> {
    const session = await this.getSession(sessionId)
    if (!session || session.userId !== userId) {
      return false
    }
    
    session.expiresAt = new Date(session.expiresAt.getTime() + additionalHours * 60 * 60 * 1000)
    
    this.sessions.set(sessionId, session)
    
    return true
  }
  
  /**
   * Export collaboration data
   */
  static async exportSessionData(sessionId: string): Promise<{
    session: CollaborationSession
    stats: CollaborationStats
    exportDate: Date
  } | null> {
    const session = await this.getSession(sessionId)
    if (!session) return null
    
    const stats = await this.getSessionStats(sessionId)
    if (!stats) return null
    
    return {
      session,
      stats,
      exportDate: new Date()
    }
  }
}
