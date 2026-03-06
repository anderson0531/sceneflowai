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
  Zap,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Target
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

// Series Launch Checklist Steps - Simplified 3-step flow
const launchSteps = [
  {
    step: 1,
    title: 'Ideate',
    description: 'Enter a topic and get a 10-episode Series Storyline',
    time: '2 min',
    icon: Sparkles,
  },
  {
    step: 2,
    title: 'Analyze',
    description: 'Run Audience Resonance™ to find weaknesses before rendering',
    time: '3 min',
    icon: BarChart3,
  },
  {
    step: 3,
    title: 'Sync',
    description: 'Production Bible auto-carries your Protagonist into every scene',
    time: '5 min',
    icon: RefreshCw,
  },
]

// Script Analysis Feedback - From product screenshots
const scriptStrengths = [
  "The integration of the 'small, worn device' in Scene 1 and 3 effectively foreshadows its later use",
  "Alexander's transformation in Scene 8 is now much more visually compelling",
  "The overall pacing has improved, with a good balance of action and emotional beats",
]

const scriptImprovements = [
  "Narration in Scene 5 and 6 still explains emotions directly, rather than showing them",
  "Alexander's dialogue in Scene 4 could still have more subtext",
  "Anya's motivation could be further explored beyond 'zealous conviction'",
]

// Comparison Table Data - Updated with Intelligence row
const comparisonRows = [
  {
    feature: 'Consistency',
    standard: 'Characters change every prompt',
    showrunner: 'Shared Production Bible for characters & locations',
  },
  {
    feature: 'Scale',
    standard: 'One video at a time',
    showrunner: 'Season-at-a-glance with up to 40 episode blueprints',
  },
  {
    feature: 'Intelligence',
    standard: 'Guesswork',
    showrunner: 'Audience Resonance™ scoring and script analysis',
  },
  {
    feature: 'Efficiency',
    standard: 'Start from scratch',
    showrunner: '"Continue Project" from previous episode data',
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

// Audience Resonance Score Component
const AudienceResonanceScore = () => {
  const score = 86
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <motion.div
      className="relative w-32 h-32"
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-gray-800"
        />
        {/* Progress circle */}
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="url(#resonanceGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          whileInView={{ strokeDashoffset }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="resonanceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          className="text-3xl font-bold text-white"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-gray-400">/ 100</span>
      </div>
    </motion.div>
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
            {/* Cognitive Horizons Series Card */}
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Clapperboard className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Active Series</span>
                    <h4 className="text-lg font-bold text-white">Cognitive Horizons</h4>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400">Episodes</span>
                  <p className="text-lg font-bold text-cyan-400">10/20</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Join Dr. Benjamin Anderson as he navigates the cutting edge of artificial intelligence...</p>
            </div>

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
                title="Cast (4)"
                items={['Dr. Benjamin Anderson', 'Dr. Alexander Anderson', 'Dr. Sara Anderson']}
                gradient="from-purple-900/40 to-purple-950/40"
              />
              <BibleCard
                icon={MapPin}
                title="Locations (6)"
                items={['Research Laboratory', 'City Skyline', 'Conference Room']}
                gradient="from-cyan-900/40 to-cyan-950/40"
              />
              <BibleCard
                icon={Palette}
                title="Visual Style"
                items={['Cinematic 2.35:1', 'Cool 5500K-6000K', 'Low-Key lighting']}
                gradient="from-amber-900/40 to-amber-950/40"
              />
              <BibleCard
                icon={Film}
                title="Tone Guidelines"
                items={['Thriller genre', 'High tension pacing', 'Mystery atmosphere']}
                gradient="from-emerald-900/40 to-emerald-950/40"
              />
            </div>

            {/* Bible-to-Script Consistency Flow */}
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
                  <p className="text-sm font-semibold text-white">Bible → Script → Scene → Output</p>
                  <p className="text-xs text-gray-400">Characters auto-populate in every episode&apos;s Production panel.</p>
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

        {/* Audience Resonance & Script Analysis */}
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-10">
            <div className="inline-flex items-center px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-4">
              <Target className="w-3.5 h-3.5 text-cyan-400 mr-1.5" />
              <span className="text-xs font-medium text-cyan-300">AI Script Intelligence</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Audience Resonance™ Analysis</h3>
            <p className="text-gray-400">Know your score <em>before</em> you hit publish — not after</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Left Column - Resonance Score */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/50">
              <div className="flex flex-col items-center">
                <AudienceResonanceScore score={86} />
                <div className="mt-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-300 font-medium">Ready for Production</span>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Top 15% of scripts analyzed this month
                </p>
              </div>
            </div>

            {/* Center Column - Strengths */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-900/20 to-gray-900 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h4 className="text-lg font-semibold text-white">Strengths</h4>
              </div>
              <div className="space-y-3">
                {scriptStrengths.map((strength, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-200">{strength}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Areas for Improvement */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-900/20 to-gray-900 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h4 className="text-lg font-semibold text-white">Areas for Improvement</h4>
              </div>
              <div className="space-y-3">
                {scriptImprovements.map((improvement, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-gray-200">{improvement}</span>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 text-sm font-medium hover:from-amber-500/30 hover:to-orange-500/30 transition-all flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                One-Click Optimization
              </button>
            </div>
          </div>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">One-Off AI vs. Series Studio</h3>
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
                      Generic AI Tools
                    </div>
                  </th>
                  <th className="py-4 px-4 text-left text-sm font-semibold text-cyan-400">
                    <div className="flex items-center gap-2">
                      <Clapperboard className="w-4 h-4" />
                      SceneFlow Series Studio
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
