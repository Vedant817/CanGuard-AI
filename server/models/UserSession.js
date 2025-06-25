const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionType: {
    type: String,
    enum: ['full_auth', 'mpin_only', 'expired'],
    default: 'expired'
  },
  lastFullAuthentication: {
    type: Date,
    required: true
  },
  lastBehavioralUpdate: {
    type: Date,
    required: true
  },
  deviceFingerprint: {
    type: String,
    required: true,
    index: true
  },
  authSteps: {
    loginCompleted: {
      type: Boolean,
      default: false
    },
    typingGameCompleted: {
      type: Boolean,
      default: false
    },
    mpinVerified: {
      type: Boolean,
      default: false
    }
  },
  sessionToken: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});


module.exports = mongoose.model('UserSession', userSessionSchema);
