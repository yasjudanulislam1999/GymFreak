// GymFreak App - Futuristic Dark Neon Theme
// Central theme configuration for consistent UI across the app

export const theme = {
  // Color Palette
  colors: {
    // Primary Mode: Dark (default)
    primary: {
      background: '#0E0E0F',
      surface: '#1A1A1C',
      accent: '#00FF7F', // Neon Mint
      accentSecondary: '#0077FF', // Electric Blue
      text: '#FFFFFF',
      textSecondary: '#B5B5B8',
      error: '#FF3B30',
      border: '#2A2A2D',
      borderLight: '#2B2B2D',
      inactive: '#5B5B5B',
    },
    
    // Light Mode (for future toggle)
    light: {
      background: '#FFFFFF',
      surface: '#F8F9FA',
      accent: '#00BFA6',
      accentSecondary: '#0077FF',
      text: '#1A1A1C',
      textSecondary: '#5B5B5B',
      error: '#FF3B30',
      border: '#E1E5E9',
      borderLight: '#F1F3F4',
      inactive: '#9AA0A6',
    }
  },

  // Gradients
  gradients: {
    accent: 'linear-gradient(90deg, #00FF7F, #00BFA6)',
    background: 'linear-gradient(180deg, #0E0E0F, #1A1A1C)',
    cardHover: 'linear-gradient(135deg, #1A1A1C, #2A2A2D)',
  },

  // Typography
  typography: {
    fontFamily: {
      primary: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      bold: 'Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    fontSize: {
      title: '24px',
      subtitle: '20px',
      body: '16px',
      bodySmall: '14px',
      button: '16px',
      caption: '12px',
    },
    fontWeight: {
      regular: '400',
      medium: '500',
      semiBold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.2',
      normal: '1.5',
      relaxed: '1.6',
    }
  },

  // Spacing
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },

  // Border Radius
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '14px',
    xl: '20px',
    full: '50%',
  },

  // Shadows
  shadows: {
    glow: {
      accent: '0 0 20px rgba(0, 255, 127, 0.3)',
      blue: '0 0 20px rgba(0, 119, 255, 0.3)',
      card: '0 4px 20px rgba(0, 0, 0, 0.3)',
    },
    normal: {
      sm: '0 2px 8px rgba(0, 0, 0, 0.1)',
      md: '0 4px 16px rgba(0, 0, 0, 0.2)',
      lg: '0 8px 32px rgba(0, 0, 0, 0.3)',
    }
  },

  // Component Styles
  components: {
    button: {
      primary: {
        background: 'linear-gradient(90deg, #00FF7F, #00BFA6)',
        color: '#FFFFFF',
        borderRadius: '14px',
        padding: '12px 24px',
        fontSize: '16px',
        fontWeight: '600',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 16px rgba(0, 255, 127, 0.2)',
        '&:hover': {
          boxShadow: '0 0 20px rgba(0, 255, 127, 0.7)',
          transform: 'translateY(-2px)',
        },
        '&:active': {
          transform: 'translateY(0)',
          boxShadow: '0 0 30px rgba(0, 255, 127, 0.8)',
        }
      },
      secondary: {
        background: 'transparent',
        color: '#00FF7F',
        borderRadius: '14px',
        padding: '12px 24px',
        fontSize: '16px',
        fontWeight: '600',
        border: '2px solid #00FF7F',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        '&:hover': {
          background: 'rgba(0, 255, 127, 0.1)',
          boxShadow: '0 0 20px rgba(0, 255, 127, 0.3)',
        }
      }
    },
    
    card: {
      background: '#1A1A1C',
      border: '1px solid #2A2A2D',
      borderRadius: '16px',
      padding: '20px',
      transition: 'all 0.3s ease',
      '&:hover': {
        borderColor: '#00FF7F',
        boxShadow: '0 0 20px rgba(0, 255, 127, 0.1)',
      }
    },
    
    input: {
      background: '#1A1A1C',
      border: '1px solid #2B2B2D',
      borderRadius: '12px',
      padding: '12px 16px',
      color: '#FFFFFF',
      fontSize: '16px',
      transition: 'all 0.3s ease',
      '&:focus': {
        outline: 'none',
        borderColor: '#00FF7F',
        boxShadow: '0 0 0 3px rgba(0, 255, 127, 0.1)',
      },
      '&::placeholder': {
        color: '#B5B5B8',
      }
    },
    
    progressRing: {
      stroke: '#00FF7F',
      strokeWidth: '8',
      fill: 'transparent',
      filter: 'drop-shadow(0 0 10px rgba(0, 255, 127, 0.5))',
    },
    
    navigation: {
      background: '#121214',
      activeColor: '#00FF7F',
      inactiveColor: '#5B5B5B',
      borderRadius: '20px 20px 0 0',
    }
  },

  // Animation
  animation: {
    shimmer: {
      background: 'linear-gradient(90deg, transparent, rgba(0, 255, 127, 0.2), transparent)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 2s infinite',
    },
    glow: {
      animation: 'glow 2s ease-in-out infinite alternate',
    },
    fadeIn: {
      animation: 'fadeIn 0.3s ease-out',
    },
    slideUp: {
      animation: 'slideUp 0.3s ease-out',
    }
  }
};

// CSS Keyframes for animations
export const keyframes = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  @keyframes glow {
    from { box-shadow: 0 0 20px rgba(0, 255, 127, 0.3); }
    to { box-shadow: 0 0 30px rgba(0, 255, 127, 0.6); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

// Utility functions
export const getThemeColor = (colorPath: string, mode: 'dark' | 'light' = 'dark'): string => {
  const path = colorPath.split('.');
  let color: any = mode === 'dark' ? theme.colors.primary : theme.colors.light;
  
  for (const key of path) {
    color = color[key];
  }
  
  return color;
};

export const createGradient = (direction: string, ...colors: string[]) => {
  return `linear-gradient(${direction}, ${colors.join(', ')})`;
};

export const createGlow = (color: string, intensity: number = 0.3) => {
  return `0 0 20px rgba(${color}, ${intensity})`;
};

export default theme;
