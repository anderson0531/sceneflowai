/** Engineering & Trust section — display strings for landing i18n. */

export const ENGINEERING_TRUST_COPY = {
  badge: 'Engineering & Security',
  title: 'Built for',
  titleAccent: 'Production Workloads',
  subtitle:
    'Startup-friendly architecture with Google Cloud components that support security, scale, and practical production delivery.',
  pillars: [
    {
      id: 'architecture',
      title: 'Enterprise Architecture',
      description:
        'Built on Google Cloud infrastructure with scalable orchestration for production workloads and growing teams.',
      highlights: [
        'Vertex AI for generation workflows',
        'Imagen 4 and Veo 3.1 synthesis',
        'ElevenLabs TTS integration',
        'BYOK for enterprise billing control',
      ],
    },
    {
      id: 'security',
      title: 'Security & Privacy',
      description:
        'Creative assets stay protected with encryption at rest, access controls, and privacy-first handling.',
      highlights: [
        'Enterprise-ready cloud controls',
        'AES-256 encryption',
        'Designed with GDPR considerations',
        'See our Privacy Policy for data handling',
      ],
    },
    {
      id: 'scale',
      title: 'Scale & Reliability',
      description:
        'Global cloud delivery supports reliable render and review pipelines as your volume grows.',
      highlights: [
        'Multi-region deployment',
        'CDN-accelerated delivery',
        'Automatic failover',
        'Real-time monitoring',
      ],
    },
  ],
  metrics: [
    { value: 'Global', label: 'Cloud delivery' },
    { value: 'Imagen 4', label: 'Image generation' },
    { value: '256-bit', label: 'Encryption' },
    { value: '24/7', label: 'Monitoring' },
  ],
  vertexSection: {
    title: 'Why Google Vertex AI?',
    subtitle: 'The technical moat that matters',
    cards: [
      {
        title: 'Data Privacy',
        description:
          'Your scripts and creative assets are not used to train shared models, helping protect your IP and client work.',
        highlight: 'not used to train shared models',
      },
      {
        title: 'Built for Reliable Throughput',
        description:
          'Production-oriented infrastructure helps maintain stable generation workflows during high-demand cycles.',
      },
      {
        title: 'Reference-Aware Consistency',
        description:
          'SceneFlow uses reference-aware generation to improve consistency across characters, locations, and props from scene to scene.',
      },
    ],
  },
  partnership: {
    poweredBy:
      'Powered by Google Cloud with Vertex AI, Cloud Storage, and translation tooling',
    footnote:
      'SceneFlow AI runs on scalable Google Cloud infrastructure designed for startup growth and enterprise expectations.',
  },
  trustSafeguardLink:
    'Layered trust: Google Vertex safety plus SceneFlow guardrails, validation, and provenance — see Trust & Safety below.',
  attribution: '— The SceneFlow Engineering Team',
} as const
