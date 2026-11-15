/**
 * LUNA.FM — Curated Theme Definitions & Validation Utilities
 * Authoritative specifications for all 6 curated themes:
 * 01 Nocturne (Default), 02 Aqua, 03 Afterglow, 04 Overdrive, 05 Sakura, 06 Monochrome.
 */

import type { ThemeDefinition, ThemeId } from './types';

export const THEME_STORAGE_KEY = 'luna-fm-theme';
export const DEFAULT_THEME_ID: ThemeId = 'nocturne';

export const THEME_IDS: readonly ThemeId[] = [
  'nocturne',
  'aqua',
  'afterglow',
  'overdrive',
  'sakura',
  'monochrome',
] as const;

/**
 * Type guard validating whether any arbitrary value is a supported ThemeId.
 */
export function isValidThemeId(val: unknown): val is ThemeId {
  return typeof val === 'string' && (THEME_IDS as readonly string[]).includes(val);
}

const FONT_SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
const FONT_SANS = "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const FONT_MONO = "'JetBrains Mono', ui-monospace, 'Cascadia Code', 'Fira Code', Menlo, monospace";

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  nocturne: {
    id: 'nocturne',
    name: 'Nocturne',
    subtitle: '夜想曲 · Cosmic Night',
    description: 'Deep space velvet with soft cosmic rose accents and gentle celestial starfield drift.',
    atmosphereDescription: 'Celestial star field drift with subtle horizontal radio wave ripples.',
    isDefault: true,
    colors: {
      accentPrimary: '#F3B8D8',
      accentSecondary: '#B9A9D6',
      surfaceBase: '#19171E',
      surfaceElevated: '#292231',
      surfaceGlass: 'rgba(41, 34, 49, 0.75)',
      textPrimary: '#F5F0F5',
      textSecondary: '#C7C5CE',
      textMuted: 'rgba(199, 197, 206, 0.75)',
      borderSubtle: 'rgba(185, 169, 214, 0.16)',
      borderAccent: 'rgba(243, 184, 216, 0.36)',
      sliderFill: '#F3B8D8',
      glowA: '#F3B8D8',
      glowB: '#B9A9D6',
    },
    gradients: {
      ambientBody:
        'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(41, 34, 49, 0.8), transparent), ' +
        'radial-gradient(ellipse 60% 40% at 20% 80%, rgba(75, 36, 74, 0.15), transparent), ' +
        'radial-gradient(ellipse 50% 35% at 80% 60%, rgba(185, 169, 214, 0.08), transparent)',
    },
    typography: {
      fontDisplay: FONT_SERIF,
      fontBody: FONT_SANS,
      fontMono: FONT_MONO,
    },
    atmosphere: {
      type: 'stars-waves',
      description: 'Celestial star field & radio waves',
      densityMultiplier: 1.0,
      speedMultiplier: 1.0,
    },
    preview: {
      primaryColor: '#F3B8D8',
      secondaryColor: '#B9A9D6',
      backgroundColor: '#19171E',
      surfaceColor: '#292231',
      textColor: '#F5F0F5',
    },
  },

  aqua: {
    id: 'aqua',
    name: 'Aqua',
    subtitle: '深海 · Abyssal Glow',
    description: 'Deep marine trench with bioluminescent neon cyan, seafoam mint and buoyant rising micro-bubbles.',
    atmosphereDescription: 'Deep ocean abyss with rising bioluminescent micro-bubbles and soft caustic light reflections.',
    isDefault: false,
    colors: {
      accentPrimary: '#22D3EE',
      accentSecondary: '#34D399',
      surfaceBase: '#08131B',
      surfaceElevated: '#0F2432',
      surfaceGlass: 'rgba(15, 36, 50, 0.75)',
      textPrimary: '#E0F7FA',
      textSecondary: '#94A3B8',
      textMuted: 'rgba(148, 163, 184, 0.75)',
      borderSubtle: 'rgba(34, 211, 238, 0.18)',
      borderAccent: 'rgba(34, 211, 238, 0.40)',
      sliderFill: '#22D3EE',
      glowA: '#22D3EE',
      glowB: '#34D399',
    },
    gradients: {
      ambientBody:
        'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(15, 36, 50, 0.85), transparent), ' +
        'radial-gradient(ellipse 60% 40% at 20% 80%, rgba(34, 211, 238, 0.12), transparent), ' +
        'radial-gradient(ellipse 50% 35% at 80% 60%, rgba(52, 211, 153, 0.08), transparent)',
    },
    typography: {
      fontDisplay: FONT_SANS,
      fontBody: FONT_SANS,
      fontMono: FONT_MONO,
    },
    atmosphere: {
      type: 'bubbles-caustics',
      description: 'Rising bubbles & aquatic caustics',
      densityMultiplier: 1.0,
      speedMultiplier: 0.9,
    },
    preview: {
      primaryColor: '#22D3EE',
      secondaryColor: '#34D399',
      backgroundColor: '#08131B',
      surfaceColor: '#0F2432',
      textColor: '#E0F7FA',
    },
  },

  afterglow: {
    id: 'afterglow',
    name: 'Afterglow',
    subtitle: '残光 · Warm Filament',
    description: 'Analog vacuum tube warmth with glowing filament amber, vintage walnut and floating dust motes.',
    atmosphereDescription: 'Warm vacuum tube filament columns and drifting dust motes in soft projector light.',
    isDefault: false,
    colors: {
      accentPrimary: '#F59E0B',
      accentSecondary: '#D97706',
      surfaceBase: '#17120E',
      surfaceElevated: '#261C14',
      surfaceGlass: 'rgba(38, 28, 20, 0.75)',
      textPrimary: '#FEF3C7',
      textSecondary: '#D4B996',
      textMuted: 'rgba(212, 185, 150, 0.75)',
      borderSubtle: 'rgba(245, 158, 11, 0.18)',
      borderAccent: 'rgba(245, 158, 11, 0.42)',
      sliderFill: '#F59E0B',
      glowA: '#F59E0B',
      glowB: '#EA580C',
    },
    gradients: {
      ambientBody:
        'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(38, 28, 20, 0.85), transparent), ' +
        'radial-gradient(ellipse 60% 40% at 20% 80%, rgba(245, 158, 11, 0.12), transparent), ' +
        'radial-gradient(ellipse 50% 35% at 80% 60%, rgba(217, 119, 6, 0.09), transparent)',
    },
    typography: {
      fontDisplay: FONT_SERIF,
      fontBody: FONT_SANS,
      fontMono: FONT_MONO,
    },
    atmosphere: {
      type: 'filament-dust',
      description: 'Warm vacuum tube filament & dust motes',
      densityMultiplier: 0.8,
      speedMultiplier: 0.7,
    },
    preview: {
      primaryColor: '#F59E0B',
      secondaryColor: '#D97706',
      backgroundColor: '#17120E',
      surfaceColor: '#261C14',
      textColor: '#FEF3C7',
    },
  },

  overdrive: {
    id: 'overdrive',
    name: 'Overdrive',
    subtitle: '暴走 · Laser Cyberpunk',
    description: 'High-octane obsidian night with laser crimson, hot magenta, CRT scanlines and controlled glitch.',
    atmosphereDescription: 'High-voltage cyberpunk CRT scanlines, diagonal laser streaks, and controlled micro-glitches.',
    isDefault: false,
    colors: {
      accentPrimary: '#EF4444',
      accentSecondary: '#EC4899',
      surfaceBase: '#0D0B12',
      surfaceElevated: '#1A1224',
      surfaceGlass: 'rgba(26, 18, 36, 0.80)',
      textPrimary: '#FFFFFF',
      textSecondary: '#CBD5E1',
      textMuted: 'rgba(203, 213, 225, 0.70)',
      borderSubtle: 'rgba(239, 68, 68, 0.22)',
      borderAccent: 'rgba(239, 68, 68, 0.50)',
      sliderFill: '#EF4444',
      glowA: '#EF4444',
      glowB: '#EC4899',
    },
    gradients: {
      ambientBody:
        'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(26, 18, 36, 0.90), transparent), ' +
        'radial-gradient(ellipse 60% 40% at 20% 80%, rgba(239, 68, 68, 0.15), transparent), ' +
        'radial-gradient(ellipse 50% 35% at 80% 60%, rgba(236, 72, 153, 0.10), transparent)',
    },
    typography: {
      fontDisplay: FONT_MONO,
      fontBody: FONT_SANS,
      fontMono: FONT_MONO,
    },
    atmosphere: {
      type: 'scanlines-glitch',
      description: 'CRT scanlines, laser particles & glitch',
      densityMultiplier: 1.2,
      speedMultiplier: 1.4,
    },
    preview: {
      primaryColor: '#EF4444',
      secondaryColor: '#EC4899',
      backgroundColor: '#0D0B12',
      surfaceColor: '#1A1224',
      textColor: '#FFFFFF',
    },
  },

  sakura: {
    id: 'sakura',
    name: 'Sakura',
    subtitle: '桜吹雪 · Twilight Petals',
    description: 'Ethereal twilight plum with cherry blossom coral pink, bloom haze and gently drifting petals.',
    atmosphereDescription: 'Ethereal twilight blossom drift with swaying cherry petals and soft pink bloom haze.',
    isDefault: false,
    colors: {
      accentPrimary: '#FB7185',
      accentSecondary: '#F472B6',
      surfaceBase: '#18131E',
      surfaceElevated: '#2A1E32',
      surfaceGlass: 'rgba(42, 30, 50, 0.75)',
      textPrimary: '#FFF1F2',
      textSecondary: '#D8B4E2',
      textMuted: 'rgba(216, 180, 226, 0.72)',
      borderSubtle: 'rgba(251, 113, 133, 0.20)',
      borderAccent: 'rgba(251, 113, 133, 0.45)',
      sliderFill: '#FB7185',
      glowA: '#FB7185',
      glowB: '#F472B6',
    },
    gradients: {
      ambientBody:
        'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(42, 30, 50, 0.85), transparent), ' +
        'radial-gradient(ellipse 60% 40% at 20% 80%, rgba(251, 113, 133, 0.14), transparent), ' +
        'radial-gradient(ellipse 50% 35% at 80% 60%, rgba(244, 114, 182, 0.10), transparent)',
    },
    typography: {
      fontDisplay: FONT_SERIF,
      fontBody: FONT_SANS,
      fontMono: FONT_MONO,
    },
    atmosphere: {
      type: 'petals-bloom',
      description: 'Drifting cherry blossom petals & soft bloom',
      densityMultiplier: 1.0,
      speedMultiplier: 0.8,
    },
    preview: {
      primaryColor: '#FB7185',
      secondaryColor: '#F472B6',
      backgroundColor: '#18131E',
      surfaceColor: '#2A1E32',
      textColor: '#FFF1F2',
    },
  },

  monochrome: {
    id: 'monochrome',
    name: 'Monochrome',
    subtitle: '白黒 · Swiss Minimalist',
    description: 'Brutalist high-contrast monochrome with stark whites, zinc accents and architectural hairline grid.',
    atmosphereDescription: 'Minimal architectural hairline grid with precision corner registration reticles.',
    isDefault: false,
    colors: {
      accentPrimary: '#FFFFFF',
      accentSecondary: '#A1A1AA',
      surfaceBase: '#0A0A0A',
      surfaceElevated: '#18181B',
      surfaceGlass: 'rgba(24, 24, 27, 0.85)',
      textPrimary: '#FFFFFF',
      textSecondary: '#A1A1AA',
      textMuted: 'rgba(161, 161, 170, 0.65)',
      borderSubtle: 'rgba(255, 255, 255, 0.14)',
      borderAccent: 'rgba(255, 255, 255, 0.38)',
      sliderFill: '#FFFFFF',
      glowA: '#FFFFFF',
      glowB: '#71717A',
    },
    gradients: {
      ambientBody:
        'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(24, 24, 27, 0.90), transparent), ' +
        'radial-gradient(ellipse 60% 40% at 20% 80%, rgba(255, 255, 255, 0.05), transparent), ' +
        'radial-gradient(ellipse 50% 35% at 80% 60%, rgba(161, 161, 170, 0.04), transparent)',
    },
    typography: {
      fontDisplay: FONT_SANS,
      fontBody: FONT_SANS,
      fontMono: FONT_MONO,
    },
    atmosphere: {
      type: 'grid-reticle',
      description: 'Minimal geometric grid & precision reticles',
      densityMultiplier: 0.0,
      speedMultiplier: 0.0,
    },
    preview: {
      primaryColor: '#FFFFFF',
      secondaryColor: '#A1A1AA',
      backgroundColor: '#0A0A0A',
      surfaceColor: '#18181B',
      textColor: '#FFFFFF',
    },
  },
};

export const AVAILABLE_THEMES: ThemeDefinition[] = THEME_IDS.map(id => THEMES[id]);

/**
 * Safely retrieve the ThemeDefinition for a given ThemeId with fallback to default theme.
 */
export function getThemeDefinition(id: ThemeId): ThemeDefinition {
  return THEMES[id] ?? THEMES[DEFAULT_THEME_ID];
}
