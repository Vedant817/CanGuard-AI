import React from 'react';
import { Text as RNText, TextProps, StyleSheet, TextStyle } from 'react-native';

import { useTheme } from '@/theme';
import { fontSize, fontWeight, lineHeight, monoFont, ThemeColors } from '@/theme/tokens';
import { Platform } from 'react-native';

type Variant =
  | 'display'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'bodyStrong'
  | 'subhead'
  | 'footnote'
  | 'caption'
  | 'captionStrong'
  | 'sectionLabel'
  | 'mono';

type Tone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'success'
  | 'danger'
  | 'warning'
  | 'inverse'
  | 'onAccent';

type Props = TextProps & {
  variant?: Variant;
  tone?: Tone;
  center?: boolean;
  uppercase?: boolean;
  tabular?: boolean;
};

const variantMap: Record<Variant, TextStyle> = {
  display: {
    fontSize: fontSize.display,
    lineHeight: lineHeight.display,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.6,
  },
  title1: {
    fontSize: fontSize.title1,
    lineHeight: lineHeight.title1,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.4,
  },
  title2: {
    fontSize: fontSize.title2,
    lineHeight: lineHeight.title2,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.3,
  },
  title3: {
    fontSize: fontSize.title3,
    lineHeight: lineHeight.title3,
    fontWeight: fontWeight.semibold,
    letterSpacing: -0.2,
  },
  headline: {
    fontSize: fontSize.headline,
    lineHeight: lineHeight.headline,
    fontWeight: fontWeight.semibold,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    fontWeight: fontWeight.regular,
  },
  bodyStrong: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    fontWeight: fontWeight.semibold,
  },
  subhead: {
    fontSize: fontSize.subhead,
    lineHeight: lineHeight.subhead,
    fontWeight: fontWeight.regular,
  },
  footnote: {
    fontSize: fontSize.footnote,
    lineHeight: lineHeight.footnote,
    fontWeight: fontWeight.regular,
  },
  caption: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    fontWeight: fontWeight.regular,
  },
  captionStrong: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    fontWeight: fontWeight.semibold,
  },
  sectionLabel: {
    fontSize: fontSize.footnote,
    lineHeight: lineHeight.footnote,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.4,
  },
  mono: {
    fontSize: fontSize.mono,
    lineHeight: lineHeight.mono,
    fontWeight: fontWeight.regular,
    fontFamily: Platform.OS === 'ios' ? monoFont.ios : monoFont.android,
  },
};

function toneColor(colors: ThemeColors, tone: Tone): string {
  switch (tone) {
    case 'primary':
      return colors.text;
    case 'secondary':
      return colors.textSecondary;
    case 'tertiary':
      return colors.textTertiary;
    case 'accent':
      return colors.accentText;
    case 'success':
      return colors.success;
    case 'danger':
      return colors.danger;
    case 'warning':
      return colors.warning;
    case 'inverse':
      return colors.textInverse;
    case 'onAccent':
      return colors.textOnAccent;
  }
}

export function Text({
  variant = 'body',
  tone = 'primary',
  center,
  uppercase,
  tabular,
  style,
  ...rest
}: Props) {
  const { colors } = useTheme();

  return (
    <RNText
      {...rest}
      style={[
        variantMap[variant],
        { color: toneColor(colors, tone) },
        center && styles.center,
        uppercase && styles.uppercase,
        tabular && styles.tabular,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  uppercase: { textTransform: 'uppercase' },
  tabular: { fontVariant: ['tabular-nums'] },
});

export default Text;
