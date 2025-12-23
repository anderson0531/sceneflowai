'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Users, Shield, Globe, Film, Mic2, Video, Image, Play, ArrowRight, Volume2, VolumeX } from 'lucide-react'
import { FeatureDetailModal } from './FeatureDetailModal'
import { Button } from '@/components/ui/Button'

export function FeatureHighlight() {
  const [selectedFeature, setSelectedFeature] = useState<number | null>(null)
  const [isScreeningMuted, setIsScreeningMuted] = useState(true)
  const screeningVideoRef = useRef<HTMLVideoElement>(null)
  
  const toggleScreeningMute = () => {
    if (screeningVideoRef.current) {
      screeningVideoRef.current.muted = !screeningVideoRef.current.muted
      setIsScreeningMuted(!isScreeningMuted)
    }
  }

  const features = [
    {
      icon: Film,
      title: 'AI Screenplay Generation',
      description: 'Transform ideas into professional scripts with Gemini 2.5 Pro. Complete with scene breakdowns, dialogue, and direction.',
      detailedDescription: 'Our AI Script Generator uses Google Gemini 2.5 Pro to create professional screenplays from your film treatment. Generate complete scripts with professional formatting, natural dialogue, scene descriptions, and camera directions.',
      benefits: [
        'Professional screenplay formatting',
        'Natural character dialogue',
        'Scene-by-scene descriptions',
        'Camera and direction notes',
        'Instant revisions and iterations'
      ],
      useCases: [
        'Short Film: Generate a complete screenplay in under a minute',
        'Web Series: Create episode scripts with consistent character voices',
        'Documentary: Structure narration with compelling story beats'
      ],
      screenshotPlaceholder: {
        gradient: 'from-cyan-500 to-cyan-600',
        icon: Film
      },
      ctaText: 'Try Script Generator',
      ctaLink: '/?signup=1',
      color: 'from-cyan-500 to-cyan-600'
    },
    {
      icon: Image,
      title: 'Character Consistency',
      description: 'Imagen 3 maintains character identity across every frame. Upload references or generate—your characters stay recognizable.',
      detailedDescription: 'Using Google Imagen 3 with reference images, we ensure your characters look consistent throughout your entire production. Upload your own character references or let AI generate them, then watch as every scene maintains perfect visual continuity.',
      benefits: [
        'Reference image support',
        'Consistent character appearance',
        'AI-generated character portraits',
        'Wardrobe & accessory tracking',
        'Cross-scene visual continuity'
      ],
      useCases: [
        'Animation: Keep character designs consistent across 100+ shots',
        'Live Action: Generate consistent storyboard characters',
        'Series: Maintain character identity across multiple episodes'
      ],
      screenshotPlaceholder: {
        gradient: 'from-purple-500 to-purple-600',
        icon: Image
      },
      ctaText: 'See Character Library',
      ctaLink: '/?signup=1',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: Video,
      title: 'Video Generation',
      description: 'Veo 3.1 with 5 generation modes: Text-to-Video, Image-to-Video, Frame-to-Video, Extend, and Reference-based.',
      detailedDescription: 'Generate stunning video segments with Google Veo 3.1. Choose from multiple generation modes: T2V (text-to-video), I2V (image-to-video), FTV (frame-anchored for consistency), EXT (extend existing clips), or REF (style reference). Our Keyframe State Machine ensures smooth transitions.',
      benefits: [
        'Multiple generation modes',
        'Frame-anchored consistency',
        'Keyframe State Machine',
        'Director\'s Console batch rendering',
        'HD/4K output quality'
      ],
      useCases: [
        'Quick Cuts: Generate individual shots from prompts',
        'Smooth Scenes: Use frame-anchoring for visual continuity',
        'Extended Takes: Extend clips beyond initial duration'
      ],
      screenshotPlaceholder: {
        gradient: 'from-amber-500 to-amber-600',
        icon: Video
      },
      ctaText: 'Try Video Generation',
      ctaLink: '/?signup=1',
      color: 'from-amber-500 to-amber-600'
    },
    {
      icon: Mic2,
      title: 'Voice & Audio Studio',
      description: 'ElevenLabs integration for natural dialogue, narration, music generation, and sound effects—all in one platform.',
      detailedDescription: 'Complete audio production with ElevenLabs integration. Generate natural voice acting for every character, professional narration, background music, and sound effects. Multi-language support including tonal languages like Thai and Mandarin.',
      benefits: [
        'Character voice acting',
        'Professional narration',
        'AI music generation',
        'Sound effects library',
        'Multi-language support'
      ],
      useCases: [
        'Dialogue: Give each character a unique, consistent voice',
        'Narration: Add professional voiceover to your story',
        'Soundtrack: Generate original music and SFX'
      ],
      screenshotPlaceholder: {
        gradient: 'from-green-500 to-green-600',
        icon: Mic2
      },
      ctaText: 'Explore Audio Tools',
      ctaLink: '/?signup=1',
      color: 'from-green-500 to-green-600'
    }
  ]

  return (
    <section id="features" className="py-24 bg-slate-900 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(6,182,212,0.05),transparent_70%)]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 text-white">
            Everything You Need to{' '}
            <span className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
              Create Films
            </span>
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            A complete AI-powered production suite powered by Google&apos;s latest AI models and ElevenLabs voice technology.
          </p>
        </motion.div>
        
        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            
            return (
              <motion.div 
                key={index}
                onClick={() => setSelectedFeature(index)}
                className="group cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="h-full bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-all duration-300 group-hover:bg-slate-800/70">
                  <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-base md:text-lg font-bold mb-3 text-white group-hover:text-cyan-400 transition-colors">{feature.title}</h3>
                  <p className="text-gray-400 text-sm md:text-base leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Screening Room Feature */}
        <motion.div 
          className="mt-16 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-8 border border-white/5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <Play className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-white">Screening Room</h3>
              </div>
              <p className="text-gray-400 text-sm md:text-base lg:text-lg mb-6 leading-relaxed">
                Preview your entire film before final export. Watch your scenes come to life with Ken Burns 
                cinematic animation, synchronized audio tracks, and smooth transitions. Make adjustments 
                in real-time before committing to final render.
              </p>
              <ul className="space-y-3">
                {[
                  'Ken Burns cinematic pan & zoom',
                  'Full audio playback (dialogue, music, SFX)',
                  'Scene-by-scene navigation',
                  'HD/4K MP4 export via Shotstack'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Screening Room Video Demo */}
            <div className="relative">
              <div className="aspect-video bg-slate-900 rounded-xl border border-white/10 overflow-hidden relative">
                <video 
                  ref={screeningVideoRef}
                  src="https://xxavfkdhdebrqida.public.blob.vercel-storage.com/demo/screening-room.mp4#t=0.1" 
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  className="w-full h-full object-cover"
                />
                {/* Sound control button */}
                <button
                  onClick={toggleScreeningMute}
                  className={`absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2.5 backdrop-blur-sm rounded-lg border transition-all ${
                    isScreeningMuted 
                      ? 'bg-purple-600/90 border-purple-400/30 hover:bg-purple-500/90' 
                      : 'bg-slate-800/90 border-cyan-400/30 hover:bg-slate-700/90'
                  }`}
                >
                  {isScreeningMuted ? (
                    <>
                      <VolumeX className="w-4 h-4 text-white" />
                      <span className="text-xs font-medium text-white">🎵 Unmute</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
                      <span className="text-xs font-medium text-cyan-300">Sound On</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section CTA */}
        <motion.div 
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Button
            size="lg"
            onClick={() => window.location.href = '/#pricing'}
            className="bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 hover:from-cyan-400 hover:via-purple-400 hover:to-amber-400 text-white px-10 py-5 text-lg font-semibold shadow-lg shadow-purple-500/25"
          >
            See Plans & Pricing
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            Start free with 1,000 credits • No credit card required
          </p>
        </motion.div>

        {/* Additional Features */}
        <motion.div 
          className="mt-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold mb-4 text-white">Built for Professional Production</h3>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Enterprise-ready features for serious creators and production teams.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-slate-800/30 rounded-xl border border-white/5">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h4 className="text-lg font-semibold mb-2 text-white">Team Collaboration</h4>
              <p className="text-gray-400 text-sm">Work with your team in real-time. Share projects, gather feedback, and iterate together.</p>
            </div>
            
            <div className="text-center p-6 bg-slate-800/30 rounded-xl border border-white/5">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h4 className="text-lg font-semibold mb-2 text-white">Enterprise Security</h4>
              <p className="text-gray-400 text-sm">Your content is secure. BYOK (Bring Your Own Keys) ensures complete data privacy.</p>
            </div>
            
            <div className="text-center p-6 bg-slate-800/30 rounded-xl border border-white/5">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-7 h-7 text-white" />
              </div>
              <h4 className="text-lg font-semibold mb-2 text-white">Global AI Infrastructure</h4>
              <p className="text-gray-400 text-sm">Powered by Google Vertex AI with worldwide availability and enterprise-grade reliability.</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Feature Detail Modal */}
      {selectedFeature !== null && (
        <FeatureDetailModal 
          isOpen={selectedFeature !== null}
          onClose={() => setSelectedFeature(null)}
          feature={features[selectedFeature]}
        />
      )}
    </section>
  )
}
