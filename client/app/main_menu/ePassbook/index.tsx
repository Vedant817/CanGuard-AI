import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Text,
  Card,
  Badge,
  Chip,
  AppHeader,
  Screen,
  IconButton,
  Divider,
  EmptyState,
} from '@/components/ui';
import { useTheme } from '@/theme';

type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  balance: number;
  reference: string;
};

const PERIODS = ['This Month', 'Last Month', 'Last 3 Months', 'Last 6 Months'] as const;

const TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2024-01-15', description: 'UPI Payment to John Doe', amount: -2500, type: 'debit', balance: 45750.5, reference: 'UPI/402123456789' },
  { id: '2', date: '2024-01-14', description: 'Salary Credit', amount: 50000, type: 'credit', balance: 48250.5, reference: 'NEFT/SAL/JAN2024' },
  { id: '3', date: '2024-01-12', description: 'ATM Withdrawal', amount: -5000, type: 'debit', balance: 43250.5, reference: 'ATM/WDL/123456' },
  { id: '4', date: '2024-01-10', description: 'Online Shopping', amount: -3200, type: 'debit', balance: 48250.5, reference: 'CARD/POS/AMAZON' },
  { id: '5', date: '2024-01-08', description: 'Interest Credit', amount: 450.5, type: 'credit', balance: 51450.5, reference: 'INT/CREDIT/Q4' },
];

const ACCOUNT_BALANCE = 45750.5;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Math.abs(value));
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function EPassbookScreen() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('This Month');
  const [hidden, setHidden] = useState(false);

  const totals = useMemo(() => {
    const credits = TRANSACTIONS.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const debits = TRANSACTIONS.filter((t) => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);
    return { credits, debits };
  }, []);

  const renderItem = ({ item }: { item: Transaction }) => {
    const isCredit = item.type === 'credit';
    return (
      <View
        style={[
          styles.row,
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
            styles.rowIcon,
            { backgroundColor: isCredit ? colors.successSoft : colors.dangerSoft },
          ]}
        >
          <Ionicons
            name={isCredit ? 'arrow-down' : 'arrow-up'}
            size={18}
            color={isCredit ? colors.success : colors.danger}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {item.description}
          </Text>
          <Text variant="caption" tone="secondary">
            {formatDate(item.date)}
          </Text>
          <Text variant="caption" tone="tertiary" numberOfLines={1} style={{ marginTop: 2 }}>
            Ref {item.reference}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="bodyStrong" tabular style={{ color: isCredit ? colors.success : colors.text }}>
            {isCredit ? '+' : '−'}
            {formatCurrency(item.amount)}
          </Text>
          <Text variant="caption" tone="tertiary" tabular>
            {hidden ? '••••' : formatCurrency(item.balance)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Screen edges={['left', 'right']}>
      <AppHeader
        title="ePassbook"
        onBack={() => router.back()}
        trailing={<IconButton icon="download-outline" label="Download statement" tone="accent" />}
      />

      <View style={[styles.body, { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg }]}>
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <View style={[styles.balanceHead, { padding: spacing.lg, backgroundColor: colors.surfaceInverse }]}>
            <View style={{ flex: 1 }}>
              <Text variant="caption" style={{ color: colors.textInverse, opacity: 0.7 }}>
                Savings account · XXXX 7890
              </Text>
              <Text
                variant="title2"
                tabular
                style={{ color: colors.textInverse, marginTop: 4 }}
              >
                {hidden ? '••••••' : formatCurrency(ACCOUNT_BALANCE)}
              </Text>
            </View>
            <IconButton
              icon={hidden ? 'eye-off-outline' : 'eye-outline'}
              label={hidden ? 'Show balance' : 'Hide balance'}
              onPress={() => setHidden((v) => !v)}
              style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}
            />
          </View>

          <View style={[styles.totals, { padding: spacing.lg }]}>
            <View style={{ flex: 1 }}>
              <Text variant="caption" tone="secondary">
                Credits
              </Text>
              <Text variant="bodyStrong" tabular tone="success">
                +{formatCurrency(totals.credits)}
              </Text>
            </View>
            <Divider style={{ width: 1, height: 32 }} />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text variant="caption" tone="secondary">
                Debits
              </Text>
              <Text variant="bodyStrong" tabular tone="danger">
                −{formatCurrency(totals.debits)}
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.periodRow}>
          {PERIODS.map((item) => (
            <Chip
              key={item}
              label={item}
              active={period === item}
              onPress={() => setPeriod(item)}
            />
          ))}
        </View>
      </View>

      <FlatList
        data={TRANSACTIONS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: spacing.lg,
            paddingBottom: insets.bottom + spacing.xxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={[styles.listHeader, { paddingBottom: spacing.md }]}>
            <Text variant="sectionLabel" tone="secondary" uppercase>
              Recent transactions
            </Text>
            <Badge label={`${TRANSACTIONS.length} entries`} tone="neutral" />
          </View>
        }
        ListEmptyComponent={
          <Card>
            <EmptyState icon="receipt-outline" title="No transactions" message="Nothing recorded for this period." />
          </Card>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  balanceHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totals: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  list: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
