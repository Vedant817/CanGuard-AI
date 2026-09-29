import React, { forwardRef, useState } from 'react';
import {
  View,
  ViewStyle,
  StyleSheet,
  TextInput,
  TextInputProps,
  Pressable,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from './Text';
import { useTheme } from '@/theme';

type Props = Omit<TextInputProps, 'style'> & {
  label?: string;
  hint?: string;
  error?: string;
  leadingIcon?: keyof typeof Ionicons.glyphMap;
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  onTrailingIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: ViewStyle;
  variant?: 'filled' | 'outlined';
  required?: boolean;
};

export const Field = forwardRef<TextInput, Props>(function Field(
  {
    label,
    hint,
    error,
    leadingIcon,
    trailingIcon,
    onTrailingIconPress,
    containerStyle,
    inputStyle,
    variant = 'filled',
    required,
    onFocus,
    onBlur,
    ...rest
  },
  ref
) {
  const { colors, radius, fontSize } = useTheme();
  const [focused, setFocused] = useState(false);

  const hasError = !!error;
  const borderColor = hasError
    ? colors.danger
    : focused
      ? colors.accent
      : variant === 'filled'
        ? colors.border
        : colors.borderStrong;

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label ? (
        <Text variant="footnote" tone="secondary" style={styles.label}>
          {label}
          {required ? <Text variant="footnote" tone="danger"> *</Text> : null}
        </Text>
      ) : null}

      <View
        style={[
          styles.wrapper,
          {
            backgroundColor: variant === 'filled' ? colors.surfaceMuted : colors.surface,
            borderColor,
            borderRadius: radius.md,
            borderWidth: focused || hasError ? 1.5 : 1,
          },
        ]}
      >
        {leadingIcon ? (
          <Ionicons name={leadingIcon} size={20} color={focused ? colors.accent : colors.textTertiary} />
        ) : null}

        <TextInput
          ref={ref}
          {...rest}
          onFocus={(e: NativeSyntheticEvent<TextInputFocusEventData>) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e: NativeSyntheticEvent<TextInputFocusEventData>) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.input,
            { color: colors.text, fontSize: fontSize.body },
            inputStyle,
          ]}
        />

        {trailingIcon ? (
          <Pressable
            onPress={onTrailingIconPress}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Toggle visibility"
            style={styles.trailing}
          >
            <Ionicons name={trailingIcon} size={20} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={styles.helperRow}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text variant="caption" tone="danger">
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="caption" tone="tertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

export function SearchField({
  value,
  onChangeText,
  placeholder = 'Search',
  style,
  ...rest
}: Omit<Props, 'label' | 'leadingIcon'> & { style?: ViewStyle }) {
  const { colors, radius } = useTheme();

  return (
    <View
      style={[
        styles.search,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderRadius: radius.md },
        style,
      ]}
    >
      <Ionicons name="search" size={18} color={colors.textTertiary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
        accessibilityLabel={placeholder}
        {...rest}
        style={[styles.input, styles.searchInput, { color: colors.text, fontSize: 16 }]}
      />
      {value?.length ? (
        <Pressable
          onPress={() => onChangeText?.('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontWeight: '600',
  },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    // @ts-expect-error web-only property
    outlineStyle: 'none',
  },
  trailing: {
    paddingLeft: 4,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  searchInput: {
    paddingVertical: 11,
  },
});

export default Field;
