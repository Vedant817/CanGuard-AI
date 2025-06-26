const mongoose = require('mongoose');

const behavioralSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fingerprint: {
    D: {
  wpm: {type: Number, default: 0},
  accuracy:{type: Number, default: 0},
  totalTime: {type: Number, default: 0},
  keystrokes: {type: Number, default: 0},
  errors: {type: Number, default: 0},
  correctKeystrokes: {type: Number, default: 0},
  averageSpeed: {type: Number, default: 0},
  consistency: {type: Number, default: 0},
  typingSpeed: {type: Number, default: 0},
  errorRate: {type: Number, default: 0},
  averageKeyHoldTime: {type: Number, default: 0},
  averageFlightTime: {type: Number, default: 0},
  averageTapRhythm: {type: Number, default: 0},
  backspaceCount: {type: Number, default: 0},
  averageKeyboardLatency: {type: Number, default: 0}
}
,
    D_std: {
      type: Number,
      default: 0
    },
    features_used: {
      type: [String],
      default: []
    }
  },
  last_locations: [{
    latitude: { type: Number },
    longitude: { type: Number },
    ips: { type: String },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
});

const Behavioral = mongoose.model('Behavioral', behavioralSchema);
module.exports = Behavioral;
