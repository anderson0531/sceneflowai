'use client'

import React, { useEffect, useState } from 'react'
import { useSession, signOut, signIn } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Menu, X, Settings, User, HelpCircle, LogOut } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { AuthModal } from '../../components/auth/AuthModal'
import { Breadcrumbs } from '../../components/layout/Breadcrumbs'
import { ThemeToggle } from './ThemeToggle'

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

  // Hide global header on public collaboration pages for a distraction-free reviewer UX
  if (pathname?.startsWith('/c/')) {
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
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
          {/* Left: Logo + Mobile Menu */}
          <div className="flex items-center gap-3">
            <button
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60 lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <a href="/dashboard" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-gray-100 dark:bg-sf-surface-light rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 bg-sf-primary rounded-md flex items-center justify-center">
                  <div className="w-3 h-3 bg-white dark:bg-sf-background rounded-sm" />
                </div>
              </div>
              <span className="app-name-text font-extrabold text-xl md:text-2xl tracking-tight text-gray-900 dark:text-white flex items-baseline gap-1 leading-none">
                <span>SceneFlow</span> <span className="text-sf-primary">AI</span>
              </span>
            </a>
          </div>

          {/* Center: reserved flex spacer to keep left/right balanced */}
          <div className="flex-1" />

          {/* Right: Controls */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Theme Toggle */}
            <ThemeToggle />
            {/* Profile */}
            <button
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60"
              aria-label="Profile"
              onClick={() => (isSignedIn ? (window.location.href = '/dashboard/profile') : signIn())}
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
              onClick={() => (window.location.href = '/dashboard')}
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
            <div className="max-w-7xl mx-auto px-3 py-3 flex flex-col gap-1">
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
