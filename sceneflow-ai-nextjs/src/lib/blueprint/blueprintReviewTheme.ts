import type { BlueprintFixSection } from '@/lib/types/audienceResonance'
import type { LucideIcon } from 'lucide-react'
import { BookOpen, Clapperboard, ListOrdered, Palette, Users } from 'lucide-react'

export type BlueprintSurfaceVariant = 'review' | 'studio'

export type BlueprintReviewSectionTheme = {
  borderL: string
  headerGradient: string
  headerBorder: string
  iconClass: string
  navIdle: string
  navHover: string
  Icon: LucideIcon
  fieldLabel: string
  fieldCard: string
  fieldLabelStudio: string
  fieldCardStudio: string
  subsectionHeading: string
  subsectionHeadingStudio: string
}

export const BLUEPRINT_REVIEW_SECTION_THEME: Record<
  BlueprintFixSection,
  BlueprintReviewSectionTheme
> = {
  core: {
    borderL: 'border-l-purple-500/70',
    headerGradient: 'from-purple-500/25',
    headerBorder: 'border-purple-500/25',
    iconClass: 'text-purple-400',
    navIdle: 'border-purple-500/30 bg-purple-500/5 text-purple-200/90',
    navHover: 'hover:bg-purple-500/15 hover:border-purple-400/50 hover:text-purple-100',
    Icon: Clapperboard,
    fieldLabel: 'text-purple-300',
    fieldCard: 'border-purple-500/20 bg-purple-500/8 border-l-purple-500/60',
    fieldLabelStudio: 'text-purple-700 dark:text-purple-300',
    fieldCardStudio:
      'border-purple-200/80 bg-purple-50/80 border-l-purple-500/70 dark:border-purple-500/20 dark:bg-purple-500/8 dark:border-l-purple-400/60',
    subsectionHeading: 'border-l-purple-500/70 bg-purple-500/10 text-purple-200',
    subsectionHeadingStudio:
      'border-l-purple-500 bg-purple-50 text-purple-900 dark:bg-purple-500/10 dark:text-purple-200',
  },
  story: {
    borderL: 'border-l-sky-500/70',
    headerGradient: 'from-sky-500/25',
    headerBorder: 'border-sky-500/25',
    iconClass: 'text-sky-400',
    navIdle: 'border-sky-500/30 bg-sky-500/5 text-sky-200/90',
    navHover: 'hover:bg-sky-500/15 hover:border-sky-400/50 hover:text-sky-100',
    Icon: BookOpen,
    fieldLabel: 'text-sky-300',
    fieldCard: 'border-sky-500/20 bg-sky-500/8 border-l-sky-500/60',
    fieldLabelStudio: 'text-sky-700 dark:text-sky-300',
    fieldCardStudio:
      'border-sky-200/80 bg-sky-50/80 border-l-sky-500/70 dark:border-sky-500/20 dark:bg-sky-500/8 dark:border-l-sky-400/60',
    subsectionHeading: 'border-l-sky-500/70 bg-sky-500/10 text-sky-200',
    subsectionHeadingStudio:
      'border-l-sky-500 bg-sky-50 text-sky-900 dark:bg-sky-500/10 dark:text-sky-200',
  },
  characters: {
    borderL: 'border-l-amber-500/70',
    headerGradient: 'from-amber-500/25',
    headerBorder: 'border-amber-500/25',
    iconClass: 'text-amber-400',
    navIdle: 'border-amber-500/30 bg-amber-500/5 text-amber-200/90',
    navHover: 'hover:bg-amber-500/15 hover:border-amber-400/50 hover:text-amber-100',
    Icon: Users,
    fieldLabel: 'text-amber-300',
    fieldCard: 'border-amber-500/20 bg-amber-500/8 border-l-amber-500/60',
    fieldLabelStudio: 'text-amber-800 dark:text-amber-300',
    fieldCardStudio:
      'border-amber-200/80 bg-amber-50/80 border-l-amber-500/70 dark:border-amber-500/20 dark:bg-amber-500/8 dark:border-l-amber-400/60',
    subsectionHeading: 'border-l-amber-500/70 bg-amber-500/10 text-amber-200',
    subsectionHeadingStudio:
      'border-l-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200',
  },
  beats: {
    borderL: 'border-l-emerald-500/70',
    headerGradient: 'from-emerald-500/25',
    headerBorder: 'border-emerald-500/25',
    iconClass: 'text-emerald-400',
    navIdle: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200/90',
    navHover: 'hover:bg-emerald-500/15 hover:border-emerald-400/50 hover:text-emerald-100',
    Icon: ListOrdered,
    fieldLabel: 'text-emerald-300',
    fieldCard: 'border-emerald-500/20 bg-emerald-500/8 border-l-emerald-500/60',
    fieldLabelStudio: 'text-emerald-800 dark:text-emerald-300',
    fieldCardStudio:
      'border-emerald-200/80 bg-emerald-50/80 border-l-emerald-500/70 dark:border-emerald-500/20 dark:bg-emerald-500/8 dark:border-l-emerald-400/60',
    subsectionHeading: 'border-l-emerald-500/70 bg-emerald-500/10 text-emerald-200',
    subsectionHeadingStudio:
      'border-l-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200',
  },
  tone: {
    borderL: 'border-l-violet-500/70',
    headerGradient: 'from-violet-500/25',
    headerBorder: 'border-violet-500/25',
    iconClass: 'text-violet-400',
    navIdle: 'border-violet-500/30 bg-violet-500/5 text-violet-200/90',
    navHover: 'hover:bg-violet-500/15 hover:border-violet-400/50 hover:text-violet-100',
    Icon: Palette,
    fieldLabel: 'text-violet-300',
    fieldCard: 'border-violet-500/20 bg-violet-500/8 border-l-violet-500/60',
    fieldLabelStudio: 'text-violet-700 dark:text-violet-300',
    fieldCardStudio:
      'border-violet-200/80 bg-violet-50/80 border-l-violet-500/70 dark:border-violet-500/20 dark:bg-violet-500/8 dark:border-l-violet-400/60',
    subsectionHeading: 'border-l-violet-500/70 bg-violet-500/10 text-violet-200',
    subsectionHeadingStudio:
      'border-l-violet-500 bg-violet-50 text-violet-900 dark:bg-violet-500/10 dark:text-violet-200',
  },
}

export function getBlueprintSectionFieldTheme(
  sectionId: BlueprintFixSection,
  variant: BlueprintSurfaceVariant = 'review'
) {
  const theme = BLUEPRINT_REVIEW_SECTION_THEME[sectionId]
  return {
    labelClass: variant === 'studio' ? theme.fieldLabelStudio : theme.fieldLabel,
    cardClass: variant === 'studio' ? theme.fieldCardStudio : theme.fieldCard,
    subsectionHeadingClass:
      variant === 'studio' ? theme.subsectionHeadingStudio : theme.subsectionHeading,
    iconClass: theme.iconClass,
    Icon: theme.Icon,
  }
}
