# Scene Image Generation Upgrade

## Overview

Update scene image generation to use Vertex AI Imagen 3 (matching thumbnail generation) and add a prompt editor drawer for scene images with Direct Edit, AI Assist, and Review capabilities.

## Current Scene Image Generation

**Files involved:**
- `/api/vision/expand-scene/route.ts` - Expands scene and generates image async
- `/api/vision/generate-scenes/route.ts` - Generates multiple scene images with BYOK
- `/api/generate-image` - Centralized image generation with multiple providers

**Current approach:**
- Uses BYOK image provider (OPENAI, GOOGLE_GEMINI, or STABILITY_AI)
- Basic prompts built from scene description + visual style
- No user control over prompts
- Can't refine if result is unsatisfactory

## Target Implementation

### 1. Migrate to Vertex AI Imagen 3 (Like Thumbnails)

**Update `/api/vision/expand-scene/route.ts`:**
- Replace `/api/generate-image` call with direct Vertex AI call
- Use `callVertexAIImagen()` helper (same as thumbnails)
- Consistent quality and provider
- Prepare for BYOK (service account per user later)

**Update `/api/vision/generate-scenes/route.ts`:**
- Same migration to Vertex AI Imagen 3
- Remove multi-provider logic (simplify)
- Keep BYOK structure for future

### 2. Create ScenePromptDrawer Component

**New file**: `src/components/vision/ScenePromptDrawer.tsx`

**Pattern**: Same as `ThumbnailPromptDrawer.tsx`

**Props:**
```typescript
interface ScenePromptDrawerProps {
  open: boolean
  onClose: () => void
  scene: {
    sceneNumber: number
    heading: string
    summary: string
    visualDescription?: string
    action?: string
    imageUrl?: string
    imagePrompt?: string
  }
  characters: any[]
  visualStyle: string
  projectId: string
  onSceneImageGenerated: (imageUrl: string) => void
}
```

**Three Tabs:**
1. **Direct Edit** - Edit scene image prompt
2. **AI Assist** - Get AI suggestions for prompt improvement
3. **Review** - Compare current vs new scene image

**Default Prompt Template:**
```typescript
const DEFAULT_SCENE_PROMPT = (scene, visualStyle) => `Generate a cinematic scene image:

Scene: ${scene.heading}
Action: ${scene.visualDescription || scene.action || scene.summary}
Visual Style: ${visualStyle}

Requirements:
- Professional film production quality
- Cinematic composition and framing
- ${visualStyle} visual aesthetic
- 16:9 landscape aspect ratio
- High detail and realism
- Proper lighting for mood and atmosphere
- No text or watermarks
- Suitable for professional film production`
```

### 3. Create Scene Prompt Refinement Endpoint

**New file**: `/api/prompts/refine-scene/route.ts`

Same pattern as `/api/prompts/refine-thumbnail/route.ts`:
- Accepts scene context + user instructions
- Uses Gemini 2.5 Flash for refinement
- Returns improved scene image prompt
- Expert system prompt for cinematic scene generation

### 4. Update Scene Image Generation API

**Update `/api/vision/expand-scene/route.ts`:**

**Add custom prompt support:**
```typescript
async function generateSceneImage(
  sceneNumber: number,
  scene: any,
  characters: any[],
  visualStyle: string,
  customPrompt?: string // New parameter
): Promise<string | null> {
  try {
    // Use custom prompt if provided
    const prompt = customPrompt || buildDefaultScenePrompt(scene, visualStyle, characters)
    
    // Call Vertex AI Imagen 3 directly
    const base64Image = await callVertexAIImagen(prompt, {
      aspectRatio: '16:9',
      numberOfImages: 1
    })
    
    // Upload to Vercel Blob
    const blobUrl = await uploadImageToBlob(
      base64Image, 
      `scenes/${projectId}-scene-${sceneNumber}-${Date.now()}.png`
    )
    
    // Save prompt to scene metadata for editing
    scene.imagePrompt = prompt
    scene.imageUrl = blobUrl
    scene.imageGeneratedAt = new Date().toISOString()
    
    return blobUrl
  } catch (error) {
    console.error(`[Scene Image] Generation failed:`, error)
    return null
  }
}
```

**Create new endpoint:** `/api/vision/regenerate-scene-image`

For regenerating a single scene image with custom prompt:

```typescript
export async function POST(request: NextRequest) {
  const { projectId, sceneNumber, customPrompt, scene, visualStyle } = await request.json()
  
  // Generate with custom prompt
  const base64Image = await callVertexAIImagen(customPrompt, {
    aspectRatio: '16:9'
  })
  
  const blobUrl = await uploadImageToBlob(
    base64Image,
    `scenes/${projectId}-scene-${sceneNumber}-${Date.now()}.png`
  )
  
  // Update scene in project metadata
  const project = await Project.findByPk(projectId)
  // ... update scene imageUrl and imagePrompt
  
  return NextResponse.json({
    success: true,
    imageUrl: blobUrl,
    promptUsed: customPrompt
  })
}
```

### 5. Integrate into Scene UI

**Update Scene Cards/Panels:**

Where scenes are displayed (likely in Vision page components), add:
- "Edit Scene Image" button/menu item
- Opens ScenePromptDrawer for that specific scene
- Shows current scene image and prompt
- Allows editing and regeneration

**Example integration:**
```tsx
import { ScenePromptDrawer } from '@/components/vision/ScenePromptDrawer'

function SceneCard({ scene, projectId, visualStyle, characters }) {
  const [promptDrawerOpen, setPromptDrawerOpen] = useState(false)
  
  return (
    <>
      <div className="scene-card">
        {scene.imageUrl && (
          <img src={scene.imageUrl} alt={scene.heading} />
        )}
        
        <button onClick={() => setPromptDrawerOpen(true)}>
          Edit Scene Image
        </button>
      </div>
      
      <ScenePromptDrawer
        open={promptDrawerOpen}
        onClose={() => setPromptDrawerOpen(false)}
        scene={scene}
        characters={characters}
        visualStyle={visualStyle}
        projectId={projectId}
        onSceneImageGenerated={(imageUrl) => {
          // Refresh scene display
          window.dispatchEvent(new CustomEvent('scene-updated', { 
            detail: { sceneNumber: scene.sceneNumber, imageUrl } 
          }))
        }}
      />
    </>
  )
}
```

## Implementation Steps

### Phase 1: Migrate Scene Generation to Vertex AI

1. ✅ Update `/api/vision/expand-scene/route.ts`:
   - Import `callVertexAIImagen` from `/lib/vertexai/client`
   - Replace `/api/generate-image` call with direct Vertex AI call
   - Use same Imagen 3 model as thumbnails

2. ✅ Update `/api/vision/generate-scenes/route.ts`:
   - Same migration to Vertex AI
   - Remove BYOK provider switching temporarily
   - Consistent quality across all images

3. ✅ Remove dependency on `/api/generate-image` (optional cleanup)

### Phase 2: Create Scene Prompt Editor

1. ✅ Create `ScenePromptDrawer.tsx` component
   - Three tabs (edit, ai, review)
   - Same structure as ThumbnailPromptDrawer
   - Scene-specific prompt template

2. ✅ Create `/api/prompts/refine-scene/route.ts`
   - AI-powered scene prompt refinement
   - Scene context-aware suggestions

3. ✅ Create `/api/vision/regenerate-scene-image/route.ts`
   - Regenerate single scene with custom prompt
   - Update scene metadata with new image + prompt

### Phase 3: Integrate into UI

1. ✅ Find where scenes are displayed (Vision page, ScriptPanel, etc.)
2. ✅ Add "Edit Scene Image" button/menu to each scene
3. ✅ Integrate ScenePromptDrawer
4. ✅ Add event listener for scene updates
5. ✅ Cache-busting for scene images (like thumbnails)

### Phase 4: Test

1. ✅ Generate script outline (creates scenes)
2. ✅ Expand scene (generates scene text + image)
3. ✅ Click "Edit Scene Image"
4. ✅ Edit prompt and regenerate
5. ✅ Verify new image displays immediately

## Benefits

✅ **Consistent provider** - All images use Vertex AI Imagen 3  
✅ **User control** - Edit prompts for any scene image  
✅ **AI assistance** - Get prompt suggestions  
✅ **Visual comparison** - See before/after  
✅ **Better quality** - Imagen 3 > mixed providers  
✅ **Future-proof** - Vertex AI is production-ready  
✅ **BYOK ready** - Structure prepared for user service accounts  

## Default Scene Prompt Template

```
Generate a cinematic scene image:

Scene: [INT. COFFEE SHOP - DAY]
Action: [Character sits at table reviewing documents, coffee steaming beside laptop]
Visual Style: [Warm, intimate, documentary style]
Characters Present: [Brian Anderson - thoughtful, mid-40s]

Requirements:
- Professional film production quality
- Cinematic composition and framing
- [Visual style] aesthetic
- Proper blocking and staging
- Authentic lighting for time of day and setting
- Character consistency with descriptions
- 16:9 landscape aspect ratio
- High detail and photorealistic rendering
- No text, titles, or watermarks
- Film-ready production value
```

## Prompt Refinement Examples

**User instruction:** "Make the lighting more dramatic"

**AI refinement:**
```
- Add strong directional lighting with hard shadows
- Increase contrast between highlights and shadows
- Use motivated lighting sources (window light, practical lamps)
- Create depth through three-point lighting setup
```

**User instruction:** "Focus more on the character's emotion"

**AI refinement:**
```
- Close-up or medium shot framing on character's face
- Shallow depth of field to isolate character
- Lighting that enhances emotional state (soft for vulnerable, hard for tense)
- Expression and body language that conveys inner state
```

## Scene vs Thumbnail Differences

**Thumbnails:**
- Wide, establishing shots
- Marketing/billboard quality
- Abstract concepts OK
- High visual impact

**Scenes:**
- Specific moments in story
- Character blocking and staging
- Continuity important
- Narrative-focused
- Multiple scenes need consistency

**Scene prompts need:**
- Character positions and actions
- Setting details (INT/EXT, TIME)
- Camera framing suggestions
- Lighting motivated by story
- Continuity with previous/next scenes

## Files to Create

1. `src/components/vision/ScenePromptDrawer.tsx` (new)
2. `src/app/api/prompts/refine-scene/route.ts` (new)
3. `src/app/api/vision/regenerate-scene-image/route.ts` (new)

## Files to Update

1. `src/app/api/vision/expand-scene/route.ts` - Migrate to Vertex AI
2. `src/app/api/vision/generate-scenes/route.ts` - Migrate to Vertex AI
3. Scene display components - Add edit button and drawer integration
4. Vision page - Add event listeners for scene updates

## Testing Checklist

- [ ] Scene images generate with Vertex AI Imagen 3
- [ ] Scene prompt editor opens from scene card
- [ ] Direct edit tab allows prompt editing
- [ ] AI assist provides useful refinements
- [ ] Review tab shows before/after comparison
- [ ] Regenerate creates new scene image
- [ ] New image displays without page refresh
- [ ] Prompt saved to scene metadata
- [ ] Cache-busting prevents showing old images
- [ ] Multiple scenes can be edited independently

## Cost Consideration

**Per scene image:**
- Vertex AI Imagen 3: ~$0.02-$0.04
- 20 scenes = ~$0.40-$0.80 per project
- Acceptable for development
- Users will use their own accounts via BYOK in production

