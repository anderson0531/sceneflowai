# Thumbnail Prompt Editor Drawer

## Overview

Create a drawer component for editing thumbnail generation prompts with direct edit, AI assistance, and regeneration capabilities. Follows the same pattern as VariantEditorDrawer for Film Treatment editing.

## Current Implementation

**Thumbnail generation:**
- Fixed prompt template in `/api/projects/generate-thumbnail/route.ts`
- No user control over prompt
- One-shot generation only
- Can't refine if result isn't satisfactory

## Target Implementation

**Thumbnail Prompt Editor Drawer:**
- Edit prompt before or after generation
- AI assistance for prompt refinement
- Preview current thumbnail
- Regenerate with edited prompt
- Three tabs: Direct Edit, AI Assist, Review

## Component Structure

### New Component: `ThumbnailPromptDrawer.tsx`

**Location**: `src/components/project/ThumbnailPromptDrawer.tsx`

**Pattern**: Same as `VariantEditorDrawer.tsx`

**Props:**
```typescript
interface ThumbnailPromptDrawerProps {
  open: boolean
  onClose: () => void
  project: {
    id: string
    title: string
    description: string
    genre?: string
    metadata?: any
  }
  currentThumbnail?: string // URL of existing thumbnail
  onThumbnailGenerated: (imageUrl: string) => void
}
```

**Tabs:**
1. **Direct Edit** - Edit prompt text directly
2. **AI Assist** - Get AI suggestions for prompt improvement
3. **Review** - Preview and compare before/after

**Layout:**
```tsx
<Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="fixed right-0 top-0 bottom-0 w-[min(100vw,700px)] ...">
    <DialogHeader>
      <DialogTitle>Edit Thumbnail Prompt</DialogTitle>
    </DialogHeader>
    
    <div className="flex flex-col h-[calc(100dvh-56px)]">
      {/* Tabs */}
      <div className="px-8 pb-2 border-b border-gray-800">
        <button onClick={() => setTab('edit')}>Direct Edit</button>
        <button onClick={() => setTab('ai')}>AI Assist</button>
        <button onClick={() => setTab('review')}>Review</button>
      </div>
      
      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 py-4">
        {tab === 'edit' && <DirectEditTab />}
        {tab === 'ai' && <AIAssistTab />}
        {tab === 'review' && <ReviewTab />}
      </div>
      
      {/* Footer */}
      <div className="px-8 py-4 border-t border-gray-800">
        <button onClick={handleRegenerate}>
          Regenerate Thumbnail
        </button>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

## Tab Implementations

### Tab 1: Direct Edit

**Left side:** Original generated prompt (read-only)
**Right side:** Editable prompt

```tsx
<div className="grid grid-cols-2 gap-4">
  {/* Original Prompt */}
  <div>
    <div className="text-xs text-gray-400 mb-2">Original Prompt</div>
    <div className="p-3 bg-gray-900 border border-gray-800 rounded text-gray-300 whitespace-pre-wrap min-h-[300px]">
      {originalPrompt}
    </div>
  </div>
  
  {/* Editable Prompt */}
  <div>
    <div className="text-xs text-gray-400 mb-2">Your Prompt</div>
    <textarea
      value={editedPrompt}
      onChange={(e) => setEditedPrompt(e.target.value)}
      className="w-full p-3 bg-gray-900 border border-gray-700 rounded text-gray-100 min-h-[300px]"
      placeholder="Edit the thumbnail generation prompt..."
    />
  </div>
</div>

{/* Quick additions */}
<div className="mt-4">
  <div className="text-xs text-gray-400 mb-2">Quick Additions</div>
  <div className="flex flex-wrap gap-2">
    <button onClick={() => appendToPrompt('- Cinematic color grading')}>
      Add Color Grading
    </button>
    <button onClick={() => appendToPrompt('- Golden hour lighting')}>
      Add Golden Hour
    </button>
    <button onClick={() => appendToPrompt('- Film noir style')}>
      Add Noir Style
    </button>
  </div>
</div>
```

### Tab 2: AI Assist

**AI prompt refinement:**

```tsx
<div className="space-y-4">
  <div>
    <div className="text-xs text-gray-400 mb-2">Current Prompt</div>
    <div className="p-3 bg-gray-900 border border-gray-800 rounded text-gray-300 text-sm">
      {editedPrompt || originalPrompt}
    </div>
  </div>
  
  <div>
    <div className="text-xs text-gray-400 mb-2">What should change?</div>
    <textarea
      value={aiInstructions}
      onChange={(e) => setAiInstructions(e.target.value)}
      className="w-full p-3 bg-gray-900 border border-gray-700 rounded text-gray-100"
      rows={5}
      placeholder="E.g., 'Make it more dramatic', 'Focus on characters instead of environment', 'Add sunset lighting'"
    />
  </div>
  
  <div className="flex justify-end">
    <button 
      onClick={handleAIRefine}
      disabled={isRefining}
      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
    >
      {isRefining ? 'Refining...' : 'Refine with AI'}
    </button>
  </div>
  
  {refinedPrompt && (
    <div>
      <div className="text-xs text-gray-400 mb-2">AI Suggestion</div>
      <div className="p-3 bg-emerald-900/20 border border-emerald-800 rounded text-gray-200">
        {refinedPrompt}
      </div>
      <button 
        onClick={() => setEditedPrompt(refinedPrompt)}
        className="mt-2 text-sm text-blue-400 hover:text-blue-300"
      >
        Use This Prompt
      </button>
    </div>
  )}
</div>
```

### Tab 3: Review

**Before/after comparison:**

```tsx
<div className="space-y-4">
  <div className="grid grid-cols-2 gap-4">
    {/* Current Thumbnail */}
    <div>
      <div className="text-xs text-gray-400 mb-2">Current Thumbnail</div>
      {currentThumbnail ? (
        <img 
          src={currentThumbnail} 
          alt="Current" 
          className="w-full aspect-video object-cover rounded border border-gray-800"
        />
      ) : (
        <div className="w-full aspect-video bg-gray-900 border border-gray-800 rounded flex items-center justify-center text-gray-500">
          No thumbnail yet
        </div>
      )}
    </div>
    
    {/* Preview (if regenerated) */}
    <div>
      <div className="text-xs text-gray-400 mb-2">New Preview</div>
      {newThumbnail ? (
        <img 
          src={newThumbnail} 
          alt="New" 
          className="w-full aspect-video object-cover rounded border border-green-600"
        />
      ) : (
        <div className="w-full aspect-video bg-gray-900 border border-gray-800 rounded flex items-center justify-center text-gray-500">
          Click "Regenerate" to preview
        </div>
      )}
    </div>
  </div>
  
  <div>
    <div className="text-xs text-gray-400 mb-2">Edited Prompt</div>
    <div className="p-3 bg-gray-900 border border-gray-800 rounded text-gray-300 text-sm whitespace-pre-wrap">
      {editedPrompt}
    </div>
  </div>
</div>
```

## API Endpoints

### Create New Endpoint: `/api/prompts/refine-thumbnail`

**Purpose**: AI assistance for prompt refinement

```typescript
export async function POST(request: NextRequest) {
  const { currentPrompt, instructions } = await request.json()
  
  const systemPrompt = `You are a prompt engineering expert specializing in image generation prompts for Imagen 3.
  
Given the current prompt and user instructions, refine and improve the prompt to:
- Follow Imagen 3 best practices
- Be specific and descriptive
- Include relevant style details
- Maintain cinematic billboard quality
- Apply the user's requested changes

Return ONLY the refined prompt, no explanations.`

  const userPrompt = `Current prompt:
${currentPrompt}

User instructions:
${instructions}

Provide the refined prompt:`

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      })
    }
  )
  
  const data = await response.json()
  const refinedPrompt = data?.candidates?.[0]?.content?.parts?.[0]?.text
  
  return NextResponse.json({
    success: true,
    refinedPrompt
  })
}
```

### Update Existing Endpoint: `/api/projects/generate-thumbnail`

**Add custom prompt support:**

```typescript
export async function POST(request: NextRequest) {
  const { projectId, customPrompt, ...otherFields } = await request.json()
  
  // Use custom prompt if provided, otherwise generate from project data
  const prompt = customPrompt || generateDefaultPrompt(title, genre, description)
  
  // ... rest of generation logic
  
  return NextResponse.json({
    success: true,
    imageUrl: blobUrl,
    promptUsed: prompt, // Return the actual prompt used
    model: 'imagen-3.0-generate-001',
    provider: 'vertex-ai-imagen-3',
    storageType: 'vercel-blob'
  })
}
```

## Integration Points

### ProjectCard Component

**Add "Edit Prompt" option to dropdown:**

```tsx
import { ThumbnailPromptDrawer } from '@/components/project/ThumbnailPromptDrawer'

function ProjectCard({ project }) {
  const [promptDrawerOpen, setPromptDrawerOpen] = useState(false)
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuItem onClick={() => setPromptDrawerOpen(true)}>
          Edit Thumbnail Prompt
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleQuickGenerate}>
          Quick Generate
        </DropdownMenuItem>
      </DropdownMenu>
      
      <ThumbnailPromptDrawer
        open={promptDrawerOpen}
        onClose={() => setPromptDrawerOpen(false)}
        project={project}
        currentThumbnail={project.metadata?.thumbnailUrl}
        onThumbnailGenerated={(url) => {
          // Refresh project
          loadProjects()
        }}
      />
    </>
  )
}
```

## User Workflow

### Scenario 1: First Thumbnail Generation

1. User creates project
2. Clicks "Edit Thumbnail Prompt" from dropdown
3. Drawer opens with **default prompt** pre-filled
4. User can:
   - Edit prompt directly (Direct Edit tab)
   - Get AI suggestions (AI Assist tab)
   - Click "Generate Thumbnail"
5. Preview shows in Review tab
6. Click "Apply" to save

### Scenario 2: Refine Existing Thumbnail

1. User has thumbnail but wants to improve it
2. Clicks "Edit Thumbnail Prompt"
3. Drawer shows current thumbnail and prompt
4. User edits prompt (e.g., "Make it darker, more noir")
5. Clicks "Regenerate"
6. Side-by-side comparison in Review tab
7. User chooses to keep new or revert

### Scenario 3: AI-Assisted Refinement

1. User opens prompt editor
2. Goes to AI Assist tab
3. Types: "Make the lighting more dramatic and add a sunset"
4. AI refines the prompt
5. User applies AI suggestion
6. Regenerates thumbnail
7. Compares in Review tab

## Features

### Direct Edit Tab

✅ Original prompt (read-only)  
✅ Editable prompt (live editing)  
✅ Quick addition buttons (lighting, style, mood)  
✅ Character count indicator  
✅ Reset to default button  

### AI Assist Tab

✅ Current prompt display  
✅ Instruction textarea  
✅ "Refine with AI" button  
✅ AI suggestion display  
✅ "Use This Prompt" button  
✅ Loading state with progress  

### Review Tab

✅ Before/after image comparison  
✅ Edited prompt display  
✅ Image metadata (model, size, etc.)  
✅ Apply or Revert options  
✅ Download image button  

## State Management

```typescript
const [tab, setTab] = useState<'edit' | 'ai' | 'review'>('edit')
const [originalPrompt, setOriginalPrompt] = useState('')
const [editedPrompt, setEditedPrompt] = useState('')
const [aiInstructions, setAiInstructions] = useState('')
const [refinedPrompt, setRefinedPrompt] = useState('')
const [currentThumbnail, setCurrentThumbnail] = useState<string | null>(null)
const [newThumbnail, setNewThumbnail] = useState<string | null>(null)
const [isGenerating, setIsGenerating] = useState(false)
const [isRefining, setIsRefining] = useState(false)
```

## API Integration

### Generate with Custom Prompt

```typescript
const handleRegenerate = async () => {
  setIsGenerating(true)
  
  try {
    const res = await fetch('/api/projects/generate-thumbnail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: project.id,
        customPrompt: editedPrompt, // Use edited prompt
        title: project.title,
        genre: project.genre
      })
    })
    
    const data = await res.json()
    
    if (data.success) {
      setNewThumbnail(data.imageUrl)
      setTab('review') // Switch to review tab
    }
  } catch (error) {
    console.error('Regeneration failed:', error)
  } finally {
    setIsGenerating(false)
  }
}
```

### AI Prompt Refinement

```typescript
const handleAIRefine = async () => {
  setIsRefining(true)
  
  try {
    const res = await fetch('/api/prompts/refine-thumbnail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPrompt: editedPrompt || originalPrompt,
        instructions: aiInstructions
      })
    })
    
    const data = await res.json()
    
    if (data.success && data.refinedPrompt) {
      setRefinedPrompt(data.refinedPrompt)
      // User can then click "Use This Prompt"
    }
  } catch (error) {
    console.error('AI refinement failed:', error)
  } finally {
    setIsRefining(false)
  }
}
```

## Keyboard Shortcuts

- **Cmd/Ctrl + Enter**: Regenerate thumbnail
- **Escape**: Close drawer
- **Cmd/Ctrl + S**: Save prompt (without regenerating)

## Visual Design

**Drawer width**: 700px (wider than VariantEditor to show image comparisons)

**Split view in Direct Edit:**
- 50/50 split with draggable divider
- Original prompt on left (locked)
- Editable prompt on right

**Image comparison in Review:**
- Side-by-side 2-column grid
- Current on left, New on right
- Green border on new image
- Zoom on hover

## Implementation Steps

1. **Create ThumbnailPromptDrawer component**
   - Three tabs
   - State management
   - Regeneration logic

2. **Create /api/prompts/refine-thumbnail endpoint**
   - AI prompt refinement
   - Uses Gemini 2.5 Flash

3. **Update /api/projects/generate-thumbnail**
   - Accept `customPrompt` parameter
   - Return `promptUsed` in response

4. **Update ProjectCard**
   - Add "Edit Thumbnail Prompt" menu item
   - Integrate ThumbnailPromptDrawer
   - Handle regeneration callback

5. **Store prompt in project metadata**
   - Save edited prompt for future reference
   - Track prompt history (optional)

## Benefits

✅ **Full control** over thumbnail appearance  
✅ **Iterate quickly** - refine until perfect  
✅ **AI assistance** - get expert prompt suggestions  
✅ **Compare results** - see before/after side-by-side  
✅ **Reusable prompts** - save good prompts for similar projects  
✅ **Professional workflow** - matches creative tool expectations  

## Future Enhancements

- Prompt templates library
- Prompt history/versioning
- Share prompts with community
- Favorite prompt snippets
- Batch regeneration for multiple projects

