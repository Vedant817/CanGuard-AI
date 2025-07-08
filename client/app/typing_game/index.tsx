// app/typing-game.tsx
import React, { useState, useEffect, useRef } from 'react';
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

const { width } = Dimensions.get('window');

const SAMPLE_TEXTS = [
  "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet.",
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
  typingSpeed: number; // Characters per minute
  errorRate: number; // Percentage of backspaces
  averageKeyHoldTime: number; // Average dwell time
  averageFlightTime: number; // Average flight time
  averageTapRhythm: number; // Average time between taps
  backspaceCount: number; // Total backspaces
  averageKeyboardLatency: number; // ✅ Average keyboard latency
}

interface EnhancedKeystrokeData {
  key: string;
  timestamp: number;
  pressTime: number;
  releaseTime: number;
  dwellTime: number; // Key hold time
  flightTime: number; // Key flight time
  correct: boolean;
  position: number;
  pressure?: number;
  isBackspace: boolean; // Track backspaces for error rate
  inputLatency: number; // ✅ Time from key press to text change
  systemLatency: number; // ✅ System processing time
}

interface TouchData {
  type: 'tap' | 'swipe';
  timestamp: number;
  startX: number;
  startY: number;
  endX?: number;
  endY?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  velocity?: number;
  duration: number;
}

interface SensorData {
  accelerometer: { x: number; y: number; z: number; timestamp: number }[];
  gyroscope: { x: number; y: number; z: number; timestamp: number }[];
  magnetometer: { x: number; y: number; z: number; timestamp: number }[];
  deviceOrientation: string;
  movementPatterns: number[];
  stabilityScore: number;
}

interface DeviceMetrics {
  keyboardLatency: number[];
  ipAddress: string;
  deviceUUID: string; // ✅ Added UUID tracking
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

interface BehavioralMetrics {
  typingPatterns: {
    averageDwellTime: number;
    averageFlightTime: number;
    dwellTimeVariance: number;
    flightTimeVariance: number;
    typingRhythm: number;
    interKeyInterval: number;
    pausePatterns: number[];
    speedVariation: number;
    errorRate: number;
    correctionPatterns: number;
  };
  sensorData: SensorData;
  sessionMetrics: {
    sessionDuration: number;
    totalPauses: number;
    averagePauseLength: number;
    typingBursts: number[];
    concentrationLevel: number;
  };
  touchMetrics: {
    swipeData: TouchData[];
    tapRhythm: number[];
    swipeFrequency: number;
    averageSwipeVelocity: number;
  };
  deviceMetrics: DeviceMetrics; // ✅ Added device metrics
}

export default function TypingGameScreen() {
  const [currentText, setCurrentText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [keystrokeData, setKeystrokeData] = useState<EnhancedKeystrokeData[]>([]);
  const [touchData, setTouchData] = useState<TouchData[]>([]);
  const [sensorData, setSensorData] = useState<SensorData>({
    accelerometer: [],
    gyroscope: [],
    magnetometer: [],
    deviceOrientation: 'portrait',
    movementPatterns: [],
    stabilityScore: 100
  });
  
  // ✅ Added device metrics state with UUID
  const [deviceMetrics, setDeviceMetrics] = useState<DeviceMetrics>({
    keyboardLatency: [],
    ipAddress: '',
    deviceUUID: '', // ✅ Added UUID field
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

  const [stats, setStats] = useState<TypingStats>({
    wpm: 0,
    accuracy: 0,
    totalTime: 0,
    keystrokes: 0,
    errors: 0,
    correctKeystrokes: 0,
    averageSpeed: 0,
    consistency: 0,
    typingSpeed: 0,
    errorRate: 0,
    averageKeyHoldTime: 0,
    averageFlightTime: 0,
    averageTapRhythm: 0,
    backspaceCount: 0,
    averageKeyboardLatency: 0
  });
  
  const inputRef = useRef<TextInput>(null);
  const keyPressStartTime = useRef<number>(0);
  const lastKeystrokeTime = useRef<number>(0);
  const lastTapTime = useRef<number>(0);
  const touchStartPosition = useRef<{ x: number; y: number } | null>(null);
  const touchStartTime = useRef<number>(0);
  const sensorSubscriptions = useRef<any[]>([]);
  
  // ✅ Added refs for latency measurement
  const keyPressTimestamp = useRef<number>(0);
  const textChangeTimestamp = useRef<number>(0);

  useEffect(() => {
    resetGame();
    return () => {
      cleanupSensors();
    };
  }, []);

  useEffect(() => {
    if (userInput.length === currentText.length && userInput.length > 0) {
      completeGame();
    }
  }, [userInput, currentText]);

  // ✅ UUID generation and retrieval function
  const getOrCreateDeviceUUID = async (): Promise<string> => {
    try {
      // Try to get existing UUID from SecureStore
      let deviceUUID = await SecureStore.getItemAsync('secure_deviceid');
      
      if (deviceUUID) {
        // Parse the stored UUID (it's stored as JSON string)
        deviceUUID = JSON.parse(deviceUUID);
        console.log('Retrieved existing UUID:', deviceUUID);
      } else {
        // Generate new UUID if none exists
        deviceUUID = uuidv4();
        await SecureStore.setItemAsync('secure_deviceid', JSON.stringify(deviceUUID));
        console.log('Generated new UUID:', deviceUUID);
      }
      
      return deviceUUID;
    } catch (error) {
      console.error('Error handling device UUID:', error);
      // Fallback to generating a new UUID
      const fallbackUUID = uuidv4();
      console.log('Using fallback UUID:', fallbackUUID);
      return fallbackUUID;
    }
  };

  // ✅ Enhanced device information collection function with UUID
const collectDeviceInfo = async (): Promise<DeviceMetrics | null> => {
  try {
    const deviceUUID = await getOrCreateDeviceUUID();

    // Get device info
    const deviceInfo = {
      brand: Device.brand || 'Unknown',
      model: Device.modelName || 'Unknown',
      systemVersion: Device.osVersion || 'Unknown',
      uniqueId: deviceUUID,
      deviceType: Device.deviceType?.toString() || 'Unknown',
      totalMemory: 0, // Optional: Update with memory module
      usedMemory: 0,
      batteryLevel: 1,
      isCharging: false
    };

    // Get network info
    const networkState = await Network.getNetworkStateAsync();
    const networkInfo = {
      type: networkState.type || 'unknown',
      isConnected: networkState.isConnected ?? false,
      isInternetReachable: networkState.isInternetReachable ?? false
    };

    // Get IP address
    let ipAddress = 'Unknown';
    try {
      const ip = await Network.getIpAddressAsync();
      ipAddress = ip || 'Unknown';
    } catch (error) {
      console.warn('IP address fetch failed:', error);
    }

    // Get GPS location
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
      keyboardLatency: [] // Add this line to satisfy the DeviceMetrics interface
    };

    console.log('📱 Collected Device Metrics:', deviceMetrics);

    return deviceMetrics;

  } catch (err) {
    console.error('❌ Error collecting device info:', err);
    return null;
  }
};


  const initializeSensors = async () => {
    try {
      console.log('Sensor tracking disabled - focusing on typing and device metrics only');
    } catch (error) {
      console.error('Error initializing sensors:', error);
    }
  };

  const cleanupSensors = () => {
    sensorSubscriptions.current.forEach(sub => sub.remove());
    sensorSubscriptions.current = [];
  };

  const resetGame = () => {
    const randomText = SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)];
    setCurrentText(randomText);
    setUserInput('');
    setIsGameActive(false);
    setGameStarted(false);
    setGameCompleted(false);
    setKeystrokeData([]);
    setTouchData([]);
    setSensorData({
      accelerometer: [],
      gyroscope: [],
      magnetometer: [],
      deviceOrientation: 'portrait',
      movementPatterns: [],
      stabilityScore: 100
    });
    setStats({
      wpm: 0,
      accuracy: 0,
      totalTime: 0,
      keystrokes: 0,
      errors: 0,
      correctKeystrokes: 0,
      averageSpeed: 0,
      consistency: 0,
      typingSpeed: 0,
      errorRate: 0,
      averageKeyHoldTime: 0,
      averageFlightTime: 0,
      averageTapRhythm: 0,
      backspaceCount: 0,
      averageKeyboardLatency: 0
    });
    cleanupSensors();
  };

  const startGame = () => {
    setIsGameActive(true);
    setGameStarted(true);
    setStartTime(Date.now());
    lastKeystrokeTime.current = Date.now();
    
    // ✅ Collect device information when game starts
    collectDeviceInfo();
    
    inputRef.current?.focus();
  };

  const completeGame = async () => {
    const endTime = Date.now();
    setEndTime(endTime);
    setIsGameActive(false);
    setGameCompleted(true);
    
    cleanupSensors();
    
    const calculatedStats =  calculateComprehensiveStats(endTime);
    setStats(calculatedStats);
    
    const deviceMetrics = await collectDeviceInfo();
    await saveBehavioralData(calculatedStats,deviceMetrics);
    
    inputRef.current?.blur();

    await AsyncStorage.setItem('typingTestCompleted', 'true');
  };

  const calculateComprehensiveStats = (endTime: number): TypingStats => {
    const totalTime = (endTime - startTime) / 1000;
    const totalWords = currentText.split(' ').length;
    const wpm = Math.round((totalWords / totalTime) * 60);
    
    let correctChars = 0;
    let errors = 0;
    
    for (let i = 0; i < Math.min(userInput.length, currentText.length); i++) {
      if (userInput[i] === currentText[i]) {
        correctChars++;
      } else {
        errors++;
      }
    }
    
    const accuracy = Math.round((correctChars / currentText.length) * 100);
    const correctKeystrokes = correctChars;
    
    // ✅ Enhanced calculations
    const keystrokeTimes = keystrokeData.filter(k => !k.isBackspace).map(k => k.dwellTime).filter(t => t > 0);
    const flightTimes = keystrokeData.filter(k => k.flightTime > 0).map(k => k.flightTime);
    const backspaceCount = keystrokeData.filter(k => k.isBackspace).length;
    
    const averageSpeed = keystrokeTimes.length > 0 
      ? keystrokeTimes.reduce((a, b) => a + b, 0) / keystrokeTimes.length 
      : 0;
    
    const speedVariance = calculateVariance(keystrokeTimes);
    const consistency = Math.max(0, 100 - (speedVariance / 100));
    
    // Characters per minute
    const typingSpeed = Math.round((userInput.length / totalTime) * 60);
    
    // Error rate as percentage
    const errorRate = keystrokeData.length > 0 ? Math.round((backspaceCount / keystrokeData.length) * 100) : 0;
    
    // Average key hold time and flight time
    const averageKeyHoldTime = keystrokeTimes.length > 0 ? 
      Math.round(keystrokeTimes.reduce((a, b) => a + b, 0) / keystrokeTimes.length) : 0;
    const averageFlightTime = flightTimes.length > 0 ? 
      Math.round(flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length) : 0;
    
    // Tap rhythm
    const tapIntervals = [];
    for (let i = 1; i < keystrokeData.length; i++) {
      tapIntervals.push(keystrokeData[i].timestamp - keystrokeData[i-1].timestamp);
    }
    const averageTapRhythm = tapIntervals.length > 0 ? 
      Math.round(tapIntervals.reduce((a, b) => a + b, 0) / tapIntervals.length) : 0;
    
    // ✅ Calculate average keyboard latency
    const averageKeyboardLatency = deviceMetrics.keyboardLatency.length > 0 
      ? Math.round(deviceMetrics.keyboardLatency.reduce((a, b) => a + b, 0) / deviceMetrics.keyboardLatency.length)
      : 0;
    
    console.log('Enhanced stats calculation:', {
      totalTime, totalWords, wpm, correctChars, accuracy,
      typingSpeed, errorRate, averageKeyHoldTime, averageFlightTime, averageTapRhythm, averageKeyboardLatency
    });
    
    return {
      wpm,
      accuracy,
      totalTime: Math.round(totalTime),
      keystrokes: userInput.length,
      errors,
      correctKeystrokes,
      averageSpeed: Math.round(averageSpeed),
      consistency: Math.round(consistency),
      typingSpeed,
      errorRate,
      averageKeyHoldTime,
      averageFlightTime,
      averageTapRhythm,
      backspaceCount,
      averageKeyboardLatency
    };
  };

  const analyzeBehavioralPatterns = (): BehavioralMetrics => {
    const dwellTimes = keystrokeData.filter(k => !k.isBackspace).map(k => k.dwellTime).filter(t => t > 0);
    const flightTimes = keystrokeData.filter(k => k.flightTime > 0).map(k => k.flightTime);
    const interKeyIntervals = [];
    
    for (let i = 1; i < keystrokeData.length; i++) {
      const interval = keystrokeData[i].timestamp - keystrokeData[i-1].timestamp;
      interKeyIntervals.push(interval);
    }

    const pausePatterns = interKeyIntervals.filter(interval => interval > 500);
    const typingBursts: number[] = [];
    let currentBurst = 0;
    
    interKeyIntervals.forEach(interval => {
      if (interval < 200) {
        currentBurst++;
      } else {
        if (currentBurst > 0) {
          typingBursts.push(currentBurst);
          currentBurst = 0;
        }
      }
    });

    const concentrationLevel = calculateConcentrationLevel();

    // Enhanced touch metrics
    const swipeData = touchData.filter(t => t.type === 'swipe');
    const tapRhythm = touchData.filter(t => t.type === 'tap').map((_, i, arr) => 
      i > 0 ? arr[i].timestamp - arr[i-1].timestamp : 0
    ).filter(t => t > 0);
    
    const averageSwipeVelocity = swipeData.length > 0 ? 
      swipeData.reduce((sum, swipe) => sum + (swipe.velocity || 0), 0) / swipeData.length : 0;

    return {
      typingPatterns: {
        averageDwellTime: dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length || 0,
        averageFlightTime: flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length || 0,
        dwellTimeVariance: calculateVariance(dwellTimes),
        flightTimeVariance: calculateVariance(flightTimes),
        typingRhythm: calculateTypingRhythm(),
        interKeyInterval: interKeyIntervals.reduce((a, b) => a + b, 0) / interKeyIntervals.length || 0,
        pausePatterns: pausePatterns,
        speedVariation: calculateSpeedVariation(),
        errorRate: (stats.backspaceCount / keystrokeData.length) * 100 || 0,
        correctionPatterns: calculateCorrectionPatterns()
      },
      sensorData: {
        accelerometer: [],
        gyroscope: [],
        magnetometer: [],
        deviceOrientation: 'portrait',
        movementPatterns: [],
        stabilityScore: 100 // Default value
      },
      sessionMetrics: {
        sessionDuration: (endTime - startTime) / 1000,
        totalPauses: pausePatterns.length,
        averagePauseLength: pausePatterns.reduce((a, b) => a + b, 0) / pausePatterns.length || 0,
        typingBursts,
        concentrationLevel
      },
      touchMetrics: {
        swipeData,
        tapRhythm,
        swipeFrequency: swipeData.length,
        averageSwipeVelocity
      },
      deviceMetrics // ✅ Include device metrics with UUID
    };
  };

  const calculateVariance = (data: number[]): number => {
    if (data.length === 0) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    return data.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / data.length;
  };

  const calculateTypingRhythm = (): number => {
    const intervals = [];
    for (let i = 1; i < keystrokeData.length; i++) {
      intervals.push(keystrokeData[i].timestamp - keystrokeData[i-1].timestamp);
    }
    return calculateVariance(intervals);
  };

  const calculateSpeedVariation = (): number => {
    const speeds = [];
    for (let i = 0; i < keystrokeData.length - 5; i++) {
      const timeSpan = keystrokeData[i+4].timestamp - keystrokeData[i].timestamp;
      const speed = 5000 / timeSpan;
      speeds.push(speed);
    }
    return calculateVariance(speeds);
  };

  const calculateCorrectionPatterns = (): number => {
    return keystrokeData.filter(k => k.isBackspace).length;
  };

  const calculateConcentrationLevel = (): number => {
    const pauseCount = keystrokeData.filter((_, i, arr) => 
      i > 0 && (keystrokeData[i].timestamp - keystrokeData[i-1].timestamp) > 1000
    ).length;
    
    const maxPauses = keystrokeData.length / 10;
    return Math.max(0, 100 - ((pauseCount / maxPauses) * 100));
  };
const saveBehavioralData = async (typingStats: any, deviceMetrics: any) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      console.log('❌ No auth token found');
      return;
    }
    const sessionData = {
      deviceMetrics: {
        deviceUUID: deviceMetrics.deviceUUID,
        ipAddress: deviceMetrics.ipAddress,
        gpsLocation: {
          latitude: deviceMetrics.gpsLocation?.latitude || 0,
          longitude: deviceMetrics.gpsLocation?.longitude || 0,
          accuracy: deviceMetrics.gpsLocation?.accuracy || 0,
          timestamp: new Date(deviceMetrics.gpsLocation?.timestamp || Date.now()).toISOString()
        },
        deviceInfo: deviceMetrics.deviceInfo,
        networkInfo: deviceMetrics.networkInfo
      },
      typingStats: {
        wpm: typingStats.wpm || 0,
        accuracy: typingStats.accuracy || 0,
        totalTime: typingStats.totalTime || 0,
        totalWords: typingStats.totalWords || 0,
        typingSpeed: typingStats.typingSpeed || 0,
        errorRate: typingStats.errorRate || 0,
        correctChars: typingStats.correctChars || 0,
        averageKeyHoldTime: typingStats.averageKeyHoldTime || 0,
        averageFlightTime: typingStats.averageFlightTime || 0,
        averageKeyboardLatency: typingStats.averageKeyboardLatency || 0,
        averageTapRhythm: typingStats.averageTapRhythm || 0
      },
      timestamp: new Date().toISOString()
    };

    console.log('📤 Sending sessionData:', sessionData);

    const response = await fetch(`${API_BASE_URL}/api/behavior/typing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ sessionData }) // Must be wrapped inside { sessionData }
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Typing session data saved successfully:', result);
      Alert.alert('Success', 'Your typing data has been saved securely!',[{
        text:'OK',
        onPress: () => {router.replace('/mpin-validation')}
      }]);
    } else {
      console.error('❌ Failed to save typing session data:', result.message);
      Alert.alert('Error', result.message || 'Failed to save typing data. Please try again.');
    }
  } catch (error) {
    console.error('❌ Error saving typing session data:', error);
    Alert.alert('Error', 'Network error. Please check your connection.');
  }
};



  // ✅ Enhanced handleTextChange with comprehensive tracking and latency measurement
  const handleTextChange = (text: string) => {
    if (!isGameActive) return;
    
    const currentTime = Date.now();
    textChangeTimestamp.current = currentTime;
    
    // ✅ Calculate keyboard latency (input lag)
    const inputLatency = keyPressTimestamp.current > 0 
      ? currentTime - keyPressTimestamp.current 
      : 0;
    
    // ✅ Calculate system latency (processing time)
    const systemLatency = performance.now() - keyPressTimestamp.current;
    
    // Store latency data
    if (inputLatency > 0) {
      setDeviceMetrics(prev => ({
        ...prev,
        keyboardLatency: [...prev.keyboardLatency.slice(-100), inputLatency] // Keep last 100 measurements
      }));
    }
    
    // Handle key press (character added)
    if (text.length > userInput.length) {
      const newChar = text[text.length - 1];
      const isCorrect = newChar === currentText[text.length - 1];
      
      // ✅ Calculate key hold time (dwell time)
      const dwellTime = currentTime - (keyPressStartTime.current || currentTime);
      
      // ✅ Calculate flight time (time between last key release and current key press)
      const flightTime = lastKeystrokeTime.current > 0 
        ? currentTime - lastKeystrokeTime.current 
        : 0;
      
      const enhancedKeystrokeData: EnhancedKeystrokeData = {
        key: newChar,
        timestamp: currentTime,
        pressTime: keyPressStartTime.current || currentTime,
        releaseTime: currentTime,
        dwellTime,
        flightTime,
        correct: isCorrect,
        position: text.length - 1,
        isBackspace: false,
        inputLatency, // ✅ Keyboard latency
        systemLatency, // ✅ System processing latency
      };
      
      setKeystrokeData(prev => [...prev, enhancedKeystrokeData]);
      lastKeystrokeTime.current = currentTime;
    } 
    // ✅ Handle backspace (character removed) - for error rate calculation
    else if (text.length < userInput.length) {
      const backspaceData: EnhancedKeystrokeData = {
        key: 'Backspace',
        timestamp: currentTime,
        pressTime: keyPressStartTime.current || currentTime,
        releaseTime: currentTime,
        dwellTime: currentTime - (keyPressStartTime.current || currentTime),
        flightTime: lastKeystrokeTime.current > 0 
          ? currentTime - lastKeystrokeTime.current 
          : 0,
        correct: false,
        position: text.length,
        isBackspace: true,
        inputLatency,
        systemLatency,
      };
      
      setKeystrokeData(prev => [...prev, backspaceData]);
      lastKeystrokeTime.current = currentTime;
    }
    
    setUserInput(text);
    
    // ✅ Enhanced real-time stats calculation
    if (text.length > 0) {
      const elapsedTime = (currentTime - startTime) / 1000;
      const totalWords = text.trim().split(/\s+/).length;
      const currentWPM = elapsedTime > 0 ? Math.round((totalWords / elapsedTime) * 60) : 0;
      
      // ✅ Calculate typing speed in characters per minute
      const charactersPerMinute = elapsedTime > 0 ? Math.round((text.length / elapsedTime) * 60) : 0;
      
      let correctChars = 0;
      for (let i = 0; i < Math.min(text.length, currentText.length); i++) {
        if (text[i] === currentText[i]) {
          correctChars++;
        }
      }
      const currentAccuracy = text.length > 0 ? Math.round((correctChars / text.length) * 100) : 0;
      
      // ✅ Calculate error rate as percentage of backspaces
      const backspaceCount = keystrokeData.filter(k => k.isBackspace).length + 
                            (text.length < userInput.length ? 1 : 0);
      const errorRate = keystrokeData.length > 0 ? 
                       Math.round((backspaceCount / keystrokeData.length) * 100) : 0;
      
      // ✅ Calculate average key hold time and flight time
      const dwellTimes = keystrokeData.filter(k => !k.isBackspace).map(k => k.dwellTime);
      const flightTimes = keystrokeData.filter(k => k.flightTime > 0).map(k => k.flightTime);
      
      const averageKeyHoldTime = dwellTimes.length > 0 ? 
                                Math.round(dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length) : 0;
      const averageFlightTime = flightTimes.length > 0 ? 
                               Math.round(flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length) : 0;
      
      // ✅ Calculate tap rhythm (time between consecutive keystrokes)
      const tapIntervals = [];
      for (let i = 1; i < keystrokeData.length; i++) {
        tapIntervals.push(keystrokeData[i].timestamp - keystrokeData[i-1].timestamp);
      }
      const averageTapRhythm = tapIntervals.length > 0 ? 
                              Math.round(tapIntervals.reduce((a, b) => a + b, 0) / tapIntervals.length) : 0;
      
      // ✅ Calculate average keyboard latency
      const averageKeyboardLatency = deviceMetrics.keyboardLatency.length > 0 
        ? Math.round(deviceMetrics.keyboardLatency.reduce((a, b) => a + b, 0) / deviceMetrics.keyboardLatency.length)
        : 0;
      
      // Update stats in real-time
      setStats(prev => ({
        ...prev,
        wpm: currentWPM,
        accuracy: currentAccuracy,
        keystrokes: text.length,
        errors: backspaceCount,
        typingSpeed: charactersPerMinute,
        errorRate: errorRate,
        averageKeyHoldTime: averageKeyHoldTime,
        averageFlightTime: averageFlightTime,
        averageTapRhythm: averageTapRhythm,
        backspaceCount: backspaceCount,
        averageKeyboardLatency: averageKeyboardLatency
      }));
    }
  };

  const handleKeyPress = () => {
    keyPressTimestamp.current = Date.now();
    keyPressStartTime.current = Date.now();
  };

  // ✅ Touch event handlers for swipe and tap detection
  const handleTouchStart = (event: any) => {
    const touch = event.nativeEvent;
    touchStartPosition.current = { x: touch.pageX, y: touch.pageY };
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (event: any) => {
    if (!touchStartPosition.current) return;
    
    const touch = event.nativeEvent;
    const currentTime = Date.now();
    const duration = currentTime - touchStartTime.current;
    const deltaX = touch.pageX - touchStartPosition.current.x;
    const deltaY = touch.pageY - touchStartPosition.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // ✅ Detect swipe vs tap based on distance and duration
    if (distance > 50 && duration < 1000) { // Swipe detected
      const velocity = distance / duration;
      let direction: 'up' | 'down' | 'left' | 'right' = 'right';
      
      // ✅ Determine swipe direction
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }
      
      const swipeData: TouchData = {
        type: 'swipe',
        timestamp: currentTime,
        startX: touchStartPosition.current.x,
        startY: touchStartPosition.current.y,
        endX: touch.pageX,
        endY: touch.pageY,
        direction,
        velocity,
        duration
      };
      
      setTouchData(prev => [...prev, swipeData]);
      
    } else if (distance < 20) { // Tap detected
      // ✅ Calculate tap rhythm (time between taps)
      const tapRhythm = lastTapTime.current > 0 ? currentTime - lastTapTime.current : 0;
      
      const tapData: TouchData = {
        type: 'tap',
        timestamp: currentTime,
        startX: touchStartPosition.current.x,
        startY: touchStartPosition.current.y,
        duration
      };
      
      setTouchData(prev => [...prev, tapData]);
      lastTapTime.current = currentTime;
    }
    
    touchStartPosition.current = null;
  };

  const renderText = () => {
    return currentText.split('').map((char, index) => {
      let style = styles.defaultChar;
      
      if (index < userInput.length) {
        style = userInput[index] === char ? styles.correctChar : styles.incorrectChar;
      } else if (index === userInput.length) {
        style = styles.currentChar;
      }
      
      return (
        <Text key={index} style={style}>
          {char}
        </Text>
      );
    });
  };

  const getWPMColor = (wpm: number) => {
    if (wpm >= 60) return '#4CAF50';
    if (wpm >= 40) return '#FF9800';
    return '#F44336';
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 95) return '#4CAF50';
    if (accuracy >= 85) return '#FF9800';
    return '#F44336';
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#019EEC', '#0080CC']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Typing Speed Test</Text>
          <Text style={styles.headerSubtitle}>Behavioral Authentication Training</Text>
        </View>

        <TouchableOpacity 
          style={styles.skipButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* ✅ Enhanced Game Stats with new metrics including keyboard latency */}
        {gameStarted && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.typingSpeed}</Text>
              <Text style={styles.statLabel}>CPM</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.averageKeyHoldTime}ms</Text>
              <Text style={styles.statLabel}>Hold Time</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.averageFlightTime}ms</Text>
              <Text style={styles.statLabel}>Flight Time</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.averageKeyboardLatency}ms</Text>
              <Text style={styles.statLabel}>Kbd Latency</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.errorRate}%</Text>
              <Text style={styles.statLabel}>Error Rate</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.averageTapRhythm}ms</Text>
              <Text style={styles.statLabel}>Tap Rhythm</Text>
            </View>
          </View>
        )}

        {/* Text Display */}
        <View style={styles.textContainer}>
          <View style={styles.textDisplay}>
            {renderText()}
          </View>
        </View>

        {/* ✅ Enhanced Input Field with touch tracking */}
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={userInput}
            onChangeText={handleTextChange}
            onKeyPress={handleKeyPress}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            placeholder={gameStarted ? "Start typing..." : "Press Start to begin"}
            multiline
            editable={isGameActive}
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
          />
        </View>

        {/* ✅ Device & Network Info Display with UUID */}
        {gameStarted && (
          <View style={styles.deviceInfoContainer}>
            <Text style={styles.deviceInfoTitle}>Device & Network Information</Text>
            <View style={styles.deviceInfoGrid}>
              <View style={styles.deviceInfoItem}>
                <Text style={styles.deviceInfoLabel}>Device</Text>
                <Text style={styles.deviceInfoValue}>
                  {deviceMetrics.deviceInfo.brand} {deviceMetrics.deviceInfo.model}
                </Text>
              </View>
              <View style={styles.deviceInfoItem}>
                <Text style={styles.deviceInfoLabel}>Device UUID</Text>
                <Text style={styles.deviceInfoValue}>
                  {deviceMetrics.deviceUUID.substring(0, 8)}...
                </Text>
              </View>
              <View style={styles.deviceInfoItem}>
                <Text style={styles.deviceInfoLabel}>IP Address</Text>
                <Text style={styles.deviceInfoValue}>{deviceMetrics.ipAddress}</Text>
              </View>
              <View style={styles.deviceInfoItem}>
                <Text style={styles.deviceInfoLabel}>Network</Text>
                <Text style={styles.deviceInfoValue}>
                  {deviceMetrics.networkInfo.type} 
                  {deviceMetrics.networkInfo.isConnected ? ' ✓' : ' ✗'}
                </Text>
              </View>
              <View style={styles.deviceInfoItem}>
                <Text style={styles.deviceInfoLabel}>GPS</Text>
                <Text style={styles.deviceInfoValue}>
                  {deviceMetrics.gpsLocation 
                    ? `${deviceMetrics.gpsLocation.latitude.toFixed(4)}, ${deviceMetrics.gpsLocation.longitude.toFixed(4)}`
                    : 'Not available'
                  }
                </Text>
              </View>
              <View style={styles.deviceInfoItem}>
                <Text style={styles.deviceInfoLabel}>Battery</Text>
                <Text style={styles.deviceInfoValue}>
                  {Math.round(deviceMetrics.deviceInfo.batteryLevel * 100)}%
                  {deviceMetrics.deviceInfo.isCharging ? ' ⚡' : ''}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Game Controls */}
        <View style={styles.controlsContainer}>
          {!gameStarted ? (
            <TouchableOpacity style={styles.startButton} onPress={startGame}>
              <LinearGradient
                colors={['#FFB600', '#FF9500']}
                style={styles.buttonGradient}
              >
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={styles.buttonText}>Start Test</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.resetButton} onPress={resetGame}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ✅ Enhanced Results with new metrics */}
        {gameCompleted && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>🎉 Test Complete!</Text>
            
            {/* Success message */}
            <View style={styles.successMessage}>
              <Text style={styles.successText}>
                Great job! Your behavioral profile has been analyzed and saved securely.
              </Text>
            </View>
            
            <View style={styles.resultGrid}>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Words Per Minute</Text>
                <Text style={[styles.resultValue, { color: getWPMColor(stats.wpm) }]}>
                  {stats.wpm} WPM
                </Text>
              </View>
              
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Accuracy</Text>
                <Text style={[styles.resultValue, { color: getAccuracyColor(stats.accuracy) }]}>
                  {stats.accuracy}%
                </Text>
              </View>
              
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Avg Hold Time</Text>
                <Text style={styles.resultValue}>{stats.averageKeyHoldTime}ms</Text>
              </View>
              
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Avg Flight Time</Text>
                <Text style={styles.resultValue}>{stats.averageFlightTime}ms</Text>
              </View>
              
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Keyboard Latency</Text>
                <Text style={styles.resultValue}>{stats.averageKeyboardLatency}ms</Text>
              </View>
              
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Error Rate</Text>
                <Text style={styles.resultValue}>{stats.errorRate}%</Text>
              </View>
            </View>

            {/* Action buttons for user navigation */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.continueButton} onPress={() => router.replace('/(tabs)')}>
                <LinearGradient
                  colors={['#019EEC', '#0080CC']}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>Continue to Banking</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.playAgainButton} onPress={resetGame}>
                <LinearGradient
                  colors={['#FFB600', '#FF9500']}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Try Again</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Additional info */}
            <View style={styles.infoSection}>
              <Text style={styles.infoText}>
                Your typing patterns and device metrics have been analyzed for enhanced security. 
                You can now proceed to the banking app or take the test again.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E8F4FD',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
    minWidth: '30%',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  deviceInfoContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deviceInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  deviceInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  deviceInfoItem: {
    width: '48%',
    marginBottom: 12,
  },
  deviceInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  deviceInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  textContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    lineHeight: 28,
  },
  defaultChar: {
    fontSize: 18,
    color: '#666',
    lineHeight: 28,
  },
  correctChar: {
    fontSize: 18,
    color: '#4CAF50',
    backgroundColor: '#E8F5E8',
    lineHeight: 28,
  },
  incorrectChar: {
    fontSize: 18,
    color: '#F44336',
    backgroundColor: '#FFEBEE',
    lineHeight: 28,
  },
  currentChar: {
    fontSize: 18,
    color: '#333',
    backgroundColor: '#FFB600',
    lineHeight: 28,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textInput: {
    fontSize: 16,
    padding: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    color: '#333',
  },
  controlsContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  startButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#FFB600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  resetButton: {
    backgroundColor: '#666',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  successMessage: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  successText: {
    color: '#2E7D32',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  resultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  resultItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  actionButtons: {
    gap: 12,
    marginTop: 20,
  },
  continueButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#019EEC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  playAgainButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#FFB600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  infoSection: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
  },
  infoText: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
