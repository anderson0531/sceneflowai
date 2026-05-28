'use client'

import { motion } from 'framer-motion'
import { Target, Zap, Sparkles, Clock, Globe, Film, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getLoginUrl } from '@/lib/auth/postLoginRedirect'

const SIGNUP_URL = getLoginUrl({ mode: 'signup' })

export function CoreCapabilitiesSection() {
  return (
    <section className="py-24 bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(120,119,198,0.1),transparent_50%)]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Audience Resonance Editor */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="group"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
              <Target className="w-3.5 h-3.5" />
              Intelligence Layer
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Audience Resonance Editor
            </h2>
            
            <p className="text-lg text-slate-400 mb-8 leading-relaxed">
              Know your score before you invest in full renders. Target Audience Resonance scores 
              Blueprint and script with actionable fixes — optimize every beat before Express and video generation.
            </p>
            
            <ul className="space-y-4 mb-10">
              {[
                { icon: Target, text: 'Determine your specific target audience' },
                { icon: Sparkles, text: 'Get real-time score, analysis, and recommendations' },
                { icon: Zap, text: 'One-click fixes to resolve narrative weaknesses' },
                { icon: Film, text: 'Guided Edit to optimize Episodes, Blueprint, and Script' },
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-slate-300">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center group-hover:border-emerald-500/30 transition-colors">
                    <item.icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-sm font-medium">{item.text}</span>
                </li>
              ))}
            </ul>
            
            <Button 
              onClick={() => { window.location.href = SIGNUP_URL }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
            >
              Analyze Your Script
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>

          {/* Sceneflow Express */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="group"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-6">
              <Zap className="w-3.5 h-3.5" />
              Hyper-Speed Production
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Sceneflow Express
            </h2>
            
            <p className="text-lg text-slate-400 mb-8 leading-relaxed">
              Auto-generate storyboards, animatics, and video beats concurrently. Move from script 
              to shareable preview in minutes — then approve Beat Frames before final F2V spend.
            </p>
            
            <div className="grid gap-4 mb-10">
              {[
                { 
                  title: 'Express Storyboard', 
                  desc: 'Review and share audio and video storyboards in minutes vs hours.',
                  time: 'Minutes vs Hours',
                  icon: Globe
                },
                { 
                  title: 'Express Animatics', 
                  desc: 'Render full Ken Burns animatic scenes with high-end voiceovers instantly.',
                  time: 'Minutes vs Hours',
                  icon: Clock
                },
                { 
                  title: 'Express Video', 
                  desc: 'Orchestrate concurrent image and video generation for total scene delivery.',
                  time: 'Minutes vs Days',
                  icon: Film
                }
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-900 border border-white/5 hover:border-cyan-500/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <item.icon className="w-4 h-4 text-cyan-400" />
                      <h4 className="font-bold text-white text-sm">{item.title}</h4>
                    </div>
                    <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">{item.time}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            
            <Button 
              onClick={() => { window.location.href = SIGNUP_URL }}
              className="bg-cyan-600 hover:bg-cyan-500 text-white gap-2"
            >
              Start Express Rendering
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
