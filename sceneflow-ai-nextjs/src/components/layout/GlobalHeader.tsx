'use client'

import React, { useEffect, useState } from 'react'
import { useSession, signOut, signIn } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Menu, X, Settings, User, HelpCircle, LogOut } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { AuthModal } from '../../components/auth/AuthModal'
import { Breadcrumbs } from '../../components/layout/Breadcrumbs'
import { isPublicRoute } from '@/constants/publicRoutes'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}

export function GlobalHeader() {
  const { data: session, status } = useSession()
  const isSignedIn = !!session?.user
  const userName = session?.user?.name || null
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {}, [status])

  // Hide global header on public routes (landing, legal, collaboration pages)
  if (isPublicRoute(pathname)) {
    return null
  }

  // Global header intentionally does not render page titles. Titles live in ContextBar.

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const active = pathname?.startsWith(href)
    return (
      <a
        href={href}
        className={`px-3 py-2 rounded-md text-sm transition-colors ${
          active ? 'bg-gray-800 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
        }`}
      >
        {label}
      </a>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur sf-brand">
        <div className="w-full px-4 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Logo + Mobile Menu */}
          <div className="flex items-center gap-3">
            <button
              className="p-3 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60 lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <a href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 bg-gray-100 dark:bg-sf-surface-light rounded-lg flex items-center justify-center">
                <div className="w-5 h-5 bg-sf-primary rounded-md flex items-center justify-center">
                  <div className="w-2.5 h-2.5 bg-white dark:bg-sf-background rounded-sm" />
                </div>
              </div>
              <span className="app-name-text font-bold text-lg md:text-xl tracking-tight text-gray-900 dark:text-white flex items-baseline gap-1 leading-none">
                <span>SceneFlow</span> <span className="text-sf-primary">AI</span>
              </span>
            </a>
          </div>

          {/* Center: reserved flex spacer to keep left/right balanced */}
          <div className="flex-1" />

          {/* Right: Controls */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Profile */}
            <button
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60"
              aria-label="Profile"
              onClick={() => (isSignedIn ? (window.location.href = '/dashboard/settings/profile') : signIn())}
            >
              <User size={20} />
            </button>
            {/* Help */}
            <button
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60"
              aria-label="Help"
              onClick={() => (window.location.href = '/dashboard')}
            >
              <HelpCircle size={20} />
            </button>
            {/* Settings */}
            <button
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60"
              aria-label="Settings"
              onClick={() => (window.location.href = '/dashboard/settings/billing')}
            >
              <Settings size={20} />
            </button>
            {/* When signed out: explicit auth controls */}
            {!isSignedIn && (
              <div className="hidden sm:flex items-center gap-2 pl-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => setAuthOpen(true)}
                >
                  Sign In
                </Button>
                <Button
                  size="sm"
                  className="bg-sf-primary hover:bg-sf-accent text-white"
                  onClick={() => setAuthOpen(true)}
                >
                  Get Started
                </Button>
              </div>
            )}
            {/* Sign out (visible only when signed in) */}
            {isSignedIn && (
              <button
                className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60"
                aria-label="Sign out"
                onClick={handleSignOut}
                title={userName ? `Sign out ${userName}` : 'Sign out'}
              >
                <LogOut size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95">
            <div className="w-full px-4 py-3 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="flex-1 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setAuthOpen(true)}>
                    <span className="mr-2 inline-flex items-center"><User size={16} /></span> {isSignedIn ? 'Switch Account' : 'Sign In'}
                  </Button>
                </div>
            </div>
          </div>
        )}
      </header>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
