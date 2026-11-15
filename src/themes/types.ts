/**
 * LUNA.FM — Centralized Theme Engine Type Definitions
 * Authoritative contracts for themes, tokens, typography, and atmospheric treatments.
 */

export type ThemeId = 'nocturne' | 'aqua' | 'afterglow' | 'overdrive' | 'sakura' | 'monochrome';

export interface ThemeColors {
  /** Primary accent for active tabs, prominent CTAs, key brand highlights */
  accentPrimary: string;
  /** Secondary accent for badges, complementary glows, star highlights */
  accentSecondary: string;
  /** Primary application background / deepest surface */
  surfaceBase: string;
  /** Elevated card, drawer, and modal surfaces */
  surfaceElevated: string;
  /** Semi-transparent frosted glass surface for floating docks/sheets */
  surfaceGlass: string;
  /** High-contrast primary reading text */
  textPrimary: string;
  /** Medium-contrast secondary text for track artist, labels, metadata */
  textSecondary: string;
  /** Muted tertiary text for timestamps, inactive indices, subtle notes */
  textMuted: string;
  /** Subtle dividers and structural card borders */
  borderSubtle: string;
  /** Highlighted borders for focused or active elements */
  borderAccent: string;
  /** Fill color for volume and transport progress bars */
  sliderFill: string;
  /** Primary dynamic glow fallback color */
  glowA: string;
  /** Secondary dynamic glow fallback color */
  glowB: string;
}

export interface ThemeGradients {
  /** Ambient body radial gradient style */
  ambientBody: string;
  /** Optional surface card gradient */
  surfaceGradient?: string;
  /** Optional accent linear/radial gradient */
  accentGradient?: string;
}

export interface ThemeTypography {
  /** Display/Hero font family */
  fontDisplay: string;
  /** Main interface/body font family */
  fontBody: string;
  /** Monospace font family for timers, counters, indices, code */
  fontMono: string;
}

export interface ThemeAtmosphereConfig {
  /** Atmospheric effect type matching ThemeEffects rendering modes */
  type: 'stars-waves' | 'bubbles-caustics' | 'filament-dust' | 'scanlines-glitch' | 'petals-bloom' | 'grid-reticle';
  /** Human-readable atmospheric description */
  description: string;
  /** Relative particle density multiplier (default 1.0) */
  densityMultiplier?: number;
  /** Speed multiplier for motion (default 1.0) */
  speedMultiplier?: number;
}

export interface ThemePreview {
  /** Swatch: Primary accent */
  primaryColor: string;
  /** Swatch: Secondary accent */
  secondaryColor: string;
  /** Swatch: Deep background */
  backgroundColor: string;
  /** Swatch: Elevated surface */
  surfaceColor: string;
  /** Swatch: Primary text */
  textColor: string;
}

export interface ThemeDefinition {
  /** Unique theme identifier */
  id: ThemeId;
  /** Display title (e.g. "Nocturne") */
  name: string;
  /** Poetic / Japanese subtitle (e.g. "夜想曲 · Cosmic Night") */
  subtitle: string;
  /** Curated visual identity description */
  description: string;
  /** Environmental atmosphere description */
  atmosphereDescription: string;
  /** Color palette tokens */
  colors: ThemeColors;
  /** Atmospheric background gradients */
  gradients: ThemeGradients;
  /** Typography assignments */
  typography: ThemeTypography;
  /** Atmospheric effect configuration */
  atmosphere: ThemeAtmosphereConfig;
  /** Preview swatches for Settings theme card representation */
  preview: ThemePreview;
  /** Whether this is the default out-of-the-box theme */
  isDefault?: boolean;
}

export interface ThemeContextValue {
  /** Active theme ID */
  theme: ThemeId;
  /** Complete definition of the active theme */
  themeDefinition: ThemeDefinition;
  /** Change active theme */
  setTheme: (theme: ThemeId) => void;
  /** All available themes in canonical order */
  availableThemes: ThemeDefinition[];
}
