const Behavioral = require('../models/Behavior');

exports.saveTypingData = async (req, res) => {
    try {
        const userId = req.userId;
        const {typingStats,deviceMetrics}=req.body;

    const newBehavior = new Behavioral({
      userId,
      fingerprint: {
        D: typingStats,
        D_std: 0,
        features_used: Object.keys(typingStats),
      },
      last_locations: deviceMetrics.gpsLocation ? [{
        latitude: deviceMetrics.gpsLocation.latitude,
        longitude: deviceMetrics.gpsLocation.longitude,
        ips: deviceMetrics.ipAddress || 'unknown',
        timestamp: new Date()
      }] : []
    });

    await newBehavior.save();
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
    })}
}

