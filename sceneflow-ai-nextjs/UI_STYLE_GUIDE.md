# SceneFlow AI - UI Style Guide

**Version**: 1.0  
**Last Updated**: December 11, 2025  
**Reference Implementation**: Vision Page (`/dashboard/workflow/vision/[projectId]`)

---

## 🎯 Overview

This style guide ensures visual consistency across SceneFlow AI. **The Vision page is the canonical reference** for all UI patterns. When building new features, match the Vision page's look, feel, and operation.

### Core Principles

1. **Dark Theme First** - Professional, cinema-inspired aesthetic
2. **Consistent Spacing** - Use the standard spacing scale
3. **Clear Hierarchy** - Visual weight guides user attention
4. **Accessible Colors** - WCAG AA compliant contrast
5. **Responsive Design** - Mobile-first with touch-friendly targets

---

## 🎨 Color Palette

### Theme Colors (defined in `tailwind.config.js`)

```jsx
// Backgrounds (Dark Theme)
bg-sf-background     // #121212 - Main app background
bg-sf-surface        // #1E1E1E - Cards, panels, menus
bg-sf-surface-light  // #272727 - Hover states, secondary surfaces
bg-sf-surface-elevated // #2D2D2D - Modals, drawers, elevated UI

// Text Colors
text-sf-text-primary   // #F5F5F5 - Titles, important text
text-sf-text-secondary // #B0B0B0 - Body text, descriptions
text-sf-text-disabled  // #616161 - Disabled, placeholders

// Borders
border-sf-border       // #3A3A3A - Subtle borders
border-sf-border-strong // #4A4A4A - Stronger emphasis

// Accent Colors (Blue/Indigo)
text-sf-primary      // #3B82F6 - Links, primary actions
bg-sf-primary        // Primary buttons, highlights
text-sf-accent       // #6366F1 - Secondary accents
```

### Gray Scale (Light/Dark Mode)

| Purpose | Classes |
|---------|---------|
| Background | `bg-white dark:bg-gray-900` |
| Surface | `bg-gray-50 dark:bg-gray-800` |
| Border | `border-gray-200 dark:border-gray-700` |
| Text Primary | `text-gray-900 dark:text-white` |
| Text Secondary | `text-gray-600 dark:text-gray-400` |
| Text Muted | `text-gray-500 dark:text-gray-500` |

### Score/Status Colors (Stoplight System)

```typescript
// Use these functions for score-based coloring
function getScoreColor(score: number): string {
  if (score >= 85) return 'text-green-600 dark:text-green-400'  // Good
  if (score >= 75) return 'text-yellow-600 dark:text-yellow-400' // Fair
  return 'text-red-600 dark:text-red-400'  // Needs Work
}

function getScoreBgColor(score: number): string {
  if (score >= 85) return 'bg-green-500'
  if (score >= 75) return 'bg-yellow-500'
  return 'bg-red-500'
}
```

---

## 🔘 Button Patterns

### Primary Buttons (CTAs)

```jsx
// Gradient CTA - Use sparingly for main actions
<Button className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500">
  <Wand2 className="w-4 h-4 mr-2" />
  Generate Script
</Button>

// Solid primary
<Button className="bg-purple-600 hover:bg-purple-700 text-white">
  <Wand2 className="w-3 h-3 mr-1" />
  Revise Script
</Button>
```

### Secondary/Outline Buttons

```jsx
// Outline with color accent
<Button
  variant="outline"
  size="sm"
  className="flex items-center gap-2 border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/10"
>
  <PenTool className="w-5 h-5 text-blue-400" />
  <span className="text-sm">Edit Script</span>
</Button>

// Standard outline
<Button variant="outline" size="sm">
  <Edit3 className="w-4 h-4 mr-2" />
  Edit
</Button>
```

### Icon Buttons

```jsx
// Icon-only with tooltip (always use tooltips for icon-only buttons)
<Tooltip>
  <TooltipTrigger asChild>
    <button className="p-1.5 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <RefreshCw className="w-4 h-4 text-gray-700 dark:text-gray-300" />
    </button>
  </TooltipTrigger>
  <TooltipContent>Regenerate</TooltipContent>
</Tooltip>
```

### Destructive Buttons

```jsx
<Button
  variant="outline"
  size="sm"
  className="bg-red-50 hover:bg-red-100 text-red-600 border-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 dark:border-red-800"
>
  <Square className="w-4 h-4 mr-1" />
  Stop
</Button>
```

### Toggle Buttons

```jsx
<button className={`p-2 rounded transition-colors ${
  isActive 
    ? 'bg-gray-100 dark:bg-gray-800 text-sf-primary' 
    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
}`}>
  <Grid className="w-4 h-4" />
</button>
```

---

## 🃏 Card Patterns

### Standard Card

```jsx
<div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
  {/* Card content */}
</div>
```

### Scene Card (with image and overlay)

```jsx
<div className={cn(
  'group relative rounded-lg border overflow-hidden cursor-pointer transition-all',
  isSelected 
    ? 'border-sf-primary ring-2 ring-sf-primary' 
    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
)}>
  {/* Aspect ratio container */}
  <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
    <img src={imageUrl} className="w-full h-full object-cover" />
  </div>
  
  {/* Gradient overlay with text */}
  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
    <div className="text-white">
      <div className="text-xs font-semibold">SCENE {number}</div>
      <div className="text-sm truncate">{heading}</div>
    </div>
  </div>
  
  {/* Hover controls */}
  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
    {/* Action buttons */}
  </div>
</div>
```

### Stats Card

```jsx
<div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
  <div className="text-2xl font-bold text-sf-primary">{value}</div>
  <div className="text-xs text-gray-500 dark:text-gray-400 text-center">{label}</div>
</div>
```

---

## 📐 Panel Layout

### Standard Panel

```jsx
<div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 h-full overflow-y-auto">
  {/* Panel Header */}
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-2">
      <Clapperboard className="w-5 h-5 text-sf-primary" />
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-6 my-0">
        Panel Title
      </h3>
      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
        {count} items
      </span>
    </div>
    <div className="flex items-center gap-2">
      {/* Header actions */}
    </div>
  </div>
  
  {/* Panel Content */}
  <div className="space-y-4">
    {/* Content items */}
  </div>
</div>
```

### Sticky Header Panel

```jsx
<div className="h-full flex flex-col">
  {/* Sticky header */}
  <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
    <h3 className="font-semibold text-gray-900 dark:text-white">Header</h3>
  </div>
  
  {/* Scrollable content */}
  <div className="flex-1 overflow-y-auto p-4">
    {/* Content */}
  </div>
</div>
```

---

## 📝 Modal/Dialog Patterns

### Standard Modal

```jsx
<Dialog>
  <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-w-4xl">
    <DialogHeader>
      <DialogTitle className="text-gray-900 dark:text-white">Modal Title</DialogTitle>
      <DialogDescription className="text-gray-600 dark:text-gray-300">
        Description text here.
      </DialogDescription>
    </DialogHeader>
    
    <div className="py-4">
      {/* Modal content */}
    </div>
    
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Save Changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Full-Screen Modal

```jsx
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
  <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
    {/* Header */}
    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Title</h2>
      <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
        <X className="w-5 h-5" />
      </button>
    </div>

    {/* Scrollable content */}
    <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
      {/* Content */}
    </div>
    
    {/* Footer */}
    <div className="flex justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-700">
      {/* Actions */}
    </div>
  </div>
</div>
```

---

## 📏 Typography

### Headings

```jsx
// Page title
<h1 className="text-2xl font-bold text-gray-900 dark:text-white">

// Section title  
<h2 className="text-xl font-semibold text-gray-900 dark:text-white">

// Panel heading
<h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-6 my-0">

// Subsection
<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
```

### Body Text

```jsx
// Primary body text
<p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">

// Secondary/muted text
<p className="text-sm text-gray-500 dark:text-gray-400">

// Small labels
<span className="text-xs text-gray-500 dark:text-gray-400">

// Scene label (uppercase)
<span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
  SCENE {number}
</span>
```

### Large Display Text

```jsx
// Score display
<div className="text-4xl font-bold">{score}</div>

// Hero number
<div className="text-2xl font-bold text-sf-primary">{value}</div>
```

---

## 📐 Spacing

### Standard Values

| Token | Value | Usage |
|-------|-------|-------|
| `p-1` / `gap-1` | 0.25rem (4px) | Tight spacing, icon gaps |
| `p-2` / `gap-2` | 0.5rem (8px) | Related items |
| `p-3` / `gap-3` | 0.75rem (12px) | Card padding (compact) |
| `p-4` / `gap-4` | 1rem (16px) | Standard content gap |
| `p-6` / `gap-6` | 1.5rem (24px) | Panel padding, section gap |
| `mb-6` | 1.5rem | Below panel headers |

### Common Patterns

```jsx
// Button with icon
<Button className="flex items-center gap-2">

// Panel content
<div className="space-y-4">

// Section with header
<div className="mb-6">
  <h3>...</h3>
</div>
<div>Content</div>

// Grid layouts
<div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
```

---

## 🎭 Interactive States

### Hover

```jsx
hover:bg-gray-50 dark:hover:bg-gray-700
hover:border-blue-500/50 hover:bg-blue-500/10
transition-colors  // Always add for smooth transitions
```

### Focus

```jsx
focus:outline-none focus:ring-2 focus:ring-sf-primary focus:ring-offset-2
focus-visible:ring-2 focus-visible:ring-blue-500
```

### Disabled

```jsx
disabled:pointer-events-none disabled:opacity-50
disabled:cursor-not-allowed
```

### Selected/Active

```jsx
// Selected card
border-sf-primary ring-2 ring-sf-primary

// Active toggle
bg-gray-100 dark:bg-gray-800 text-sf-primary

// Active tab
data-[state=active]:text-white data-[state=active]:bg-gray-800
```

---

## 🔄 Loading States

### Full-Area Spinner

```jsx
<div className="flex flex-col items-center justify-center py-12">
  <Loader className="w-8 h-8 animate-spin text-sf-primary mb-2" />
  <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
</div>
```

### Overlay Spinner (on image/card)

```jsx
<div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
  <Loader className="w-12 h-12 animate-spin text-blue-400 mb-3" />
  <span className="text-sm text-white font-medium">Generating...</span>
  <span className="text-xs text-gray-300 mt-1">Please wait</span>
</div>
```

### Inline Spinner

```jsx
<Button disabled>
  <Loader className="w-4 h-4 animate-spin mr-2" />
  Processing...
</Button>
```

---

## 🏷️ Badges & Tags

### Count Badge

```jsx
<span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
  {count} scenes
</span>
```

### Status Badge

```jsx
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
  Complete
</span>
```

---

## 🎯 Tabs

```jsx
<Tabs defaultValue="tab1">
  <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-900/60 p-1 rounded-md border border-gray-200 dark:border-gray-800">
    <TabsTrigger 
      value="tab1" 
      className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
    >
      Tab 1
    </TabsTrigger>
    <TabsTrigger 
      value="tab2"
      className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
    >
      Tab 2
    </TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

---

## 📚 Icon Library

**Primary**: `lucide-react`

### Common Icons by Category

| Category | Icons |
|----------|-------|
| Loading | `Loader`, `RefreshCw` |
| Media | `Play`, `Pause`, `Square`, `Volume2`, `VolumeX` |
| Edit | `Edit3`, `PenTool`, `Wand2`, `Sparkles` |
| Navigation | `ChevronLeft`, `ChevronRight`, `X`, `Plus`, `Minus` |
| Actions | `Download`, `Upload`, `Trash2`, `Copy` |
| Status | `Check`, `CheckCircle`, `AlertCircle`, `AlertTriangle` |
| Content | `FileText`, `Image`, `Clapperboard`, `Film` |

### Icon Sizing

```jsx
// Small (in buttons, inline)
<Icon className="w-4 h-4" />

// Medium (panel headers)
<Icon className="w-5 h-5" />

// Large (empty states, loading)
<Icon className="w-8 h-8" />

// Extra large (hero/loading overlays)
<Icon className="w-12 h-12" />
```

---

## 📱 Responsive Design

### Breakpoints

```jsx
sm:  // 640px
md:  // 768px
lg:  // 1024px
xl:  // 1280px
```

### Common Patterns

```jsx
// Hide on mobile, show on desktop
<span className="hidden sm:inline">Full Text</span>
<span className="sm:hidden">Short</span>

// Responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

// Responsive spacing
<div className="p-3 sm:p-4 lg:p-6">

// Touch-friendly minimum size (44px)
<button className="min-h-[44px] min-w-[44px]">
```

---

## ✅ Checklist for New Components

When building new UI, verify against this checklist:

- [ ] Uses `dark:` variants for all colors
- [ ] Buttons have hover/focus/disabled states
- [ ] Icon buttons have tooltips
- [ ] Loading states use `Loader` with `animate-spin`
- [ ] Cards use standard border radius (`rounded-lg` or `rounded-xl`)
- [ ] Panels have proper header with icon and title
- [ ] Spacing uses standard scale (p-4, p-6, gap-2, gap-4)
- [ ] Text uses proper hierarchy (base for titles, sm for body, xs for labels)
- [ ] Interactive elements have `transition-colors`
- [ ] Selected states use `ring-2 ring-sf-primary`

---

## 📁 Reference Files

| Pattern | Reference File |
|---------|----------------|
| Panel layouts | `src/components/vision/ScriptPanel.tsx` |
| Card galleries | `src/components/vision/SceneGallery.tsx` |
| Full-screen modals | `src/components/vision/ScriptPlayer.tsx` |
| Dialog modals | `src/components/vision/ScriptReviewModal.tsx` |
| Tabs | `src/components/vision/ScriptEditorModal.tsx` |
| Form controls | `src/components/ui/select.tsx` |
| Buttons | `src/components/ui/button.tsx` |

---

*This guide is the source of truth for UI consistency. When in doubt, reference the Vision page implementation.*
