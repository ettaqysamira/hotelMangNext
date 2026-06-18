/**
 * Palette Minimaliste - Cyan Uniquement
 * Design System pour Roomify
 * 
 * Couleur principale:
 * - Fond: Violet-bleu profond (#0a0f1f)
 * - Primaire/Accent: Cyan brillant (#00ffff)
 * - Texte: Blanc immaculé (#f8f9ff)
 */

export const COLOR_PALETTE = {
  // Backgrounds
  background: {
    primary: '#0a0f1f',      // Main background (deep navy-purple)
    secondary: '#141b2e',    // Secondary surface
    tertiary: '#1f2844',     // Tertiary surface
    elevated: '#0a0f1f',     // Elevated surfaces
  },

  // Text
  text: {
    primary: '#f8f9ff',      // Primary text (pristine white)
    secondary: '#a8c5ff',    // Secondary text (light blue)
    tertiary: '#7a8fb8',     // Tertiary text (muted blue)
    muted: '#5a6a8a',        // Muted text
  },

  // Primary - Cyan/Turquoise (SEULE COULEUR)
  primary: {
    50: '#e0ffff',
    100: '#c0ffff',
    200: '#80ffff',
    300: '#40ffff',
    400: '#00ffff',    // Main
    500: '#00e6e6',
    600: '#00cccc',
    700: '#0099cc',
    800: '#006666',
    900: '#003333',
  },

  // Borders
  border: {
    light: '#1f2844',
    medium: '#2a3a5a',
    dark: '#1a2540',
  },

  // Semantic Colors (tous cyan)
  semantic: {
    success: '#00ffff',
    warning: '#00ffff',
    error: '#00ffff',
    info: '#00ffff',
  },

  // Gradients (cyan uniquement)
  gradients: {
    primary: 'linear-gradient(135deg, #00ffff 0%, #40ffff 100%)',
  },

  // Shadow/Glow Effects (cyan uniquement)
  glow: {
    cyan: '0 0 20px rgba(0, 255, 255, 0.3)',
    neonCyan: '0 0 10px rgba(0, 255, 255, 0.5), inset 0 0 10px rgba(0, 255, 255, 0.2)',
  },
} as const;

// Helper functions for color usage
export const getColorClass = (colorName: keyof typeof COLOR_PALETTE, shade?: string): string => {
  return `text-${colorName}-${shade || '400'}`;
};

export const getBgColorClass = (colorName: keyof typeof COLOR_PALETTE, shade?: string): string => {
  return `bg-${colorName}-${shade || '400'}`;
};

export const getBorderColorClass = (colorName: keyof typeof COLOR_PALETTE, shade?: string): string => {
  return `border-${colorName}-${shade || '400'}`;
};
