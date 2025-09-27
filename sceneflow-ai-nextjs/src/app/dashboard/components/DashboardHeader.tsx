'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import {
  Settings,
  LogOut,
  Coins,
  Menu,
  X,
  HelpCircle,
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

export default function DashboardHeader() {
  const { data: session } = useSession();
  const user = session?.user;
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // ... rest of the component logic ...

  const handleLogout = () => {
    signOut();
    setUserMenuOpen(false);
  };

  return (
    <header className="sf-brand bg-black border-b border-dark-border sticky top-0 z-40">
      <div className="w-full px-4 sm:px-6">
        <div className="flex items-center justify-between h-20">
          {/* ... logo and app name ... */}

          <div className="flex items-center space-x-3 sm:space-x-5">
            {/* ... help and credits ... */}
            
            {session && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 p-2.5 rounded-lg hover:bg-dark-bg focus:outline-none focus:ring-2 focus:ring-dark-accent"
                >
                  <div className="w-9 h-9 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden md:block text-base font-medium text-dark-text">
                    {user.name}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-md shadow-2xl z-50 border border-dark-border bg-gray-900">
                    <div className="px-4 py-3 border-b border-dark-border">
                      <p className="text-sm font-semibold text-white">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                    <a
                      href="/dashboard/settings"
                      className="flex items-center px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-800"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </a>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-800"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" className="border-dark-border text-dark-text hover:bg-dark-bg" onClick={() => { window.location.href='/?login=1' }}>
                  Sign In
                </Button>
                <Button size="sm" className="bg-dark-accent hover:bg-dark-accent-hover" onClick={() => { window.location.href='/?signup=1' }}>
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
