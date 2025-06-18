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
}

interface KeystrokeData {
  key: string;
  timestamp: number;
  pressTime: number;
  releaseTime: number;
  correct: boolean;
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
  const [stats, setStats] = useState<TypingStats>({
    wpm: 0,
    accuracy: 0,
    totalTime: 0,
    keystrokes: 0,
    errors: 0
  });
  
  const inputRef = useRef<TextInput>(null);
  const keyPressStartTime = useRef<number>(0);

  useEffect(() => {
    // Initialize with random text
    resetGame();
  }, []);

  useEffect(() => {
    if (userInput.length === currentText.length && userInput.length > 0) {
      completeGame();
    }
  }, [userInput, currentText]);

  const resetGame = () => {
    const randomText = SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)];
    setCurrentText(randomText);
    setUserInput('');
    setIsGameActive(false);
    setGameStarted(false);
    setGameCompleted(false);
    setKeystrokeData([]);
    setStats({
      wpm: 0,
      accuracy: 0,
      totalTime: 0,
      keystrokes: 0,
      errors: 0
    });
  };

  const startGame = () => {
    setIsGameActive(true);
    setGameStarted(true);
    setStartTime(Date.now());
    inputRef.current?.focus();
  };

  const completeGame = () => {
    const endTime = Date.now();
    setEndTime(endTime);
    setIsGameActive(false);
    setGameCompleted(true);
    
    calculateStats(endTime);
    inputRef.current?.blur();
  };

  const calculateStats = (endTime: number) => {
    const totalTime = (endTime - startTime) / 1000; // in seconds
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
    
    setStats({
      wpm,
      accuracy,
      totalTime: Math.round(totalTime),
      keystrokes: userInput.length,
      errors
    });

    // Send behavioral data to server
    sendBehavioralData({
      wpm,
      accuracy,
      totalTime,
      keystrokes: userInput.length,
      errors,
      keystrokeData
    });
  };

  const sendBehavioralData = async (gameStats: any) => {
    try {
      // Calculate typing rhythm patterns
      const typingPatterns = analyzeTypingPatterns(keystrokeData);
      
      // This would be sent to your behavior analysis API
      console.log('Behavioral Data:', {
        typingStats: gameStats,
        typingPatterns,
        timestamp: new Date().toISOString()
      });
      
      // TODO: Integrate with your behavior API
      // await ApiClient.updateBehaviorData({
      //   typingPatterns: typingPatterns
      // });
      
    } catch (error) {
      console.error('Failed to send behavioral data:', error);
    }
  };

  const analyzeTypingPatterns = (keystrokes: KeystrokeData[]) => {
    if (keystrokes.length < 2) return {};

    const dwellTimes = keystrokes.map(k => k.releaseTime - k.pressTime);
    const flightTimes = [];
    
    for (let i = 1; i < keystrokes.length; i++) {
      flightTimes.push(keystrokes[i].pressTime - keystrokes[i-1].releaseTime);
    }

    return {
      averageDwellTime: dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length,
      averageFlightTime: flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length,
      dwellTimeVariance: calculateVariance(dwellTimes),
      flightTimeVariance: calculateVariance(flightTimes),
      typingRhythm: calculateTypingRhythm(keystrokes)
    };
  };

  const calculateVariance = (data: number[]) => {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    return data.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / data.length;
  };

  const calculateTypingRhythm = (keystrokes: KeystrokeData[]) => {
    // Calculate consistency in typing rhythm
    const intervals = [];
    for (let i = 1; i < keystrokes.length; i++) {
      intervals.push(keystrokes[i].timestamp - keystrokes[i-1].timestamp);
    }
    return calculateVariance(intervals);
  };

  const handleTextChange = (text: string) => {
    if (!isGameActive) return;
    
    const currentTime = Date.now();
    
    // Record keystroke data
    if (text.length > userInput.length) {
      // Key pressed
      const newChar = text[text.length - 1];
      const isCorrect = newChar === currentText[text.length - 1];
      
      setKeystrokeData(prev => [...prev, {
        key: newChar,
        timestamp: currentTime,
        pressTime: keyPressStartTime.current || currentTime,
        releaseTime: currentTime,
        correct: isCorrect
      }]);
    }
    
    setUserInput(text);
  };

  const handleKeyPress = () => {
    keyPressStartTime.current = Date.now();
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
        
        <Text style={styles.headerTitle}>Typing Speed Test</Text>
        <Text style={styles.headerSubtitle}>Behavioral Authentication Training</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Game Stats */}
        {gameStarted && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round((userInput.length / currentText.length) * 100)}%</Text>
              <Text style={styles.statLabel}>Progress</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: getWPMColor(stats.wpm) }]}>
                {stats.wpm}
              </Text>
              <Text style={styles.statLabel}>WPM</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: getAccuracyColor(stats.accuracy) }]}>
                {stats.accuracy}%
              </Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
          </View>
        )}

        {/* Text Display */}
        <View style={styles.textContainer}>
          <View style={styles.textDisplay}>
            {renderText()}
          </View>
        </View>

        {/* Input Field */}
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={userInput}
            onChangeText={handleTextChange}
            onKeyPress={handleKeyPress}
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

        {/* Results */}
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
                <Text style={styles.resultLabel}>Time Taken</Text>
                <Text style={styles.resultValue}>{stats.totalTime}s</Text>
              </View>
              
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Keystrokes</Text>
                <Text style={styles.resultValue}>{stats.keystrokes}</Text>
              </View>
              
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Errors</Text>
                <Text style={styles.resultValue}>{stats.errors}</Text>
              </View>
              
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Correct Keys</Text>
                <Text style={styles.resultValue}>{stats.keystrokes - stats.errors}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.playAgainButton} onPress={resetGame}>
              <LinearGradient
                colors={['#019EEC', '#0080CC']}
                style={styles.buttonGradient}
              >
                <Ionicons name="refresh" size={20} color="#fff" />
                <Text style={styles.buttonText}>Play Again</Text>
              </LinearGradient>
            </TouchableOpacity>
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
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 50,
    padding: 8,
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
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
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
  playAgainButton: {
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
  },
});
