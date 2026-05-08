import { Platform } from 'react-native';

export const AppPalette = {
  background: '#F3EDE3',
  backgroundAlt: '#E7EEF6',
  surface: '#FFFCF7',
  ink: '#1C2A3A',
  inkMuted: '#5E6C7A',
  primary: '#1E5A86',
  primarySoft: '#D9E8F5',
  accent: '#D5862B',
  accentSoft: '#FCE8CD',
  success: '#2C7A4B',
  successSoft: '#D8F0E1',
  danger: '#B3404A',
  dangerSoft: '#F9E1E4',
  border: '#D8D2C6',
};

export const AppTypography = {
  title: Platform.select({
    ios: 'Palatino-Bold',
    android: 'serif',
    default: 'serif',
  }),
  titleRegular: Platform.select({
    ios: 'Palatino',
    android: 'serif',
    default: 'serif',
  }),
  body: Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif',
    default: 'sans-serif',
  }),
  bodyStrong: Platform.select({
    ios: 'Avenir Next Demi Bold',
    android: 'sans-serif-medium',
    default: 'sans-serif',
  }),
};
