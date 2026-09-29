import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Text,
  Button,
  Card,
  Section,
  Badge,
  IconButton,
  IconTile,
  Avatar,
  SegmentedControl,
  BankLogo,
  Screen,
  AppHeader,
  ScreenContainer,
  Divider,
} from '@/components/ui';
import { useTheme } from '@/theme';
import { getToken, clearToken } from '@/utils/token';
import { getUserProfile } from '@/app/api/user';

type Service = { icon: keyof typeof Ionicons.glyphMap; label: string; onPress?: () => void; badge?: string };

type TabKey = 'upi' | 'accounts';

const SECTIONS: { title: string; services: Service[] }[] = [
  {
    title: 'Pay & Transfer',
    services: [
      { icon: 'send-outline', label: 'Send Money', onPress: undefined },
      { icon: 'scan-outline', label: 'Direct Pay' },
      { icon: 'people-outline', label: 'Beneficiaries' },
      { icon: 'book-outline', label: 'ePassbook' },
    ],
  },
  {
    title: 'UPI',
    services: [
      { icon: 'qr-code-outline', label: 'Scan QR' },
      { icon: 'phone-portrait-outline', label: 'Pay to Mobile' },
      { icon: 'card-outline', label: 'RuPay Credit Card' },
      { icon: 'flash-outline', label: 'Tap & Pay' },
    ],
  },
  {
    title: 'Deposits',
    services: [
      { icon: 'save-outline', label: 'Open Deposit' },
      { icon: 'document-text-outline', label: 'Term Deposit Receipt' },
      { icon: 'list-outline', label: 'RD Details' },
      { icon: 'lock-closed-outline', label: 'Pre Mature Closure' },
    ],
  },
  {
    title: 'Loans',
    services: [
      { icon: 'flash-outline', label: 'Instant Overdraft' },
      { icon: 'document-text-outline', label: 'Loan Details' },
      { icon: 'card-outline', label: 'Loan Repayment' },
      { icon: 'medal-outline', label: 'Gold Overdraft' },
    ],
  },
  {
    title: 'Lifestyle',
    services: [
      { icon: 'airplane-outline', label: 'Flights' },
      { icon: 'train-outline', label: 'Train Tickets' },
      { icon: 'speedometer-outline', label: 'Free Credit Score' },
      { icon: 'medical-outline', label: 'Healthcare' },
    ],
  },
];

const NAV_ITEMS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'grid-outline', label: 'Home' },
  { icon: 'briefcase-outline', label: 'Cards' },
  { icon: 'wallet-outline', label: 'Accounts' },
  { icon: 'person-outline', label: 'Profile' },
];

export default function BankingDashboard() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>('upi');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await getToken();
        if (!token) {
          router.replace('/');
          return;
        }
        const profile = await getUserProfile(token);
        setUser(profile);
      } catch (err: any) {
        if (err.message?.includes('Typing')) router.replace('/typing_game');
        else if (err.message?.includes('MPIN')) router.replace('/mpin-validation');
        else router.replace('/');
      }
    };
    checkAuth();
  }, []);

  const routeFor = (label: string) => {
    switch (label) {
      case 'Send Money':
        return '/main_menu/send_money';
      case 'Direct Pay':
        return '/main_menu/direct_pay';
      case 'Beneficiaries':
        return '/main_menu/my_beneficiary';
      case 'ePassbook':
        return '/main_menu/ePassbook';
      default:
        return null;
    }
  };

  const handleLogout = async () => {
    await clearToken();
    router.replace('/');
  };

  const handleService = (label: string) => {
    const path = routeFor(label);
    if (path) return router.push(path as any);
    Alert.alert(label, 'This service is not available in the demo build.');
  };

  return (
    <Screen edges={['left', 'right']}>
      <AppHeader
        large
        title={`Welcome, ${user?.username || 'there'}`}
        subtitle="Your accounts are protected by Suraksha"
        trailing={
          <View style={styles.headerActions}>
            <IconButton
              icon="notifications-outline"
              label="Notifications"
              tone="accent"
              onPress={() => Alert.alert('Notifications', 'You have no new alerts.')}
            />
            <IconButton
              icon="log-out-outline"
              label="Sign out"
              tone="danger"
              onPress={handleLogout}
            />
          </View>
        }
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          { padding: spacing.lg, paddingBottom: insets.bottom + 96, gap: spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SegmentedControl<TabKey>
          options={[
            { value: 'upi', label: 'UPI' },
            { value: 'accounts', label: 'Savings & Current' },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'upi' ? (
          <Card padded={false} style={styles.upiCard}>
            <View style={[styles.upiHeader, { padding: spacing.lg, backgroundColor: colors.accentSoft }]}>
              <View style={styles.upiBrand}>
                <BankLogo size={26} />
                <View style={{ marginLeft: 10 }}>
                  <Text variant="captionStrong" tone="accent">
                    Canara Bank
                  </Text>
                  <Text variant="footnote" tone="secondary">
                    UPI handle active
                  </Text>
                </View>
              </View>
              <Badge label="Active" tone="success" />
            </View>

            <View style={{ padding: spacing.lg, gap: spacing.md }}>
              <View>
                <Text variant="caption" tone="secondary">
                  Your UPI ID
                </Text>
                <Text variant="title3" style={{ marginTop: 2 }}>
                  6283760168@cnrb
                </Text>
              </View>
              <Divider />
              <Text variant="footnote" tone="secondary">
                Link any bank account or RuPay credit card to pay from this handle.
              </Text>
            </View>
          </Card>
        ) : (
          <Card padded={false} style={styles.upiCard}>
            {[
              { label: 'Savings Account', number: 'XXXX XXXX 7890', balance: '₹45,750.50' },
              { label: 'Current Account', number: 'XXXX XXXX 4312', balance: '₹1,24,908.00' },
            ].map((account, index) => (
              <View key={account.label}>
                {index > 0 ? <Divider inset={spacing.lg} /> : null}
                <View style={[styles.accountRow, { padding: spacing.lg }]}>
                  <IconTile name="wallet-outline" tone="accent" />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{account.label}</Text>
                    <Text variant="caption" tone="tertiary">
                      {account.number}
                    </Text>
                  </View>
                  <Text variant="subhead" tabular>
                    {account.balance}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        <Card tight>
          <View style={styles.quickRow}>
            <QuickAction icon="scan-outline" label="Scan & Pay" onPress={() => router.push('/main_menu/direct_pay')} />
            <QuickAction icon="send-outline" label="Send" onPress={() => router.push('/main_menu/send_money')} />
            <QuickAction icon="people-outline" label="Payee" onPress={() => router.push('/main_menu/my_beneficiary')} />
            <QuickAction icon="book-outline" label="Passbook" onPress={() => router.push('/main_menu/ePassbook')} />
          </View>
        </Card>

        {SECTIONS.map((section) => (
          <Section
            key={section.title}
            title={section.title}
            action={
              <Pressable
                onPress={() => Alert.alert(section.title, 'More services coming soon.')}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text variant="footnote" tone="accent">
                  View all
                </Text>
              </Pressable>
            }
          >
            <Card tight>
              <View style={styles.serviceGrid}>
                {section.services.map((service) => (
                  <Pressable
                    key={service.label}
                    onPress={() => handleService(service.label)}
                    accessibilityRole="button"
                    accessibilityLabel={service.label}
                    style={({ pressed }) => [
                      styles.service,
                      {
                        borderRadius: radius.md,
                        backgroundColor: pressed ? colors.surfaceSunken : 'transparent',
                      },
                    ]}
                  >
                    <IconTile name={service.icon} size={20} tileSize={40} />
                    <Text variant="caption" tone="secondary" numberOfLines={2} center style={styles.serviceLabel}>
                      {service.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          </Section>
        ))}

        <Card tight>
          <View style={[styles.securityRow, { padding: spacing.lg }]}>
            <IconTile name="shield-checkmark-outline" tone="success" />
            <View style={{ flex: 1 }}>
              <Text variant="subhead" style={styles.securityTitle}>
                Session protected
              </Text>
              <Text variant="caption" tone="secondary">
                Behavioural profile re-verified just now.
              </Text>
            </View>
            <Badge label="Tier 1" tone="success" />
          </View>
        </Card>
      </ScrollView>

      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colors.bgElevated,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.md,
            paddingHorizontal: spacing.sm,
          },
        ]}
      >
        {NAV_ITEMS.map((item, index) => (
          <Pressable
            key={item.label}
            onPress={() => (index === 0 ? undefined : Alert.alert(item.label, 'Coming soon.'))}
            accessibilityRole="tab"
            accessibilityState={{ selected: index === 0 }}
            accessibilityLabel={item.label}
            style={styles.tabItem}
          >
            <Ionicons
              name={item.icon}
              size={22}
              color={index === 0 ? colors.accent : colors.textTertiary}
            />
            <Text variant="caption" style={{ color: index === 0 ? colors.accent : colors.textTertiary }}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.quickAction,
        {
          borderRadius: 12,
          backgroundColor: pressed ? colors.surfaceSunken : 'transparent',
          paddingVertical: spacing.md,
        },
      ]}
    >
      <IconTile name={icon} size={20} tileSize={40} />
      <Text variant="caption" tone="secondary" style={{ marginTop: 8 }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollContent: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  upiCard: {
    overflow: 'hidden',
  },
  upiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upiBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  quickRow: {
    flexDirection: 'row',
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  service: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    gap: 8,
  },
  serviceLabel: {
    lineHeight: 15,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  securityTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
});
