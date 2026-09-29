import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  LayoutChangeEvent,
  Animated,
  PressableProps,
} from 'react-native';

import { Text } from './Text';
import { useTheme } from '@/theme';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  badge?: string | number;
};

type Props<T extends string> = Omit<PressableProps, 'style' | 'onPress'> & {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: object;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
  ...rest
}: Props<T>) {
  const { colors, radius, spacing, fontSize, fontWeight } = useTheme();
  const [width, setWidth] = React.useState(0);

  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const segmentWidth = width > 0 ? (width - spacing.xs * 2) / options.length : 0;
  const offset = segmentWidth * activeIndex;

  return (
    <View
      {...rest}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
      style={[
        styles.container,
        { backgroundColor: colors.surfaceSunken, borderRadius: radius.md, padding: spacing.xs },
        style,
      ]}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              width: segmentWidth,
              borderRadius: radius.sm,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              transform: [{ translateX: offset }],
            },
          ]}
        />
      ) : null}

      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            style={styles.segment}
          >
            <Text
              variant="subhead"
              style={{
                color: active ? colors.text : colors.textSecondary,
                fontWeight: active ? fontWeight.semibold : fontWeight.medium,
                fontSize: fontSize.subhead,
              }}
              numberOfLines={1}
            >
              {option.label}
            </Text>
            {option.badge !== undefined ? (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: active ? colors.accentSoft : colors.surfaceSunken },
                ]}
              >
                <Text
                  variant="caption"
                  style={{ color: active ? colors.accentText : colors.textSecondary }}
                >
                  {option.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

type ChipProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: string;
  style?: object;
};

export function Chip({ label, active, onPress, icon, style, ...rest }: ChipProps) {
  const { colors, radius, fontSize, fontWeight } = useTheme();

  return (
    <Pressable
      {...rest}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active
            ? colors.accent
            : pressed
              ? colors.surfaceSunken
              : colors.surface,
          borderColor: active ? colors.accent : colors.border,
          borderRadius: radius.full,
        },
        style,
      ]}
    >
      {icon ? (
        <Text
          variant="footnote"
          style={{ color: active ? colors.textOnAccent : colors.textSecondary }}
        >
          {icon}
        </Text>
      ) : null}
      <Text
        variant="footnote"
        numberOfLines={1}
        style={{
          color: active ? colors.textOnAccent : colors.textSecondary,
          fontWeight: active ? fontWeight.semibold : fontWeight.medium,
          fontSize: fontSize.footnote,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderWidth: 1,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 6,
  },
  badge: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
  },
});

export default SegmentedControl;
