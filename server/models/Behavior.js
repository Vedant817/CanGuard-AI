const mongoose = require('mongoose');

const behavioralSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fingerprint: {
    D: { 
      sessionData: {
    deviceMetrics: {
      deviceUUID: { type: String, default: '' },
      ipAddress: { type: String, default: '' },

      gpsLocation: {
        latitude: { type: Number, default: 0 },
        longitude: { type: Number, default: 0 },
        accuracy: { type: Number, default: 0 },
        timestamp: { type: Date, default: Date.now }
      },

      deviceInfo: {
        brand: { type: String, default: '' },
        model: { type: String, default: '' },
        systemVersion: { type: String, default: '' },
        uniqueId: { type: String, default: '' },
        deviceType: { type: String, default: '' },
        totalMemory: { type: Number, default: 0 },
        usedMemory: { type: Number, default: 0 },
        batteryLevel: { type: Number, default: 0 },
        isCharging: { type: Boolean, default: false }
      },

      networkInfo: {
        type: { type: String, default: '' },
        isConnected: { type: Boolean, default: false },
        isInternetReachable: { type: Boolean, default: false }
      }
    },

    typingStats: {
      wpm: { type: Number, default: 0 },
      accuracy: { type: Number, default: 0 },
      totalTime: { type: Number, default: 0 },
      totalWords: { type: Number, default: 0 },
      typingSpeed: { type: Number, default: 0 },
      errorRate: { type: Number, default: 0 },
      correctChars: { type: Number, default: 0 },
      averageKeyHoldTime: { type: Number, default: 0 },
      averageFlightTime: { type: Number, default: 0 },
      averageKeyboardLatency: { type: Number, default: 0 },
      averageTapRhythm: { type: Number, default: 0 }
    },

    timestamp: { type: Date, default: Date.now }
  },

     }, 
    D_std: { type: Number, default: 0 }, 
    features_used: { type: [String], default: [] } 
  },
  
  last_locations: [
    {
      latitude: { type: Number },
      longitude: { type: Number },
      ips: { type: String },
      timestamp: { type: Date, default: Date.now }
    }
  ]
});

const Behavioral = mongoose.model('Behavioral', behavioralSchema);
module.exports = Behavioral;
