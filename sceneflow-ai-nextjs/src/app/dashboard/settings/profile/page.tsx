'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, MapPin, Save, Edit3, Globe, Building, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function ProfilePage() {
  const { user, checkAuthStatus } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    bio: 'Creative professional passionate about AI-powered video production.',
    company: 'SceneFlow Studios',
    website: 'https://sceneflow.ai'
  })

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoadingProfile(true)
        const token = localStorage.getItem('authToken')
        if (!token) {
          console.error('No authentication token found')
          return
        }

        const response = await fetch('/api/auth/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          setProfile(prev => ({
            ...prev,
            first_name: data.user.first_name || '',
            last_name: data.user.last_name || '',
            email: data.user.email || '',
            username: data.user.username || '',
          }))
        } else {
          console.error('Failed to load profile:', response.status)
          // Fallback to auth context data
          if (user) {
            setProfile(prev => ({
              ...prev,
              first_name: user.first_name || '',
              last_name: user.last_name || '',
              email: user.email || '',
              username: user.username || '',
            }))
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error)
        // Fallback to auth context data
        if (user) {
          setProfile(prev => ({
            ...prev,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            username: user.username || '',
          }))
        }
      } finally {
        setIsLoadingProfile(false)
      }
    }

    loadProfile()
  }, [user])

  const handleSave = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token')
      }

      // Only send fields that have values
      const updateData: any = {}
      if (profile.first_name !== undefined) updateData.first_name = profile.first_name
      if (profile.last_name !== undefined) updateData.last_name = profile.last_name
      if (profile.email !== undefined) updateData.email = profile.email
      if (profile.username !== undefined) updateData.username = profile.username

      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
        setIsEditing(false)
        // Refresh auth context to update user data
        checkAuthStatus()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setMessage(null)
    // Reload profile data to reset any changes
    window.location.reload()
  }

  const getFullName = () => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`
    }
    return profile.username || user?.name || 'User'
  }

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sf-primary"></div>
        <span className="ml-3 text-gray-300">Loading profile...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header with Atmospheric Background */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative isolate overflow-hidden py-8 px-6 rounded-2xl border border-indigo-500/10 bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-sm"
      >
        {/* Atmospheric Background Effect */}
        <div className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl" aria-hidden="true">
          <div className="relative left-[calc(25%)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tl from-indigo-600 to-purple-600 opacity-20 sm:w-[72.1875rem]"
               style={{clipPath: "polygon(25.9% 44.1%, 0% 61.6%, 2.5% 26.9%, 14.5% 0.1%, 19.3% 2%, 27.5% 32.5%, 39.8% 62.4%, 47.6% 68.1%, 52.5% 58.3%, 54.8% 34.5%, 72.5% 76.7%, 99.9% 64.9%, 82.1% 100%, 72.4% 76.8%, 23.9% 97.7%, 25.9% 44.1%)"}}>
          </div>
        </div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-gray-200 to-white tracking-tight">
              Profile Settings
            </h1>
            <p className="text-gray-300 mt-2 text-lg">Manage your account information and preferences</p>
          </div>
        
                  <div className="flex space-x-3">
            {isEditing ? (
              <>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="border-gray-600/50 text-gray-200 hover:text-white hover:border-gray-500/70 px-4 py-2.5 transition-all duration-200 font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2.5 transition-all duration-200 font-semibold shadow-lg"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2.5 transition-all duration-200 font-semibold shadow-lg"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Message Display */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-900/20 border-green-500/30 text-green-300' 
              : 'bg-red-900/20 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2" />
            )}
            {message.text}
          </div>
        </motion.div>
      )}

      {/* Enhanced Profile Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-sm rounded-2xl border border-indigo-500/10 p-8 shadow-2xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300 flex items-center">
              <User className="w-6 h-6 mr-3 text-indigo-400" />
              Basic Information
            </h3>
            
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3">
                First Name
              </label>
              <Input
                type="text"
                value={profile.first_name}
                onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                disabled={!isEditing}
                className="bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500/20 disabled:bg-gray-900/50 disabled:text-gray-500 rounded-lg transition-all duration-200"
                placeholder="Enter your first name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3">
                Last Name
              </label>
              <Input
                type="text"
                value={profile.last_name}
                onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                disabled={!isEditing}
                className="bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500/20 disabled:bg-gray-900/50 disabled:text-gray-500 rounded-lg transition-all duration-200"
                placeholder="Enter your last name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3">
                Company
              </label>
              <Input
                type="text"
                value={profile.company}
                onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                disabled={!isEditing}
                className="bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500/20 disabled:bg-gray-900/50 disabled:text-gray-500 rounded-lg transition-all duration-200"
                placeholder="Enter your company"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3">
                Bio
              </label>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                disabled={!isEditing}
                rows={3}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-white placeholder-gray-400 disabled:bg-gray-900/50 disabled:text-gray-500 transition-all duration-200"
                placeholder="Tell us about yourself"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300 flex items-center">
              <Mail className="w-6 h-6 mr-3 text-indigo-400" />
              Contact Information
            </h3>
            
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3">
                Email Address
              </label>
              <Input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                disabled={!isEditing}
                className="bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500/20 disabled:bg-gray-900/50 disabled:text-gray-500 rounded-lg transition-all duration-200"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3">
                Username
              </label>
              <Input
                type="text"
                value={profile.username}
                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                disabled={!isEditing}
                className="bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500/20 disabled:bg-gray-900/50 disabled:text-gray-500 rounded-lg transition-all duration-200"
                placeholder="Enter your username"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3">
                Phone Number
              </label>
              <Input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                disabled={!isEditing}
                className="bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500/20 disabled:bg-gray-900/50 disabled:text-gray-500 rounded-lg transition-all duration-200"
                placeholder="Enter your phone number"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3">
                Location
              </label>
              <Input
                type="text"
                value={profile.location}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                disabled={!isEditing}
                className="bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500/20 disabled:bg-gray-900/50 disabled:text-gray-500 rounded-lg transition-all duration-200"
                placeholder="Enter your location"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3">
                Website
              </label>
              <Input
                type="url"
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                disabled={!isEditing}
                className="bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500/20 disabled:bg-gray-900/50 disabled:text-gray-500 rounded-lg transition-all duration-200"
                placeholder="Enter your website"
              />
            </div>
          </div>
        </div>

        {/* Enhanced Account Status */}
        <div className="mt-10 pt-8 border-t border-gray-700/50">
          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300 mb-6">
            Account Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-500/40 p-6 rounded-xl backdrop-blur-sm hover:border-green-400/60 transition-all duration-300">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-4 h-4 bg-green-400 rounded-full shadow-lg shadow-green-500/50"></div>
                <span className="text-lg font-semibold text-green-300">Account Active</span>
              </div>
              <p className="text-sm text-green-400/80">Your account is in good standing</p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-500/40 p-6 rounded-xl backdrop-blur-sm hover:border-blue-400/60 transition-all duration-300">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-4 h-4 bg-blue-400 rounded-full shadow-lg shadow-blue-500/50"></div>
                <span className="text-lg font-semibold text-blue-300">Premium Plan</span>
              </div>
              <p className="text-sm text-blue-400/80">Access to all features</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-500/40 p-6 rounded-xl backdrop-blur-sm hover:border-purple-400/60 transition-all duration-300">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-4 h-4 bg-purple-400 rounded-full shadow-lg shadow-purple-500/50"></div>
                <span className="text-lg font-semibold text-purple-300">1500 Credits</span>
              </div>
              <p className="text-sm text-purple-400/80">Available for video generation</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
