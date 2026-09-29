import React from 'react';
import { ScrollView, StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

type Props = {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  padded?: boolean;
  keyboardAware?: boolean;
  scrollable?: boolean;
  testID?: string;
};

export function ScreenContainer({
  children,
  header,
  footer,
  padded = true,
  keyboardAware = false,
  scrollable = true,
  testID,
}: Props) {
  const { colors, spacing, layout } = useTheme();
  const insets = useSafeAreaInsets();

  const contentPadding = {
    paddingHorizontal: padded ? spacing.lg : 0,
    paddingTop: padded ? spacing.lg : 0,
    paddingBottom: spacing.xxxl,
  };

  const body = scrollable ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={contentPadding}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, contentPadding]}>{children}</View>
  );

  const inner = (
    <View style={styles.flex}>
      {header}
      {body}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.bgElevated,
              borderTopColor: colors.border,
              borderTopWidth: 1,
              paddingHorizontal: padded ? spacing.lg : 0,
              paddingTop: spacing.md,
              paddingBottom: insets.bottom + spacing.md,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );

  if (!keyboardAware) {
    return (
      <View testID={testID} style={[styles.flex, { backgroundColor: colors.bg }]}>
        {inner}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      testID={testID}
      style={[styles.flex, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {inner}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  footer: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
});

export default ScreenContainer;
