# Blueprint Component Integration Guide

This document provides step-by-step instructions for integrating the new Blueprint UI components into the Ideation/Spark Studio page.

## New Components Created

| Component | Path | Purpose |
|-----------|------|---------|
| `PhaseNavigator` | `src/components/blueprint/PhaseNavigator.tsx` | Workflow phase tabs (Concept → Outline → Characters → World → Export) |
| `BlueprintEditorModal` | `src/components/blueprint/BlueprintEditorModal.tsx` | Full-screen editing modal with tabs |
| `ScoreIndicator` | `src/components/blueprint/ScoreIndicator.tsx` | Color-coded quality scores |
| `useKeyboardShortcuts` | `src/hooks/useKeyboardShortcuts.ts` | Keyboard shortcut hook |

## Integration Steps

### Step 1: Import Components

Add to the top of `src/app/dashboard/workflow/ideation/page.tsx`:

\`\`\`tsx
import { PhaseNavigator, type Phase as NavigatorPhase } from '@/components/blueprint/PhaseNavigator'
import { ScoreIndicator, ScoreCard as ScoreIndicatorCard, ScoreIndicatorInline } from '@/components/blueprint/ScoreIndicator'
import BlueprintEditorModal from '@/components/blueprint/BlueprintEditorModal'
import { useBlueprintShortcuts } from '@/hooks/useKeyboardShortcuts'
\`\`\`

### Step 2: Replace Phase Tabs

The current page uses a simple \`phase\` state with 'spark' | 'workshop' | 'blueprint'. Replace the section header with the new PhaseNavigator.

**Replace this in the header section:**
\`\`\`tsx
<div className="flex items-center gap-3">
  <div className="text-xs text-sf-text-secondary">Mode:</div>
  {/* ... mode buttons ... */}
</div>
\`\`\`

**With this:**
\`\`\`tsx
<PhaseNavigator
  phases={[
    { id: 'spark', label: 'The Spark', icon: Lightbulb },
    { id: 'workshop', label: 'Workshop', icon: Wrench },
    { id: 'blueprint', label: 'Blueprint', icon: FileText },
  ]}
  currentPhase={phase}
  onPhaseChange={(newPhase) => setPhase(newPhase as Phase)}
  completedPhases={phase === 'blueprint' ? ['spark', 'workshop'] : phase === 'workshop' ? ['spark'] : []}
/>
\`\`\`

### Step 3: Add Keyboard Shortcuts

Add after state declarations:

\`\`\`tsx
// Keyboard shortcuts
useBlueprintShortcuts({
  onSave: handleSave,
  onClose: () => setPhase('spark'),
  enabled: true
})
\`\`\`

### Step 4: Replace Score Display

The current \`ScoreCard\` component can be enhanced with the new \`ScoreIndicator\` variants.

**In the workshop phase, add inline score indicators:**
\`\`\`tsx
<ScoreIndicator
  label="Audience Score"
  score={scoreCard?.audience || 0}
  showBar
  size="md"
/>
<ScoreIndicator
  label="Director Score"
  score={scoreCard?.director || 0}
  showBar
  size="md"
/>
\`\`\`

### Step 5: Add Editor Modal (Optional)

For expanding attribute editing to full-screen:

\`\`\`tsx
const [editorOpen, setEditorOpen] = useState(false)
const [editorType, setEditorType] = useState<'concept' | 'character' | 'world'>('concept')

// In JSX:
<BlueprintEditorModal
  isOpen={editorOpen}
  onClose={() => setEditorOpen(false)}
  type={editorType}
  title={attributes?.workingTitle?.value || 'Edit Concept'}
  initialTab={0}
  onSave={(data) => {
    // Apply edits to attributes
    setEditorOpen(false)
  }}
/>
\`\`\`

## Component API Reference

### PhaseNavigator Props

\`\`\`tsx
interface PhaseNavigatorProps {
  phases?: Phase[]           // Override default phases
  currentPhase: string       // Current active phase ID
  onPhaseChange: (phase: string) => void
  completedPhases?: string[] // IDs of completed phases
  className?: string
}
\`\`\`

### ScoreIndicator Props

\`\`\`tsx
interface ScoreIndicatorProps {
  label: string
  score: number
  previousScore?: number     // For showing trend
  showBar?: boolean          // Show progress bar
  showTrend?: boolean        // Show trend arrow
  size?: 'sm' | 'md' | 'lg'
  className?: string
}
\`\`\`

### BlueprintEditorModal Props

\`\`\`tsx
interface BlueprintEditorModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'concept' | 'character' | 'world'
  title: string
  initialTab?: number
  onSave?: (data: any) => void
}
\`\`\`

### useKeyboardShortcuts

\`\`\`tsx
useBlueprintShortcuts({
  onSave?: () => void       // ⌘+S
  onClose?: () => void      // Escape
  onNew?: () => void        // ⌘+N
  onDelete?: () => void     // ⌘+Backspace
  onDuplicate?: () => void  // ⌘+Shift+D
  onUndo?: () => void       // ⌘+Z
  onRedo?: () => void       // ⌘+Shift+Z
  enabled?: boolean
})
\`\`\`

## Score Color Thresholds

| Score Range | Color | Label |
|-------------|-------|-------|
| ≥ 90 | Green | Excellent |
| 85-89 | Green | Great |
| 75-84 | Yellow/Amber | Good |
| 65-74 | Red | Fair |
| < 65 | Red | Needs Work |

## Next Steps (Phase 2)

After Phase 1 integration, proceed to:
- Create `BlueprintCard.tsx` for card layouts
- Add `CollapsiblePanel.tsx` for expandable sections
- Create loading skeleton components
- Add toast notifications for save/error feedback
