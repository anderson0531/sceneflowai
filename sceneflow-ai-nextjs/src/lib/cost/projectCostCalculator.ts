export interface ServiceCostBreakdown {
  service: 'tts' | 'image_gen' | 'video_gen'
  units: number
  unitDescription: string
  creditsPerUnit: number
  byokCreditsPerUnit: number
  totalCredits: number
  totalByokCredits: number
  usdValue: number // Based on credit value
  details: string[]
}

export interface ProjectCostEstimate {
  tts: ServiceCostBreakdown
  images: ServiceCostBreakdown
  video: ServiceCostBreakdown
  totalCredits: number
  totalByokCredits: number
  totalUsd: number
  totalByokUsd: number
  savings: number
}

interface RateCard {
  id: string
  service_category: 'image_gen' | 'video_gen' | 'tts' | 'ai_analysis' | 'storage'
  service_name: string
  quality_tier: 'standard' | 'premium' | 'ultra'
  credits_per_unit: number
  byok_credits_per_unit: number
  unit_description: string
  is_active: boolean
}

// Fallback rates if API is unavailable
const FALLBACK_RATES: Record<string, RateCard> = {
  'tts-ultra-realistic': {
    id: 'fallback-tts',
    service_category: 'tts',
    service_name: 'Ultra-Realistic',
    quality_tier: 'premium',
    credits_per_unit: 10,
    byok_credits_per_unit: 2,
    unit_description: 'per 100 characters',
    is_active: true
  },
  'image_gen-premium': {
    id: 'fallback-image',
    service_category: 'image_gen',
    service_name: 'Premium Image',
    quality_tier: 'premium',
    credits_per_unit: 30,
    byok_credits_per_unit: 6,
    unit_description: 'per image',
    is_active: true
  },
  'video_gen-1080p': {
    id: 'fallback-video',
    service_category: 'video_gen',
    service_name: '1080p',
    quality_tier: 'premium',
    credits_per_unit: 35,
    byok_credits_per_unit: 7,
    unit_description: 'per second',
    is_active: true
  }
}

async function fetchRateCard(category: string, serviceName: string): Promise<RateCard | null> {
  try {
    const response = await fetch('/api/pricing/rate-card')
    if (!response.ok) throw new Error('Failed to fetch rates')
    
    const data = await response.json()
    const rates: RateCard[] = data.rates || []
    
    // Find matching rate
    const rate = rates.find(
      r => r.service_category === category && 
           r.service_name.toLowerCase().includes(serviceName.toLowerCase()) &&
           r.is_active
    )
    
    return rate || null
  } catch (error) {
    console.warn('Failed to fetch rate card, using fallback:', error)
    return null
  }
}

export async function calculateProjectCost(
  scenes: any[],
  characters: any[],
  useBYOK: { tts: boolean; images: boolean; video: boolean }
): Promise<ProjectCostEstimate> {
  // Calculate TTS units (characters)
  const ttsCharacters = calculateTTSCharacters(scenes)
  
  // Calculate image units (number of scenes)
  const imageCount = scenes.length
  
  // Calculate video units (clips based on duration)
  const videoClips = calculateVideoClips(scenes)
  
  // Fetch rates from API or use fallback
  const [ttsRate, imageRate, videoRate] = await Promise.all([
    fetchRateCard('tts', 'Ultra-Realistic').then(r => r || FALLBACK_RATES['tts-ultra-realistic']),
    fetchRateCard('image_gen', 'Premium Image').then(r => r || FALLBACK_RATES['image_gen-premium']),
    fetchRateCard('video_gen', '1080p').then(r => r || FALLBACK_RATES['video_gen-1080p'])
  ])
  
  // Calculate costs for each service
  const tts = calculateServiceCost('tts', ttsCharacters, ttsRate, useBYOK.tts)
  const images = calculateServiceCost('image_gen', imageCount, imageRate, useBYOK.images)
  const video = calculateServiceCost('video_gen', videoClips, videoRate, useBYOK.video)
  
  // Calculate totals
  const totalCredits = tts.totalCredits + images.totalCredits + video.totalCredits
  const totalByokCredits = tts.totalByokCredits + images.totalByokCredits + video.totalByokCredits
  
  return {
    tts,
    images,
    video,
    totalCredits,
    totalByokCredits,
    totalUsd: totalCredits * 0.01, // 1 credit = $0.01
    totalByokUsd: totalByokCredits * 0.01,
    savings: (totalCredits - totalByokCredits) * 0.01
  }
}

function calculateTTSCharacters(scenes: any[]): number {
  let total = 0
  scenes.forEach(scene => {
    // Narration
    if (scene.narration) total += scene.narration.length
    if (scene.action) total += scene.action.length // Include action text
    
    // Dialogue
    if (scene.dialogue && Array.isArray(scene.dialogue)) {
      scene.dialogue.forEach((line: any) => {
        if (line.line) total += line.line.length
      })
    }
  })
  return total
}

function calculateVideoClips(scenes: any[]): number {
  // Calculate based on scene duration (8 seconds per clip)
  const totalSeconds = scenes.reduce((sum, scene) => {
    const narrationLength = scene.narration?.length || 0
    const dialogueLength = scene.dialogue?.reduce((s: number, d: any) => s + (d.line?.length || 0), 0) || 0
    const actionLength = scene.action?.length || 0
    
    // Estimate: ~15 chars/sec for speech, ~10 chars/sec for action descriptions
    const speechSeconds = (narrationLength + dialogueLength) / 15
    const actionSeconds = actionLength / 10
    const estimatedSeconds = Math.max(5, speechSeconds + actionSeconds)
    
    return sum + estimatedSeconds
  }, 0)
  
  // Return number of clips (each clip is 8 seconds)
  return Math.ceil(totalSeconds / 8)
}

function calculateServiceCost(
  service: string,
  units: number,
  rate: any,
  useBYOK: boolean
): ServiceCostBreakdown {
  const creditsPerUnit = Number(rate?.credits_per_unit || 0)
  const byokCreditsPerUnit = Number(rate?.byok_credits_per_unit || 0)
  
  // For TTS, convert characters to units (per 100 characters)
  let actualUnits = units
  if (service === 'tts' && rate?.unit_description?.includes('100')) {
    actualUnits = Math.ceil(units / 100)
  }
  
  // For video, if rate is per second, convert clips to seconds (8 seconds per clip)
  // units here represents number of clips
  if (service === 'video_gen' && rate?.unit_description?.includes('second')) {
    actualUnits = units * 8 // 8 seconds per clip
  }
  
  const totalCredits = useBYOK ? byokCreditsPerUnit * actualUnits : creditsPerUnit * actualUnits
  const totalByokCredits = byokCreditsPerUnit * actualUnits
  
  return {
    service: service as any,
    units: actualUnits,
    unitDescription: rate?.unit_description || '',
    creditsPerUnit,
    byokCreditsPerUnit,
    totalCredits,
    totalByokCredits,
    usdValue: totalCredits * 0.01,
    details: []
  }
}
