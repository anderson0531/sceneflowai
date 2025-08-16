# SceneFlow AI - Next.js PWA

A modern, AI-powered video creation platform built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Features

### Core Functionality
- **4-Step Workflow**: Ideation → Storyboard → Scene Direction → Video Generation
- **PWA Support**: Installable web app with offline capabilities
- **BYOK Integration**: Bring Your Own Key for AI service providers
- **Global State Management**: Zustand-powered state management
- **Responsive Design**: Mobile-first, responsive UI

### Technical Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **PWA**: next-pwa
- **Icons**: Lucide React
- **Theme**: Light/Dark mode support

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── dashboard/         # Dashboard pages
│   │   ├── settings/      # Settings pages (including BYOK)
│   │   └── workflow/      # Workflow step pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable components
│   ├── layout/           # Layout components
│   ├── ui/               # UI components
│   └── workflow/         # Workflow-specific components
├── lib/                  # Utility functions
├── store/                # Zustand store
└── types/                # TypeScript type definitions
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sceneflow-ai-nextjs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## 🔧 Configuration

### PWA Settings
The PWA is configured in `next.config.js` with:
- Service worker registration
- Runtime caching strategies
- Offline support
- Install prompts

### BYOK Configuration
Configure your own API keys for:
- **LLM Provider**: Google Gemini, OpenAI GPT, Anthropic Claude
- **Image Generation**: Google Gemini, OpenAI DALL-E, Stability AI
- **Video Generation**: Google Veo, Runway ML, Pika Labs

## 📱 PWA Features

- **Installable**: Add to home screen
- **Offline Support**: Service worker caching
- **App-like Experience**: Full-screen mode
- **Push Notifications**: (Coming soon)

## 🎨 Design System

Built with a comprehensive design system using:
- **Color Variables**: HSL-based color system
- **Typography**: Inter font family
- **Spacing**: Consistent spacing scale
- **Components**: Reusable UI components
- **Dark Mode**: System preference support

## 🔐 Security

- API keys are encrypted and stored securely
- No access to user API keys by the platform
- Secure transmission of all data
- Regular security audits

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Docker
```bash
docker build -t sceneflow-ai .
docker run -p 3000:3000 sceneflow-ai
```

## 📊 Performance

- **Lighthouse Score**: 95+ (PWA, Performance, Accessibility, Best Practices)
- **Core Web Vitals**: Optimized for all metrics
- **Bundle Size**: Optimized with Next.js built-in optimizations
- **Caching**: Intelligent service worker caching strategies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.sceneflowai.com](https://docs.sceneflowai.com)
- **Issues**: [GitHub Issues](https://github.com/sceneflowai/sceneflow-ai/issues)
- **Discord**: [Join our community](https://discord.gg/sceneflowai)

## 🔮 Roadmap

- [ ] AI-powered video editing
- [ ] Collaborative projects
- [ ] Advanced analytics
- [ ] Mobile app (React Native)
- [ ] Enterprise features
- [ ] API marketplace

---

Built with ❤️ by the SceneFlow AI Team
