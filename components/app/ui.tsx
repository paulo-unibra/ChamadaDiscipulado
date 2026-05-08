import { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { AppPalette, AppTypography } from '@/constants/ui';

export function SectionCard({
  title,
  description,
  right,
  children,
}: {
  title: string;
  description?: string;
  right?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          {description ? <Text style={styles.cardDescription}>{description}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

export function AppInput(props: TextInputProps) {
  const { style, ...rest } = props;

  return (
    <TextInput
      placeholderTextColor={AppPalette.inkMuted}
      style={[styles.input, style]}
      autoCapitalize="sentences"
      {...rest}
    />
  );
}

export function ButtonPrimary({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.buttonPrimary,
        pressed && !disabled ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
      ]}>
      <Text style={styles.buttonPrimaryText}>{title}</Text>
    </Pressable>
  );
}

export function ButtonGhost({
  title,
  onPress,
  tone = 'neutral',
}: {
  title: string;
  onPress: () => void;
  tone?: 'neutral' | 'danger' | 'success';
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.ghostButton, pressed && styles.buttonPressed]}>
      <Text
        style={[
          styles.ghostText,
          tone === 'danger' ? styles.ghostDanger : null,
          tone === 'success' ? styles.ghostSuccess : null,
        ]}>
        {title}
      </Text>
    </Pressable>
  );
}

export function TinyBadge({
  label,
  tone = 'primary',
}: {
  label: string;
  tone?: 'primary' | 'success' | 'danger' | 'neutral';
}) {
  return (
    <View
      style={[
        styles.badge,
        tone === 'success' ? styles.badgeSuccess : null,
        tone === 'danger' ? styles.badgeDanger : null,
        tone === 'neutral' ? styles.badgeNeutral : null,
      ]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function EmptyMessage({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppPalette.surface,
    borderColor: AppPalette.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    fontFamily: AppTypography.bodyStrong,
    color: AppPalette.ink,
    fontSize: 16,
  },
  cardDescription: {
    color: AppPalette.inkMuted,
    fontFamily: AppTypography.body,
    fontSize: 13,
    lineHeight: 18,
  },
  fieldLabel: {
    color: AppPalette.ink,
    fontSize: 13,
    fontFamily: AppTypography.bodyStrong,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: AppPalette.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    color: AppPalette.ink,
    fontSize: 15,
    fontFamily: AppTypography.body,
  },
  buttonPrimary: {
    backgroundColor: AppPalette.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: AppTypography.bodyStrong,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  ghostButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppPalette.border,
    backgroundColor: '#FFFFFF',
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  ghostText: {
    color: AppPalette.ink,
    fontFamily: AppTypography.bodyStrong,
    fontSize: 13,
  },
  ghostDanger: {
    color: AppPalette.danger,
  },
  ghostSuccess: {
    color: AppPalette.success,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: AppPalette.primarySoft,
    alignSelf: 'flex-start',
  },
  badgeSuccess: {
    backgroundColor: AppPalette.successSoft,
  },
  badgeDanger: {
    backgroundColor: AppPalette.dangerSoft,
  },
  badgeNeutral: {
    backgroundColor: '#EEE8DE',
  },
  badgeText: {
    color: AppPalette.ink,
    fontSize: 12,
    fontFamily: AppTypography.bodyStrong,
  },
  divider: {
    height: 1,
    backgroundColor: AppPalette.border,
  },
  emptyWrap: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: AppPalette.border,
    backgroundColor: '#FFFEFC',
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  emptyTitle: {
    color: AppPalette.ink,
    fontSize: 14,
    fontFamily: AppTypography.bodyStrong,
  },
  emptyDescription: {
    color: AppPalette.inkMuted,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: AppTypography.body,
  },
});
