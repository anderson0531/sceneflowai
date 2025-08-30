'use client'

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, LogOut, User, Clapperboard, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEnhancedStore } from '@/store/enhancedStore';
import { useCue } from '@/store/useCueStore';
import { Button } from '@/components/ui/Button';

interface DashboardHeaderProps {
  user?: {
    name: string;
    email: string;
    credits: number;
  };
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ user }) => {
  const { logout } = useAuth();
  const { resetStore } = useEnhancedStore();
  const { isSidebarOpen, toggleSidebar } = useCue();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);



  const handleLogout = () => {
    // Show confirmation dialog
    if (window.confirm('Are you sure you want to logout? Any unsaved work will be lost.')) {
      setIsLoggingOut(true);
      
      try {
        // Call the logout function from AuthContext
        logout();
        
        // Reset the enhanced store
        resetStore();
        
        // Clear any additional session data
        localStorage.removeItem('currentStructuredTemplate');
        localStorage.removeItem('currentTemplate');
        
        // Clear any other app-specific data
        sessionStorage.clear();
        
        // Redirect to the landing page
        router.push('/');
        
        console.log('User logged out successfully');
      } catch (error) {
        console.error('Logout error:', error);
        // Even if there's an error, redirect to landing page
        router.push('/');
      } finally {
        setIsLoggingOut(false);
      }
    }
  };

  return (
    <header className="navigation-bar px-6 py-8 flex items-center justify-between">
      {/* Logo and Brand */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          {/* Updated Logo with teal-green accent */}
          <div className="relative">
            <div className="w-20 h-20 bg-sf-surface-light rounded-xl flex items-center justify-center">
              <div className="w-12 h-12 bg-sf-primary rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 bg-sf-background rounded-sm"></div>
              </div>
            </div>
            {/* Enhanced connector triangle in teal-green */}
            <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-sf-primary border-t-4 border-t-transparent border-b-4 border-b-transparent opacity-90"></div>
          </div>
          <div className="flex items-center">
            <div className="app-name-text font-bold text-3xl text-white whitespace-nowrap" style={{ fontSize: '1.875rem !important', lineHeight: '1.2 !important' }}>
              <span>SceneFlow </span>
              <span className="text-sf-primary">AI</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* User Info and Actions */}
      <div className="flex items-center gap-2 sm:gap-4">


        <div className="flex items-center gap-2 text-sf-text-primary min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-sf-primary-dark rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          <span className="hidden sm:inline text-sm font-medium truncate max-w-[140px] font-emphasis">{user?.name || 'Demo User'}</span>
        </div>
        <Link href="/dashboard/help">
          <Button
            variant="outline"
            size="sm"
            className="border-gray-600/50 text-gray-200 hover:text-white hover:border-gray-500/70 px-4 py-2.5 transition-all duration-200 font-semibold"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Help
          </Button>
        </Link>
        
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="header-btn-secondary px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 font-emphasis disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Logout"
        >
          {isLoggingOut ? (
            <>
              <div className="w-4 h-4 border-2 border-sf-text-secondary border-t-transparent rounded-full animate-spin" />
              <span className="hidden sm:inline">Logging out...</span>
            </>
          ) : (
            <>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;
