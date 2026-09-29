import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './Text';
import { useTheme, palette } from '@/theme';

type HeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  trailing?: ReactNode;
  leading?: ReactNode;
  borderless?: boolean;
  large?: boolean;
  style?: ViewStyle;
};

export function AppHeader({
  title,
  subtitle,
  onBack,
  trailing,
  leading,
  borderless,
  large,
  style,
}: HeaderProps) {
  const { colors, layout, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const resolvedLeading =
    leading ??
    (onBack ? (
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
        style={({ pressed }) => [
          styles.iconButton,
          {
            backgroundColor: pressed ? colors.surfaceSunken : 'transparent',
            marginLeft: -10,
          },
        ]}
      >
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
    ) : null);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + layout.headerPaddingTop,
          backgroundColor: colors.bgElevated,
          borderBottomWidth: borderless ? 0 : 1,
          borderBottomColor: colors.border,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.side}>{resolvedLeading}</View>

        {!large ? (
          <View style={styles.center} pointerEvents="none">
            <Text variant="headline" numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text variant="caption" tone="secondary" numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.side, styles.sideRight]}>{trailing}</View>
      </View>

      {large ? (
        <View style={styles.largeBlock}>
          {subtitle ? (
            <Text variant="subhead" tone="secondary" style={{ marginBottom: 2 }}>
              {subtitle}
            </Text>
          ) : null}
          <Text variant="title1" numberOfLines={2}>
            {title}
          </Text>
        </View>
      ) : null}

      {borderless ? <View style={{ height: 0 }} /> : null}
    </View>
  );
}

type LogoProps = {
  size?: number;
  inverted?: boolean;
};

export function BankLogo({ size = 32, inverted }: LogoProps) {
  const { colors } = useTheme();
  const base = inverted ? colors.textInverse : palette.brandYellow;
  const inner = inverted ? colors.surface : '#FFFFFF';

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.5,
          borderRightWidth: size * 0.5,
          borderBottomWidth: size * 0.86,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: base,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.27,
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.3,
          borderRightWidth: size * 0.3,
          borderBottomWidth: size * 0.52,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: inner,
          transform: [{ rotate: '180deg' }],
        }}
      />
    </View>
  );
}

type ScreenProps = {
  children: ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  testID?: string;
};

export function Screen({ children, style, edges = ['left', 'right'], testID }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID={testID}
      style={[
        styles.screen,
        {
          backgroundColor: colors.bg,
          paddingLeft: edges.includes('left') ? insets.left : 0,
          paddingRight: edges.includes('right') ? insets.right : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  side: {
    minWidth: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeBlock: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  screen: {
    flex: 1,
  },
});

export default AppHeader;
