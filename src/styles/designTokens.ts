/**
 * VarejoPro POS - Centralized Design Tokens
 * Standard tokens for typography, spacing, touch targets, radius, and color semantics.
 */

export const DESIGN_TOKENS = {
  breakpoints: {
    mobileMax: 575,
    tabletMin: 576,
    tabletMax: 991,
    tabletLandscapeMin: 992,
    tabletLandscapeMax: 1279,
    desktopMin: 1280,
    desktopMax: 1599,
    largeDesktopMin: 1600,
  },
  touch: {
    minTargetSize: '48px', // WCAG 2.2 / Material Design target size
    hitPadding: 'p-3',
  },
  colors: {
    bg: 'bg-slate-100',
    surface: 'bg-white',
    surfaceElevated: 'bg-slate-50',
    surfaceDark: 'bg-slate-900',
    primary: 'emerald',
    primaryHex: '#10b981',
    warning: 'amber',
    danger: 'rose',
    info: 'blue',
    border: 'border-slate-200',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '32px',
    '3xl': '48px',
    '4xl': '64px',
  },
  radius: {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-3xl',
    full: 'rounded-full',
  },
} as const;
