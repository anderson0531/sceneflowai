'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Lightbulb, 
  Search, 
  Filter, 
  Sparkles, 
  TrendingUp,
  Clock,
  Heart,
  Share2,
  Bookmark,
  Play
} from 'lucide-react'
import Link from 'next/link'

interface Idea {
  id: string
  title: string
  description: string
  category: string
  tags: string[]
  likes: number
  views: number
  createdAt: string
  author: string
  thumbnail?: string
}

const sampleIdeas: Idea[] = [
  {
    id: '1',
    title: 'Product Launch Story',
    description: 'A compelling narrative approach to showcasing new products through emotional storytelling and customer journey mapping.',
    category: 'Commercial',
    tags: ['product', 'storytelling', 'launch', 'emotional'],
    likes: 127,
    views: 2340,
    createdAt: '2 days ago',
    author: 'Creative Studio Pro'
  },
  {
    id: '2',
    title: 'Educational Series Concept',
    description: 'Breaking down complex topics into digestible, engaging video segments with interactive elements and real-world examples.',
    category: 'Educational',
    tags: ['education', 'series', 'interactive', 'complex-topics'],
    likes: 89,
    views: 1567,
    createdAt: '1 week ago',
    author: 'EduVid Master'
  },
  {
    id: '3',
    title: 'Behind-the-Scenes Documentary',
    description: 'Intimate look at creative processes, team dynamics, and the human side of production that audiences love to see.',
    category: 'Documentary',
    tags: ['behind-scenes', 'process', 'team', 'human'],
    likes: 203,
    views: 4120,
    createdAt: '3 days ago',
    author: 'DocMaker'
  },
  {
    id: '4',
    title: 'Social Media Shorts Strategy',
    description: 'Quick, engaging content designed for social platforms with high retention rates and shareability factors.',
    category: 'Social Media',
    tags: ['social', 'shorts', 'engagement', 'viral'],
    likes: 156,
    views: 2890,
    createdAt: '5 days ago',
    author: 'SocialVid Expert'
  }
]

const categories = ['All', 'Commercial', 'Educational', 'Entertainment', 'Documentary', 'Corporate', 'Social Media']
const tags = ['storytelling', 'product', 'education', 'behind-scenes', 'social', 'viral', 'emotional', 'interactive']

export default function IdeasPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'trending' | 'recent' | 'popular'>('trending')

  const filteredIdeas = sampleIdeas.filter(idea => {
    const matchesSearch = idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         idea.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || idea.category === selectedCategory
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tag => idea.tags.includes(tag))
    
    return matchesSearch && matchesCategory && matchesTags
  })

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lightbulb className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Ideas</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Discover creative concepts, inspiration, and innovative approaches to video production. 
          Find the perfect starting point for your next project.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-6">
        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for ideas, concepts, or inspiration..."
            className="pl-10 pr-4 py-3 text-lg"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Tags Filter */}
        <div className="flex flex-wrap justify-center gap-2">
          {tags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Sort Options */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => setSortBy('trending')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'trending'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Trending</span>
          </button>
          <button
            onClick={() => setSortBy('recent')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'recent'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Recent</span>
          </button>
          <button
            onClick={() => setSortBy('popular')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'popular'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Popular</span>
          </button>
        </div>
      </div>

      {/* Ideas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIdeas.map(idea => (
          <div key={idea.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            {/* Thumbnail Placeholder */}
            <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              <Lightbulb className="w-12 h-12 text-blue-600" />
            </div>
            
            <div className="p-6">
              {/* Category Badge */}
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full mb-3">
                {idea.category}
              </span>
              
              {/* Title and Description */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{idea.title}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{idea.description}</p>
              
              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {idea.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    {tag}
                  </span>
                ))}
              </div>
              
              {/* Stats and Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center space-x-1">
                    <Heart className="w-4 h-4" />
                    <span>{idea.likes}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Play className="w-4 h-4" />
                    <span>{idea.views}</span>
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Bookmark className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Author and Date */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500">{idea.author}</span>
                <span className="text-sm text-gray-400">{idea.createdAt}</span>
              </div>
              
              {/* Use This Idea Button */}
              <div className="mt-4">
                <Link href="/dashboard/projects/new">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Use This Idea
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredIdeas.length === 0 && (
        <div className="text-center py-12">
          <Lightbulb className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No ideas found</h3>
          <p className="text-gray-600 mb-6">Try adjusting your search or filters</p>
          <Button onClick={() => {
            setSearchQuery('')
            setSelectedCategory('All')
            setSelectedTags([])
          }}>
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  )
}
