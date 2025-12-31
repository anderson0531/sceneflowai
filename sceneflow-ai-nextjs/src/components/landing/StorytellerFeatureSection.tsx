'use client'

import { motion } from 'framer-motion'
import { 
  Clock, 
  DollarSign, 
  Calendar, 
  Mic2, 
  ImageIcon, 
  Film,
  CheckCircle2,
  ArrowRight,
  Skull,
  BookOpen,
  Brain,
  ScrollText,
  Newspaper,
  Lightbulb
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

// Content categories this mode serves
const contentCategories = [
  { icon: Skull, name: 'True Crime', desc: 'Mystery & investigation stories' },
  { icon: BookOpen, name: 'History', desc: 'Historical documentaries' },
  { icon: Brain, name: 'Philosophy', desc: 'Stoicism & life lessons' },
  { icon: ScrollText, name: 'Book Reviews', desc: 'Summaries & analysis' },
  { icon: Newspaper, name: 'News Explainers', desc: 'Current events breakdown' },
  { icon: Lightbulb, name: 'Educational', desc: 'How-to & tutorials' },
]

// Three-step workflow
const productionSteps = [
  {
    phase: 1,
    label: 'Input',
    title: 'Drop Your Script',
    detail: 'Paste narration text or let our AI expand a topic into a full script with scene breakdowns',
    duration: '~3 minutes',
    icon: Mic2,
    accentColor: 'from-blue-500 to-cyan-500'
  },
  {
    phase: 2,
    label: 'Generate',
    title: 'AI Creates Visuals',
    detail: 'Automatic scene-by-scene imagery with cinematic Ken Burns motion and smooth transitions',
    duration: '~15 minutes',
    icon: ImageIcon,
    accentColor: 'from-amber-500 to-orange-500'
  },
  {
    phase: 3,
    label: 'Export',
    title: 'Preview & Publish',
    detail: 'Review in the Screening Room, make quick edits, export 4K video ready for upload',
    duration: '~10 minutes',
    icon: Film,
    accentColor: 'from-green-500 to-emerald-500'
  }
]

// Cost comparison data
const costAnalysis = [
  { 
    metric: 'Cost per video', 
    traditional: '$300 - $600', 
    withSceneflow: 'Included*',
    savings: 'Save $400+'
  },
  { 
    metric: 'Time investment', 
    traditional: '10 - 24 hours', 
    withSceneflow: '< 30 min',
    savings: 'Much faster'
  },
  { 
    metric: 'Videos per month', 
    traditional: '2 - 4 max', 
    withSceneflow: '30+ possible',
    savings: 'More output'
  },
  { 
    metric: 'Style consistency', 
    traditional: 'Varies by editor', 
    withSceneflow: 'AI-controlled',
    savings: 'Always on-brand'
  },
]

export function StorytellerFeatureSection() {
  return (
    <section className="py-20 bg-gray-900 relative">
      {/* Section Header */}
      <div className="container mx-auto px-4 mb-16">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider text-amber-400 bg-amber-500/10 rounded-full mb-4">
            STORYTELLER MODE
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Built for{' '}
            <span className="text-amber-400">Audio-First</span>{' '}
            Creators
          </h2>
          <p className="text-lg text-gray-400">
            Your voice is the product. We handle the visuals so you can focus on storytelling.
          </p>
        </div>
      </div>

      {/* Content Category Grid */}
      <div className="container mx-auto px-4 mb-20">
        <h3 className="text-center text-sm font-medium text-gray-500 uppercase tracking-wider mb-8">
          Perfect For These Content Types
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {contentCategories.map((category, idx) => {
            const CategoryIcon = category.icon
            return (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="group p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:border-amber-500/50 hover:bg-gray-800 transition-all cursor-default"
              >
                <CategoryIcon className="w-8 h-8 text-amber-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-white text-sm mb-1">{category.name}</h4>
                <p className="text-xs text-gray-500">{category.desc}</p>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Three-Step Workflow */}
      <div className="container mx-auto px-4 mb-20">
        <h3 className="text-center text-2xl font-bold text-white mb-12">
          From Idea to Upload in Three Steps
        </h3>
        
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {productionSteps.map((step, idx) => {
            const StepIcon = step.icon
            return (
              <motion.div
                key={step.phase}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 }}
                className="relative"
              >
                {/* Connector Line (not on last item) */}
                {idx < productionSteps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[calc(50%+2rem)] right-0 h-px bg-gradient-to-r from-gray-600 to-transparent" />
                )}
                
                <div className="p-6 rounded-2xl bg-gradient-to-b from-gray-800 to-gray-800/50 border border-gray-700 h-full">
                  {/* Phase Badge */}
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${step.accentColor} text-white text-xs font-bold mb-4`}>
                    {step.label}
                  </div>
                  
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-xl bg-gray-700/50 flex items-center justify-center mb-4">
                    <StepIcon className="w-7 h-7 text-white" />
                  </div>
                  
                  {/* Content */}
                  <h4 className="text-xl font-bold text-white mb-2">{step.title}</h4>
                  <p className="text-gray-400 text-sm mb-4 leading-relaxed">{step.detail}</p>
                  
                  {/* Duration */}
                  <div className="flex items-center gap-2 text-amber-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">{step.duration}</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
        
        {/* Total Time Callout */}
        <div className="text-center mt-10">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-amber-500/10 border border-amber-500/30">
            <Clock className="w-5 h-5 text-amber-400" />
            <span className="text-amber-300 font-semibold">Total Time: Under 30 Minutes</span>
          </div>
        </div>
      </div>

      {/* Cost Comparison Table */}
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-center text-2xl font-bold text-white mb-8">
            Stop Overpaying for Video Production
          </h3>
          
          <div className="rounded-2xl overflow-hidden border border-gray-700 bg-gray-800/50">
            {/* Mobile: Stacked Cards */}
            <div className="md:hidden space-y-0">
              {costAnalysis.map((row, idx) => (
                <div 
                  key={row.metric}
                  className={`p-4 ${idx !== costAnalysis.length - 1 ? 'border-b border-gray-700/50' : ''}`}
                >
                  <div className="font-medium text-white mb-3">{row.metric}</div>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-gray-500 text-xs block mb-1">Traditional</span>
                      <div className="text-gray-400">{row.traditional}</div>
                    </div>
                    <div>
                      <span className="text-amber-400 text-xs block mb-1">SceneFlow</span>
                      <div className="text-white font-semibold">{row.withSceneflow}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-green-400 font-medium text-sm bg-green-500/10 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    {row.savings}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Original Table */}
            <div className="hidden md:block">
              {/* Table Header */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-gray-800 border-b border-gray-700 text-sm font-medium">
                <div className="text-gray-400">Metric</div>
                <div className="text-gray-400">Traditional Editor</div>
                <div className="text-amber-400">With SceneFlow</div>
                <div className="text-green-400">Your Benefit</div>
              </div>
              
              {/* Table Body */}
              {costAnalysis.map((row, idx) => (
                <div 
                  key={row.metric}
                  className={`grid grid-cols-4 gap-4 p-4 items-center ${
                    idx !== costAnalysis.length - 1 ? 'border-b border-gray-700/50' : ''
                  }`}
                >
                  <div className="text-white font-medium text-sm">{row.metric}</div>
                  <div className="text-gray-500 text-sm">{row.traditional}</div>
                  <div className="text-white font-semibold text-sm">{row.withSceneflow}</div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-green-400 text-sm font-medium">{row.savings}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <p className="text-center text-gray-500 text-xs mt-4">
            * Animatic exports included with Creator subscription. Full AI video renders use credits.
          </p>
        </div>
        
        {/* Final CTA */}
        <div className="text-center mt-12">
          <Button 
            size="lg"
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-10 py-6 text-lg shadow-2xl shadow-orange-500/20"
          >
            Start Creating for Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  )
}
