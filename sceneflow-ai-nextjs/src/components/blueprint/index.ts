// Blueprint Components Index
// Export all Blueprint-related components for easy importing

// Core Components - Phase 1
export { PhaseNavigator, type Phase } from './PhaseNavigator'
export { default as BlueprintEditorModal, type EditorType, type BlueprintEditorModalProps } from './BlueprintEditorModal'
export { 
  ScoreIndicator, 
  ScoreIndicatorInline, 
  ScoreCard,
  type ScoreIndicatorProps 
} from './ScoreIndicator'

// Core Components - Phase 2
export { 
  BlueprintCard, 
  ActionCard, 
  StatCard, 
  CardMenuButton,
  type BlueprintCardProps,
  type ActionCardProps,
  type StatCardProps
} from './BlueprintCard'
export { 
  CollapsiblePanel, 
  Accordion, 
  CollapsibleSection,
  useCollapsible,
  type CollapsiblePanelProps,
  type AccordionProps
} from './CollapsiblePanel'
export {
  Skeleton,
  CardSkeleton,
  PhaseNavigatorSkeleton,
  ScoreIndicatorSkeleton,
  WorkshopCardSkeleton,
  ScoreCardSkeleton,
  ConceptCardSkeleton,
  IdeaCardSkeleton,
  PageLoadingSkeleton
} from './BlueprintSkeletons'

// Legacy/Existing Components
export { BlueprintComposer } from './BlueprintComposer'
export { BlueprintTopbar } from './BlueprintTopbar'
export { InspirationDrawer } from './InspirationDrawer'
export { TreatmentCard } from './TreatmentCard'
export { ActionBar } from './ActionBar'
