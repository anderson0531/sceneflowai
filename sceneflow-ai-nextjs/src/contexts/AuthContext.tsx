'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  credits: number
  monthlyCredits: number
  userType: string
  createdAt?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (userData: Omit<User, 'id' | 'credits' | 'monthlyCredits' | 'createdAt'>) => Promise<void>
  logout: () => void
  checkAuthStatus: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const checkAuthStatus = () => {
    try {
      const storedUser = localStorage.getItem('currentUser')
      const authStatus = localStorage.getItem('isAuthenticated')
      
      if (storedUser && authStatus === 'true') {
        const userData = JSON.parse(storedUser)
        setUser(userData)
        setIsAuthenticated(true)
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('Error checking auth status:', error)
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      // For demo purposes, accept any email/password combination
      // In production, this would call your authentication API
      console.log('Login attempt:', { email, password })
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Create user object
      const userData: User = {
        id: 'demo-user',
        name: 'Demo User',
        email: email,
        credits: 1500,
        monthlyCredits: 1500,
        userType: 'demo'
      }
      
      // Store user data
      localStorage.setItem('currentUser', JSON.stringify(userData))
      localStorage.setItem('isAuthenticated', 'true')
      
      setUser(userData)
      setIsAuthenticated(true)
    } catch (error) {
      console.error('Login error:', error)
      throw new Error('Login failed')
    }
  }

  const signup = async (userData: Omit<User, 'id' | 'credits' | 'monthlyCredits' | 'createdAt'>) => {
    try {
      // For demo purposes, create a new user
      // In production, this would call your authentication API
      console.log('Sign up attempt:', userData)
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Create user object
      const newUser: User = {
        id: 'user-' + Date.now(),
        ...userData,
        credits: 1500,
        monthlyCredits: 1500,
        createdAt: new Date().toISOString()
      }
      
      // Store user data
      localStorage.setItem('currentUser', JSON.stringify(newUser))
      localStorage.setItem('isAuthenticated', 'true')
      
      setUser(newUser)
      setIsAuthenticated(true)
    } catch (error) {
      console.error('Signup error:', error)
      throw new Error('Signup failed')
    }
  }

  const logout = () => {
    localStorage.removeItem('currentUser')
    localStorage.removeItem('isAuthenticated')
    setUser(null)
    setIsAuthenticated(false)
  }

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
    checkAuthStatus
  }

  return (
    <AuthContext.Provider value={value}>
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
