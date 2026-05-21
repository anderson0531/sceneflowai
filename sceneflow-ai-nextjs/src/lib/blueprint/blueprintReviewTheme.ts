import type { BlueprintFixSection } from '@/lib/types/audienceResonance'
import type { LucideIcon } from 'lucide-react'
import { BookOpen, Clapperboard, ListOrdered, Palette, Users } from 'lucide-react'

export type BlueprintReviewSectionTheme = {
  borderL: string
  headerGradient: string
  headerBorder: string
  iconClass: string
  navIdle: string
  navHover: string
  Icon: LucideIcon
}

export const BLUEPRINT_REVIEW_SECTION_THEME: Record<
  BlueprintFixSection,
  BlueprintReviewSectionTheme
> = {
  core: {
    borderL: 'border-l-purple-500/70',
    headerGradient: 'from-purple-500/20',
    headerBorder: 'border-purple-500/20',
    iconClass: 'text-purple-400',
    navIdle: 'border-purple-500/30 bg-purple-500/5 text-purple-200/90',
    navHover: 'hover:bg-purple-500/15 hover:border-purple-400/50 hover:text-purple-100',
    Icon: Clapperboard,
  },
  story: {
    borderL: 'border-l-sky-500/70',
    headerGradient: 'from-sky-500/20',
    headerBorder: 'border-sky-500/20',
    iconClass: 'text-sky-400',
    navIdle: 'border-sky-500/30 bg-sky-500/5 text-sky-200/90',
    navHover: 'hover:bg-sky-500/15 hover:border-sky-400/50 hover:text-sky-100',
    Icon: BookOpen,
  },
  characters: {
    borderL: 'border-l-amber-500/70',
    headerGradient: 'from-amber-500/20',
    headerBorder: 'border-amber-500/20',
    iconClass: 'text-amber-400',
    navIdle: 'border-amber-500/30 bg-amber-500/5 text-amber-200/90',
    navHover: 'hover:bg-amber-500/15 hover:border-amber-400/50 hover:text-amber-100',
    Icon: Users,
  },
  beats: {
    borderL: 'border-l-emerald-500/70',
    headerGradient: 'from-emerald-500/20',
    headerBorder: 'border-emerald-500/20',
    iconClass: 'text-emerald-400',
    navIdle: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200/90',
    navHover: 'hover:bg-emerald-500/15 hover:border-emerald-400/50 hover:text-emerald-100',
    Icon: ListOrdered,
  },
  tone: {
    borderL: 'border-l-violet-500/70',
    headerGradient: 'from-violet-500/20',
    headerBorder: 'border-violet-500/20',
    iconClass: 'text-violet-400',
    navIdle: 'border-violet-500/30 bg-violet-500/5 text-violet-200/90',
    navHover: 'hover:bg-violet-500/15 hover:border-violet-400/50 hover:text-violet-100',
    Icon: Palette,
  },
}
