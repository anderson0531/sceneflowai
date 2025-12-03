# AI Coding Style Guide & Architecture Standards

This guide establishes the standards for AI models (coding assistants) working on the SceneFlow AI codebase. Follow these guidelines to ensure consistency, maintainability, and high-quality user experiences.

## 1. Tech Stack Overview

*   **Framework**: Next.js 15.4.6 (App Router)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **UI Library**: Shadcn UI (Radix Primitives)
*   **Icons**: Lucide React
*   **State Management**: React Context, Hooks, Zustand (where applicable)
*   **AI Integration**: Google Gemini (Primary), Vertex AI (Imagen)

## 2. UI/UX Guidelines

### 2.1. Component Library
*   **Location**: `src/components/ui`
*   **Usage**: Always prefer existing Shadcn UI components over custom implementations.
*   **Pattern**: Import from `@/components/ui/[component-name]`.

### 2.2. Styling & Theming
*   **Tailwind CSS**: Use utility classes for all styling. Avoid CSS modules unless absolutely necessary for complex animations.
*   **Semantic Colors**: Use the project's custom semantic color palette defined in `tailwind.config.js`:
    *   `bg-sf-background` / `bg-sf-surface` for backgrounds.
    *   `text-sf-text-primary` / `text-sf-text-secondary` for typography.
    *   `text-sf-primary` / `bg-sf-primary` for brand accents (Blue).
    *   `border-sf-border` for dividers.
*   **Dark Mode**: The application is "Dark Mode First". Ensure all components look correct in dark mode using `dark:` modifiers if necessary, though the `sf-*` colors are designed to handle this automatically in many cases.

### 2.3. Typography
*   **Fluid Type**: Use the custom fluid typography scale for responsive text:
    *   `text-fluid-xs` to `text-fluid-4xl`
*   **Readability**: Use `leading-reading` or `leading-comfortable` for blocks of text.

### 2.4. Icons
*   **Library**: `lucide-react`
*   **Usage**: Import individual icons. Set explicit sizes (usually `w-4 h-4` or `w-5 h-5`) to match text scaling.

## 3. AI Model Integration Standards

### 3.1. Primary Model
*   **Model Name**: `gemini-3-pro-preview`
*   **Usage**: Use this model for all text generation, analysis, and reasoning tasks unless specified otherwise.

### 3.2. Implementation Pattern
*   **Library**: `@google/generative-ai`
*   **Initialization**:
    ```typescript
    import { GoogleGenerativeAI } from '@google/generative-ai'
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' })
    ```
*   **Error Handling**: Always wrap AI calls in `try/catch` blocks and provide graceful fallbacks or user-friendly error messages.

### 3.3. Image Generation
*   **Service**: Vertex AI (Imagen 3)
*   **Location**: `src/lib/vertexai` or `src/lib/imagen`
*   **Context**: Use `analyzeCharacterImage` (Gemini Vision) to extract prompts before generating new images to ensure consistency.

## 4. Code Structure & Architecture

### 4.1. Directory Structure
*   `src/app`: Next.js App Router pages and API routes.
*   `src/components`: React components.
    *   `src/components/ui`: Reusable primitive components (Buttons, Inputs, etc.).
    *   `src/components/vision`: Feature-specific components for the Vision workflow.
*   `src/lib`: Business logic, utilities, and API clients.
    *   `src/lib/gemini`: Gemini-specific logic.
    *   `src/lib/vertexai`: Vertex AI/Imagen logic.

### 4.2. State Management
*   **Local State**: Use `useState` for simple component-level state.
*   **Complex State**: Use `useReducer` or custom hooks for complex logic.
*   **Global State**: Use React Context or Zustand stores (e.g., `useOverlayStore`) for app-wide state.

## 5. Refactoring & Maintenance

*   **Consistency**: When modifying a file, adopt the existing coding style (indentation, naming conventions, import ordering).
*   **Safety**: Always verify that changes do not break the build (`npm run build`).
*   **Atomic Changes**: Make small, focused changes. Use `replace_string_in_file` carefully with sufficient context.
*   **Comments**: Add comments for complex logic, especially when dealing with AI prompt engineering or intricate state updates.

## 6. Deployment
*   **Script**: Use `./deploy-dol-production.sh` for production deployments.
*   **Checks**: The script automatically runs builds and tests. Do not bypass these checks.
