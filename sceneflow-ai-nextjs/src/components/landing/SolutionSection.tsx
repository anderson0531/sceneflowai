'use client'

import { motion } from 'framer-motion'
import { Lightbulb, Clapperboard, Film, Play, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'

const solutionSteps = [
  {
    icon: Lightbulb,
    title: "The Blueprint",
    subtitle: "Idea → Film Treatment",
    description: "Describe your idea in plain English. Our AI transforms it into a professional film treatment with structured beats, estimated runtime, and a compelling logline.",
    color: "cyan",
    features: ["Beat sheet generation", "Runtime estimation", "Logline creation"],
    gradient: "from-cyan-500 to-blue-500"
  },
  {
    icon: Clapperboard,
    title: "Virtual Production",
    subtitle: "Like Disney's The Mandalorian",
    description: "We use AI to generate cinematic visuals. Imagen 4 creates consistent characters. Veo 3.1 brings scenes to life with motion and synchronized audio.",
    color: "purple",
    features: ["Character consistency", "AI video generation", "Multi-track audio"],
    gradient: "from-purple-500 to-pink-500"
  },
  {
    icon: Film,
    title: "The Screening Room",
    subtitle: "Preview Before Rendering",
    description: "Preview your video with synchronized narration, dialogue, and sound effects before rendering a single frame. Make changes in real-time.",
    color: "amber",
    features: ["Real-time preview", "Audio sync", "Edit on the fly"],
    gradient: "from-amber-500 to-orange-500"
  },
  {
    icon: Play,
    title: "Director's Console",
    subtitle: "Batch Render with AI Recommendations",
    description: "Batch render your scenes with AI-recommended settings. Our Frame-to-Video technology maintains character consistency across your entire video.",
    color: "green",
    features: ["Smart recommendations", "Frame anchoring", "One-click export"],
    gradient: "from-green-500 to-emerald-500"
  }
]

const colorClasses: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  cyan: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    text: "text-cyan-400",
    badge: "bg-cyan-500/20 text-cyan-300"
  },
  purple: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    text: "text-purple-400",
    badge: "bg-purple-500/20 text-purple-300"
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    badge: "bg-amber-500/20 text-amber-300"
  },
  green: {
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    text: "text-green-400",
    badge: "bg-green-500/20 text-green-300"
  }
}

export function SolutionSection() {
  return (
    <section className="relative py-24 overflow-hidden bg-gray-950">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.08),transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 mb-6">
            <Sparkles className="w-4 h-4 text-green-400 mr-2" />
            <span className="text-sm font-medium text-green-400">The Solution</span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            SceneFlow AI is your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400">
              AI-powered production studio
            </span>
          </h2>
          
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            The same virtual production technology used on The Mandalorian—now accessible to every creator.
          </p>
        </motion.div>

        {/* Solution Steps */}
        <div className="space-y-8 max-w-5xl mx-auto">
          {solutionSteps.map((step, index) => {
            const colors = colorClasses[step.color]
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`relative p-8 rounded-3xl border ${colors.border} ${colors.bg} backdrop-blur-sm overflow-hidden group hover:scale-[1.01] transition-all duration-300`}
              >
                {/* Number Badge */}
                <div className={`absolute top-6 right-6 w-10 h-10 rounded-full ${colors.badge} flex items-center justify-center font-bold text-lg`}>
                  {index + 1}
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* Icon */}
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${step.gradient} shadow-lg`}>
                    <step.icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`text-2xl font-bold ${colors.text}`}>
                        {step.title}
                      </h3>
                      <span className="text-sm text-gray-500">—</span>
                      <span className="text-sm text-gray-400 italic">{step.subtitle}</span>
                    </div>
                    
                    <p className="text-gray-300 text-lg mb-4 leading-relaxed">
                      {step.description}
                    </p>

                    {/* Features */}
                    <div className="flex flex-wrap gap-3">
                      {step.features.map((feature) => (
                        <div 
                          key={feature}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${colors.badge} text-sm`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Connector Line */}
                {index < solutionSteps.length - 1 && (
                  <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-gray-600 rotate-90" />
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
