'use client'

import { motion } from 'framer-motion'
import { Quote, Star, Film, Palette, Briefcase } from 'lucide-react'

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
    quote: "We prototyped our entire ad campaign in 4 hours instead of 3 weeks. The cost savings alone justified the switch.",
    author: "Marcus Johnson",
    role: "Marketing Lead",
    avatar: "MJ",
    icon: Briefcase,
    gradient: "from-blue-500 to-cyan-500",
    rating: 5
  }
]

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
                    "{testimonial.quote}"
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
