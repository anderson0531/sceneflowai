'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Sparkles, 
  Film, 
  Scissors, 
  MonitorPlay,
  PenTool,
  Wand2,
  Play,
  BarChart2
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * ProductSwitcher - 4-Product Navigation Bar
 * 
 * Provides clear navigation for SceneFlow's unbundled standalone products:
 * - Writer's Room: Script writing/development (Blueprint Phase)
 * - Visualizer: Image/storyboard generation (Production Phase)
 * - Smart Editor: Video/timeline editing (Final Cut)
 * - Screening Room: Review/analytics (Dashboard)
 * 
 * Design: Google Workspace-style horizontal nav with icon + label
 * Active product indicated via border-b-2 border-primary pattern
 */

export interface Product {
  id: string
  name: string
  tagline: string
  icon: React.ReactNode
  href: string
  color: string
  hoverColor: string
  activeColor: string
  matchPaths: string[] // URL patterns that indicate this product is active
}

export const products: Product[] = [
  {
    id: 'writers-room',
    name: "Writer's Room",
    tagline: 'Script & Story',
    icon: <PenTool className="w-5 h-5" />,
    href: '/dashboard/studio/new-project',
    color: 'text-amber-400',
    hoverColor: 'hover:bg-amber-500/10 hover:text-amber-300',
    activeColor: 'bg-amber-500/15 text-amber-300 border-amber-400',
    matchPaths: ['/dashboard/studio', '/dashboard/workflow/ideation']
  },
  {
    id: 'visualizer',
    name: 'Visualizer',
    tagline: 'Storyboards & Scenes',
    icon: <Wand2 className="w-5 h-5" />,
    href: '/dashboard/workflow/storyboard',
    color: 'text-blue-400',
    hoverColor: 'hover:bg-blue-500/10 hover:text-blue-300',
    activeColor: 'bg-blue-500/15 text-blue-300 border-blue-400',
    matchPaths: ['/dashboard/workflow/storyboard', '/dashboard/workflow/vision', '/dashboard/workflow/scene-direction']
  },
  {
    id: 'smart-editor',
    name: 'Smart Editor',
    tagline: 'Edit & Export',
    icon: <Scissors className="w-5 h-5" />,
    href: '/dashboard/workflow/final-cut',
    color: 'text-purple-400',
    hoverColor: 'hover:bg-purple-500/10 hover:text-purple-300',
    activeColor: 'bg-purple-500/15 text-purple-300 border-purple-400',
    matchPaths: ['/dashboard/workflow/final-cut', '/dashboard/workflow/generation', '/dashboard/workflow/video-generation']
  },
  {
    id: 'screening-room',
    name: 'Screening Room',
    tagline: 'Test & Feedback',
    icon: <BarChart2 className="w-5 h-5" />,
    href: '/screening-room',
    color: 'text-emerald-400',
    hoverColor: 'hover:bg-emerald-500/10 hover:text-emerald-300',
    activeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-400',
    matchPaths: ['/screening-room', '/dashboard/workflow/premiere', '/s/', '/share/screening-room']
  },
]

interface ProductSwitcherProps {
  /** Compact mode for sidebar - shows only icons */
  compact?: boolean
  /** Vertical layout for sidebar integration */
  vertical?: boolean
  /** Custom class name */
  className?: string
}

export function ProductSwitcher({ 
  compact = false, 
  vertical = false,
  className 
}: ProductSwitcherProps) {
  const pathname = usePathname()
  
  // Determine which product is active based on current path
  const activeProductId = products.find(product => 
    product.matchPaths.some(path => pathname?.startsWith(path))
  )?.id || null

  return (
    <nav 
      className={cn(
        'flex gap-1',
        vertical ? 'flex-col' : 'flex-row',
        className
      )}
      aria-label="Product navigation"
    >
      {products.map((product, index) => {
        const isActive = product.id === activeProductId
        
        return (
          <Link
            key={product.id}
            href={product.href}
            className="group relative"
          >
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200',
                'border-b-2 border-transparent',
                compact ? 'justify-center' : '',
                isActive 
                  ? product.activeColor + ' border-current'
                  : `text-gray-400 ${product.hoverColor}`
              )}
            >
              {/* Icon */}
              <span className={cn(
                'shrink-0 transition-transform duration-200',
                'group-hover:scale-110',
                isActive ? '' : 'opacity-80 group-hover:opacity-100'
              )}>
                {product.icon}
              </span>
              
              {/* Label - hidden in compact mode */}
              {!compact && (
                <div className="flex flex-col min-w-0">
                  <span className={cn(
                    'text-sm font-medium truncate',
                    isActive ? '' : 'group-hover:text-white'
                  )}>
                    {product.name}
                  </span>
                  {!vertical && (
                    <span className="text-[10px] text-gray-500 truncate">
                      {product.tagline}
                    </span>
                  )}
                </div>
              )}
            </motion.div>
            
            {/* Active indicator line for horizontal mode */}
            {isActive && !vertical && (
              <motion.div
                layoutId="product-indicator"
                className={cn(
                  'absolute -bottom-px left-3 right-3 h-0.5 rounded-full',
                  product.id === 'writers-room' && 'bg-amber-400',
                  product.id === 'visualizer' && 'bg-blue-400',
                  product.id === 'smart-editor' && 'bg-purple-400',
                  product.id === 'screening-room' && 'bg-emerald-400',
                )}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * Compact product icons for sidebar header
 */
export function ProductSwitcherCompact({ className }: { className?: string }) {
  return <ProductSwitcher compact vertical className={className} />
}

/**
 * Get product by ID
 */
export function getProductById(id: string): Product | undefined {
  return products.find(p => p.id === id)
}

/**
 * Get active product based on pathname
 */
export function getActiveProduct(pathname: string): Product | undefined {
  return products.find(product => 
    product.matchPaths.some(path => pathname?.startsWith(path))
  )
}

export default ProductSwitcher
