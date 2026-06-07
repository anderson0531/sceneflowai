/** Trust & Safety Safeguard section — landing i18n source. */

export const TRUST_SAFEGUARD_COPY = {
  badge: 'Trust & Safety',
  title: 'Layered Guardrails for',
  titleAccent: 'Creators & Platforms',
  subtitle:
    'Google-native safety on every generation, Extended Creative Services with Guardrails when policy limits apply, and additional moderation and risk mitigation across your Studio workflow.',
  tiers: [
    {
      id: 'google-native',
      title: 'Google-Native Safety',
      description:
        'Every image and video generation runs through Google Vertex AI safety filters with thresholds tuned for professional creative workflows—not consumer-grade defaults.',
      highlights: [
        'Vertex Responsible AI on Veo, Imagen, and Gemini generation',
        'Production-tuned harm thresholds for cinematic content',
        'Your creative assets are not used to train shared models',
      ],
      badge: 'Vertex Responsible AI',
    },
    {
      id: 'extended-guardrails',
      title: 'Extended Guardrails',
      description:
        'When the primary path is blocked by policy, Extended Creative Services with Guardrails can complete delivery—only after an additional content review pass before storage.',
      highlights: [
        'Prompt adjustment and method retries on the primary Google path',
        'Guarded fallback path with mandatory pre-storage review',
        'Same content standards across primary and extended paths',
      ],
      badge: 'Guarded fallback',
    },
    {
      id: 'validation-provenance',
      title: 'Validation & Provenance',
      description:
        'Additional moderation and risk mitigation is available across Blueprint, script, pre-vis, and segment video—using the same credit model as other Studio tools. Successful clips receive signed content provenance records.',
      highlights: [
        'Content validation signals before heavy render spend',
        'Signed content hash and provenance metadata on segment video',
        'Audit logs, violation tracking, and abuse reporting for platform protection',
      ],
      badge: 'Content validation',
    },
  ],
  flowSteps: [
    { label: 'Primary', detail: 'Google Vertex safety' },
    { label: 'Extended', detail: 'Guarded creative fallback' },
    { label: 'Studio', detail: 'Moderation & risk mitigation' },
    { label: 'Forensic', detail: 'Signed provenance' },
  ],
  morNote:
    'SceneFlow operates shared responsibility with our Merchant of Record: provider-scale safety from Google, platform guardrails and audit trails from SceneFlow—reducing risk for creators and the platform alike.',
  ctaPolicy: 'Read Trust & Safety Policy',
  ctaPolicyHref: '/trust-safety',
  ctaStudio: 'Explore in Studio',
} as const
