import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function DirectPayScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const router = useRouter();

  const categories = ['All', 'Utilities', 'Recharge', 'Insurance', 'Education'];
  
  const merchants = [
    { id: 1, name: 'Electricity Bill', category: 'Utilities', icon: '⚡', color: '#FFB600' },
    { id: 2, name: 'Mobile Recharge', category: 'Recharge', icon: '📱', color: '#4CAF50' },
    { id: 3, name: 'Gas Bill', category: 'Utilities', icon: '🔥', color: '#FF5722' },
    { id: 4, name: 'Water Bill', category: 'Utilities', icon: '💧', color: '#2196F3' },
    { id: 5, name: 'DTH Recharge', category: 'Recharge', icon: '📺', color: '#9C27B0' },
    { id: 6, name: 'Insurance Premium', category: 'Insurance', icon: '🛡️', color: '#FF9800' },
  ];

  const filteredMerchants = merchants.filter(merchant => {
    const matchesCategory = selectedCategory === 'All' || merchant.category === selectedCategory;
    const matchesSearch = merchant.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#019EEC', '#0080CC']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Direct Pay</Text>
        <TouchableOpacity>
          <Ionicons name="qr-code-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search merchants, bills..."
          />
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.selectedCategory
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === category && styles.selectedCategoryText
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Recent Payments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          <View style={styles.recentPayments}>
            {['Electricity', 'Mobile', 'Gas'].map((item, index) => (
              <TouchableOpacity key={index} style={styles.recentItem}>
                <View style={styles.recentIcon}>
                  <Text style={styles.recentEmoji}>
                    {item === 'Electricity' ? '⚡' : item === 'Mobile' ? '📱' : '🔥'}
                  </Text>
                </View>
                <Text style={styles.recentText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Merchants Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pay Bills</Text>
          <View style={styles.merchantsGrid}>
            {filteredMerchants.map(merchant => (
              <TouchableOpacity key={merchant.id} style={styles.merchantCard}>
                <View style={[styles.merchantIcon, { backgroundColor: merchant.color + '20' }]}>
                  <Text style={styles.merchantEmoji}>{merchant.icon}</Text>
                </View>
                <Text style={styles.merchantName}>{merchant.name}</Text>
                <Text style={styles.merchantCategory}>{merchant.category}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="qr-code-outline" size={24} color="#019EEC" />
              <Text style={styles.quickActionText}>Scan QR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="card-outline" size={24} color="#019EEC" />
              <Text style={styles.quickActionText}>Pay by Card</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="time-outline" size={24} color="#019EEC" />
              <Text style={styles.quickActionText}>History</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: { flex: 1, paddingVertical: 12, marginLeft: 8, fontSize: 16 },
  categoriesContainer: { marginBottom: 24 },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedCategory: { backgroundColor: '#019EEC', borderColor: '#019EEC' },
  categoryText: { color: '#666', fontSize: 14 },
  selectedCategoryText: { color: '#fff' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#333' },
  recentPayments: { flexDirection: 'row', gap: 16 },
  recentItem: { alignItems: 'center' },
  recentIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentEmoji: { fontSize: 24 },
  recentText: { fontSize: 12, color: '#666' },
  merchantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  merchantCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  merchantIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  merchantEmoji: { fontSize: 24 },
  merchantName: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  merchantCategory: { fontSize: 12, color: '#666' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around' },
  quickAction: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
  },
  quickActionText: { fontSize: 12, color: '#019EEC', marginTop: 8 },
});
