'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  HelpCircle, 
  PlayCircle, 
  Book, 
  Lightbulb, 
  Film, 
  Scissors, 
  Star,
  ChevronDown,
  ChevronRight,
  Search,
  Clock,
  Home,
  FolderOpen,
  Sparkles,
  Settings,
  MessageCircle,
  LayoutDashboard
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// =============================================================================
// TYPES
// =============================================================================

interface VideoPlaceholder {
  id: string
  title: string
  duration: string
  description: string
}

interface HelpArticle {
  id: string
  title: string
  content: string
  steps?: string[]
  tips?: string[]
  relatedVideoId?: string
}

interface HelpSection {
  id: string
  title: string
  icon: React.ReactNode
  description: string
  articles: HelpArticle[]
  videos: VideoPlaceholder[]
}

// =============================================================================
// HELP CONTENT DATA
// =============================================================================

const helpSections: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <Home className="w-5 h-5" />,
    description: 'Learn the basics of SceneFlow AI and get up and running quickly.',
    articles: [
      {
        id: 'welcome',
        title: 'Welcome to SceneFlow AI',
        content: 'SceneFlow AI is an AI-powered video production platform that helps you create professional video content from concept to final cut. Our workflow guides you through four phases: Blueprint, Production, Final Cut, and Premiere.',
        steps: [
          'Start with your idea or concept in the Blueprint phase',
          'Develop your script, characters, and visuals in Production',
          'Assemble and polish your video in Final Cut',
          'Share and publish in Premiere'
        ],
        tips: [
          'Use Cue, your AI assistant, anytime by clicking the sparkle icon',
          'Follow the Workflow Guide in the sidebar for step-by-step guidance',
          'Your work auto-saves as you go'
        ],
        relatedVideoId: 'intro-overview'
      },
      {
        id: 'quick-start',
        title: 'Quick Start Guide',
        content: 'Get your first project created in under 5 minutes.',
        steps: [
          'Click "New Project" from the Dashboard',
          'Enter your video concept or idea',
          'Click "Generate Blueprint" to create your film treatment',
          'Review and refine using Audience Resonance',
          'Click "Start Production" when ready'
        ],
        relatedVideoId: 'quick-start-video'
      },
      {
        id: 'navigation',
        title: 'Navigating the Interface',
        content: 'Learn how to navigate SceneFlow AI efficiently.',
        steps: [
          'Use the left sidebar for workflow navigation',
          'The top bar shows your current project and credits',
          'Access settings, help, and profile from the top right',
          'Use keyboard shortcuts for faster workflow (Cmd/Ctrl+S to save)'
        ],
        tips: [
          'Press ? to see all keyboard shortcuts',
          'The sidebar collapses on smaller screens - click the menu icon to expand'
        ]
      }
    ],
    videos: [
      {
        id: 'intro-overview',
        title: 'SceneFlow AI Overview',
        duration: '3:45',
        description: 'A complete tour of SceneFlow AI and what you can create.'
      },
      {
        id: 'quick-start-video',
        title: 'Your First Project in 5 Minutes',
        duration: '5:00',
        description: 'Follow along to create your first video project.'
      }
    ]
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    description: 'Your command center for managing projects and monitoring usage.',
    articles: [
      {
        id: 'dashboard-overview',
        title: 'Dashboard Overview',
        content: 'The Dashboard is your home base in SceneFlow AI. Here you can see your active projects, monitor credits, and quickly access key features.',
        steps: [
          'View your most recent projects in the Active Projects section',
          'Monitor your credit balance in the Budget Health widget',
          'Use Quick Actions to create new projects or access settings',
          'Check your storage usage in the Storage widget'
        ],
        relatedVideoId: 'dashboard-tour'
      },
      {
        id: 'cue-assistant',
        title: 'Using Cue AI Assistant',
        content: 'Cue is your AI-powered assistant that helps you throughout your workflow. Access Cue anytime by clicking the sparkle icon in the bottom right.',
        tips: [
          'Ask Cue for help with any feature',
          'Cue provides context-aware suggestions based on your current page',
          'Use Cue to brainstorm ideas or refine your content'
        ],
        relatedVideoId: 'cue-assistant-guide'
      },
      {
        id: 'credits-management',
        title: 'Understanding Credits',
        content: 'Credits are used for AI-powered features like generating treatments, images, audio, and video.',
        steps: [
          'Check your balance in the top navigation or Dashboard',
          'Purchase more credits from Dashboard → Buy Credits',
          'View usage breakdown in Settings → Billing'
        ],
        tips: [
          'Blueprint generation uses fewer credits than video generation',
          'Optimize your script before generating video to save credits',
          'Consider the Coffee Break plan for additional credits'
        ]
      }
    ],
    videos: [
      {
        id: 'dashboard-tour',
        title: 'Dashboard Deep Dive',
        duration: '4:30',
        description: 'Explore every feature of the Dashboard.'
      },
      {
        id: 'cue-assistant-guide',
        title: 'Getting the Most from Cue',
        duration: '6:00',
        description: 'Tips and tricks for using the AI assistant effectively.'
      }
    ]
  },
  {
    id: 'projects',
    title: 'Projects',
    icon: <FolderOpen className="w-5 h-5" />,
    description: 'Manage, organize, and access all your video projects.',
    articles: [
      {
        id: 'projects-overview',
        title: 'Managing Your Projects',
        content: 'The Projects page shows all your video projects with their current status and progress.',
        steps: [
          'Use the search bar to find projects by name',
          'Filter projects by status or date',
          'Switch between grid and list views',
          'Click any project to continue working on it'
        ],
        relatedVideoId: 'projects-management'
      },
      {
        id: 'project-status',
        title: 'Understanding Project Status',
        content: 'Each project shows its current phase and progress.',
        tips: [
          'Blueprint: Initial concept and treatment phase',
          'Production: Active development of script and assets',
          'Final Cut: Video assembly and editing',
          'Premiere: Ready for sharing and publishing'
        ]
      },
      {
        id: 'delete-project',
        title: 'Deleting Projects',
        content: 'You can delete projects you no longer need.',
        steps: [
          'Click the menu icon (•••) on a project card',
          'Select "Delete Project"',
          'Confirm the deletion in the dialog'
        ],
        tips: [
          'Deleted projects cannot be recovered',
          'Consider exporting important content before deleting'
        ]
      }
    ],
    videos: [
      {
        id: 'projects-management',
        title: 'Project Management Best Practices',
        duration: '5:15',
        description: 'Organize and manage multiple projects efficiently.'
      }
    ]
  },
  {
    id: 'blueprint',
    title: 'Blueprint Phase',
    icon: <Lightbulb className="w-5 h-5" />,
    description: 'Transform your ideas into professional film treatments.',
    articles: [
      {
        id: 'blueprint-overview',
        title: 'Blueprint Phase Overview',
        content: 'The Blueprint phase is where your video journey begins. Enter your concept and let AI generate a complete film treatment including title, logline, story beats, characters, and more.',
        steps: [
          'Enter your video concept, idea, or topic',
          'Click "Generate Blueprint" to create your treatment',
          'Review the generated hero image, title, and logline',
          'Explore Story Setup, Tone & Style, Beats, and Characters sections'
        ],
        relatedVideoId: 'blueprint-intro'
      },
      {
        id: 'generating-treatment',
        title: 'Generating Your Treatment',
        content: 'The AI analyzes your concept and creates a comprehensive film treatment.',
        steps: [
          'Be specific in your concept description for better results',
          'Include target audience, genre, or style preferences if known',
          'The AI generates: Title, Logline, Synopsis, Characters, Beats, and Narrative Reasoning'
        ],
        tips: [
          'Vague concepts will trigger inspiration suggestions',
          'You can always reimagine or refine the generated treatment'
        ],
        relatedVideoId: 'treatment-generation'
      },
      {
        id: 'audience-resonance',
        title: 'Audience Resonance Analyzer',
        content: 'Optimize your blueprint for your target audience using the Audience Resonance feature.',
        steps: [
          'Click "Analyze Resonance" in the Blueprint',
          'Select your target story type, audience, and theme',
          'Review your score and recommendations',
          'Apply quick fixes to improve your score',
          'Target a score of 80+ before proceeding to Production'
        ],
        tips: [
          'Limit yourself to 2-3 iterations to avoid over-optimization',
          'Focus on the most impactful recommendations',
          'Production has additional refinement tools'
        ],
        relatedVideoId: 'audience-resonance-guide'
      },
      {
        id: 'editing-sections',
        title: 'Editing Blueprint Sections',
        content: 'Fine-tune each section of your treatment for the perfect story.',
        steps: [
          'Click any section to expand and edit',
          'Use the edit icon to modify text directly',
          'Apply AI-powered refinements with the refine button',
          'Changes auto-save as you work'
        ]
      },
      {
        id: 'hero-image',
        title: 'Hero Image Generation',
        content: 'The hero image provides a visual representation of your story.',
        steps: [
          'A hero image is automatically generated with your treatment',
          'Click "Regenerate" to create a new image',
          'The image updates to reflect narrative changes'
        ],
        relatedVideoId: 'hero-image-tips'
      },
      {
        id: 'audio-preview',
        title: 'Audio Preview',
        content: 'Experience your story with AI-generated narration.',
        steps: [
          'Click the play button to hear your treatment',
          'Select different voice actors for narration',
          'Choose from 13+ languages for multilingual preview',
          'Use audio preview to catch flow and pacing issues'
        ],
        relatedVideoId: 'audio-preview-demo'
      },
      {
        id: 'collaboration',
        title: 'Collaboration & Export',
        content: 'Share your blueprint with team members and stakeholders.',
        steps: [
          'Click "Share" to generate a collaboration link',
          'Team members can view and comment on your treatment',
          'Export to PDF, Doc, or PPTX for presentations',
          'Use collaboration feedback to refine before Production'
        ]
      }
    ],
    videos: [
      {
        id: 'blueprint-intro',
        title: 'Blueprint Phase Walkthrough',
        duration: '8:00',
        description: 'Complete guide to the Blueprint phase from concept to production-ready treatment.'
      },
      {
        id: 'treatment-generation',
        title: 'AI Treatment Generation Explained',
        duration: '5:30',
        description: 'Understanding how AI creates your film treatment.'
      },
      {
        id: 'audience-resonance-guide',
        title: 'Mastering Audience Resonance',
        duration: '6:45',
        description: 'Get the highest scores and best recommendations.'
      },
      {
        id: 'hero-image-tips',
        title: 'Hero Image Best Practices',
        duration: '3:00',
        description: 'Tips for getting the perfect hero image.'
      },
      {
        id: 'audio-preview-demo',
        title: 'Audio Preview & Voice Selection',
        duration: '4:15',
        description: 'Explore voice options and multilingual narration.'
      }
    ]
  },
  {
    id: 'production',
    title: 'Production Phase',
    icon: <Film className="w-5 h-5" />,
    description: 'Develop your script, characters, audio, and visuals.',
    articles: [
      {
        id: 'production-overview',
        title: 'Production Phase Overview',
        content: 'Production is where your blueprint comes to life. Develop your script scene by scene, create character visuals, assign voices, and generate scene frames.',
        steps: [
          'Start with script review and refinement',
          'Create character images and assign voices',
          'Generate scene references and key frames',
          'Build audio with dialogue and sound effects',
          'Preview in the Screening Room'
        ],
        relatedVideoId: 'production-intro'
      },
      {
        id: 'script-editing',
        title: 'Script Review & Editing',
        content: 'Refine your script for maximum impact.',
        steps: [
          'Navigate scenes using the Scene Timeline at the top',
          'Click any scene to view and edit its content',
          'Use the Review Score to track script quality',
          'Apply AI suggestions to improve dialogue and pacing',
          'Aim for a target score of 85+ before proceeding'
        ],
        tips: [
          'Use keyboard arrows to quickly navigate between scenes',
          'Number keys 1-9 jump directly to specific scenes'
        ],
        relatedVideoId: 'script-editing-guide'
      },
      {
        id: 'character-creation',
        title: 'Creating Characters',
        content: 'Bring your characters to life with AI-generated images and voices.',
        steps: [
          'Review auto-generated character descriptions',
          'Click "Generate Image" to create character visuals',
          'Use reference images for consistency',
          'Assign voices from 400+ options',
          'Create wardrobe variations for different scenes'
        ],
        tips: [
          'Characters maintain consistency across all scenes',
          'You can upload reference photos for more accurate generation'
        ],
        relatedVideoId: 'character-creation-demo'
      },
      {
        id: 'voice-assignment',
        title: 'Voice Assignment',
        content: 'Choose the perfect voice for each character.',
        steps: [
          'Browse 400+ voices in the Voice Library',
          'Filter by language, gender, age, and style',
          'Preview voices before assigning',
          'Assign different voices to different characters'
        ],
        tips: [
          'The "Narrative & Story" category has voices optimized for video narration',
          'Adam is our recommended default narrator voice'
        ],
        relatedVideoId: 'voice-selection-tips'
      },
      {
        id: 'scene-direction',
        title: 'Scene Direction',
        content: 'Define the visual direction for each scene.',
        steps: [
          'Generate scene references to establish visual style',
          'Adjust camera angles, lighting, and mood',
          'Iterate on direction until satisfied',
          'Direction informs the frame generation'
        ],
        relatedVideoId: 'scene-direction-guide'
      },
      {
        id: 'frame-generation',
        title: 'Generating Key Frames',
        content: 'Create the visual frames for your scenes.',
        steps: [
          'Click "Generate Frames" for each scene',
          'Review generated frames for quality',
          'Regenerate individual frames as needed',
          'Select best frames for the Screening Room'
        ],
        tips: [
          'Higher quality settings use more credits',
          'Start with draft quality for iteration'
        ],
        relatedVideoId: 'frame-generation-demo'
      },
      {
        id: 'audio-production',
        title: 'Audio Production',
        content: 'Build the complete audio track for your video.',
        steps: [
          'Generate dialogue for each scene',
          'Review and adjust audio timeline',
          'Add sound effects (coming soon)',
          'Create multilingual versions'
        ],
        relatedVideoId: 'audio-production-guide'
      },
      {
        id: 'screening-room',
        title: 'Screening Room Preview',
        content: 'Preview your video with a complete animatic.',
        steps: [
          'Click "Screening Room" to open the preview',
          'Watch your video with audio and frames',
          'Note areas that need revision',
          'Share the preview with collaborators',
          'Create revision notes for refinement'
        ],
        relatedVideoId: 'screening-room-demo'
      }
    ],
    videos: [
      {
        id: 'production-intro',
        title: 'Production Phase Complete Guide',
        duration: '12:00',
        description: 'Everything you need to know about the Production phase.'
      },
      {
        id: 'script-editing-guide',
        title: 'Script Editing & Scoring',
        duration: '7:30',
        description: 'Master script refinement with AI assistance.'
      },
      {
        id: 'character-creation-demo',
        title: 'Character Creation Workshop',
        duration: '8:45',
        description: 'Create consistent, compelling character visuals.'
      },
      {
        id: 'voice-selection-tips',
        title: 'Choosing the Perfect Voice',
        duration: '5:00',
        description: 'Navigate the Voice Library like a pro.'
      },
      {
        id: 'scene-direction-guide',
        title: 'Scene Direction Masterclass',
        duration: '6:30',
        description: 'Define visual style and camera work.'
      },
      {
        id: 'frame-generation-demo',
        title: 'Frame Generation Tips',
        duration: '5:45',
        description: 'Generate high-quality scene frames efficiently.'
      },
      {
        id: 'audio-production-guide',
        title: 'Audio Production Walkthrough',
        duration: '7:00',
        description: 'Build professional audio tracks.'
      },
      {
        id: 'screening-room-demo',
        title: 'Screening Room Collaboration',
        duration: '4:30',
        description: 'Preview and share your work in progress.'
      }
    ]
  },
  {
    id: 'final-cut',
    title: 'Final Cut Phase',
    icon: <Scissors className="w-5 h-5" />,
    description: 'Assemble and polish your final video.',
    articles: [
      {
        id: 'final-cut-overview',
        title: 'Final Cut Phase Overview',
        content: 'The Final Cut phase is where your scenes come together into a polished video. Assemble scenes, add transitions, fine-tune timing, and render your final video.',
        tips: [
          'This phase is currently in development',
          'Expected features: Scene assembly, transitions, timing adjustments, rendering'
        ]
      },
      {
        id: 'coming-soon-assembly',
        title: 'Video Assembly (Coming Soon)',
        content: 'Arrange your scenes into a cohesive video timeline. Adjust scene order, add transitions, and control pacing.'
      },
      {
        id: 'coming-soon-polish',
        title: 'Video Polish (Coming Soon)',
        content: 'Add finishing touches including titles, lower thirds, and end cards.'
      },
      {
        id: 'coming-soon-render',
        title: 'Rendering & Export (Coming Soon)',
        content: 'Export your video in various formats and resolutions for different platforms.'
      }
    ],
    videos: [
      {
        id: 'final-cut-preview',
        title: 'Final Cut Preview (Coming Soon)',
        duration: 'TBD',
        description: 'Preview of upcoming Final Cut features.'
      }
    ]
  },
  {
    id: 'premiere',
    title: 'Premiere Phase',
    icon: <Star className="w-5 h-5" />,
    description: 'Share and publish your completed video.',
    articles: [
      {
        id: 'premiere-overview',
        title: 'Premiere Phase Overview',
        content: 'The Premiere phase is the final step in your video journey. Share your completed video with the world through various platforms and formats.',
        tips: [
          'This phase is currently in development',
          'Expected features: Social sharing, platform publishing, analytics'
        ]
      },
      {
        id: 'coming-soon-sharing',
        title: 'Social Sharing (Coming Soon)',
        content: 'Share your video directly to YouTube, social media platforms, and more.'
      },
      {
        id: 'coming-soon-analytics',
        title: 'Video Analytics (Coming Soon)',
        content: 'Track views, engagement, and performance of your published videos.'
      },
      {
        id: 'coming-soon-distribution',
        title: 'Distribution Options (Coming Soon)',
        content: 'Choose from various distribution channels and embed options.'
      }
    ],
    videos: [
      {
        id: 'premiere-preview',
        title: 'Premiere Preview (Coming Soon)',
        duration: 'TBD',
        description: 'Preview of upcoming Premiere features.'
      }
    ]
  },
  {
    id: 'settings',
    title: 'Settings & Account',
    icon: <Settings className="w-5 h-5" />,
    description: 'Manage your account, billing, and preferences.',
    articles: [
      {
        id: 'profile-settings',
        title: 'Profile Settings',
        content: 'Manage your personal information and preferences.',
        steps: [
          'Access Settings from the top navigation',
          'Update your name, email, and profile picture',
          'Set your preferred theme (light/dark)',
          'Configure notification preferences'
        ]
      },
      {
        id: 'billing',
        title: 'Billing & Subscription',
        content: 'Manage your subscription and payment methods.',
        steps: [
          'View your current plan and usage',
          'Upgrade or change your subscription',
          'View billing history and invoices',
          'Update payment methods'
        ]
      },
      {
        id: 'byok',
        title: 'Bring Your Own Keys (BYOK)',
        content: 'Use your own API keys for AI services.',
        steps: [
          'Go to Settings → BYOK',
          'Enter your API keys for supported services',
          'Keys are encrypted and stored securely',
          'BYOK usage doesn\'t consume SceneFlow credits'
        ],
        tips: [
          'BYOK is available for advanced users',
          'You are responsible for costs on your own keys'
        ]
      }
    ],
    videos: [
      {
        id: 'settings-tour',
        title: 'Settings & Preferences Guide',
        duration: '4:00',
        description: 'Configure SceneFlow AI to work your way.'
      }
    ]
  }
]

// =============================================================================
// COMPONENTS
// =============================================================================

function VideoCard({ video }: { video: VideoPlaceholder }) {
  return (
    <div className="group relative rounded-xl overflow-hidden bg-slate-800/50 border border-slate-700/50 hover:border-sf-primary/50 transition-all cursor-pointer">
      {/* Thumbnail Placeholder */}
      <div className="aspect-video bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center relative">
        <div className="absolute inset-0 bg-sf-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <PlayCircle className="w-12 h-12 text-slate-500 group-hover:text-sf-primary transition-colors" />
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded">
          {video.duration}
        </div>
      </div>
      {/* Video Info */}
      <div className="p-3">
        <h4 className="font-medium text-sm text-slate-200 group-hover:text-sf-primary transition-colors">
          {video.title}
        </h4>
        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
          {video.description}
        </p>
      </div>
    </div>
  )
}

function ArticleCard({ article, isExpanded, onToggle }: { 
  article: HelpArticle
  isExpanded: boolean
  onToggle: () => void 
}) {
  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden hover:border-slate-600/50 transition-colors">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Book className="w-4 h-4 text-sf-primary flex-shrink-0" />
          <span className="font-medium text-slate-200">{article.title}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4">
              <p className="text-slate-300 text-sm leading-relaxed">
                {article.content}
              </p>
              
              {article.steps && article.steps.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Steps</h5>
                  <ol className="space-y-2">
                    {article.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-sf-primary/20 text-sf-primary text-xs flex items-center justify-center font-medium">
                          {idx + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              
              {article.tips && article.tips.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tips</h5>
                  <ul className="space-y-1.5">
                    {article.tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                        <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {article.relatedVideoId && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
                  <PlayCircle className="w-4 h-4 text-sf-primary" />
                  <span className="text-xs text-slate-400">Related video available</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SectionNav({ sections, activeSection, onSectionChange }: {
  sections: HelpSection[]
  activeSection: string
  onSectionChange: (id: string) => void
}) {
  return (
    <nav className="space-y-1">
      {sections.map(section => (
        <button
          key={section.id}
          onClick={() => onSectionChange(section.id)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left',
            activeSection === section.id
              ? 'bg-sf-primary/10 text-sf-primary border border-sf-primary/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          )}
        >
          <span className={cn(
            'flex-shrink-0',
            activeSection === section.id ? 'text-sf-primary' : 'text-slate-500'
          )}>
            {section.icon}
          </span>
          <span className="truncate">{section.title}</span>
        </button>
      ))}
    </nav>
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState('getting-started')
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set(['welcome']))
  const [searchQuery, setSearchQuery] = useState('')
  
  const currentSection = helpSections.find(s => s.id === activeSection) || helpSections[0]
  
  const toggleArticle = (articleId: string) => {
    setExpandedArticles(prev => {
      const next = new Set(prev)
      if (next.has(articleId)) {
        next.delete(articleId)
      } else {
        next.add(articleId)
      }
      return next
    })
  }
  
  // Filter articles based on search
  const filteredArticles = searchQuery.trim()
    ? currentSection.articles.filter(a => 
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentSection.articles
  
  return (
    <div className="min-h-screen bg-sf-background text-sf-text-primary">
      {/* Header */}
      <div className="border-b border-sf-border bg-sf-surface/50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-sf-primary/20 flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-sf-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Help Center</h1>
              <p className="text-sf-text-secondary">Learn how to use SceneFlow AI effectively</p>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sf-primary/50 focus:ring-1 focus:ring-sf-primary/20"
            />
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-64 flex-shrink-0">
            <div className="sticky top-8">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                Topics
              </h2>
              <SectionNav
                sections={helpSections}
                activeSection={activeSection}
                onSectionChange={setActiveSection}
              />
              
              {/* Quick Links */}
              <div className="mt-8 pt-8 border-t border-slate-700/50">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                  Quick Links
                </h2>
                <div className="space-y-2">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-sf-primary transition-colors"
                  >
                    <Home className="w-4 h-4" />
                    Back to Dashboard
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-sf-primary transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                  <a
                    href="mailto:support@sceneflow.ai"
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-sf-primary transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Contact Support
                  </a>
                </div>
              </div>
            </div>
          </aside>
          
          {/* Content Area */}
          <main className="flex-1 min-w-0">
            {/* Section Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sf-primary">{currentSection.icon}</span>
                <h2 className="text-xl font-semibold">{currentSection.title}</h2>
              </div>
              <p className="text-slate-400">{currentSection.description}</p>
            </div>
            
            {/* Videos Section */}
            {currentSection.videos.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-sf-primary" />
                  Video Tutorials
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentSection.videos.map(video => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Articles Section */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <Book className="w-4 h-4 text-sf-primary" />
                Articles ({filteredArticles.length})
              </h3>
              
              {filteredArticles.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700/50">
                  <Search className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No articles found matching &quot;{searchQuery}&quot;</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-sf-primary text-sm hover:underline"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredArticles.map(article => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      isExpanded={expandedArticles.has(article.id)}
                      onToggle={() => toggleArticle(article.id)}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Coming Soon Notice for placeholder sections */}
            {(activeSection === 'final-cut' || activeSection === 'premiere') && (
              <div className="mt-8 p-6 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-300">Coming Soon</h4>
                    <p className="text-sm text-amber-200/70 mt-1">
                      This phase is currently in development. Documentation and tutorials will be added when the feature reaches 85% completion.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
