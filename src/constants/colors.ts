export const DarkColors = {
  background: {
    primary: '#000814',          // Main app background (deep navy/black)
    secondary: '#0A0F1A',        // Card background, elevated surfaces
    tertiary: '#111827',         // Subtle differentiation
  },

  text: {
    primary: '#FFFFFF',          // Main text
    secondary: '#B3B3B3',        // Secondary text
    tertiary: '#808080',         // Muted text
    placeholder: '#666666',      // Input placeholders
  },

  accent: {
    primary: '#00A8FF',          // Neon blue - main accent
    primaryGlow: 'rgba(0, 168, 255, 0.4)', // Glow effect
    secondary: '#0090E0',        // Darker blue for pressed states
  },

  status: {
    success: '#34C759',
    error: '#FF4D4D',
    warning: '#FFB800',
  },

  border: {
    primary: '#1F2937',          // Subtle borders
    secondary: '#374151',        // More visible borders
    active: '#00A8FF',           // Active/focused state
  },

  tabBar: {
    background: '#000814',
    activeTab: '#00A8FF',
    inactiveTab: '#666666',
    border: '#1F2937',
  },

  overlay: {
    dark: 'rgba(0, 0, 0, 0.5)',
    blur: 'rgba(0, 8, 20, 0.8)',
  },

  transparent: 'transparent',
} as const;

export const LightColors = {
  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    tertiary: '#EBEBEB',
  },

  text: {
    primary: '#1A1A1A',
    secondary: '#666666',
    tertiary: '#999999',
    placeholder: '#AAAAAA',
  },

  accent: {
    primary: '#00A8FF',          // Same neon blue
    primaryGlow: 'rgba(0, 168, 255, 0.3)',
    secondary: '#0090E0',
  },

  status: {
    success: '#34C759',
    error: '#FF4D4D',
    warning: '#FFB800',
  },

  border: {
    primary: '#E5E5E5',
    secondary: '#D0D0D0',
    active: '#00A8FF',
  },

  tabBar: {
    background: '#FFFFFF',
    activeTab: '#00A8FF',
    inactiveTab: '#999999',
    border: '#E5E5E5',
  },

  overlay: {
    dark: 'rgba(0, 0, 0, 0.3)',
    blur: 'rgba(255, 255, 255, 0.8)',
  },

  transparent: 'transparent',
} as const;

// Color palette interface
export interface ColorPalette {
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    placeholder: string;
  };
  accent: {
    primary: string;
    primaryGlow: string;
    secondary: string;
  };
  status: {
    success: string;
    error: string;
    warning: string;
  };
  border: {
    primary: string;
    secondary: string;
    active: string;
  };
  tabBar: {
    background: string;
    activeTab: string;
    inactiveTab: string;
    border: string;
  };
  overlay: {
    dark: string;
    blur: string;
  };
  transparent: string;
}

export function getColors(theme: 'light' | 'dark'): ColorPalette {
  return theme === 'light' ? LightColors : DarkColors;
}

// Default export (dark theme)
export const Colors = DarkColors;
export default Colors;
