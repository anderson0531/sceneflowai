import type { ProjectTemplate } from '@/types/SceneFlowCore'

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'short-film',
    name: 'Short Film',
    description: 'Create a compelling short film (5-15 minutes)',
    category: 'short-film',
    estimatedDuration: 10,
    complexity: 'intermediate',
    tags: ['narrative', 'cinematic', 'storytelling'],
    previewImage: '/templates/short-film.jpg'
  },
  {
    id: 'commercial',
    name: 'Commercial',
    description: 'Produce an engaging commercial or advertisement',
    category: 'commercial',
    estimatedDuration: 30,
    complexity: 'beginner',
    tags: ['marketing', 'brand', 'persuasive'],
    previewImage: '/templates/commercial.jpg'
  },
  {
    id: 'documentary',
    name: 'Documentary',
    description: 'Tell a real story with documentary style',
    category: 'documentary',
    estimatedDuration: 5,
    complexity: 'intermediate',
    tags: ['educational', 'informative', 'real'],
    previewImage: '/templates/documentary.jpg'
  },
  {
    id: 'music-video',
    name: 'Music Video',
    description: 'Create a visual story for music',
    category: 'music-video',
    estimatedDuration: 4,
    complexity: 'beginner',
    tags: ['musical', 'creative', 'artistic'],
    previewImage: '/templates/music-video.jpg'
  },
  {
    id: 'social-media',
    name: 'Social Media',
    description: 'Quick content for social platforms',
    category: 'social-media',
    estimatedDuration: 1,
    complexity: 'beginner',
    tags: ['short', 'engaging', 'viral'],
    previewImage: '/templates/social-media.jpg'
  },
  {
    id: 'brand-story',
    name: 'Brand Story',
    description: 'Tell your company or product story',
    category: 'commercial',
    estimatedDuration: 2,
    complexity: 'beginner',
    tags: ['branding', 'corporate', 'marketing'],
    previewImage: '/templates/brand-story.jpg'
  },
  {
    id: 'educational',
    name: 'Educational',
    description: 'Create informative and engaging content',
    category: 'documentary',
    estimatedDuration: 8,
    complexity: 'intermediate',
    tags: ['educational', 'learning', 'informative'],
    previewImage: '/templates/educational.jpg'
  },
  {
    id: 'event-highlight',
    name: 'Event Highlight',
    description: 'Capture the essence of special events',
    category: 'documentary',
    estimatedDuration: 3,
    complexity: 'beginner',
    tags: ['events', 'celebration', 'memories'],
    previewImage: '/templates/event-highlight.jpg'
  }
]

export const GENRE_OPTIONS = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Fantasy',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Thriller',
  'Western',
  'Musical',
  'Historical',
  'Biographical',
  'Experimental',
  'Commercial',
  'Educational'
]

export const TONE_OPTIONS = [
  'Inspirational',
  'Humorous',
  'Dramatic',
  'Mysterious',
  'Romantic',
  'Energetic',
  'Calm',
  'Intense',
  'Whimsical',
  'Serious',
  'Playful',
  'Melancholic',
  'Uplifting',
  'Suspenseful',
  'Heartwarming',
  'Thought-provoking',
  'Entertaining',
  'Educational',
  'Persuasive',
  'Artistic'
]

export const TARGET_AUDIENCE_OPTIONS = [
  'Children (Ages 3-12)',
  'Teenagers (Ages 13-17)',
  'Young Adults (Ages 18-25)',
  'Adults (Ages 26-40)',
  'Middle-aged Adults (Ages 41-60)',
  'Seniors (Ages 60+)',
  'Families',
  'Professionals',
  'Students',
  'Entrepreneurs',
  'Creative Professionals',
  'General Audience',
  'Niche Interest Groups',
  'International Audience',
  'Local Community'
]

export const DURATION_OPTIONS = [
  { value: 15, label: '15 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 90, label: '1.5 minutes' },
  { value: 120, label: '2 minutes' },
  { value: 180, label: '3 minutes' },
  { value: 240, label: '4 minutes' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
  { value: 900, label: '15 minutes' },
  { value: 1200, label: '20 minutes' },
  { value: 1800, label: '30 minutes' },
  { value: 3600, label: '1 hour' }
]

export const COMPLEXITY_LEVELS = [
  {
    value: 'beginner',
    label: 'Beginner',
    description: 'Simple concepts, basic structure, minimal complexity',
    icon: '🌱'
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    description: 'Moderate complexity, some advanced techniques',
    icon: '🌿'
  },
  {
    value: 'advanced',
    label: 'Advanced',
    description: 'Complex concepts, sophisticated techniques',
    icon: '🌳'
  }
]

export const PROJECT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'text-gray-500' },
  { value: 'in_progress', label: 'In Progress', color: 'text-blue-500' },
  { value: 'completed', label: 'Completed', color: 'text-green-500' },
  { value: 'archived', label: 'Archived', color: 'text-gray-400' }
]

export const MODULE_SEQUENCE = [
  'ideation',
  'story-structure',
  'vision-board',
  'direction',
  'screening-room',
  'quality-control'
] as const

export const MODULE_DISPLAY_NAMES: Record<string, string> = {
  'ideation': 'The Spark Studio',
  'story-structure': 'Story Structure Studio',
  'vision-board': 'The Vision Board',
  'direction': "The Director's Chair",
  'screening-room': 'The Screening Room',
  'quality-control': 'Quality Control'
}

export const MODULE_DESCRIPTIONS: Record<string, string> = {
  'ideation': 'Generate compelling film concepts and core premises',
  'story-structure': 'Architect your narrative blueprint with professional structures',
  'vision-board': 'Define visual language and create style guides',
  'direction': 'Generate industry-standard production documents',
  'screening-room': 'Transform your plan into AI-generated video clips',
  'quality-control': 'Refine, review, and finalize your cinematic product'
}

export const MODULE_ICONS: Record<string, string> = {
  'ideation': '💡',
  'story-structure': '📚',
  'vision-board': '🎨',
  'direction': '🎬',
  'screening-room': '🎥',
  'quality-control': '✅'
}

export const MODULE_COLORS: Record<string, string> = {
  'ideation': 'from-blue-500 to-blue-600',
  'story-structure': 'from-emerald-500 to-emerald-600',
  'vision-board': 'from-orange-500 to-orange-600',
  'direction': 'from-purple-500 to-purple-600',
  'screening-room': 'from-pink-500 to-pink-600',
  'quality-control': 'from-cyan-500 to-cyan-600'
}





