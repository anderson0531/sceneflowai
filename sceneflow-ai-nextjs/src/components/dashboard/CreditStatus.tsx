'use client'

import { useStore } from '@/store/useStore'
import { CreditCard, Clock, Image, Video, TrendingUp, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export function CreditStatus() {
  const { user } = useStore()

  const creditStats = [
    {
      title: 'Available Credits',
      value: user?.credits || 0,
      change: '+12',
      changeType: 'positive' as const,
      icon: CreditCard,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/20',
      iconColor: 'text-blue-500',
      href: '/dashboard/settings/billing'
    },
    {
      title: 'Pending Credits',
      value: 5,
      change: '-2',
      changeType: 'negative' as const,
      icon: Clock,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-500/20',
      iconColor: 'text-orange-500',
      href: '/dashboard/settings/billing'
    },
    {
      title: 'Image Gen Credits',
      value: 25,
      change: '+5',
      changeType: 'positive' as const,
      icon: Image,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500/20',
      iconColor: 'text-purple-500',
      href: '/dashboard/settings/byok'
    },
    {
      title: 'Video Gen Credits',
      value: 15,
      change: '+3',
      changeType: 'positive' as const,
      icon: Video,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/20',
      iconColor: 'text-green-500',
      href: '/dashboard/settings/byok'
    }
  ]

  const getChangeColor = (changeType: 'positive' | 'negative') => {
    return changeType === 'positive' ? 'text-green-500' : 'text-red-500'
  }

  const getChangeIcon = (changeType: 'positive' | 'negative') => {
    return changeType === 'positive' ? TrendingUp : AlertCircle
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-dark-text">Credit Status</h2>
        <Link 
          href="/dashboard/settings/billing"
          className="text-dark-accent hover:text-dark-accent-hover text-sm font-medium transition-colors"
        >
          View Details →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {creditStats.map((stat) => {
          const Icon = stat.icon
          const ChangeIcon = getChangeIcon(stat.changeType)
          
          return (
            <Link key={stat.title} href={stat.href} className="group">
              <div className="bg-dark-card border border-dark-border rounded-xl p-6 hover:border-dark-accent transition-all duration-200 card-hover">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                  </div>
                  <div className={`flex items-center space-x-1 text-sm ${getChangeColor(stat.changeType)}`}>
                    <ChangeIcon className="w-4 h-4" />
                    <span className="font-medium">{stat.change}</span>
                  </div>
                </div>
                
                <h3 className="text-dark-text-secondary text-sm font-medium mb-1">
                  {stat.title}
                </h3>
                
                <div className="text-3xl font-bold text-dark-text mb-2">
                  {stat.value}
                </div>
                
                <div className="flex items-center text-dark-text-secondary group-hover:text-dark-accent transition-colors">
                  <span className="text-sm">Manage</span>
                  <div className="w-1 h-1 bg-current rounded-full mx-2"></div>
                  <span className="text-sm">Configure</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Credit Usage Chart Placeholder */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-dark-text">Credit Usage</h3>
          <select className="bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:ring-2 focus:ring-dark-accent focus:border-transparent">
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>Last 90 days</option>
          </select>
        </div>
        
        <div className="h-32 bg-dark-bg rounded-lg flex items-center justify-center border border-dark-border">
          <div className="text-center">
            <TrendingUp className="w-8 h-8 text-dark-text-secondary mx-auto mb-2" />
            <p className="text-dark-text-secondary text-sm">Usage chart coming soon</p>
          </div>
        </div>
      </div>

      {/* Low Credit Warning */}
      {user && user.credits < 20 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="font-semibold text-red-500">Low Credit Warning</h3>
              <p className="text-red-400 text-sm">
                You have {user.credits} credits remaining. Consider purchasing more to continue using SceneFlow AI.
              </p>
            </div>
            <Link 
              href="/dashboard/settings/billing"
              className="ml-auto bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
            >
              Buy Credits
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
