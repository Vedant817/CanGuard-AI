import React, { createContext, useContext, useMemo, useState, useCallback, ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import {
  colorSets,
  ColorScheme,
  fontSize,
  fontWeight,
  layout,
  lineHeight,
  radius,
  spacing,
  Theme,
} from './tokens';

type ThemePreference = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');

  const scheme: ColorScheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: {
        scheme,
        colors: colorSets[scheme],
        spacing,
        radius,
        fontSize,
        fontWeight,
        lineHeight,
        layout,
        isDark: scheme === 'dark',
      },
      preference,
      setPreference,
    }),
    [scheme, preference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx.theme;
}

export function useThemePreference() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemePreference must be used inside <ThemeProvider>');
  }
  return { preference: ctx.preference, setPreference: ctx.setPreference };
}

export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  const build = useCallback(factory, [factory]);
  return useMemo(() => build(theme), [build, theme]);
}
