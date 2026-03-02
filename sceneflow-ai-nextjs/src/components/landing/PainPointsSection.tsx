'use client'

import { motion } from 'framer-motion'
import { Clock, Eye, Users, DollarSign, Frown, TrendingDown } from 'lucide-react'

const painPoints = [
  {
    icon: Clock,
    title: "10+ hours editing",
    description: "You spend more time editing than creating, for a video that gets 47 views",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20"
  },
  {
    icon: Eye,
    title: "100 video ideas stuck in your head",
    description: "You can't translate creative ideas into compelling scripts",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20"
  },
  {
    icon: DollarSign,
    title: "Professional visuals = expensive",
    description: "Quality production requires equipment you can't afford",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20"
  },
  {
    icon: Users,
    title: "Competing against full teams",
    description: "Other creators have production teams while you work alone",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20"
  }
]

export function PainPointsSection() {
  return (
    <section className="relative py-24 overflow-hidden bg-gray-950">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.05),transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full border border-red-500/30 bg-red-500/10 mb-6">
            <Frown className="w-4 h-4 text-red-400 mr-2" />
            <span className="text-sm font-medium text-red-400">The Creator's Dilemma</span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            YouTube creation shouldn&apos;t require{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
              a film degree
            </span>
          </h2>
          
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            The barrier to entry isn&apos;t creativity—it&apos;s production.
          </p>
        </motion.div>

        {/* Pain Points Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {painPoints.map((point, index) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative p-6 rounded-2xl border ${point.borderColor} ${point.bgColor} backdrop-blur-sm group hover:scale-[1.02] transition-transform duration-300`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${point.bgColor} ${point.borderColor} border`}>
                  <point.icon className={`w-6 h-6 ${point.color}`} />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${point.color} mb-2`}>
                    {point.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {point.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Transition */}
        <motion.div 
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <TrendingDown className="w-5 h-5" />
            <span>It doesn&apos;t have to be this way</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
