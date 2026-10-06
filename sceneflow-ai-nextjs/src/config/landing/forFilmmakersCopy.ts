/** Originals Seed Program — filmmaker capture on the landing page. */

export const FOR_FILMMAKERS_COPY = {
  badge: 'Apply for the SceneFlow Originals Seed Program',
  heading: 'For Filmmakers: Submit your pilot for platform distribution and monetization.',
  subtitle:
    'The SceneFlow Network is a closed Founding Creator cohort — 5 to 10 hand-picked titles at launch, not an open marketplace. Revenue share starts only after paying subscribers exist. What we offer now is distribution leverage: funded teaser ads in exchange for an exclusive premiere window.',
  closedNote:
    'Applications are reviewed by editors. Submitting does not publish your film to a catalog.',
  fields: {
    email: 'Email',
    emailPlaceholder: 'you@studio.com',
    name: 'Your name',
    namePlaceholder: 'Director or producer name',
    title: 'Pilot or feature title',
    titlePlaceholder: 'Working title',
    logline: 'Logline',
    loglinePlaceholder: 'One or two sentences that sell the story.',
    audienceUrl: 'Existing audience',
    audiencePlaceholder: 'YouTube, Bilibili, festival, or social URL',
    exclusivePremiere: 'I am open to an exclusive premiere window on SceneFlow in exchange for funded teaser ads.',
  },
  submit: 'Submit application',
  submitting: 'Sending…',
  successTitle: 'Check your inbox.',
  successBody: 'We sent a confirmation link. Click it to lock in your Seed application. Nothing else.',
  errorEmpty: 'Fill in every field so we can review your pilot.',
  errorInvalidEmail: 'That email doesn’t look right. Check it and try again.',
  errorInvalidUrl: 'Add a public URL for your existing audience.',
  errorGeneric: 'Something went wrong. Try again in a moment.',
  confirmTitle: 'Application received.',
  confirmBody:
    'You’re in the Seed review queue. We read every submission. This is not a public catalog listing.',
  confirmExpiredTitle: 'That link expired.',
  confirmExpiredBody: 'Submit the filmmaker form again and we’ll send a new confirmation link.',
  confirmInvalidTitle: 'That link isn’t valid.',
  confirmInvalidBody: 'Request a new confirmation from the filmmaker form.',
  confirmHome: 'Back to SceneFlow',
  privacy: 'We email a confirmation link first. Editors only. No spam.',
} as const
