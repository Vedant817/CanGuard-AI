import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleSheet, Pressable, PressableProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from './Text';
import { useTheme } from '@/theme';

type BaseProps = {
  children?: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
};

type ListRowProps = BaseProps &
  Omit<PressableProps, 'style' | 'children'> & {
    title: string;
    subtitle?: string;
    leading?: ReactNode;
    trailing?: ReactNode;
    onPress?: () => void;
    showChevron?: boolean;
    destructive?: boolean;
    dense?: boolean;
  };

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  showChevron,
  destructive,
  dense,
  children,
  style,
  padded = true,
  ...rest
}: ListRowProps) {
  const { colors, radius, spacing } = useTheme();
  const titleColor = destructive ? colors.danger : colors.text;

  const content = (
    <View
      style={[
        styles.row,
        {
          paddingVertical: dense ? spacing.md : spacing.md + 2,
          paddingHorizontal: padded ? spacing.lg : 0,
        },
      ]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}

      <View style={styles.body}>
        <Text variant="body" style={{ color: titleColor }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" tone="secondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {children}
      </View>

      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      {showChevron && !trailing ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      ) : null}
    </View>
  );

  if (!onPress) {
    return <View style={style}>{content}</View>;
  }

  return (
    <Pressable
      {...rest}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={({ pressed }) => [
        style,
        pressed && { backgroundColor: colors.surfaceSunken, borderRadius: radius.md },
      ]}
    >
      {content}
    </Pressable>
  );
}

type ListRowGroupProps = BaseProps & {
  children: ReactNode;
  withSeparators?: boolean;
};

export function ListRowGroup({
  children,
  withSeparators = true,
  style,
  padded = false,
}: ListRowGroupProps) {
  const { colors, radius, spacing } = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <View
      style={[
        styles.group,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
        },
        style,
      ]}
    >
      {items.map((child, index) => (
        <View key={index}>
          {withSeparators && index > 0 ? (
            <View
              style={[
                styles.separator,
                { backgroundColor: colors.border, marginLeft: spacing.lg },
              ]}
            />
          ) : null}
          {padded ? <View style={{ paddingHorizontal: spacing.lg }}>{child}</View> : child}
        </View>
      ))}
    </View>
  );
}

type BadgeProps = {
  label: string;
  tone?: 'neutral' | 'accent' | 'success' | 'danger' | 'warning';
  style?: ViewStyle;
};

export function Badge({ label, tone = 'neutral', style }: BadgeProps) {
  const { colors, radius } = useTheme();

  const paletteMap = {
    neutral: { bg: colors.infoSoft, fg: colors.textSecondary },
    accent: { bg: colors.accentSoft, fg: colors.accentText },
    success: { bg: colors.successSoft, fg: colors.success },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    warning: { bg: colors.warningSoft, fg: colors.warning },
  }[tone];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: paletteMap.bg, borderRadius: radius.full },
        style,
      ]}
    >
      <Text variant="caption" style={{ color: paletteMap.fg, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}

type IconTileProps = {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  tileSize?: number;
  tone?: 'accent' | 'neutral' | 'success' | 'danger' | 'warning' | 'inverse';
  style?: ViewStyle;
};

export function IconTile({ name, size = 22, tileSize = 44, tone = 'accent', style }: IconTileProps) {
  const { colors, radius } = useTheme();

  const paletteMap = {
    accent: { bg: colors.accentSoft, fg: colors.accent },
    neutral: { bg: colors.surfaceSunken, fg: colors.textSecondary },
    success: { bg: colors.successSoft, fg: colors.success },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    inverse: { bg: 'rgba(255,255,255,0.18)', fg: '#FFFFFF' },
  }[tone];

  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: paletteMap.bg, borderRadius: radius.md, width: tileSize, height: tileSize },
        style,
      ]}
    >
      <Ionicons name={name} size={size} color={paletteMap.fg} />
    </View>
  );
}

type AvatarProps = {
  name: string;
  size?: number;
  style?: ViewStyle;
};

export function Avatar({ name, size = 44, style }: AvatarProps) {
  const { colors, radius, fontSize, fontWeight } = useTheme();
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: radius.full,
          backgroundColor: colors.accentSoft,
        },
        style,
      ]}
    >
      <Text
        variant="bodyStrong"
        style={{ color: colors.accentText, fontSize: fontSize.subhead, fontWeight: fontWeight.semibold }}
      >
        {initials || '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  trailing: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },
  group: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  separator: {
    height: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ListRow;
