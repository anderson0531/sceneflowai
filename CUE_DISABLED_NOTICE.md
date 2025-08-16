# Cue AI Assistant - Temporarily Disabled

## Status: DISABLED

The Cue AI Assistant has been temporarily disabled to resolve connection issues.

## What Was Disabled

### 1. Core Cue API (`cue.js`)
- All Cue Assistant functionality has been disabled
- Methods return disabled messages instead of processing requests
- Event listeners have been removed
- No external API calls are made

### 2. HTML Integration (`index.html`)
- Cue Assistant UI elements show disabled state
- All Cue-related buttons and inputs are disabled
- Disabled message displayed to users
- Global Cue widget is hidden

### 3. Workflow Integration (`workflow.js`)
- CueAssistant class methods are disabled
- No Cue interface creation
- Voice input functionality disabled
- Message processing disabled
- Context updates disabled

### 4. Testing (`test-local.html`)
- Cue test functions show disabled status
- Clear messaging about the disabled state

## Why It Was Disabled

The Cue AI Assistant was experiencing connection issues that were causing:
- Internal system errors (`NGHTTP2_INTERNAL_ERROR`)
- Stream connection problems
- Potential interference with other application functionality

## Impact on Application

**✅ What Still Works:**
- All core SceneFlow AI workflow features
- Authentication system
- BYOK (Bring Your Own Key) integration
- Credit system
- Video production workflow (Ideation, Storyboard, Scene Direction, Auto-Editor, AI Analysis)
- User management and data persistence

**❌ What's Disabled:**
- AI chat assistant functionality
- Voice input/output
- Context-aware project guidance
- Quick action suggestions
- Multilingual Cue support

## Re-enabling Cue

To re-enable the Cue AI Assistant:

1. **Restore `cue.js`** - Replace the disabled version with the original
2. **Restore `index.html`** - Re-enable Cue UI elements and functions
3. **Restore `workflow.js`** - Re-enable CueAssistant class methods
4. **Test functionality** - Ensure all Cue features work properly
5. **Monitor for errors** - Watch for any recurring connection issues

## Temporary Workaround

Users can still access all SceneFlow AI features through:
- Direct workflow navigation
- Manual project management
- Built-in guidance and tooltips
- Documentation and help resources

## Support

If you need assistance with video production features that are still functional, please refer to the main application documentation or contact support for workflow-specific questions.

---

**Note:** This is a temporary measure to ensure application stability. The Cue AI Assistant will be restored once connection issues are resolved.
