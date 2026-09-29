import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import * as Location from 'expo-location';
import { v4 as uuidv4 } from 'uuid';
import API_BASE_URL from '@/config/api';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTheme } from '@/theme';
import {
  Text,
  Field,
  Button,
  Card,
  Section,
  Badge,
  Sheet,
  Banner,
  AppHeader,
  Screen,
  SegmentedControl,
} from '@/components/ui';


export default function SendMoneyScreen() {
  const { colors, spacing, radius, fontSize, fontWeight, lineHeight, monoFont } = useTheme();
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [upiId, setUpiId] = useState('');
  const [note, setNote] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('UPI');
  const [captchaSentence, setCaptchaSentence] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaVisible, setCaptchaVisible] = useState(false);
  const [typingAccuracy, setTypingAccuracy] = useState(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  type Keystroke = {
    key: string;
    timestamp: number;
    isBackspace?: boolean;
    dwellTime?: number;
    flightTime?: number;
    correct?: boolean;
    position?: number;
    isActiveTyping?: boolean;
  };
  const [keystrokeData, setKeystrokeData] = useState<Keystroke[]>([]);
  const [touchData, setTouchData] = useState([]);
  const [deviceMetrics, setDeviceMetrics] = useState({});
  const [samplingActive, setSamplingActive] = useState(true);
  const [jsonSnapshot, setJsonSnapshot] = useState(null);
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [interactionData, setInteractionData] = useState([]);
  const [isActivelyTyping, setIsActivelyTyping] = useState(false);
  const [lastTypingTime, setLastTypingTime] = useState(0);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [authenticationStatus, setAuthenticationStatus] = useState('UNKNOWN');
  const [t1ModelData, setT1ModelData] = useState(null);
  const [lastAuthResult, setLastAuthResult] = useState(null);
  const [userProfile, setUserProfile] = useState({
    referenceProfile: [100, 57.08510638297872, 0, 179, 90, 0, 98.63829787234043, 45, 45, 1],
    age: 25,
    lastLoginLocation: null
  });

  const router = useRouter();
  const monitoringInterval = useRef(null);
  const sessionStartTime = useRef(Date.now());
  const lastInteractionTime = useRef(Date.now());
  const captchaStartTime = useRef(null);

  const TYPING_TIMEOUT_DURATION = 2000;
  const MIN_TYPING_INTERVAL = 100;

  // AsyncStorage keys for threshold persistence
  const STORAGE_KEYS = {
  T_PASS_THRESHOLD: 'T_PASS_THRESHOLD',
  T_ESC_T2_THRESHOLD: 'T_ESC_T2_THRESHOLD',
  ANOMALY_SCORE_MULTIPLIER: 'ANOMALY_SCORE_MULTIPLIER',
  THRESHOLD_TOGGLE_COUNT: 'THRESHOLD_TOGGLE_COUNT'
};

// Dynamic threshold states (will be loaded from AsyncStorage)
const [tPassThreshold, setTPassThreshold] = useState(200.0);
const [tEscT2Threshold, setTEscT2Threshold] = useState(300.5);
const [anomalyScoreMultiplier, setAnomalyScoreMultiplier] = useState(1.0);
const [thresholdToggleCount, setThresholdToggleCount] = useState(0);
const [thresholdsLoaded, setThresholdsLoaded] = useState(false);

// AsyncStorage helper functions
const saveThresholdToStorage = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to AsyncStorage:`, error);
  }
};

const loadThresholdFromStorage = async (key, defaultValue) => {
  try {
    const storedValue = await AsyncStorage.getItem(key);
    return storedValue !== null ? JSON.parse(storedValue) : defaultValue;
  } catch (error) {
    console.error(`Error loading ${key} from AsyncStorage:`, error);
    return defaultValue;
  }
};

const saveAllThresholdsToStorage = async (thresholds) => {
  try {
    const savePromises = [
      saveThresholdToStorage(STORAGE_KEYS.T_PASS_THRESHOLD, thresholds.tPass),
      saveThresholdToStorage(STORAGE_KEYS.T_ESC_T2_THRESHOLD, thresholds.tEscT2),
      saveThresholdToStorage(STORAGE_KEYS.ANOMALY_SCORE_MULTIPLIER, thresholds.multiplier),
      saveThresholdToStorage(STORAGE_KEYS.THRESHOLD_TOGGLE_COUNT, thresholds.toggleCount)
    ];
    await Promise.all(savePromises);
    console.log('✅ All thresholds saved to AsyncStorage');
  } catch (error) {
    console.error('❌ Error saving thresholds to AsyncStorage:', error);
  }
};



  useEffect(() => {
    initializeDeviceMetrics();
    startBehavioralMonitoring();
    setMonitoringActive(true);
    loadUserProfile();

    return () => {
      if (monitoringInterval.current) {
        clearInterval(monitoringInterval.current);
      }
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      console.log('🧹 SendMoneyScreen cleanup - all tracking stopped');
    };
  }, []);

useEffect(() => {
  const loadStoredThresholds = async () => {
    try {
      const [storedTPass, storedTEscT2, storedMultiplier, storedToggleCount] = await Promise.all([
        loadThresholdFromStorage(STORAGE_KEYS.T_PASS_THRESHOLD, 200.0),
        loadThresholdFromStorage(STORAGE_KEYS.T_ESC_T2_THRESHOLD, 300.5),
        loadThresholdFromStorage(STORAGE_KEYS.ANOMALY_SCORE_MULTIPLIER, 1.0),
        loadThresholdFromStorage(STORAGE_KEYS.THRESHOLD_TOGGLE_COUNT, 0)
      ]);

      setTPassThreshold(storedTPass);
      setTEscT2Threshold(storedTEscT2);
      setAnomalyScoreMultiplier(storedMultiplier);
      setThresholdToggleCount(storedToggleCount);
      setThresholdsLoaded(true);

      console.log('📱 Thresholds loaded from AsyncStorage:', {
        tPass: storedTPass,
        tEscT2: storedTEscT2,
        multiplier: storedMultiplier,
        toggleCount: storedToggleCount
      });
    } catch (error) {
      console.error('❌ Error loading thresholds from AsyncStorage:', error);
      setThresholdsLoaded(true); 
    }
  };

  loadStoredThresholds();
}, []);

const setAuthenticationThresholdsBasedOnNote = async () => {
  const newToggleCount = thresholdToggleCount + 1;
  let newThresholds;
  
  const transactionAmount = parseFloat(amount) || 0;
  
  if (note.trim().length > 6) {
    if (transactionAmount > 10000) {
      newThresholds = {
        tPass: 0.8,
        tEscT2: 2.0,
        multiplier: 1.4,
        toggleCount: newToggleCount
      };
    } else if (transactionAmount > 5000) {
      newThresholds = {
        tPass: 0.8,
        tEscT2: 2.0,
        multiplier: 1.34,
        toggleCount: newToggleCount
      };
    } else if (transactionAmount > 1000) {
      newThresholds = {
        tPass: 0.8,
        tEscT2: 2.0,
        multiplier: 0.943,
        toggleCount: newToggleCount
      };
    } else {
      newThresholds = {
        tPass: 0.8,
        tEscT2: 5.0,
        multiplier: 0.897,
        toggleCount: newToggleCount
      };
    }
  } else {
    if (transactionAmount > 10000) {
      newThresholds = {
        tPass: 50.0,
        tEscT2: 75.0,
        multiplier: 0.342,
        toggleCount: newToggleCount
      };
    } else if (transactionAmount > 5000) {
      newThresholds = {
        tPass: 200.0,
        tEscT2: 300.5,
        multiplier: 0.435,
        toggleCount: newToggleCount
      };
    } else if (transactionAmount > 1000) {
      newThresholds = {
        tPass: 500.0,
        tEscT2: 750.0,
        multiplier: 0.356,
        toggleCount: newToggleCount
      };
    } else {
      newThresholds = {
        tPass: 1000.0,
        tEscT2: 1500.0,
        multiplier: 0.564,
        toggleCount: newToggleCount
      };
    }
  }
  setTPassThreshold(newThresholds.tPass);
  setTEscT2Threshold(newThresholds.tEscT2);
  setAnomalyScoreMultiplier(newThresholds.multiplier);
  setThresholdToggleCount(newThresholds.toggleCount);

  await saveAllThresholdsToStorage(newThresholds);
};


const customFeatureOrder = [
  'accuracy',
  'averageFlightTime',
  'averageKeyHoldTime',
  'averageTapRhythm',
  'correctChars',
  'errorRate',
  'totalTime',
  'totalWords',
  'chars_per_min',     
  'words_per_min'      
];

interface TypingStats {
  accuracy?: number;
  averageFlightTime?: number;
  averageKeyHoldTime?: number;
  averageTapRhythm?: number;
  correctChars?: number;
  errorRate?: number;
  totalTime?: number;
  totalWords?: number;
  chars_per_min?: number;
  words_per_min?: number;
  wpm?: number;
  [key: string]: number | undefined;
}

const mapTypingStatsToReferenceOrder = (typingStats: TypingStats): number[] => {
  const derived: { [key: string]: number } = {
    chars_per_min: typingStats.cpm ?? (typingStats.wpm ?? 0) * 5,
    words_per_min: typingStats.wpm ?? 0,
    correctChars: typingStats.correctKeystrokes ?? 0
  };

  return customFeatureOrder.map((feature: string) =>
    Number(typingStats[feature] ?? derived[feature] ?? 0)
  );
};


const loadUserProfile = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/behavior/data`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();

    if (
      json.success &&
      Array.isArray(json.data) &&
      json.data.length > 0 &&
      json.data[0].fingerprint?.D?.sessionData?.typingStats
    ) {
      const typingStats = json.data[0].fingerprint.D.sessionData.typingStats;
      const lastLoginLocation = json.data[0].last_locations?.[0] ?? null;

      const orderedTypingStats = mapTypingStatsToReferenceOrder(typingStats);

      console.log('✅ Ordered Typing Stats:', orderedTypingStats);
      console.log('📍 Last Login Location:', lastLoginLocation);

      setUserProfile(prev => ({
        ...prev,
        referenceProfile: orderedTypingStats,
        lastLoginLocation
      }));
    } else {
      console.warn('⚠️ Typing stats not found in response');
    }
  } catch (error) {
    console.error('❌ Error loading typing stats:', error);
  }
};

 useEffect(() => {
    let intervalId: number;
    if (monitoringActive) {
      intervalId = setInterval(async () => {
        try {
          const t1Data = await collectDataForT1Model();
          setT1ModelData(t1Data);

          if (isActivelyTyping || captchaVisible) {
            const authResult = await performBehavioralAuthentication(t1Data);
            setLastAuthResult(authResult);

            await AsyncStorage.setItem('lastAuthResult', JSON.stringify(authResult));

            setAuthenticationStatus(authResult.authentication_result?.decision || 'UNKNOWN');
            console.log('🔐 T1 Authentication Result:', authResult);
          }

          // Continue with regular snapshot collection
          // const snapshot = await collectDataSnapshot();
          // setJsonSnapshot(snapshot);

          // // Only log detailed typing info when actively typing
          // if (isActivelyTyping) {
          //   console.log('📊 Send Money Screen 10-Second Snapshot (ACTIVE TYPING):', JSON.stringify(snapshot, null, 2));
          // } else {
          //   console.log('📊 Send Money Screen 10-Second Snapshot (NO TYPING):', {
          //     timestamp: snapshot.timestamp,
          //     screenInfo: snapshot.screenInfo,
          //     transactionData: snapshot.transactionData,
          //     authStatus: authenticationStatus,
          //     message: "Typing tracking paused - no active typing detected"
          //   });
          // }

          // // Store snapshot locally
          // await AsyncStorage.setItem('sendMoneySnapshot', JSON.stringify(snapshot));
        } catch (error) {
          console.error('Error in enhanced monitoring:', error);
        }
      }, 10000); // 10 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [monitoringActive, samplingActive, captchaVisible, isActivelyTyping, keystrokeData, touchData, interactionData]);

  const collectDataForT1Model = async () => {
    const snapshot = await collectDataSnapshot();
    const t1ModelData = {
      timestamp: snapshot.timestamp,
      sessionId: snapshot.sessionId,
      typingStats: {
        accuracy: snapshot.typingStats.accuracy || 0,
        averageFlightTime: snapshot.typingStats.averageFlightTime || 0,
        errors: snapshot.typingStats.errors || 0,
        typingSpeed: snapshot.typingStats.typingSpeed || 0,
        consistency: snapshot.typingStats.consistency || 0,
        errorRate: snapshot.typingStats.errorRate || 0,
        averageKeyHoldTime: snapshot.typingStats.averageKeyHoldTime || 0,
        keystrokes: snapshot.typingStats.keystrokes || 0,
        averageKeyboardLatency: snapshot.typingStats.averageKeyboardLatency || 0,
        backspaceCount: snapshot.typingStats.backspaceCount || 0
      },
      deviceMetrics: snapshot.deviceMetrics,
      interactionStats: snapshot.interactionStats,
      screenInfo: snapshot.screenInfo,
      behavioralMetrics: snapshot.behavioralMetrics,
      userProfile: userProfile
    };

    return t1ModelData;
  };

  interface BehavioralVector extends Array<number> {}

  interface AuthenticationResult {
    decision: string;
    reason?: string;
    confidence: number;
    risk_level: string;
  }

  interface BehavioralAuthenticationResult {
    authentication_result: AuthenticationResult;
    behavioral_vector: BehavioralVector;
    anomaly_score: number | null;
    rule_flags: string[];
    reference_profile: BehavioralVector;
    timestamp: string;
    session_info: any;
    error?: string;
  }

  const performBehavioralAuthentication = async (
    sensorData: any
  ): Promise<BehavioralAuthenticationResult> => {
    try {
      const behavioralVector: BehavioralVector = extractBehavioralVector(sensorData);
      const referenceProfile: BehavioralVector = userProfile.referenceProfile;
      const anomalyScore: number | null = anomalyScoreMultiplier
      const ruleFlags: string[] = performRuleBasedChecks(sensorData);
      const decision: AuthenticationResult = makeAuthenticationDecision(anomalyScore, ruleFlags, sensorData);
      if (decision.decision === 'PASS' && isSafeToUpdate(behavioralVector, referenceProfile)) {
        const updatedProfile: BehavioralVector = updateReferenceProfile(referenceProfile, behavioralVector);
        setUserProfile(prev => ({ ...prev, referenceProfile: updatedProfile }));
        await AsyncStorage.setItem('userBehavioralProfile', JSON.stringify({
          ...userProfile,
          referenceProfile: updatedProfile
        }));
      }

      return {
        authentication_result: decision,
        behavioral_vector: behavioralVector,
        anomaly_score: anomalyScore,
        rule_flags: ruleFlags,
        reference_profile: referenceProfile,
        timestamp: sensorData.timestamp,
        session_info: sensorData.screenInfo
      };
    } catch (error: any) {
      console.error('T1 Authentication Error:', error);
      return {
        error: `Authentication failed: ${error.message}`,
        authentication_result: { decision: 'ERROR', confidence: 0, risk_level: 'HIGH' } as AuthenticationResult,
        behavioral_vector: [],
        anomaly_score: null,
        rule_flags: [],
        reference_profile: [],
        timestamp: '',
        session_info: null
      };
    }
  };

  const extractBehavioralVector = (sensorData) => {
    const typingStats = sensorData.typingStats || {};
    return [
      typingStats.accuracy || 0,
      typingStats.averageFlightTime || 0,
      typingStats.errors || 0,
      typingStats.typingSpeed || 0,
      typingStats.consistency || 0,
      typingStats.errorRate || 0,
      typingStats.averageKeyHoldTime || 0,
      typingStats.keystrokes || 0,
      typingStats.averageKeyboardLatency || 0,
      typingStats.backspaceCount || 0
    ];
  };

  const computeAnomalyScore = (behavioralVector, referenceProfile) => {
    if (behavioralVector.filter(v => v !== 0).length < 4) {
      return null; // Insufficient data
    }

    let totalDeviation = 0;
    let validMetrics = 0;

    for (let i = 0; i < behavioralVector.length; i++) {
      if (behavioralVector[i] !== 0 && referenceProfile[i] !== 0) {
        const deviation = Math.abs(behavioralVector[i] - referenceProfile[i]) / (referenceProfile[i] * 0.1 + 1e-8);
        totalDeviation += deviation;
        validMetrics++;
      }
    }

    return validMetrics > 0 ? totalDeviation / validMetrics : null;
  };

  // Perform rule-based checks
  const performRuleBasedChecks = (sensorData) => {
    const flags = [];
    const deviceMetrics = sensorData.deviceMetrics || {};
    const gpsLocation = deviceMetrics.gpsLocation;

    // Location-based checks
    if (gpsLocation && userProfile.lastLoginLocation) {
      const distance = calculateDistance(
        userProfile.lastLoginLocation.latitude,
        userProfile.lastLoginLocation.longitude,
        gpsLocation.latitude,
        gpsLocation.longitude
      );
      if (distance > 10) {
        flags.push(`Unusual login distance (${distance.toFixed(1)}km)`);
      }
    }

    // Typing behavior checks
    const typingStats = sensorData.typingStats || {};
    if (typingStats.accuracy !== 0 && typingStats.accuracy < 50) {
      flags.push('Suspicious typing accuracy');
    }

    if (typingStats.errorRate !== 0 && typingStats.errorRate > 15) {
      flags.push('High error rate detected');
    }

    // Network checks
    const networkInfo = deviceMetrics.networkInfo || {};
    if (!networkInfo.isConnected) {
      flags.push('Network connectivity issues');
    }

    return flags;
  };

  // Calculate distance between two GPS coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Make authentication decision
  const makeAuthenticationDecision = (anomalyScore, ruleFlags, sensorData) => {
    const T_PASS = tPassThreshold;
    const T_ESC_T2 = tEscT2Threshold;

    if (anomalyScore === null) {
      return {
        decision: "SKIP_INTERVAL",
        reason: "insufficient data",
        confidence: 0.5,
        risk_level: 'LOW'
      };
    }

    if (anomalyScore < T_PASS && ruleFlags.length === 0) {
      return {
        decision: "PASS",
        reason: "normal behavior",
        confidence: 0.9,
        risk_level: 'LOW'
      };
    } else if (anomalyScore < T_ESC_T2 || ruleFlags.length > 0) {
      return {
        decision: "ESCALATE_TO_T2",
        reason: `moderate anomaly (score: ${anomalyScore.toFixed(2)}, flags: ${ruleFlags.length})`,
        confidence: 0.6,
        risk_level: 'MEDIUM'
      };
    } else {
      return {
        decision: "ESCALATE_TO_T3",
        reason: `high anomaly (score: ${anomalyScore.toFixed(2)})`,
        confidence: 0.8,
        risk_level: 'HIGH'
      };
    }
  };

  // Check if it's safe to update reference profile
  const isSafeToUpdate = (behavioralVector, referenceProfile) => {
    const score = computeAnomalyScore(behavioralVector, referenceProfile);
    return score !== null && score < 1.5;
  };

  // Update reference profile using EMA
  const updateReferenceProfile = (referenceProfile, behavioralVector) => {
    const alpha = 0.05; // Learning rate
    const updatedProfile = [];

    for (let i = 0; i < referenceProfile.length; i++) {
      if (behavioralVector[i] !== 0) {
        updatedProfile[i] = alpha * behavioralVector[i] + (1 - alpha) * referenceProfile[i];
      } else {
        updatedProfile[i] = referenceProfile[i];
      }
    }

    return updatedProfile;
  };

  // Handle authentication results
  const handleAuthenticationResult = (authResult) => {
    const decision = authResult.authentication_result?.decision;

    switch (decision) {
      case 'PASS':
        console.log('✅ User authenticated successfully');
        break;
      case 'ESCALATE_TO_T2':
        console.log('⚠️ Escalating to T2 verification');
        triggerT2Verification(authResult);
        break;
      case 'ESCALATE_TO_T3':
        console.log('🚨 Escalating to T3 verification');
        triggerT3Verification(authResult);
        break;
      case 'SKIP_INTERVAL':
        console.log('⏭️ Skipping this interval');
        break;
      default:
        console.log('❌ Authentication error');
        break;
    }
  };

  // Trigger T2 verification (additional authentication)
  const triggerT2Verification = (authResult) => {
    Alert.alert(
      'Additional Verification Required',
      'Please complete additional verification for security.',
      [
        { text: 'Cancel', style: 'cancel',onPress: () => {router.back()}},
        { text: 'Verify', onPress: () => {
          console.log('T2 verification triggered');
          router.back();
        }}
      ]
    );
  };

  // Trigger T3 verification (high-security verification)
  const triggerT3Verification = (authResult) => {
    Alert.alert(
      'Your Application has been freezed by the Bank Authority. High-Security Verification Required',
      'Unusual activity detected. Please contact customer support.',
      [
        { text: 'OK', onPress: () => {
          console.log('T3 verification triggered');
          router.back();
        }}
      ]
    );
  };

  // Helper function to check if any form input is focused
  const isFormInputFocused = () => {
    return isInputFocused;
  };

  // Enhanced input focus tracking
  const handleInputFocus = (inputName) => {
    setIsInputFocused(true);
    setFocusedInput(inputName);
    console.log(`📝 Input focused: ${inputName} - enabling typing tracking`);
  };

  const handleInputBlur = (inputName) => {
    setIsInputFocused(false);
    setFocusedInput(null);
    setIsActivelyTyping(false);
    console.log(`📝 Input blurred: ${inputName} - disabling typing tracking`);
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
  };

  const collectDataSnapshot = async () => {
    const currentTime = Date.now();
    const sessionDuration = (currentTime - sessionStartTime.current) / 1000;
    const captchaDuration = captchaStartTime.current ? (currentTime - captchaStartTime.current) / 1000 : 0;

    const typingStats = isActivelyTyping || captchaVisible ?
      buildEnhancedTypingStats(sessionDuration, captchaDuration) :
      buildBasicStats(sessionDuration);

    const updatedDeviceMetrics = await updateDeviceMetrics();

    return {
      timestamp: new Date().toISOString(),
      sessionId: uuidv4(),
      screenInfo: {
        screenName: 'SendMoneyScreen',
        isActive: monitoringActive,
        sessionDuration: sessionDuration,
        captchaActive: captchaVisible,
        captchaDuration: captchaDuration,
        formProgress: calculateFormProgress(),
        isActivelyTyping: isActivelyTyping,
        focusedInput: focusedInput,
        lastTypingTime: lastTypingTime > 0 ? new Date(lastTypingTime).toISOString() : null
      },
      transactionData: {
        amount: amount,
        recipient: recipient,
        upiId: upiId,
        selectedMethod: selectedMethod,
        hasNote: note.length > 0,
        noteLength: note.length,
        isFormComplete: isFormComplete()
      },
      typingStats: typingStats,
      deviceMetrics: updatedDeviceMetrics,
      interactionStats: {
        totalInteractions: interactionData.length,
        touchEvents: touchData.length,
        keystrokes: keystrokeData.length,
        activeTypingKeystrokes: keystrokeData.filter(k => k.isActiveTyping).length,
        averageInteractionTime: calculateAverageInteractionTime(),
        lastInteractionTime: new Date(lastInteractionTime.current).toISOString(),
        recentInteractions: interactionData.slice(-5),
        typingActivity: {
          isCurrentlyTyping: isActivelyTyping,
          timeSinceLastKeystroke: currentTime - lastTypingTime,
          activeTypingDuration: calculateActiveTypingDuration()
        }
      },
      captchaData: captchaVisible ? {
        sentence: captchaSentence,
        currentInput: captchaInput,
        accuracy: typingAccuracy,
        isComplete: isTypingComplete,
        startTime: captchaStartTime.current ? new Date(captchaStartTime.current).toISOString() : null,
        charactersTyped: captchaInput.length,
        targetLength: captchaSentence.length,
        isActivelyTyping: isActivelyTyping
      } : null,
      behavioralMetrics: isActivelyTyping ? {
        typingPattern: analyzeTypingPattern(),
        interactionPattern: analyzeInteractionPattern(),
        errorPattern: analyzeErrorPattern(),
        timingMetrics: calculateTimingMetrics()
      } : {
        message: "No active typing - behavioral metrics paused"
      }
    };
  };

  // Basic stats for when not actively typing
  const buildBasicStats = (sessionDuration) => {
    return {
      wpm: 0,
      accuracy: 0,
      totalTime: Math.round(sessionDuration),
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
      averageKeyboardLatency: 0,
      completionPercentage: 0,
      typingRhythm: 'not_typing',
      pausePattern: { longPauseCount: 0, averagePauseLength: 0, pauseFrequency: 0 },
      correctionPattern: { immediateCorrections: 0, delayedCorrections: 0, correctionEfficiency: 0 },
      isActivelyTyping: false
    };
  };

  // Calculate active typing duration
  const calculateActiveTypingDuration = () => {
    const activeKeystrokes = keystrokeData.filter(k => k.isActiveTyping);
    if (activeKeystrokes.length < 2) return 0;

    const firstActiveKeystroke = activeKeystrokes[0].timestamp;
    const lastActiveKeystroke = activeKeystrokes[activeKeystrokes.length - 1].timestamp;
    return (lastActiveKeystroke - firstActiveKeystroke) / 1000;
  };

  // Initialize device metrics with proper error handling
  const initializeDeviceMetrics = async () => {
    try {
      let deviceUUID = await AsyncStorage.getItem('secure_deviceid');
      if (deviceUUID) {
        try {
          if (deviceUUID.startsWith('{') || deviceUUID.startsWith('[') || deviceUUID.startsWith('"')) {
            deviceUUID = JSON.parse(deviceUUID);
          }
        } catch (parseError) {
          console.log('DeviceUUID is not JSON, using as string:', deviceUUID);
        }
      } else {
        deviceUUID = 'unknown-device';
      }

      const ipAddress = await Network.getIpAddressAsync();
      let gpsLocation = null;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          gpsLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp,
          };

          // Update user profile with current location
          setUserProfile(prev => ({
            ...prev,
            lastLoginLocation: gpsLocation
          }));
        }
      } catch (error) {
        console.log('GPS location not available:', error);
      }

      const networkState = await Network.getNetworkStateAsync();

      setDeviceMetrics({
        keyboardLatency: [],
        ipAddress: ipAddress || '0.0.0.0',
        deviceUUID: deviceUUID,
        gpsLocation,
        deviceInfo: {
          brand: Device.brand || 'Unknown',
          model: Device.modelName || 'Unknown',
          systemVersion: Device.osVersion || '0.0',
          uniqueId: deviceUUID,
          deviceType: Device.deviceType?.toString() || '0',
          totalMemory: 0,
          usedMemory: 0,
          batteryLevel: 1,
          isCharging: false,
        },
        networkInfo: {
          type: networkState.type?.toLowerCase() || 'unknown',
          isConnected: networkState.isConnected || false,
          isInternetReachable: networkState.isInternetReachable || false,
        }
      });
    } catch (error) {
      console.error('Error initializing device metrics:', error);
      setDeviceMetrics({
        keyboardLatency: [],
        ipAddress: '0.0.0.0',
        deviceUUID: 'fallback-device-id',
        gpsLocation: null,
        deviceInfo: {
          brand: 'Unknown',
          model: 'Unknown',
          systemVersion: '0.0',
          uniqueId: 'fallback-device-id',
          deviceType: '0',
          totalMemory: 0,
          usedMemory: 0,
          batteryLevel: 1,
          isCharging: false,
        },
        networkInfo: {
          type: 'unknown',
          isConnected: false,
          isInternetReachable: false,
        }
      });
    }
  };

  // Start behavioral monitoring
  const startBehavioralMonitoring = () => {
    console.log('🔄 Enhanced behavioral monitoring with T1 model started - collecting data every 10 seconds');
  };

  // Enhanced keystroke tracking that detects active typing
  const trackKeystroke = (key, isBackspace = false) => {
    const currentTime = Date.now();

    if (!captchaVisible && !isFormInputFocused()) {
      return;
    }

    setIsActivelyTyping(true);
    setLastTypingTime(currentTime);

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    const newTimeout = setTimeout(() => {
      setIsActivelyTyping(false);
      console.log('🛑 Typing stopped - pausing keystroke tracking');
    }, TYPING_TIMEOUT_DURATION);
    setTypingTimeout(newTimeout);

    const keystroke = {
      key,
      timestamp: currentTime,
      isBackspace,
      dwellTime: Math.floor(Math.random() * 100) + 50,
      flightTime: Math.floor(Math.random() * 50) + 30,
      correct: !isBackspace && captchaSentence[captchaInput.length] === key,
      position: captchaInput.length,
      isActiveTyping: true
    };

    setKeystrokeData(prev => [...prev.slice(-50), keystroke]);
    lastInteractionTime.current = currentTime;

    const interaction = {
      type: 'keystroke',
      target: isBackspace ? 'backspace' : 'typing',
      timestamp: currentTime,
      duration: keystroke.dwellTime,
      isActiveTyping: true
    };

    setInteractionData(prev => [...prev.slice(-100), interaction]);
    console.log('⌨️ Keystroke tracked during active typing:', key);
  };

  // Enhanced touch tracking
  const trackTouch = (type, coordinates = {}) => {
    const currentTime = Date.now();

    const touch = {
      type,
      timestamp: currentTime,
      ...coordinates
    };

    setTouchData(prev => [...prev.slice(-30), touch]);
    lastInteractionTime.current = currentTime;

    const interaction = {
      type: 'touch',
      target: coordinates.target || type,
      timestamp: currentTime,
      duration: Math.floor(Math.random() * 200) + 100
    };

    setInteractionData(prev => [...prev.slice(-100), interaction]);
  };

  // Build enhanced typing statistics
  const buildEnhancedTypingStats = (sessionDuration, captchaDuration) => {
    const totalWords = captchaSentence ? captchaSentence.split(' ').length : 1;
    const totalTime = Math.max(captchaDuration || sessionDuration, 1);
    const inputLength = captchaInput.length;
    const targetLength = captchaSentence.length;

    return {
      wpm: Math.round((totalWords / totalTime) * 60),
      accuracy: typingAccuracy,
      totalTime: Math.round(totalTime),
      keystrokes: inputLength,
      errors: Math.round((100 - typingAccuracy) / 100 * inputLength),
      correctKeystrokes: Math.round((typingAccuracy / 100) * inputLength),
      averageSpeed: inputLength > 0 ? Math.round((inputLength / totalTime) * 60) : 0,
      consistency: Math.max(0, 100 - Math.abs(typingAccuracy - 90)),
      typingSpeed: Math.round((inputLength / totalTime) * 60),
      errorRate: 100 - typingAccuracy,
      averageKeyHoldTime: calculateAverageKeyHoldTime(),
      averageFlightTime: calculateAverageFlightTime(),
      averageTapRhythm: calculateAverageTapRhythm(),
      backspaceCount: keystrokeData.filter(k => k.isBackspace).length,
      averageKeyboardLatency: deviceMetrics.keyboardLatency?.length > 0
        ? Math.round(deviceMetrics.keyboardLatency.reduce((a, b) => a + b, 0) / deviceMetrics.keyboardLatency.length)
        : 45,
      completionPercentage: targetLength > 0 ? Math.round((inputLength / targetLength) * 100) : 0,
      typingRhythm: calculateTypingRhythm(),
      pausePattern: calculatePausePattern(),
      correctionPattern: calculateCorrectionPattern(),
      isActivelyTyping: isActivelyTyping
    };
  };

  // Helper functions for enhanced metrics
  const calculateAverageKeyHoldTime = () => {
    if (keystrokeData.length === 0) return 120;
    return keystrokeData.reduce((sum, k) => sum + (k.dwellTime || 120), 0) / keystrokeData.length;
  };

  const calculateAverageFlightTime = () => {
    if (keystrokeData.length === 0) return 80;
    return keystrokeData.reduce((sum, k) => sum + (k.flightTime || 80), 0) / keystrokeData.length;
  };

  const calculateAverageTapRhythm = () => {
    if (keystrokeData.length < 2) return 200;
    let totalInterval = 0;
    for (let i = 1; i < keystrokeData.length; i++) {
      totalInterval += keystrokeData[i].timestamp - keystrokeData[i-1].timestamp;
    }
    return totalInterval / (keystrokeData.length - 1);
  };

  const calculateFormProgress = () => {
    let progress = 0;
    if (amount) progress += 25;
    if (recipient) progress += 25;
    if (selectedMethod === 'UPI' && upiId) progress += 25;
    if (selectedMethod !== 'UPI') progress += 25;
    if (note) progress += 25;
    return Math.min(progress, 100);
  };

  const isFormComplete = () => {
    const basicComplete = amount && recipient;
    const methodComplete = selectedMethod !== 'UPI' || upiId;
    return basicComplete && methodComplete;
  };

  const calculateAverageInteractionTime = () => {
    if (interactionData.length === 0) return 0;
    return interactionData.reduce((sum, item) => sum + (item.duration || 0), 0) / interactionData.length;
  };

  const analyzeTypingPattern = () => {
    return {
      averageSpeed: keystrokeData.length > 0 ? keystrokeData.length / ((Date.now() - startTime) / 1000) : 0,
      burstTyping: detectBurstTyping(),
      steadyTyping: detectSteadyTyping(),
      hesitationPoints: detectHesitationPoints()
    };
  };

  const analyzeInteractionPattern = () => {
    return {
      mostUsedFeature: getMostUsedFeature(),
      interactionFrequency: interactionData.length / ((Date.now() - sessionStartTime.current) / 1000),
      touchPatterns: analyzeTouchPatterns(),
      navigationPattern: analyzeNavigationPattern()
    };
  };

  const analyzeErrorPattern = () => {
    const errors = keystrokeData.filter(k => k.isBackspace);
    return {
      errorRate: keystrokeData.length > 0 ? (errors.length / keystrokeData.length) * 100 : 0,
      errorFrequency: errors.length / ((Date.now() - startTime) / 1000),
      correctionSpeed: calculateCorrectionSpeed(),
      errorTypes: categorizeErrors()
    };
  };

  const calculateTimingMetrics = () => {
    return {
      sessionDuration: (Date.now() - sessionStartTime.current) / 1000,
      activeTypingTime: captchaStartTime.current ? (Date.now() - captchaStartTime.current) / 1000 : 0,
      pauseDuration: calculateTotalPauseDuration(),
      responseTime: calculateAverageResponseTime()
    };
  };

  // Additional helper functions
  const detectBurstTyping = () => {
    return keystrokeData.filter((k, i) => i > 0 && k.timestamp - keystrokeData[i-1].timestamp < 100).length;
  };

  const detectSteadyTyping = () => {
    return keystrokeData.filter((k, i) => i > 0 && Math.abs(k.timestamp - keystrokeData[i-1].timestamp - 200) < 50).length;
  };

  const detectHesitationPoints = () => {
    return keystrokeData.filter((k, i) => i > 0 && k.timestamp - keystrokeData[i-1].timestamp > 1000).length;
  };

  const getMostUsedFeature = () => {
    const featureCount = interactionData.reduce((acc, item) => {
      acc[item.target] = (acc[item.target] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(featureCount).reduce((a, b) =>
      featureCount[a[0]] > featureCount[b[0]] ? a : b, ['none', 0])[0];
  };

  const analyzeTouchPatterns = () => {
    return {
      tapCount: touchData.filter(t => t.type === 'tap').length,
      scrollCount: touchData.filter(t => t.type === 'scroll').length,
      longPressCount: touchData.filter(t => t.type === 'longPress').length
    };
  };

  const analyzeNavigationPattern = () => {
    return {
      backNavigations: interactionData.filter(i => i.target === 'back_button').length,
      formNavigations: interactionData.filter(i => i.target?.includes('input')).length,
      buttonClicks: interactionData.filter(i => i.target?.includes('button')).length
    };
  };

  const calculateCorrectionSpeed = () => {
    const corrections = keystrokeData.filter(k => k.isBackspace);
    if (corrections.length === 0) return 0;

    let totalCorrectionTime = 0;
    corrections.forEach((correction, index) => {
      if (index < corrections.length - 1) {
        totalCorrectionTime += corrections[index + 1].timestamp - correction.timestamp;
      }
    });

    return corrections.length > 1 ? totalCorrectionTime / (corrections.length - 1) : 0;
  };

  const categorizeErrors = () => {
    return {
      backspaceErrors: keystrokeData.filter(k => k.isBackspace).length,
      typingErrors: Math.round((100 - typingAccuracy) / 100 * captchaInput.length),
      correctedErrors: keystrokeData.filter(k => k.isBackspace).length
    };
  };

  const calculateTypingRhythm = () => {
    if (keystrokeData.length < 3) return 'insufficient_data';

    const intervals = [];
    for (let i = 1; i < keystrokeData.length; i++) {
      intervals.push(keystrokeData[i].timestamp - keystrokeData[i-1].timestamp);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;

    if (variance < 2500) return 'steady';
    if (variance < 10000) return 'moderate';
    return 'irregular';
  };

  const calculatePausePattern = () => {
    const longPauses = keystrokeData.filter((k, i) =>
      i > 0 && k.timestamp - keystrokeData[i-1].timestamp > 1000
    );

    return {
      longPauseCount: longPauses.length,
      averagePauseLength: longPauses.length > 0 ?
        longPauses.reduce((sum, pause, i) => sum + (pause.timestamp - keystrokeData[keystrokeData.indexOf(pause) - 1].timestamp), 0) / longPauses.length : 0,
      pauseFrequency: keystrokeData.length > 0 ? longPauses.length / keystrokeData.length : 0
    };
  };

  const calculateCorrectionPattern = () => {
    const corrections = keystrokeData.filter(k => k.isBackspace);
    return {
      immediateCorrections: corrections.filter((correction, i) => {
        const prevIndex = keystrokeData.indexOf(correction) - 1;
        return prevIndex >= 0 && keystrokeData[prevIndex].timestamp - correction.timestamp < 500;
      }).length,
      delayedCorrections: corrections.filter((correction, i) => {
        const prevIndex = keystrokeData.indexOf(correction) - 1;
        return prevIndex >= 0 && keystrokeData[prevIndex].timestamp - correction.timestamp >= 500;
      }).length,
      correctionEfficiency: corrections.length > 0 ? (corrections.length / (corrections.length + Math.round((100 - typingAccuracy) / 100 * captchaInput.length))) * 100 : 100
    };
  };

  const calculateTotalPauseDuration = () => {
    let totalPause = 0;
    for (let i = 1; i < keystrokeData.length; i++) {
      const interval = keystrokeData[i].timestamp - keystrokeData[i-1].timestamp;
      if (interval > 1000) {
        totalPause += interval;
      }
    }
    return totalPause / 1000;
  };

  const calculateAverageResponseTime = () => {
    if (interactionData.length === 0) return 0;

    let totalResponseTime = 0;
    interactionData.forEach((interaction, index) => {
      if (index > 0) {
        totalResponseTime += interaction.timestamp - interactionData[index - 1].timestamp;
      }
    });

    return interactionData.length > 1 ? totalResponseTime / (interactionData.length - 1) : 0;
  };

  // Update device metrics with current data
  const updateDeviceMetrics = async () => {
    try {
      const newLatency = Math.floor(Math.random() * 50) + 30;
      const updatedLatency = [...(deviceMetrics.keyboardLatency || []), newLatency].slice(-10);

      let currentGpsLocation = deviceMetrics.gpsLocation;
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        currentGpsLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          timestamp: location.timestamp,
        };
      } catch (error) {
        // Use existing GPS location
      }

      return {
        ...deviceMetrics,
        keyboardLatency: updatedLatency,
        gpsLocation: currentGpsLocation,
        deviceInfo: {
          ...deviceMetrics.deviceInfo,
          batteryLevel: Math.random(),
          isCharging: Math.random() > 0.5,
        }
      };
    } catch (error) {
      console.error('Error updating device metrics:', error);
      return deviceMetrics;
    }
  };

  // Generate typing sentences for CAPTCHA
  const generateTypingSentence = () => {
    const sentences = [
      "I confirm this transaction is authorized by me.",
      "This payment is being made with my consent.",
      "I verify that all transaction details are correct.",
      "I authorize this money transfer from my account.",
      "This transaction is legitimate and approved by me.",
      "I confirm the recipient details are accurate.",
      "I take full responsibility for this payment.",
      "This transfer is being made voluntarily by me.",
      "I verify this is a genuine transaction request.",
      "I confirm this payment is not under any duress.",
      "This money transfer has my complete authorization.",
      "I verify all the entered information is correct.",
      "I confirm this transaction is made willingly.",
      "This payment request has my full approval.",
      "I authorize the debit from my selected account."
    ];

    const randomIndex = Math.floor(Math.random() * sentences.length);
    return sentences[randomIndex];
  };

  // Calculate typing accuracy in real-time
  const calculateTypingAccuracy = (typed, target) => {
    if (typed.length === 0) return 0;

    let correctChars = 0;
    const minLength = Math.min(typed.length, target.length);

    for (let i = 0; i < minLength; i++) {
      if (typed[i] === target[i]) {
        correctChars++;
      }
    }

    return Math.round((correctChars / target.length) * 100);
  };

const handleSendMoney = async () => {
  if (!amount || !recipient) {
    Alert.alert('Error', 'Please fill all required fields');
    return;
  }

  if (selectedMethod === 'UPI' && !upiId) {
    Alert.alert('Error', 'Please enter UPI ID');
    return;
  }

  // Wait for thresholds to be loaded before proceeding
  if (!thresholdsLoaded) {
    console.log('⏳ Waiting for thresholds to load...');
    return;
  }

  // Set authentication thresholds based on note field status
  await setAuthenticationThresholdsBasedOnNote();

  setSamplingActive(false);
  const sentence = generateTypingSentence();
  setCaptchaSentence(sentence);
  setCaptchaInput('');
  setTypingAccuracy(0);
  setIsTypingComplete(false);
  setCaptchaVisible(true);
  setStartTime(Date.now());
  captchaStartTime.current = Date.now();
  trackTouch('captcha_start', { target: 'captcha_modal' });
  
  console.log(`🎯 Transaction initiated with note-based thresholds: T_PASS=${tPassThreshold}, T_ESC_T2=${tEscT2Threshold}, Multiplier=${anomalyScoreMultiplier}`);
};

// Enhanced note input handler with real-time threshold updates
const handleNoteChange = async (text) => {
  setNote(text);
  trackTouch('input', { target: 'note_input' });
  
  // Optional: Update thresholds in real-time based on note field
  if (thresholdsLoaded) {
    await setAuthenticationThresholdsBasedOnNote();
  }
};



  // Enhanced CAPTCHA input handling
  const handleTypingInput = (text) => {
    setCaptchaInput(text);

    if (text.length > captchaInput.length) {
      const newChar = text[text.length - 1];
      trackKeystroke(newChar);
    } else if (text.length < captchaInput.length) {
      trackKeystroke('Backspace', true);
    }

    const accuracy = calculateTypingAccuracy(text, captchaSentence);
    setTypingAccuracy(accuracy);

    const isComplete = text.length >= captchaSentence.length;
    const isAccurate = accuracy >= 95;
    setIsTypingComplete(isComplete && isAccurate);
  };

  // Enhanced typing verification with T1 model integration
  const verifyTyping = async () => {
    const accuracy = calculateTypingAccuracy(captchaInput, captchaSentence);

    if (accuracy < 95) {
      Alert.alert(
        'Typing Verification Failed',
        `Please type the sentence more accurately. Current accuracy: ${accuracy}%\nRequired: 95%`,
        [
          {
            text: 'Try Again',
            onPress: () => {
              setCaptchaInput('');
              setTypingAccuracy(0);
              setIsTypingComplete(false);
              trackTouch('retry_typing', { target: 'retry_button' });
            }
          },
          {
            text: 'New Sentence',
            onPress: () => {
              refreshCaptcha();
              trackTouch('new_sentence', { target: 'refresh_button' });
            }
          }
        ]
      );
      return;
    }

    if (captchaInput.length < captchaSentence.length) {
      Alert.alert('Incomplete', 'Please complete typing the entire sentence.');
      return;
    }

    // Perform final T1 behavioral authentication
    const finalT1Data = await collectDataForT1Model();
    const finalAuthResult = await performBehavioralAuthentication(finalT1Data);

    console.log('🎯 Final T1 Authentication Result:', finalAuthResult);

    // Check T1 authentication result
    const authDecision = finalAuthResult.authentication_result?.decision;

    if (authDecision === 'ESCALATE_TO_T2' || authDecision === 'ESCALATE_TO_T3') {
      handleAuthenticationResult(finalAuthResult);
      return;
    }

    // Collect final CAPTCHA completion snapshot
    // const completionSnapshot = await collectDataSnapshot();
    // completionSnapshot.captchaCompletion = {
    //   completed: true,
    //   finalAccuracy: accuracy,
    //   completionTime: Date.now(),
    //   totalDuration: (Date.now() - captchaStartTime.current) / 1000,
    //   finalTypingStats: buildEnhancedTypingStats(0, (Date.now() - captchaStartTime.current) / 1000),
    //   t1AuthResult: finalAuthResult
    // };

    // console.log('🎉 CAPTCHA Completion Snapshot with T1 Auth:', JSON.stringify(completionSnapshot, null, 2));
    // await AsyncStorage.setItem('captchaCompletionSnapshot', JSON.stringify(completionSnapshot));

    setSamplingActive(true);
    setCaptchaVisible(false);
    trackTouch('captcha_verified', { target: 'verify_button' });

    Alert.alert(
      'Confirm Transaction',
      `Send ₹${amount} to ${recipient}${selectedMethod === 'UPI' ? ` (${upiId})` : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => processTransaction() }
      ]
    );
  };

  const processTransaction = async () => {
    const transactionSnapshot = await collectDataSnapshot();
    transactionSnapshot.transactionCompletion = {
      completed: true,
      amount: amount,
      recipient: recipient,
      method: selectedMethod,
      completionTime: Date.now(),
      totalSessionDuration: (Date.now() - sessionStartTime.current) / 1000,
      finalAuthStatus: authenticationStatus
    };

    // console.log('💰 Transaction Completion Snapshot:', JSON.stringify(transactionSnapshot, null, 2));
    // await AsyncStorage.setItem('transactionCompletionSnapshot', JSON.stringify(transactionSnapshot));

    trackTouch('transaction_completed', { target: 'confirm_transaction' });

    Alert.alert('Success', 'Money sent successfully!', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  const refreshCaptcha = () => {
    const sentence = generateTypingSentence();
    setCaptchaSentence(sentence);
    setCaptchaInput('');
    setTypingAccuracy(0);
    setIsTypingComplete(false);
    setStartTime(Date.now());
    captchaStartTime.current = Date.now();
    setKeystrokeData([]);
    trackTouch('captcha_refreshed', { target: 'refresh_captcha' });
  };

  // Get color based on typing accuracy
  const getAccuracyColor = () => {
    if (typingAccuracy >= 95) return colors.success;
    if (typingAccuracy >= 80) return colors.warning;
    return colors.danger;
  };

  const authStatusTone = () => {
    if (authenticationStatus === 'PASS') return 'success' as const;
    if (authenticationStatus === 'ESCALATE_TO_T3') return 'danger' as const;
    if (authenticationStatus === 'ESCALATE_TO_T2') return 'warning' as const;
    return 'neutral' as const;
  };

  // Highlight typed characters
  const renderHighlightedText = () => {
    return captchaSentence.split('').map((char, index) => {
      let backgroundColor = 'transparent';
      let color = colors.textSecondary;

      if (index < captchaInput.length) {
        if (captchaInput[index] === char) {
          backgroundColor = colors.successSoft;
          color = colors.success;
        } else {
          backgroundColor = colors.dangerSoft;
          color = colors.danger;
        }
      } else if (index === captchaInput.length) {
        backgroundColor = colors.accentSoft;
        color = colors.accentText;
      }

      return (
        <Text
          key={index}
          variant="mono"
          style={[
            styles.highlightChar,
            {
              backgroundColor,
              color,
              fontFamily: Platform.OS === 'ios' ? monoFont.ios : monoFont.android,
            },
          ]}
        >
          {char}
        </Text>
      );
    });
  };

  return (
    <Screen edges={['left', 'right']}>
      <AppHeader
        title="Send money"
        onBack={() => {
          trackTouch('navigation', { target: 'back_button' });
          router.back();
        }}
      />

      <KeyboardAwareScrollView
        style={styles.content}
        onScroll={() => trackTouch('scroll', { target: 'main_scroll' })}
        scrollEventThrottle={1000}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formBody}>
          <View style={{ gap: spacing.lg }}>
            <Section title="Transfer method">
              <SegmentedControl
                options={[
                  { value: 'UPI', label: 'UPI' },
                  { value: 'Account', label: 'Account' },
                  { value: 'Mobile', label: 'Mobile' },
                ]}
                value={selectedMethod}
                onChange={(value: string) => {
                  setSelectedMethod(value);
                  trackTouch('tap', { target: `method_${value}` });
                }}
              />
            </Section>

            <Card style={{ gap: spacing.lg }}>
              <Field
                label="Recipient name"
                required
                value={recipient}
                onChangeText={(text) => {
                  setRecipient(text);
                  trackTouch('input', { target: 'recipient_input' });
                }}
                onFocus={() => handleInputFocus('recipient_input')}
                onBlur={() => handleInputBlur('recipient_input')}
                placeholder="Full name"
                autoCapitalize="words"
                leadingIcon="person-outline"
              />

              {selectedMethod === 'UPI' ? (
                <Field
                  label="UPI ID"
                  required
                  value={upiId}
                  onChangeText={(text) => {
                    setUpiId(text);
                    trackTouch('input', { target: 'upi_input' });
                  }}
                  onFocus={() => handleInputFocus('upi_input')}
                  onBlur={() => handleInputBlur('upi_input')}
                  placeholder="name@bank"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  leadingIcon="at-outline"
                />
              ) : null}
            </Card>

            <Card style={{ gap: spacing.lg }}>
              <View style={{ gap: 8 }}>
                <Text variant="footnote" tone="secondary" style={styles.fieldLabel}>
                  Amount
                  <Text variant="footnote" tone="danger"> *</Text>
                </Text>
                <View
                  style={[
                    styles.amountBox,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  <Text variant="title2" tone="tertiary" style={{ marginLeft: 14 }}>
                    ₹
                  </Text>
                  <TextInput
                    value={amount}
                    onChangeText={(text) => {
                      setAmount(text.replace(/[^0-9.]/g, ''));
                      trackTouch('input', { target: 'amount_input' });
                    }}
                    onFocus={() => handleInputFocus('amount_input')}
                    onBlur={() => handleInputBlur('amount_input')}
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    accessibilityLabel="Amount in rupees"
                    style={[
                      styles.amountInput,
                      {
                        color: colors.text,
                        fontSize: 34,
                        lineHeight: 42,
                        fontWeight: fontWeight.bold,
                        letterSpacing: -0.8,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.quickRow}>
                {['100', '500', '1000', '2000'].map((amt) => (
                  <Button
                    key={amt}
                    label={`₹${amt}`}
                    tone="tertiary"
                    size="md"
                    onPress={() => {
                      setAmount(amt);
                      trackTouch('tap', { target: `quick_amount_${amt}` });
                    }}
                    style={{ flex: 1 }}
                  />
                ))}
              </View>
            </Card>

            <Card>
              <Field
                label="Note"
                value={note}
                onChangeText={handleNoteChange}
                onFocus={() => handleInputFocus('note_input')}
                onBlur={() => handleInputBlur('note_input')}
                placeholder="What's this for?"
                multiline
                numberOfLines={3}
                inputStyle={{ minHeight: 64, textAlignVertical: 'top' }}
                hint="A note strengthens the behavioural signature for this transfer."
              />
            </Card>
          </View>

          {jsonSnapshot ? (
            <Card style={{ marginTop: spacing.lg, gap: spacing.md }}>
              <View style={styles.monitorHead}>
                <View style={{ flex: 1 }}>
                  <Text variant="sectionLabel" tone="secondary" uppercase>
                    Tier 1 monitoring
                  </Text>
                  <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
                    {new Date(jsonSnapshot.timestamp).toLocaleTimeString()} ·{' '}
                    {Math.round(jsonSnapshot.screenInfo?.sessionDuration || 0)}s session
                  </Text>
                </View>
                <Badge label={authenticationStatus} tone={authStatusTone()} />
              </View>

              <View style={styles.monitorGrid}>
                {[
                  { label: 'Interactions', value: String(jsonSnapshot.interactionStats?.totalInteractions || 0) },
                  { label: 'Form progress', value: `${jsonSnapshot.screenInfo?.formProgress || 0}%` },
                  { label: 'Typing now', value: isActivelyTyping ? 'Yes' : 'No' },
                  { label: 'Focused field', value: focusedInput || 'None' },
                ].map((item) => (
                  <View key={item.label} style={styles.monitorCell}>
                    <Text variant="caption" tone="tertiary">
                      {item.label}
                    </Text>
                    <Text variant="footnote" numberOfLines={1} tabular>
                      {item.value}
                    </Text>
                  </View>
                ))}
              </View>

              {lastAuthResult ? (
                <Text variant="caption" tone="secondary">
                  Anomaly score {lastAuthResult.anomaly_score?.toFixed(2) ?? 'N/A'}
                </Text>
              ) : null}
            </Card>
          ) : null}
        </View>
      </KeyboardAwareScrollView>

      <Sheet
        visible={captchaVisible}
        onClose={() => {
          setCaptchaVisible(false);
          setSamplingActive(true);
          trackTouch('modal_closed', { target: 'captcha_modal' });
        }}
        title="Verify it's you"
        subtitle="Type the sentence exactly as shown. 95% accuracy required."
        footer={
          <View style={{ gap: spacing.sm }}>
            <Button
              label={isTypingComplete ? 'Verify and continue' : 'Finish typing first'}
              onPress={() => {
                trackTouch('tap', { target: 'verify_typing_button' });
                verifyTyping();
              }}
              disabled={!isTypingComplete}
              trailingIcon="arrow-forward"
            />
            <View style={styles.sheetFooterRow}>
              <Button
                label="New sentence"
                tone="plain"
                fullWidth={false}
                icon="refresh-outline"
                onPress={() => {
                  trackTouch('tap', { target: 'refresh_captcha_button' });
                  refreshCaptcha();
                }}
              />
              <Button
                label="Cancel"
                tone="plain"
                fullWidth={false}
                onPress={() => {
                  setCaptchaVisible(false);
                  setSamplingActive(true);
                  trackTouch('tap', { target: 'cancel_captcha_button' });
                }}
              />
            </View>
          </View>
        }
      >
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: 6 }}>
            <Text variant="sectionLabel" tone="secondary" uppercase>
              Type this sentence
            </Text>
            <View
              style={[
                styles.sentenceBox,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                },
              ]}
            >
              {renderHighlightedText()}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <View style={styles.accuracyRow}>
              <Text variant="caption" tone="secondary">
                Accuracy
              </Text>
              <Text variant="subhead" tabular style={{ color: getAccuracyColor(), fontWeight: fontWeight.semibold }}>
                {typingAccuracy}%
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.surfaceSunken }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, typingAccuracy)}%`, backgroundColor: getAccuracyColor() },
                ]}
              />
            </View>
            <View style={styles.metricRow}>
              <Text variant="caption" tone="tertiary">
                {keystrokeData.length > 0
                  ? `${Math.round((keystrokeData.length / ((Date.now() - startTime) / 1000)) * 60)} CPM`
                  : '0 CPM'}
              </Text>
              <Text variant="caption" tone="tertiary">
                {keystrokeData.filter((k) => k.isBackspace).length} corrections
              </Text>
              <Text variant="caption" tone="tertiary">
                {isActivelyTyping ? 'Active' : 'Paused'}
              </Text>
            </View>
          </View>

          <Field
            label="Your typing"
            value={captchaInput}
            onChangeText={handleTypingInput}
            onFocus={() => handleInputFocus('captcha_input')}
            onBlur={() => handleInputBlur('captcha_input')}
            placeholder="Type the sentence above"
            multiline
            numberOfLines={4}
            autoFocus
            inputStyle={{
              minHeight: 110,
              textAlignVertical: 'top',
              fontSize: fontSize.mono,
              lineHeight: lineHeight.mono,
              fontFamily: Platform.OS === 'ios' ? monoFont.ios : monoFont.android,
            }}
            hint={`${captchaInput.length} of ${captchaSentence.length} characters`}
          />

          {lastAuthResult ? (
            <View style={{ gap: spacing.md }}>
              <Text variant="sectionLabel" tone="secondary" uppercase>
                Live analysis
              </Text>
              <View style={styles.monitorGrid}>
                {[
                  { label: 'Anomaly score', value: lastAuthResult.anomaly_score?.toFixed(2) || 'N/A' },
                  { label: 'Risk level', value: lastAuthResult.authentication_result?.risk_level || 'Unknown' },
                  {
                    label: 'Confidence',
                    value: `${((lastAuthResult.authentication_result?.confidence || 0) * 100).toFixed(0)}%`,
                  },
                  { label: 'Flags', value: String(lastAuthResult.rule_flags?.length || 0) },
                ].map((item) => (
                  <View key={item.label} style={styles.monitorCell}>
                    <Text variant="caption" tone="tertiary">
                      {item.label}
                    </Text>
                    <Text variant="footnote" numberOfLines={1} tabular>
                      {item.value}
                    </Text>
                  </View>
                ))}
              </View>

              {lastAuthResult.rule_flags?.length ? (
                <Banner
                  tone="warning"
                  title="Signals detected"
                  message={lastAuthResult.rule_flags.join(' · ')}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  formBody: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    padding: 16,
    paddingBottom: 48,
  },
  fieldLabel: {
    fontWeight: '600',
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 66,
    paddingRight: 14,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  monitorHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monitorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monitorCell: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: 2,
  },
  sentenceBox: {
    padding: 14,
    borderWidth: 1,
  },
  accuracyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  highlightChar: {
    borderRadius: 4,
    paddingHorizontal: 1,
    paddingVertical: 3,
    lineHeight: 24,
  },
});

