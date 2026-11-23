import { Platform } from 'react-native';

export const colors = {
  ink: '#1E293B',
  inkSoft: '#3F4C5A',
  muted: '#707B89',
  snow: '#F4F8FB',
  paper: '#FFFFFF',
  line: '#DFE8ED',
  lineStrong: '#CBD8DE',
  mint: '#C9ECDC',
  mintDark: '#315F51',
  pink: '#FFD8E3',
  pinkInk: '#A33E5B',
  lavender: '#DDD7FF',
  lavenderInk: '#574B78',
  lime: '#B9F33D',
  limeInk: '#293616',
  blue: '#0C63E7',
  blueSoft: '#B8E4FA',
  berry: '#C94F70',
  white: '#FFFFFF',
  danger: '#A13C50',
  mapLine: '#C44F74',
  transparent: 'transparent',
} as const;

export const type = {
  body: Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif',
    web: '"Noto Sans SC", "PingFang SC", sans-serif',
    default: 'sans-serif',
  }),
  number: Platform.select({
    ios: 'Avenir Next Condensed',
    android: 'sans-serif-condensed',
    web: '"Arial Narrow", "Noto Sans SC", sans-serif',
    default: 'sans-serif',
  }),
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 27,
  pill: 999,
} as const;

export const shadow = Platform.select({
  ios: {
    shadowColor: '#29434E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.09,
    shadowRadius: 22,
  },
  android: {
    elevation: 4,
  },
  default: {
    shadowColor: '#29434E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.09,
    shadowRadius: 22,
  },
});

export const maxContentWidth = 620;
