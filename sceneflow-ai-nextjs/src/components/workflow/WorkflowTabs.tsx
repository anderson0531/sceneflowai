'use client'

export function WorkflowTabs() {
  const Link = (props: any) => <a {...props} className="px-3 py-2 rounded hover:bg-gray-800 text-sm" />
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  const currentId = pathname.startsWith('/dashboard/studio/') ? pathname.split('/')[3] : null
  const studioBase = currentId ? `/dashboard/studio/${currentId}` : '/dashboard/studio/new-project'
  const isActive = (href: string) => pathname.startsWith(href.split('?')[0])
  const tab = (href: string, label: string) => (
    <Link href={href} style={{ color: isActive(href) ? 'white' : '#9ca3af' }}>{label}</Link>
  )
  return (
    <div className="border-b border-gray-800 bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center gap-4">
        {tab(`${studioBase}?tab=project-idea`, 'Film Concept')}
        {tab(`${studioBase}?tab=outline`, 'Scene Outline')}
        {tab(`${studioBase}?tab=script`, 'Script')}
        {tab(`${studioBase}?tab=series-bible`, 'Series Bible')}
      </div>
    </div>
  )
}
