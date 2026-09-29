import React, { useEffect, useRef } from 'react';
import {
  View,
  ViewStyle,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './Text';
import { Button } from './Button';
import { Field } from './Field';
import { useTheme } from '@/theme';

type BannerTone = 'info' | 'success' | 'danger' | 'warning';

type BannerProps = {
  title: string;
  message?: string;
  tone?: BannerTone;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  action?: React.ReactNode;
};

export function Banner({ title, message, tone = 'info', icon, style, action }: BannerProps) {
  const { colors, radius, spacing } = useTheme();

  const toneMap = {
    info: { bg: colors.infoSoft, border: colors.border, fg: colors.info, icon: 'information-circle' },
    success: { bg: colors.successSoft, border: colors.successBorder, fg: colors.success, icon: 'checkmark-circle' },
    danger: { bg: colors.dangerSoft, border: colors.dangerBorder, fg: colors.danger, icon: 'alert-circle' },
    warning: { bg: colors.warningSoft, border: colors.warningBorder, fg: colors.warning, icon: 'warning' },
  }[tone];

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.banner,
        {
          backgroundColor: toneMap.bg,
          borderColor: toneMap.border,
          borderRadius: radius.md,
          padding: spacing.md,
        },
        style,
      ]}
    >
      <View style={styles.bannerHead}>
        <Ionicons name={icon ?? toneMap.icon} size={18} color={toneMap.fg} />
        <Text variant="subhead" style={{ color: toneMap.fg, flex: 1 }}>
          {title}
        </Text>
      </View>
      {message ? (
        <Text variant="footnote" tone="secondary" style={{ marginTop: 4 }}>
          {message}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: spacing.md }}>{action}</View> : null}
    </View>
  );
}

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scrollable?: boolean;
};

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  scrollable = true,
}: SheetProps) {
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.sheetBackdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close"
          accessibilityRole="button"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bgElevated,
              borderTopLeftRadius: radius.xxl,
              borderTopRightRadius: radius.xxl,
              paddingBottom: insets.bottom + spacing.lg,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />

          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text variant="title3">{title}</Text>
              {subtitle ? (
                <Text variant="footnote" tone="secondary" style={{ marginTop: 2 }}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={({ pressed }) => [
                styles.sheetClose,
                { backgroundColor: pressed ? colors.surfaceSunken : colors.surfaceMuted },
              ]}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {scrollable ? (
            <ScrollView
              style={{ maxHeight: 460 }}
              contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={{ padding: spacing.lg, paddingTop: spacing.sm }}>{children}</View>
          )}

          {footer ? <View style={{ paddingHorizontal: spacing.lg }}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  const { spacing } = useTheme();

  return (
    <View style={[styles.empty, { padding: spacing.xxl, gap: spacing.md }]}>
      <Ionicons name={icon} size={40} color="#8B929E" />
      <Text variant="headline" center>
        {title}
      </Text>
      {message ? (
        <Text variant="subhead" tone="secondary" center>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} tone="tertiary" fullWidth={false} />
      ) : null}
    </View>
  );
}

type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label }: LoadingStateProps) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.empty, { padding: spacing.xxl, gap: spacing.md }]}>
      <ActivityIndicator size="large" />
      {label ? (
        <Text variant="subhead" tone="secondary" center>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
  },
  bannerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 11, 14, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingTop: 8,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sheetClose: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Banner;
