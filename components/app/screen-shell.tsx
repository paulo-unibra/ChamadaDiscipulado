import { type PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
    backgroundColor: AppPalette.background,
  },
  content: {
    width: '100%',
    maxWidth: 1320,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  headerWrap: {
    paddingTop: 6,
    paddingBottom: 8,
    gap: 5,
  },
  kicker: {
    color: AppPalette.primary,
    fontSize: 12,
    fontFamily: AppTypography.bodyStrong,
    letterSpacing: 1.6,
  },
  title: {
    fontSize: 30,
    color: AppPalette.ink,
    fontFamily: AppTypography.title,
    letterSpacing: 0.4,
  },
  subtitle: {
    color: AppPalette.inkMuted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: AppTypography.body,
  },
  bgOrbTop: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: AppPalette.backgroundAlt,
    right: -70,
    top: -50,
  },
  bgOrbBottom: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: AppPalette.accentSoft,
    left: -130,
    bottom: -120,
  },
});
