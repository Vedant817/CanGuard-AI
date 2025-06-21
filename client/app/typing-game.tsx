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
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Accelerometer,
  Gyroscope,
  Magnetometer,
  DeviceMotion
} from 'expo-sensors';

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
  // ✅ Enhanced behavioral metrics
  typingSpeed: number; // Characters per minute
  errorRate: number; // Percentage of backspaces
  averageKeyHoldTime: number; // Average dwell time
  averageFlightTime: number; // Average flight time
  averageTapRhythm: number; // Average time between taps
  backspaceCount: number; // Total backspaces
}

interface KeystrokeData {
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
}

export default function TypingGameScreen() {
  const [currentText, setCurrentText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [keystrokeData, setKeystrokeData] = useState<KeystrokeData[]>([]);
  const [touchData, setTouchData] = useState<TouchData[]>([]);
  const [sensorData, setSensorData] = useState<SensorData>({
    accelerometer: [],
    gyroscope: [],
    magnetometer: [],
    deviceOrientation: 'portrait',
    movementPatterns: [],
    stabilityScore: 100
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
    backspaceCount: 0
  });
  
  const inputRef = useRef<TextInput>(null);
  const keyPressStartTime = useRef<number>(0);
  const lastKeystrokeTime = useRef<number>(0);
  const lastTapTime = useRef<number>(0);
  const touchStartPosition = useRef<{ x: number; y: number } | null>(null);
  const touchStartTime = useRef<number>(0);
  const sensorSubscriptions = useRef<any[]>([]);

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

  const initializeSensors = async () => {
    try {
      const [accelAvailable, gyroAvailable, magnetAvailable] = await Promise.all([
        Accelerometer.isAvailableAsync(),
        Gyroscope.isAvailableAsync(),
        Magnetometer.isAvailableAsync()
      ]);

      console.log('Sensor availability:', { accelAvailable, gyroAvailable, magnetAvailable });

      let sensorDataCount = { accelerometer: 0, gyroscope: 0, magnetometer: 0 };

      if (accelAvailable) {
        Accelerometer.setUpdateInterval(200);
        const accelerometerSub = Accelerometer.addListener(({ x, y, z }) => {
          sensorDataCount.accelerometer++;
          console.log('Accelerometer data:', { x, y, z });
          setSensorData(prev => ({
            ...prev,
            accelerometer: [...prev.accelerometer.slice(-50), { x, y, z, timestamp: Date.now() }]
          }));
        });
        sensorSubscriptions.current.push(accelerometerSub);
      }

      if (gyroAvailable) {
        Gyroscope.setUpdateInterval(200);
        const gyroscopeSub = Gyroscope.addListener(({ x, y, z }) => {
          sensorDataCount.gyroscope++;
          console.log('Gyroscope data:', { x, y, z });
          setSensorData(prev => ({
            ...prev,
            gyroscope: [...prev.gyroscope.slice(-50), { x, y, z, timestamp: Date.now() }]
          }));
        });
        sensorSubscriptions.current.push(gyroscopeSub);
      }

      if (magnetAvailable) {
        Magnetometer.setUpdateInterval(200);
        const magnetometerSub = Magnetometer.addListener(({ x, y, z }) => {
          sensorDataCount.magnetometer++;
          console.log('Magnetometer data:', { x, y, z });
          setSensorData(prev => ({
            ...prev,
            magnetometer: [...prev.magnetometer.slice(-50), { x, y, z, timestamp: Date.now() }]
          }));
        });
        sensorSubscriptions.current.push(magnetometerSub);
      }

      setTimeout(() => {
        console.log('Sensor data count after 15 seconds:', sensorDataCount);
      }, 15000);

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
      backspaceCount: 0
    });
    cleanupSensors();
  };

  const startGame = () => {
    setIsGameActive(true);
    setGameStarted(true);
    setStartTime(Date.now());
    lastKeystrokeTime.current = Date.now();
    initializeSensors();
    inputRef.current?.focus();
  };

  const completeGame = async () => {
    const endTime = Date.now();
    setEndTime(endTime);
    setIsGameActive(false);
    setGameCompleted(true);
    
    cleanupSensors();
    
    const calculatedStats = calculateComprehensiveStats(endTime);
    setStats(calculatedStats);
    
    const behavioralMetrics = analyzeBehavioralPatterns();
    await saveBehavioralData(behavioralMetrics, calculatedStats);
    
    inputRef.current?.blur();

    await AsyncStorage.setItem('typingTestCompleted', 'true');
    
    // Auto-redirect after 3 seconds
    // setTimeout(() => {
    //   router.replace('/(tabs)');
    // }, 3000);
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
    
    console.log('Enhanced stats calculation:', {
      totalTime, totalWords, wpm, correctChars, accuracy,
      typingSpeed, errorRate, averageKeyHoldTime, averageFlightTime, averageTapRhythm
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
      backspaceCount
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

    const movementPatterns = sensorData.accelerometer.map(reading => 
      Math.sqrt(reading.x * reading.x + reading.y * reading.y + reading.z * reading.z)
    );
    
    const stabilityScore = calculateDeviceStability();
    const concentrationLevel = calculateConcentrationLevel();

    // ✅ Enhanced touch metrics
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
        ...sensorData,
        movementPatterns,
        stabilityScore
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
      }
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

  const calculateDeviceStability = (): number => {
    if (sensorData.accelerometer.length < 10) return 100;
    
    const movements = sensorData.accelerometer.map(reading => 
      Math.sqrt(reading.x * reading.x + reading.y * reading.y + reading.z * reading.z)
    );
    
    const variance = calculateVariance(movements);
    return Math.max(0, 100 - (variance * 10));
  };

  const calculateConcentrationLevel = (): number => {
    const pauseCount = keystrokeData.filter((_, i, arr) => 
      i > 0 && (keystrokeData[i].timestamp - keystrokeData[i-1].timestamp) > 1000
    ).length;
    
    const maxPauses = keystrokeData.length / 10;
    return Math.max(0, 100 - ((pauseCount / maxPauses) * 100));
  };

  const saveBehavioralData = async (behavioralMetrics: BehavioralMetrics, typingStats: TypingStats) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.log('No auth token found');
        return;
      }

      const enhancedBehavioralData = {
        keystrokeData,
        touchData,
        behavioralMetrics,
        typingStats,
        sessionData: {
          timestamp: new Date().toISOString(),
          textLength: currentText.length,
          completionTime: (endTime - startTime) / 1000,
          // ✅ Enhanced metrics for backend
          keyHoldTimeStats: {
            average: stats.averageKeyHoldTime,
            variance: calculateVariance(keystrokeData.filter(k => !k.isBackspace).map(k => k.dwellTime)),
            min: Math.min(...keystrokeData.filter(k => !k.isBackspace).map(k => k.dwellTime)),
            max: Math.max(...keystrokeData.filter(k => !k.isBackspace).map(k => k.dwellTime))
          },
          flightTimeStats: {
            average: stats.averageFlightTime,
            variance: calculateVariance(keystrokeData.filter(k => k.flightTime > 0).map(k => k.flightTime)),
          },
          swipeAnalysis: {
            totalSwipes: behavioralMetrics.touchMetrics.swipeFrequency,
            averageSwipeVelocity: behavioralMetrics.touchMetrics.averageSwipeVelocity
          },
          tapRhythmStats: {
            averageInterval: stats.averageTapRhythm,
            rhythmVariance: calculateVariance(behavioralMetrics.touchMetrics.tapRhythm)
          }
        }
      };

      const response = await fetch('http://192.168.1.100:3001/api/behavior/typing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(enhancedBehavioralData)
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Enhanced behavioral data saved successfully:', data);
      } else {
        console.error('Failed to save behavioral data:', data.message);
      }
    } catch (error) {
      console.error('Error saving behavioral data:', error);
    }
  };

  // ✅ Enhanced handleTextChange with comprehensive tracking
  const handleTextChange = (text: string) => {
    if (!isGameActive) return;
    
    const currentTime = Date.now();
    
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
      
      setKeystrokeData(prev => [...prev, {
        key: newChar,
        timestamp: currentTime,
        pressTime: keyPressStartTime.current || currentTime,
        releaseTime: currentTime,
        dwellTime,
        flightTime,
        correct: isCorrect,
        position: text.length - 1,
        isBackspace: false
      }]);
      
      lastKeystrokeTime.current = currentTime;
    } 
    // ✅ Handle backspace (character removed) - for error rate calculation
    else if (text.length < userInput.length) {
      const backspaceData = {
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
        isBackspace: true
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
        backspaceCount: backspaceCount
      }));
    }
  };

  const handleKeyPress = () => {
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
        {/* ✅ Enhanced Game Stats with new metrics */}
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
              <Text style={styles.statValue}>{stats.errorRate}%</Text>
              <Text style={styles.statLabel}>Error Rate</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{touchData.filter(t => t.type === 'swipe').length}</Text>
              <Text style={styles.statLabel}>Swipes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.averageTapRhythm}ms</Text>
              <Text style={styles.statLabel}>Tap Rhythm</Text>
            </View>
          </View>
        )}

        {/* Sensor Data Display */}
        {gameStarted && (
          <View style={styles.sensorContainer}>
            <Text style={styles.sensorTitle}>Device Stability & Behavior</Text>
            <View style={styles.sensorStats}>
              <View style={styles.sensorItem}>
                <Text style={styles.sensorValue}>{sensorData.stabilityScore}%</Text>
                <Text style={styles.sensorLabel}>Stability</Text>
              </View>
              <View style={styles.sensorItem}>
                <Text style={styles.sensorValue}>{sensorData.accelerometer.length}</Text>
                <Text style={styles.sensorLabel}>Readings</Text>
              </View>
              <View style={styles.sensorItem}>
                <Text style={styles.sensorValue}>{stats.backspaceCount}</Text>
                <Text style={styles.sensorLabel}>Backspaces</Text>
              </View>
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
            <Text style={styles.resultsTitle}>Test Complete!</Text>
            
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
                <Text style={styles.resultLabel}>Error Rate</Text>
                <Text style={styles.resultValue}>{stats.errorRate}%</Text>
              </View>
              
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Tap Rhythm</Text>
                <Text style={styles.resultValue}>{stats.averageTapRhythm}ms</Text>
              </View>
            </View>

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
                <Text style={styles.playAgainText}>Try Again</Text>
              </TouchableOpacity>
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
  sensorContainer: {
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
  sensorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  sensorStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sensorItem: {
    alignItems: 'center',
  },
  sensorValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#019EEC',
  },
  sensorLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
  },
  playAgainButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#019EEC',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  playAgainText: {
    color: '#019EEC',
    fontSize: 16,
    fontWeight: '600',
  },
});
