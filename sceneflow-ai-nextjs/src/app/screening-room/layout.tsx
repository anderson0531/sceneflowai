'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ProductSwitcher } from '@/components/layout/ProductSwitcher'

/**
 * Screening Room Layout
 * 
 * Dedicated layout for the Screening Room product with emerald accent theming.
 * Provides consistent navigation and branding for all screening-room pages.
 */
export default function ScreeningRoomLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header with Product Switcher */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 text-transparent bg-clip-text">
                SceneFlow
              </span>
              <span className="text-gray-600">|</span>
              <span className="text-emerald-400 font-medium">Screening Room</span>
            </motion.div>

            {/* Product Switcher */}
            <ProductSwitcher />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  )
}
