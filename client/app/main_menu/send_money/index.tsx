import React, { useState, useEffect, useRef, use } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import API_BASE_URL from '@/config/api';
import { getBehavioralData, BehavioralDataResponse } from '@/services/behavioralService';

const { width } = Dimensions.get('window');

interface EnhancedKeystrokeData {
  key: string;
  timestamp: number;
  pressTime: number;
  releaseTime: number;
  dwellTime: number;
  flightTime: number;
  correct: boolean;
  position: number;
  pressure?: number;
  isBackspace: boolean;
  inputLatency: number;
  systemLatency: number;
}

interface DeviceMetrics {
  keyboardLatency: number[];
  ipAddress: string;
  deviceUUID: string;
  gpsLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  } | null;
  deviceInfo: {
    brand: string;
    model: string;
    systemVersion: string;
    uniqueId: string;
    deviceType: string;
    totalMemory: number;
    usedMemory: number;
    batteryLevel: number;
    isCharging: boolean;
  };
  networkInfo: {
    type: string;
    isConnected: boolean;
    isInternetReachable: boolean;
  };
}

interface BehavioralVector {
  wpm: number;
  accuracy: number;
  typingSpeed: number;
  errorRate: number;
  averageKeyHoldTime: number;
  averageFlightTime: number;
  averageKeyboardLatency: number;
  averageTapRhythm: number;
  timestamp: number;
  keysPressed: number;
  correctKeys: number;
  startTime: number;
}

class BehavioralDataCollector {
  private vectors: BehavioralVector[] = [];
  private currentVector: BehavioralVector;
  private keystrokeData: EnhancedKeystrokeData[] = [];
  private deviceMetrics: DeviceMetrics;
  private isCollecting = false;
  private collectionInterval: NodeJS.Timeout | null = null;
  private readonly COLLECTION_INTERVAL = 6000; // 6 seconds
  private readonly BUFFER_SIZE = 5; // Latest 5 vectors

  constructor(deviceMetrics: DeviceMetrics) {
    this.deviceMetrics = deviceMetrics;
    this.currentVector = this.initializeVector();
  }

  private initializeVector(): BehavioralVector {
    return {
      wpm: 0,
      accuracy: 0,
      typingSpeed: 0,
      errorRate: 0,
      averageKeyHoldTime: 0,
      averageFlightTime: 0,
      averageKeyboardLatency: 0,
      averageTapRhythm: 0,
      timestamp: Date.now(),
      keysPressed: 0,
      correctKeys: 0,
      startTime: Date.now()
    };
  }

  startCollection() {
    this.isCollecting = true;
    this.currentVector = this.initializeVector();
    this.collectionInterval = setInterval(() => {
      this.captureVector();
    }, this.COLLECTION_INTERVAL);
    console.log('🔄 Behavioral data collection started (6-second intervals)');
  }

  stopCollection() {
    this.isCollecting = false;
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    if (this.currentVector.keysPressed > 0) {
      this.captureVector();
    }
    console.log('⏹️ Behavioral data collection stopped');
  }

  addKeystroke(keystroke: EnhancedKeystrokeData) {
    if (!this.isCollecting) return;
    if (keystroke.isBackspace) return; // Exclude backspace
    
    this.keystrokeData.push(keystroke);
    this.currentVector.keysPressed++;
    if (keystroke.correct) {
      this.currentVector.correctKeys++;
    }
  }

  private captureVector() {
    if (this.currentVector.keysPressed === 0) return;
    
    const currentTime = Date.now();
    const timeElapsed = (currentTime - this.currentVector.startTime) / 1000;
    const timeElapsedMinutes = timeElapsed / 60;
    
    const validKeystrokes = this.keystrokeData.filter(k => !k.isBackspace);
    const dwellTimes = validKeystrokes.map(k => k.dwellTime).filter(t => t > 0);
    const flightTimes = validKeystrokes.map(k => k.flightTime).filter(t => t > 0);
    const latencies = this.deviceMetrics.keyboardLatency.slice(-this.currentVector.keysPressed);
    
    const tapIntervals = [];
    for (let i = 1; i < validKeystrokes.length; i++) {
      tapIntervals.push(validKeystrokes[i].timestamp - validKeystrokes[i-1].timestamp);
    }

    const vector: BehavioralVector = {
      wpm: timeElapsedMinutes > 0 ? (this.currentVector.keysPressed / 5) / timeElapsedMinutes : 0,
      accuracy: this.currentVector.keysPressed > 0 ? 
        (this.currentVector.correctKeys / this.currentVector.keysPressed) * 100 : 0,
      typingSpeed: timeElapsed > 0 ? this.currentVector.keysPressed / timeElapsed : 0,
      errorRate: this.currentVector.keysPressed > 0 ? 
        ((this.currentVector.keysPressed - this.currentVector.correctKeys) / this.currentVector.keysPressed) * 100 : 0,
      averageKeyHoldTime: this.calculateAverage(dwellTimes),
      averageFlightTime: this.calculateAverage(flightTimes),
      averageKeyboardLatency: this.calculateAverage(latencies),
      averageTapRhythm: this.calculateAverage(tapIntervals),
      timestamp: currentTime,
      keysPressed: this.currentVector.keysPressed,
      correctKeys: this.currentVector.correctKeys,
      startTime: this.currentVector.startTime
    };

    this.vectors.push(vector);
    if (this.vectors.length > this.BUFFER_SIZE) {
      this.vectors.shift();
    }

    console.log('📊 Vector captured:', vector);
    this.currentVector = this.initializeVector();
    this.keystrokeData = [];
  }

  private calculateAverage(array: number[]): number {
    if (array.length === 0) return 0;
    return array.reduce((sum, val) => sum + val, 0) / array.length;
  }

  private calculateStandardDeviation(array: number[]): number {
    if (array.length === 0) return 0;
    const mean = this.calculateAverage(array);
    const squaredDiffs = array.map(val => Math.pow(val - mean, 2));
    return Math.sqrt(this.calculateAverage(squaredDiffs));
  }

  getFinalMetrics() {
    if (this.vectors.length === 0) {
      return {
        averageMetrics: this.initializeVector(),
        standardDeviations: this.initializeVector(),
        vectorCount: 0
      };
    }

    const metrics = ['wpm', 'accuracy', 'typingSpeed', 'errorRate',
      'averageKeyHoldTime', 'averageFlightTime',
      'averageKeyboardLatency', 'averageTapRhythm'] as const;
    
    const averageMetrics: any = {};
    const standardDeviations: any = {};
    
    metrics.forEach(metric => {
      const values = this.vectors.map(v => v[metric]);
      averageMetrics[metric] = this.calculateAverage(values);
      standardDeviations[metric] = this.calculateStandardDeviation(values);
    });

    return {
      averageMetrics,
      standardDeviations,
      vectorCount: this.vectors.length,
      vectors: this.vectors
    };
  }
}

export default function SendMoneyScreen() {
  const typingStats = useRef<BehavioralVector[]>([]);
  const [behavioralCollector, setBehavioralCollector] = useState<BehavioralDataCollector | null>(null);
  const [isTypingActive, setIsTypingActive] = useState(false);
  const [currentTypingStats, setCurrentTypingStats] = useState({
    wpm: 0,
    accuracy: 0,
    typingSpeed: 0,
    errorRate: 0,
    averageKeyHoldTime: 0,
    averageFlightTime: 0,
    averageKeyboardLatency: 0,
    averageTapRhythm: 0
  });

  const [recipientName, setRecipientName] = useState('');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [amount, setAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [deviceMetrics, setDeviceMetrics] = useState<DeviceMetrics>({
    keyboardLatency: [],
    ipAddress: '',
    deviceUUID: '',
    gpsLocation: null,
    deviceInfo: {
      brand: '',
      model: '',
      systemVersion: '',
      uniqueId: '',
      deviceType: '',
      totalMemory: 0,
      usedMemory: 0,
      batteryLevel: 0,
      isCharging: false,
    },
    networkInfo: {
      type: '',
      isConnected: false,
      isInternetReachable: false,
    }
  });

  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const keyPressStartTime = useRef(0);
  const lastKeystrokeTime = useRef(0);
  const keyPressTimestamp = useRef(0);
  const [behavioralData, setBehavioralData] = useState<BehavioralDataResponse | null>(null);

  const fetchBehavioralData = async () => {
  try {
    const data = await getBehavioralData();
    if (data) {
      setBehavioralData(data);
    }
  } catch (error) {
    console.error('Error fetching behavioral data:', error);
  }
};


  useEffect(() => {
    fetchBehavioralData();
    initializeBehavioralCollection();
    return () => {
      if (behavioralCollector) {
        behavioralCollector.stopCollection();
      }
    };
  }, []);




  const getOrCreateDeviceUUID = async (): Promise<string> => {
    try {
      let deviceUUID = await SecureStore.getItemAsync('secure_deviceid');
      if (deviceUUID) {
        deviceUUID = JSON.parse(deviceUUID);
      } else {
        deviceUUID = uuidv4();
        await SecureStore.setItemAsync('secure_deviceid', JSON.stringify(deviceUUID));
      }
      return deviceUUID;
    } catch (error) {
      console.error('Error handling device UUID:', error);
      return uuidv4();
    }
  };

  const collectDeviceInfo = async (): Promise<DeviceMetrics> => {
    try {
      const deviceUUID = await getOrCreateDeviceUUID();
      const deviceInfo = {
        brand: Device.brand || 'Unknown',
        model: Device.modelName || 'Unknown',
        systemVersion: Device.osVersion || 'Unknown',
        uniqueId: deviceUUID,
        deviceType: Device.deviceType?.toString() || 'Unknown',
        totalMemory: 0,
        usedMemory: 0,
        batteryLevel: 1,
        isCharging: false
      };

      const networkState = await Network.getNetworkStateAsync();
      const networkInfo = {
        type: networkState.type || 'unknown',
        isConnected: networkState.isConnected ?? false,
        isInternetReachable: networkState.isInternetReachable ?? false
      };

      let ipAddress = 'Unknown';
      try {
        const ip = await Network.getIpAddressAsync();
        ipAddress = ip || 'Unknown';
      } catch (error) {
        console.warn('IP address fetch failed:', error);
      }

      let gpsLocation = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          gpsLocation = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy || 0,
            timestamp: loc.timestamp
          };
        }
      } catch (error) {
        console.warn('GPS location fetch failed:', error);
      }

      const deviceMetrics: DeviceMetrics = {
        deviceUUID,
        ipAddress,
        deviceInfo,
        networkInfo,
        gpsLocation,
        keyboardLatency: []
      };

      setDeviceMetrics(deviceMetrics);
      return deviceMetrics;
    } catch (err) {
      console.error('Error collecting device info:', err);
      throw err;
    }
  };

  const initializeBehavioralCollection = async () => {
    try {
      const deviceInfo = await collectDeviceInfo();
      const collector = new BehavioralDataCollector(deviceInfo);
      setBehavioralCollector(collector);
    } catch (error) {
      console.error('Failed to initialize behavioral collection:', error);
    }
  };

  const createKeystrokeData = (text: string, fieldName: string, key: string, isBackspace: boolean = false): EnhancedKeystrokeData => {
    const currentTime = Date.now();
    const dwellTime = currentTime - (keyPressStartTime.current || currentTime);
    const flightTime = lastKeystrokeTime.current > 0 ? currentTime - lastKeystrokeTime.current : 0;
    const inputLatency = keyPressTimestamp.current > 0 ? currentTime - keyPressTimestamp.current : 0;
    
    return {
      key,
      timestamp: currentTime,
      pressTime: keyPressStartTime.current || currentTime,
      releaseTime: currentTime,
      dwellTime,
      flightTime,
      correct: !isBackspace, // Simplified for demo
      position: text.length,
      isBackspace,
      inputLatency,
      systemLatency: inputLatency // Simplified
    };
  };

  const handleInputChange = (text: string, fieldName: string) => {
    if (!behavioralCollector) return;

    const currentTime = Date.now();
    
    // Start collection on first keystroke
    if (!isTypingActive && text.length > 0) {
      setIsTypingActive(true);
      behavioralCollector.startCollection();
    }
    
    // Reset typing timeout
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTypingActive(false);
      behavioralCollector?.stopCollection();
    }, 3000);

    // Get previous value for comparison
    const previousValue = getPreviousValue(fieldName);
    
    // Determine if keystroke was added or removed
    if (text.length > previousValue.length) {
      // Character added
      const newChar = text[text.length - 1];
      const keystrokeData = createKeystrokeData(text, fieldName, newChar, false);
      behavioralCollector.addKeystroke(keystrokeData);
    } else if (text.length < previousValue.length) {
      // Character removed (backspace)
      const keystrokeData = createKeystrokeData(text, fieldName, 'Backspace', true);
      behavioralCollector.addKeystroke(keystrokeData);
    }

    // Update keyboard latency
    const inputLatency = keyPressTimestamp.current > 0 ? currentTime - keyPressTimestamp.current : 0;
    if (inputLatency > 0) {
      setDeviceMetrics(prev => ({
        ...prev,
        keyboardLatency: [...prev.keyboardLatency.slice(-100), inputLatency]
      }));
    }

    lastKeystrokeTime.current = currentTime;
    
    // Update form field
    updateFormField(fieldName, text);
    
    // Update real-time stats
    // updateRealTimeStats();
  };

  const getPreviousValue = (fieldName: string): string => {
    switch(fieldName) {
      case 'recipientName': return recipientName;
      case 'recipientAccount': return recipientAccount;
      case 'ifscCode': return ifscCode;
      case 'amount': return amount;
      case 'transferNote': return transferNote;
      default: return '';
    }
  };

  const updateFormField = (fieldName: string, text: string) => {
    switch(fieldName) {
      case 'recipientName': setRecipientName(text); break;
      case 'recipientAccount': setRecipientAccount(text); break;
      case 'ifscCode': setIfscCode(text); break;
      case 'amount': setAmount(text); break;
      case 'transferNote': setTransferNote(text); break;
    }
  };

  const handleKeyPress = () => {
    keyPressTimestamp.current = Date.now();
    keyPressStartTime.current = Date.now();
  };

  const handleSendMoney = async () => {
    const isValid = true;
    if (isValid) {
      Alert.alert(
        'Success',
        'Transaction processed successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert(
        'Transaction Failed',
        'Unable to validate transaction. Please try again.'
      );
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Send Money</Text>
          <Text style={styles.headerSubtitle}>Secure Transfer with Behavioral Authentication</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Behavioral Analysis Status */}
        {isTypingActive && (
          <View style={styles.behavioralStatusContainer}>
            <Text style={styles.behavioralStatusText}>
              🔒 Analyzing typing patterns for enhanced security...
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{currentTypingStats.wpm}</Text>
                <Text style={styles.statLabel}>WPM</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{currentTypingStats.accuracy}%</Text>
                <Text style={styles.statLabel}>Accuracy</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{currentTypingStats.averageKeyHoldTime}ms</Text>
                <Text style={styles.statLabel}>Hold Time</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{currentTypingStats.errorRate}%</Text>
                <Text style={styles.statLabel}>Error Rate</Text>
              </View>
            </View>
          </View>
        )}

        {/* Form Fields */}
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Recipient Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter recipient name"
              value={recipientName}
              onChangeText={(text) => handleInputChange(text, 'recipientName')}
              onKeyPress={handleKeyPress}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Account Number *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter account number"
              value={recipientAccount}
              onChangeText={(text) => handleInputChange(text, 'recipientAccount')}
              onKeyPress={handleKeyPress}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>IFSC Code</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter IFSC code"
              value={ifscCode}
              onChangeText={(text) => handleInputChange(text.toUpperCase(), 'ifscCode')}
              onKeyPress={handleKeyPress}
              autoCapitalize="characters"
              maxLength={11}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Amount *</Text>
            <TextInput
              style={[styles.textInput, styles.amountInput]}
              placeholder="0.00"
              value={amount}
              onChangeText={(text) => handleInputChange(text, 'amount')}
              onKeyPress={handleKeyPress}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Transfer Note (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              placeholder="Add a note for this transfer"
              value={transferNote}
              onChangeText={(text) => handleInputChange(text, 'transferNote')}
              onKeyPress={handleKeyPress}
              multiline={true}
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Transaction Summary */}
        {recipientName && amount && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Transaction Summary</Text>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>To:</Text>
              <Text style={styles.summaryValue}>{recipientName}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Amount:</Text>
              <Text style={styles.summaryValue}>₹{amount}</Text>
            </View>
            {transferNote && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Note:</Text>
                <Text style={styles.summaryValue}>{transferNote}</Text>
              </View>
            )}
          </View>
        )}

        {/* Send Money Button */}
        <TouchableOpacity 
          style={[styles.sendButton, (!recipientName || !recipientAccount || !amount) && styles.sendButtonDisabled]}
          onPress={handleSendMoney}
          disabled={!recipientName || !recipientAccount || !amount}
        >
          <LinearGradient
            colors={(!recipientName || !recipientAccount || !amount) ? ['#ccc', '#999'] : ['#667eea', '#764ba2']}
            style={styles.sendButtonGradient}
          >
            <Ionicons name="send" size={20} color="#fff" />
            <Text style={styles.sendButtonText}>Send Money</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Behavioral Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Your typing patterns are being analyzed in real-time to enhance transaction security. 
            Data is collected every 6 seconds during active typing (excluding backspace).
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  behavioralStatusContainer: {
    backgroundColor: '#E6FFFA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#38B2AC',
    shadowColor: '#38B2AC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  behavioralStatusText: {
    color: '#2C7A7B',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'center',
    minWidth: '20%',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C7A7B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#4A5568',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formContainer: {
    gap: 20,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#2D3748',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  textInput: {
    fontSize: 16,
    color: '#2D3748',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#F7FAFC',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  amountInput: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    shadowColor: '#2D3748',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  sendButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 32,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  sendButtonDisabled: {
    shadowOpacity: 0.1,
    elevation: 2,
  },
  sendButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoContainer: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.3,
  },
});
