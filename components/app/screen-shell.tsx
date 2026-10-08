import { type PropsWithChildren } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppPalette, AppTypography } from '@/constants/ui';

type ScreenShellProps = PropsWithChildren<{
  title: string;
  subtitle: string;
}>;

export function ScreenShell({ title, subtitle, children }: ScreenShellProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerWrap}>
          <Text style={styles.kicker}>CHAMADA DO DISCIPULADO</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#F3F5F8' : AppPalette.background,
  },
  content: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 1080 : 1320,
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 28 : 20,
    paddingTop: Platform.OS === 'web' ? 18 : 0,
    paddingBottom: Platform.OS === 'web' ? 36 : 20,
    gap: Platform.OS === 'web' ? 18 : 12,
  },
  headerWrap: {
    paddingHorizontal: Platform.OS === 'web' ? 22 : 0,
    paddingVertical: Platform.OS === 'web' ? 18 : 6,
    backgroundColor: Platform.OS === 'web' ? '#FFFFFF' : 'transparent',
    borderRadius: Platform.OS === 'web' ? 14 : 0,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: '#E6EAF0',
    gap: Platform.OS === 'web' ? 4 : 5,
  },
  kicker: {
    color: AppPalette.primary,
    fontSize: Platform.OS === 'web' ? 10 : 12,
    fontFamily: AppTypography.bodyStrong,
    letterSpacing: Platform.OS === 'web' ? 1.35 : 1.6,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 26 : 30,
    color: AppPalette.ink,
    fontFamily: AppTypography.bodyStrong,
    letterSpacing: 0,
  },
  subtitle: {
    color: AppPalette.inkMuted,
    fontSize: Platform.OS === 'web' ? 13 : 14,
    lineHeight: Platform.OS === 'web' ? 19 : 20,
    fontFamily: AppTypography.body,
  },
  bgOrbTop: {
    display: Platform.OS === 'web' ? 'none' : 'flex',
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: AppPalette.backgroundAlt,
    right: -70,
    top: -50,
  },
  bgOrbBottom: {
    display: Platform.OS === 'web' ? 'none' : 'flex',
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: AppPalette.accentSoft,
    left: -130,
    bottom: -120,
  },
});
