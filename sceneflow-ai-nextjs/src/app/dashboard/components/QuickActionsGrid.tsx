'use client'

import { motion } from 'framer-motion'
import { 
  Plus, 
  Layers, 
  CreditCard, 
  Settings,
  PenTool,
  Wand2,
  Scissors,
  BarChart2,
  Upload
} from 'lucide-react'
import Link from 'next/link'

/**
 * QuickActionsGrid - Product-aligned quick actions
 * 
 * Top row: 4 standalone products (Writer's Room, Visualizer, Smart Editor, Screening Room)
 * Bottom row: Core actions (New Project, My Projects, Buy Credits, Settings)
 */

const productActions = [
  { 
    label: "Writer's Room", 
    tagline: 'Script & Story',
    icon: <PenTool className="w-5 h-5" />, 
    href: '/dashboard/studio/new-project',
    color: 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/20'
  },
  { 
    label: 'Visualizer', 
    tagline: 'Storyboards',
    icon: <Wand2 className="w-5 h-5" />, 
    href: '/dashboard/workflow/storyboard',
    color: 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20'
  },
  { 
    label: 'Smart Editor', 
    tagline: 'Edit & Export',
    icon: <Scissors className="w-5 h-5" />, 
    href: '/dashboard/workflow/final-cut',
    color: 'bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 border border-purple-500/20'
  },
  { 
    label: 'Screening Room', 
    tagline: 'Test & Feedback',
    icon: <BarChart2 className="w-5 h-5" />, 
    href: '/dashboard/workflow/premiere',
    color: 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20'
  },
]

const coreActions = [
  { 
    label: 'New Project', 
    icon: <Plus className="w-4 h-4" />, 
    href: '/dashboard/studio/new-project',
    color: 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30'
  },
  { 
    label: 'My Projects', 
    icon: <Layers className="w-4 h-4" />, 
    href: '/dashboard/projects',
    color: 'bg-gray-600/20 text-gray-300 hover:bg-gray-600/30'
  },
  { 
    label: 'Buy Credits', 
    icon: <CreditCard className="w-4 h-4" />, 
    href: '/dashboard/settings/billing',
    color: 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30'
  },
  { 
    label: 'Settings', 
    icon: <Settings className="w-4 h-4" />, 
    href: '/dashboard/settings',
    color: 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
  },
]

export function QuickActionsGrid() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="bg-gray-800 p-5 rounded-xl shadow-lg border border-gray-700"
    >
      <div className="flex items-center gap-2.5 mb-3">
        <h2 className="text-lg font-semibold text-white">⚡ Quick Actions</h2>
      </div>

      {/* Product Actions - 2x2 Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {productActions.map((action, index) => (
          <Link key={index} href={action.href}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
              className={`flex items-center gap-2.5 p-2.5 rounded-lg transition-all duration-200 cursor-pointer ${action.color}`}
            >
              {action.icon}
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">{action.label}</span>
                <span className="text-[10px] text-gray-500 truncate">{action.tagline}</span>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-700 my-3" />

      {/* Core Actions - 2x2 Compact Grid */}
      <div className="grid grid-cols-2 gap-2">
        {coreActions.map((action, index) => (
          <Link key={index} href={action.href}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.25 + index * 0.03 }}
              className={`flex items-center gap-2 p-2 rounded-lg transition-all duration-200 cursor-pointer ${action.color}`}
            >
              {action.icon}
              <span className="text-xs font-medium">{action.label}</span>
            </motion.div>
          </Link>
        ))}
      </div>
    </motion.div>
  )
}
