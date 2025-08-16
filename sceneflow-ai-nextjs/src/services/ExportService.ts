import { CollaborationSession, CollaborationStats } from './CollaborationService'

export interface ExportOptions {
  format: 'pdf' | 'rtf'
  includeThumbnails: boolean
  includeFeedback: boolean
  includeVotes: boolean
  includeCollaborators: boolean
  customStyling?: {
    primaryColor: string
    secondaryColor: string
    fontFamily: string
    fontSize: number
  }
}

export interface ExportResult {
  success: boolean
  data?: string | Blob
  fileName: string
  error?: string
  metadata: {
    format: string
    size: number
    generatedAt: Date
    pageCount?: number
  }
}

export class ExportService {
  /**
   * Export collaboration session data
   */
  static async exportSession(
    session: CollaborationSession,
    stats: CollaborationStats,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      if (options.format === 'pdf') {
        return await this.exportToPDF(session, stats, options)
      } else if (options.format === 'rtf') {
        return await this.exportToRTF(session, stats, options)
      } else {
        throw new Error(`Unsupported export format: ${options.format}`)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
        fileName: `export_${session.id}_${Date.now()}.${options.format}`,
        metadata: {
          format: options.format,
          size: 0,
          generatedAt: new Date()
        }
      }
    }
  }

  /**
   * Export to PDF format
   */
  private static async exportToPDF(
    session: CollaborationSession,
    stats: CollaborationStats,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // In production, this would use @react-pdf/renderer
      // For now, we'll create a simulated PDF structure
      
      const pdfContent = this.generatePDFContent(session, stats, options)
      const fileName = `collaboration_${session.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`
      
      // Simulate PDF generation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Create a mock PDF blob (in production, this would be actual PDF data)
      const blob = new Blob([pdfContent], { type: 'application/pdf' })
      
      return {
        success: true,
        data: blob,
        fileName,
        metadata: {
          format: 'pdf',
          size: blob.size,
          generatedAt: new Date(),
          pageCount: this.calculatePageCount(session, options)
        }
      }
      
    } catch (error) {
      throw new Error(`PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Export to RTF format
   */
  private static async exportToRTF(
    session: CollaborationSession,
    stats: CollaborationStats,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const rtfContent = this.generateRTFContent(session, stats, options)
      const fileName = `collaboration_${session.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.rtf`
      
      // Simulate RTF generation
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Create RTF blob
      const blob = new Blob([rtfContent], { type: 'application/rtf' })
      
      return {
        success: true,
        data: blob,
        fileName,
        metadata: {
          format: 'rtf',
          size: blob.size,
          generatedAt: new Date()
        }
      }
      
    } catch (error) {
      throw new Error(`RTF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate PDF content structure
   */
  private static generatePDFContent(
    session: CollaborationSession,
    stats: CollaborationStats,
    options: ExportOptions
  ): string {
    const content = {
      title: `Collaboration Report: ${session.title}`,
      session: {
        id: session.id,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        description: session.description
      },
      statistics: {
        totalCollaborators: stats.totalCollaborators,
        totalVotes: stats.totalVotes,
        totalFeedback: stats.totalFeedback,
        averageRating: stats.averageRating.toFixed(2),
        mostVotedIdea: stats.mostVotedIdea,
        topRatedIdea: stats.topRatedIdea,
        sessionDuration: `${stats.sessionDuration.toFixed(1)} hours`
      },
      ideas: session.ideas.map(idea => ({
        title: idea.title,
        synopsis: idea.synopsis,
        strength_rating: idea.strength_rating,
        averageRating: idea.averageRating.toFixed(2),
        totalVotes: idea.totalVotes,
        feedbackCount: idea.feedback.length,
        scene_outline: idea.scene_outline
      })),
      collaborators: options.includeCollaborators ? session.collaborators.map(collaborator => ({
        name: collaborator.name,
        email: collaborator.email,
        role: collaborator.role,
        joinedAt: collaborator.joinedAt,
        lastActive: collaborator.lastActive
      })) : [],
      feedback: options.includeFeedback ? session.ideas.flatMap(idea => 
        idea.feedback.map(feedback => ({
          ideaTitle: idea.title,
          type: feedback.type,
          content: feedback.content,
          createdAt: feedback.createdAt,
          isResolved: feedback.isResolved
        }))
      ) : [],
      votes: options.includeVotes ? session.ideas.flatMap(idea => 
        idea.votes.map(vote => ({
          ideaTitle: idea.title,
          rating: vote.rating,
          comment: vote.comment,
          createdAt: vote.createdAt
        }))
      ) : [],
      exportOptions: options,
      generatedAt: new Date().toISOString()
    }
    
    return JSON.stringify(content, null, 2)
  }

  /**
   * Generate RTF content
   */
  private static generateRTFContent(
    session: CollaborationSession,
    stats: CollaborationStats,
    options: ExportOptions
  ): string {
    // RTF header
    let rtf = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}\n'
    rtf += '\\viewkind4\\uc1\\pard\\f0\\fs24\n'
    
    // Title
    rtf += `\\b\\fs36 Collaboration Report: ${session.title}\\b0\\fs24\\par\\par\n`
    
    // Session Info
    rtf += '\\b Session Information\\b0\\par\n'
    rtf += `Session ID: ${session.id}\\par\n`
    rtf += `Created: ${session.createdAt.toLocaleDateString()}\\par\n`
    rtf += `Expires: ${session.expiresAt.toLocaleDateString()}\\par\n`
    rtf += `Description: ${session.description}\\par\\par\n`
    
    // Statistics
    rtf += '\\b Statistics\\b0\\par\n'
    rtf += `Total Collaborators: ${stats.totalCollaborators}\\par\n`
    rtf += `Total Votes: ${stats.totalVotes}\\par\n`
    rtf += `Total Feedback: ${stats.totalFeedback}\\par\n`
    rtf += `Average Rating: ${stats.averageRating.toFixed(2)}\\par\n`
    rtf += `Most Voted Idea: ${stats.mostVotedIdea}\\par\n`
    rtf += `Top Rated Idea: ${stats.topRatedIdea}\\par\\par\n`
    
    // Ideas
    rtf += '\\b Generated Ideas\\b0\\par\\par\n'
    session.ideas.forEach((idea, index) => {
      rtf += `\\b ${index + 1}. ${idea.title}\\b0\\par\n`
      rtf += `Synopsis: ${idea.synopsis}\\par\n`
      rtf += `Strength Rating: ${idea.strength_rating}/5\\par\n`
      rtf += `Average Rating: ${idea.averageRating.toFixed(2)}/5\\par\n`
      rtf += `Total Votes: ${idea.totalVotes}\\par\n`
      rtf += `Feedback Count: ${idea.feedback.length}\\par\\par\n`
      
      if (options.includeVotes && idea.votes.length > 0) {
        rtf += '\\i Votes:\\i0\\par\n'
        idea.votes.forEach(vote => {
          rtf += `\\tab Rating: ${vote.rating}/5`
          if (vote.comment) rtf += ` - ${vote.comment}`
          rtf += '\\par\n'
        })
        rtf += '\\par\n'
      }
      
      if (options.includeFeedback && idea.feedback.length > 0) {
        rtf += '\\i Feedback:\\i0\\par\n'
        idea.feedback.forEach(feedback => {
          rtf += `\\tab [${feedback.type.toUpperCase()}] ${feedback.content}\\par\n`
        })
        rtf += '\\par\n'
      }
    })
    
    // Collaborators
    if (options.includeCollaborators && session.collaborators.length > 0) {
      rtf += '\\b Collaborators\\b0\\par\\par\n'
      session.collaborators.forEach(collaborator => {
        rtf += `\\tab ${collaborator.name} (${collaborator.role}) - ${collaborator.email}\\par\n`
      })
      rtf += '\\par\n'
    }
    
    // Footer
    rtf += `\\i Report generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\\i0\\par\n`
    rtf += '}'
    
    return rtf
  }

  /**
   * Calculate estimated page count for PDF
   */
  private static calculatePageCount(session: CollaborationSession, options: ExportOptions): number {
    let pageCount = 1 // Cover page
    
    // Session info page
    pageCount += 1
    
    // Statistics page
    pageCount += 1
    
    // Ideas pages (estimate 2 ideas per page)
    pageCount += Math.ceil(session.ideas.length / 2)
    
    // Additional pages for detailed content
    if (options.includeVotes) {
      pageCount += Math.ceil(session.ideas.length / 3)
    }
    
    if (options.includeFeedback) {
      pageCount += Math.ceil(session.ideas.length / 2)
    }
    
    if (options.includeCollaborators) {
      pageCount += Math.ceil(session.collaborators.length / 10)
    }
    
    return Math.max(pageCount, 3) // Minimum 3 pages
  }

  /**
   * Generate summary report using LLM
   */
  static async generateLLMSummary(
    session: CollaborationSession,
    stats: CollaborationStats
  ): Promise<string> {
    try {
      // In production, this would call an LLM API to generate insights
      // For now, we'll create a structured summary
      
      const summary = {
        overview: `Collaboration session "${session.title}" generated ${session.ideas.length} video ideas with input from ${stats.totalCollaborators} collaborators.`,
        keyInsights: [
          `The most popular idea was "${stats.mostVotedIdea}" with the highest engagement.`,
          `Overall session rating: ${stats.averageRating.toFixed(2)}/5 based on ${stats.totalVotes} votes.`,
          `Collaborators provided ${stats.totalFeedback} pieces of feedback across all ideas.`,
          `Session duration: ${stats.sessionDuration.toFixed(1)} hours of active collaboration.`
        ],
        recommendations: [
          'Consider the top-rated ideas for immediate development.',
          'Address feedback on lower-rated ideas to improve concepts.',
          'Engage with active collaborators for future projects.',
          'Use voting patterns to understand audience preferences.'
        ],
        nextSteps: [
          'Select the highest-rated idea for storyboard development.',
          'Incorporate feedback to refine chosen concepts.',
          'Plan follow-up collaboration sessions for production phases.',
          'Document lessons learned for future collaboration projects.'
        ]
      }
      
      return JSON.stringify(summary, null, 2)
      
    } catch (error) {
      console.error('Error generating LLM summary:', error)
      return 'Summary generation failed. Please review the raw data manually.'
    }
  }

  /**
   * Create executive summary
   */
  static createExecutiveSummary(
    session: CollaborationSession,
    stats: CollaborationStats
  ): string {
    const topIdeas = session.ideas
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 3)
    
    let summary = `EXECUTIVE SUMMARY\n\n`
    summary += `Project: ${session.title}\n`
    summary += `Session Duration: ${stats.sessionDuration.toFixed(1)} hours\n`
    summary += `Total Participants: ${stats.totalCollaborators}\n`
    summary += `Total Engagement: ${stats.totalVotes} votes, ${stats.totalFeedback} feedback items\n\n`
    
    summary += `TOP PERFORMING IDEAS:\n`
    topIdeas.forEach((idea, index) => {
      summary += `${index + 1}. ${idea.title} (Rating: ${idea.averageRating.toFixed(2)}/5, Votes: ${idea.totalVotes})\n`
    })
    
    summary += `\nKEY INSIGHTS:\n`
    summary += `• Most voted idea: "${stats.mostVotedIdea}"\n`
    summary += `• Highest rated idea: "${stats.topRatedIdea}"\n`
    summary += `• Overall session rating: ${stats.averageRating.toFixed(2)}/5\n`
    
    summary += `\nRECOMMENDATIONS:\n`
    summary += `• Proceed with "${topIdeas[0]?.title}" as primary concept\n`
    summary += `• Incorporate feedback from collaboration session\n`
    summary += `• Consider "${topIdeas[1]?.title}" as secondary option\n`
    summary += `• Document collaboration insights for future projects\n`
    
    return summary
  }

  /**
   * Validate export options
   */
  static validateExportOptions(options: ExportOptions): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    
    if (!['pdf', 'rtf'].includes(options.format)) {
      errors.push('Invalid export format. Must be "pdf" or "rtf".')
    }
    
    if (options.customStyling) {
      const { primaryColor, secondaryColor, fontFamily, fontSize } = options.customStyling
      
      if (primaryColor && !/^#[0-9A-F]{6}$/i.test(primaryColor)) {
        errors.push('Invalid primary color format. Use hex color (e.g., #FF0000).')
      }
      
      if (secondaryColor && !/^#[0-9A-F]{6}$/i.test(secondaryColor)) {
        errors.push('Invalid secondary color format. Use hex color (e.g., #FF0000).')
      }
      
      if (fontSize && (fontSize < 8 || fontSize > 72)) {
        errors.push('Font size must be between 8 and 72.')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get export file size estimate
   */
  static estimateFileSize(
    session: CollaborationSession,
    options: ExportOptions
  ): number {
    let baseSize = 1024 * 50 // 50KB base
    
    // Add size for ideas
    baseSize += session.ideas.length * 1024 * 2 // 2KB per idea
    
    // Add size for feedback
    if (options.includeFeedback) {
      const totalFeedback = session.ideas.reduce((sum, idea) => sum + idea.feedback.length, 0)
      baseSize += totalFeedback * 512 // 512 bytes per feedback
    }
    
    // Add size for votes
    if (options.includeVotes) {
      const totalVotes = session.ideas.reduce((sum, idea) => sum + idea.votes.length, 0)
      baseSize += totalVotes * 256 // 256 bytes per vote
    }
    
    // Add size for collaborators
    if (options.includeCollaborators) {
      baseSize += session.collaborators.length * 512 // 512 bytes per collaborator
    }
    
    // Format multiplier
    if (options.format === 'pdf') {
      baseSize *= 1.5 // PDFs are typically larger
    }
    
    return Math.round(baseSize)
  }
}
