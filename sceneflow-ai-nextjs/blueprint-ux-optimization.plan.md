# Blueprint Page UI/UX Optimization Plan

| Property | Value |
|----------|-------|
| **Project** | Blueprint Page Redesign |
| **Version** | 1.0.0 |
| **Date** | December 25, 2025 |
| **Status** | 🚧 In Progress |
| **Standard** | Vision Page (Production Workflow) |
| **Target Score** | 70 → 92/100 |

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Assessment](#current-state-assessment)
3. [Phase 1: Critical Fixes](#phase-1-critical-fixes)
4. [Phase 2: High Priority](#phase-2-high-priority)
5. [Phase 3: Medium Priority](#phase-3-medium-priority)
6. [Implementation Schedule](#implementation-schedule)
7. [Testing Checklist](#testing-checklist)

---

## Executive Summary

The Blueprint page requires UI/UX alignment with the Vision page to ensure consistent user experience across SceneFlow AI. This plan details 10 recommendations across 3 phases, with an estimated implementation time of 9-13 hours.

**Score Improvement:**
| Metric | Before | After | Δ |
|--------|--------|-------|---|
| Director (Technical) | 72 | 90 | +18 |
| Audience (UX) | 68 | 94 | +26 |
| **Combined** | **70** | **92** | **+22** |

---

## Current State Assessment

### Files to Modify

| File | Purpose | Changes Required |
|------|---------|------------------|
| `src/app/dashboard/workflow/ideation/page.tsx` | Blueprint main page | Add phase nav, integrate modal |
| `src/app/dashboard/workflow/ideation/IdeationWorkspace.tsx` | Main workspace | Layout restructure |
| `src/components/ideation/ConceptCard.tsx` | Concept display | Replace with BlueprintCard |
| `src/components/ideation/CharacterCard.tsx` | Character display | Replace with BlueprintCard |

### New Files to Create

| File | Purpose | Status |
|------|---------|--------|
| `src/components/blueprint/PhaseNavigator.tsx` | Workflow phase tabs | 🚧 In Progress |
| `src/components/blueprint/BlueprintEditorModal.tsx` | Full-screen editor | 🚧 In Progress |
| `src/components/blueprint/ScoreIndicator.tsx` | Quality scores | 🚧 In Progress |
| `src/components/blueprint/BlueprintCard.tsx` | Unified card component | ⏳ Phase 2 |
| `src/components/blueprint/CollapsiblePanel.tsx` | Sidebar panels | ⏳ Phase 2 |
| `src/components/blueprint/EmptyState.tsx` | Empty state component | ⏳ Phase 3 |
| `src/components/blueprint/skeletons.tsx` | Loading states | ⏳ Phase 2 |
| `src/hooks/useKeyboardShortcuts.ts` | Keyboard navigation | 🚧 In Progress |

---

## Phase 1: Critical Fixes

**Estimated Time:** 4-6 hours  
**Impact:** +15 points  
**Status:** 🚧 In Progress

### C1: Phase Navigation Header

**Priority:** 🔴 Critical  
**File:** `src/components/blueprint/PhaseNavigator.tsx`  
**Status:** 🚧 In Progress

Adds tabbed workflow phases matching Vision's navigation pattern:
- Concept → Outline → Characters → World Building → Export
- Visual indicators for completed/active phases
- Responsive horizontal scroll on mobile

### C2: Modal-Based Editing

**Priority:** 🔴 Critical  
**File:** `src/components/blueprint/BlueprintEditorModal.tsx`  
**Status:** 🚧 In Progress

Full-screen modal editor with:
- Tabbed content panels (Content, AI Enhance, Notes)
- Keyboard shortcuts (⌘S save, Esc close)
- Unsaved changes detection
- Character/Concept/World type support

### C3: Review Score Integration

**Priority:** 🔴 Critical  
**File:** `src/components/blueprint/ScoreIndicator.tsx`  
**Status:** 🚧 In Progress

Color-coded quality scores:
- Originality, Clarity, Marketability metrics
- 🟢 ≥85 (Excellent), 🟡 ≥75 (Good), 🔴 <75 (Needs work)
- Progress bar visualization

---

## Phase 2: High Priority

**Estimated Time:** 3-4 hours  
**Impact:** +12 points  
**Status:** ⏳ Pending

### H1: Standardized Card Component
- File: `src/components/blueprint/BlueprintCard.tsx`
- Unified card with thumbnail, status, scores, hover actions

### H2: Collapsible Sidebar Panels
- File: `src/components/blueprint/CollapsiblePanel.tsx`
- Animated expand/collapse with add button

### H3: Keyboard Shortcuts
- File: `src/hooks/useKeyboardShortcuts.ts`
- ⌘S save, ⌘N new, Esc close, ⌘Z undo

### H4: Loading Skeletons
- File: `src/components/blueprint/skeletons.tsx`
- Card, panel, and workspace skeleton components

---

## Phase 3: Medium Priority

**Estimated Time:** 2-3 hours  
**Impact:** +6 points  
**Status:** ⏳ Pending

### M1: Empty State Component
- Illustrated empty states with CTAs

### M2: Toast Notifications
- Use Sonner for save/error feedback

### M3: Drag-and-Drop Reordering
- @dnd-kit for concept/character reordering

---

## Implementation Schedule

| Day | Phase | Tasks | Hours | Status |
|-----|-------|-------|-------|--------|
| 1 | Phase 1 | PhaseNavigator, EditorModal | 3-4 | 🚧 |
| 1 | Phase 1 | ScoreIndicator, Integration | 2 | ⏳ |
| 2 | Phase 2 | BlueprintCard, CollapsiblePanel | 2 | ⏳ |
| 2 | Phase 2 | Keyboard shortcuts, Skeletons | 2 | ⏳ |
| 3 | Phase 3 | EmptyState, Toast, Drag-drop | 2-3 | ⏳ |
| 3 | Testing | Integration testing, bug fixes | 1-2 | ⏳ |

---

## Testing Checklist

### Functional Tests
- [ ] Phase navigation switches content correctly
- [ ] Modal opens on card click
- [ ] Modal saves changes via `Cmd+S`
- [ ] Modal closes via `Escape`
- [ ] Scores display with correct colors
- [ ] Cards show hover state with menu
- [ ] Delete confirmation works
- [ ] Collapsible panels animate smoothly
- [ ] Skeletons display during loading
- [ ] Empty states show when no items
- [ ] Toast notifications appear on save/error
- [ ] Drag-and-drop reorders items

### Responsive Tests
- [ ] Mobile: Phase nav scrolls horizontally
- [ ] Mobile: Modal is full-screen
- [ ] Mobile: Cards stack in single column
- [ ] Tablet: 2-column card grid
- [ ] Desktop: 3-column card grid

### Accessibility Tests
- [ ] Keyboard navigation works throughout
- [ ] Focus states are visible
- [ ] Screen reader announces modal state
- [ ] Color contrast meets WCAG AA

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Director Score | ≥ 90/100 |
| Audience Score | ≥ 90/100 |
| Combined Score | ≥ 90/100 |
| Load Time | < 2 seconds |
| Lighthouse Performance | > 90 |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Dec 25, 2025 | Initial plan created |
