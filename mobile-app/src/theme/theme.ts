import { DefaultTheme, DarkTheme } from 'react-native-paper';

// SceneFlow AI Brand Colors
export const brandColors = {
  primary: '#4A90E2',      // Primary blue
  secondary: '#50E3C2',    // Teal accent
  accent: '#F5A623',       // Orange accent
  success: '#7ED321',      // Green success
  warning: '#F5A623',      // Orange warning
  error: '#D0021B',        // Red error
  info: '#4A90E2',         // Blue info
};

// Dark Theme (Preferred)
export const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: brandColors.primary,
    accent: brandColors.accent,
    background: '#1a1a1a',
    surface: '#2d2d2d',
    card: '#2d2d2d',
    text: '#ffffff',
    textSecondary: '#cccccc',
    border: '#404040',
    notification: brandColors.primary,
    onSurface: '#ffffff',
    surfaceVariant: '#3d3d3d',
    outline: '#666666',
    outlineVariant: '#404040',
    inverseSurface: '#ffffff',
    inverseOnSurface: '#1a1a1a',
    inversePrimary: brandColors.primary,
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    elevation: {
      level0: 'transparent',
      level1: '#2d2d2d',
      level2: '#3d3d3d',
      level3: '#4d4d4d',
      level4: '#5d5d5d',
      level5: '#6d6d6d',
    },
  },
  dark: true,
};

// Light Theme
export const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: brandColors.primary,
    accent: brandColors.accent,
    background: '#ffffff',
    surface: '#f5f5f5',
    card: '#ffffff',
    text: '#1a1a1a',
    textSecondary: '#666666',
    border: '#e0e0e0',
    notification: brandColors.primary,
    onSurface: '#1a1a1a',
    surfaceVariant: '#f0f0f0',
    outline: '#cccccc',
    outlineVariant: '#e0e0e0',
    inverseSurface: '#1a1a1a',
    inverseOnSurface: '#ffffff',
    inversePrimary: brandColors.primary,
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.3)',
    elevation: {
      level0: 'transparent',
      level1: '#ffffff',
      level2: '#f5f5f5',
      level3: '#f0f0f0',
      level4: '#ebebeb',
      level5: '#e5e5e5',
    },
  },
  dark: false,
};

// Typography
export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    light: 'System',
    thin: 'System',
  },
  fontSize: {
    h1: 32,
    h2: 28,
    h3: 24,
    h4: 20,
    h5: 18,
    h6: 16,
    body1: 16,
    body2: 14,
    caption: 12,
    button: 14,
    overline: 10,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    light: '300',
    thin: '100',
    bold: '700',
  },
  lineHeight: {
    h1: 40,
    h2: 36,
    h3: 32,
    h4: 28,
    h5: 24,
    h6: 20,
    body1: 24,
    body2: 20,
    caption: 16,
    button: 20,
    overline: 16,
  },
};

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border Radius
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 50,
};

// Shadows
export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 12,
  },
};

// Animation
export const animation = {
  duration: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// Export default theme
export default darkTheme;
