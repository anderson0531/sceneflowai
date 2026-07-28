import {
  PenLine,
  Gauge,
  Library,
  Zap,
  Clapperboard,
  Languages,
  GitBranch,
  MonitorPlay,
  Youtube,
  KeyRound,
  Wallet,
  Layers,
  Map,
  Maximize2,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'

/** Icon map for Key Features cards — keys must match messages/en.json keyFeatures.categories[].features[].icon */
export const FEATURE_ICONS: Record<string, LucideIcon> = {
  byok: KeyRound,
  budget: Wallet,
  series: Layers,
  blueprint: Map,
  writersRoom: PenLine,
  ara: Gauge,
  referenceLibrary: Library,
  iad: Clapperboard,
  multilanguage: Languages,
  express: Zap,
  screeningRoom: MonitorPlay,
  upscale: Maximize2,
  versionControl: GitBranch,
  promoTrailer: Smartphone,
  youtubePublish: Youtube,
}

export const KEY_FEATURE_ICON_KEYS = Object.keys(FEATURE_ICONS)
