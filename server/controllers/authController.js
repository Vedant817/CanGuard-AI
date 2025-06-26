const bcrypt = require('bcryptjs');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// ✅ Fix: Add ValidationUtil import or define it
const ValidationUtil = {
  sanitizeInput: (input) => {
    return input.trim().replace(/[<>]/g, '');
  }
};

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.sign({ _id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

exports.register = async (req, res) => {
  try {
    const { username, email, password, mpin } = req.body;

    // ✅ Add validation for all required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email and password'
      });
    }

    // ✅ Add email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // ✅ Add password validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // MPIN validation
    if (!mpin || mpin.length !== 6 || !/^\d{6}$/.test(mpin)) {
      return res.status(400).json({
        success: false,
        message: 'MPIN must be exactly 6 digits'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'Username';
      return res.status(400).json({
        success: false,
        message: `${field} already in use`
      });
    }
    
    // ✅ Fix: Hash both password and MPIN properly
    const hashedPassword = await bcrypt.hash(password, 12); // Increased salt rounds for better security
    const hashedMpin = await bcrypt.hash(mpin, 12);
    
    // ✅ Fix: Use hashed password in user creation
    const user = new User({
      username: ValidationUtil.sanitizeInput(username),
      email: email.toLowerCase(),
      password: hashedPassword, // ✅ Use hashed password instead of plain text
      mpin: hashedMpin,
    });

    // ✅ Save user first, then generate token
    
    user.lastLoginVerifiedAt = new Date();
    await user.save();
    const token = generateToken(user);

    // ✅ Improved response format
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: { 
          id: user._id,
          email: user.email,
          username: user.username
        },
        token
      }
    });

  } catch (err) {
    console.error('Register Error:', err);
    
    // ✅ Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Registration failed',
      error: err.message 
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Add input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // ✅ Find user and include password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // ✅ Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // ✅ Generate token
    const token = generateToken(user);
    user.lastLoginVerifiedAt = new Date();

    // ✅ Improved response format
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: { 
          id: user._id,
          email: user.email,
          username: user.username
        },
        token
      }
    });

    

  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Login failed',
      error: err.message 
    });
  }
};

exports.validateMpin = async (req, res) => {
  try {
    const { mpin } = req.body;
    const userId = req.userId;

    const user = await User.findById(userId).select('+mpin');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMpinValid = await bcrypt.compare(mpin, user.mpin);
    if (!isMpinValid) return res.status(401).json({ success: false, message: 'Invalid MPIN' });

    user.lastMpinVerifiedAt = new Date();
    await user.save();

    res.json({ success: true, message: 'MPIN verified successfully' });
  } catch (error) {
    console.error('MPIN error:', error);
    res.status(500).json({ success: false, message: 'MPIN validation failed' });
  }
};
