import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';

import { Text } from './Text';
import { useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  padded?: boolean;
  tight?: boolean;
  testID?: string;
};

export function Card({ children, style, padded = true, tight, testID }: Props) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View
      testID={testID}
      style={[
        styles.base,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: tight ? spacing.md : padded ? spacing.lg : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type SectionProps = {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: ViewStyle;
  titleAccessory?: ReactNode;
};

export function Section({ title, action, children, style, titleAccessory }: SectionProps) {
  const { spacing } = useTheme();

  return (
    <View style={[{ gap: spacing.md }, style]}>
      {(title || action) && (
        <View style={styles.sectionHeader}>
          {title ? (
            <View style={styles.sectionTitleRow}>
              <SectionLabel>{title}</SectionLabel>
              {titleAccessory}
            </View>
          ) : (
            <View />
          )}
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text variant="sectionLabel" tone="secondary" uppercase>
      {children}
    </Text>
  );
}

type DividerProps = {
  style?: ViewStyle;
  inset?: number;
};

export function Divider({ style, inset = 0 }: DividerProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: colors.border, marginLeft: inset },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  divider: {
    height: 1,
  },
});

export default Card;
