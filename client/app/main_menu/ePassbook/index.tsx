import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  balance: number;
  reference: string;
}

export default function EPassbookScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [accountBalance] = useState(45750.50);
  const router = useRouter();

  const periods = ['This Month', 'Last Month', 'Last 3 Months', 'Last 6 Months'];

  const transactions: Transaction[] = [
    {
      id: '1',
      date: '2024-01-15',
      description: 'UPI Payment to John Doe',
      amount: -2500,
      type: 'debit',
      balance: 45750.50,
      reference: 'UPI/402123456789'
    },
    {
      id: '2',
      date: '2024-01-14',
      description: 'Salary Credit',
      amount: 50000,
      type: 'credit',
      balance: 48250.50,
      reference: 'NEFT/SAL/JAN2024'
    },
    {
      id: '3',
      date: '2024-01-12',
      description: 'ATM Withdrawal',
      amount: -5000,
      type: 'debit',
      balance: -1749.50,
      reference: 'ATM/WDL/123456'
    },
    {
      id: '4',
      date: '2024-01-10',
      description: 'Online Shopping',
      amount: -3200,
      type: 'debit',
      balance: 3250.50,
      reference: 'CARD/POS/AMAZON'
    },
    {
      id: '5',
      date: '2024-01-08',
      description: 'Interest Credit',
      amount: 450.50,
      type: 'credit',
      balance: 6450.50,
      reference: 'INT/CREDIT/Q4'
    }
  ];

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>{item.description}</Text>
          <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
          <Text style={styles.transactionReference}>Ref: {item.reference}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={[
            styles.transactionAmount,
            { color: item.type === 'credit' ? '#4CAF50' : '#F44336' }
          ]}>
            {item.type === 'credit' ? '+' : '-'}{formatAmount(item.amount)}
          </Text>
          <Text style={styles.balanceText}>
            Bal: {formatAmount(item.balance)}
          </Text>
        </View>
      </View>
      
      <View style={styles.transactionFooter}>
        <View style={[
          styles.typeIndicator,
          { backgroundColor: item.type === 'credit' ? '#4CAF50' : '#F44336' }
        ]}>
          <Ionicons 
            name={item.type === 'credit' ? 'arrow-down' : 'arrow-up'} 
            size={12} 
            color="#fff" 
          />
          <Text style={styles.typeText}>
            {item.type === 'credit' ? 'Credit' : 'Debit'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#019EEC', '#0080CC']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ePassbook</Text>
        <TouchableOpacity>
          <Ionicons name="download-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Account Summary */}
      <View style={styles.summaryCard}>
        <LinearGradient
          colors={['#019EEC', '#8B5CF6', '#FFB600']}
          style={styles.summaryGradient}
        >
          <View style={styles.summaryContent}>
            <Text style={styles.accountLabel}>Account Balance</Text>
            <Text style={styles.balanceAmount}>{formatAmount(accountBalance)}</Text>
            <Text style={styles.accountNumber}>A/C: XXXX XXXX 7890</Text>
          </View>
          <View style={styles.summaryActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="eye-outline" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="refresh-outline" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Period Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodContainer}>
        {periods.map(period => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.selectedPeriod
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text style={[
              styles.periodText,
              selectedPeriod === period && styles.selectedPeriodText
            ]}>
              {period}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Transaction Summary */}
      <View style={styles.transactionSummary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Credits</Text>
          <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
            +₹50,450.50
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Debits</Text>
          <Text style={[styles.summaryValue, { color: '#F44336' }]}>
            -₹10,700.00
          </Text>
        </View>
      </View>

      {/* Transactions List */}
      <View style={styles.transactionsContainer}>
        <View style={styles.transactionsHeader}>
          <Text style={styles.transactionsTitle}>Recent Transactions</Text>
          <TouchableOpacity>
            <Ionicons name="filter-outline" size={20} color="#019EEC" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.transactionsList}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  summaryCard: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  summaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  summaryContent: { flex: 1 },
  accountLabel: { color: '#E8F4FD', fontSize: 14, marginBottom: 4 },
  balanceAmount: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  accountNumber: { color: '#E8F4FD', fontSize: 14 },
  summaryActions: { gap: 12 },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedPeriod: { backgroundColor: '#019EEC', borderColor: '#019EEC' },
  periodText: { color: '#666', fontSize: 14 },
  selectedPeriodText: { color: '#fff' },
  transactionSummary: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '600' },
  summaryDivider: { width: 1, backgroundColor: '#e0e0e0', marginHorizontal: 16 },
  transactionsContainer: { flex: 1, paddingHorizontal: 16 },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionsTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  transactionsList: { paddingBottom: 20 },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  transactionInfo: { flex: 1, marginRight: 12 },
  transactionDescription: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  transactionDate: { fontSize: 12, color: '#666', marginBottom: 2 },
  transactionReference: { fontSize: 10, color: '#999' },
  amountContainer: { alignItems: 'flex-end' },
  transactionAmount: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  balanceText: { fontSize: 12, color: '#666' },
  transactionFooter: { marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  typeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
});
