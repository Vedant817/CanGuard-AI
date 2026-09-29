import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Text,
  Avatar,
  Badge,
  Card,
  SearchField,
  SegmentedControl,
  AppHeader,
  Screen,
  IconButton,
  Button,
  EmptyState,
} from '@/components/ui';
import { useTheme } from '@/theme';

type Beneficiary = {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  ifsc: string;
  type: 'UPI' | 'Account';
  upiId?: string;
  lastUsed: string;
};

type Filter = 'All' | 'UPI' | 'Account';

const BENEFICIARIES: Beneficiary[] = [
  {
    id: '1',
    name: 'John Doe',
    accountNumber: '1234567890',
    bankName: 'Canara Bank',
    ifsc: 'CNRB0001234',
    type: 'Account',
    lastUsed: '2 days ago',
  },
  {
    id: '2',
    name: 'Jane Smith',
    accountNumber: '',
    bankName: '',
    ifsc: '',
    type: 'UPI',
    upiId: 'jane@paytm',
    lastUsed: '1 week ago',
  },
  {
    id: '3',
    name: 'Mike Johnson',
    accountNumber: '9876543210',
    bankName: 'HDFC Bank',
    ifsc: 'HDFC0001234',
    type: 'Account',
    lastUsed: '3 days ago',
  },
];

function formatAccount(value: string) {
  return value.replace(/(.{4})/g, '$1 ').trim();
}

export default function MyBeneficiaryScreen() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All');

  const filtered = BENEFICIARIES.filter((b) => {
    const matchesFilter = filter === 'All' || b.type === filter;
    const term = query.trim().toLowerCase();
    const matchesQuery =
      !term ||
      b.name.toLowerCase().includes(term) ||
      (b.upiId ?? '').toLowerCase().includes(term);
    return matchesFilter && matchesQuery;
  });

  const confirmSend = (beneficiary: Beneficiary) => {
    Alert.alert(
      'Send money',
      `Send money to ${beneficiary.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => router.push('/main_menu/send_money') },
      ]
    );
  };

  const confirmDelete = (beneficiary: Beneficiary) => {
    Alert.alert('Remove beneficiary', `Remove ${beneficiary.name} from your list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive' },
    ]);
  };

  return (
    <Screen edges={['left', 'right']}>
      <AppHeader
        title="Beneficiaries"
        onBack={() => router.back()}
        trailing={
          <IconButton
            icon="person-add-outline"
            label="Add beneficiary"
            tone="accent"
            onPress={() => router.push('/main_menu/my_beneficiary')}
          />
        }
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SearchField value={query} onChangeText={setQuery} placeholder="Search beneficiaries" />

        <SegmentedControl<Filter>
          options={[
            { value: 'All', label: 'All' },
            { value: 'UPI', label: 'UPI' },
            { value: 'Account', label: 'Account' },
          ]}
          value={filter}
          onChange={setFilter}
        />

        {filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon="people-outline"
              title="No beneficiaries found"
              message="Adjust your filters or add a new beneficiary."
              actionLabel="Add beneficiary"
              onAction={() => router.push('/main_menu/my_beneficiary')}
            />
          </Card>
        ) : (
          <View style={{ gap: spacing.md }}>
            {filtered.map((beneficiary) => (
              <Card key={beneficiary.id} style={{ gap: spacing.md }}>
                <View style={styles.head}>
                  <Avatar name={beneficiary.name} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {beneficiary.name}
                    </Text>
                    <Text variant="caption" tone="secondary" numberOfLines={1}>
                      {beneficiary.type === 'UPI'
                        ? beneficiary.upiId
                        : formatAccount(beneficiary.accountNumber)}
                    </Text>
                  </View>
                  <Badge
                    label={beneficiary.type}
                    tone={beneficiary.type === 'UPI' ? 'accent' : 'neutral'}
                  />
                </View>

                <View style={[styles.meta, { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm }]}>
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" tone="tertiary">
                      {beneficiary.type === 'UPI' ? 'Bank' : 'Bank & IFSC'}
                    </Text>
                    <Text variant="footnote" numberOfLines={1}>
                      {beneficiary.type === 'UPI' ? 'Any UPI app' : `${beneficiary.bankName} · ${beneficiary.ifsc}`}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="caption" tone="tertiary">
                      Last used
                    </Text>
                    <Text variant="footnote">{beneficiary.lastUsed}</Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  <Button
                    label="Send money"
                    tone="tertiary"
                    size="md"
                    icon="send-outline"
                    onPress={() => confirmSend(beneficiary)}
                    style={{ flex: 1 }}
                  />
                  <IconButton
                    icon="trash-outline"
                    label={`Remove ${beneficiary.name}`}
                    tone="danger"
                    onPress={() => confirmDelete(beneficiary)}
                    style={{
                      backgroundColor: colors.dangerSoft,
                      width: 44,
                      height: 44,
                    }}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add new beneficiary"
          onPress={() => router.push('/main_menu/my_beneficiary')}
          style={({ pressed }) => [
            styles.addRow,
            {
              borderColor: colors.border,
              borderRadius: radius.lg,
              backgroundColor: pressed ? colors.surfaceSunken : colors.surface,
              padding: spacing.lg,
            },
          ]}
        >
          <View
            style={[
              styles.addIcon,
              { backgroundColor: colors.accentSoft, borderRadius: radius.md },
            ]}
          >
            <Text variant="title3" tone="accent">
              +
            </Text>
          </View>
          <Text variant="subhead" style={{ flex: 1 }}>
            Add new beneficiary
          </Text>
        </Pressable>
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
    paddingBottom: 40,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  meta: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
