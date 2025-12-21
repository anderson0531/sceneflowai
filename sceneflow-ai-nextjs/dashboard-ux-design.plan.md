# Dashboard UI/UX Design Document

## Project: SceneFlow AI Dashboard Redesign v3.0
**Date:** December 21, 2025  
**Status:** Implemented  
**Version:** 3.0.0

---

## Overview

A comprehensive redesign of the SceneFlow AI dashboard focused on **project health visibility**, **budget/credit control**, **review scores**, and **contextual AI assistant tips**. The new layout prioritizes actionable insights, workflow progression, spending transparency, and Cue-powered recommendations.

---

## Design Goals

1. **Project & Budget Control** – Surface project-level budget tracking and aggregate spending analytics
2. **Review Score Visibility** – Display Director/Audience scores with color-coded status indicators
3. **Next Step Guidance** – Clear workflow progression with one-click CTAs
4. **AI Assistant Integration** – Contextual Cue tips for cost optimization and score improvement
5. **Mobile-First Responsive** – Optimized layouts for desktop and mobile viewports

---

## Information Architecture

```
Dashboard
├── Cue Command Bar (compact)
│   ├── Welcome message
│   ├── Ask Cue input
│   ├── Quick action chips
│   └── New Project CTA
│
├── Budget Health Widget
│   ├── Available Credits
│   ├── Used Credits (% of monthly)
│   ├── Projected Required
│   ├── Estimated Cost (USD)
│   ├── Progress bar with status
│   └── AI tip sidebar
│
├── Active Projects Container
│   ├── Header with filters/sort
│   └── ActiveProjectCard (repeated)
│       ├── Progress column (step/phase/%)
│       ├── Review Scores column (Director/Audience)
│       ├── Next Step column (CTA + credits)
│       ├── Cue tip (dismissible)
│       └── Footer (credits, activity, collaborators)
│
├── Analytics + Quick Actions Row
│   ├── Spending Analytics Widget
│   │   ├── Month comparison
│   │   ├── 7-day trend chart
│   │   └── Top consumers breakdown
│   │
│   └── Quick Actions Grid
│       ├── New Project
│       ├── Series Bibles
│       ├── Asset Library
│       ├── BYOK Config
│       ├── Buy Credits
│       └── Settings
│
└── BYOK Integration Status
```

---

## Component Specifications

### 1. CueCommandBar (`CueCommandBar.tsx`)

**Purpose:** Compact command interface replacing the large hero banner

**Features:**
- Personalized welcome message
- Text input with Send/Voice buttons
- Quick action chips: Save Credits, Improve Scores, Budget Tips, Continue Project
- New Project CTA button

**Layout:** Single horizontal bar with responsive breakpoints

---

### 2. BudgetHealthWidget (`BudgetHealthWidget.tsx`)

**Purpose:** At-a-glance budget/credit status with AI recommendations

**Metrics Displayed:**
| Metric | Description |
|--------|-------------|
| Available Credits | Total credits remaining |
| Used Credits | Credits consumed + percentage |
| Projected Required | Estimated credits for active projects |
| Est. Cost | USD equivalent |

**Status Indicators:**
- 🟢 Healthy: Total required ≤ 75% of monthly
- 🟡 Warning: Total required ≤ 100% of monthly  
- 🔴 Over: Total required > monthly budget

**AI Tip Sidebar:** Dismissible panel showing count of projects near limit

---

### 3. ActiveProjectCard (`ActiveProjectCard.tsx`)

**Purpose:** Rich project card with scores and next steps

**3-Column Layout:**

| Column | Content |
|--------|---------|
| Progress | Step X/Y, Phase name, progress bar, percentage |
| Review Scores | Director score (0-100), Audience score (0-100), color-coded bars |
| Next Step | Step name, description, credit estimate, action CTA |

**Score Color Coding:**
```typescript
score >= 85 → 🟢 Green (excellent)
score >= 75 → 🟡 Yellow (good)
score < 75  → 🔴 Red (needs improvement)
```

**Cue Tip Types:**
- `tip` (💡): Optimization suggestions
- `alert` (⚠️): Issues requiring attention

---

### 4. SpendingAnalyticsWidget (`SpendingAnalyticsWidget.tsx`)

**Purpose:** Credit consumption trends and breakdown

**Features:**
- Month-over-month comparison with % change
- 7-day trend bar chart
- Top consumers list (Video Gen, Storyboards, Voice, Ideation)
- Link to full analytics page

---

### 5. QuickActionsGrid (`QuickActionsGrid.tsx`)

**Purpose:** One-click navigation to common actions

**Actions:**
- New Project
- Series Bibles
- Asset Library
- BYOK Config
- Buy Credits
- Settings

---

## Wireframe: Desktop (1440px)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────────────────────┐│
│ │ 🎬 SceneFlow AI    [Projects] [Workflow] [Settings]    🔔  👤 Brian  ⚙️    ││
│ └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                │
│ ┌──────────────────────────────────────────────────────────────────────────────┤
│ │ 💡 CUE COMMAND BAR                                          [+ New Project] │
│ │ ┌────────────────────────────────────────────────────────────────────────┐  │
│ │ │ 💬 "How can I help today?"                          [Send] [🎤 Voice] │  │
│ │ └────────────────────────────────────────────────────────────────────────┘  │
│ │ Quick: [Save Credits] [Improve Scores] [Budget Tips] [Continue Project]     │
│ └──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│ ┌─────────────────────── BUDGET HEALTH ────────────────────────┐  ┌───────────┐│
│ │ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────┐ │  │ 💡 AI TIP ││
│ │ │ 5,400       │  │ 2,100       │  │ 3,200       │  │ $32   │ │  │ "You have ││
│ │ │ Available   │  │ Used (28%)  │  │ Projected   │  │ Est.  │ │  │ 3 projects││
│ │ │ Credits     │  │ This Month  │  │ Remaining   │  │ Cost  │ │  │ nearing   ││
│ │ └─────────────┘  └─────────────┘  └─────────────┘  └───────┘ │  │ budget.   ││
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░ │  │ [Details] ││
│ │                             28% of monthly budget            │  └───────────┘│
│ │ [Buy Top-Up]  [Manage Plan]  [View Spending History]         │               │
│ └──────────────────────────────────────────────────────────────┘               │
│                                                                                │
│ ┌──────────────────────────── ACTIVE PROJECTS ─────────────────────────────────┤
│ │                                             [Filter ▼] [Sort by Score ▼]    │
│ │                                                                              │
│ │ ┌────────────────────────────────────────────────────────────────────────┐  │
│ │ │ 🎬 Sci-Fi Pilot: The Arrival                              Budget: 🟢   │  │
│ │ │ ───────────────────────────────────────────────────────────────────────│  │
│ │ │  PROGRESS          REVIEW SCORES              NEXT STEP                │  │
│ │ │ ┌──────────┐    ┌─────────────────────┐    ┌─────────────────────────┐ │  │
│ │ │ │ Step 2/4 │    │ 🎬 Director   85 🟢 │    │ ▶ Director's Chair      │ │  │
│ │ │ │ Vision   │    │ ████████████░░░░    │    │   Define camera angles  │ │  │
│ │ │ │ Board    │    │                     │    │   Est: 35 credits       │ │  │
│ │ │ │ ━━━━━░░░ │    │ 👥 Audience   78 🟡 │    │   [Start Step →]        │ │  │
│ │ │ │   50%    │    │ ██████████░░░░░░    │    │                         │ │  │
│ │ │ └──────────┘    └─────────────────────┘    └─────────────────────────┘ │  │
│ │ │ 💡 CUE: Audience score is 78—add emotional beat in Scene 3...         │  │
│ │ │ Est. Credits: 1,500  │  Last Active: 1 hour ago  │  [Open Project]     │  │
│ │ └────────────────────────────────────────────────────────────────────────┘  │
│ │ (Additional project cards...)                                                │
│ └──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│ ┌─────────────────────────┐  ┌─────────────────────────────────────────────────┤
│ │ 📊 SPENDING ANALYTICS   │  │ ⚡ QUICK ACTIONS                                │
│ │ This Month: 2,100 cr    │  │ [+ New Project] [📚 Series Bibles]             │
│ │ Last Month: 1,800 cr    │  │ [☁️ Asset Library] [🔑 BYOK Config]            │
│ │ [7-day chart]           │  │ [💳 Buy Credits] [⚙️ Settings]                 │
│ │ [Full Analytics →]      │  │                                                 │
│ └─────────────────────────┘  └─────────────────────────────────────────────────┤
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Wireframe: Mobile (375px)

```
┌─────────────────────────────┐
│ 🎬 SceneFlow      🔔 👤 ≡  │
├─────────────────────────────┤
│ 💬 Ask Cue...     [🎤][→]  │
│ [Save Credits] [Improve ↑]  │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ BUDGET HEALTH           │ │
│ │ ━━━━━━━━━━━━━░░░░░ 28%  │ │
│ │ 5,400 avail │ 3,200 req │ │
│ │ 💡 3 projects near limit │ │
│ │ [Top-Up] [Details]       │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ ACTIVE PROJECTS        [+]  │
│ ┌─────────────────────────┐ │
│ │ 🎬 Sci-Fi Pilot     🟢  │ │
│ │ Vision Board • 50%      │ │
│ │ 🎬 Dir: 85  👥 Aud: 78  │ │
│ │ ▶ NEXT: Director's Chair│ │
│ │   [Start Step →]        │ │
│ │ 💡 Boost audience score │ │
│ │        [Tips][✕]        │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ 📊 Spending: 2,100 this mo │
│ [View Full Analytics →]    │
└─────────────────────────────┘
```

---

## File Structure

```
src/app/dashboard/
├── ClientDashboard.tsx          # Main layout (updated)
├── components/
│   ├── ActiveProjectCard.tsx    # NEW - Project card with scores
│   ├── ActiveProjectsContainer.tsx # NEW - Projects list
│   ├── BudgetHealthWidget.tsx   # NEW - Credit/budget status
│   ├── CueCommandBar.tsx        # NEW - Compact command bar
│   ├── QuickActionsGrid.tsx     # NEW - Action shortcuts
│   ├── SpendingAnalyticsWidget.tsx # NEW - Spending trends
│   ├── BYOKIntegrationStatus.tsx # Existing (retained)
│   ├── CueCommandCenter.tsx     # Existing (legacy hero)
│   ├── PlanAndCreditsWidget.tsx # Existing (replaced by BudgetHealth)
│   ├── ProductionProjectsTable.tsx # Existing (replaced)
│   └── ResourcesOverviewWidget.tsx # Existing (moved to Quick Actions)
```

---

## Technical Specifications

### Data Interfaces

```typescript
interface ReviewScores {
  director: number       // 0-100
  audience: number       // 0-100
  avgScene?: number      // 0-100 (average across scenes)
}

interface NextStep {
  name: string           // Step display name
  description: string    // What the step involves
  estimatedCredits: number
  actionLabel: string    // CTA button text
  actionUrl: string      // Navigation target
  isComplete?: boolean   // Show "Ready to Export" state
}

interface CueTip {
  message: string
  primaryAction?: {
    label: string
    url?: string
    onClick?: () => void
  }
  type: 'tip' | 'alert'
}

interface ActiveProjectCardProps {
  id: string | number
  title: string
  currentStep: number
  totalSteps: number
  phaseName: string
  progressPercent: number
  scores: ReviewScores
  nextStep: NextStep
  cueTip?: CueTip
  estimatedCredits: number
  lastActive: string
  budgetStatus: 'on-track' | 'near-limit' | 'over-budget'
}
```

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| CueCommandBar | ✅ Complete | Compact layout with quick actions |
| BudgetHealthWidget | ✅ Complete | 4-metric grid + AI tip sidebar |
| ActiveProjectCard | ✅ Complete | 3-column layout with scores |
| ActiveProjectsContainer | ✅ Complete | Filter/sort header + card list |
| SpendingAnalyticsWidget | ✅ Complete | Trend chart + consumers |
| QuickActionsGrid | ✅ Complete | 6-action grid |
| ClientDashboard | ✅ Complete | New layout order |

---

## Future Enhancements

1. **Real-time Data** – Replace mock data with store/API integration
2. **Score Trend Graphs** – Show score history over time
3. **AI Fix Integration** – One-click apply Cue recommendations
4. **Filter Persistence** – Remember user's sort/filter preferences
5. **Mobile Swipe Cards** – Swipeable project cards on mobile

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.0.0 | Dec 21, 2025 | Complete dashboard redesign with scores & next steps |
| 2.x | Dec 2025 | Landing page refresh (v2.30-v2.34) |
| 1.x | Nov 2025 | Initial dashboard implementation |
