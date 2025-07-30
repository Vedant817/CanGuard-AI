const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Behavior = require('../models/Behavior');

// External dependencies for streams storage from streams.js
let streamsStorage;
try {
  const streamsModule = require('./streams');
  // Access the streamsStorage if exported, otherwise use a getter
  streamsStorage = global.streamsStorage || new Map();
} catch (error) {
  streamsStorage = new Map();
}

/**
 * @route   GET /api/debug/all-data
 * @desc    View all stored data for debugging
 * @access  Public (remove in production)
 */
router.get('/all-data', async (req, res) => {
  try {
    console.log('🔍 [DEBUG] Retrieving all stored data...');

    // Get MongoDB data
    const users = await User.find({}).select('-password').lean();
    const behaviors = await Behavior.find({}).lean();

    // Get in-memory streams data
    const streamsData = Array.from(streamsStorage.entries()).map(([id, data]) => ({
      streamId: id,
      userId: data.userId,
      did: data.did?.substring(0, 20) + '...',
      entriesCount: data.entries?.length || 0,
      createdAt: new Date(data.createdAt).toISOString(),
      updatedAt: new Date(data.updatedAt).toISOString(),
      recentEntries: data.entries?.slice(-3).map(entry => ({
        cid: entry.cid?.substring(0, 20) + '...',
        dataType: entry.dataType,
        timestamp: new Date(entry.timestamp).toISOString()
      })) || []
    }));

    // System stats
    const stats = {
      totalUsers: users.length,
      totalBehaviors: behaviors.length,
      totalStreams: streamsData.length,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };

    console.log('✅ [DEBUG] Data retrieved successfully:', {
      users: users.length,
      behaviors: behaviors.length,
      streams: streamsData.length
    });

    res.json({
      success: true,
      message: 'All data retrieved for debugging',
      data: {
        stats,
        users,
        behaviors,
        streams: streamsData
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG] Error retrieving data:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving debug data',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/debug/user/:userId
 * @desc    View specific user's data
 * @access  Public (remove in production)
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🔍 [DEBUG] Retrieving data for user:', userId);

    // Get user data
    const user = await User.findById(userId).select('-password').lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's behaviors
    const userBehaviors = await Behavior.find({ userId }).lean();

    // Get user's streams
    const userStreams = Array.from(streamsStorage.entries())
      .filter(([id, data]) => data.userId === userId)
      .map(([id, data]) => ({
        streamId: id,
        did: data.did,
        entriesCount: data.entries?.length || 0,
        createdAt: new Date(data.createdAt).toISOString(),
        updatedAt: new Date(data.updatedAt).toISOString(),
        entries: data.entries || []
      }));

    console.log('✅ [DEBUG] User data retrieved:', {
      user: user.email,
      behaviors: userBehaviors.length,
      streams: userStreams.length
    });

    res.json({
      success: true,
      message: 'User data retrieved successfully',
      data: {
        user,
        behaviors: userBehaviors,
        streams: userStreams
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG] Error retrieving user data:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving user debug data',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/debug/streams
 * @desc    View all streams data
 * @access  Public (remove in production)
 */
router.get('/streams', async (req, res) => {
  try {
    console.log('🔍 [DEBUG] Retrieving all streams data...');

    const streamsData = Array.from(streamsStorage.entries()).map(([id, data]) => ({
      streamId: id,
      userId: data.userId,
      did: data.did,
      entriesCount: data.entries?.length || 0,
      createdAt: new Date(data.createdAt).toISOString(),
      updatedAt: new Date(data.updatedAt).toISOString(),
      entries: data.entries || []
    }));

    console.log('✅ [DEBUG] Streams data retrieved:', {
      totalStreams: streamsData.length
    });

    res.json({
      success: true,
      message: 'Streams data retrieved successfully',
      data: {
        totalStreams: streamsData.length,
        streams: streamsData
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG] Error retrieving streams:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving streams debug data',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/debug/behaviors
 * @desc    View all behavioral data
 * @access  Public (remove in production)
 */
router.get('/behaviors', async (req, res) => {
  try {
    console.log('🔍 [DEBUG] Retrieving all behavioral data...');

    const behaviors = await Behavior.find({}).lean();

    // Group by user
    const behaviorsByUser = behaviors.reduce((acc, behavior) => {
      if (!acc[behavior.userId]) {
        acc[behavior.userId] = [];
      }
      acc[behavior.userId].push(behavior);
      return acc;
    }, {});

    console.log('✅ [DEBUG] Behavioral data retrieved:', {
      totalBehaviors: behaviors.length,
      uniqueUsers: Object.keys(behaviorsByUser).length
    });

    res.json({
      success: true,
      message: 'Behavioral data retrieved successfully',
      data: {
        totalBehaviors: behaviors.length,
        uniqueUsers: Object.keys(behaviorsByUser).length,
        behaviors,
        behaviorsByUser
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG] Error retrieving behavioral data:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving behavioral debug data',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/debug/clear-streams
 * @desc    Clear all streams data (for testing)
 * @access  Public (remove in production)
 */
router.delete('/clear-streams', async (req, res) => {
  try {
    console.log('🗑️ [DEBUG] Clearing all streams data...');

    const beforeCount = streamsStorage.size;
    streamsStorage.clear();

    console.log('✅ [DEBUG] Streams cleared:', {
      clearedCount: beforeCount,
      remainingCount: streamsStorage.size
    });

    res.json({
      success: true,
      message: 'All streams data cleared',
      data: {
        clearedCount: beforeCount,
        remainingCount: streamsStorage.size
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG] Error clearing streams:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing streams data',
      error: error.message
    });
  }
});

module.exports = router;
