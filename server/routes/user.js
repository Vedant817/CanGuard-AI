const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const sessionCheck = require('../middleware/sessionCheck');

router.get('/session-status', authMiddleware, (req, res) => {
  const user = req.user;
  const now = Date.now();
  const THREE_WEEKS = 1000 * 60 * 60 * 24 * 21;

  const needsTyping = !user.lastBehavioralVerification ||
    now - new Date(user.lastBehavioralVerification).getTime() > THREE_WEEKS;

  const needsLogin = !user.lastLoginVerifiedAt ||
    now - new Date(user.lastLoginVerifiedAt).getTime() > THREE_WEEKS;

  res.json({
    success: true,
    session: {
      needsTyping,
      needsLogin
    }
  });
});

router.get('/profile', authMiddleware, sessionCheck(true, true), async (req, res) => {
  try {
    const user = req.user;

    res.json({
      success: true,
      message: 'Session verified',
      data: {
        id: user._id,
        email: user.email,
        username: user.username,
        age: user.age,
        disability: user.disability,
        lastBehavioralVerification: user.lastBehavioralVerification,
        lastLoginVerified: user.lastLoginVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: error.message
    });
  }
});



module.exports = router;
