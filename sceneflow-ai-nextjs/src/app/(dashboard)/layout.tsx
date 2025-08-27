export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex overflow-hidden bg-sf-background">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-sf-surface p-5 border-r border-sf-border flex flex-col sticky top-0 h-screen">
        <div className="text-2xl font-bold mb-10">
            {/* Logo using gradient text */}
            <span className="text-transparent bg-clip-text bg-sf-gradient">SceneFlow AI</span>
        </div>
        <nav className="flex-1 space-y-2">
          {/* Use Ghost Button styles here for navigation links */}
          <div className="p-3 rounded-lg bg-sf-surface-light text-sf-text-primary font-medium">Dashboard</div>
          <div className="p-3 rounded-lg text-sf-text-secondary hover:text-sf-text-primary transition hover:bg-sf-surface-light">Projects</div>
          <div className="p-3 rounded-lg text-sf-text-secondary hover:text-sf-text-primary transition hover:bg-sf-surface-light">Settings (BYOK)</div>
        </nav>
        {/* User Profile Area */}
        <div className="mt-auto pt-4 border-t border-sf-border">
           {/* User Profile/Logout Component */}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-sf-background">
        {/* Content */}
        <div className="p-8">
            {children}
        </div>
      </main>
    </div>
  );
}
