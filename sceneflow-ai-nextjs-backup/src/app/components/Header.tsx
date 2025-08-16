'use client'

import { Button } from '@/components/ui/Button'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    setIsMobileMenuOpen(false)
  }

  const scrollToPricing = () => {
    const element = document.getElementById('pricing')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    setIsMobileMenuOpen(false)
  }

  return (
    <motion.header 
      className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800/50"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop Header */}
        <div className="hidden lg:flex justify-between items-center h-24">
          {/* Logo - Large and Prominent */}
          <div className="flex items-center space-x-0">
            <Image 
              src="/logo.svg" 
              alt="SceneFlow AI Logo" 
              width={200} 
              height={67}
              className="h-20 w-auto drop-shadow-lg -mr-6"
            />
            
            {/* App Name and Tagline */}
            <div className="flex flex-col space-y-1">
              <h1 className="text-2xl font-bold">
                <span className="text-white">SceneFlow </span>
                <span className="text-blue-500">AI</span>
              </h1>
              <p className="text-sm text-gray-400 font-medium tracking-wide">
                Imagine. Generate. Flow.
              </p>
            </div>
          </div>
          
          {/* Navigation Links - Center */}
          <nav className="flex items-center space-x-8">
            <button onClick={() => scrollToSection('how-it-works')} className="text-gray-300 hover:text-white transition-colors cursor-pointer font-medium text-lg">How it Works</button>
            <button onClick={() => scrollToSection('features')} className="text-gray-300 hover:text-white transition-colors cursor-pointer font-medium text-lg">Features</button>
            <button onClick={() => scrollToSection('pricing')} className="text-gray-300 hover:text-white transition-colors cursor-pointer font-medium text-lg">Pricing</button>
            <button onClick={() => scrollToSection('faq')} className="text-gray-300 hover:text-white transition-colors cursor-pointer font-medium text-lg">FAQ</button>
          </nav>
          
          {/* CTA Buttons - Right */}
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              className="bg-gray-800/50 hover:bg-gray-700/50 border-gray-600 hover:border-gray-500 text-white hover:text-white transition-all duration-200 px-6 py-3 text-base font-medium backdrop-blur-sm"
            >
              Log In
            </Button>
            <Button onClick={scrollToPricing} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 px-6 py-3 text-base font-medium">Get Started</Button>
          </div>
        </div>

        {/* Mobile Header - Large Logo and App Name */}
        <div className="lg:hidden">
          {/* Top Line - Large Logo and Mobile Menu Button */}
          <div className="flex justify-between items-center h-20">
            {/* Large Mobile Logo */}
            <div className="flex items-center space-x-2">
              <Image 
                src="/logo.svg" 
                alt="SceneFlow AI Logo" 
                width={160} 
                height={54}
                className="h-16 w-auto drop-shadow-lg"
              />
              
              {/* Mobile App Name and Tagline */}
              <div className="flex flex-col space-y-1">
                <h1 className="text-lg font-bold">
                  <span className="text-white">SceneFlow </span>
                  <span className="text-blue-500">AI</span>
                </h1>
                <p className="text-xs text-gray-400 font-medium tracking-wide">
                  Imagine. Generate. Flow.
                </p>
              </div>
            </div>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-300 hover:text-white transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Bottom Line - Navigation Links (Hidden by default on mobile) */}
          <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} pb-4 border-t border-gray-800/50`}>
            <nav className="flex flex-col space-y-3 pt-4">
              <button onClick={() => scrollToSection('how-it-works')} className="text-gray-300 hover:text-white transition-colors cursor-pointer font-medium text-base text-left py-2">How it Works</button>
              <button onClick={() => scrollToSection('features')} className="text-gray-300 hover:text-white transition-colors cursor-pointer font-medium text-base text-left py-2">Features</button>
              <button onClick={() => scrollToSection('pricing')} className="text-gray-300 hover:text-white transition-colors cursor-pointer font-medium text-base text-left py-2">Pricing</button>
              <button onClick={() => scrollToSection('faq')} className="text-gray-300 hover:text-white transition-colors cursor-pointer font-medium text-left py-2">FAQ</button>
              
              {/* Mobile CTA Buttons */}
              <div className="flex flex-col space-y-3 pt-4">
                <Button 
                  variant="outline" 
                  className="bg-gray-800/50 hover:bg-gray-700/50 border-gray-600 hover:border-gray-500 text-white hover:text-white transition-all duration-200 py-3 text-base font-medium w-full backdrop-blur-sm"
                >
                  Log In
                </Button>
                <Button onClick={scrollToPricing} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 py-3 text-base font-medium w-full">Get Started</Button>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </motion.header>
  )
}
