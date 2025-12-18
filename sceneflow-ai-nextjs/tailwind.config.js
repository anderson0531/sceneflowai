/** @type {import('tailwindcss').Config} */
module.exports = {
  // Use 'class' strategy for dark mode, allowing us to force it in the layout
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontSize: {
        // Fluid typography scale for responsive design
        'fluid-xs': 'clamp(0.75rem, 0.5vw + 0.625rem, 0.875rem)',
        'fluid-sm': 'clamp(0.875rem, 0.5vw + 0.75rem, 1rem)',
        'fluid-base': 'clamp(1rem, 0.5vw + 0.875rem, 1.125rem)',
        'fluid-lg': 'clamp(1.125rem, 1vw + 0.5rem, 1.25rem)',
        'fluid-xl': 'clamp(1.25rem, 1.5vw + 0.5rem, 1.5rem)',
        'fluid-2xl': 'clamp(1.5rem, 2vw + 0.5rem, 2rem)',
        'fluid-3xl': 'clamp(1.875rem, 2.5vw + 0.75rem, 2.5rem)',
        'fluid-4xl': 'clamp(2.25rem, 3vw + 1rem, 3rem)',
      },
      lineHeight: {
        'reading': '1.75',
        'comfortable': '1.7',
        'condensed': '1.4',
      },
      colors: {
        // Sophisticated Dark Theme Palette (WCAG AA Compliant)
        // Backgrounds (The "Black" Style)
        'sf-background': '#121212',        // Main application background
        'sf-surface': '#1E1E1E',          // Base surface for cards, menus
        'sf-surface-light': '#272727',    // Hover states, secondary surfaces
        'sf-surface-elevated': '#2D2D2D', // Modals, drawers, elevated surfaces
        
        // Typography (High Contrast for WCAG AA)
        'sf-text-primary': '#F5F5F5',     // High emphasis - titles, key info
        'sf-text-secondary': '#B0B0B0',   // Medium emphasis - body text
        'sf-text-disabled': '#616161',    // Disabled states, placeholders
        
        // Borders and Dividers
        'sf-border': '#3A3A3A',           // Subtle borders, separators
        'sf-border-strong': '#4A4A4A',    // Stronger borders when needed
        
        // Accent Colors (Professional Blue)
        'sf-primary': '#3B82F6',          // Primary blue for CTAs, links
        'sf-primary-dark': '#2563EB',     // Darker blue for hover states
        'sf-primary-light': '#60A5FA',    // Lighter blue for highlights
        'sf-accent': '#6366F1',           // Indigo for secondary actions
        'sf-accent-light': '#A5B4FC',     // Light indigo for subtle accents
        
        // Control Elements
        'sf-control': '#2A2A2A',          // Input backgrounds
        'sf-control-hover': '#323232',    // Input hover states
        
        // Focus and Interactive States
        'sf-focus-ring': 'rgba(0, 191, 165, 0.6)', // Primary focus ring
        'sf-focus-ring-accent': 'rgba(29, 233, 182, 0.6)', // Accent focus ring
      },
      // Subtle shadows for elevation-based design
      boxShadow: {
        'sf-subtle': '0 1px 3px rgba(0, 0, 0, 0.12)',
        'sf-elevated': '0 4px 12px rgba(0, 0, 0, 0.15)',
        'sf-modal': '0 8px 32px rgba(0, 0, 0, 0.24)',
      },
      // Background images for gradients and atmosphere
      backgroundImage: {
        // Primary CTA Gradient
        'sf-gradient': 'linear-gradient(90deg, #00BFA5 0%, #1DE9B6 100%)',
        // Subtle surface gradients
        'sf-surface-gradient': 'linear-gradient(180deg, #272727 0%, #1E1E1E 100%)',
        'sf-control-gradient': 'linear-gradient(180deg, #323232 0%, #2A2A2A 100%)',
        // Atmospheric radial gradient
        'sf-radial-atmosphere': 'radial-gradient(circle at center top, rgba(0, 191, 165, 0.08) 0%, rgba(18, 18, 18, 0) 60%)',
      },
      // Custom animations for cinematic experience
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'fadeIn': 'fadeIn 0.5s ease-in-out forwards',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [],
}

