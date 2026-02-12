'use client'

import React, { useState } from 'react'
import { 
  Copy, 
  Check, 
  Sparkles, 
  Film, 
  Users, 
  Palette, 
  Mic2, 
  Video, 
  Wand2,
  BookOpen,
  Layers,
  Clapperboard,
  MonitorPlay,
  Download,
  Share2,
  Shield,
  Zap,
  Globe,
  Clock,
  DollarSign,
  ArrowRight,
  CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

const productDescription = `# SceneFlow AI - Product Description

## Executive Summary

**SceneFlow AI** is an AI-powered video production platform that transforms creative concepts into production-ready video content. From initial idea to final cut, SceneFlow AI provides an end-to-end workflow that combines advanced AI capabilities with professional filmmaking tools.

**Mission**: Democratize video production by putting the power of a full production studio in the hands of every creator.

**Target Audience**: Content creators, filmmakers, marketing teams, educators, and storytellers who need to produce high-quality video content efficiently.

---

## Core Value Proposition

### The Problem
Traditional video production is expensive, time-consuming, and requires specialized skills across multiple disciplines—writing, directing, cinematography, editing, and post-production.

### The Solution
SceneFlow AI provides an integrated platform that:
- **Generates** professional scripts from simple concepts
- **Creates** stunning visuals using AI image and video generation
- **Produces** natural voiceovers with AI voice synthesis
- **Assembles** complete videos with intelligent editing
- **Manages** multi-episode series with production bibles

---

## Complete Workflow

### Phase 1: The Blueprint
*From concept to screenplay in minutes*

- **AI Script Generation**: Describe your idea and get a complete screenplay with scenes, dialogue, and direction notes
- **Beat Sheet Creation**: Automatic story structure with pacing and emotional beats
- **Character Development**: AI-generated character profiles with visual descriptions
- **Treatment Variants**: Multiple creative directions to explore before committing

### Phase 2: Virtual Production (Vision)
*Industry-standard virtual production tools*

- **Scene Gallery**: Visual storyboarding with AI-generated images
- **Imagen 3 Integration**: Google's latest image generation for stunning visuals
- **Character Consistency**: Locked visual tokens ensure characters look consistent across all scenes
- **Direction Builder**: Professional scene direction with camera angles, lighting, and mood
- **Backdrop Generator**: Create establishing shots and environment visuals

### Phase 3: The Creation Hub
*Where visuals come to life*

- **Veo 2 Video Generation**: State-of-the-art AI video from Google
- **Segment Studio**: Frame-by-frame control over video segments
- **Ken Burns Effects**: Intelligent camera movement for still images
- **Director's Console**: Batch rendering with queue management
- **Smart Prompt Modules**: Contextual prompts for consistent video style

### Phase 4: The Soundstage
*Professional audio production*

- **ElevenLabs Integration**: Natural AI voice synthesis
- **Multiple Voice Types**: Narration, dialogue, description voiceovers
- **Music Generation**: AI-composed background music
- **Sound Effects**: Contextual SFX generation
- **Audio Timeline**: Visual editing with per-clip controls
- **Voice Cloning**: Create custom voices from samples

### Phase 5: Final Cut
*Review and refine*

- **Screening Room**: Full video playback with all assets
- **Collaboration Tools**: Share for stakeholder review
- **Feedback Integration**: AI-powered feedback analysis
- **Revision Workflow**: Track changes and iterate

### Phase 6: The Premiere
*Export and share*

- **Multiple Formats**: MP4, WebM, various resolutions
- **Animatic Export**: Quick preview renders
- **Production Export**: Full quality final renders
- **Cloud Storage**: Managed asset storage with lifecycle policies

---

## Key Features

### AI-Powered Generation
| Feature | Description |
|---------|-------------|
| **Script Generation** | Complete screenplays from text prompts |
| **Image Generation** | Imagen 3 for photorealistic visuals |
| **Video Generation** | Veo 2 for cinematic video clips |
| **Voice Synthesis** | ElevenLabs for natural narration |
| **Music & SFX** | AI-composed audio assets |

### Production Tools
| Feature | Description |
|---------|-------------|
| **Storyboard Editor** | Visual scene planning |
| **Character Manager** | Consistent character profiles |
| **Location Library** | Reusable environment assets |
| **Direction Builder** | Professional shot planning |
| **Timeline Editor** | Audio and video synchronization |

### Collaboration & Export
| Feature | Description |
|---------|-------------|
| **Screening Room** | Shareable video previews |
| **Review System** | Stakeholder feedback collection |
| **Multiple Export Formats** | Various resolutions and codecs |
| **Cloud Storage** | Secure asset management |

---

## Series Studio (Multi-Episode Production)

### Production Bible System
Create and manage multi-episode video series with AI-generated production bibles:

- **Series Overview**: Title, logline, synopsis, and genre
- **Character Bible**: Recurring characters with visual consistency
- **Location Guide**: Shared environments across episodes
- **Visual Style Guide**: Locked aesthetic tokens for consistency
- **Episode Blueprints**: Up to 40 episodes per series

### Episode Workflow
1. Generate series concept with AI
2. Create production bible with characters and locations
3. Generate episode blueprints with story beats
4. Start individual episode projects
5. Maintain consistency across all episodes

### Series Progress Tracking
- Visual progress bar showing completed/in-progress/blueprint episodes
- Episode status badges (Blueprint → In Progress → Completed)
- Quick stats dashboard with episode and character counts

---

## Technical Specifications

### AI Models
- **Text Generation**: Google Gemini 2.5 Flash
- **Image Generation**: Google Imagen 3
- **Video Generation**: Google Veo 2
- **Voice Synthesis**: ElevenLabs (multiple voices)
- **Content Moderation**: Hive AI multi-layer protection

### Platform
- **Frontend**: Next.js 15, React 19, TypeScript
- **Database**: PostgreSQL with Sequelize ORM
- **Storage**: Google Cloud Storage, Vercel Blob
- **Rendering**: Cloud Run Jobs with FFmpeg
- **Authentication**: NextAuth with multiple providers

### Browser Support
- Chrome/Edge (recommended)
- Firefox
- Safari (limited MediaRecorder support)

---

## Pricing Model

### Credit-Based System
- **Exchange Rate**: $1 = 100 credits
- **Pay-as-you-go**: Purchase credit packs as needed
- **Subscription Plans**: Monthly credit allocations with bonus credits

### Subscription Tiers
| Tier | Price | Credits | Best For |
|------|-------|---------|----------|
| Trial | $4.99 | 1,500 | First-time users |
| Starter | $49/mo | 4,500 | Individual creators |
| Pro | $149/mo | 15,000 | Professional creators |
| Studio | $599/mo | 75,000 | Production teams |
| Enterprise | Custom | Custom | Large organizations |

### Credit Costs (Examples)
- Script Generation: ~50-100 credits
- Image Generation: ~30 credits per image
- Video Generation: ~120+ credits per 8-second clip
- Voice Synthesis: ~5 credits per 100 characters

---

## Target Audience

### Primary Users
1. **Content Creators**: YouTube, TikTok, social media
2. **Independent Filmmakers**: Short films, pilots, proofs-of-concept
3. **Marketing Teams**: Product videos, explainer content
4. **Educators**: Training materials, educational content
5. **Businesses**: Internal communications, presentations

### Use Cases
- Documentary-style videos
- Narrative short films
- Product explainer videos
- Educational content
- Marketing and promotional material
- Storyboard visualization
- Pitch presentations

---

## Competitive Advantages

### vs. Traditional Production
- **90% faster** concept-to-delivery
- **80% cost reduction** for initial production
- **No crew required** for initial concepts
- **Instant iteration** on creative directions

### vs. Other AI Tools
- **End-to-end workflow** (not just single-feature)
- **Production Bible system** for series consistency
- **Professional terminology** and workflow
- **Enterprise-grade moderation** for safety
- **Cloud rendering** for high-quality exports

---

## Security & Compliance

- **Content Moderation**: Multi-layer AI moderation (Hive AI)
- **Data Privacy**: GDPR-compliant data handling
- **Secure Storage**: Encrypted cloud storage
- **User Authentication**: Enterprise SSO options
- **Age Verification**: 18+ requirement for account creation

---

## Getting Started

1. **Sign Up**: Create account at sceneflowai.studio
2. **Start Project**: Click "New Project" from dashboard
3. **Describe Your Idea**: Enter your concept in The Blueprint
4. **Generate Script**: AI creates your screenplay
5. **Produce Visuals**: Generate images and videos in Virtual Production
6. **Add Audio**: Create voiceovers and music
7. **Review & Export**: Preview in Screening Room and export

---

## Support & Resources

- **Help Center**: In-app help documentation
- **Video Tutorials**: Step-by-step guides
- **Community**: Creator community (coming soon)
- **Support Email**: support@sceneflowai.studio

---

*SceneFlow AI - Where stories come to life.*

**Website**: https://sceneflowai.studio
**Version**: 2.47
**Last Updated**: February 2026
`

export default function ProductDescriptionPage() {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(productDescription)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  ← Back to Dashboard
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-700" />
              <h1 className="text-xl font-bold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                Product Description
              </h1>
            </div>
            <Button
              onClick={handleCopy}
              className={copied 
                ? "bg-green-600 hover:bg-green-700" 
                : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              }
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Full Document
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 via-orange-900/20 to-gray-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
        
        <div className="relative max-w-5xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Video Production Platform
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
              SceneFlow AI
            </span>
          </h1>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Transform creative concepts into production-ready video content. From initial idea to final cut, 
            SceneFlow AI provides an end-to-end workflow that combines advanced AI with professional filmmaking tools.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                <Zap className="w-5 h-5 mr-2" />
                Start Creating
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={handleCopy}
              className="border-gray-600 hover:bg-gray-800"
            >
              <Copy className="w-5 h-5 mr-2" />
              Copy Document
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        
        {/* Value Proposition */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-amber-400" />
            </div>
            Core Value Proposition
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-red-900/20 to-gray-800/50 rounded-xl p-6 border border-red-700/30">
              <h3 className="text-lg font-semibold text-red-400 mb-3">The Problem</h3>
              <p className="text-gray-300">
                Traditional video production is expensive, time-consuming, and requires specialized skills 
                across multiple disciplines—writing, directing, cinematography, editing, and post-production.
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-900/20 to-gray-800/50 rounded-xl p-6 border border-green-700/30">
              <h3 className="text-lg font-semibold text-green-400 mb-3">The Solution</h3>
              <ul className="text-gray-300 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                  <span>Generate professional scripts from simple concepts</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                  <span>Create stunning visuals using AI image and video generation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                  <span>Produce natural voiceovers with AI voice synthesis</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                  <span>Manage multi-episode series with production bibles</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <Layers className="w-5 h-5 text-cyan-400" />
            </div>
            Complete Workflow
          </h2>
          
          <div className="space-y-4">
            {[
              { phase: 1, name: 'The Blueprint', icon: BookOpen, color: 'purple', desc: 'AI script generation, beat sheets, character development, treatment variants' },
              { phase: 2, name: 'Virtual Production', icon: Clapperboard, color: 'cyan', desc: 'Scene gallery, Imagen 3 visuals, character consistency, direction builder' },
              { phase: 3, name: 'The Creation Hub', icon: Video, color: 'blue', desc: 'Veo 2 video generation, segment studio, Ken Burns effects, batch rendering' },
              { phase: 4, name: 'The Soundstage', icon: Mic2, color: 'green', desc: 'ElevenLabs voices, music generation, sound effects, audio timeline' },
              { phase: 5, name: 'Final Cut', icon: MonitorPlay, color: 'amber', desc: 'Screening room, collaboration, feedback integration, revision workflow' },
              { phase: 6, name: 'The Premiere', icon: Download, color: 'pink', desc: 'Multiple formats, animatic export, production export, cloud storage' },
            ].map((item, i) => (
              <div 
                key={i}
                className={`bg-gradient-to-r from-${item.color}-900/20 to-gray-800/50 rounded-xl p-5 border border-${item.color}-700/30 flex items-center gap-4`}
              >
                <div className={`w-12 h-12 bg-${item.color}-500/20 rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <span className="text-lg font-bold text-white">{item.phase}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <item.icon className="w-4 h-4 text-gray-400" />
                    {item.name}
                  </h3>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-600" />
              </div>
            ))}
          </div>
        </section>

        {/* Key Features */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            Key Features
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Film, title: 'Script Generation', desc: 'Complete screenplays from text prompts with beat sheets and character development', color: 'amber' },
              { icon: Palette, title: 'Image Generation', desc: 'Imagen 3 for photorealistic visuals with character consistency', color: 'cyan' },
              { icon: Video, title: 'Video Generation', desc: 'Veo 2 for cinematic video clips with smart prompt modules', color: 'blue' },
              { icon: Mic2, title: 'Voice Synthesis', desc: 'ElevenLabs integration with multiple voices and voice cloning', color: 'green' },
              { icon: Users, title: 'Series Studio', desc: 'Multi-episode production with AI-generated production bibles', color: 'purple' },
              { icon: Share2, title: 'Collaboration', desc: 'Screening room, stakeholder review, and feedback integration', color: 'pink' },
            ].map((feature, i) => (
              <div 
                key={i}
                className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 hover:border-gray-600 transition-colors"
              >
                <div className={`w-12 h-12 bg-${feature.color}-500/20 rounded-xl flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}-400`} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            Subscription Tiers
          </h2>
          
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { name: 'Trial', price: '$4.99', credits: '1,500', best: 'First-time users' },
              { name: 'Starter', price: '$49/mo', credits: '4,500', best: 'Individual creators' },
              { name: 'Pro', price: '$149/mo', credits: '15,000', best: 'Professional creators', featured: true },
              { name: 'Studio', price: '$599/mo', credits: '75,000', best: 'Production teams' },
            ].map((tier, i) => (
              <div 
                key={i}
                className={`rounded-xl p-5 border ${
                  tier.featured 
                    ? 'bg-gradient-to-br from-amber-900/30 to-orange-900/20 border-amber-500/50' 
                    : 'bg-gray-800/50 border-gray-700/50'
                }`}
              >
                {tier.featured && (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 mb-3 inline-block">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold">{tier.name}</h3>
                <p className="text-2xl font-bold text-white mt-2">{tier.price}</p>
                <p className="text-gray-400 text-sm">{tier.credits} credits</p>
                <p className="text-gray-500 text-xs mt-2">{tier.best}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Competitive Advantages */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            Competitive Advantages
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold mb-4 text-cyan-400">vs. Traditional Production</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-green-400" />
                  <span><strong>90% faster</strong> concept-to-delivery</span>
                </li>
                <li className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <span><strong>80% cost reduction</strong> for initial production</span>
                </li>
                <li className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-green-400" />
                  <span><strong>No crew required</strong> for initial concepts</span>
                </li>
                <li className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-green-400" />
                  <span><strong>Instant iteration</strong> on creative directions</span>
                </li>
              </ul>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold mb-4 text-purple-400">vs. Other AI Tools</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Layers className="w-5 h-5 text-purple-400" />
                  <span><strong>End-to-end workflow</strong> (not single-feature)</span>
                </li>
                <li className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  <span><strong>Production Bible system</strong> for series</span>
                </li>
                <li className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-purple-400" />
                  <span><strong>Enterprise moderation</strong> for safety</span>
                </li>
                <li className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-purple-400" />
                  <span><strong>Cloud rendering</strong> for quality exports</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-12">
          <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/20 rounded-2xl p-12 border border-amber-700/30">
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Video Production?</h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Join thousands of creators using SceneFlow AI to bring their stories to life.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Get Started Free
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={handleCopy}
                className="border-amber-600/50 text-amber-400 hover:bg-amber-600/20"
              >
                <Copy className="w-5 h-5 mr-2" />
                Copy Full Document
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm pt-8 border-t border-gray-800">
          <p>SceneFlow AI - Where stories come to life.</p>
          <p className="mt-2">Version 2.47 • February 2026</p>
        </footer>
      </div>
    </div>
  )
}
