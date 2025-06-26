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
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;