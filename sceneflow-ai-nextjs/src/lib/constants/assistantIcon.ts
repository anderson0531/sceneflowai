import { Compass, type LucideIcon } from 'lucide-react'

/**
 * The single mark for the Intelligent Assistant Director, in-app and on the
 * landing feature card.
 *
 * Wand2 and Sparkles already mark generation, retakes, optimize, and prompt
 * tools; Clapperboard marks Production Studio and the beats section. Compass was
 * used only by this feature's dialog, so it can carry the Assistant identity
 * without collision.
 *
 * Kept apart from ./assistant so string-only consumers, including API routes,
 * do not pull in an icon library.
 */
export const ASSISTANT_ICON: LucideIcon = Compass
