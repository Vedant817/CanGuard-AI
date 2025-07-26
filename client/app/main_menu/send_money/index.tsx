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

interface FraudDetectionResult {
  decision: 'PASS' | 'ESCALATE_T2' | 'ESCALATE_T3' | 'SKIP';
  anomalyScore: number | null;
  ruleFlags: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
}

interface LocationData {
  latitude: number;
  longitude: number;
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
  
  // **NEW: Fraud Detection Integration**
  private fraudDetectionCallback: ((vector: BehavioralVector) => void) | null = null;
  private realTimeStatsCallback: ((stats: BehavioralVector) => void) | null = null;
  private sessionStartTime: number = 0;
  private totalKeystrokesInSession: number = 0;
  private totalCorrectKeysInSession: number = 0;

  constructor(deviceMetrics: DeviceMetrics) {
    this.deviceMetrics = deviceMetrics;
    this.currentVector = this.initializeVector();
    this.sessionStartTime = Date.now();
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

  // **NEW: Set fraud detection callback**
  setFraudDetectionCallback(callback: (vector: BehavioralVector) => void) {
    this.fraudDetectionCallback = callback;
  }

  // **NEW: Set real-time stats callback**
  setRealTimeStatsCallback(callback: (stats: BehavioralVector) => void) {
    this.realTimeStatsCallback = callback;
  }

  startCollection() {
    this.isCollecting = true;
    this.currentVector = this.initializeVector();
    this.sessionStartTime = Date.now();
    this.totalKeystrokesInSession = 0;
    this.totalCorrectKeysInSession = 0;
    
    this.collectionInterval = setInterval(() => {
      this.captureVector();
    }, this.COLLECTION_INTERVAL);
    
    console.log('🔄 Behavioral data collection started (6-second intervals)');
    
    // **NEW: Start real-time stats updates**
    this.startRealTimeStatsUpdates();
  }

  stopCollection() {
    this.isCollecting = false;
    
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    
    // Capture final vector if there's data
    if (this.currentVector.keysPressed > 0) {
      this.captureVector();
    }
    
    console.log('⏹️ Behavioral data collection stopped');
    console.log(`📈 Session Summary: ${this.totalKeystrokesInSession} keystrokes, ${this.vectors.length} vectors captured`);
  }

  addKeystroke(keystroke: EnhancedKeystrokeData) {
    if (!this.isCollecting) return;
    
    // Always add keystroke to data (including backspace for analysis)
    this.keystrokeData.push(keystroke);
    
    if (!keystroke.isBackspace) {
      this.currentVector.keysPressed++;
      this.totalKeystrokesInSession++;
      
      if (keystroke.correct) {
        this.currentVector.correctKeys++;
        this.totalCorrectKeysInSession++;
      }
    }
    
    // **NEW: Update real-time stats immediately**
    this.updateRealTimeStats();
  }

  // **NEW: Real-time stats updates**
  private startRealTimeStatsUpdates() {
    setInterval(() => {
      if (this.isCollecting && this.realTimeStatsCallback) {
        const currentStats = this.calculateCurrentStats();
        this.realTimeStatsCallback(currentStats);
      }
    }, 1000); // Update every second for real-time feedback
  }

  // **NEW: Calculate current typing statistics**
  private calculateCurrentStats(): BehavioralVector {
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

    return {
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
  }

  // **UPDATED: Enhanced vector capture with fraud detection**
  private captureVector() {
    if (this.currentVector.keysPressed === 0) return;
    
    const vector = this.calculateCurrentStats();
    
    // Store vector
    this.vectors.push(vector);
    if (this.vectors.length > this.BUFFER_SIZE) {
      this.vectors.shift();
    }

    console.log('📊 Vector captured:', {
      ...vector,
      wpm: Math.round(vector.wpm * 100) / 100,
      accuracy: Math.round(vector.accuracy * 100) / 100,
      errorRate: Math.round(vector.errorRate * 100) / 100
    });

    // **NEW: Trigger fraud detection analysis**
    if (this.fraudDetectionCallback) {
      this.fraudDetectionCallback(vector);
    }

    // Reset for next collection interval
    this.currentVector = this.initializeVector();
    this.keystrokeData = [];
  }

  // **NEW: Real-time stats update method**
  private updateRealTimeStats() {
    if (this.realTimeStatsCallback && this.currentVector.keysPressed > 0) {
      const currentStats = this.calculateCurrentStats();
      this.realTimeStatsCallback(currentStats);
    }
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

  // **ENHANCED: More comprehensive final metrics**
  getFinalMetrics() {
    if (this.vectors.length === 0) {
      return {
        averageMetrics: this.initializeVector(),
        standardDeviations: this.initializeVector(),
        vectorCount: 0,
        sessionMetrics: this.getSessionMetrics(),
        vectors: []
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

    // Add metadata
    averageMetrics.timestamp = Date.now();
    averageMetrics.keysPressed = this.totalKeystrokesInSession;
    averageMetrics.correctKeys = this.totalCorrectKeysInSession;
    averageMetrics.startTime = this.sessionStartTime;

    return {
      averageMetrics,
      standardDeviations,
      vectorCount: this.vectors.length,
      sessionMetrics: this.getSessionMetrics(),
      vectors: this.vectors.slice() // Return copy
    };
  }

  // **NEW: Session-level metrics**
  private getSessionMetrics() {
    const sessionDuration = (Date.now() - this.sessionStartTime) / 1000;
    const sessionDurationMinutes = sessionDuration / 60;
    
    return {
      sessionDuration: sessionDuration,
      totalKeystrokes: this.totalKeystrokesInSession,
      totalCorrectKeys: this.totalCorrectKeysInSession,
      overallAccuracy: this.totalKeystrokesInSession > 0 ? 
        (this.totalCorrectKeysInSession / this.totalKeystrokesInSession) * 100 : 0,
      overallWPM: sessionDurationMinutes > 0 ? 
        (this.totalKeystrokesInSession / 5) / sessionDurationMinutes : 0,
      overallErrorRate: this.totalKeystrokesInSession > 0 ? 
        ((this.totalKeystrokesInSession - this.totalCorrectKeysInSession) / this.totalKeystrokesInSession) * 100 : 0,
      vectorsCaptured: this.vectors.length,
      averageKeysPerVector: this.vectors.length > 0 ? 
        this.vectors.reduce((sum, v) => sum + v.keysPressed, 0) / this.vectors.length : 0
    };
  }

  // **NEW: Get latest vector for real-time analysis**
  getLatestVector(): BehavioralVector | null {
    return this.vectors.length > 0 ? this.vectors[this.vectors.length - 1] : null;
  }

  // **NEW: Get session consistency score**
  getConsistencyScore(): number {
    if (this.vectors.length < 2) return 0;
    
    const wpmValues = this.vectors.map(v => v.wpm);
    const accuracyValues = this.vectors.map(v => v.accuracy);
    
    const wpmStdDev = this.calculateStandardDeviation(wpmValues);
    const accuracyStdDev = this.calculateStandardDeviation(accuracyValues);
    const wpmMean = this.calculateAverage(wpmValues);
    const accuracyMean = this.calculateAverage(accuracyValues);
    
    // Calculate coefficient of variation (lower = more consistent)
    const wpmCV = wpmMean > 0 ? wpmStdDev / wpmMean : 0;
    const accuracyCV = accuracyMean > 0 ? accuracyStdDev / accuracyMean : 0;
    
    // Convert to consistency score (0-100, higher = more consistent)
    const consistencyScore = Math.max(0, 100 - ((wpmCV + accuracyCV) * 50));
    
    return Math.round(consistencyScore);
  }

  // **NEW: Reset collector for new session**
  reset() {
    this.stopCollection();
    this.vectors = [];
    this.keystrokeData = [];
    this.currentVector = this.initializeVector();
    this.sessionStartTime = Date.now();
    this.totalKeystrokesInSession = 0;
    this.totalCorrectKeysInSession = 0;
    console.log('🔄 Behavioral data collector reset');
  }

  // **NEW: Get typing pattern analysis**
  getTypingPatternAnalysis() {
    if (this.vectors.length === 0) return null;
    
    const latestVector = this.vectors[this.vectors.length - 1];
    const consistencyScore = this.getConsistencyScore();
    
    return {
      currentVector: latestVector,
      consistencyScore,
      isTypingFast: latestVector.wpm > 40,
      isTypingAccurate: latestVector.accuracy > 90,
      hasLowLatency: latestVector.averageKeyboardLatency < 50,
      typingRhythm: this.analyzeTypingRhythm(),
      riskFactors: this.identifyRiskFactors()
    };
  }

  // **NEW: Analyze typing rhythm patterns**
  private analyzeTypingRhythm() {
    if (this.vectors.length === 0) return { pattern: 'insufficient_data', score: 0 };
    
    const rhythmValues = this.vectors.map(v => v.averageTapRhythm);
    const stdDev = this.calculateStandardDeviation(rhythmValues);
    const mean = this.calculateAverage(rhythmValues);
    
    let pattern = 'consistent';
    if (stdDev > mean * 0.3) pattern = 'variable';
    if (stdDev > mean * 0.5) pattern = 'erratic';
    
    return {
      pattern,
      score: Math.max(0, 100 - (stdDev / mean) * 100),
      meanRhythm: mean,
      variability: stdDev
    };
  }

  // **NEW: Identify potential risk factors**
  private identifyRiskFactors(): string[] {
    const factors: string[] = [];
    
    if (this.vectors.length === 0) return factors;
    
    const latest = this.vectors[this.vectors.length - 1];
    const sessionMetrics = this.getSessionMetrics();
    
    if (latest.wpm > 120 || latest.wpm < 10) {
      factors.push('unusual_typing_speed');
    }
    
    if (latest.accuracy < 70) {
      factors.push('low_accuracy');
    }
    
    if (latest.errorRate > 20) {
      factors.push('high_error_rate');
    }
    
    if (latest.averageKeyboardLatency > 200) {
      factors.push('high_latency');
    }
    
    if (this.getConsistencyScore() < 30) {
      factors.push('inconsistent_patterns');
    }
    
    if (sessionMetrics.averageKeysPerVector < 5) {
      factors.push('insufficient_typing_data');
    }
    
    return factors;
  }
}


class FraudDetectionEngine {
  private readonly THRESHOLD_PASS = 1.5;
  private readonly THRESHOLD_ESCALATE_T2 = 2.5;
  private readonly IDLE_THRESHOLD = 3;
  private idleCount = 0;

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371.0; // Earth's radius in km
    const toRadians = (degrees: number) => degrees * (Math.PI / 180);
    
    const dlat = toRadians(lat2 - lat1);
    const dlon = toRadians(lon2 - lon1);
    const a = Math.sin(dlat/2)**2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dlon/2)**2;
    
    return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * R;
  }

  private estimateStandardDeviation(referenceVector: number[]): number[] {
    return referenceVector.map(val => Math.max(0.01, Math.abs(val * 0.10))); // 10% tolerance
  }

  private computeAnomalyScore(
    currentVector: BehavioralVector, 
    referenceVector: BehavioralVector, 
    age: number
  ): { score: number | null; zScores: number[] | null } {
    
    // Create arrays from behavioral vectors for comparison
    const current = [
      currentVector.wpm,
      currentVector.averageFlightTime,
      currentVector.typingSpeed,
      currentVector.accuracy,
      currentVector.averageKeyHoldTime,
      currentVector.errorRate,
      currentVector.averageKeyboardLatency,
      currentVector.averageTapRhythm,
      currentVector.keysPressed,
      currentVector.correctKeys
    ];

    const reference = [
      referenceVector.wpm,
      referenceVector.averageFlightTime,
      referenceVector.typingSpeed,
      referenceVector.accuracy,
      referenceVector.averageKeyHoldTime,
      referenceVector.errorRate,
      referenceVector.averageKeyboardLatency,
      referenceVector.averageTapRhythm,
      referenceVector.keysPressed,
      referenceVector.correctKeys
    ];

    // Skip if insufficient data
    const nonZeroCount = current.filter(val => val > 0).length;
    if (nonZeroCount < 4) {
      return { score: null, zScores: null };
    }

    const standardDeviations = this.estimateStandardDeviation(reference);
    const zScores = current.map((val, idx) => 
      Math.abs((val - reference[idx]) / (standardDeviations[idx] + 1e-8))
    );

    const ageBoost = age >= 60 ? 1.15 : 1.0;
    const anomalyScore = (zScores.reduce((sum, z) => sum + z, 0) / zScores.length) * ageBoost;

    return { score: anomalyScore, zScores };
  }

  private performRuleBasedChecks(
    currentVector: BehavioralVector,
    lastLoginLocation: LocationData,
    currentLocation: LocationData,
    previousLocation: LocationData,
    latestLocation: LocationData
  ): { flags: string[]; travelSpeed: number } {
    const flags: string[] = [];

    // 1. Unusual login location check
    const loginDistance = this.haversineDistance(
      lastLoginLocation.latitude, lastLoginLocation.longitude,
      currentLocation.latitude, currentLocation.longitude
    );
    
    if (loginDistance > 10) {
      flags.push(`Login from unusual distant location (${loginDistance.toFixed(1)}km away)`);
    }

    // 2. Travel speed analysis
    const sessionDistance = this.haversineDistance(
      previousLocation.latitude, previousLocation.longitude,
      latestLocation.latitude, latestLocation.longitude
    );
    
    const sessionTimeHours = 30 / 3600; // 30 seconds in hours
    const travelSpeed = sessionDistance / sessionTimeHours;
    
    if (travelSpeed > 80) {
      flags.push(`Abnormal travel speed detected: ${travelSpeed.toFixed(1)} km/h`);
    }

    // 3. Behavioral threshold checks
    if (currentVector.accuracy > 0 && (currentVector.accuracy < 50 || currentVector.accuracy > 98)) {
      flags.push(`Unusual typing accuracy: ${currentVector.accuracy.toFixed(1)}%`);
    }
    
    if (currentVector.averageFlightTime > 600) {
      flags.push(`Flight time too high: ${currentVector.averageFlightTime.toFixed(1)}ms`);
    }
    
    if (currentVector.errorRate > 10) {
      flags.push(`Error rate too high: ${currentVector.errorRate.toFixed(1)}%`);
    }

    if (currentVector.wpm > 0 && (currentVector.wpm < 20 || currentVector.wpm > 120)) {
      flags.push(`Unusual typing speed: ${currentVector.wpm.toFixed(1)} WPM`);
    }

    return { flags, travelSpeed };
  }

  public analyzeTransaction(
    currentMetrics: BehavioralVector,
    referenceData: BehavioralVector,
    userAge: number,
    locationData: {
      lastLogin: LocationData;
      current: LocationData;
      previous: LocationData;
      latest: LocationData;
    }
  ): FraudDetectionResult {
    
    const { score: anomalyScore, zScores } = this.computeAnomalyScore(
      currentMetrics, 
      referenceData, 
      userAge
    );

    const { flags: ruleFlags, travelSpeed } = this.performRuleBasedChecks(
      currentMetrics,
      locationData.lastLogin,
      locationData.current,
      locationData.previous,
      locationData.latest
    );

    let decision: FraudDetectionResult['decision'];
    let riskLevel: FraudDetectionResult['riskLevel'];
    let confidence: number;

    if (anomalyScore === null) {
      this.idleCount++;
      if (this.idleCount >= this.IDLE_THRESHOLD && travelSpeed > 80) {
        decision = 'ESCALATE_T2';
        riskLevel = 'MEDIUM';
        confidence = 0.7;
      } else {
        decision = 'SKIP';
        riskLevel = 'LOW';
        confidence = 0.5;
      }
    } else {
      this.idleCount = 0;
      
      if (anomalyScore < this.THRESHOLD_PASS && ruleFlags.length === 0) {
        decision = 'PASS';
        riskLevel = 'LOW';
        confidence = 0.9;
      } else if (anomalyScore < this.THRESHOLD_ESCALATE_T2 || ruleFlags.length > 0) {
        decision = 'ESCALATE_T2';
        riskLevel = 'MEDIUM';
        confidence = Math.min(0.8, anomalyScore / this.THRESHOLD_ESCALATE_T2);
      } else {
        decision = 'ESCALATE_T3';
        riskLevel = 'HIGH';
        confidence = Math.min(0.95, anomalyScore / this.THRESHOLD_ESCALATE_T2);
      }
    }

    return {
      decision,
      anomalyScore,
      ruleFlags,
      riskLevel,
      confidence: Math.round(confidence * 100) / 100
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

  const [fraudDetectionEngine] = useState(() => new FraudDetectionEngine());
  const [fraudAnalysis, setFraudAnalysis] = useState<FraudDetectionResult | null>(null);
  const [userAge] = useState(65); // You can get this from user profile
  const [isTransactionBlocked, setIsTransactionBlocked] = useState(false);

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

  const performFraudAnalysis = (currentVector: BehavioralVector) => {
    if (!behavioralData || !deviceMetrics.gpsLocation) return;

    const locationData = {
      lastLogin: { latitude: 28.7041, longitude: 77.1025 }, // Delhi - get from user session
      current: { 
        latitude: deviceMetrics.gpsLocation.latitude, 
        longitude: deviceMetrics.gpsLocation.longitude 
      },
      previous: { 
        latitude: deviceMetrics.gpsLocation.latitude, 
        longitude: deviceMetrics.gpsLocation.longitude 
      },
      latest: { 
        latitude: deviceMetrics.gpsLocation.latitude, 
        longitude: deviceMetrics.gpsLocation.longitude 
      }
    };

    // Use stored behavioral data as reference
    const referenceVector: BehavioralVector = {
      wpm: behavioralData.averageWpm || 79,
      accuracy: behavioralData.averageAccuracy || 330,
      typingSpeed: behavioralData.averageTypingSpeed || 9,
      errorRate: behavioralData.averageErrorRate || 278,
      averageKeyHoldTime: behavioralData.averageKeyHoldTime || 74,
      averageFlightTime: behavioralData.averageFlightTime || 5,
      averageKeyboardLatency: behavioralData.averageKeyboardLatency || 34.32,
      averageTapRhythm: behavioralData.averageTapRhythm || 13,
      keysPressed: behavioralData.averageKeysPressed || 154,
      correctKeys: behavioralData.averageCorrectKeys || 23,
      timestamp: Date.now(),
      startTime: Date.now()
    };

    const analysis = fraudDetectionEngine.analyzeTransaction(
      currentVector,
      referenceVector,
      userAge,
      locationData
    );

    setFraudAnalysis(analysis);

    // Handle security decisions
    handleSecurityDecision(analysis);
  };

   const handleSecurityDecision = (analysis: FraudDetectionResult) => {
    switch (analysis.decision) {
      case 'PASS':
        setIsTransactionBlocked(false);
        console.log('✅ Transaction approved - Low risk');
        break;
        
      case 'ESCALATE_T2':
        setIsTransactionBlocked(true);
        Alert.alert(
          'Additional Verification Required',
          `Security check detected unusual patterns:\n\n${analysis.ruleFlags.join('\n')}\n\nPlease verify your identity with additional authentication.`,
          [
            { text: 'Cancel Transaction', style: 'cancel' },
            { text: 'Verify Identity', onPress: () => handleAdditionalVerification() }
          ]
        );
        break;
        
      case 'ESCALATE_T3':
        setIsTransactionBlocked(true);
        Alert.alert(
          'Transaction Blocked',
          `High-risk activity detected. Transaction has been blocked for security reasons.\n\nRisk factors:\n${analysis.ruleFlags.join('\n')}\n\nPlease contact customer support.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
        break;
        
      case 'SKIP':
        console.log('⏸️ Insufficient data for analysis');
        break;
    }
  };

  const handleAdditionalVerification = () => {
    console.log('🔐 Initiating additional verification...');
    setIsTransactionBlocked(false);
  };

 const handleSendMoney = async () => {
    if (isTransactionBlocked) {
      Alert.alert(
        'Transaction Blocked',
        'This transaction has been blocked due to security concerns. Please complete additional verification first.'
      );
      return;
    }

    if (fraudAnalysis && fraudAnalysis.riskLevel === 'HIGH') {
      Alert.alert(
        'High Risk Transaction',
        'This transaction has been flagged as high risk. Please contact customer support.'
      );
      return;
    }

    else{
      Alert.alert(
        'Success',
        'Transaction processed successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
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
      
      {/* **NEW: Security Status Display** */}
      {fraudAnalysis && (
        <View style={[
          styles.securityStatusContainer,
          fraudAnalysis.riskLevel === 'HIGH' ? styles.highRisk :
          fraudAnalysis.riskLevel === 'MEDIUM' ? styles.mediumRisk : styles.lowRisk
        ]}>
          <View style={styles.securityHeader}>
            <Ionicons 
              name={
                fraudAnalysis.riskLevel === 'HIGH' ? 'shield-checkmark' :
                fraudAnalysis.riskLevel === 'MEDIUM' ? 'warning' : 'checkmark-circle'
              } 
              size={20} 
              color={
                fraudAnalysis.riskLevel === 'HIGH' ? '#EF4444' :
                fraudAnalysis.riskLevel === 'MEDIUM' ? '#F59E0B' : '#22C55E'
              }
            />
            <Text style={styles.securityStatusTitle}>
              Security Analysis: {fraudAnalysis.riskLevel} RISK
            </Text>
          </View>
          
          <View style={styles.securityDetails}>
            <Text style={styles.securityStatusText}>
              Confidence: {(fraudAnalysis.confidence * 100).toFixed(0)}% • 
              Decision: {fraudAnalysis.decision.replace('_', ' ')}
            </Text>
            {fraudAnalysis.anomalyScore && (
              <Text style={styles.securityStatusText}>
                Anomaly Score: {fraudAnalysis.anomalyScore.toFixed(2)}
              </Text>
            )}
          </View>
          
          {fraudAnalysis.ruleFlags.length > 0 && (
            <View style={styles.flagsContainer}>
              <Text style={styles.flagsTitle}>Security Alerts:</Text>
              {fraudAnalysis.ruleFlags.map((flag, index) => (
                <Text key={index} style={styles.flagItem}>• {flag}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* **ENHANCED: Behavioral Analysis Status with Real-time Stats** */}
      {isTypingActive && (
        <View style={styles.behavioralStatusContainer}>
          <View style={styles.behavioralHeader}>
            <Ionicons name="shield-outline" size={16} color="#667eea" />
            <Text style={styles.behavioralStatusText}>
              🔒 Analyzing typing patterns for enhanced security...
            </Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[
                styles.statValue,
                currentTypingStats.wpm > 100 || currentTypingStats.wpm < 20 ? styles.statWarning : styles.statNormal
              ]}>
                {currentTypingStats.wpm}
              </Text>
              <Text style={styles.statLabel}>WPM</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[
                styles.statValue,
                currentTypingStats.accuracy < 70 ? styles.statWarning : styles.statNormal
              ]}>
                {currentTypingStats.accuracy}%
              </Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[
                styles.statValue,
                currentTypingStats.averageKeyHoldTime > 200 ? styles.statWarning : styles.statNormal
              ]}>
                {currentTypingStats.averageKeyHoldTime}ms
              </Text>
              <Text style={styles.statLabel}>Hold Time</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[
                styles.statValue,
                currentTypingStats.errorRate > 15 ? styles.statWarning : styles.statNormal
              ]}>
                {currentTypingStats.errorRate}%
              </Text>
              <Text style={styles.statLabel}>Error Rate</Text>
            </View>
          </View>
          
          {/* **NEW: Additional Real-time Metrics** */}
          <View style={styles.additionalStats}>
            <View style={styles.miniStatItem}>
              <Text style={styles.miniStatValue}>{currentTypingStats.typingSpeed.toFixed(1)} keys/s</Text>
              <Text style={styles.miniStatLabel}>Speed</Text>
            </View>
            <View style={styles.miniStatItem}>
              <Text style={styles.miniStatValue}>{currentTypingStats.averageFlightTime}ms</Text>
              <Text style={styles.miniStatLabel}>Flight Time</Text>
            </View>
            <View style={styles.miniStatItem}>
              <Text style={styles.miniStatValue}>{currentTypingStats.averageKeyboardLatency}ms</Text>
              <Text style={styles.miniStatLabel}>Latency</Text>
            </View>
          </View>
          
          {/* **NEW: Consistency Indicator** */}
          {behavioralCollector && (
            <View style={styles.consistencyIndicator}>
              <Text style={styles.consistencyText}>
                Pattern Consistency: {behavioralCollector.getConsistencyScore()}%
              </Text>
              <View style={styles.consistencyBar}>
                <View 
                  style={[
                    styles.consistencyFill, 
                    { width: `${behavioralCollector.getConsistencyScore()}%` }
                  ]} 
                />
              </View>
            </View>
          )}
        </View>
      )}

      {/* **NEW: Transaction Risk Assessment** */}
      {!isTypingActive && fraudAnalysis && (
        <View style={styles.riskAssessmentContainer}>
          <Text style={styles.riskAssessmentTitle}>🔍 Transaction Risk Assessment</Text>
          <View style={styles.riskMetrics}>
            <View style={styles.riskMetricItem}>
              <Text style={styles.riskMetricLabel}>Security Level</Text>
              <Text style={[
                styles.riskMetricValue,
                fraudAnalysis.riskLevel === 'LOW' ? styles.lowRiskText :
                fraudAnalysis.riskLevel === 'MEDIUM' ? styles.mediumRiskText : styles.highRiskText
              ]}>
                {fraudAnalysis.riskLevel}
              </Text>
            </View>
            <View style={styles.riskMetricItem}>
              <Text style={styles.riskMetricLabel}>AI Confidence</Text>
              <Text style={styles.riskMetricValue}>
                {(fraudAnalysis.confidence * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Form Fields */}
      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Recipient Name *</Text>
          <TextInput
            style={[
              styles.textInput,
              isTransactionBlocked && styles.inputDisabled
            ]}
            placeholder="Enter recipient name"
            value={recipientName}
            onChangeText={(text) => handleInputChange(text, 'recipientName')}
            onKeyPress={handleKeyPress}
            autoCapitalize="words"
            editable={!isTransactionBlocked}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Account Number *</Text>
          <TextInput
            style={[
              styles.textInput,
              isTransactionBlocked && styles.inputDisabled
            ]}
            placeholder="Enter account number"
            value={recipientAccount}
            onChangeText={(text) => handleInputChange(text, 'recipientAccount')}
            onKeyPress={handleKeyPress}
            keyboardType="numeric"
            editable={!isTransactionBlocked}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>IFSC Code</Text>
          <TextInput
            style={[
              styles.textInput,
              isTransactionBlocked && styles.inputDisabled
            ]}
            placeholder="Enter IFSC code"
            value={ifscCode}
            onChangeText={(text) => handleInputChange(text.toUpperCase(), 'ifscCode')}
            onKeyPress={handleKeyPress}
            autoCapitalize="characters"
            maxLength={11}
            editable={!isTransactionBlocked}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Amount *</Text>
          <TextInput
            style={[
              styles.textInput, 
              styles.amountInput,
              isTransactionBlocked && styles.inputDisabled
            ]}
            placeholder="0.00"
            value={amount}
            onChangeText={(text) => handleInputChange(text, 'amount')}
            onKeyPress={handleKeyPress}
            keyboardType="decimal-pad"
            editable={!isTransactionBlocked}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Transfer Note (Optional)</Text>
          <TextInput
            style={[
              styles.textInput, 
              styles.multilineInput,
              isTransactionBlocked && styles.inputDisabled
            ]}
            placeholder="Add a note for this transfer"
            value={transferNote}
            onChangeText={(text) => handleInputChange(text, 'transferNote')}
            onKeyPress={handleKeyPress}
            multiline={true}
            numberOfLines={3}
            editable={!isTransactionBlocked}
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
          
          {/* **NEW: Security Summary** */}
          {fraudAnalysis && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Security Status:</Text>
              <Text style={[
                styles.summaryValue,
                fraudAnalysis.riskLevel === 'LOW' ? styles.lowRiskText :
                fraudAnalysis.riskLevel === 'MEDIUM' ? styles.mediumRiskText : styles.highRiskText
              ]}>
                {fraudAnalysis.riskLevel} RISK
              </Text>
            </View>
          )}
        </View>
      )}

      {/* **UPDATED: Enhanced Send Money Button with Security States** */}
      <TouchableOpacity 
        style={[
          styles.sendButton, 
          (isTransactionBlocked || !recipientName || !recipientAccount || !amount) && styles.sendButtonDisabled
        ]} 
        onPress={handleSendMoney}
        disabled={isTransactionBlocked || !recipientName || !recipientAccount || !amount}
      >
        <LinearGradient
          colors={
            isTransactionBlocked ? ['#EF4444', '#DC2626'] :
            (!recipientName || !recipientAccount || !amount) ? ['#ccc', '#999'] : 
            ['#667eea', '#764ba2']
          }
          style={styles.sendButtonGradient}
        >
          <Ionicons 
            name={
              isTransactionBlocked ? "shield-outline" : 
              fraudAnalysis?.riskLevel === 'MEDIUM' ? "warning-outline" : 
              "send"
            } 
            size={20} 
            color="#fff" 
          />
          <Text style={styles.sendButtonText}>
            {isTransactionBlocked ? 'Transaction Blocked' : 
             fraudAnalysis?.riskLevel === 'MEDIUM' ? 'Verify & Send' : 
             'Send Money'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* **NEW: Security Actions** */}
      {isTransactionBlocked && (
        <View style={styles.securityActionsContainer}>
          <TouchableOpacity 
            style={styles.verificationButton}
            onPress={handleAdditionalVerification}
          >
            <Ionicons name="finger-print" size={18} color="#667eea" />
            <Text style={styles.verificationButtonText}>Complete Additional Verification</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.supportButton}
            onPress={() => Alert.alert('Support', 'Contact customer support at support@yourbank.com')}
          >
            <Ionicons name="help-circle-outline" size={18} color="#666" />
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* **ENHANCED: Behavioral Info with Security Details** */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>🛡️ Enhanced Security Information</Text>
        <Text style={styles.infoText}>
          Your typing patterns are analyzed in real-time using advanced AI to detect fraudulent activity:
          {'\n\n'}• Behavioral biometrics collected every 6 seconds
          {'\n'}• Location and device fingerprinting
          {'\n'}• Multi-factor risk assessment
          {'\n'}• Real-time anomaly detection
          {'\n\n'}Suspicious patterns trigger additional verification steps to protect your account.
        </Text>
        
        {behavioralCollector && (
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionInfoTitle}>Current Session:</Text>
            <Text style={styles.sessionInfoText}>
              • Vectors captured: {behavioralCollector.getFinalMetrics().vectorCount}
              {'\n'}• Consistency score: {behavioralCollector.getConsistencyScore()}%
              {'\n'}• Session duration: {Math.round((Date.now() - (behavioralCollector.getFinalMetrics().sessionMetrics?.sessionDuration || 0)) / 1000)}s
            </Text>
          </View>
        )}
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
  securityStatusContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
  },
  lowRisk: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
  },
  mediumRisk: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  highRisk: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  securityStatusTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  securityStatusText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  flagsText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    color: '#666',
  },
});
