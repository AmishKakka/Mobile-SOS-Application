/**
 *   - Navy (#1E3A5F)  → primary actions, headers, active states
 *   - Sky  (#0EA5E9)  → accent, links, secondary actions
 *   - Red  (#DC2626)  → SOS button and active emergency ONLY
 *   - Green (#10B981) → success, helper confirmed, resolved
 *   - Amber (#F59E0B) → helper approaching, warnings
 */

import { useColorScheme } from 'react-native';

// ── Raw palette (never use directly — use tokens below) ──────────────────────
const palette = {
  navy900: '#0F2744',
  navy800: '#1E3A5F',   // ← primary brand colour
  navy700: '#2D5186',
  navy100: '#DBEAFE',
  navy50:  '#EFF6FF',

  sky500:  '#0EA5E9',
  sky100:  '#E0F2FE',

  red600:  '#DC2626',   // ← SOS / danger ONLY
  red100:  '#FEE2E2',
  red50:   '#FFF5F5',

  green500: '#10B981',
  green100: '#D1FAE5',
  green50:  '#ECFDF5',

  amber500: '#F59E0B',
  amber100: '#FEF3C7',

  gray950: '#030712',
  gray900: '#111827',
  gray800: '#1F2937',
  gray700: '#374151',
  gray600: '#4B5563',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
  gray300: '#D1D5DB',
  gray200: '#E5E7EB',
  gray100: '#F3F4F6',
  gray50:  '#F9FAFB',
  white:   '#FFFFFF',
  black:   '#000000',
};

// ── Semantic tokens ───────────────────────────────────────────────────────────
type ColorTokens = {
  // Backgrounds
  bgApp:      string;   // whole screen background
  bgCard:     string;   // cards, modals, sheets
  bgInput:    string;   // text input fields
  bgNavBar:   string;   // bottom tab bar
  bgHeader:   string;   // top header / status bar area

  // Borders
  border:     string;
  borderFocus:string;

  // Text
  textPrimary:   string;  // headings
  textSecondary: string;  // subtitles, labels
  textTertiary:  string;  // hints, placeholders
  textOnDark:    string;  // text on navy/dark bg

  // Brand
  primary:    string;   // navy — buttons, tabs, icons
  primaryLight: string; // light tint of navy
  accent:     string;   // sky blue

  // Semantic
  danger:     string;   // SOS button and active emergency ONLY
  dangerLight:string;
  success:    string;
  successLight:string;
  warning:    string;
  warningLight:string;

  // Map overlay cards (semi-transparent)
  cardOverlay: string;

  // Tab bar active indicator
  tabActive:  string;
  tabInactive:string;
};

const light: ColorTokens = {
  bgApp:       palette.gray100,
  bgCard:      palette.white,
  bgInput:     palette.gray100,
  bgNavBar:    palette.white,
  bgHeader:    palette.white,

  border:      palette.gray200,
  borderFocus: palette.navy800,

  textPrimary:   palette.gray900,
  textSecondary: palette.gray600,
  textTertiary:  palette.gray400,
  textOnDark:    palette.white,

  primary:      palette.navy800,
  primaryLight: palette.navy50,
  accent:       palette.sky500,

  danger:      palette.red600,
  dangerLight: palette.red100,
  success:     palette.green500,
  successLight:palette.green50,
  warning:     palette.amber500,
  warningLight:palette.amber100,

  cardOverlay: 'rgba(255,255,255,0.96)',
  tabActive:   palette.navy800,
  tabInactive: palette.gray400,
};

const dark: ColorTokens = {
  bgApp:       palette.gray950,
  bgCard:      palette.gray800,
  bgInput:     palette.gray900,
  bgNavBar:    palette.gray800,
  bgHeader:    palette.gray800,

  border:      palette.gray700,
  borderFocus: palette.sky500,

  textPrimary:   palette.white,
  textSecondary: palette.gray300,
  textTertiary:  palette.gray500,
  textOnDark:    palette.white,

  primary:      palette.sky500,      // navy is too dark on dark bg → use sky
  primaryLight: '#0C2D48',
  accent:       palette.sky500,

  danger:      palette.red600,
  dangerLight: '#3B0A0A',
  success:     palette.green500,
  successLight:'#052E16',
  warning:     palette.amber500,
  warningLight:'#2D1B00',

  cardOverlay: 'rgba(31,41,55,0.97)',
  tabActive:   palette.sky500,
  tabInactive: palette.gray500,
};

// ── Typography ────────────────────────────────────────────────────────────────
export const font = {
  family: 'System',           // uses San Francisco on iOS, Roboto on Android
  // Weights
  regular:  '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,
  extrabold:'800' as const,
  black:    '900' as const,
  // Sizes
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  '2xl':28,
  '3xl':32,
  '4xl':36,
};

// ── Spacing ───────────────────────────────────────────────────────────────────
export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  '2xl':24,
  '3xl':32,
};

// ── Radius ────────────────────────────────────────────────────────────────────
export const radius = {
  sm:   8,
  md:  12,
  lg:  16,
  xl:  20,
  '2xl':24,
  full:999,
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const C = isDark ? dark : light;
  return { C, isDark, font, spacing, radius, palette };
}

export { light as lightColors, dark as darkColors };