# Expand ElevenLabs Voice Integration for BYOK

## Overview

Enhance the ElevenLabs voice integration to show **all available voices** from the user's ElevenLabs account (BYOK), not just the curated top 30. This will allow users to select any voice from their personal account for characters and narrators.

## Current Implementation

### Existing Files:
- `/api/tts/elevenlabs/voices/route.ts` - Fetches voices, filters to top 30 English voices
- `/lib/tts/voices.ts` - Curated voice logic (5 voices: Autumn Veil, William, Arabella, David, Creator)
- Multiple components fetch voices via `/api/tts/elevenlabs/voices`

### Current Limitations:
- ❌ Only returns top 30 English voices (ranked by heuristics)
- ❌ Further filters to 5 "curated" voices
- ❌ Users can't access their full ElevenLabs library
- ❌ No BYOK support yet

## Target Implementation

### Goals:
1. ✅ Show **ALL** voices from user's ElevenLabs account
2. ✅ Remove English-only and top-30 filters
3. ✅ Add voice selection UI in:
   - Project creation (character/narrator setup)
   - Project settings/edit mode
   - TTS/audio generation workflow
4. ✅ Prepare structure for BYOK (use hardcoded key for now)
5. ✅ Cache voices per session, with refresh option

## Files to Modify

### 1. Update `/api/tts/elevenlabs/voices/route.ts`

**Current behavior:** Returns top 30 English voices

**New behavior:** Return ALL voices from ElevenLabs account

**Changes:**
```typescript
export async function GET(_req: NextRequest) {
  try {
    // TODO: BYOK - Accept API key from request header
    // const userApiKey = _req.headers.get('x-elevenlabs-api-key')
    const apiKey = process.env.ELEVENLABS_API_KEY // Use platform key for now
    
    if (!apiKey) {
      return new Response(JSON.stringify({ enabled: false, voices: [] }), { status: 200 })
    }

    const resp = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: { 'xi-api-key': apiKey },
      cache: 'no-store'
    })
    
    if (!resp.ok) {
      const err = await resp.text().catch(() => 'error')
      return new Response(JSON.stringify({ enabled: false, error: err }), { status: 200 })
    }
    
    const json = await resp.json().catch(() => ({ voices: [] }))
    const list: any[] = Array.isArray(json?.voices) ? json.voices : []

    // Return ALL voices, not just filtered/curated
    const allVoices = list.map((v: any) => ({
      id: v.voice_id || v.voiceID || v.id,
      name: v.name || 'Unknown',
      previewUrl: v.preview_url || v?.samples?.[0]?.preview_url,
      category: v?.category || '',
      labels: v.labels || {},
      description: v?.description || '',
      // Include language/accent for filtering on frontend
      language: v?.labels?.language || '',
      accent: v?.labels?.accent || '',
      gender: v?.labels?.gender || '',
      age: v?.labels?.age || '',
      useCase: v?.labels?.use_case || ''
    }))
    .sort((a, b) => a.name.localeCompare(b.name)) // Alphabetical order

    return new Response(JSON.stringify({ 
      enabled: true, 
      voices: allVoices,
      count: allVoices.length 
    }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ enabled: false, error: e?.message || 'unknown' }), { status: 200 })
  }
}
```

### 2. Create Voice Selector Component

**New file:** `/components/tts/VoiceSelector.tsx`

**Purpose:** Reusable voice selection component with search, filter, preview

**Features:**
- Display all voices from ElevenLabs
- Search by name
- Filter by language, gender, age, category
- Preview voice samples
- "Refresh Voices" button
- Selected voice indicator

**Structure:**
```tsx
interface VoiceSelectorProps {
  selectedVoiceId?: string
  onSelectVoice: (voiceId: string, voiceName: string) => void
  apiKey?: string // For BYOK (optional, uses platform key if not provided)
  compact?: boolean // Compact mode for inline use
}

export function VoiceSelector({ selectedVoiceId, onSelectVoice, apiKey, compact }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [languageFilter, setLanguageFilter] = useState('all')
  const [genderFilter, setGenderFilter] = useState('all')
  
  // Fetch voices on mount
  useEffect(() => {
    fetchVoices()
  }, [apiKey])
  
  const fetchVoices = async () => {
    setLoading(true)
    try {
      const headers: any = {}
      if (apiKey) headers['x-elevenlabs-api-key'] = apiKey // BYOK
      
      const res = await fetch('/api/tts/elevenlabs/voices', { 
        headers,
        cache: 'no-store' 
      })
      const data = await res.json()
      if (data?.enabled && Array.isArray(data.voices)) {
        setVoices(data.voices)
      }
    } catch (err) {
      console.error('Failed to fetch voices:', err)
    } finally {
      setLoading(false)
    }
  }
  
  // Filter voices by search and filters
  const filteredVoices = voices.filter(v => {
    if (searchQuery && !v.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (languageFilter !== 'all' && v.language !== languageFilter) return false
    if (genderFilter !== 'all' && v.gender !== genderFilter) return false
    return true
  })
  
  return (
    <div className="space-y-3">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-300">Select Voice</h4>
        <button onClick={fetchVoices} disabled={loading} className="text-xs text-blue-400 hover:text-blue-300">
          Refresh Voices
        </button>
      </div>
      
      {/* Search and filters */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Search voices..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-gray-200"
        />
        
        {!compact && (
          <div className="flex gap-2">
            <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)} className="...">
              <option value="all">All Languages</option>
              {/* Dynamic options from voices */}
            </select>
            <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="...">
              <option value="all">All Genders</option>
              {/* Dynamic options */}
            </select>
          </div>
        )}
      </div>
      
      {/* Voice list */}
      <div className="max-h-96 overflow-y-auto space-y-1">
        {filteredVoices.map(voice => (
          <VoiceItem
            key={voice.id}
            voice={voice}
            selected={voice.id === selectedVoiceId}
            onSelect={() => onSelectVoice(voice.id, voice.name)}
          />
        ))}
      </div>
      
      {filteredVoices.length === 0 && (
        <div className="text-sm text-gray-500 text-center py-4">
          No voices found
        </div>
      )}
    </div>
  )
}
```

### 3. Update Components to Use VoiceSelector

**Files to update:**
- `/components/vision/ScriptPanel.tsx`
- `/components/blueprint/TreatmentCard.tsx`
- `/components/studio/ScriptViewer.tsx`
- `/components/studio/ProjectIdeaTab.tsx`
- `/components/chat/CueChat.tsx`

**Pattern:**
```tsx
// Replace hardcoded voice dropdown with VoiceSelector component
import { VoiceSelector } from '@/components/tts/VoiceSelector'

// In component:
<VoiceSelector
  selectedVoiceId={selectedVoiceId}
  onSelectVoice={(id, name) => setSelectedVoiceId(id)}
  compact={true} // Use compact mode if space-constrained
/>
```

### 4. Add Voice Management to Project Settings

**File:** `/components/studio/ProjectSettings.tsx` (if exists) or create new

**Feature:** Allow users to assign voices to characters and narrators

**Structure:**
```tsx
<div className="space-y-4">
  <h3>Character Voices</h3>
  
  {characters.map(character => (
    <div key={character.id} className="flex items-center gap-3">
      <span className="w-32">{character.name}</span>
      <VoiceSelector
        selectedVoiceId={character.voiceId}
        onSelectVoice={(id) => updateCharacterVoice(character.id, id)}
        compact={true}
      />
    </div>
  ))}
  
  <h3>Narrator Voice</h3>
  <VoiceSelector
    selectedVoiceId={narratorVoiceId}
    onSelectVoice={(id) => setNarratorVoiceId(id)}
  />
</div>
```

### 5. Prepare BYOK Structure (Not Fully Implemented Yet)

**Future BYOK Implementation:**

**a) Add API Key Input Component:**
```tsx
// /components/settings/ElevenLabsSettings.tsx
export function ElevenLabsSettings() {
  const [apiKey, setApiKey] = useState('')
  
  return (
    <div>
      <label>ElevenLabs API Key</label>
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="Enter your ElevenLabs API key"
      />
      <button onClick={() => saveApiKey(apiKey)}>Save</button>
    </div>
  )
}
```

**b) Store in Database (Future):**
```typescript
// Add to User model
interface User {
  // ... existing fields
  elevenlabs_api_key?: string // Encrypted
}
```

**c) Update API Routes (Future):**
```typescript
// In /api/tts/elevenlabs/voices/route.ts
export async function GET(req: NextRequest) {
  // Get user's API key from session/database
  const session = await getServerSession()
  const user = await User.findByPk(session.user.id)
  const apiKey = user.elevenlabs_api_key || process.env.ELEVENLABS_API_KEY
  
  // Use user's key if available, fallback to platform key
  // ...
}
```

## Implementation Steps

### Phase 1: Expand Voice Access (Now)
1. ✅ Update `/api/tts/elevenlabs/voices/route.ts` to return ALL voices
2. ✅ Create `VoiceSelector` component
3. ✅ Test with existing platform API key

### Phase 2: Integrate Voice Selector (Now)
1. ✅ Replace voice dropdowns in all components
2. ✅ Add voice selection to project settings
3. ✅ Test voice preview functionality

### Phase 3: BYOK Preparation (Structure Only)
1. ✅ Add comments/TODOs for BYOK integration points
2. ✅ Create placeholder ElevenLabsSettings component
3. ✅ Document BYOK implementation plan

### Phase 4: Full BYOK (Later - When App is 80% Complete)
1. ⏸ Add API key storage to User model
2. ⏸ Implement API key encryption
3. ⏸ Update all TTS endpoints to accept user API keys
4. ⏸ Add API key management UI
5. ⏸ Test with user-provided keys

## Benefits

✅ Users can access their **entire** ElevenLabs voice library  
✅ No artificial limits (30 voices, 5 curated, English-only)  
✅ Better voice organization (search, filter, preview)  
✅ Reusable `VoiceSelector` component across app  
✅ Prepared for BYOK without blocking current development  
✅ Session caching reduces API calls  

## Testing Plan

1. **Voice Fetching:**
   - Verify API returns all voices (not just 30)
   - Test with accounts having 50+ voices
   - Confirm alphabetical sorting

2. **Voice Selector:**
   - Search functionality
   - Filter by language, gender, category
   - Preview audio samples
   - Refresh button updates list

3. **Integration:**
   - Test in each component (ScriptPanel, TreatmentCard, etc.)
   - Verify voice selection persists
   - Test character voice assignments

4. **BYOK Preparation:**
   - Verify structure is in place
   - Confirm TODOs are documented
   - Validate no breaking changes for future BYOK

## Notes

- **Current limitation:** Uses platform ELEVENLABS_API_KEY
- **BYOK ready:** Structure prepared, implementation deferred
- **Voice caching:** Per-session only, not persisted
- **Voice preview:** Requires audio playback component (optional)

