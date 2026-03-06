'use client'

import { motion } from 'framer-motion'
import { Quote, Star, Film, Palette, Briefcase, Users, Sparkles, ArrowRight } from 'lucide-react'
import Image from 'next/image'

const testimonials = [
  {
    quote: "As a solo creator, SceneFlow AI gave me the tools to produce content I never thought possible. What used to take weeks now takes hours.",
    author: "Alex Chen",
    role: "Indie Filmmaker",
    avatar: "AC",
    icon: Film,
    gradient: "from-amber-500 to-orange-500",
    rating: 5
  },
  {
    quote: "The frame-anchored technology is a game-changer. Finally, AI video that maintains character consistency across an entire project.",
    author: "Sarah Mitchell",
    role: "Creative Director",
    avatar: "SM",
    icon: Palette,
    gradient: "from-purple-500 to-pink-500",
    rating: 5
  },
  {
    quote: "We prototyped our entire ad campaign in a fraction of the usual time. The cost savings alone justified the switch.",
    author: "Marcus Johnson",
    role: "Marketing Lead",
    avatar: "MJ",
    icon: Briefcase,
    gradient: "from-blue-500 to-cyan-500",
    rating: 5
  }
]

// Character consistency showcase - the "holy grail" for AI filmmakers
const characterShowcase = {
  characterName: "Maya Chen",
  description: "Same character across 3 different scenes with Frame-Anchored Precision™",
  scenes: [
    { label: "Scene 1: Coffee Shop", time: "Morning" },
    { label: "Scene 2: Office", time: "Afternoon" },
    { label: "Scene 3: Rooftop", time: "Evening" },
  ]
}

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-6">
            <Quote className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 text-sm font-medium">Creator Stories</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-white">Trusted by </span>
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Creative Professionals
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            See how creators are transforming their workflow with AI-powered video production
          </p>
        </motion.div>

        {/* Character Consistency Showcase - The Holy Grail Feature */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <div className="max-w-5xl mx-auto">
            <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/20 via-gray-900 to-gray-900 p-8 lg:p-10">
              <div className="flex flex-col lg:flex-row gap-8 items-center">
                {/* Left: Description */}
                <div className="lg:w-1/3">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 font-semibold">
                      #1 Requested Feature
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    Character Consistency
                  </h3>
                  <p className="text-gray-400 mb-4">
                    The same character, recognizable across every scene. No more &quot;Who is that?&quot; moments.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-purple-400">
                    <Sparkles className="w-4 h-4" />
                    <span>Frame-Anchored Precision™</span>
                  </div>
                </div>
                
                {/* Right: Visual Showcase */}
                <div className="lg:w-2/3">
                  <div className="grid grid-cols-3 gap-4">
                    {characterShowcase.scenes.map((scene, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        className="relative group"
                      >
                        <div className="aspect-[3/4] rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 overflow-hidden relative">
                          {/* Placeholder for character image - in production, use actual generated images */}
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-cyan-500/10" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl">
                                MC
                              </div>
                              <p className="text-xs text-gray-400">{scene.time}</p>
                            </div>
                          </div>
                          
                          {/* Consistency indicator */}
                          <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded bg-black/60 backdrop-blur-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-300 truncate">{scene.label}</span>
                              <span className="text-xs text-emerald-400">✓ Match</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-center text-sm text-gray-500 mt-4">
                    {characterShowcase.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Behind the Scenes: Script to Visualizer */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white mb-2">Behind the Scenes</h3>
            <p className="text-gray-400">From Writer&apos;s Room script to Visualizer output</p>
          </div>
          
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Script Side */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="rounded-xl border border-gray-700/50 bg-gray-900/50 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-gray-700/50 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  <span className="ml-2 text-sm text-gray-400">Writer&apos;s Room</span>
                </div>
                <div className="p-4 font-mono text-sm">
                  <p className="text-gray-500 mb-2">SCENE 12 - INT. COFFEE SHOP - DAY</p>
                  <p className="text-gray-300 mb-3">
                    <span className="text-cyan-400">MAYA</span> sits alone at a corner table, 
                    laptop open, coffee untouched. She stares at the screen, 
                    fingers hovering over the keyboard.
                  </p>
                  <p className="text-gray-500 mb-2">MAYA (V.O.)</p>
                  <p className="text-gray-300 italic">
                    Three years of research. And it all comes down to this moment.
                  </p>
                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">Audience Score: 8.7</span>
                      <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-400">Tension: High</span>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {/* Visualizer Side */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="rounded-xl border border-purple-500/30 bg-gray-900/50 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-purple-500/30 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-purple-400">Visualizer Output</span>
                </div>
                <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 relative">
                  {/* Placeholder for generated scene */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-3 rounded-lg bg-gradient-to-r from-purple-500/30 to-cyan-500/30 flex items-center justify-center">
                        <Film className="w-8 h-8 text-white/50" />
                      </div>
                      <p className="text-sm text-gray-400">Generated scene preview</p>
                    </div>
                  </div>
                  
                  {/* Frame info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Frame 1 of 24</span>
                      <span className="text-purple-400">Character: Maya Chen ✓</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
            
            <div className="flex justify-center mt-6">
              <ArrowRight className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => {
            const Icon = testimonial.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 h-full hover:border-amber-500/30 transition-colors duration-300">
                  {/* Quote icon */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${testimonial.gradient} flex items-center justify-center mb-6`}>
                    <Quote className="w-6 h-6 text-white" />
                  </div>
                  
                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  
                  {/* Quote */}
                  <blockquote className="text-gray-300 text-lg leading-relaxed mb-6">
                    &quot;{testimonial.quote}&quot;
                  </blockquote>
                  
                  {/* Author */}
                  <div className="flex items-center gap-4 mt-auto">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${testimonial.gradient} flex items-center justify-center text-white font-bold`}>
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{testimonial.author}</div>
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Icon className="w-4 h-4" />
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center text-gray-500 text-sm mt-12"
        >
          Join creators who are producing professional content faster with AI
        </motion.p>
      </div>
    </section>
  )
}

export default TestimonialsSection
