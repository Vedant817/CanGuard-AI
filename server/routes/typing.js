// backend/routes/typing.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const TypingSession = require('../models/TypingSession');
const authenticate = require('../middleware/auth');

// POST /api/behavior/typing
router.post('/typing', authenticate, async (req, res) => {
  try {
    const {
      keystrokeData,
      behavioralMetrics,
      typingStats,
      sessionData
    } = req.body;

    if (!keystrokeData || !behavioralMetrics || !typingStats || !sessionData) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const session = new TypingSession({
      user: req.user._id,
      keystrokeData,
      behavioralMetrics,
      typingStats,
      sessionData,
    });

    await session.save();

    res.status(201).json({ success: true, message: 'Typing session recorded.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
