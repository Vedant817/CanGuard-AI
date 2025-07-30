const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  mpin: {
    type: String,
    required: true,
  },
  age:{
    type: Number,
  },
  disability: {
    type: String,
    enum: ['None', 'Visual', 'Hearing', 'Motor', 'Cognitive'],
  },
  lastBehavioralVerification: {
    type: Date,
    default: null,
  },
  lastMpinVerifiedAt: { type: Date, default: null },
  lastLoginVerifiedAt: { type: Date, default: null },
  deviceUUIDs: [{ type: String }],
  
  // Distributed Identity fields (MongoDB + IPFS + DIDs)
  did: { 
    type: String, 
    unique: true, 
    sparse: true,
    index: true 
  },
  identityDocumentCID: { 
    type: String, 
    sparse: true 
  },
  blockchainInitialized: { 
    type: Boolean, 
    default: false 
  },
  encryptionKeyFingerprint: { 
    type: String, 
    sparse: true 
  },
  
  // Data stream references (IPFS CIDs)
  dataStreamCIDs: [{
    cid: { type: String, required: true },
    dataType: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    size: { type: Number }
  }],
  
  // Aggregated mathematical model (safe to store centrally)
  D_ref: {
    typingProfile: {
      avgWpm: { type: Number, default: 0 },
      avgAccuracy: { type: Number, default: 0 },
      avgKeyHoldTime: { type: Number, default: 0 },
      avgFlightTime: { type: Number, default: 0 },
      avgTapRhythm: { type: Number, default: 0 },
      profileConfidence: { type: Number, default: 0 },
      sampleCount: { type: Number, default: 0 }
    },
    lastUpdated: { type: Date, default: Date.now },
    version: { type: Number, default: 1 }
  },
  
  // Analysis history (aggregated, non-sensitive)
  analysisHistory: [{
    timestamp: { type: Date, default: Date.now },
    decision: { type: String, enum: ['PASS', 'FLAG', 'ESCALATE'] },
    confidence: { type: Number },
    riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'] },
    dataPointsCount: { type: Number },
    requestId: { type: String }
  }]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;