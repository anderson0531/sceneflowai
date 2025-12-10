# Contributing to SceneFlow AI

## Before You Start

### Required Reading

**Before making any code changes, read these documents:**

📖 **[SCENEFLOW_AI_DESIGN_DOCUMENT.md](./SCENEFLOW_AI_DESIGN_DOCUMENT.md)**

This document contains:
- Architecture decisions and rationale
- Critical patterns (e.g., single source of truth for state)
- Deprecated features and their replacements
- Planned features and roadmap
- Key file locations

🎨 **[UI_STYLE_GUIDE.md](./UI_STYLE_GUIDE.md)**

This document contains:
- Color palette and theme tokens
- Button, card, panel, and modal patterns
- Typography and spacing standards
- Interactive states (hover, focus, disabled)
- Component checklist for consistency

---

## For AI Coding Assistants

If you are an AI assistant (GitHub Copilot, Cursor, Claude, etc.), **start every session by:**

1. **Read the design document**: `SCENEFLOW_AI_DESIGN_DOCUMENT.md`
2. **Check the Design Decisions Log** at the top for recent changes
3. **Review Deprecated Features** to avoid recreating removed functionality
4. **Follow the Critical Architecture Patterns** section

### Key Patterns to Follow

```typescript
// ✅ CORRECT: Use script.script.scenes as single source of truth
const scenes = script?.script?.scenes || []

// ❌ WRONG: Don't create separate scenes state
const [scenes, setScenes] = useState([])
```

### Before Implementing New Features

1. Check if a similar feature already exists
2. Check if it was previously deprecated
3. Review the planned features section
4. Update the design document with new decisions

### After Making Changes

Update `SCENEFLOW_AI_DESIGN_DOCUMENT.md`:
- Add new decisions to the Design Decisions Log
- Update deprecated features if removing functionality
- Add new key file locations to the Appendix

---

## For Human Developers

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy environment variables: `cp env.example .env.local`
4. Run development server: `npm run dev`

### Code Style

- **Components**: PascalCase (`ScenePromptBuilder.tsx`)
- **Functions**: camelCase (`optimizePromptForImagen`)
- **API Routes**: kebab-case (`generate-scene-image`)
- **Database**: snake_case (`user_id`, `created_at`)

### Pull Request Checklist

- [ ] Read `SCENEFLOW_AI_DESIGN_DOCUMENT.md`
- [ ] Code follows existing patterns
- [ ] No duplicate functionality created
- [ ] Design document updated if needed
- [ ] TypeScript errors resolved
- [ ] Tested locally

---

## Key Files Reference

| Purpose | Location |
|---------|---------|
| Design Document | `SCENEFLOW_AI_DESIGN_DOCUMENT.md` |
| UI Style Guide | `UI_STYLE_GUIDE.md` |
| Vision Page | `src/app/dashboard/workflow/vision/[projectId]/page.tsx` |
| Screening Room | `src/components/vision/ScriptPlayer.tsx` |
| Script Panel | `src/components/vision/ScriptPanel.tsx` |
| Scene Gallery | `src/components/vision/SceneGallery.tsx` |
| Ken Burns Effect | `src/lib/animation/kenBurns.ts` |

---

## Questions?

Review the design document first. Most architectural questions are answered there.
