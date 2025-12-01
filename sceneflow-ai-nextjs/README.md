# SceneFlow Vision Workspace

The Vision phase now focuses exclusively on ideation, story structure, audio planning, and collaboration. MP4 rendering has been deferred to the upcoming **Polish** phase, so the UI no longer surfaces “Render Video”, Export Studio integrations, or Screening Room download buttons.

## Current Scope

- Vision storyboard editing and scene management  
- Script, storyboard, and scene-direction PDF exports  
- Audio planning (narration, dialogue, SFX, music)  
- Collaboration tooling, reviews, and Creation Hub experiments

## Local Development Quickstart

```
npm install
npm run dev
```

- Database: ensure Postgres is reachable; `npm run db:setup` seeds required tables.
- Environment: copy `.env.example` → `.env.local` and fill in provider keys:
  - `GEMINI_API_KEY` - Get from [Google AI Studio](https://aistudio.google.com/apikey) (used for LLM, TTS, image generation)
  - `ELEVENLABS_API_KEY` - For SFX generation
  - `REPLICATE_API_TOKEN` - For Flux 1.1 Pro image generation (optional)
  - Database credentials (PostgreSQL)
- Lint & build checks: `npm run lint` and `npm run build`.

## What’s Next

Video rendering, polishing tools, and hosted export infrastructure will be reintroduced during the Polish phase. Until then, the team can ship Vision and Creation Hub milestones without worrying about desktop or GCP rendering flows.
