import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import {
  Text,
  Card,
  Section,
  IconTile,
  SearchField,
  Chip,
  AppHeader,
  Screen,
  EmptyState,
} from '@/components/ui';
import { useTheme } from '@/theme';

const CATEGORIES = ['All', 'Utilities', 'Recharge', 'Insurance', 'Education'] as const;

type Merchant = {
  id: number;
  name: string;
  category: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'accent' | 'warning' | 'danger' | 'success' | 'neutral';
};

const MERCHANTS: Merchant[] = [
  { id: 1, name: 'Electricity Bill', category: 'Utilities', icon: 'flash-outline', tone: 'warning' },
  { id: 2, name: 'Mobile Recharge', category: 'Recharge', icon: 'phone-portrait-outline', tone: 'accent' },
  { id: 3, name: 'Gas Bill', category: 'Utilities', icon: 'flame-outline', tone: 'danger' },
  { id: 4, name: 'Water Bill', category: 'Utilities', icon: 'water-outline', tone: 'accent' },
  { id: 5, name: 'DTH Recharge', category: 'Recharge', icon: 'tv-outline', tone: 'neutral' },
  { id: 6, name: 'Insurance Premium', category: 'Insurance', icon: 'shield-checkmark-outline', tone: 'success' },
];

const RECENT = [
  { label: 'Electricity', icon: 'flash-outline' as const },
  { label: 'Mobile', icon: 'phone-portrait-outline' as const },
  { label: 'Gas', icon: 'flame-outline' as const },
];

export default function DirectPayScreen() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All');

  const filtered = MERCHANTS.filter((m) => {
    const matchesCategory = category === 'All' || m.category === category;
    const matchesQuery = m.name.toLowerCase().includes(query.trim().toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <Screen edges={['left', 'right']}>
      <AppHeader
        title="Direct Pay"
        onBack={() => router.back()}
        trailing={<IconTile name="qr-code-outline" tone="accent" tileSize={40} />}
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.xl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SearchField value={query} onChangeText={setQuery} placeholder="Search bills and merchants" />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {CATEGORIES.map((item) => (
            <Chip
              key={item}
              label={item}
              active={category === item}
              onPress={() => setCategory(item)}
            />
          ))}
        </ScrollView>

        {query.length === 0 ? (
          <Section title="Recent payments">
            <Card tight>
              <View style={styles.recentRow}>
                {RECENT.map((item) => (
                  <Pressable
                    key={item.label}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    style={({ pressed }) => [
                      styles.recentItem,
                      {
                        backgroundColor: pressed ? colors.surfaceSunken : 'transparent',
                        borderRadius: radius.md,
                      },
                    ]}
                  >
                    <IconTile name={item.icon} size={20} tileSize={44} />
                    <Text variant="caption" tone="secondary" style={{ marginTop: 8 }} numberOfLines={1}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          </Section>
        ) : null}

        <Section title={query ? 'Results' : 'Pay bills'}>
          {filtered.length === 0 ? (
            <Card>
              <EmptyState
                icon="search-outline"
                title="No matches"
                message={`Nothing found for "${query}". Try a different search.`}
              />
            </Card>
          ) : (
            <View style={styles.merchantGrid}>
              {filtered.map((merchant) => (
                <Pressable
                  key={merchant.id}
                  accessibilityRole="button"
                  accessibilityLabel={merchant.name}
                  style={({ pressed }) => [
                    styles.merchantCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radius.lg,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <IconTile name={merchant.icon} tone={merchant.tone} size={22} tileSize={44} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {merchant.name}
                    </Text>
                    <Text variant="caption" tone="secondary" numberOfLines={1}>
                      {merchant.category}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </Section>

        <Section title="Quick actions">
          <Card tight>
            {[
              { label: 'Scan a bill QR', icon: 'scan-outline' as const },
              { label: 'Pay using a card', icon: 'card-outline' as const },
              { label: 'View payment history', icon: 'time-outline' as const },
            ].map((action, index) => (
              <View key={action.label}>
                {index > 0 ? (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  style={({ pressed }) => [
                    styles.actionRow,
                    {
                      backgroundColor: pressed ? colors.surfaceSunken : 'transparent',
                      padding: spacing.lg,
                    },
                  ]}
                >
                  <IconTile name={action.icon} size={20} tileSize={38} />
                  <Text variant="subhead" style={{ flex: 1 }}>
                    {action.label}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </Pressable>
              </View>
            ))}
          </Card>
        </Section>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  chipRow: {
    gap: 8,
    paddingRight: spacing.lg,
  },
  recentRow: {
    flexDirection: 'row',
  },
  recentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  merchantGrid: {
    gap: 8,
  },
  merchantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderWidth: 1,
  },
  divider: {
    height: 1,
    marginLeft: spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
});
