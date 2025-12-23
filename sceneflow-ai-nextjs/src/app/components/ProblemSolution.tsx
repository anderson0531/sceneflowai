'use client'

import { motion } from 'framer-motion'
import { Clock, DollarSign, GraduationCap, ArrowRight, Zap, Wand2, Sparkles } from 'lucide-react'

export function ProblemSolution() {
  const problems = [
    { icon: Clock, problem: 'Weeks of pre-production', solution: 'Minutes with AI automation', color: 'from-red-500 to-orange-500' },
    { icon: DollarSign, problem: '$200+/month tool stack', solution: 'One platform, one price', color: 'from-orange-500 to-amber-500' },
    { icon: GraduationCap, problem: 'Years of training needed', solution: 'Professional results instantly', color: 'from-amber-500 to-yellow-500' },
  ]

  return (
    <section className="py-24 bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full mb-6">
            <span className="text-sm md:text-base font-medium text-red-400">The Old Way Doesn't Work</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Traditional Video Production is
            <span className="block text-4xl md:text-5xl lg:text-6xl text-red-400">Broken</span>
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto">
            Complex software, expensive tools, endless learning curves. It's time for a better way.
          </p>
        </motion.div>
        
        {/* Problem → Solution Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {problems.map((item, index) => (
            <motion.div 
              key={index}
              className="relative group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-white/5 h-full hover:border-cyan-500/30 transition-all duration-300">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-6 opacity-80 group-hover:opacity-100 transition-opacity shadow-lg`}>
                  <item.icon className="w-7 h-7 text-white drop-shadow-sm" />
                </div>
                
                <div className="mb-6">
                  <p className="text-gray-500 text-xs md:text-sm uppercase tracking-wider mb-2">Problem</p>
                  <p className="text-lg md:text-xl lg:text-2xl font-semibold text-red-400 line-through decoration-red-500/50">{item.problem}</p>
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                  <ArrowRight className="w-5 h-5 text-gray-600" />
                </div>
                
                <div>
                  <p className="text-gray-500 text-xs md:text-sm uppercase tracking-wider mb-2">SceneFlow AI</p>
                  <p className="text-lg md:text-xl lg:text-2xl font-semibold text-cyan-400">{item.solution}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Transformation Statement */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-amber-500/10 border border-cyan-500/20 rounded-2xl">
            <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
            <span className="text-base md:text-lg lg:text-xl font-medium text-white">
              AI does the heavy lifting. You focus on your creative vision.
            </span>
            <Wand2 className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
