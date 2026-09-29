import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/Text';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppHeader, BankLogo } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Banner } from '@/components/ui/Feedback';
import { useTheme } from '@/theme';
import { saveToken } from '@/utils/token';
import { getSessionStatus } from '../api/user';
import API_BASE_URL from '@/config/api';
import blockchainService from '@/services/blockchainService';

type Mode = 'signin' | 'signup';

type FormErrors = Partial<Record<'email' | 'password' | 'username' | 'mpin' | 'confirmMpin', string>>;

export default function AuthScreen() {
  const { colors, spacing } = useTheme();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mpin, setMpin] = useState('');
  const [confirmMpin, setConfirmMpin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLogin = mode === 'signin';

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE_URL}/api/user/session-status`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (!data.success || !data.session) return;

        const { needsTyping, needsLogin } = data.session;
        if (needsTyping) {
          router.replace('/typing_game');
        } else if (needsLogin) {
          await AsyncStorage.removeItem('token');
          router.replace('/auth');
        } else {
          router.replace('/mpin-validation');
        }
      } catch (err) {
        console.log('Session check failed:', err);
      }
    })();
  }, []);

  const validate = (): FormErrors => {
    const next: FormErrors = {};

    if (!email.trim()) next.email = 'Email is required';
    else if (!email.includes('@')) next.email = 'Enter a valid email address';

    if (!password) next.password = 'Password is required';
    else if (!isLogin && password.length < 6) next.password = 'Use at least 6 characters';

    if (!isLogin) {
      if (!username.trim()) next.username = 'Username is required';
      if (!/^\d{6}$/.test(mpin)) next.mpin = 'Enter your 6-digit MPIN';
      else if (['123456', '000000', '111111'].includes(mpin)) {
        next.mpin = 'Choose a less predictable MPIN';
      }
      if (confirmMpin !== mpin) next.confirmMpin = 'MPINs do not match';
    }

    return next;
  };

  const routeAfterAuth = async (token: string, userId?: string) => {
    const session = await getSessionStatus(token);
    if (session.needsTyping) return router.replace('/typing_game');
    if (session.needsLogin) {
      Alert.alert('Session expired', 'Please sign in again.');
      return router.replace('/auth');
    }
    return router.replace('/mpin-validation');
  };

  const handleAuth = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    const endpoint = isLogin
      ? `${API_BASE_URL}/api/auth/login`
      : `${API_BASE_URL}/api/auth/register`;

    try {
      const body = isLogin ? { email, password } : { username, email, password, mpin };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Authentication failed');

      const token = data?.data?.token || data?.token;
      if (!token) throw new Error('No token received from server');

      await saveToken(token);

      if (isLogin) {
        try {
          await blockchainService.initializeBlockchainForUser(data.data?.userId || 'unknown');
        } catch (error) {
          console.warn('Blockchain init skipped:', error);
        }
        await routeAfterAuth(token);
      } else {
        try {
          await blockchainService.initializeBlockchainForUser(data.data.userId);
        } catch (error) {
          console.warn('Blockchain init failed:', error);
        }
        router.replace('/typing_game');
      }
    } catch (error: any) {
      setFormError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(isLogin ? 'signup' : 'signin');
    setErrors({});
    setFormError(null);
    setMpin('');
    setConfirmMpin('');
  };

  return (
    <ScreenContainer
      keyboardAware
      header={
        <AppHeader
          title={isLogin ? 'Sign in' : 'Create account'}
          onBack={() => router.replace('/')}
        />
      }
      footer={
        <View style={{ gap: spacing.md }}>
          <Button
            label={isLogin ? 'Sign in' : 'Create account'}
            onPress={handleAuth}
            loading={loading}
            trailingIcon="arrow-forward"
          />
          <Button label={isLogin ? 'Create a new account' : 'Back to sign in'} tone="plain" onPress={switchMode} />
        </View>
      }
    >
      <View style={styles.brand}>
        <BankLogo size={40} />
        <View style={styles.brandCopy}>
          <Text variant="title3">Canara Bank</Text>
          <Text variant="footnote" tone="secondary">
            Suraksha digital banking
          </Text>
        </View>
      </View>

      <View style={{ marginBottom: spacing.xl }}>
        <SegmentedControl<Mode>
          options={[
            { value: 'signin', label: 'Sign in' },
            { value: 'signup', label: 'Sign up' },
          ]}
          value={mode}
          onChange={setMode}
        />
      </View>

      {formError ? <Banner tone="danger" title="Could not continue" message={formError} /> : null}

      <View style={[styles.form, { marginTop: formError ? spacing.lg : 0 }]}>
        <Field
          label="Email address"
          value={email}
          onChangeText={(v) => setErrors((e) => ({ ...e, email: undefined }))}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          leadingIcon="mail-outline"
          error={errors.email}
          textContentType="emailAddress"
        />

        {!isLogin ? (
          <Field
            label="Username"
            value={username}
            onChangeText={(v) => setErrors((e) => ({ ...e, username: undefined }))}
            placeholder="Choose a username"
            autoCapitalize="none"
            autoComplete="username"
            leadingIcon="person-outline"
            error={errors.username}
          />
        ) : null}

        <Field
          label="Password"
          value={password}
          onChangeText={(v) => setErrors((e) => ({ ...e, password: undefined }))}
          placeholder="At least 6 characters"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="password"
          leadingIcon="lock-closed-outline"
          trailingIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
          onTrailingIconPress={() => setShowPassword((s) => !s)}
          error={errors.password}
          textContentType="password"
        />

        {!isLogin ? (
          <>
            <Field
              label="Create 6-digit MPIN"
              value={mpin}
              onChangeText={(v) => {
                setMpin(v.replace(/[^0-9]/g, '').slice(0, 6));
                setErrors((e) => ({ ...e, mpin: undefined }));
              }}
              placeholder="6 digits"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              leadingIcon="keypad-outline"
              error={errors.mpin}
              hint="Used to authorise every transaction."
            />

            <Field
              label="Confirm MPIN"
              value={confirmMpin}
              onChangeText={(v) => {
                setConfirmMpin(v.replace(/[^0-9]/g, '').slice(0, 6));
                setErrors((e) => ({ ...e, confirmMpin: undefined }));
              }}
              placeholder="Re-enter MPIN"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              leadingIcon="checkmark-circle-outline"
              error={errors.confirmMpin}
            />
          </>
        ) : null}
      </View>

      <View style={[styles.security, { marginTop: spacing.xxl }]}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.textTertiary} />
        <Text variant="caption" tone="tertiary" style={{ flex: 1 }}>
          Your session is protected by continuous behavioural authentication.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandCopy: {
    marginLeft: 14,
  },
  form: {
    gap: 18,
  },
  security: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
