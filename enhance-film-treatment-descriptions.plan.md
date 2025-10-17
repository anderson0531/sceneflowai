# Enhance Film Treatment with Detailed Character & Scene Descriptions

## Problem
Film Treatment variants lack detailed visual descriptions needed for consistency:
- Character descriptions are brief (just goal/flaw)
- Scene descriptions are vague (just time/place)
- Missing: Appearance, demeanor, clothing, furniture, atmosphere

## Solution
Add detailed character and scene descriptions to Film Treatment generation for visual consistency across scripts and video generation.

## Character Descriptions Needed
For protagonist and supporting characters:
- **Appearance**: Age, height, build, facial features, hair, ethnicity
- **Demeanor**: Personality, body language, mannerisms, energy
- **Clothing**: Style, colors, accessories, typical outfit

## Scene Descriptions Needed
For key locations:
- **Location**: Specific place, indoor/outdoor, size, layout
- **Atmosphere**: Lighting, time of day, weather, mood
- **Furniture/Props**: Key objects, decorations, notable items

## Implementation

### Update `/src/lib/treatment/prompts.ts`

**Line 48-73** - Add to SCHEMA:

```typescript
SCHEMA:
{
  "estimatedDurationMinutes": ${targetMinutes},
  "title": "Proposed title",
  "logline": "One- or two-sentence hook",
  "genre": "Genre",
  "format_length": "Short (5–40m) | Feature (90–120m) | Series episode | …",
  "synopsis": "≤120 words",
  "audience": "string",
  "tone": "string",
  "style": "string",
  "target_audience": "Concrete audience description",
  "setting": "Time/place + world rules",
  "protagonist": "Main character brief (goal/flaw)",
  "antagonist": "Primary opposing force/conflict",
  
  "character_descriptions": [
    {
      "name": "Character Name",
      "role": "protagonist | supporting | antagonist",
      "appearance": "Age, height, build, facial features, hair, ethnicity (e.g., 'Mid-30s, 5'10\", athletic build, sharp jawline, short dark hair, Asian-American')",
      "demeanor": "Personality, body language, mannerisms (e.g., 'Confident but guarded, stands with arms crossed, speaks deliberately, intense eye contact')",
      "clothing": "Style, colors, typical outfit (e.g., 'Business casual: navy blazer, white shirt, dark jeans, leather messenger bag')",
      "description": "Brief character summary for script"
    }
  ],
  
  "scene_descriptions": [
    {
      "name": "Location Name",
      "type": "INT | EXT",
      "location": "Specific place and layout (e.g., 'Modern open-plan office, glass walls, 50x30ft space')",
      "atmosphere": "Lighting, time, mood (e.g., 'Fluorescent overhead lights, late afternoon sun through windows, tense corporate energy')",
      "furniture_props": "Key objects and decorations (e.g., 'Standing desks with dual monitors, whiteboard walls with diagrams, coffee station, potted plants')"
    }
  ],
  
  "themes": ["Theme 1", "Theme 2"],
  "opening_hook": "string",
  "cta": ${formatBlock.includeCTA ? '"string"' : 'null'},
  "learning_objectives": ${formatBlock.includeLearning ? '["Objective 1", "Objective 2"]' : '[]'},
  "beats": [
    { "title": "Beat title", "intent": "Purpose/retention goal", "synopsis": "≤50 words beat summary", "minutes": 2.5 }
  ],
  "visual_style": "string",
  "audio_direction": "string",
  "broll_suggestions": ["string"]
}

CRITICAL: Generate 3-5 character_descriptions and 3-5 scene_descriptions with DETAILED visual information for consistency in image/video generation.
```

### Update `/src/app/api/ideation/film-treatment/route.ts`

**Lines 262-268** - Pass through character descriptions with all fields:

```typescript
character_descriptions: Array.isArray((parsed as any).character_descriptions)
  ? ((parsed as any).character_descriptions as any[]).map((c: any) => ({
      name: String(c?.name || ''),
      role: String(c?.role || 'supporting'),
      appearance: String(c?.appearance || ''),
      demeanor: String(c?.demeanor || ''),
      clothing: String(c?.clothing || ''),
      description: String(c?.description || ''),
      image_prompt: c?.image_prompt ? String(c.image_prompt) : undefined,
    }))
  : undefined,

scene_descriptions: Array.isArray((parsed as any).scene_descriptions)
  ? ((parsed as any).scene_descriptions as any[]).map((s: any) => ({
      name: String(s?.name || ''),
      type: String(s?.type || 'INT'),
      location: String(s?.location || ''),
      atmosphere: String(s?.atmosphere || ''),
      furniture_props: String(s?.furniture_props || '')
    }))
  : undefined,
```

## Expected Results
✅ Treatment includes 3-5 detailed character descriptions
✅ Character appearance, demeanor, clothing specified
✅ Treatment includes 3-5 detailed scene descriptions
✅ Scene location, atmosphere, furniture specified
✅ Consistent visual references for script and video generation
✅ Better image generation prompts from detailed descriptions

## Testing
1. Generate Film Treatment
2. Verify character_descriptions array has appearance, demeanor, clothing
3. Verify scene_descriptions array has location, atmosphere, furniture_props
4. Check that descriptions are detailed and specific

