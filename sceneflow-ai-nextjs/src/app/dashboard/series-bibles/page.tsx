'use client'

import { motion } from 'framer-motion'
import { Library, Plus, BookOpen, Users, MapPin, Package, Palette, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

// Placeholder data - will be replaced with API data
const seriesBibles = [
  {
    id: '1',
    title: 'The Crew',
    description: 'A comedy series about a group of friends starting a video production company',
    projectCount: 3,
    characters: 5,
    locations: 4,
    lastUpdated: '2 days ago',
    thumbnail: null
  },
  {
    id: '2', 
    title: 'Space Frontier',
    description: 'Sci-fi adventure series set in the year 2250',
    projectCount: 2,
    characters: 8,
    locations: 6,
    lastUpdated: '1 week ago',
    thumbnail: null
  }
]

export default function SeriesBiblesPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-600/20 rounded-xl flex items-center justify-center">
                <Library className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Series Bibles</h1>
                <p className="text-gray-400 mt-1">
                  Manage reusable characters, locations, and visual styles across projects
                </p>
              </div>
            </div>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Series Bible
            </Button>
          </div>
        </motion.div>

        {/* Feature Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-700/30 rounded-xl p-6 mb-8"
        >
          <h2 className="text-lg font-semibold text-amber-300 mb-3">📚 What is a Series Bible?</h2>
          <p className="text-gray-300 mb-4">
            A Series Bible is your central reference for maintaining consistency across multiple projects in a series. 
            Store character profiles, location references, visual style guides, and story arcs that can be automatically 
            applied to new episodes.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Users className="w-4 h-4 text-blue-400" />
              <span>Character Profiles</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <MapPin className="w-4 h-4 text-green-400" />
              <span>Location References</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Package className="w-4 h-4 text-purple-400" />
              <span>Props & Objects</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Palette className="w-4 h-4 text-pink-400" />
              <span>Visual Style Guide</span>
            </div>
          </div>
        </motion.div>

        {/* Series Bibles Grid */}
        {seriesBibles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {seriesBibles.map((bible, index) => (
              <motion.div
                key={bible.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-amber-600/50 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-600/20 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white group-hover:text-amber-300 transition-colors">
                        {bible.title}
                      </h3>
                      <p className="text-xs text-gray-500">Updated {bible.lastUpdated}</p>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">{bible.description}</p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                  <span>{bible.projectCount} projects</span>
                  <span>•</span>
                  <span>{bible.characters} characters</span>
                  <span>•</span>
                  <span>{bible.locations} locations</span>
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full border-gray-600 text-gray-300 hover:text-amber-300 hover:border-amber-600/50 group-hover:border-amber-600/50"
                >
                  Open Bible
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center"
          >
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Library className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Series Bibles Yet</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Create your first series bible to maintain character and visual consistency across multiple projects.
            </p>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Series Bible
            </Button>
          </motion.div>
        )}

        {/* Coming Soon Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
        >
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Coming Soon</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
            <div>✨ AI-powered character consistency detection</div>
            <div>🎨 Auto-generate style guides from existing projects</div>
            <div>🔗 Link series bibles to projects for auto-injection</div>
          </div>
        </motion.div>

        {/* Back to Dashboard */}
        <div className="mt-8">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-gray-400 hover:text-white">
              ← Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
