export interface YouTubeVideo {
  id: string
  title: string
  description: string
  thumbnail: string
  channelTitle: string
  publishedAt: string
  viewCount: string
  duration: string
  tags: string[]
  categoryId: string
  defaultLanguage?: string
  defaultAudioLanguage?: string
}

export interface YouTubeSearchResult {
  success: boolean
  videos: YouTubeVideo[]
  totalResults: number
  nextPageToken?: string
  error?: string
}

export interface YouTubeSearchParams {
  query: string
  maxResults?: number
  order?: 'relevance' | 'date' | 'rating' | 'title' | 'videoCount' | 'viewCount'
  publishedAfter?: string
  publishedBefore?: string
  videoDuration?: 'short' | 'medium' | 'long'
  videoDefinition?: 'high' | 'standard'
  videoEmbeddable?: boolean
  regionCode?: string
  relevanceLanguage?: string
}

export class YouTubeIntegrationService {
  private static readonly API_BASE_URL = 'https://www.googleapis.com/youtube/v3'
  private static readonly DEFAULT_MAX_RESULTS = 10
  
  /**
   * Search for videos on YouTube based on search parameters
   */
  static async searchVideos(
    apiKey: string,
    params: YouTubeSearchParams
  ): Promise<YouTubeSearchResult> {
    try {
      const searchParams = new URLSearchParams({
        part: 'snippet,statistics,contentDetails',
        key: apiKey,
        q: params.query,
        type: 'video',
        maxResults: (params.maxResults || this.DEFAULT_MAX_RESULTS).toString(),
        order: params.order || 'relevance',
        videoEmbeddable: 'true'
      })
      
      if (params.publishedAfter) {
        searchParams.append('publishedAfter', params.publishedAfter)
      }
      
      if (params.publishedBefore) {
        searchParams.append('publishedBefore', params.publishedBefore)
      }
      
      if (params.videoDuration) {
        searchParams.append('videoDuration', params.videoDuration)
      }
      
      if (params.videoDefinition) {
        searchParams.append('videoDefinition', params.videoDefinition)
      }
      
      if (params.regionCode) {
        searchParams.append('regionCode', params.regionCode)
      }
      
      if (params.relevanceLanguage) {
        searchParams.append('relevanceLanguage', params.relevanceLanguage)
      }
      
      const response = await fetch(
        `${this.API_BASE_URL}/search?${searchParams.toString()}`
      )
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        return {
          success: false,
          videos: [],
          totalResults: 0,
          error: data.error.message || 'YouTube API error'
        }
      }
      
      // Get video details for each search result
      const videoIds = data.items.map((item: any) => item.id.videoId)
      const videoDetails = await this.getVideoDetails(apiKey, videoIds)
      
      const videos: YouTubeVideo[] = data.items.map((item: any, index: number) => {
        const details = videoDetails[index] || {}
        
        return {
          id: item.id.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
          viewCount: details.statistics?.viewCount || '0',
          duration: details.contentDetails?.duration || '',
          tags: item.snippet.tags || [],
          categoryId: item.snippet.categoryId,
          defaultLanguage: item.snippet.defaultLanguage,
          defaultAudioLanguage: item.snippet.defaultAudioLanguage
        }
      })
      
      return {
        success: true,
        videos,
        totalResults: data.pageInfo.totalResults,
        nextPageToken: data.nextPageToken
      }
      
    } catch (error) {
      console.error('YouTube search error:', error)
      return {
        success: false,
        videos: [],
        totalResults: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  /**
   * Get detailed information for multiple videos
   */
  private static async getVideoDetails(
    apiKey: string,
    videoIds: string[]
  ): Promise<any[]> {
    try {
      const searchParams = new URLSearchParams({
        part: 'statistics,contentDetails',
        key: apiKey,
        id: videoIds.join(',')
      })
      
      const response = await fetch(
        `${this.API_BASE_URL}/videos?${searchParams.toString()}`
      )
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.items || []
      
    } catch (error) {
      console.error('YouTube video details error:', error)
      return []
    }
  }
  
  /**
   * Search for videos similar to a given idea
   */
  static async findSimilarVideos(
    apiKey: string,
    idea: {
      title: string
      synopsis: string
      targetAudience?: string
      genre?: string
    },
    maxResults: number = 6
  ): Promise<YouTubeSearchResult> {
    try {
      // Create search query based on idea content
      const searchTerms = this.extractSearchTerms(idea)
      const query = searchTerms.join(' ')
      
      // Search for videos
      const searchResult = await this.searchVideos(apiKey, {
        query,
        maxResults,
        order: 'relevance',
        videoDuration: 'medium', // Focus on medium-length videos
        videoDefinition: 'high' // Prefer high-definition videos
      })
      
      if (!searchResult.success) {
        return searchResult
      }
      
      // Filter and rank results by relevance
      const rankedVideos = this.rankVideosByRelevance(searchResult.videos, idea)
      
      return {
        ...searchResult,
        videos: rankedVideos
      }
      
    } catch (error) {
      console.error('Error finding similar videos:', error)
      return {
        success: false,
        videos: [],
        totalResults: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  /**
   * Extract relevant search terms from an idea
   */
  private static extractSearchTerms(idea: {
    title: string
    synopsis: string
    targetAudience?: string
    genre?: string
  }): string[] {
    const terms: string[] = []
    
    // Extract key terms from title
    const titleTerms = idea.title
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 3 && !['the', 'and', 'for', 'with', 'from'].includes(term))
      .slice(0, 3)
    
    terms.push(...titleTerms)
    
    // Extract key terms from synopsis
    const synopsisTerms = idea.synopsis
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 4 && !['this', 'that', 'will', 'can', 'make', 'help', 'show'].includes(term))
      .slice(0, 4)
    
    terms.push(...synopsisTerms)
    
    // Add genre if available
    if (idea.genre) {
      terms.push(idea.genre.toLowerCase())
    }
    
    // Add target audience keywords
    if (idea.targetAudience) {
      const audienceKeywords = idea.targetAudience
        .toLowerCase()
        .split(/\s+/)
        .filter(term => term.length > 3)
        .slice(0, 2)
      
      terms.push(...audienceKeywords)
    }
    
    // Remove duplicates and limit to reasonable number
    const uniqueTerms = [...new Set(terms)].slice(0, 8)
    
    return uniqueTerms
  }
  
  /**
   * Rank videos by relevance to the idea
   */
  private static rankVideosByRelevance(
    videos: YouTubeVideo[],
    idea: {
      title: string
      synopsis: string
      targetAudience?: string
      genre?: string
    }
  ): YouTubeVideo[] {
    const ideaText = `${idea.title} ${idea.synopsis} ${idea.genre || ''} ${idea.targetAudience || ''}`.toLowerCase()
    
    return videos.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, ideaText)
      const scoreB = this.calculateRelevanceScore(b, ideaText)
      
      return scoreB - scoreA
    })
  }
  
  /**
   * Calculate relevance score for a video
   */
  private static calculateRelevanceScore(video: YouTubeVideo, ideaText: string): number {
    let score = 0
    
    // Title relevance
    const titleWords = video.title.toLowerCase().split(/\s+/)
    const titleMatches = titleWords.filter(word => ideaText.includes(word)).length
    score += titleMatches * 2
    
    // Description relevance
    const descWords = video.description.toLowerCase().split(/\s+/)
    const descMatches = descWords.filter(word => ideaText.includes(word)).length
    score += descMatches * 1
    
    // Tags relevance
    const tagMatches = video.tags.filter(tag => ideaText.includes(tag.toLowerCase())).length
    score += tagMatches * 1.5
    
    // View count bonus (popularity)
    const viewCount = parseInt(video.viewCount) || 0
    if (viewCount > 1000000) score += 2
    else if (viewCount > 100000) score += 1
    else if (viewCount > 10000) score += 0.5
    
    // Recency bonus
    const publishedDate = new Date(video.publishedAt)
    const daysSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSincePublished < 30) score += 1
    else if (daysSincePublished < 90) score += 0.5
    
    return score
  }
  
  /**
   * Format duration string to readable format
   */
  static formatDuration(duration: string): string {
    try {
      // Parse ISO 8601 duration format (PT4M13S)
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
      
      if (!match) return duration
      
      const hours = parseInt(match[1]) || 0
      const minutes = parseInt(match[2]) || 0
      const seconds = parseInt(match[3]) || 0
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      } else {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
      }
    } catch (error) {
      return duration
    }
  }
  
  /**
   * Format view count to readable format
   */
  static formatViewCount(viewCount: string): string {
    try {
      const count = parseInt(viewCount)
      
      if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M views`
      } else if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}K views`
      } else {
        return `${count} views`
      }
    } catch (error) {
      return viewCount
    }
  }
  
  /**
   * Get channel information
   */
  static async getChannelInfo(
    apiKey: string,
    channelId: string
  ): Promise<{
    success: boolean
    channel?: {
      id: string
      title: string
      description: string
      thumbnail: string
      subscriberCount: string
      videoCount: string
    }
    error?: string
  }> {
    try {
      const searchParams = new URLSearchParams({
        part: 'snippet,statistics',
        key: apiKey,
        id: channelId
      })
      
      const response = await fetch(
        `${this.API_BASE_URL}/channels?${searchParams.toString()}`
      )
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.error || !data.items || data.items.length === 0) {
        return {
          success: false,
          error: data.error?.message || 'Channel not found'
        }
      }
      
      const channel = data.items[0]
      
      return {
        success: true,
        channel: {
          id: channel.id,
          title: channel.snippet.title,
          description: channel.snippet.description,
          thumbnail: channel.snippet.thumbnails.default?.url,
          subscriberCount: channel.statistics.subscriberCount || '0',
          videoCount: channel.statistics.videoCount || '0'
        }
      }
      
    } catch (error) {
      console.error('YouTube channel info error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  /**
   * Validate YouTube API key
   */
  static async validateApiKey(apiKey: string): Promise<{
    isValid: boolean
    quotaRemaining?: number
    error?: string
  }> {
    try {
      // Make a simple search request to test the API key
      const testResult = await this.searchVideos(apiKey, {
        query: 'test',
        maxResults: 1
      })
      
      if (testResult.success) {
        return {
          isValid: true,
          quotaRemaining: 10000 // This would come from API response headers in production
        }
      } else {
        return {
          isValid: false,
          error: testResult.error || 'API key validation failed'
        }
      }
      
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}
