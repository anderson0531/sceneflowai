'use client'

import { useStore } from '@/store/useStore'
import { Lightbulb, Settings, CreditCard, Sparkles, Upload, Download, Share2 } from 'lucide-react'
import Link from 'next/link'

export function StudioUtilities() {
  const { user } = useStore()

  const utilities = [
    {
      title: 'Browse Ideas',
      description: 'Discover creative concepts and inspiration',
      icon: Lightbulb,
      href: '/dashboard/ideas',
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-yellow-500/20',
      iconColor: 'text-yellow-500'
    },
    {
      title: 'Manage Credits',
      description: 'View usage and purchase more credits',
      icon: CreditCard,
      href: '/dashboard/settings/billing',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/20',
      iconColor: 'text-green-500'
    },
    {
      title: 'Settings',
      description: 'Configure your account and preferences',
      icon: Settings,
      href: '/dashboard/settings',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/20',
      iconColor: 'text-purple-500'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-dark-text">Studio Management</h2>
        <p className="text-dark-text-secondary">Tools and utilities for your workflow</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {utilities.map((utility) => {
          const Icon = utility.icon
          return (
            <Link key={utility.title} href={utility.href} className="group">
              <div className="bg-dark-card border border-dark-border rounded-xl p-6 hover:border-dark-accent transition-all duration-200 card-hover">
                <div className={`w-12 h-12 ${utility.bgColor} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${utility.iconColor}`} />
                </div>
                
                <h3 className="text-lg font-semibold text-dark-text mb-2 group-hover:text-dark-accent transition-colors">
                  {utility.title}
                </h3>
                
                <p className="text-dark-text-secondary text-sm mb-4">
                  {utility.description}
                </p>
                
                <div className="flex items-center text-dark-text-secondary group-hover:text-dark-accent transition-colors">
                  <span className="text-sm font-medium">Access</span>
                  <Sparkles className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button className="bg-dark-card border border-dark-border rounded-lg p-4 hover:border-dark-accent transition-colors card-hover group">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Upload className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h4 className="font-medium text-dark-text text-sm">Upload Assets</h4>
              <p className="text-xs text-dark-text-secondary">Images, videos</p>
            </div>
          </div>
        </button>

        <button className="bg-dark-card border border-dark-border rounded-lg p-4 hover:border-dark-accent transition-colors card-hover group">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Download className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <h4 className="font-medium text-dark-text text-sm">Export</h4>
              <p className="text-xs text-dark-text-secondary">Final videos</p>
            </div>
          </div>
        </button>

        <button className="bg-dark-card border border-dark-border rounded-lg p-4 hover:border-dark-accent transition-colors card-hover group">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Share2 className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <h4 className="font-medium text-dark-text text-sm">Share</h4>
              <p className="text-xs text-dark-text-secondary">Collaborate</p>
            </div>
          </div>
        </button>

        <button className="bg-dark-card border border-dark-border rounded-lg p-4 hover:border-dark-accent transition-colors card-hover group">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <h4 className="font-medium text-dark-text text-sm">AI Tools</h4>
              <p className="text-xs text-dark-text-secondary">Smart features</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
