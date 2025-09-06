'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  username: string
  first_name?: string
  last_name?: string
  credits: number
  monthlyCredits: number
  userType: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  signup: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  checkAuthStatus: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('authToken')
      
      if (token) {
        // Check if it's a demo token
        if (token.startsWith('demo-token-')) {
          // For demo tokens, we'll use the stored user data
          const storedUser = localStorage.getItem('demoUser')
          if (storedUser) {
            const userData = JSON.parse(storedUser)
            setUser(userData)
            setIsAuthenticated(true)
            try { localStorage.setItem('authUserId', userData.id) } catch {}
            return
          }
        }

        // Verify token with backend
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })

        if (response.ok) {
          const data = await response.json()
          const userData: User = {
            id: data.user.id,
            name: data.user.first_name && data.user.last_name 
              ? `${data.user.first_name} ${data.user.last_name}` 
              : data.user.username,
            email: data.user.email,
            username: data.user.username,
            first_name: data.user.first_name,
            last_name: data.user.last_name,
            credits: 1500, // Default credits
            monthlyCredits: 1500,
            userType: 'user'
          }
          setUser(userData)
          setIsAuthenticated(true)
          try { localStorage.setItem('authUserId', userData.id) } catch {}
        } else {
          // Token is invalid, clear it
          localStorage.removeItem('authToken')
          localStorage.removeItem('demoUser')
          setUser(null)
          setIsAuthenticated(false)
        }
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('Auth status check failed:', error)
      localStorage.removeItem('authToken')
      localStorage.removeItem('demoUser')
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('authToken', data.token)
        
        // Handle demo mode
        if (data.demo) {
          const userData: User = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            username: data.user.username,
            first_name: data.user.first_name,
            last_name: data.user.last_name,
            credits: 1500,
            monthlyCredits: 1500,
            userType: 'user'
          }
          localStorage.setItem('demoUser', JSON.stringify(userData))
          setUser(userData)
          setIsAuthenticated(true)
          try { localStorage.setItem('authUserId', userData.id) } catch {}
        } else {
          // Real authentication
          const userData: User = {
            id: data.user.id,
            name: data.user.first_name && data.user.last_name 
              ? `${data.user.first_name} ${data.user.last_name}` 
              : data.user.username,
            email: data.user.email,
            username: data.user.username,
            first_name: data.user.first_name,
            last_name: data.user.last_name,
            credits: 1500,
            monthlyCredits: 1500,
            userType: 'user'
          }
          setUser(userData)
          setIsAuthenticated(true)
          try { localStorage.setItem('authUserId', userData.id) } catch {}
        }
        
        return true
      } else {
        console.error('Login failed:', data.error)
        return false
      }
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      // Split name into first and last name
      const nameParts = name.trim().split(' ')
      const first_name = nameParts[0] || ''
      const last_name = nameParts.slice(1).join(' ') || ''
      
      // Generate username from email
      const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          username,
          password,
          first_name,
          last_name
        }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('authToken', data.token)
        
        // Handle demo mode
        if (data.demo) {
          const userData: User = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            username: data.user.username,
            first_name: data.user.first_name,
            last_name: data.user.last_name,
            credits: 1500,
            monthlyCredits: 1500,
            userType: 'user'
          }
          localStorage.setItem('demoUser', JSON.stringify(userData))
          setUser(userData)
          setIsAuthenticated(true)
          try { localStorage.setItem('authUserId', userData.id) } catch {}
        } else {
          // Real authentication
          const userData: User = {
            id: data.user.id,
            name: data.user.first_name && data.user.last_name 
              ? `${data.user.first_name} ${data.user.last_name}` 
              : data.user.username,
            email: data.user.email,
            username: data.user.username,
            first_name: data.user.first_name,
            last_name: data.user.last_name,
            credits: 1500,
            monthlyCredits: 1500,
            userType: 'user'
          }
          setUser(userData)
          setIsAuthenticated(true)
          try { localStorage.setItem('authUserId', userData.id) } catch {}
        }
        
        return true
      } else {
        console.error('Signup failed:', data.error)
        return false
      }
    } catch (error) {
      console.error('Signup error:', error)
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('demoUser')
    localStorage.removeItem('authUserId')
    setUser(null)
    setIsAuthenticated(false)
  }

  useEffect(() => {
    checkAuthStatus()
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, signup, logout, checkAuthStatus }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
