# Dashboard UI/UX Design Document

| Property | Value |
|----------|-------|
| **Project** | SceneFlow AI Dashboard Redesign |
| **Version** | 3.0.0 |
| **Date** | December 21, 2025 |
| **Status** | ✅ Implemented |
| **URL** | https://sceneflowai.studio |

---

## Table of Contents

1. [Overview](#overview)
2. [Design Goals](#design-goals)
3. [Information Architecture](#information-architecture)
4. [Component Specifications](#component-specifications)
5. [Technical Specifications](#technical-specifications)
6. [Implementation Status](#implementation-status)
7. [Architecture Diagrams](#architecture-diagrams)
8. [Paddle Payment Integration](#paddle-payment-integration)
9. [Version History](#version-history)

---

## Overview

A comprehensive redesign of the SceneFlow AI dashboard focused on **project health visibility**, **budget/credit control**, **review scores**, and **contextual AI assistant tips**. The new layout prioritizes actionable insights, workflow progression, spending transparency, and Cue-powered recommendations.

---

## Design Goals

| # | Goal | Description |
|---|------|-------------|
| 1 | **Project & Budget Control** | Surface project-level budget tracking and aggregate spending analytics |
| 2 | **Review Score Visibility** | Display Director/Audience scores with color-coded status indicators |
| 3 | **Next Step Guidance** | Clear workflow progression with one-click CTAs |
| 4 | **AI Assistant Integration** | Contextual Cue tips for cost optimization and score improvement |
| 5 | **Mobile-First Responsive** | Optimized layouts for desktop and mobile viewports |

---

## Information Architecture

```
Dashboard
├── Cue Command Bar (compact)
│   ├── Welcome message
│   ├── Ask Cue input
│   ├── Quick action chips
│   └── New Project CTA
├── Budget Health Widget
│   ├── Available Credits
│   ├── Used Credits (% of monthly)
│   ├── Projected Required
│   ├── Estimated Cost (USD)
│   ├── Progress bar with status
│   └── AI tip sidebar
├── Active Projects Container
│   ├── Header with filters/sort
│   └── ActiveProjectCard (repeated)
│       ├── Progress column (step/phase/%)
│       ├── Review Scores column (Director/Audience)
│       ├── Next Step column (CTA + credits)
│       ├── Cue tip (dismissible)
│       └── Footer (credits, activity, collaborators)
├── Analytics + Quick Actions Row
│   ├── Spending Analytics Widget
│   └── Quick Actions Grid
└── BYOK Integration Status
```

---

## Component Specifications

### 1. CueCommandBar

**File:** `src/app/dashboard/components/CueCommandBar.tsx`

| Feature | Description |
|---------|-------------|
| Welcome message | Personalized greeting |
| Text input | Send/Voice buttons |
| Quick action chips | Save Credits, Improve Scores, Budget Tips, Continue Project |
| New Project CTA | Primary action button |

### 2. BudgetHealthWidget

**File:** `src/app/dashboard/components/BudgetHealthWidget.tsx`

**Metrics:**
| Metric | Description |
|--------|-------------|
| Available Credits | Total credits remaining |
| Used Credits | Credits consumed + percentage |
| Projected Required | Estimated credits for active projects |
| Est. Cost | USD equivalent |

**Status Indicators:**
- 🟢 **Healthy:** Total required ≤ 75% of monthly
- 🟡 **Warning:** Total required ≤ 100% of monthly  
- 🔴 **Over:** Total required > monthly budget

### 3. ActiveProjectCard

**File:** `src/app/dashboard/components/ActiveProjectCard.tsx`

**3-Column Layout:**
| Column | Content |
|--------|---------|
| Progress | Step X/Y, Phase name, progress bar, percentage |
| Review Scores | Director score (0-100), Audience score (0-100), color-coded bars |
| Next Step | Step name, description, credit estimate, action CTA |

**Score Color Coding:**
| Range | Color | Status |
|-------|-------|--------|
| ≥ 85 | 🟢 Green | Excellent |
| ≥ 75 | 🟡 Yellow | Good |
| < 75 | 🔴 Red | Needs improvement |

### 4. SpendingAnalyticsWidget

**File:** `src/app/dashboard/components/SpendingAnalyticsWidget.tsx`

- Month-over-month comparison with % change
- 7-day trend bar chart
- Top consumers list (Video Gen, Storyboards, Voice, Ideation)
- Link to full analytics page

### 5. QuickActionsGrid

**File:** `src/app/dashboard/components/QuickActionsGrid.tsx`

| Action | Icon |
|--------|------|
| New Project | ➕ |
| Series Bibles | 📚 |
| Asset Library | ☁️ |
| BYOK Config | 🔑 |
| Buy Credits | 💳 |
| Settings | ⚙️ |

---

## Technical Specifications

### Data Interfaces

```typescript
interface ReviewScores {
  director: number       // 0-100
  audience: number       // 0-100
  avgScene?: number      // 0-100
}

interface NextStep {
  name: string
  description: string
  estimatedCredits: number
  actionLabel: string
  actionUrl: string
  isComplete?: boolean
}

interface CueTip {
  message: string
  primaryAction?: { label: string; url?: string; onClick?: () => void }
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

### File Structure

```
src/app/dashboard/
├── ClientDashboard.tsx
├── components/
│   ├── ActiveProjectCard.tsx
│   ├── ActiveProjectsContainer.tsx
│   ├── BudgetHealthWidget.tsx
│   ├── CueCommandBar.tsx
│   ├── QuickActionsGrid.tsx
│   ├── SpendingAnalyticsWidget.tsx
│   └── BYOKIntegrationStatus.tsx
```

---

## Implementation Status

| Component | Status | Notes |
|-----------|:------:|-------|
| CueCommandBar | ✅ | Compact layout with quick actions |
| BudgetHealthWidget | ✅ | 4-metric grid + AI tip sidebar |
| ActiveProjectCard | ✅ | 3-column layout with scores |
| ActiveProjectsContainer | ✅ | Filter/sort header + card list |
| SpendingAnalyticsWidget | ✅ | Trend chart + consumers |
| QuickActionsGrid | ✅ | 6-action grid |
| ClientDashboard | ✅ | New layout order |

### Future Enhancements

1. **Real-time Data** – Replace mock data with store/API integration
2. **Score Trend Graphs** – Show score history over time
3. **AI Fix Integration** – One-click apply Cue recommendations
4. **Filter Persistence** – Remember user's sort/filter preferences
5. **Mobile Swipe Cards** – Swipeable project cards on mobile

---

## Architecture Diagrams

<details>
<summary><strong>📊 System Overview</strong></summary>

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCENEFLOW AI PLATFORM                        │
│                  https://sceneflowai.studio                     │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    ┌───────────┐       ┌───────────┐       ┌───────────┐
    │  Landing  │       │ Dashboard │       │Production │
    │   Page    │       │    App    │       │  Studio   │
    │ (Public)  │       │(Protected)│       │(Protected)│
    └───────────┘       └───────────┘       └───────────┘
```

</details>

<details>
<summary><strong>🏗️ Application Layers</strong></summary>

| Layer | Components |
|-------|------------|
| **Presentation** | Landing Page, Dashboard Views, Production Studio, Screening Room |
| **Components** | CueCommandBar, BudgetHealthWidget, ActiveProjectCard, SceneManager, CharacterPanel |
| **State** | Zustand Stores, React Query Cache, Local Storage Persistence |

</details>

<details>
<summary><strong>🔌 Backend Services</strong></summary>

| Category | Service | Purpose |
|----------|---------|---------|
| **AI** | Google Vertex AI | Gemini 2.5 Pro, Imagen 3, Veo 3.1 |
| **AI** | ElevenLabs | Voice Synthesis, Voice Cloning |
| **AI** | Shotstack | Video Rendering, HD/4K Export |
| **Data** | Supabase | PostgreSQL database |
| **Auth** | Clerk | Authentication, SSO/OAuth, MFA |
| **Payments** | Paddle | Subscriptions, Credit purchases, Tax handling |
| **Media** | Vercel Blob | Demo videos, Generated media, Thumbnails |

</details>

<details>
<summary><strong>📈 Production Workflow Data Flow</strong></summary>

| Stage | Input | Processing | Output | Credits |
|-------|-------|------------|--------|---------|
| 1 | Concept Prompt | Gemini 2.5 | Screenplay + Scenes | 50-200 |
| 2 | Character Prompts | Imagen 3 | Character Portraits | 10-50/image |
| 3 | Scene Breakdown | Storyboard Gen | Visual Storyboards | 20-100/scene |
| 4 | Dialogue Lines | ElevenLabs | Audio Tracks | 5-30/line |
| 5 | Storyboards + Audio | Veo 3.1 | Scene Videos | 100-500/scene |
| 6 | Review Settings | Gemini Analysis | Director/Audience Scores | 10-30 |
| 7 | Export Settings | Shotstack | Final HD/4K Film | 200-1000 |

</details>

<details>
<summary><strong>🔒 Security Layers</strong></summary>

| Layer | Components |
|-------|------------|
| **Edge** | Cloudflare DDoS, SSL/TLS, Rate Limiting, Bot Detection |
| **Application** | Clerk Auth (JWT), Protected API Routes, CORS, CSP Headers |
| **Data** | Supabase RLS, Encrypted env vars, BYOK, PCI DSS via Paddle |
| **API Keys** | Server: CLERK_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_VERTEX_API_KEY, ELEVENLABS_API_KEY, PADDLE_API_KEY |
| **User BYOK** | google_api_key, elevenlabs_key, openai_key (encrypted in Supabase) |

</details>

<details>
<summary><strong>⚡ Performance Strategy</strong></summary>

**Caching:**
| Type | Target | Strategy |
|------|--------|----------|
| Browser | Static assets | max-age=31536000, immutable |
| Browser | Images | max-age=86400, stale-while-revalidate |
| Edge | Landing page | ISR, revalidate=3600 |
| App | Project list | staleTime=60000 |
| App | Credit balance | staleTime=30000 |

**Bundle Optimization:**
- Dynamic imports for modals
- Route-based code splitting
- Lucide icons individual imports
- Framer Motion tree shaking

</details>

---

## Paddle Payment Integration

### Products & Pricing

| Product | Type | Price | Credits | Notes |
|---------|------|-------|---------|-------|
| Coffee Break | One-time | $5 | 1,000 | Never expire |
| Starter | Monthly | $29 | 3,000/mo | Rollover 30d |
| Starter | Annual | $288 | 3,000/mo | 2 months free |
| Pro | Monthly | $99 | 12,000/mo | Rollover 30d |
| Pro | Annual | $984 | 12,000/mo | 2 months free |
| Studio | Monthly | $299 | 40,000/mo | Rollover 30d |
| Studio | Annual | $2,988 | 40,000/mo | 2 months free |

### Credit Packs (Add-ons)

| Pack | Price | Credits | Bonus |
|------|-------|---------|-------|
| Basic | $20 | 2,000 | — |
| Value | $50 | 5,250 | 5% |
| Pro | $100 | 11,000 | 10% |

### Webhook Events

**Endpoint:** `/api/webhooks/paddle`

| Event | Action |
|-------|--------|
| `transaction.completed` | Grant one-time credits |
| `subscription.created` | Initialize subscription, grant initial credits |
| `subscription.updated` | Handle upgrades/downgrades |
| `subscription.canceled` | Mark cancelled, set end date |
| `subscription.activated` | Renew monthly credits |
| `transaction.payment_failed` | Send notification, mark at-risk |

### Checkout Flow

1. User clicks "Subscribe" or "Buy Credits"
2. Frontend initializes Paddle.js with client token
3. Open Paddle Checkout overlay (inline)
4. On success, webhook fires → credits provisioned
5. User shown success state in-app

### Merchant of Record Benefits

Paddle handles:
- ✅ Global tax calculation & remittance (VAT, GST, Sales Tax)
- ✅ Invoice generation with proper tax IDs
- ✅ Payment disputes & chargebacks
- ✅ EU/UK/global compliance
- ✅ 30+ payment methods
- ✅ Paddle Retain for churn prevention

**Pricing:** 5% + $0.50 per transaction

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.0.0 | Dec 21, 2025 | Complete dashboard redesign with scores & next steps |
| 2.x | Dec 2025 | Landing page refresh (v2.30-v2.34) |
| 1.x | Nov 2025 | Initial dashboard implementation |

---

<details>
<summary><strong>📐 Wireframes (Desktop 1440px)</strong></summary>

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 🎬 SceneFlow AI    [Projects] [Workflow] [Settings]    🔔  👤 Brian  ⚙️   │
├────────────────────────────────────────────────────────────────────────────┤
│ 💡 CUE COMMAND BAR                                      [+ New Project]   │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ 💬 "How can I help today?"                        [Send] [🎤 Voice] │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│ Quick: [Save Credits] [Improve Scores] [Budget Tips] [Continue Project]  │
├────────────────────────────────────────────────────────────────────────────┤
│ BUDGET HEALTH                                                    💡 AI TIP│
│ ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────┐          "You have │
│ │ 5,400     │  │ 2,100     │  │ 3,200     │  │ $32   │          3 projects│
│ │ Available │  │ Used (28%)│  │ Projected │  │ Est.  │          nearing   │
│ └───────────┘  └───────────┘  └───────────┘  └───────┘          budget."  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░ 28%        [Details] │
│ [Buy Top-Up]  [Manage Plan]  [View Spending History]                       │
├────────────────────────────────────────────────────────────────────────────┤
│ ACTIVE PROJECTS                               [Filter ▼] [Sort by Score ▼]│
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ 🎬 Sci-Fi Pilot: The Arrival                            Budget: 🟢  │  │
│ │ ──────────────────────────────────────────────────────────────────── │  │
│ │  PROGRESS        REVIEW SCORES            NEXT STEP                  │  │
│ │ ┌──────────┐   ┌─────────────────┐   ┌───────────────────────────┐  │  │
│ │ │ Step 2/4 │   │ 🎬 Director  85 │   │ ▶ Director's Chair        │  │  │
│ │ │ Vision   │   │ ████████████░░░ │   │   Define camera angles    │  │  │
│ │ │ Board    │   │                 │   │   Est: 35 credits         │  │  │
│ │ │ ━━━━━░░░ │   │ 👥 Audience  78 │   │   [Start Step →]          │  │  │
│ │ │   50%    │   │ ██████████░░░░░ │   │                           │  │  │
│ │ └──────────┘   └─────────────────┘   └───────────────────────────┘  │  │
│ │ 💡 CUE: Audience score is 78—add emotional beat in Scene 3...      │  │
│ │ Est. Credits: 1,500  │  Last Active: 1 hour ago  │  [Open Project]  │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────┤
│ 📊 SPENDING ANALYTICS     │  ⚡ QUICK ACTIONS                              │
│ This Month: 2,100 cr      │  [+ New Project] [📚 Series Bibles]           │
│ Last Month: 1,800 cr      │  [☁️ Asset Library] [🔑 BYOK Config]          │
│ [Full Analytics →]        │  [💳 Buy Credits] [⚙️ Settings]               │
└────────────────────────────────────────────────────────────────────────────┘
```

</details>

<details>
<summary><strong>📱 Wireframes (Mobile 375px)</strong></summary>

```
┌───────────────────────────┐
│ 🎬 SceneFlow    🔔 👤 ≡  │
├───────────────────────────┤
│ 💬 Ask Cue...   [🎤][→]  │
│ [Save Credits] [Improve]  │
├───────────────────────────┤
│ BUDGET HEALTH             │
│ ━━━━━━━━━━━━━░░░░░░ 28%  │
│ 5,400 avail │ 3,200 req  │
│ 💡 3 projects near limit  │
│ [Top-Up] [Details]        │
├───────────────────────────┤
│ ACTIVE PROJECTS      [+]  │
│ ┌───────────────────────┐ │
│ │ 🎬 Sci-Fi Pilot   🟢  │ │
│ │ Vision Board • 50%    │ │
│ │ 🎬 Dir: 85 👥 Aud: 78 │ │
│ │ ▶ NEXT: Director's    │ │
│ │   [Start Step →]      │ │
│ │ 💡 Boost audience...  │ │
│ └───────────────────────┘ │
├───────────────────────────┤
│ 📊 Spending: 2,100 cr    │
│ [View Full Analytics →]   │
└───────────────────────────┘
```

</details>
