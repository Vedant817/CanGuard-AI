import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { AppHeader, BankLogo, Screen } from '@/components/ui/Screen';
import { useTheme } from '@/theme';
import { getToken } from '@/utils/token';
import API_BASE_URL from '@/config/api';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'backspace'];
const MAX_ATTEMPTS = 3;

export default function MPINValidationScreen() {
  const { colors, spacing, radius } = useTheme();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => inputRefs.current[0]?.focus(), 250);
    return () => clearTimeout(timer);
  }, []);

  const setDigit = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    setError(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (next.every((d) => d !== '')) {
      submit(next.join(''));
    }
  };

  const submit = async (value: string) => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/auth');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/mpin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mpin: value }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'MPIN validation failed');

      router.replace('/main_menu');
    } catch (err: any) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      clear();

      if (nextAttempts >= MAX_ATTEMPTS) {
        Alert.alert(
          'Account locked',
          'Too many failed attempts. Please contact customer support.',
          [{ text: 'Back to sign in', onPress: () => router.replace('/auth') }]
        );
        return;
      }

      const remaining = MAX_ATTEMPTS - nextAttempts;
      setError(`Incorrect MPIN. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setDigits(['', '', '', '', '', '']);
    setTimeout(() => inputRefs.current[0]?.focus(), 60);
  };

  const pressKey = (key: string) => {
    if (loading) return;
    const index = digits.findIndex((d) => d === '');

    if (key === 'backspace') {
      const lastFilled = digits.map((d, i) => (d ? i : -1)).filter((i) => i !== -1).pop();
      if (lastFilled === undefined) return;
      const next = [...digits];
      next[lastFilled] = '';
      setDigits(next);
      setError(null);
      inputRefs.current[lastFilled]?.focus();
      return;
    }

    if (index === -1) return;
    setDigit(index, key);
  };

  const complete = digits.every((d) => d !== '');

  return (
    <Screen edges={['left', 'right']}>
      <AppHeader title="Verify MPIN" onBack={() => router.replace('/auth')} />

      <View style={[styles.body, { padding: spacing.lg, gap: spacing.xl }]}>
        <View style={styles.intro}>
          <BankLogo size={36} />
          <View style={styles.introCopy}>
            <Text variant="title3">Enter your MPIN</Text>
            <Text variant="footnote" tone="secondary">
              Confirm the 6-digit MPIN linked to this account.
            </Text>
          </View>
        </View>

        <View style={styles.pinBlock}>
          <View style={styles.pinRow}>
            {digits.map((digit, index) => {
              const active = digit !== '' && index === digits.findIndex((d) => d === '');
              return (
                <View
                  key={index}
                  style={[
                    styles.pinBox,
                    {
                      backgroundColor: digit ? colors.accentSoft : colors.surfaceMuted,
                      borderColor: error
                        ? colors.danger
                        : digit
                          ? colors.accent
                          : colors.border,
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  <TextInput
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    value={digit}
                    onChangeText={(v) => setDigit(index, v)}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
                        inputRefs.current[index - 1]?.focus();
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={1}
                    secureTextEntry
                    selectTextOnFocus
                    editable={!loading}
                    style={styles.pinInput}
                    accessibilityLabel={`Digit ${index + 1}`}
                  />
                </View>
              );
            })}
          </View>

          {error ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text variant="footnote" tone="danger">
                {error}
              </Text>
            </View>
          ) : attempts > 0 ? (
            <Text variant="caption" tone="tertiary" center>
              Attempt {attempts + 1} of {MAX_ATTEMPTS}
            </Text>
          ) : null}
        </View>

        <View style={styles.pad}>
          {KEYS.map((key, index) => {
            if (key === '') return <View key={`spacer-${index}`} style={styles.key} />;

            const isBackspace = key === 'backspace';
            return (
              <Pressable
                key={key}
                onPress={() => pressKey(key)}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={isBackspace ? 'Delete last digit' : key}
                style={({ pressed }) => [
                  styles.key,
                  {
                    backgroundColor: pressed ? colors.surfaceSunken : 'transparent',
                  },
                ]}
              >
                {isBackspace ? (
                  <Ionicons name="backspace-outline" size={24} color={colors.textSecondary} />
                ) : (
                  <Text variant="title2">{key}</Text>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Button
            label="Verify and continue"
            onPress={() => submit(digits.join(''))}
            disabled={!complete}
            loading={loading}
            trailingIcon="arrow-forward"
          />
          <Button
            label="Clear"
            tone="plain"
            onPress={clear}
            disabled={loading || !digits.some((d) => d !== '')}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    justifyContent: 'space-between',
  },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  introCopy: {
    marginLeft: 14,
    flex: 1,
    gap: 2,
  },
  pinBlock: {
    gap: 14,
  },
  pinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  pinBox: {
    flex: 1,
    maxWidth: 58,
    aspectRatio: 0.82,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  pinInput: {
    width: '100%',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    padding: 0,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  key: {
    width: '33.333%',
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
});
