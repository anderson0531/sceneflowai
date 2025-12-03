# SceneFlow AI - Application Design Document

**Version**: 2.1  
**Last Updated**: October 29, 2024  
**Status**: Production

---

## 1. Executive Summary

SceneFlow AI is an AI-powered video creation platform that helps users transform concepts into scripts, storyboards, and video content. It leverages advanced AI capabilities for script generation, visual storyboarding, character consistency, scene direction, and video production.

### Core Value Propositions

- **AI-Powered Ideation**: Generate compelling concepts from simple prompts
- **Intelligent Scripting**: Convert concepts into production-ready scripts
- **Visual Storyboarding**: Generate scene images with character consistency using reference images
- **Automated Video Generation**: Create professional videos with AI voiceovers and effects
- **Production Workflow**: End-to-end video creation pipeline with collaboration tools

---

## 2. Architecture Overview

### 2.1 Technology Stack

**Frontend:**
- Next.js 15.4.6 (React with App Router)
- TypeScript
- Tailwind CSS
- Zustand (State Management)
- Framer Motion (Animations)
- Lucide React (Icons)

**Backend:**
- Next.js API Routes
- Node.js 20
- PostgreSQL (via Sequelize ORM)
- Prisma (Database client)

**AI Services:**
- Google Gemini 2.0 Flash (Primary LLM for all text generation)
- Google Imagen 3 (Image Generation via Vertex AI)
- Google Veo 2 (Video Generation via Vertex AI)
- ElevenLabs (Voice Synthesis & Sound Effects)

> **V1 Architecture Decision**: SceneFlow uses a consolidated AI stack with Google (Gemini, Imagen, Veo) for all generation capabilities and ElevenLabs for audio. This simplifies operations, ensures consistent quality, and enables accurate credit tracking. No BYOK (Bring Your Own Key) - all users share the platform's API allocation.

**Storage & Infrastructure:**
- Vercel (Hosting & Deployment)
- Azure Blob Storage (Media assets)
- Google Cloud Storage (GCS) (Character reference images)
- PostgreSQL (Neon or Supabase)

### 2.2 Application Structure

```
sceneflow-ai-nextjs/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── dashboard/          # Main application routes
│   │   │   ├── projects/       # Project management
│   │   │   ├── studio/         # Project creation studio
│   │   │   └── workflow/       # Workflow steps
│   │   │       ├── ideation/   # Phase 1: Ideation
│   │   │       ├── vision/     # Phase 1: Script & Visual Development (replaced Storyboard)
│   │   │       ├── scene-direction/  # Phase 1: Scene Direction
│   │   │       └── video-generation/ # Phase 2: Video Generation
│   │   └── api/                # API routes
│   ├── components/             # React components
│   │   ├── vision/            # Vision workflow components
│   │   ├── workflow/          # Workflow components
│   │   ├── layout/            # Layout components
│   │   └── ui/                # UI primitives
│   ├── lib/                   # Libraries and utilities
│   │   ├── imagen/            # Image generation logic
│   │   ├── vertexai/         # Vertex AI integration
│   │   ├── character/         # Character management
│   │   └── tts/               # Text-to-speech
│   ├── models/                # Database models
│   ├── services/              # Business logic services
│   │   ├── ai-providers/     # AI provider adapters
│   │   └── DOL/              # Dynamic Optimization Layer
│   ├── store/                 # State management (Zustand)
│   └── types/                  # TypeScript definitions
```

**Note**: The `/dashboard/workflow/storyboard` route may exist for legacy compatibility, but the active workflow uses `/dashboard/workflow/vision` which handles both script and visual storyboarding.

---

## 3. Core Features & Workflows

### 3.1 Main Workflow Steps

The application follows a 6-step workflow:

1. **The Blueprint (Ideation)** — `/dashboard/studio/new-project`
   - Film Treatment generation
   - Character breakdown
   - Beat sheet creation
   - Core concept development

2. **Vision** — `/dashboard/workflow/vision/[projectId]`
   - Script generation from treatment
   - Scene expansion and refinement
   - Character library management
   - Scene image generation with character references
   - Visual storyboarding (previously separate Storyboard phase)

3. **Creation Hub** — `/dashboard/workflow/video-generation`
   - Scene-by-scene direction
   - Camera angles and composition
   - Lighting and mood
   - Technical specifications

4. **Creation Hub (Video Generation)** — `/dashboard/workflow/video-generation`
   - AI video generation (BYOK required)
   - Voiceover generation
   - Music and sound effects
   - Video editing capabilities

5. **Polish** — `/dashboard/workflow/generation`
   - Screening room (video playback)
   - Review and feedback
   - Quality assessment

6. **Launchpad** — `/dashboard`
   - Optimization and publishing
   - Final review
   - Export capabilities

### 3.2 Key Features

#### Vision Workflow (`/dashboard/workflow/vision/[projectId]`)

**Script Panel:**
- Display formatted script with scenes
- Scene-by-scene editing
- Dialogue management
- Scene expansion (AI-powered)
- Script review with scoring
- Duration calculation

**Character Library:**
- Character creation and management
- Reference image upload
- Appearance descriptions
- Character generation from images
- Character consistency across scenes

**Scene Gallery:**
- Scene image generation
- Scene Prompt Builder (Guided/Advanced)
- Image regeneration
- Upload custom images
- Grid and timeline views
- Visual storyboarding capabilities

**Screening Room:**
- Video playback with scenes
- Audio playback (narration, dialogue, music)
- Scene-by-scene navigation
- Export capabilities

#### Scene Prompt Builder

**Guided Mode:**
- Location & Setting inputs
- Character selection (with reference images)
- Camera & Composition settings
- Art Style selection
- Real-time prompt optimization
- Sanitization indicators (child safety)
- Preview section (original + settings)

**Advanced Mode:**
- Direct prompt editing
- Optimized prompt display
- Preview section (collapsible)
- Sanitization change visibility
- Negative prompt configuration

**Key Capabilities:**
- Automatic prompt sanitization (child safety filters)
- Character reference integration
- Key feature extraction (bald, beard, ethnicity)
- User edit preservation
- Visual change indicators

---

## 4. Data Models

### 4.1 Core Models

**User** (`src/models/User.ts`):
```typescript
{
  id: UUID
  email: string (unique)
  username: string (unique)
  password_hash: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  is_active: boolean
  email_verified: boolean
  credits: number (BigInt, default: 0)
  last_login?: Date
  created_at: Date
  updated_at: Date
}
```

**Project** (`src/models/Project.ts`):
```typescript
{
  id: UUID
  user_id: UUID (FK to users)
  title: string
  description?: string
  genre?: string
  duration?: number (seconds)
  target_audience?: string
  style?: string
  concept?: string
  key_message?: string
  tone?: string
  status: 'draft' | 'in_progress' | 'completed' | 'archived'
  current_step: 'ideation' | 'storyboard' | 'scene-direction' | 'video-generation' | 'completed'
  step_progress: Record<string, number> (JSONB)
  metadata: Record<string, any> (JSONB) // Contains script, scenes, characters, etc.
  created_at: Date
  updated_at: Date
}
```

**Note**: The `current_step` enum still includes 'storyboard' for internal compatibility, but the UI workflow uses 'vision' as the active phase.

**Character** (Stored in Project metadata):
```typescript
{
  id: string
  name: string
  description: string
  appearanceDescription?: string
  referenceImage?: string (HTTPS URL)
  referenceImageGCS?: string (GCS URI for Imagen API)
  ethnicity?: string
  keyFeature?: string (e.g., "bald head", "salt and pepper beard")
  type?: 'character' | 'narrator'
  voiceConfig?: VoiceConfig
}
```

**Scene** (Stored in Project metadata):
```typescript
{
  id?: string
  sceneNumber?: number
  heading?: string
  action?: string
  visualDescription?: string
  narration?: string
  dialogue?: Array<{
    character: string
    text: string
  }>
  music?: string
  sfx?: Array<any>
  imageUrl?: string
  narrationAudioUrl?: string
  duration?: number
  scoreAnalysis?: SceneAnalysis
}
```

### 4.2 Supporting Models

- **AIPricing** — Pricing configurations for AI services
- **CreditLedger** — Credit transaction tracking
- **AIUsage** — AI service usage logging
- **UserProviderConfig** — BYOK provider configurations
- **APIUsageLog** — API call logging
- **PlatformModel** — AI platform model registry (DOL)
- **PromptTemplate** — AI prompt templates (DOL)
- **FeatureUpdate** — Platform feature tracking (DOL)
- **CollabSession** — Collaboration sessions
- **CollabParticipant** — Session participants
- **CollabScore** — Scoring data
- **CollabComment** — Session comments
- **CollabRecommendation** — AI recommendations
- **CollabChatMessage** — Chat messages

---

## 5. API Architecture

### 5.1 API Route Structure

**Ideation APIs:**
- `/api/ideation/generate` — Generate film treatment
- `/api/ideation/film-treatment` — Film treatment refinement
- `/api/ideation/character-breakdown` — Character analysis
- `/api/ideation/beat-sheet` — Beat sheet generation
- `/api/ideation/core-concept` — Core concept generation

**Vision APIs:**
- `/api/vision/generate-script` — Script generation
- `/api/vision/generate-script-v2` — Enhanced script generation
- `/api/vision/expand-scene` — Scene expansion
- `/api/vision/generate-scenes` — Batch scene generation
- `/api/vision/generate-scene-audio` — Scene audio generation
- `/api/vision/generate-all-audio` — Batch audio generation
- `/api/vision/generate-all-images` — Batch image generation
- `/api/vision/regenerate-scene-image` — Regenerate single scene image
- `/api/vision/analyze-script` — Script analysis
- `/api/vision/review-script` — Script review scoring

**Character APIs:**
- `/api/character/save` — Save character
- `/api/character/upload-reference` — Upload reference image
- `/api/character/generate-image` — Generate character image
- `/api/character/analyze-image` — Analyze uploaded image

**Scene Image APIs:**
- `/api/scene/generate-image` — Generate scene image with character references
- Uses Vertex AI Imagen 4 with GCS reference images

**TTS APIs:**
- `/api/tts/google` — Google TTS
- `/api/tts/google/voices` — List Google voices
- `/api/tts/elevenlabs` — ElevenLabs TTS
- `/api/tts/elevenlabs/voices` — List ElevenLabs voices
- `/api/tts/table-read` — Table read generation

**DOL APIs (Dynamic Optimization Layer):**
- `/api/cue/respond-dol-integrated` — DOL-integrated Cue assistant
- `/api/dol/optimize` — Optimization engine
- `/api/dol/analytics/*` — Analytics endpoints
- `/api/dol/video/generate-integrated` — DOL-integrated video generation
- `/api/dol/monitoring/*` — Monitoring endpoints

**Collaboration APIs:**
- `/api/collab/session/create` — Create collaboration session
- `/api/collab/session/[token]/*` — Session management
- `/api/collab/feedback/*` — Feedback endpoints

### 5.2 Key API Patterns

**Image Generation Flow:**
```
Scene Prompt Builder → /api/scene/generate-image
  ↓
promptOptimizer.optimizePromptForImagen()
  ↓
Sanitization (child terms → adult terms)
  ↓
Character Reference Integration
  ↓
callVertexAIImagen() with GCS references
  ↓
Upload to Blob Storage
  ↓
Return imageUrl
```

**Script Generation Flow:**
```
Film Treatment → /api/vision/generate-script
  ↓
AI Provider (Gemini/OpenAI)
  ↓
Format as Screenplay
  ↓
Parse into Scenes
  ↓
Store in Project metadata
```

---

## 6. AI Integration

### 6.1 AI Providers

**Primary Provider - Google Gemini:**
- Model: `gemini-3.0-flash` / `gemini-1.5-pro`
- Usage: Script generation, analysis, ideation
- Cost: Efficient for analysis tasks
- Fallback: OpenAI GPT-4o-mini

**Image Generation - Google Imagen 4:**
- Service: Vertex AI Imagen API
- Features:
  - Character reference images (via GCS URIs)
  - Style control
  - Safety filters (child safety, personGeneration settings)
  - Quality: `max` or `auto`
  - Aspect ratios: 1:1, 9:16, 16:9, 4:3, 3:4

**Video Generation - Google Veo / BYOK:**
- Service: Google Veo (BYOK - Bring Your Own Key)
- Features:
  - Text-to-video generation
  - Custom provider configuration
  - Cost estimation

**Text-to-Speech:**
- Google TTS (Primary)
- ElevenLabs (Premium voices)
- Voice library management
- Character voice assignment

### 6.2 Dynamic Optimization Layer (DOL)

The DOL automatically optimizes AI requests across the application:

**Components:**
- **DynamicOptimizationLayer** — Main orchestrator
- **ModelSelector** — Intelligent model selection
- **PromptConstructor** — Optimized prompt generation
- **PlatformAdapter** — Provider-specific logic
- **PerformanceOptimizer** — AI-powered optimization

**Features:**
- Automatic feature detection
- Intelligent model selection
- Cost optimization (20-40% savings)
- Quality scoring and improvement
- Real-time monitoring
- Production health tracking

**Coverage:**
- 100% Intelligence Layer (Cue assistant)
- 100% Video Generation Layer
- Performance analytics
- Template management

---

## 7. State Management

### 7.1 Zustand Stores

**Enhanced Store** (`src/store/enhancedStore.ts`):
```typescript
interface EnhancedAppState {
  // User state
  user: EnhancedUser | null
  isAuthenticated: boolean
  
  // Project state
  currentProject: EnhancedProject | null
  projects: EnhancedProject[]
  
  // Workflow state
  currentStep: WorkflowStep
  stepProgress: Record<WorkflowStep, number>
  
  // AI state
  aiConfiguration: AIConfiguration
  aiCapabilities: AICapability[]
  
  // Core Concept
  coreConcept: {
    title?: string
    premise?: string
    targetAudience?: string
    // ...
  }
  
  // BYOK settings
  byokSettings: {
    llmProvider: { name, apiKey, isConfigured }
    imageGenerationProvider: { name, apiKey, isConfigured }
    videoGenerationProvider: { name, apiKey, isConfigured }
  }
  
  // UI state
  theme: 'light' | 'dark'
  uiMode: 'guided' | 'advanced'
  sidebarOpen: boolean
  cueAssistantOpen: boolean
}
```

**Workflow Steps:**
```typescript
type WorkflowStep = 
  | 'ideation' 
  | 'storyboard'  // Internal name, UI uses 'vision'
  | 'scene-direction' 
  | 'video-generation' 
  | 'review' 
  | 'optimization'
```

**Note**: The internal `WorkflowStep` type still includes 'storyboard' for backward compatibility with stored data, but the user-facing workflow uses 'vision' as the active phase that handles both script and visual storyboarding.

---

## 8. User Interface Design

### 8.1 Layout Structure

**Main Layout:**
- Sidebar navigation (collapsible)
- Context bar (workflow progress)
- Main content area
- Cue Assistant (slide-out panel)

**Sidebar Navigation:**
- Dashboard
- Projects
- Start Project
- Workflow Steps:
  - The Blueprint (Ideation)
  - Vision (Script & Visual Development)
  - Creation Hub
  - Creation Hub (Video Generation)
  - Polish (Screening & Editing)
  - Launchpad (Optimization & Publishing)

### 8.2 Key UI Components

**Scene Prompt Builder:**
- Modal dialog (max-w-4xl)
- Tabbed interface (Guided/Advanced)
- Real-time optimization
- Visual sanitization indicators
- Preview section (collapsible)

**Script Panel:**
- Scene list with cards
- Scene editor modal
- Dialogue editing
- Scene expansion controls
- Score display

**Character Library:**
- Character cards with reference images
- Upload interface
- Generation from image
- Appearance editor

**Scene Gallery:**
- Grid view / Timeline view
- Scene cards with images
- Regeneration controls
- Prompt builder integration
- Visual storyboarding interface

---

## 9. Security & Authentication

### 9.1 Authentication

- NextAuth.js integration
- Email/password authentication
- Session management
- Email verification

**API Routes:**
- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/logout`
- `/api/auth/profile`
- `/api/auth/verify`

### 9.2 BYOK (Bring Your Own Key)

Users can configure their own API keys for:
- LLM Provider (Gemini, OpenAI, Anthropic)
- Image Generation (Gemini, OpenAI, Anthropic)
- Video Generation (Google Veo, Runway, Stability AI)

Encrypted storage in `UserProviderConfig` model.

---

## 10. Deployment & Infrastructure

### 10.1 Hosting

- Platform: Vercel
- Deployment: Git integration (automatic)
- Environment: Production & Development configs

### 10.2 Storage

**Media Assets:**
- Azure Blob Storage (images, videos, audio)
- GCS (character reference images for Imagen API)

**Database:**
- PostgreSQL (Neon/Supabase)
- Sequelize ORM
- JSONB fields for flexible metadata

### 10.3 Environment Variables

Required environment variables:
```bash
# Database
POSTGRES_URL=postgresql://...

# AI Providers
GOOGLE_API_KEY=...
GEMINI_API_KEY=...
OPENAI_API_KEY=...

# Storage
AZURE_STORAGE_CONNECTION_STRING=...
BLOB_STORAGE_CONTAINER=...

# Authentication
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...

# BYOK Encryption
ENCRYPTION_KEY=...
```

---

## 11. Current Implementation Status

### 11.1 Completed Features

✅ Ideation & Script Generation  
✅ Vision Workflow (Script & Visual Development - replaces Storyboard)  
✅ Scene Expansion & Refinement  
✅ Character Library with Reference Images  
✅ Scene Image Generation (Imagen 4)  
✅ Character Reference Integration  
✅ Prompt Optimization & Sanitization  
✅ Scene Prompt Builder (Guided/Advanced)  
✅ Script Review & Scoring  
✅ Audio Generation (TTS)  
✅ Screening Room (Video Playback)  
✅ DOL (Dynamic Optimization Layer)  
✅ Collaboration Features  
✅ BYOK Support  
✅ Admin Dashboard

### 11.2 Key Technical Achievements

- **Character Consistency**: Reference images maintain character appearance across scenes
- **Prompt Sanitization**: Automatic child safety filter compliance
- **Real-time Optimization**: DOL optimizes every AI request
- **Flexible Metadata**: JSONB storage for project data
- **Multi-provider Support**: Gemini, OpenAI, ElevenLabs with fallbacks
- **Unified Vision Workflow**: Combined script and visual storyboarding in single phase

---

## 12. Future Enhancements

### Phase 1: Core Functionality (Current)
- ✅ Ideation & Scripting
- ✅ Vision (Script & Visual Development - combined workflow)
- ✅ Character Management
- ✅ Scene Direction

### Phase 2: Video Generation (In Progress)
- Video generation with BYOK
- Advanced editing capabilities
- Music generation
- Sound effects library

### Phase 3: Collaboration (Partial)
- ✅ Collaboration sessions
- Enhanced feedback system
- Real-time collaboration
- Version control

### Phase 4: Optimization & Analytics
- Advanced analytics dashboard
- A/B testing for prompts
- Quality scoring improvements
- Cost optimization insights

### Phase 5: Advanced Features
- AI Agent workflows
- Template libraries
- Style presets
- Export to professional formats

---

## 13. Development Guidelines

### 13.1 Code Organization

- Components: Feature-based organization (`vision/`, `workflow/`, etc.)
- Services: Business logic separation
- Models: Database model definitions
- Types: TypeScript interfaces and types
- Utils: Shared utilities

### 13.2 Naming Conventions

- Components: PascalCase (`ScenePromptBuilder.tsx`)
- Functions: camelCase (`optimizePromptForImagen`)
- API Routes: kebab-case (`generate-scene-image`)
- Database: snake_case (`user_id`, `created_at`)

### 13.3 Best Practices

- Type safety: TypeScript throughout
- Error handling: Try-catch with user-friendly messages
- Loading states: Clear loading indicators
- Optimistic updates: Immediate UI feedback
- State management: Zustand for global state
- API calls: Centralized error handling

---

## 14. Known Limitations & Considerations

### 14.1 Current Limitations

1. **Scene Description Dependency**
   - Prompt optimization uses scene description as source
   - Editing requires updating script (works but not obvious)

2. **Character Feature Extraction**
   - Features extracted from `appearanceDescription`
   - May miss features not explicitly stated

3. **BYOK Required for Video**
   - Video generation requires user API keys
   - No platform-hosted video generation option

4. **Legacy Route Compatibility**
   - `/dashboard/workflow/storyboard` route may exist for legacy support
   - Active workflow uses `/dashboard/workflow/vision`
   - Internal types may still reference 'storyboard' for data compatibility

### 14.2 Technical Considerations

- Image generation latency: 10-15 seconds per image
- API rate limits: Provider-specific limits
- Cost management: Credit system for platform usage
- Storage costs: Media asset storage costs scale with usage

---

## 15. Support & Documentation

### 15.1 Internal Documentation

- Component documentation in code
- API route comments
- Service method documentation
- Plan files (`.plan.md` files)

### 15.2 Key Design Documents

- Scene Prompt Builder Design (this document section)
- DOL Architecture (DOL_ACHIEVEMENT_SUMMARY.md)
- Image Generation Integration (IMAGE_GENERATION_INTEGRATION.md)
- Production Deployment Guide

---

## Appendix: Key File Locations

**Core Components:**
- Scene Prompt Builder: `src/components/vision/ScenePromptBuilder.tsx`
- Script Panel: `src/components/vision/ScriptPanel.tsx`
- Character Library: `src/components/vision/CharacterLibrary.tsx`
- Scene Gallery: `src/components/vision/SceneGallery.tsx`

**Services:**
- Prompt Optimizer: `src/lib/imagen/promptOptimizer.ts`
- Vertex AI Client: `src/lib/vertexai/client.ts`
- Character Matching: `src/lib/character/matching.ts`

**API Routes:**
- Scene Image Generation: `src/app/api/scene/generate-image/route.ts`
- Vision Script: `src/app/api/vision/generate-script-v2/route.ts`
- Character Save: `src/app/api/character/save/route.ts`

**State Management:**
- Enhanced Store: `src/store/enhancedStore.ts`
- Workflow State: `src/workflow/stateMachine.ts`

**Workflow Pages:**
- Vision: `src/app/dashboard/workflow/vision/[projectId]/page.tsx`
- Scene Direction: `src/app/dashboard/workflow/scene-direction/page.tsx`
- Video Generation: `src/app/dashboard/workflow/video-generation/page.tsx`

---

**Document Version**: 2.1  
**Last Updated**: October 29, 2024  
**Maintained By**: SceneFlow AI Development Team

---

*Note: This document reflects Vision as the unified workflow phase that replaced the separate Storyboard phase. Vision handles both script development and visual storyboarding in a single integrated interface.*

