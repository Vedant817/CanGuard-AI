import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getToken,clearToken } from '@/utils/token';
import {getUserProfile} from '@/app/api/user';



export default function BankingDashboard() {
  const [selectedTab, setSelectedTab] = useState('UPI');
  const [user,setUser] = useState<any>(null);
  const router = useRouter();

    useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await getToken();
        if (!token) {
          router.replace('/'); 
          return;
        }
        await getUserProfile(token); 
        const userProfile = await getUserProfile(token);
        setUser(userProfile); 
      } catch (err: any) {
        if (err.message?.includes('Typing')) {
          router.replace('/typing_game');
        } else if (err.message?.includes('MPIN')) {
          router.replace('/mpin-validation');
        } else {
          router.replace('/');
        }
      }
    };

    checkAuth();
  }, [])

  const handleLogout = async () => {
  await clearToken();
  router.replace('/');
};


  const HeaderIcon = ({ name, color = '#019EEC' }: { name: string; color?: string }) => (
    <TouchableOpacity style={styles.headerIcon}>
      <Ionicons name={name as any} size={24} color={color} />
    </TouchableOpacity>
  );

  const ServiceCard = ({ 
    icon, 
    title, 
    subtitle, 
    onPress 
  }: { 
    icon: string; 
    title: string; 
    subtitle?: string; 
    onPress?: () => void;
  }) => (
    <TouchableOpacity style={styles.serviceCard} onPress={onPress}>
      <View style={styles.serviceIconContainer}>
        <Ionicons name={icon as any} size={24} color="#019EEC" />
      </View>
      <Text style={styles.serviceTitle}>{title}</Text>
      {subtitle && <Text style={styles.serviceSubtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.profileIcon}>
            <Text style={styles.profileText}>U</Text>
          </View>
          <Text style={styles.headerTitle}>Welcome, {user?.username || 'User'}</Text>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon} onPress={handleLogout}>
  <Ionicons name="power-outline" size={24} color="red" />
</TouchableOpacity>

        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'UPI' && styles.activeTab]}
            onPress={() => setSelectedTab('UPI')}
          >
            <Text style={[styles.tabText, selectedTab === 'UPI' && styles.activeTabText]}>
              UPI
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'SB/CA/OD' && styles.activeTab]}
            onPress={() => setSelectedTab('SB/CA/OD')}
          >
            <Text style={[styles.tabText, selectedTab === 'SB/CA/OD' && styles.activeTabText]}>
              SB/CA/OD
            </Text>
          </TouchableOpacity>
        </View>

        {/* UPI Card */}
        <LinearGradient
          colors={['#019EEC', '#8B5CF6', '#FFB600']}
          style={styles.upiCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.upiCardHeader}>
            <View style={styles.logoContainer}>
              <View style={styles.logoTriangle1} />
              <View style={styles.logoTriangle2} />
            </View>
            <Text style={styles.bankName}>Canara Bank</Text>
            <Text style={styles.accountsText}>Accounts</Text>
          </View>
          
          <View style={styles.upiCardContent}>
            <TouchableOpacity style={styles.activeUpiButton}>
              <Text style={styles.activeUpiText}>Active UPI</Text>
            </TouchableOpacity>
            
            <View style={styles.upiInfo}>
              <Text style={styles.upiDescription}>
                Link any Bank account/Rupay Credit Card
              </Text>
            </View>
            
            <View style={styles.upiLogo}>
              <Text style={styles.upiLogoText}>@1</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Add Bank Account Link */}
        <TouchableOpacity style={styles.addBankLink}>
          <Text style={styles.addBankText}>Add Bank A/C or Credit Card</Text>
        </TouchableOpacity>

        {/* Promotional Banner */}
        <View style={styles.promoBanner}>
          <LinearGradient
            colors={['#019EEC', '#0080CC']}
            style={styles.promoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.promoContent}>
              <Text style={styles.promoTitle}>YOUR ACCOUNT FREEDOM</Text>
              <Text style={styles.promoSubtitle}>
                Penalty on Non-maintenance of Minimum Balance
              </Text>
              <Text style={styles.promoDescription}>
                Special benefit available to all Savings Bank Account Holders
              </Text>
            </View>
            <View style={styles.promoImage}>
              <View style={styles.coupleIcon} />
            </View>
          </LinearGradient>
        </View>

        {/* Pay & Transfer Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pay & Transfer</Text>
            <TouchableOpacity style={styles.moreButton}>
              <Text style={styles.moreText}>More</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.servicesGrid}>
            <ServiceCard icon="send-outline" title="Send Money" onPress={()=>router.push('/main_menu/send_money')}/>
            <ServiceCard icon="card-outline" title="Direct Pay" onPress={()=>router.push('/main_menu/direct_pay')}/>
            <ServiceCard icon="person-outline" title="My Beneficiary" onPress={()=>router.push('/main_menu/my_beneficiary')}/>
            <ServiceCard icon="book-outline" title="ePassbook" onPress={()=>router.push('/main_menu/ePassbook')}/>
            <ServiceCard icon="receipt-outline" title="Bill Pay" />
            <ServiceCard icon="wallet-outline" title="Card-less Cash" />
            <ServiceCard icon="business-outline" title="Other Bank Accounts" />
            <ServiceCard icon="time-outline" title="History" />
          </View>
        </View>

        {/* UPI Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>UPI (My UPI ID: 6283760168@cnrb)</Text>
            <TouchableOpacity style={styles.moreButton}>
              <Text style={styles.moreText}>More</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.servicesGrid}>
            <ServiceCard icon="add-outline" title="Register" />
            <ServiceCard icon="qr-code-outline" title="Scan any UPI QR" />
            <ServiceCard icon="send-outline" title="Send Money to any UPI app" />
            <ServiceCard icon="call-outline" title="Pay to Contact/ Mobile Number" />
            <ServiceCard icon="checkmark-outline" title="Approve Payment" />
            <ServiceCard icon="card-outline" title="Add RuPay Credit Card t..." />
            <ServiceCard icon="tap-outline" title="Tap & Pay" subtitle="New" />
            <ServiceCard icon="phone-portrait-outline" title="UPI Lite" />
          </View>
        </View>

        {/* Deposits Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Deposits</Text>
            <TouchableOpacity style={styles.moreButton}>
              <Text style={styles.moreText}>More</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.servicesGrid}>
            <ServiceCard icon="safe-outline" title="Open Deposit" />
            <ServiceCard icon="document-outline" title="Term Deposit Receipt" />
            <ServiceCard icon="trending-up-outline" title="Canara Dhanvarsha ..." />
            <ServiceCard icon="list-outline" title="RD Details" />
            <ServiceCard icon="cash-outline" title="Payment Of RD Installment" />
            <ServiceCard icon="time-outline" title="Pre Mature Closure Of R..." />
            <ServiceCard icon="close-outline" title="Close Fixed Deposit" />
            <ServiceCard icon="create-outline" title="Modify Fixed Deposit" />
          </View>
        </View>

        {/* Loans Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Loans</Text>
            <TouchableOpacity style={styles.moreButton}>
              <Text style={styles.moreText}>More</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.servicesGrid}>
            <ServiceCard icon="flash-outline" title="Instant Overdraft" />
            <ServiceCard icon="document-text-outline" title="Loan Details" />
            <ServiceCard icon="card-outline" title="Loan Repayment" />
            <ServiceCard icon="medal-outline" title="Gold OD" />
            <ServiceCard icon="heart-outline" title="Canara HEAL" />
            <ServiceCard icon="trending-up-outline" title="Loan Against Mutual Funds" />
            <ServiceCard icon="receipt-outline" title="Loan Account Statement" />
            <ServiceCard icon="calculator-outline" title="Actual Interest Collected" />
          </View>
        </View>

        {/* LifeStyle Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>LifeStyle</Text>
            <TouchableOpacity style={styles.moreButton}>
              <Text style={styles.moreText}>More</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.servicesGrid}>
            <ServiceCard icon="train-outline" title="Train Tickets" />
            <ServiceCard icon="airplane-outline" title="Flights" />
            <ServiceCard icon="speedometer-outline" title="Free Credit Score" />
            <ServiceCard icon="basket-outline" title="Shopping" />
            <ServiceCard icon="phone-portrait-outline" title="Recharge" />
            <ServiceCard icon="globe-outline" title="Experiences" />
            <ServiceCard icon="medical-outline" title="Healthcare" />
            <ServiceCard icon="gift-outline" title="E-Gift Card" />
          </View>
        </View>

        {/* Stores & Offers Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Stores & Offers</Text>
            <TouchableOpacity style={styles.moreButton}>
              <Text style={styles.moreText}>More</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.servicesGrid}>
            <ServiceCard icon="trophy-outline" title="Rewards" />
            <ServiceCard icon="flame-outline" title="Hot Deals" />
            <ServiceCard icon="pricetag-outline" title="Offers" />
            <ServiceCard icon="storefront-outline" title="Flipkart" />
            <ServiceCard icon="logo-amazon" title="Amazon" />
            <ServiceCard icon="play-outline" title="Amazon Prime" />
            <ServiceCard icon="call-outline" title="Airtel Postpaid" />
            <ServiceCard icon="medical-outline" title="MediBuddy" />
          </View>
        </View>

        {/* FOREX Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>FOREX</Text>
          
          <View style={styles.servicesGrid}>
            <ServiceCard icon="person-outline" title="FOREX Beneficiary ..." />
            <ServiceCard icon="arrow-forward-outline" title="Outward Remittance" />
            <ServiceCard icon="swap-horizontal-outline" title="Exchange Rate Enquiry" />
            <ServiceCard icon="arrow-back-outline" title="Inward Remittance" />
          </View>
        </View>

        {/* Accounts & Services Section */}
        <View style={[styles.sectionContainer, { marginBottom: 100 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Accounts & Services</Text>
            <TouchableOpacity style={styles.moreButton}>
              <Text style={styles.moreText}>More</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.servicesGrid}>
            <ServiceCard icon="lock-closed-outline" title="Apply for Locker" />
            <ServiceCard icon="trending-up-outline" title="Wealth Management" />
            <ServiceCard icon="shield-outline" title="NACH Mandate Cancellation" />
            <ServiceCard icon="checkmark-outline" title="Cheque Book Request & Tr..." />
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="grid-outline" size={24} color="#333" />
          <Text style={styles.navText}>All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="business-outline" size={24} color="#666" />
        </TouchableOpacity>
        
        {/* Scan & Pay Button */}
        <TouchableOpacity style={styles.scanPayButton}>
          <LinearGradient
            colors={['#019EEC', '#0080CC']}
            style={styles.scanPayGradient}
          >
            <Ionicons name="qr-code-outline" size={24} color="#fff" />
            <Text style={styles.scanPayText}>Scan & Pay</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="card-outline" size={24} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIcon: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    backgroundColor: '#e9ecef',
    borderRadius: 25,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#019EEC',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  upiCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  upiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    width: 30,
    height: 30,
    position: 'relative',
    marginRight: 12,
  },
  logoTriangle1: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 26,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFB600',
  },
  logoTriangle2: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderBottomWidth: 19,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#fff',
    transform: [{ rotate: '180deg' }],
  },
  bankName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 'auto',
  },
  accountsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  upiCardContent: {
    alignItems: 'center',
  },
  activeUpiButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 16,
  },
  activeUpiText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  upiInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  upiDescription: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  upiLogo: {
    position: 'absolute',
    right: 20,
    top: 0,
  },
  upiLogoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  addBankLink: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
  },
  addBankText: {
    color: '#019EEC',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  promoBanner: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  promoGradient: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  promoSubtitle: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  promoDescription: {
    color: '#E8F4FD',
    fontSize: 12,
  },
  promoImage: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coupleIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  moreButton: {
    backgroundColor: '#019EEC',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  moreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  servicesGrid: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 20,
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
    fontWeight: '500',
  },
  serviceSubtitle: {
    fontSize: 10,
    color: '#FF6B6B',
    marginTop: 2,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    alignItems: 'center',
    padding: 8,
  },
  navText: {
    fontSize: 12,
    color: '#333',
    marginTop: 4,
  },
  scanPayButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  scanPayGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  scanPayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
