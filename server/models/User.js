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
    required: true
  },
  disability: {
    type: String,
    required: true,
    enum: ['None', 'Visual', 'Hearing', 'Motor', 'Cognitive'],
  },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;