import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import API_BASE_URL from '@/config/api';
import blockchainService from '@/services/blockchainService';
import { viewAllStoredData, viewBlockchainMetadata, viewUserStreams, viewPermissionRequests } from '@/utils/debugStorage';
import { useTheme, monoFont } from '@/theme';
import {
  Text,
  Button,
  Card,
  Section,
  Badge,
  Banner,
  AppHeader,
  Screen,
  Divider,
} from '@/components/ui';

const SAMPLE_TEXTS = [
  "Banking security is paramount in today's digital world. Protect your financial information at all times.",
  "Canara Bank provides secure and reliable banking services to millions of customers across India.",
  "Technology has revolutionized the way we handle our finances and conduct banking transactions.",
  "Mobile banking offers convenience and accessibility for managing your accounts on the go."
];

interface TypingStats {
  wpm: number;
  accuracy: number;
  totalTime: number;
  keystrokes: number;
  errors: number;
  correctKeystrokes: number;
  averageSpeed: number;
  consistency: number;
  typingSpeed: number;
  errorRate: number;
  averageKeyHoldTime: number;
  averageFlightTime: number;
  averageTapRhythm: number;
  backspaceCount: number;
  averageKeyboardLatency: number;
}

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

// ✅ ROBUST helper functions
const calculateCorrectChars = (userText: string, targetText: string): number => {
  if (!userText || !targetText) return 0;
  let correctChars = 0;
  const minLength = Math.min(userText.length, targetText.length);
  for (let i = 0; i < minLength; i++) {
    if (userText[i] === targetText[i]) {
      correctChars++;
    }
  }
  return correctChars;
};

const calculateTotalTime = (startTime: number, endTime: number): number => {
  if (!startTime || !endTime || endTime <= startTime) return 0;
  return Math.max(0, Math.round((endTime - startTime) / 1000));
};

const calculateTotalWords = (text: string): number => {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
};

const calculateErrorRate = (correctChars: number, totalTyped: number, backspaceCount: number): number => {
  const errors = Math.max(0, totalTyped - correctChars) + backspaceCount;
  const totalKeystrokes = totalTyped + backspaceCount;
  if (totalKeystrokes === 0) return 0;
  return Math.round((errors / totalKeystrokes) * 100);
};

class BehavioralDataCollector {
  private vectors: BehavioralVector[] = [];
  private currentVector: BehavioralVector;
  private keystrokeData: EnhancedKeystrokeData[] = [];
  private deviceMetrics: DeviceMetrics;
  private isCollecting = false;
  private collectionInterval: NodeJS.Timeout | null = null;
  private readonly COLLECTION_INTERVAL = 6000;
  private readonly BUFFER_SIZE = 5;

  constructor(deviceMetrics: DeviceMetrics) {
    this.deviceMetrics = deviceMetrics;
    this.currentVector = this.initializeVector();
  }

  private initializeVector(): BehavioralVector {
    return {
        wpm: 0, accuracy: 0, typingSpeed: 0, errorRate: 0,
        averageKeyHoldTime: 0, averageFlightTime: 0,
        averageKeyboardLatency: 0, averageTapRhythm: 0,
      timestamp: Date.now(), keysPressed: 0, correctKeys: 0, startTime: Date.now()
    };
  }

  startCollection() {
    this.isCollecting = true;
    this.currentVector = this.initializeVector();
    this.collectionInterval = setInterval(() => { this.captureVector(); }, this.COLLECTION_INTERVAL);
    console.log('🔄 Behavioral data collection started');
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
    if (!this.isCollecting || keystroke.isBackspace) return;
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
    
    const tapIntervals: number[] = [];
    for (let i = 1; i < validKeystrokes.length; i++) {
      tapIntervals.push(validKeystrokes[i].timestamp - validKeystrokes[i - 1].timestamp);
    }

    const vector: BehavioralVector = {
      wpm: timeElapsedMinutes > 0 ? (this.currentVector.keysPressed / 5) / timeElapsedMinutes : 0,
      accuracy: this.currentVector.keysPressed > 0 ? (this.currentVector.correctKeys / this.currentVector.keysPressed) * 100 : 0,
      typingSpeed: timeElapsed > 0 ? this.currentVector.keysPressed / timeElapsed : 0,
      errorRate: this.currentVector.keysPressed > 0 ? ((this.currentVector.keysPressed - this.currentVector.correctKeys) / this.currentVector.keysPressed) * 100 : 0,
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
    this.currentVector = this.initializeVector();
    this.keystrokeData = [];
  }

  private calculateAverage(array: number[]): number {
    if (array.length === 0) return 0;
    return array.reduce((sum, val) => sum + val, 0) / array.length;
  }

  private calculateStandardDeviation(array: number[]): number {
    if (array.length < 2) return 0;
    const mean = this.calculateAverage(array);
    const squaredDiffs = array.map(val => Math.pow(val - mean, 2));
    return Math.sqrt(this.calculateAverage(squaredDiffs));
  }

  getFinalMetrics() {
    if (this.vectors.length === 0) {
      return { averageMetrics: this.initializeVector(), standardDeviations: this.initializeVector(), vectorCount: 0 };
    }

    const metrics = ['wpm', 'accuracy', 'typingSpeed', 'errorRate', 'averageKeyHoldTime', 'averageFlightTime', 'averageKeyboardLatency', 'averageTapRhythm',] as const;
    const averageMetrics: any = {};
    const standardDeviations: any = {};

    metrics.forEach(metric => {
      const values = this.vectors.map(v => v[metric]);
      averageMetrics[metric] = this.calculateAverage(values);
      standardDeviations[metric] = this.calculateStandardDeviation(values);
    });

    return { averageMetrics, standardDeviations, vectorCount: this.vectors.length, vectors: this.vectors };
  }
}

export default function TypingGameScreen() {
  const { colors, spacing, radius, fontSize, fontWeight, lineHeight } = useTheme();
  const [currentText, setCurrentText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [keystrokeData, setKeystrokeData] = useState<EnhancedKeystrokeData[]>([]);
  const [behavioralCollector, setBehavioralCollector] = useState<BehavioralDataCollector | null>(null);
  
  const [deviceMetrics, setDeviceMetrics] = useState<DeviceMetrics>({
    keyboardLatency: [], ipAddress: '', deviceUUID: '', gpsLocation: null,
    deviceInfo: { brand: '', model: '', systemVersion: '', uniqueId: '', deviceType: '', totalMemory: 0, usedMemory: 0, batteryLevel: 0, isCharging: false },
    networkInfo: { type: '', isConnected: false, isInternetReachable: false }
  });

  const [stats, setStats] = useState<TypingStats>({
    wpm: 0, accuracy: 0, totalTime: 0, keystrokes: 0, errors: 0, correctKeystrokes: 0, averageSpeed: 0,
    consistency: 0, typingSpeed: 0, errorRate: 0, averageKeyHoldTime: 0, averageFlightTime: 0,
    averageTapRhythm: 0, backspaceCount: 0, averageKeyboardLatency: 0
  });
  
  const inputRef = useRef<TextInput>(null);
  const keyPressStartTime = useRef<number>(0);
  const lastKeystrokeTime = useRef<number>(0);
  const keyPressTimestamp = useRef<number>(0);

  // ✅ SOLUTION: Use refs to store current data that's always up-to-date
  const currentDataRef = useRef({
    userInput: '',
    currentText: '',
    startTime: 0,
    keystrokeData: [] as EnhancedKeystrokeData[]
  });

  useEffect(() => {
    resetGame();
    // Ensure blockchain is initialized when user arrives at typing screen
    initializeBlockchainSafety();
  }, []);

  const initializeBlockchainSafety = async () => {
    try {
      console.log('🔗 Typing Screen: Checking blockchain initialization...');
      
      // Try to get blockchain status first
      const status = await blockchainService.getBlockchainStatus();
      
      if (!status.success) {
        console.log('⚠️ Blockchain not initialized, attempting initialization...');
        
        // Get user ID from token or use fallback
        const token = await AsyncStorage.getItem('token');
        let userId = 'typing_screen_user';
        
        if (token) {
          try {
            // Try to decode user ID from token (simplified)
            const tokenPayload = token.split('.')[1];
            if (tokenPayload) {
              // Use Buffer.from for React Native compatibility instead of atob
              const decoded = JSON.parse(Buffer.from(tokenPayload, 'base64').toString('utf8'));
              userId = decoded.userId || decoded.id || decoded.sub || 'typing_screen_user';
              console.log('✅ Decoded userId from token:', userId);
            }
          } catch (e) {
            console.log('⚠️ Could not decode user ID from token, using fallback:', e.message);
          }
        }
        
        const initResult = await blockchainService.initializeBlockchainForUser(userId);
        
        if (initResult.success) {
          console.log('✅ Blockchain initialized successfully from typing screen');
        } else {
          console.warn('⚠️ Blockchain initialization failed from typing screen:', initResult.message);
        }
      } else {
        console.log('✅ Blockchain already initialized:', {
          didAvailable: status.data?.didAvailable,
          encryptionVerified: status.data?.encryptionVerified,
          dataEntriesCount: status.data?.dataEntriesCount
        });
      }
    } catch (error) {
      console.warn('⚠️ Blockchain safety check failed:', error.message);
      // Continue with typing game even if blockchain fails
    }
  };

  // ✅ CRITICAL FIX: Remove the automatic completion useEffect and handle it manually
  // This prevents timing issues with state updates

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

  const collectDeviceInfo = async (): Promise<DeviceMetrics | null> => {
    try {
      const deviceUUID = await getOrCreateDeviceUUID();
      const deviceInfo = {
        brand: Device.brand || 'Unknown', model: Device.modelName || 'Unknown',
        systemVersion: Device.osVersion || 'Unknown', uniqueId: deviceUUID,
        deviceType: Device.deviceType?.toString() || 'Unknown', totalMemory: 0,
        usedMemory: 0, batteryLevel: 1, isCharging: false
      };

      const networkState = await Network.getNetworkStateAsync();
      const networkInfo = {
        type: networkState.type?.toString() || 'unknown',
        isConnected: networkState.isConnected ?? false,
        isInternetReachable: networkState.isInternetReachable ?? false
      };

      let ipAddress = 'Unknown';
      try { ipAddress = (await Network.getIpAddressAsync()) || 'Unknown'; } catch (e) { /* ignore */ }

      let gpsLocation = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          gpsLocation = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, accuracy: loc.coords.accuracy || 0, timestamp: loc.timestamp };
        }
      } catch (e) { /* ignore */ }

      const collectedMetrics: DeviceMetrics = { deviceUUID, ipAddress, deviceInfo, networkInfo, gpsLocation, keyboardLatency: [] };
      setDeviceMetrics(collectedMetrics);
      return collectedMetrics;
    } catch (err) {
      console.error('❌ Error collecting device info:', err);
      return null;
    }
  };

  const resetGame = () => {
    const randomText = SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)];
    setCurrentText(randomText);
    setUserInput('');
    setIsGameActive(false);
    setGameStarted(false);
    setGameCompleted(false);
    setStartTime(0);
    setEndTime(0);
    setKeystrokeData([]);
    if (behavioralCollector) {
      behavioralCollector.stopCollection();
    }
    setBehavioralCollector(null);
    setStats({ wpm: 0, accuracy: 0, totalTime: 0, keystrokes: 0, errors: 0, correctKeystrokes: 0, averageSpeed: 0, consistency: 0, typingSpeed: 0, errorRate: 0, averageKeyHoldTime: 0, averageFlightTime: 0, averageTapRhythm: 0, backspaceCount: 0, averageKeyboardLatency: 0 });
    
    // ✅ Reset ref data
    currentDataRef.current = {
      userInput: '',
      currentText: randomText,
      startTime: 0,
      keystrokeData: []
    };
    
    inputRef.current?.clear();
  };

  const startGame = async () => {
    const randomText = SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)];
    const gameStartTime = Date.now();
    
    setCurrentText(randomText);
    setUserInput('');
    setIsGameActive(true);
    setGameStarted(true);
    setStartTime(gameStartTime);
    setKeystrokeData([]);
    
    // ✅ Update ref with initial data
    currentDataRef.current = {
      userInput: '',
      currentText: randomText,
      startTime: gameStartTime,
      keystrokeData: []
    };
    
    lastKeystrokeTime.current = gameStartTime;
    
    const deviceInfo = await collectDeviceInfo();
    if (deviceInfo) {
      const collector = new BehavioralDataCollector(deviceInfo);
      setBehavioralCollector(collector);
      collector.startCollection();
    }
    inputRef.current?.focus();
  };

  // ✅ CRITICAL FIX: Manual completion check with current data
  const checkCompletion = (newText: string) => {
    if (newText.length > 0 && newText.length === currentDataRef.current.currentText.length) {
      // Add a small delay to ensure all data is captured
      setTimeout(() => {
        if (!gameCompleted) {
          completeGame();
        }
      }, 100);
    }
  };

  const completeGame = async () => {
    if (gameCompleted) return;

    const finalTime = Date.now();
    setIsGameActive(false);
    setGameCompleted(true);
    setEndTime(finalTime);

    if (behavioralCollector) {
      behavioralCollector.stopCollection();
    }

    // ✅ Use ref data for calculations to ensure accuracy
    const calculatedStats = calculateComprehensiveStats(
      currentDataRef.current.startTime,
      finalTime,
      currentDataRef.current.userInput,
      currentDataRef.current.currentText,
      currentDataRef.current.keystrokeData
    );
    
    setStats(calculatedStats);
    await saveBehavioralDataWithVectors(calculatedStats);
    inputRef.current?.blur();
    await AsyncStorage.setItem('typingTestCompleted', 'true');
  };

  // ✅ ROBUST calculation function with detailed logging
  const calculateComprehensiveStats = (
    sTime: number, eTime: number, finalUserInput: string, finalCurrentText: string, finalKeystrokeData: EnhancedKeystrokeData[]
  ): TypingStats => {
    
    console.log('🔍 CALCULATION INPUT DATA:', {
      startTime: sTime,
      endTime: eTime,
      userInputLength: finalUserInput.length,
      currentTextLength: finalCurrentText.length,
      keystrokeDataLength: finalKeystrokeData.length,
      userInputSample: finalUserInput.substring(0, 20) + '...',
      currentTextSample: finalCurrentText.substring(0, 20) + '...'
    });

    const totalTime = calculateTotalTime(sTime, eTime);
    const correctChars = calculateCorrectChars(finalUserInput, finalCurrentText);
    const userWords = calculateTotalWords(finalUserInput);
    const wpm = totalTime > 0 ? Math.round((userWords / (totalTime / 60))) : 0;
    const backspaceCount = finalKeystrokeData.filter(k => k.isBackspace).length;
    const accuracy = finalCurrentText.length > 0 ? Math.round((correctChars / finalCurrentText.length) * 100) : 0;
    const errorRate = calculateErrorRate(correctChars, finalUserInput.length, backspaceCount);
    
    const keystrokeTimes = finalKeystrokeData.filter(k => !k.isBackspace && k.dwellTime > 0).map(k => k.dwellTime);
    const flightTimes = finalKeystrokeData.filter(k => k.flightTime > 0).map(k => k.flightTime);
    
    const averageSpeed = keystrokeTimes.length > 0 ? keystrokeTimes.reduce((a, b) => a + b, 0) / keystrokeTimes.length : 0;
    const speedVariance = calculateVariance(keystrokeTimes);
    const consistency = Math.max(0, 100 - (speedVariance / 100));
    const typingSpeed = totalTime > 0 ? Math.round((finalUserInput.length / 5) / (totalTime / 60)) : 0;
    
    const averageKeyHoldTime = keystrokeTimes.length > 0 ? Math.round(keystrokeTimes.reduce((a, b) => a + b, 0) / keystrokeTimes.length) : 0;
    const averageFlightTime = flightTimes.length > 0 ? Math.round(flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length) : 0;
    
    const tapIntervals: number[] = [];
    for (let i = 1; i < finalKeystrokeData.length; i++) {
        tapIntervals.push(finalKeystrokeData[i].timestamp - finalKeystrokeData[i - 1].timestamp);
    }
    const averageTapRhythm = tapIntervals.length > 0 ? Math.round(tapIntervals.reduce((a, b) => a + b, 0) / tapIntervals.length) : 0;
    
    const averageKeyboardLatency = deviceMetrics.keyboardLatency.length > 0 ? Math.round(deviceMetrics.keyboardLatency.reduce((a, b) => a + b, 0) / deviceMetrics.keyboardLatency.length) : 0;
    
    const finalStats = { 
      wpm, accuracy, totalTime, keystrokes: finalUserInput.length, 
      errors: (finalUserInput.length - correctChars) + backspaceCount, 
      correctKeystrokes: correctChars, averageSpeed: Math.round(averageSpeed), 
      consistency: Math.round(consistency), typingSpeed, errorRate, 
      averageKeyHoldTime, averageFlightTime, averageTapRhythm, 
      backspaceCount, averageKeyboardLatency 
    };

    console.log('📊 FINAL CALCULATED STATS:', finalStats);
    return finalStats;
  };

  const calculateVariance = (data: number[]): number => {
    if (data.length < 2) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    return data.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / (data.length - 1);
  };
const saveBehavioralDataWithVectors = async (typingStats: TypingStats) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      console.log('❌ No auth token found');
      return;
    }
    

    const behavioralMetrics = behavioralCollector?.getFinalMetrics() || {
      averageMetrics: {
        wpm: 0, accuracy: 0, typingSpeed: 0, errorRate: 0,
        averageKeyHoldTime: 0, averageFlightTime: 0,
        averageKeyboardLatency: 0, averageTapRhythm: 0,correctKeystrokes:0,totalTime:0,totalWords:0,cpm:0
      },
      standardDeviations: {
        wpm: 0, accuracy: 0, typingSpeed: 0, errorRate: 0,
        averageKeyHoldTime: 0, averageFlightTime: 0,
        averageKeyboardLatency: 0, averageTapRhythm: 0,correctKeystrokes:0,totalTime:0,totalWords:0,cpm:0
      },
      vectorCount: 0
    };

    const cpm = typingStats.totalTime > 0 ? Math.round((typingStats.keystrokes / (typingStats.totalTime / 60))) : 0;

    // ✅ ENHANCED: Include the calculated final stats in the payload
    const sessionData = {
      deviceMetrics: {
        deviceUUID: deviceMetrics.deviceUUID,
        ipAddress: deviceMetrics.ipAddress,
        gpsLocation: deviceMetrics.gpsLocation || {
          latitude: 0,
          longitude: 0,
          accuracy: 0,
          timestamp: new Date().toISOString()
        },
        deviceInfo: deviceMetrics.deviceInfo,
        networkInfo: deviceMetrics.networkInfo
      },
      // ✅ CRITICAL: Send the actual final calculated stats
      typingStats: {
        // Use the calculated final stats, not just behavioral collector averages
        wpm: typingStats.wpm,
        accuracy: typingStats.accuracy,
        typingSpeed: typingStats.typingSpeed,
        errorRate: typingStats.errorRate,
        averageKeyHoldTime: typingStats.averageKeyHoldTime,
        averageFlightTime: typingStats.averageFlightTime,
        averageKeyboardLatency: typingStats.averageKeyboardLatency,
        averageTapRhythm: typingStats.averageTapRhythm,
        cpm:cpm,
        totalTime: typingStats.totalTime, // ✅ Now includes corrected totalTime
        keystrokes: typingStats.keystrokes,
        errors: typingStats.errors,
        correctKeystrokes: typingStats.correctKeystrokes, // ✅ Now includes corrected correctChars
        averageSpeed: typingStats.averageSpeed,
        consistency: typingStats.consistency,  
         // ✅ Now includes corrected errorRate
        backspaceCount: typingStats.backspaceCount,
        
        // ✅ ADD: Additional calculated metrics
        totalWords: calculateTotalWords(currentDataRef.current.userInput),
        sessionDuration: typingStats.totalTime,
        completedAt: new Date().toISOString()
      },
      // Behavioral vector statistics from collector
      vectorStandardDeviations: behavioralMetrics.standardDeviations,
      vectorMetadata: {
        vectorCount: behavioralMetrics.vectorCount,
        calculationInterval: 6000,
        bufferSize: 5,
        sessionId: `typing-${Date.now()}`,
        lastCalculationTime: new Date().toISOString(),
        // ✅ ADD: Session metadata
        textUsed: currentDataRef.current.currentText.substring(0, 50) + '...',
        finalAccuracy: typingStats.accuracy,
        sessionType: 'behavioral-training'
      },
      timestamp: new Date().toISOString()
    };

    // ✅ ENHANCED LOGGING: Show exactly what's being sent
    console.log('📤 Sending FINAL STATS to backend:', {
      totalTime: typingStats.totalTime,
      correctKeystrokes: typingStats.correctKeystrokes,
      errorRate: typingStats.errorRate,
      wpm: typingStats.wpm,
      accuracy: typingStats.accuracy,
      totalWords: calculateTotalWords(currentDataRef.current.userInput),
      vectorCount: behavioralMetrics.vectorCount
    });

    const response = await fetch(`${API_BASE_URL}/api/behavior/typing-with-vectors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ sessionData })
    });

    const result = await response.json();

    // ✅ ENHANCED: Better response handling
    if (result.success) {
      console.log('✅ Final stats sent successfully:', {
        fingerprintId: result.data?.fingerprintId,
        vectorCount: result.data?.vectorStats?.vectorCount,
        savedStats: result.data?.vectorStats?.averageMetrics
      });
      
      Alert.alert(
        'Success! 🎉', 
        `Your behavioral profile has been analyzed and saved securely!\n\nStats: ${typingStats.wpm} WPM, ${typingStats.accuracy}% accuracy\nVectors: ${behavioralMetrics.vectorCount} collected`,
        [{
          text: 'Continue',
          onPress: () => router.replace('/mpin-validation')
        }]
      );
    } else {
      console.error('❌ Failed to save final stats:', result.message);
      Alert.alert(
        'Error', 
        result.message || 'Failed to save typing data. Please try again.',
        [
          { text: 'Retry', onPress: () => saveBehavioralDataWithVectors(typingStats) },
          { text: 'Skip', onPress: () => router.replace('/mpin-validation') }
        ]
      );
    }
  } catch (error) {
    console.error('❌ Network error sending final stats:', error);
    Alert.alert(
      'Network Error', 
      'Unable to save your behavioral data. Check your connection.',
      [
        { text: 'Retry', onPress: () => saveBehavioralDataWithVectors(typingStats) },
        { text: 'Skip', onPress: () => router.replace('/(tabs)') }
      ]
    );
  }
};


  // ✅ CRITICAL FIX: Update both state and ref data
  const handleTextChange = (text: string) => {
    if (!isGameActive) return;
    
    const currentTime = Date.now();
    const inputLatency = keyPressTimestamp.current > 0 ? currentTime - keyPressTimestamp.current : 0;
    
    if (inputLatency > 0) {
      setDeviceMetrics(prev => ({ ...prev, keyboardLatency: [...prev.keyboardLatency.slice(-100), inputLatency] }));
    }
    
    // ✅ Update ref immediately
    currentDataRef.current.userInput = text;
    
    if (text.length > userInput.length) {
      const newChar = text[text.length - 1];
      const isCorrect = newChar === currentText[text.length - 1];
      const dwellTime = currentTime - (keyPressStartTime.current || currentTime);
      const flightTime = lastKeystrokeTime.current > 0 ? currentTime - lastKeystrokeTime.current : 0;
      
      const enhancedKeystroke: EnhancedKeystrokeData = { 
        key: newChar, timestamp: currentTime, pressTime: keyPressStartTime.current || currentTime, 
        releaseTime: currentTime, dwellTime, flightTime, correct: isCorrect, 
        position: text.length - 1, isBackspace: false, inputLatency, systemLatency: 0 
      };
      
      // ✅ Update both state and ref
      setKeystrokeData(prev => {
        const newData = [...prev, enhancedKeystroke];
        currentDataRef.current.keystrokeData = newData;
        return newData;
      });
      
      if (behavioralCollector) behavioralCollector.addKeystroke(enhancedKeystroke);
      
    } else if (text.length < userInput.length) {
      const backspaceData: EnhancedKeystrokeData = { 
        key: 'Backspace', timestamp: currentTime, pressTime: keyPressStartTime.current || currentTime, 
        releaseTime: currentTime, dwellTime: currentTime - (keyPressStartTime.current || currentTime), 
        flightTime: lastKeystrokeTime.current > 0 ? currentTime - lastKeystrokeTime.current : 0, 
        correct: false, position: text.length, isBackspace: true, inputLatency, systemLatency: 0 
      };
      
      // ✅ Update both state and ref
      setKeystrokeData(prev => {
        const newData = [...prev, backspaceData];
        currentDataRef.current.keystrokeData = newData;
        return newData;
      });
    }
    
    lastKeystrokeTime.current = currentTime;
    setUserInput(text);
    
    // ✅ Check for completion using current data
    checkCompletion(text);
  };

  const handleKeyPress = () => {
    keyPressTimestamp.current = Date.now();
    keyPressStartTime.current = Date.now();
  };

  const renderEnhancedTextOptimized = () => {
    const words = currentText.split(' ');
    let charIndex = 0;

    return (
      <Text variant="mono" style={styles.textWrapper}>
        {words.map((word, wordIndex) => {
          const styledWord = word.split('').map((char, charInWordIndex) => {
            const currentCharIndex = charIndex + charInWordIndex;
            let style = styles.defaultChar;

            if (currentCharIndex < userInput.length) {
              style = userInput[currentCharIndex] === char ? styles.correctChar : styles.incorrectChar;
            } else if (currentCharIndex === userInput.length) {
              style = styles.currentChar;
            }

            return (<Text key={`${wordIndex}-${charInWordIndex}`} variant="mono" style={style}>{char}</Text>);
          });
          
          charIndex += word.length;
          
          const spaceStyle = (() => {
            if (wordIndex < words.length - 1) {
              if (charIndex < userInput.length) {
                charIndex++;
                return userInput[charIndex - 1] === ' ' ? styles.correctChar : styles.incorrectChar;
              } else if (charIndex === userInput.length) {
                charIndex++;
                return styles.currentChar;
              } else {
                charIndex++;
                return styles.defaultChar;
              }
            }
            return null;
          })();
          
          return (
            <Text key={wordIndex} variant="mono">
              {styledWord}
              {wordIndex < words.length - 1 && (
                <Text variant="mono" style={spaceStyle || styles.defaultChar}> </Text>
              )}
            </Text>
          );
        })}
      </Text>
    );
  };

  const getWPMColor = (wpm: number) => {
    if (wpm >= 60) return colors.success;
    if (wpm >= 40) return colors.warning;
    return colors.danger;
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 95) return colors.success;
    if (accuracy >= 85) return colors.warning;
    return colors.danger;
  };

  const liveMetrics = [
    { label: 'CPM', value: String(stats.typingSpeed) },
    { label: 'Hold', value: `${stats.averageKeyHoldTime}ms` },
    { label: 'Flight', value: `${stats.averageFlightTime}ms` },
    { label: 'Latency', value: `${stats.averageKeyboardLatency}ms` },
    { label: 'Errors', value: `${stats.errorRate}%` },
    { label: 'Rhythm', value: `${stats.averageTapRhythm}ms` },
  ];

  const results = [
    { label: 'Words per minute', value: `${stats.wpm}`, color: getWPMColor(stats.wpm) },
    { label: 'Accuracy', value: `${stats.accuracy}%`, color: getAccuracyColor(stats.accuracy) },
    { label: 'Total time', value: `${stats.totalTime}s`, color: colors.text },
    { label: 'Correct characters', value: `${stats.correctKeystrokes}`, color: colors.text },
    { label: 'Average hold', value: `${stats.averageKeyHoldTime}ms`, color: colors.text },
    { label: 'Error rate', value: `${stats.errorRate}%`, color: colors.text },
  ];

  const deviceRows = [
    { label: 'Device', value: `${deviceMetrics.deviceInfo.brand} ${deviceMetrics.deviceInfo.model}` },
    { label: 'Device ID', value: `${deviceMetrics.deviceUUID.substring(0, 8)}…` },
    { label: 'IP address', value: deviceMetrics.ipAddress },
    {
      label: 'Network',
      value: `${deviceMetrics.networkInfo.type} · ${deviceMetrics.networkInfo.isConnected ? 'online' : 'offline'}`,
    },
    {
      label: 'GPS',
      value: deviceMetrics.gpsLocation
        ? `${deviceMetrics.gpsLocation.latitude.toFixed(4)}, ${deviceMetrics.gpsLocation.longitude.toFixed(4)}`
        : 'Unavailable',
    },
    {
      label: 'Battery',
      value: `${Math.round(deviceMetrics.deviceInfo.batteryLevel * 100)}%${
        deviceMetrics.deviceInfo.isCharging ? ' · charging' : ''
      }`,
    },
  ];

  return (
    <Screen edges={['left', 'right']}>
      <AppHeader
        title="Typing Dojo"
        subtitle="Behavioural authentication training"
        onBack={() => router.back()}
        trailing={
          <Button
            label="Skip"
            tone="plain"
            size="md"
            fullWidth={false}
            onPress={() => router.replace('/(tabs)')}
          />
        }
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.body, { padding: spacing.lg, gap: spacing.lg }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {gameStarted ? (
          <Card padded={false} style={{ overflow: 'hidden' }}>
            <View style={[styles.metricsHead, { padding: spacing.lg, backgroundColor: colors.surfaceMuted }]}>
              <Text variant="sectionLabel" tone="secondary" uppercase>
                Live signals
              </Text>
              <Badge label="Recording" tone="success" />
            </View>
            <View style={[styles.metricGrid, { padding: spacing.lg }]}>
              {liveMetrics.map((metric) => (
                <View key={metric.label} style={styles.metricCell}>
                  <Text variant="caption" tone="tertiary">
                    {metric.label}
                  </Text>
                  <Text variant="bodyStrong" tabular>
                    {metric.value}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {gameStarted && behavioralCollector ? (
          <Banner
            tone="info"
            title="Collecting behavioural data"
            message="A vector is captured every 6 seconds while you type."
          />
        ) : null}

        <Card style={{ gap: spacing.md }}>
          <View style={styles.flex}>
            {renderEnhancedTextOptimized()}
          </View>
          <Divider />
          <TextInput
            ref={inputRef}
            value={userInput}
            onChangeText={handleTextChange}
            onKeyPress={handleKeyPress}
            placeholder={gameStarted ? 'Start typing the sentence above' : 'Press start to begin'}
            placeholderTextColor={colors.textTertiary}
            multiline
            editable={isGameActive}
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            accessibilityLabel="Typing input"
            style={[
              styles.textInput,
              {
                color: colors.text,
                fontSize: fontSize.mono,
                lineHeight: lineHeight.mono,
                fontFamily: Platform.OS === 'ios' ? monoFont.ios : monoFont.android,
              },
            ]}
          />
        </Card>

        {gameStarted ? (
          <Section title="Device and network">
            <Card padded={false} style={{ overflow: 'hidden' }}>
              {deviceRows.map((row, index) => (
                <View key={row.label}>
                  {index > 0 ? <Divider inset={spacing.lg} /> : null}
                  <View style={[styles.deviceRow, { padding: spacing.lg }]}>
                    <Text variant="footnote" tone="secondary" style={styles.deviceLabel}>
                      {row.label}
                    </Text>
                    <Text variant="footnote" numberOfLines={1} tabular style={styles.deviceValue}>
                      {row.value}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </Section>
        ) : null}

        {!gameStarted ? (
          <Button label="Start test" icon="play" onPress={startGame} />
        ) : !gameCompleted ? (
          <Button label="Reset test" tone="secondary" icon="refresh" onPress={resetGame} />
        ) : null}

        {gameCompleted ? (
          <View style={{ gap: spacing.lg }}>
            <Card style={{ gap: spacing.lg }}>
              <View style={styles.resultHead}>
                <View style={{ flex: 1 }}>
                  <Text variant="title3">Test complete</Text>
                  <Text variant="footnote" tone="secondary" style={{ marginTop: 2 }}>
                    {behavioralCollector?.getFinalMetrics().vectorCount || 0} behavioural vectors
                    captured and stored.
                  </Text>
                </View>
              </View>

              <Divider />

              <View style={styles.resultGrid}>
                {results.map((item) => (
                  <View key={item.label} style={styles.resultCell}>
                    <Text variant="caption" tone="tertiary">
                      {item.label}
                    </Text>
                    <Text variant="title3" tabular style={{ color: item.color }}>
                      {item.value}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>

            <Banner
              tone="success"
              title="Profile saved"
              message="Your typing patterns and device metrics were converted into a statistical profile and anchored to the ledger."
            />

            <View style={{ gap: spacing.sm }}>
              <Button
                label="Continue to banking"
                trailingIcon="arrow-forward"
                onPress={() => router.replace('/(tabs)')}
              />
              <Button label="Try again" tone="secondary" icon="refresh" onPress={resetGame} />
            </View>

            <Section title="Developer tools">
              <Card tight>
                {[
                  { label: 'View all stored data', icon: 'server-outline' as const, onPress: viewAllStoredData },
                  { label: 'Blockchain metadata', icon: 'link-outline' as const, onPress: viewBlockchainMetadata },
                  { label: 'User streams', icon: 'git-branch-outline' as const, onPress: viewUserStreams },
                  { label: 'Permissions', icon: 'key-outline' as const, onPress: viewPermissionRequests },
                ].map((tool, index) => (
                  <View key={tool.label}>
                    {index > 0 ? <Divider inset={spacing.lg} /> : null}
                    <Button
                      label={tool.label}
                      tone="plain"
                      size="md"
                      icon={tool.icon}
                      onPress={tool.onPress}
                      style={{ justifyContent: 'flex-start', paddingHorizontal: spacing.lg }}
                    />
                  </View>
                ))}
              </Card>
            </Section>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    paddingBottom: 48,
  },
  metricsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 14,
  },
  metricCell: {
    width: '33.33%',
    gap: 2,
  },
  textWrapper: {
    lineHeight: 30,
    fontSize: 18,
  },
  defaultChar: {
    lineHeight: 30,
    fontSize: 18,
  },
  correctChar: {
    lineHeight: 30,
    fontSize: 18,
  },
  incorrectChar: {
    lineHeight: 30,
    fontSize: 18,
  },
  currentChar: {
    lineHeight: 30,
    fontSize: 18,
    borderRadius: 3,
  },
  textInput: {
    minHeight: 110,
    textAlignVertical: 'top',
    padding: 0,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  deviceLabel: {
    flexShrink: 0,
  },
  deviceValue: {
    flex: 1,
    textAlign: 'right',
  },
  resultHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
  },
  resultCell: {
    width: '50%',
    gap: 2,
  },
});
