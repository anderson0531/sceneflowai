'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { User, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export function DashboardHeader() {
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    window.location.href = '/'
  }

  return (
    <motion.header 
      className="bg-white border-b border-gray-200 shadow-sm"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Image 
              src="/logo.svg" 
              alt="SceneFlow AI Logo" 
              width={60} 
              height={30}
              className="h-8 w-auto"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                <span>SceneFlow </span>
                <span className="text-blue-600">AI</span>
              </h1>
              <p className="text-sm text-gray-500">Dashboard</p>
            </div>
          </div>
          
          {/* User Info and Actions */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 text-gray-700">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium">{user?.name || 'Demo User'}</span>
            </div>
            
            <button
              onClick={() => window.location.href = '/dashboard/'}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 text-sm font-medium"
            >
              Go to Dashboard
            </button>
            
            <button
              onClick={handleLogout}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </motion.header>
  )
}
