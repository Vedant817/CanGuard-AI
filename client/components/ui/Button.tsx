import React, { ReactNode, useMemo } from 'react';
import { Pressable, StyleSheet, View, ViewStyle, PressableProps, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from './Text';
import { useTheme } from '@/theme';

type Tone = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'plain';
type Size = 'md' | 'lg';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  onPress?: () => void;
  tone?: Tone;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  testID?: string;
};

export function Button({
  label,
  onPress,
  tone = 'primary',
  size = 'lg',
  icon,
  trailingIcon,
  loading,
  disabled,
  fullWidth = true,
  style,
  testID,
  ...rest
}: Props) {
  const { colors, radius, layout } = useTheme();

  const toneStyles = useMemo(() => {
    switch (tone) {
      case 'primary':
        return {
          bg: colors.accent,
          pressed: colors.accentPressed,
          border: 'transparent',
          text: colors.textOnAccent as const,
        };
      case 'secondary':
        return {
          bg: colors.surface,
          pressed: colors.surfaceMuted,
          border: colors.borderStrong,
          text: colors.text as const,
        };
      case 'tertiary':
        return {
          bg: colors.accentSoft,
          pressed: colors.accentSoftBorder,
          border: 'transparent',
          text: colors.accentText as const,
        };
      case 'danger':
        return {
          bg: colors.dangerSoft,
          pressed: colors.dangerBorder,
          border: 'transparent',
          text: colors.danger as const,
        };
      case 'plain':
        return {
          bg: 'transparent',
          pressed: colors.surfaceSunken,
          border: 'transparent',
          text: colors.accentText as const,
        };
    }
  }, [tone, colors]);

  const isDisabled = disabled || loading;
  const height = size === 'lg' ? 52 : 44;

  return (
    <Pressable
      {...rest}
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: height,
          borderRadius: radius.md,
          backgroundColor: pressed && !isDisabled ? toneStyles.pressed : toneStyles.bg,
          borderColor: toneStyles.border,
          borderWidth: toneStyles.border === 'transparent' ? 0 : 1,
          opacity: isDisabled ? 0.45 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: size === 'lg' ? 20 : 16,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={toneStyles.text} size="small" />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={20} color={toneStyles.text} /> : null}
          <Text
            variant={size === 'lg' ? 'bodyStrong' : 'subhead'}
            style={{ color: toneStyles.text }}
            numberOfLines={1}
          >
            {label}
          </Text>
          {trailingIcon ? <Ionicons name={trailingIcon} size={20} color={toneStyles.text} /> : null}
        </View>
      )}
    </Pressable>
  );
}

type IconButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  tone?: 'default' | 'accent' | 'danger';
  size?: number;
  label: string;
  style?: ViewStyle;
};

export function IconButton({
  icon,
  onPress,
  tone = 'default',
  size = 22,
  label,
  style,
  ...rest
}: IconButtonProps) {
  const { colors, radius, layout } = useTheme();

  const toneStyles = {
    default: { bg: 'transparent', pressed: colors.surfaceSunken, color: colors.text },
    accent: { bg: 'transparent', pressed: colors.accentSoft, color: colors.accentText },
    danger: { bg: 'transparent', pressed: colors.dangerSoft, color: colors.danger },
  }[tone];

  return (
    <Pressable
      {...rest}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        {
          width: layout.touchTarget,
          height: layout.touchTarget,
          borderRadius: radius.full,
          backgroundColor: pressed ? toneStyles.pressed : toneStyles.bg,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={toneStyles.color} />
    </Pressable>
  );
}

export default Button;
