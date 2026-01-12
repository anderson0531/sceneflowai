'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { User, Mail, UserCircle, Save, Loader } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

export default function ProfilePage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
  })

  useEffect(() => {
    if (session?.user) {
      // Load user data
      fetchUserProfile()
    }
  }, [session])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/profile')
      
      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          setFormData({
            username: data.user.username || '',
            email: data.user.email || '',
            first_name: data.user.first_name || '',
            last_name: data.user.last_name || '',
          })
        }
      } else {
        // Fallback to session data if API fails
        if (session?.user) {
          setFormData({
            username: (session.user as any).username || session.user.email?.split('@')[0] || '',
            email: session.user.email || '',
            first_name: (session.user as any).first_name || '',
            last_name: (session.user as any).last_name || '',
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      // Fallback to session data
      if (session?.user) {
        setFormData({
          username: (session.user as any).username || session.user.email?.split('@')[0] || '',
          email: session.user.email || '',
          first_name: (session.user as any).first_name || '',
          last_name: (session.user as any).last_name || '',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Use a session-based API endpoint
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Profile updated successfully')
        // Reload profile data
        await fetchUserProfile()
      } else {
        toast.error(data.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-sf-primary" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-dark-card border-dark-border text-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sf-primary/20 rounded-lg flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-sf-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">Profile Information</CardTitle>
              <CardDescription className="text-gray-400">
                Manage your account information and personal details
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium text-dark-text flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Username
                </label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  className="bg-dark-bg border-dark-border text-white"
                  placeholder="Enter your username"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-dark-text flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="bg-dark-bg border-dark-border text-white"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="first_name" className="text-sm font-medium text-dark-text">
                  First Name
                </label>
                <Input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="bg-dark-bg border-dark-border text-white"
                  placeholder="Enter your first name"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="last_name" className="text-sm font-medium text-dark-text">
                  Last Name
                </label>
                <Input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="bg-dark-bg border-dark-border text-white"
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-dark-border">
              <Button
                type="submit"
                disabled={saving}
                className="bg-sf-primary hover:bg-sf-accent text-white flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}

