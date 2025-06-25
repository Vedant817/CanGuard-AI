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
  fullName: {
    type: String,
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s-()]+$/, 'Please provide a valid phone number']
  },
  accountNumber:{
    type: String,
    unique: true,
    sparse:true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  securityLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  behavioralProfile: {
    lastBehavioralUpdate: {
      type: Date,
      default: Date.now
    },
    behavioralDataCount: {
      type: Number,
      default: 0
    },
    needsBehavioralUpdate: {
      type: Boolean,
      default: true
    },
    baselineEstablished: {
      type: Boolean,
      default: false
    }
  },
  authenticationHistory: {
    lastFullAuth: Date,
    lastMpinAuth: Date,
    consecutiveMpinLogins: {
      type: Number,
      default: 0
    }
  },
  currentRiskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  deviceInfo: {
    deviceId: String,
    platform: String,
    version: String,
    model: String
  }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

userSchema.methods.compareMpin = async function(candidateMpin) {
  try {
    return await bcrypt.compare(candidateMpin, this.mpin);
  } catch (error) {
    throw new Error('MPIN comparison failed');
  }
};

userSchema.methods.generateAccountNumber = function() {
  return `CB${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

const User = mongoose.model('User', userSchema);

module.exports = User;
