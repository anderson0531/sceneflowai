# SceneFlow AI - Complete Implementation

SceneFlow AI is an AI-powered video production platform that orchestrates the entire creation workflow, from ideation to automated editing and analysis. This repository contains the complete implementation of the platform as specified in the SceneFlow AI specification document.

## 🚀 Features Implemented

### ✅ **Core Infrastructure**
- **Unified Credit System** - Complete credit management with specific costs for each operation
- **BYOK (Bring Your Own Key) Integration** - Secure API key management for user-controlled generation
- **Subscription Management** - No free tier, subscription-first model with Stripe integration
- **Asynchronous Processing** - Celery/Redis integration for scalable rendering and analysis

### ✅ **Cue Assistant - AI Director**
- **Context-Aware Conversations** - Understands current workflow step and project context
- **Voice Interaction** - Speech-to-Text (STT) and Text-to-Speech (TTS) support
- **Natural Language Processing** - Iterate on projects using conversational commands
- **Multilingual Support** - English, Spanish, French with extensible i18n framework
- **Quick Actions** - One-tap common operations like "Make scene darker"

### ✅ **Enhanced 5-Step Workflow**
1. **Ideation** - AI-generated video ideas with YouTube reference analysis
2. **Storyboard** - Professional storyboard panels with technical specifications
3. **Scene Direction** - Downloadable direction packages for production teams
4. **Auto-Editor** - BYOK video generation with automated assembly and rendering
5. **AI Analysis** - Standard and advanced multimodal analysis with timestamped feedback

### ✅ **Mobile App Structure**
- **React Native/Expo** - Cross-platform mobile app with native performance
- **Dark Mode UI** - Cinematic, professional interface optimized for video creators
- **Responsive Design** - Adapts to different screen sizes and orientations
- **Offline Support** - Core functionality works without internet connection

## 🏗️ Architecture

### **Technology Stack**
- **Frontend**: Next.js (React), TypeScript, Tailwind CSS, Shadcn/UI
- **Backend**: Python (FastAPI) with Celery for async processing
- **Database**: Supabase (PostgreSQL) with encrypted storage
- **AI Integration**: Google Gemini API (BYOK model)
- **Mobile**: React Native/Expo with TypeScript
- **Payments**: Stripe (PWA), Apple/Google IAP (Mobile)

### **Credit System Architecture**
```
User Action → Credit Check → Task Execution → Credit Deduction
     ↓              ↓            ↓            ↓
  Reserve      Verify Balance  Process     Record Transaction
  Credits      Sufficient      Task        Update Ledger
```

### **BYOK Security Model**
```
User Input → Encryption → Secure Storage → Decryption → API Call
    ↓           ↓            ↓              ↓          ↓
  API Key    KMS/Vault   Database      Memory     Gemini/Veo
```

## 💰 Credit System Details

### **Credit Costs**
| Service | Detail | Credits | Rationale |
|---------|--------|---------|-----------|
| **Workflow** | Start New Project | 5 | Covers orchestration and project initiation |
| **Workflow** | Major Storyboard Regeneration | 5 | Manages resource-intensive iterations |
| **Step 4** | 1080p (HD) Rendering | 2/min | Covers cloud rendering API fees |
| **Step 4** | 4K (UHD) Rendering | 5/min | Reflects higher rendering costs |
| **Step 5** | Standard Analysis | 1/min | Covers transcription and standard LLM tokens |
| **Step 5** | Advanced Analysis | 4/min | Covers expensive multimodal LLM tokens |

### **Subscription Tiers**
| Tier | Price | Monthly Credits | Key Features |
|------|-------|-----------------|--------------|
| **Trial** | $5 (One-Time) | 50 Credits | 7-Day access, 1080p Max |
| **Creator** | $29/month | 150 Credits | 1080p Rendering, Standard Analysis |
| **Pro** | $79/month | 500 Credits | 4K Rendering, Advanced Analysis |
| **Studio** | $249/month | 1600 Credits | All Pro features, Priority Queue |

## 🔐 BYOK Implementation

### **Security Features**
- **Encrypted Storage** - API keys never stored in plain text
- **Key Validation** - Test calls verify key permissions before storage
- **Automatic Rotation** - Keys validated every 24 hours
- **User Control** - Complete control over generation costs and usage

### **Supported APIs**
- **Google Gemini** - Text generation, image analysis
- **Google Veo** - Video clip generation
- **Google Imagen** - Image generation (planned)

## 🎬 Workflow Implementation

### **Step 1: Ideation**
- AI-powered idea generation using user's BYOK key
- YouTube reference search with AI analysis
- 4 distinct video concepts with "Why It Works" explanations
- Credit cost: 5 credits

### **Step 2: Storyboard**
- Professional storyboard panels with technical specifications
- Visual generation via BYOK (Gemini API)
- Audio cues and action descriptions
- Credit cost: 5 credits for regeneration

### **Step 3: Scene Direction**
- Technical blueprint for production teams
- Downloadable packages (Pro/Studio tiers)
- Scene-by-scene specifications and notes
- Credit cost: 3 credits

### **Step 4: Auto-Editor**
- Multi-stage Celery workflow for video generation
- BYOK video clip generation (Veo API)
- Automated assembly and rendering
- Credit cost: 2-5 credits per minute based on resolution

### **Step 5: AI Analysis**
- Standard analysis: Pacing, script adherence
- Advanced analysis: Hook, engagement, visual consistency
- Timestamped feedback and recommendations
- Credit cost: 1-4 credits per minute based on analysis type

## 🌍 Internationalization (i18n)

### **Supported Languages**
- **English** (en) - Primary language
- **Spanish** (es) - Full translation
- **French** (fr) - Full translation
- **Extensible** - Easy to add new languages

### **Localized Features**
- **UI Text** - All static text translated
- **Cue Assistant** - Responds in user's language
- **Error Messages** - Localized error handling
- **Date/Time** - Localized formatting

## 📱 Mobile App Features

### **Core Components**
- **Navigation** - Stack and tab navigation with React Navigation
- **Theme System** - Dark/light themes with consistent design
- **Cue Assistant** - Floating AI assistant with voice interaction
- **Offline Support** - Core functionality without internet

### **Platform Support**
- **iOS** - Native iOS app with App Store distribution
- **Android** - Native Android app with Play Store distribution
- **PWA** - Progressive Web App for cross-platform access

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+ and npm/yarn
- Python 3.9+ and pip
- Expo CLI for mobile development
- Supabase account for database
- Stripe account for payments

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/sceneflow-ai.git
   cd sceneflow-ai
   ```

2. **Install web dependencies**
   ```bash
   npm install
   ```

3. **Install mobile dependencies**
   ```bash
   cd mobile-app
   npm install
   ```

4. **Set up environment variables**
```bash
   cp .env.example .env
   # Fill in your API keys and configuration
   ```

5. **Start development servers**
```bash
   # Web app
   npm run dev
   
   # Mobile app
   cd mobile-app
   npm start
   ```

## 🔧 Configuration

### **Environment Variables**
```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# Redis
REDIS_URL=your_redis_url

# Google Cloud (for KMS)
GOOGLE_CLOUD_PROJECT=your_project_id
GOOGLE_CLOUD_LOCATION=your_location
```

### **BYOK Configuration**
```javascript
// Configure supported API providers
const BYOK_PROVIDERS = {
  GEMINI: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    models: ['gemini-pro', 'gemini-pro-vision']
  },
  VEO: {
    name: 'Google Veo',
    baseUrl: 'https://veo.googleapis.com',
    models: ['veo-1']
  }
};
```

## 📊 API Endpoints

### **Core Workflow**
- `POST /api/workflow/ideation` - Generate video ideas
- `POST /api/workflow/storyboard` - Create storyboard
- `POST /api/workflow/scene-direction` - Generate direction package
- `POST /api/workflow/video-generation` - Generate video
- `POST /api/workflow/analysis` - Analyze video

### **Credit Management**
- `GET /api/credits/balance` - Get current credit balance
- `POST /api/credits/reserve` - Reserve credits for operation
- `POST /api/credits/deduct` - Deduct credits after completion
- `GET /api/credits/history` - Get transaction history

### **BYOK Management**
- `POST /api/byok/setup` - Set up API key
- `GET /api/byok/status` - Check key validity
- `POST /api/byok/validate` - Validate API key
- `DELETE /api/byok/remove` - Remove API key

## 🧪 Testing

### **Run Tests**
```bash
# Web app tests
npm test

# Mobile app tests
cd mobile-app
npm test

# E2E tests
npm run test:e2e
```

### **Test Coverage**
- **Unit Tests**: Core business logic and utilities
- **Integration Tests**: API endpoints and database operations
- **E2E Tests**: Complete user workflows
- **Mobile Tests**: React Native component testing

## 🚀 Deployment

### **Web App Deployment**
```bash
# Build for production
npm run build

# Deploy to Vercel/Netlify
npm run deploy
```

### **Mobile App Deployment**
```bash
# Build for production
cd mobile-app
expo build:android
expo build:ios

# Submit to stores
expo submit:android
expo submit:ios
```

### **Backend Deployment**
```bash
# Deploy FastAPI to production
docker-compose up -d

# Deploy Celery workers
celery -A app.celery worker --loglevel=info
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Development Guidelines**
- Follow TypeScript best practices
- Write comprehensive tests for new features
- Update documentation for API changes
- Follow the established code style and architecture

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.sceneflow.ai](https://docs.sceneflow.ai)
- **Issues**: [GitHub Issues](https://github.com/yourusername/sceneflow-ai/issues)
- **Discord**: [SceneFlow AI Community](https://discord.gg/sceneflow-ai)
- **Email**: support@sceneflow.ai

## 🎯 Roadmap

### **Phase 1: Foundation & Monetization** ✅
- [x] User authentication and database
- [x] Subscription management with Stripe
- [x] BYOK secure storage and validation
- [x] Unified credit system implementation

### **Phase 2: Creative Core & Cue** ✅
- [x] 5-step workflow implementation
- [x] Cue Assistant with voice interaction
- [x] Internationalization framework
- [x] Storyboard and scene direction generation

### **Phase 3: Automation & Auto-Editor** 🚧
- [x] BYOK video clip generation
- [x] Prompt builder engine
- [x] JSON descriptor generation
- [ ] Editframe/Shotstack integration
- [ ] Asynchronous job management

### **Phase 4: Analysis & Refinement** 📋
- [ ] Standard and advanced multimodal analysis
- [ ] Collaboration features and commenting
- [ ] Mobile app wrappers
- [ ] Performance optimization

---

**SceneFlow AI** - Transforming video production with AI-powered orchestration and automation.
