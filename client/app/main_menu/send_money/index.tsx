import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import * as Location from 'expo-location';
import { v4 as uuidv4 } from 'uuid';
import API_BASE_URL from '@/config/api';

export default function SendMoneyScreen() {
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
  
  // Enhanced behavioral monitoring state
  const [startTime, setStartTime] = useState(Date.now());
  const [keystrokeData, setKeystrokeData] = useState([]);
  const [touchData, setTouchData] = useState([]);
  const [deviceMetrics, setDeviceMetrics] = useState({});
  const [samplingActive, setSamplingActive] = useState(true);
  const [jsonSnapshot, setJsonSnapshot] = useState(null);
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [interactionData, setInteractionData] = useState([]);
  
  // Typing state management
  const [isActivelyTyping, setIsActivelyTyping] = useState(false);
  const [lastTypingTime, setLastTypingTime] = useState(0);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  
  // NEW: T1 Model Integration State
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
  
  // Constants for typing detection
  const TYPING_TIMEOUT_DURATION = 2000;
  const MIN_TYPING_INTERVAL = 100;

  // Initialize monitoring on component mount
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

  // Load user profile for T1 model
  const loadUserProfile = async () => {
    try {
      const storedProfile = await AsyncStorage.getItem('userBehavioralProfile');
      if (storedProfile) {
        setUserProfile(JSON.parse(storedProfile));
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  // Enhanced 10-second monitoring timer with T1 model integration
  useEffect(() => {
    let intervalId;
    
    if (monitoringActive) {
      intervalId = setInterval(async () => {
        try {
          // Collect data for T1 model
          const t1Data = await collectDataForT1Model();
          setT1ModelData(t1Data);
          
          // Only run T1 authentication if actively typing or in CAPTCHA mode
          if (isActivelyTyping || captchaVisible) {
            const authResult = await performBehavioralAuthentication(t1Data);
            setLastAuthResult(authResult);
            
            // Store authentication result
            await AsyncStorage.setItem('lastAuthResult', JSON.stringify(authResult));
            
            // Update UI with authentication status
            setAuthenticationStatus(authResult.authentication_result?.decision || 'UNKNOWN');
            
            console.log('🔐 T1 Authentication Result:', authResult);
          }
          
          // Continue with regular snapshot collection
          const snapshot = await collectDataSnapshot();
          setJsonSnapshot(snapshot);
          
          // Only log detailed typing info when actively typing
          if (isActivelyTyping) {
            console.log('📊 Send Money Screen 10-Second Snapshot (ACTIVE TYPING):', JSON.stringify(snapshot, null, 2));
          } else {
            console.log('📊 Send Money Screen 10-Second Snapshot (NO TYPING):', {
              timestamp: snapshot.timestamp,
              screenInfo: snapshot.screenInfo,
              transactionData: snapshot.transactionData,
              authStatus: authenticationStatus,
              message: "Typing tracking paused - no active typing detected"
            });
          }
          
          // Store snapshot locally
          await AsyncStorage.setItem('sendMoneySnapshot', JSON.stringify(snapshot));
          
          // Send to backend only if actively typing or in CAPTCHA mode
          if ((isActivelyTyping || captchaVisible) && samplingActive) {
            await saveBehavioralData(snapshot.typingStats, snapshot.deviceMetrics);
          }
          
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

  // Collect data specifically formatted for T1 model
  const collectDataForT1Model = async () => {
    const snapshot = await collectDataSnapshot();
    
    // Format data specifically for T1 model consumption
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

  // Client-side T1 Model Implementation
  const performBehavioralAuthentication = async (sensorData) => {
    try {
      // Extract behavioral vector from sensor data
      const behavioralVector = extractBehavioralVector(sensorData);
      
      // Get reference profile
      const referenceProfile = userProfile.referenceProfile;
      
      // Compute anomaly score
      const anomalyScore = computeAnomalyScore(behavioralVector, referenceProfile);
      
      // Perform rule-based checks
      const ruleFlags = performRuleBasedChecks(sensorData);
      
      // Make authentication decision
      const decision = makeAuthenticationDecision(anomalyScore, ruleFlags, sensorData);
      
      // Update reference profile if appropriate
      if (decision.decision === 'PASS' && isSafeToUpdate(behavioralVector, referenceProfile)) {
        const updatedProfile = updateReferenceProfile(referenceProfile, behavioralVector);
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
      
    } catch (error) {
      console.error('T1 Authentication Error:', error);
      return {
        error: `Authentication failed: ${error.message}`,
        authentication_result: { decision: 'ERROR', confidence: 0, risk_level: 'HIGH' }
      };
    }
  };

  // Extract behavioral vector from sensor data
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

  // Compute anomaly score
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
    const T_PASS = 2.0;
    const T_ESC_T2 = 2.5;
    
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
        { text: 'Cancel', style: 'cancel' },
        { text: 'Verify', onPress: () => {
          // Implement T2 verification (OTP, biometric, etc.)
          console.log('T2 verification triggered');
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
          // Implement T3 verification or redirect to support
          console.log('T3 verification triggered');
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

  // Modified data collection that only includes typing data when actively typing
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

  // Save behavioral data to backend
  const saveBehavioralData = async (typingStats, deviceMetrics) => {
    try {
      const sessionToken = await AsyncStorage.getItem('authToken');
      if (!sessionToken) {
        console.log('❌ No auth token found for behavioral data');
        return;
      }

      const behavioralData = {
        typingStats,
        deviceMetrics,
        authenticationResult: lastAuthResult
      };

      console.log('📤 Sending behavioral data with T1 results:', JSON.stringify(behavioralData, null, 2));

      const response = await fetch(`${API_BASE_URL}/api/behavior/navigation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ sessionData: behavioralData })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Behavioral data sent successfully');
      } else {
        console.error('❌ Failed to send behavioral data:', result.message);
      }
    } catch (error) {
      console.error('❌ Error sending behavioral data:', error);
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

  const handleSendMoney = () => {
    if (!amount || !recipient) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    
    if (selectedMethod === 'UPI' && !upiId) {
      Alert.alert('Error', 'Please enter UPI ID');
      return;
    }
    
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
    const completionSnapshot = await collectDataSnapshot();
    completionSnapshot.captchaCompletion = {
      completed: true,
      finalAccuracy: accuracy,
      completionTime: Date.now(),
      totalDuration: (Date.now() - captchaStartTime.current) / 1000,
      finalTypingStats: buildEnhancedTypingStats(0, (Date.now() - captchaStartTime.current) / 1000),
      t1AuthResult: finalAuthResult
    };
    
    console.log('🎉 CAPTCHA Completion Snapshot with T1 Auth:', JSON.stringify(completionSnapshot, null, 2));
    await AsyncStorage.setItem('captchaCompletionSnapshot', JSON.stringify(completionSnapshot));
    
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
    
    console.log('💰 Transaction Completion Snapshot:', JSON.stringify(transactionSnapshot, null, 2));
    await AsyncStorage.setItem('transactionCompletionSnapshot', JSON.stringify(transactionSnapshot));
    
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
    if (typingAccuracy >= 95) return '#4CAF50';
    if (typingAccuracy >= 80) return '#FF9800';
    return '#F44336';
  };

  // Get color based on authentication status
  const getAuthStatusColor = () => {
    switch (authenticationStatus) {
      case 'PASS': return '#4CAF50';
      case 'ESCALATE_TO_T2': return '#FF9800';
      case 'ESCALATE_TO_T3': return '#F44336';
      default: return '#666';
    }
  };

  // Highlight typed characters
  const renderHighlightedText = () => {
    return captchaSentence.split('').map((char, index) => {
      let backgroundColor = 'transparent';
      let color = '#666';
      
      if (index < captchaInput.length) {
        if (captchaInput[index] === char) {
          backgroundColor = '#E8F5E8';
          color = '#2E7D32';
        } else {
          backgroundColor = '#FFEBEE';
          color = '#C62828';
        }
      } else if (index === captchaInput.length) {
        backgroundColor = '#E3F2FD';
        color = '#1976D2';
      }
      
      return (
        <Text
          key={index}
          style={[
            styles.highlightChar,
            { backgroundColor, color }
          ]}
        >
          {char}
        </Text>
      );
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#019EEC', '#0080CC']} style={styles.header}>
        <TouchableOpacity onPress={() => {
          trackTouch('navigation', { target: 'back_button' });
          router.back();
        }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Money</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        onScroll={() => trackTouch('scroll', { target: 'main_scroll' })}
        scrollEventThrottle={1000}
      >
        {/* Method Selection */}
        <View style={styles.methodContainer}>
          <Text style={styles.sectionTitle}>Select Method</Text>
          <View style={styles.methodButtons}>
            {['UPI', 'Account', 'Mobile'].map(method => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.methodButton,
                  selectedMethod === method && styles.selectedMethod
                ]}
                onPress={() => {
                  setSelectedMethod(method);
                  trackTouch('tap', { target: `method_${method}` });
                }}
              >
                <Text style={[
                  styles.methodText,
                  selectedMethod === method && styles.selectedMethodText
                ]}>
                  {method}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recipient Details */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Recipient Name *</Text>
          <TextInput
            style={styles.input}
            value={recipient}
            onChangeText={(text) => {
              setRecipient(text);
              trackTouch('input', { target: 'recipient_input' });
            }}
            onFocus={() => handleInputFocus('recipient_input')}
            onBlur={() => handleInputBlur('recipient_input')}
            placeholder="Enter recipient name"
          />
        </View>

        {selectedMethod === 'UPI' && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>UPI ID *</Text>
            <TextInput
              style={styles.input}
              value={upiId}
              onChangeText={(text) => {
                setUpiId(text);
                trackTouch('input', { target: 'upi_input' });
              }}
              onFocus={() => handleInputFocus('upi_input')}
              onBlur={() => handleInputBlur('upi_input')}
              placeholder="example@upi"
              keyboardType="email-address"
            />
          </View>
        )}

        {/* Amount */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Amount *</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={(text) => {
                setAmount(text);
                trackTouch('input', { target: 'amount_input' });
              }}
              onFocus={() => handleInputFocus('amount_input')}
              onBlur={() => handleInputBlur('amount_input')}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Quick Amount Buttons */}
        <View style={styles.quickAmounts}>
          {['100', '500', '1000', '2000'].map(amt => (
            <TouchableOpacity
              key={amt}
              style={styles.quickAmountBtn}
              onPress={() => {
                setAmount(amt);
                trackTouch('tap', { target: `quick_amount_${amt}` });
              }}
            >
              <Text style={styles.quickAmountText}>₹{amt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Note */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Note (Optional)</Text>
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={(text) => {
              setNote(text);
              trackTouch('input', { target: 'note_input' });
            }}
            onFocus={() => handleInputFocus('note_input')}
            onBlur={() => handleInputBlur('note_input')}
            placeholder="Add a note"
            multiline
          />
        </View>

        {/* Send Button */}
        <TouchableOpacity 
          style={styles.sendButton} 
          onPress={() => {
            trackTouch('tap', { target: 'send_money_button' });
            handleSendMoney();
          }}
        >
          <LinearGradient
            colors={['#019EEC', '#0080CC']}
            style={styles.sendGradient}
          >
            <Text style={styles.sendButtonText}>Send Money</Text>
            <Ionicons name="send" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Enhanced Monitoring Status Display with T1 Model Results */}
        {jsonSnapshot && (
          <View style={styles.monitoringStatus}>
            <Text style={styles.monitoringTitle}>🔐 T1 Behavioral Authentication</Text>
            <Text style={styles.monitoringText}>
              Last Update: {new Date(jsonSnapshot.timestamp).toLocaleTimeString()}
            </Text>
            <Text style={styles.monitoringText}>
              Session Duration: {Math.round(jsonSnapshot.screenInfo?.sessionDuration || 0)}s
            </Text>
            <Text style={styles.monitoringText}>
              Interactions: {jsonSnapshot.interactionStats?.totalInteractions || 0}
            </Text>
            <Text style={styles.monitoringText}>
              Form Progress: {jsonSnapshot.screenInfo?.formProgress || 0}%
            </Text>
            <Text style={styles.monitoringText}>
              Currently Typing: {isActivelyTyping ? '✅ Yes' : '❌ No'}
            </Text>
            <Text style={styles.monitoringText}>
              Focused Input: {focusedInput || 'None'}
            </Text>
            <Text style={[styles.authStatusText, { color: getAuthStatusColor() }]}>
              Auth Status: {authenticationStatus}
            </Text>
            {lastAuthResult && (
              <Text style={styles.monitoringText}>
                Anomaly Score: {lastAuthResult.anomaly_score?.toFixed(2) || 'N/A'}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Enhanced Scrollable Typing CAPTCHA Verification Modal */}
      <Modal
        transparent
        animationType="slide"
        visible={captchaVisible}
        onRequestClose={() => {
          setCaptchaVisible(false);
          setSamplingActive(true);
          trackTouch('modal_closed', { target: 'captcha_modal' });
        }}
      >
        <KeyboardAvoidingView 
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalBox}>
              <ScrollView 
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                bounces={false}
                onScroll={() => trackTouch('scroll', { target: 'captcha_scroll' })}
              >
                <View style={styles.modalHeader}>
                  <Ionicons name="create-outline" size={32} color="#019EEC" />
                  <Text style={styles.modalTitle}>T1 Behavioral Verification</Text>
                  <Text style={styles.modalSubtitle}>
                    Type the sentence below exactly as shown (95% accuracy required)
                  </Text>
                  <Text style={[styles.authStatusIndicator, { color: getAuthStatusColor() }]}>
                    Current Auth Status: {authenticationStatus}
                  </Text>
                </View>

                {/* Sentence Display with Highlighting */}
                <View style={styles.sentenceContainer}>
                  <Text style={styles.sentenceLabel}>Type this sentence:</Text>
                  <View style={styles.sentenceHolder}>
                    {renderHighlightedText()}
                  </View>

                                    {/* Enhanced Accuracy Indicator */}
                  <View style={styles.accuracyContainer}>
                    <View style={styles.accuracyInfo}>
                      <Text style={styles.accuracyLabel}>Accuracy:</Text>
                      <Text style={[styles.accuracyValue, { color: getAccuracyColor() }]}>
                        {typingAccuracy}%
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${typingAccuracy}%`,
                            backgroundColor: getAccuracyColor()
                          }
                        ]} 
                      />
                    </View>
                    
                    {/* Additional Metrics with T1 Model Data */}
                    <View style={styles.additionalMetrics}>
                      <Text style={styles.metricText}>
                        Speed: {keystrokeData.length > 0 ? Math.round((keystrokeData.length / ((Date.now() - startTime) / 1000)) * 60) : 0} CPM
                      </Text>
                      <Text style={styles.metricText}>
                        Errors: {keystrokeData.filter(k => k.isBackspace).length}
                      </Text>
                      <Text style={styles.metricText}>
                        Active Typing: {isActivelyTyping ? '✅' : '❌'}
                      </Text>
                      <Text style={[styles.metricText, { color: getAuthStatusColor() }]}>
                        T1 Status: {authenticationStatus}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Typing Input */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputSectionLabel}>Your typing:</Text>
                  <TextInput
                    style={styles.typingInput}
                    placeholder="Start typing here..."
                    value={captchaInput}
                    onChangeText={handleTypingInput}
                    onFocus={() => {
                      handleInputFocus('captcha_input');
                      console.log('🎯 CAPTCHA typing started');
                    }}
                    onBlur={() => {
                      handleInputBlur('captcha_input');
                      console.log('🎯 CAPTCHA typing paused');
                    }}
                    multiline
                    autoFocus
                    textAlignVertical="top"
                  />

                  {/* Enhanced Character Count */}
                  <View style={styles.characterCountContainer}>
                    <Text style={styles.characterCount}>
                      {captchaInput.length} / {captchaSentence.length} characters
                    </Text>
                    <Text style={styles.completionIndicator}>
                      {isTypingComplete ? '✅ Ready to verify' : '⏳ Keep typing...'}
                    </Text>
                  </View>
                </View>

                {/* T1 Model Real-time Feedback */}
                {lastAuthResult && (
                  <View style={styles.t1FeedbackContainer}>
                    <Text style={styles.t1FeedbackTitle}>🤖 T1 Model Analysis</Text>
                    <View style={styles.t1MetricsGrid}>
                      <View style={styles.t1Metric}>
                        <Text style={styles.t1MetricLabel}>Anomaly Score</Text>
                        <Text style={styles.t1MetricValue}>
                          {lastAuthResult.anomaly_score?.toFixed(2) || 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.t1Metric}>
                        <Text style={styles.t1MetricLabel}>Risk Level</Text>
                        <Text style={[styles.t1MetricValue, { 
                          color: lastAuthResult.authentication_result?.risk_level === 'HIGH' ? '#F44336' : 
                                 lastAuthResult.authentication_result?.risk_level === 'MEDIUM' ? '#FF9800' : '#4CAF50'
                        }]}>
                          {lastAuthResult.authentication_result?.risk_level || 'UNKNOWN'}
                        </Text>
                      </View>
                      <View style={styles.t1Metric}>
                        <Text style={styles.t1MetricLabel}>Confidence</Text>
                        <Text style={styles.t1MetricValue}>
                          {(lastAuthResult.authentication_result?.confidence * 100)?.toFixed(0) || 0}%
                        </Text>
                      </View>
                      <View style={styles.t1Metric}>
                        <Text style={styles.t1MetricLabel}>Flags</Text>
                        <Text style={styles.t1MetricValue}>
                          {lastAuthResult.rule_flags?.length || 0}
                        </Text>
                      </View>
                    </View>
                    {lastAuthResult.rule_flags && lastAuthResult.rule_flags.length > 0 && (
                      <View style={styles.flagsContainer}>
                        <Text style={styles.flagsTitle}>⚠️ Detected Issues:</Text>
                        {lastAuthResult.rule_flags.map((flag, index) => (
                          <Text key={index} style={styles.flagText}>• {flag}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[
                      styles.modalBtn,
                      !isTypingComplete && styles.disabledBtn
                    ]} 
                    onPress={() => {
                      trackTouch('tap', { target: 'verify_typing_button' });
                      verifyTyping();
                    }}
                    disabled={!isTypingComplete}
                  >
                    <Text style={styles.modalBtnText}>
                      {isTypingComplete ? 'Verify & Continue' : 'Complete Typing'}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.bottomButtons}>
                    <TouchableOpacity 
                      style={styles.refreshBtn}
                      onPress={() => {
                        trackTouch('tap', { target: 'refresh_captcha_button' });
                        refreshCaptcha();
                      }}
                    >
                      <Ionicons name="refresh" size={16} color="#019EEC" />
                      <Text style={styles.refreshBtnText}>New Sentence</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.cancelBtn}
                      onPress={() => {
                        setCaptchaVisible(false);
                        setSamplingActive(true);
                        trackTouch('tap', { target: 'cancel_captcha_button' });
                      }}
                    >
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Extra space for keyboard */}
                <View style={styles.keyboardSpace} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// Complete Enhanced styles with T1 model components
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
  methodContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#333' },
  methodButtons: { flexDirection: 'row', gap: 12 },
  methodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  selectedMethod: { backgroundColor: '#019EEC', borderColor: '#019EEC' },
  methodText: { color: '#666', fontWeight: '500' },
  selectedMethodText: { color: '#fff' },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8, color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    paddingLeft: 12,
    color: '#333',
  },
  amountInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickAmountBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  quickAmountText: { color: '#019EEC', fontWeight: '500' },
  sendButton: { borderRadius: 12, overflow: 'hidden', marginTop: 20 },
  sendGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  sendButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  // Enhanced Monitoring Status Styles with T1 Model
  monitoringStatus: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#019EEC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  monitoringTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  monitoringText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  authStatusText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  
  // Enhanced Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '600', 
    marginTop: 8,
    marginBottom: 8,
    color: '#333'
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  authStatusIndicator: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  sentenceContainer: {
    width: '100%',
    marginBottom: 20,
  },
  sentenceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sentenceHolder: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    padding: 12,
    borderWidth: 2,
    borderColor: '#019EEC',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    minHeight: 60,
    minWidth: '100%',
  },
  highlightChar: {
    fontSize: 16,
    paddingHorizontal: 1,
    paddingVertical: 2,
    borderRadius: 2,
    lineHeight: 24,
  },
  accuracyContainer: {
    marginBottom: 8,
  },
  accuracyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  accuracyLabel: {
    fontSize: 12,
    color: '#666',
  },
  accuracyValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  additionalMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginRight: 8,
    marginBottom: 4,
  },
  
  // T1 Model Feedback Styles
  t1FeedbackContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  t1FeedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  t1MetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  t1Metric: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  t1MetricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  t1MetricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  flagsContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  flagsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  flagText: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 4,
  },
  
  inputSection: {
    marginBottom: 20,
  },
  inputSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  typingInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 100,
    maxHeight: 150,
  },
  characterCountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
  },
  completionIndicator: {
    fontSize: 12,
    fontWeight: '500',
    color: '#019EEC',
  },
  modalButtons: {
    width: '100%',
    marginBottom: 20,
  },
  modalBtn: {
    width: '100%',
    backgroundColor: '#019EEC',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledBtn: {
    backgroundColor: '#ccc',
  },
  modalBtnText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 16 
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    gap: 4,
  },
  refreshBtnText: {
    fontSize: 12,
    color: '#019EEC',
    fontWeight: '500',
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelText: { 
    color: '#666', 
    fontSize: 14,
    fontWeight: '500'
  },
  keyboardSpace: {
    height: 100,
  },
});
