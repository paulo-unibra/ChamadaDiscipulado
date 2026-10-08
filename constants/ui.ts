import { Platform } from 'react-native';

export const AppPalette = {
  background: '#F3F5F8',
  backgroundAlt: '#EAF1FA',
  surface: '#FFFFFF',
  ink: '#202B3C',
  inkMuted: '#66758A',
  primary: '#245A91',
  primarySoft: '#EAF1FA',
  accent: '#B7791F',
  accentSoft: '#FFF4E5',
  success: '#238457',
  successSoft: '#E8F6EF',
  danger: '#B42332',
  dangerSoft: '#FDECEE',
  border: '#E3E8EF',
};

export const AppTypography = {
  title: Platform.select({
    ios: 'Avenir Next Demi Bold',
    android: 'sans-serif-medium',
    default: 'sans-serif',
  }),
  titleRegular: Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif',
    default: 'sans-serif',
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
