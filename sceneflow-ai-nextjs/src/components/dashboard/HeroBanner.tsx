'use client'

import { Button } from '@/components/ui/Button'
import { MessageCircle, Sparkles } from 'lucide-react'

interface HeroBannerProps {
  userName: string
}

export function HeroBanner({ userName }: HeroBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-8 text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.4%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
      </div>
      
      <div className="relative z-10">
        {/* Main Content */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome back, {userName}! 👋
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-3xl">
            Ready to create something amazing? Your AI-powered video production journey continues here.
          </p>
        </div>

        {/* Cue AI Assistant Bar */}
        <div className="glass-effect rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-yellow-900" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Cue AI Assistant</h3>
                <p className="text-blue-100">Your creative partner is ready to help</p>
              </div>
            </div>
            <Button className="bg-white text-blue-600 hover:bg-blue-50">
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat with Cue
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">12</div>
            <div className="text-blue-100 text-sm">Active Projects</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">89</div>
            <div className="text-blue-100 text-sm">Credits Available</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">24</div>
            <div className="text-blue-100 text-sm">Ideas Saved</div>
          </div>
        </div>
      </div>
    </div>
  )
}
