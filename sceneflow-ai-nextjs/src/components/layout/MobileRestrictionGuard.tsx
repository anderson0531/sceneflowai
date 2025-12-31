'use client'

import React from 'react'
import { useIsDesktopOrTablet } from '@/hooks/useScreenSize'
import { Monitor, Tablet, Smartphone } from 'lucide-react'

interface MobileRestrictionGuardProps {
  children: React.ReactNode
}

/**
 * MobileRestrictionGuard
 * 
 * Blocks access to app functionality on screens smaller than 1024px (tablet/desktop minimum).
 * Shows a friendly overlay encouraging users to switch to a larger device.
 * 
 * Landing pages and public routes should NOT be wrapped with this component.
 */
export function MobileRestrictionGuard({ children }: MobileRestrictionGuardProps) {
  const isDesktopOrTablet = useIsDesktopOrTablet()

  // During SSR or initial hydration, render children to avoid flash
  // The check will run on client after hydration
  if (isDesktopOrTablet === null) {
    return <>{children}</>
  }

  // If screen is large enough, render children normally
  if (isDesktopOrTablet) {
    return <>{children}</>
  }

  // Small screen detected - show blocking overlay
  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 30%, rgba(6, 182, 212, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.3) 0%, transparent 50%)
            `
          }}
        />
      </div>

      {/* Content */}
      <div className="relative text-center max-w-md">
        {/* Device icons */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="relative">
            <Smartphone className="w-12 h-12 text-gray-500" />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">✕</span>
            </div>
          </div>
          <div className="text-gray-600 text-2xl">→</div>
          <div className="relative">
            <Tablet className="w-14 h-14 text-cyan-400" />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
          </div>
          <div className="relative">
            <Monitor className="w-16 h-16 text-cyan-400" />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            SceneFlow AI
          </h1>
        </div>

        {/* Message */}
        <h2 className="text-xl font-semibold text-white mb-3">
          Larger Screen Required
        </h2>
        <p className="text-gray-400 mb-6 leading-relaxed">
          SceneFlow AI&apos;s professional video production tools are designed for 
          <span className="text-cyan-400 font-medium"> tablet</span> or 
          <span className="text-cyan-400 font-medium"> desktop</span> screens 
          to give you the best creative experience.
        </p>

        {/* Features that need larger screen */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700/50">
          <p className="text-sm text-gray-500 mb-3">Features optimized for larger screens:</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
              Multi-scene timeline
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
              Video preview panels
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
              Asset management
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
              Drag-and-drop editing
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Please switch to a device with at least <span className="text-white font-medium">1024px</span> screen width
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
            <Monitor className="w-4 h-4" />
            <span>Desktop, laptop, or tablet in landscape mode</span>
          </div>
        </div>

        {/* Optional: Link back to landing page */}
        <div className="mt-8 pt-6 border-t border-slate-700/50">
          <a 
            href="/"
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            ← Back to homepage
          </a>
        </div>
      </div>
    </div>
  )
}

export default MobileRestrictionGuard
