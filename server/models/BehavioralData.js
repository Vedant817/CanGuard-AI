const mongoose = require('mongoose');

const behavioralDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  keystrokeData: [{
    key: String,
    timestamp: Date,
    pressTime: Date,
    releaseTime: Date,
    dwellTime: Number,
    flightTime: Number,
    correct: Boolean,
    position: Number,
    isBackspace: Boolean,
    inputLatency: Number,
    systemLatency: Number
  }],
  touchData: [{
    type: {
      type: String,
      enum: ['tap', 'swipe']
    },
    timestamp: Date,
    startX: Number,
    startY: Number,
    endX: Number,
    endY: Number,
    direction: {
      type: String,
      enum: ['up', 'down', 'left', 'right']
    },
    velocity: Number,
    duration: Number
  }],
  typingPatterns: {
    averageDwellTime: Number,
    averageFlightTime: Number,
    dwellTimeVariance: Number,
    flightTimeVariance: Number,
    typingRhythm: Number,
    interKeyInterval: Number,
    pausePatterns: [Number],
    speedVariation: Number,
    errorRate: Number,
    correctionPatterns: Number,
    wpm: Number,
    accuracy: Number,
    consistency: Number,
    typingSpeed: Number,
    averageKeyHoldTime: Number,
    averageTapRhythm: Number,
    backspaceCount: Number,
    averageKeyboardLatency: Number
  },
  sessionMetrics: {
    sessionDuration: Number,
    totalPauses: Number,
    averagePauseLength: Number,
    typingBursts: [Number],
    concentrationLevel: Number,
    textLength: Number,
    completionTime: Number
  },
  touchMetrics: {
    swipeData: [{
      type: String,
      timestamp: Date,
      startX: Number,
      startY: Number,
      endX: Number,
      endY: Number,
      direction: String,
      velocity: Number,
      duration: Number
    }],
    tapRhythm: [Number],
    swipeFrequency: Number,
    averageSwipeVelocity: Number
  },
  deviceMetrics: {
    keyboardLatency: [Number],
    ipAddress: String,
    deviceUUID: String,
    gpsLocation: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
      timestamp: Date
    },
    deviceInfo: {
      brand: String,
      model: String,
      systemVersion: String,
      uniqueId: String,
      deviceType: String,
      totalMemory: Number,
      usedMemory: Number,
      batteryLevel: Number,
      isCharging: Boolean
    },
    networkInfo: {
      type: String,
      isConnected: Boolean,
      isInternetReachable: Boolean
    }
  },
  latencyStats: {
    averageKeyboardLatency: Number,
    minLatency: Number,
    maxLatency: Number,
    latencyVariance: Number
  },
  riskScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  analysisResults: {
    securityLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    anomalyDetected: {
      type: Boolean,
      default: false
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    recommendations: [String]
  }
}, {
  timestamps: true
});


module.exports = mongoose.model('BehavioralData', behavioralDataSchema);
