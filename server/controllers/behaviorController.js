const Behavioral = require('../models/Behavior');
const User = require('../models/User');

exports.saveTypingDataWithVectors = async (req, res) => {
  try {
    const userId = req.userId;
    const { sessionData } = req.body;

    console.log('📤 Received enhanced session data with vectors:', JSON.stringify(sessionData, null, 2));

    if (!sessionData || !sessionData.typingStats || !sessionData.deviceMetrics) {
      return res.status(400).json({
        success: false,
        message: 'Missing sessionData, typingStats, or deviceMetrics'
      });
    }

    const { typingStats, deviceMetrics, vectorStandardDeviations, vectorMetadata } = sessionData;

    const defaultStd = {
      wpm: 0, accuracy: 0, typingSpeed: 0, errorRate: 0,
      averageKeyHoldTime: 0, averageFlightTime: 0,
      averageKeyboardLatency: 0, averageTapRhythm: 0,
      correctKeystrokes: 0, totalTime: 0, totalWords: 0, cpm: 0
    };

    const stdWithFallback = {};
    for (const key in defaultStd) {
      const rawStd = vectorStandardDeviations?.[key] ?? 0;
      const originalVal = typingStats?.[key] ?? 0;
      stdWithFallback[key] = rawStd === 0 ? (originalVal * 0.1) : rawStd;
    }

    console.log('📊 Final standard deviations with fallback:', stdWithFallback);

    const newBehavior = new Behavioral({
      userId,
      fingerprint: {
        D: {
          sessionData: {
            deviceMetrics,
            typingStats,
            timestamp: new Date(sessionData.timestamp)
          }
        },
        D_std: stdWithFallback,
        features_used: Object.keys(stdWithFallback),
        vectorMetadata: vectorMetadata || {
          vectorCount: 0,
          calculationInterval: 6000,
          bufferSize: 5,
          sessionId: '',
          lastCalculationTime: new Date()
        }
      },
      last_locations: deviceMetrics.gpsLocation ? [{
        latitude: deviceMetrics.gpsLocation.latitude,
        longitude: deviceMetrics.gpsLocation.longitude,
        ips: deviceMetrics.ipAddress || 'unknown',
        timestamp: new Date(deviceMetrics.gpsLocation.timestamp)
      }] : []
    });

    await newBehavior.save();
    const savedBehavior = await Behavioral.findById(newBehavior._id);

    await User.findByIdAndUpdate(userId, {
      lastBehavioralVerification: new Date()
    });

    console.log('✅ Enhanced behavioral data with vectors saved successfully');

    res.status(201).json({
      success: true,
      message: 'Enhanced behavioral data with vector statistics saved successfully',
      data: {
        fingerprintId: newBehavior._id,
        vectorStats: {
          averageMetrics: typingStats,
          standardDeviationMetrics: stdWithFallback,
          vectorCount: vectorMetadata?.vectorCount || 0
        },
        savedDStd: savedBehavior.fingerprint.D_std
      }
    });

  } catch (error) {
    console.error('❌ Error saving enhanced behavioral data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save enhanced behavioral data',
      error: error.message
    });
  }
};

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
        D_std: {
          wpm: 0, accuracy: 0, typingSpeed: 0, errorRate: 0,
          averageKeyHoldTime: 0, averageFlightTime: 0,
          averageKeyboardLatency: 0, averageTapRhythm: 0,correctKeystrokes: 0,totalTime: 0,totalWords: 0,cpm: 0
        },
        features_used: Object.keys(typingStats),
        vectorMetadata: {
          vectorCount: 0,
          calculationInterval: 6000,
          bufferSize: 5,
          sessionId: '',
          lastCalculationTime: new Date()
        }
      },
      last_locations: deviceMetrics.gpsLocation ? [{
        latitude: deviceMetrics.gpsLocation.latitude,
        longitude: deviceMetrics.gpsLocation.longitude,
        ips: deviceMetrics.ipAddress || 'unknown',
        timestamp: new Date(deviceMetrics.gpsLocation.timestamp || Date.now())
      }] : []
    });

    await newBehavior.save();

    await User.findByIdAndUpdate(userId, {
      lastBehavioralVerification: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Basic behavioral data saved successfully',
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
exports.getBehavioralData = async (req, res) => {
  try {
    const userId = req.userId;
    
    const behavioralData = await Behavioral.find({ userId })
      .sort({ 'fingerprint.D.sessionData.timestamp': -1 })
      .limit(10);

    if (!behavioralData || behavioralData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No behavioral data found for user'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Behavioral data retrieved successfully',
      data: behavioralData,
      count: behavioralData.length
    });

  } catch (error) {
    console.error('Error retrieving behavioral data:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving behavioral data',
      error: error.message
    });
  }
};
