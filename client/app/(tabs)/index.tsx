import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { BankLogo } from '@/components/ui/Screen';
import { useTheme } from '@/theme';

const FEATURES = [
  { icon: 'finger-print' as const, title: 'Behavioural Biometrics', body: 'Every keystroke builds a signature that is yours alone.' },
  { icon: 'shield-checkmark' as const, title: 'Continuous Verification', body: 'Sessions are re-scored in real time, not just at login.' },
  { icon: 'lock-closed' as const, title: 'On-chain Records', body: 'Verification anchors are written to an immutable ledger.' },
];

export default function HomeScreen() {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.xl,
        },
      ]}
    >
      <View style={styles.brandRow}>
        <BankLogo size={34} />
        <View style={{ marginLeft: spacing.md }}>
          <Text variant="headline">Canara Bank</Text>
          <Text variant="caption" tone="secondary">
            Suraksha
          </Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Text variant="display" style={styles.heroTitle}>
          Banking that learns{'\n'}how you type.
        </Text>
        <Text variant="body" tone="secondary" style={styles.heroBody}>
          CanGuard continuously verifies each transaction using your unique typing
          rhythm, device fingerprint and location history.
        </Text>
      </View>

      <View style={styles.features}>
        {FEATURES.map((feature) => (
          <View
            key={feature.title}
            style={[
              styles.feature,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: spacing.lg,
              },
            ]}
          >
            <View
              style={[
                styles.featureIcon,
                { backgroundColor: colors.accentSoft, borderRadius: radius.md },
              ]}
            >
              <Ionicons name={feature.icon} size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="subhead" style={styles.featureTitle}>
                {feature.title}
              </Text>
              <Text variant="footnote" tone="secondary">
                {feature.body}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Button
          label="Get started"
          trailingIcon="arrow-forward"
          onPress={() => router.push('/auth')}
        />
        <Text variant="caption" tone="tertiary" center style={{ marginTop: spacing.md }}>
          Protected by Suraksha continuous authentication
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  heroTitle: {
    marginBottom: 12,
  },
  heroBody: {
    maxWidth: 420,
  },
  features: {
    gap: 10,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
  },
  featureIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  footer: {
    paddingTop: 24,
  },
});
