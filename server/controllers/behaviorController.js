const Behavioral = require('../models/Behavior');
const User = require('../models/User');

exports.saveTypingData = async (req, res) => {
  try {
    const userId = req.userId;
    const { sessionData } = req.body;

    if (!sessionData || !sessionData.typingStats || !sessionData.deviceMetrics) {
      return res.status(400).json({
        success: false,
        message: 'Missing sessionData, typingStats, or deviceMetrics'
      });
    }

    const { typingStats, deviceMetrics } = sessionData;
const newBehavior = new Behavioral({
  userId,
  fingerprint: {
    D: {
      sessionData: {
        deviceMetrics,
        typingStats,
        timestamp: new Date()
      }
    },
    D_std: 0,
    features_used: Object.keys(typingStats)
  },
  last_locations: deviceMetrics.gpsLocation
    ? [{
        latitude: deviceMetrics.gpsLocation.latitude,
        longitude: deviceMetrics.gpsLocation.longitude,
        ips: deviceMetrics.ipAddress || 'unknown',
        timestamp: new Date(deviceMetrics.gpsLocation.timestamp || Date.now())
      }]
    : []
});

    await newBehavior.save();

    await User.findByIdAndUpdate(userId, {
      lastBehavioralVerification: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Behavioral data saved successfully',
      data: newBehavior
    });
  } catch (error) {
    console.error('Behavioral save error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving behavioral data',
      error: error.message
    });
  }
};
