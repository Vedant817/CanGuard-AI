import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Beneficiary {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  ifsc: string;
  type: 'UPI' | 'Account';
  upiId?: string;
  lastUsed: string;
}

export default function MyBeneficiaryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'All' | 'UPI' | 'Account'>('All');
  const router = useRouter();

  const beneficiaries: Beneficiary[] = [
    {
      id: '1',
      name: 'John Doe',
      accountNumber: '1234567890',
      bankName: 'Canara Bank',
      ifsc: 'CNRB0001234',
      type: 'Account',
      lastUsed: '2 days ago'
    },
    {
      id: '2',
      name: 'Jane Smith',
      accountNumber: '',
      bankName: '',
      ifsc: '',
      type: 'UPI',
      upiId: 'jane@paytm',
      lastUsed: '1 week ago'
    },
    {
      id: '3',
      name: 'Mike Johnson',
      accountNumber: '9876543210',
      bankName: 'HDFC Bank',
      ifsc: 'HDFC0001234',
      type: 'Account',
      lastUsed: '3 days ago'
    }
  ];

  const filteredBeneficiaries = beneficiaries.filter(beneficiary => {
    const matchesType = selectedType === 'All' || beneficiary.type === selectedType;
    const matchesSearch = beneficiary.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         beneficiary.upiId?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleSendMoney = (beneficiary: Beneficiary) => {
    Alert.alert(
      'Send Money',
      `Send money to ${beneficiary.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => router.push('/send-money') }
      ]
    );
  };

  const handleDeleteBeneficiary = (beneficiary: Beneficiary) => {
    Alert.alert(
      'Delete Beneficiary',
      `Remove ${beneficiary.name} from beneficiaries?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => console.log('Delete beneficiary') }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#019EEC', '#0080CC']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Beneficiaries</Text>
        <TouchableOpacity onPress={() => router.push('/add-beneficiary')}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search beneficiaries..."
          />
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {['All', 'UPI', 'Account'].map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterButton,
                selectedType === type && styles.selectedFilter
              ]}
              onPress={() => setSelectedType(type as any)}
            >
              <Text style={[
                styles.filterText,
                selectedType === type && styles.selectedFilterText
              ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Beneficiaries List */}
        <ScrollView style={styles.beneficiariesList}>
          {filteredBeneficiaries.map(beneficiary => (
            <View key={beneficiary.id} style={styles.beneficiaryCard}>
              <View style={styles.beneficiaryInfo}>
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>
                    {beneficiary.name.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
                
                <View style={styles.details}>
                  <Text style={styles.beneficiaryName}>{beneficiary.name}</Text>
                  {beneficiary.type === 'UPI' ? (
                    <Text style={styles.beneficiaryDetail}>{beneficiary.upiId}</Text>
                  ) : (
                    <>
                      <Text style={styles.beneficiaryDetail}>
                        {beneficiary.accountNumber.replace(/(.{4})/g, '$1 ')}
                      </Text>
                      <Text style={styles.beneficiaryBank}>{beneficiary.bankName}</Text>
                    </>
                  )}
                  <Text style={styles.lastUsed}>Last used: {beneficiary.lastUsed}</Text>
                </View>

                <View style={styles.typeContainer}>
                  <View style={[
                    styles.typeBadge,
                    { backgroundColor: beneficiary.type === 'UPI' ? '#4CAF50' : '#2196F3' }
                  ]}>
                    <Text style={styles.typeText}>{beneficiary.type}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={() => handleSendMoney(beneficiary)}
                >
                  <Ionicons name="send-outline" size={16} color="#019EEC" />
                  <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteBeneficiary(beneficiary)}
                >
                  <Ionicons name="trash-outline" size={16} color="#FF5722" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Add Beneficiary Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add-beneficiary')}
        >
          <LinearGradient
            colors={['#019EEC', '#0080CC']}
            style={styles.addGradient}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add New Beneficiary</Text>
          </LinearGradient>
        </TouchableOpacity>
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
  content: { flex: 1, padding: 16 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: { flex: 1, paddingVertical: 12, marginLeft: 8, fontSize: 16 },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#e9ecef',
    borderRadius: 25,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
  },
  selectedFilter: { backgroundColor: '#019EEC' },
  filterText: { color: '#666', fontSize: 14 },
  selectedFilterText: { color: '#fff' },
  beneficiariesList: { flex: 1 },
  beneficiaryCard: {
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
  beneficiaryInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#019EEC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  details: { flex: 1 },
  beneficiaryName: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  beneficiaryDetail: { fontSize: 14, color: '#666', marginBottom: 2 },
  beneficiaryBank: { fontSize: 12, color: '#999' },
  lastUsed: { fontSize: 12, color: '#999', marginTop: 4 },
  typeContainer: { alignItems: 'flex-end' },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  sendButtonText: { color: '#019EEC', fontSize: 14, fontWeight: '500' },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#ffebee',
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
  },
  addGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
