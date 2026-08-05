/**
 * Opt-in lint pass that keeps extracted surfaces extracted.
 *
 * Deliberately a separate config: the main `eslint.config.mjs` ignores
 * `src/components/**` and `src/app/dashboard/**` wholesale, so a rule added
 * there would never run. This one lists only the files that have already been
 * converted to the message catalog, and the list grows as extraction proceeds —
 * which makes the guard meaningful instead of a wall of pre-existing warnings
 * nobody can act on.
 *
 * Run with: npm run lint:i18n
 */
const eslintConfig = [
  {
    files: [
      'src/components/i18n/**/*.tsx',
      'src/components/layout/GlobalHeader.tsx',
      'src/app/dashboard/settings/SettingsLayoutClient.tsx',
      'src/app/dashboard/settings/profile/page.tsx',
      // Blueprint Studio chrome. The wildcard stands in for [projectId]: in a
      // glob, brackets read as a character class and the path never matches.
      'src/app/dashboard/studio/*/StudioPageClient.tsx',
      'src/components/blueprint/TreatmentCard.tsx',
      'src/components/blueprint/SidePanelTabs.tsx',
      'src/components/blueprint/AudienceResonancePanelV3.tsx',
      'src/components/blueprint/NarrativeReasoningPanel.tsx',
      'src/components/blueprint/BlueprintNextStepBanner.tsx',
      'src/components/blueprint/BlueprintResonanceStrip.tsx',
      'src/components/blueprint/BlueprintRefineDiffBanner.tsx',
      'src/components/blueprint/AssistantButton.tsx',
      'src/components/blueprint/BlueprintRefineDialog.tsx',
      'src/components/blueprint/BlueprintReimaginDialog.tsx',
      'src/components/blueprint/StartProductionDialog.tsx',
      'src/components/blueprint/BlueprintOnboarding.tsx',
      'src/components/treatment/TreatmentHeroImage.tsx',
    ],
    // Development-only tooling whose labels are debug output, not user copy.
    ignores: ['src/components/i18n/UntranslatedStringOverlay.tsx'],
    languageOptions: {
      parser: (await import('@typescript-eslint/parser')).default,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      react: (await import('eslint-plugin-react')).default,
    },
    rules: {
      'react/jsx-no-literals': [
        'error',
        {
          noStrings: true,
          // Punctuation, arrows and separators carry no meaning to translate.
          allowedStrings: [
            '·',
            '—',
            '–',
            '…',
            '←',
            '→',
            ':',
            '/',
            '%',
            '+',
            '(',
            ')',
            ',',
            '.',
            '✓',
            '✕',
          ],
          ignoreProps: true,
          noAttributeStrings: false,
        },
      ],
    },
  },
]

export default eslintConfig
