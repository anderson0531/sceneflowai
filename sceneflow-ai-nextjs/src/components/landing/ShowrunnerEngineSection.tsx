'use client'

import { motion } from 'framer-motion'
import { 
  Clapperboard, 
  BookOpen, 
  Users, 
  MapPin, 
  Film, 
  Sparkles,
  Check,
  X,
  ArrowRight,
  Play,
  Layers,
  Palette,
  RefreshCw,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

// Series Launch Checklist Steps
const launchSteps = [
  {
    step: 1,
    title: 'Enter Your Topic',
    description: 'Just describe your series concept',
    time: '30 sec',
    icon: Sparkles,
  },
  {
    step: 2,
    title: 'AI Builds Your Bible',
    description: 'Characters, locations, visual style generated',
    time: '2 min',
    icon: BookOpen,
  },
  {
    step: 3,
    title: 'Review Episode Blueprints',
    description: '10-20 episode outlines with story arcs',
    time: '3 min',
    icon: Layers,
  },
  {
    step: 4,
    title: 'Lock Your Characters',
    description: 'Visual consistency across all episodes',
    time: '2 min',
    icon: Users,
  },
  {
    step: 5,
    title: 'Launch Episode 1',
    description: 'One click to start full production',
    time: '2 min',
    icon: Play,
  },
]

// Comparison Table Data
const comparisonRows = [
  {
    feature: 'Character Consistency',
    standard: 'Changes every time you prompt',
    showrunner: 'Locked in the Production Bible',
  },
  {
    feature: 'Story Arc',
    standard: 'One-off, disconnected clips',
    showrunner: 'Narrative-aware across 40+ episodes',
  },
  {
    feature: 'Workflow',
    standard: 'Start from scratch every video',
    showrunner: 'Episode 1 feeds Episode 2 automatically',
  },
  {
    feature: 'Scalability',
    standard: 'Burnout-inducing manual work',
    showrunner: '"Coffee Break" batch production',
  },
]

// Production Bible Card Component
const BibleCard = ({ 
  icon: Icon, 
  title, 
  items, 
  gradient 
}: { 
  icon: React.ElementType
  title: string
  items: string[]
  gradient: string
}) => (
  <motion.div
    className={`p-4 rounded-xl bg-gradient-to-br ${gradient} border border-white/10`}
    whileHover={{ scale: 1.02 }}
    transition={{ duration: 0.2 }}
  >
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-5 h-5 text-white" />
      <span className="font-semibold text-white text-sm">{title}</span>
    </div>
    <div className="space-y-1.5">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
          <span className="text-xs text-gray-300">{item}</span>
        </div>
      ))}
    </div>
  </motion.div>
)

// Episode Card Component (Mockup)
const EpisodeCard = ({ 
  number, 
  title, 
  status, 
  progress 
}: { 
  number: number
  title: string
  status: 'completed' | 'in-progress' | 'blueprint'
  progress?: number
}) => {
  const statusConfig = {
    completed: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Completed' },
    'in-progress': { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-400', label: 'In Progress' },
    blueprint: { bg: 'bg-gray-500/20', border: 'border-gray-500/30', text: 'text-gray-400', label: 'Blueprint' },
  }
  const config = statusConfig[status]

  return (
    <div className={`p-3 rounded-lg ${config.bg} border ${config.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-400">Episode {number}</span>
        <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
      </div>
      <p className="text-sm font-medium text-white truncate">{title}</p>
      {status === 'in-progress' && progress !== undefined && (
        <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

export function ShowrunnerEngineSection() {
  return (
    <section id="showrunner" className="py-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-cyan-950/10 to-gray-950" />
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-full mb-6">
            <Clapperboard className="w-4 h-4 text-cyan-400 mr-2" />
            <span className="text-sm font-medium text-cyan-300">Showrunner Engine™</span>
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
            Don&apos;t Just Make a Video.{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
              Build a Franchise.
            </span>
          </h2>

          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-4">
            Create multi-episode series with persistent characters, locations, and storylines.
            SceneFlow&apos;s <span className="text-cyan-400 font-semibold">Shared Production Bible</span> ensures 
            total visual continuity across 40+ episodes.
          </p>

          <p className="text-sm text-gray-500 max-w-2xl mx-auto">
            Perfect for Educational series, True Crime podcasts, and YouTube franchises.
          </p>
        </motion.div>

        {/* Two Column Layout: Production Bible + Episode Grid */}
        <div className="grid lg:grid-cols-2 gap-12 mb-20">
          {/* Left: Production Bible Visualization */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-purple-400" />
              <h3 className="text-xl font-bold text-white">Shared Production Bible</h3>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              Every character, location, and visual style is locked in your Production Bible.
              Dr. Benjamin Anderson looks the same in Episode 1 and Episode 100.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <BibleCard
                icon={Users}
                title="Characters"
                items={['Dr. Benjamin Anderson', 'Sarah Chen, PhD', 'Marcus Webb']}
                gradient="from-purple-900/40 to-purple-950/40"
              />
              <BibleCard
                icon={MapPin}
                title="Locations"
                items={['Research Laboratory', 'City Skyline', 'Conference Room']}
                gradient="from-cyan-900/40 to-cyan-950/40"
              />
              <BibleCard
                icon={Palette}
                title="Visual Style"
                items={['Cinematic 2.35:1', 'Warm color grade', 'Natural lighting']}
                gradient="from-amber-900/40 to-amber-950/40"
              />
              <BibleCard
                icon={Film}
                title="Tone Guidelines"
                items={['Documentary feel', 'Thoughtful pacing', 'Expert interviews']}
                gradient="from-emerald-900/40 to-emerald-950/40"
              />
            </div>

            {/* Consistency Badge */}
            <motion.div
              className="mt-6 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Auto-Sync Across Episodes</p>
                  <p className="text-xs text-gray-400">Update a character once, changes propagate to all episodes.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Episode Grid Visualization */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <h3 className="text-xl font-bold text-white">Your Entire Season at a Glance</h3>
              </div>
              <div className="text-xs text-gray-400 px-2 py-1 bg-gray-800 rounded">
                Season 1 • 10 Episodes
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              The &quot;Writer&apos;s Room&quot; has already done the heavy lifting for your next 10 videos.
              Just hit &quot;Continue Project&quot; and keep shipping.
            </p>

            {/* Episode Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <EpisodeCard 
                number={1} 
                title="The Discovery" 
                status="completed" 
              />
              <EpisodeCard 
                number={2} 
                title="The First Experiment" 
                status="completed" 
              />
              <EpisodeCard 
                number={3} 
                title="Unexpected Results" 
                status="in-progress" 
                progress={65}
              />
              <EpisodeCard 
                number={4} 
                title="The Breakthrough" 
                status="blueprint" 
              />
              <EpisodeCard 
                number={5} 
                title="Peer Review" 
                status="blueprint" 
              />
              <EpisodeCard 
                number={6} 
                title="Going Public" 
                status="blueprint" 
              />
            </div>

            {/* Progress Summary */}
            <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Season Progress</span>
                <span className="text-sm font-semibold text-white">26%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: '26%' }} />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>2 Completed</span>
                <span>1 In Progress</span>
                <span>7 Blueprints</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Comparison Table */}
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Solo Video vs. Showrunner Engine</h3>
            <p className="text-gray-400">Why YouTube documentarians are switching to series-first production</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full max-w-4xl mx-auto">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="py-4 px-4 text-left text-sm font-semibold text-gray-400">Feature</th>
                  <th className="py-4 px-4 text-left text-sm font-semibold text-red-400">
                    <div className="flex items-center gap-2">
                      <X className="w-4 h-4" />
                      Standard AI Video
                    </div>
                  </th>
                  <th className="py-4 px-4 text-left text-sm font-semibold text-cyan-400">
                    <div className="flex items-center gap-2">
                      <Clapperboard className="w-4 h-4" />
                      Showrunner Engine™
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-800/50">
                    <td className="py-4 px-4 text-sm font-medium text-white">{row.feature}</td>
                    <td className="py-4 px-4 text-sm text-gray-400">{row.standard}</td>
                    <td className="py-4 px-4 text-sm text-cyan-300 font-medium">{row.showrunner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Series Launch Checklist */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-10">
            <div className="inline-flex items-center px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full mb-4">
              <Zap className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
              <span className="text-xs font-medium text-amber-300">10 Minutes to Season 1</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Series Launch Checklist</h3>
            <p className="text-gray-400">From topic idea to complete Season 1 blueprint</p>
          </div>

          {/* Steps Timeline */}
          <div className="relative max-w-4xl mx-auto">
            {/* Connection Line */}
            <div className="absolute top-8 left-8 right-8 h-0.5 bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-amber-500/30 hidden md:block" />

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {launchSteps.map((step, idx) => {
                const Icon = step.icon
                return (
                  <motion.div
                    key={step.step}
                    className="relative text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                  >
                    {/* Step Circle */}
                    <div className="relative z-10 w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-cyan-400" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white">{step.step}</span>
                      </div>
                    </div>

                    <h4 className="text-sm font-semibold text-white mb-1">{step.title}</h4>
                    <p className="text-xs text-gray-400 mb-2">{step.description}</p>
                    <span className="text-xs text-cyan-400 font-medium">{step.time}</span>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Button
            size="lg"
            onClick={() => window.location.href = '/?signup=1'}
            className="bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 hover:from-cyan-400 hover:via-purple-400 hover:to-amber-400 text-white px-10 py-4 text-lg font-semibold shadow-lg shadow-purple-500/25"
          >
            Launch Your First Show
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            Join creators building YouTube franchises with AI-powered series production.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
