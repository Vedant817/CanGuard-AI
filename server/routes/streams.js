const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// In-memory storage for streams (you can replace with database later)
const streamsStorage = new Map();

// Make storage globally accessible for debug routes
global.streamsStorage = streamsStorage;

/**
 * @route   POST /api/streams
 * @desc    Create a new data stream
 * @access  Public (for now, can add auth later)
 */
router.post('/', async (req, res) => {
  try {
    const { streamId, userId, did, initialData } = req.body;

    console.log('🗄️ [STREAMS-API] Creating new stream:', {
      streamId,
      userId,
      did: did?.substring(0, 20) + '...',
      timestamp: new Date().toISOString(),
      bodyKeys: Object.keys(req.body),
      hasInitialData: !!initialData
    });

    if (!streamId || !userId || !did) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: streamId, userId, or did'
      });
    }

    // Check if stream already exists
    if (streamsStorage.has(streamId)) {
      return res.status(409).json({
        success: false,
        message: 'Stream already exists'
      });
    }

    // Store the stream data
    const streamData = {
      streamId,
      userId,
      did,
      entries: initialData?.entries || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: initialData
    };

    streamsStorage.set(streamId, streamData);

    console.log('✅ [STREAMS-API] Stream created successfully:', {
      streamId,
      entriesCount: streamData.entries.length
    });

    res.status(201).json({
      success: true,
      message: 'Stream created successfully',
      data: {
        streamId,
        entriesCount: streamData.entries.length,
        createdAt: streamData.createdAt
      }
    });

  } catch (error) {
    console.error('❌ [STREAMS-API] Error creating stream:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/streams/:streamId/entries
 * @desc    Add entry to existing stream
 * @access  Public (for now, can add auth later)
 */
router.post('/:streamId/entries', async (req, res) => {
  try {
    const { streamId } = req.params;
    const { entry } = req.body;

    console.log('🗄️ [STREAMS-API] Adding entry to stream:', {
      streamId,
      entryType: entry?.dataType,
      timestamp: new Date().toISOString()
    });

    if (!entry) {
      return res.status(400).json({
        success: false,
        message: 'Missing entry data'
      });
    }

    // Get existing stream
    const streamData = streamsStorage.get(streamId);
    if (!streamData) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found'
      });
    }

    // Add the new entry
    streamData.entries.push(entry);
    streamData.updatedAt = Date.now();

    // Update storage
    streamsStorage.set(streamId, streamData);

    console.log('✅ [STREAMS-API] Entry added successfully:', {
      streamId,
      totalEntries: streamData.entries.length,
      entryType: entry.dataType
    });

    res.status(200).json({
      success: true,
      message: 'Entry added successfully',
      data: {
        totalEntries: streamData.entries.length,
        updatedAt: streamData.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ [STREAMS-API] Error adding entry:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/streams/:streamId/entries
 * @desc    Get all entries from stream
 * @access  Public (for now, can add auth later)
 */
router.get('/:streamId/entries', async (req, res) => {
  try {
    const { streamId } = req.params;

    console.log('🗄️ [STREAMS-API] Retrieving entries from stream:', {
      streamId,
      timestamp: new Date().toISOString()
    });

    // Get existing stream
    const streamData = streamsStorage.get(streamId);
    if (!streamData) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found'
      });
    }

    console.log('✅ [STREAMS-API] Entries retrieved successfully:', {
      streamId,
      entriesCount: streamData.entries.length
    });

    res.status(200).json({
      success: true,
      message: 'Entries retrieved successfully',
      data: {
        entries: streamData.entries,
        totalEntries: streamData.entries.length,
        streamId,
        updatedAt: streamData.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ [STREAMS-API] Error retrieving entries:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/streams/:streamId
 * @desc    Get stream metadata
 * @access  Public (for now, can add auth later)
 */
router.get('/:streamId', async (req, res) => {
  try {
    const { streamId } = req.params;

    console.log('🗄️ [STREAMS-API] Retrieving stream metadata:', {
      streamId,
      timestamp: new Date().toISOString()
    });

    // Get existing stream
    const streamData = streamsStorage.get(streamId);
    if (!streamData) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found'
      });
    }

    console.log('✅ [STREAMS-API] Stream metadata retrieved successfully:', {
      streamId,
      entriesCount: streamData.entries.length
    });

    res.status(200).json({
      success: true,
      message: 'Stream metadata retrieved successfully',
      data: streamData
    });

  } catch (error) {
    console.error('❌ [STREAMS-API] Error retrieving stream metadata:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/streams/debug/all
 * @desc    Debug endpoint to see all streams
 * @access  Public (remove in production)
 */
router.get('/debug/all', async (req, res) => {
  try {
    const allStreams = Array.from(streamsStorage.entries()).map(([id, data]) => ({
      streamId: id,
      userId: data.userId,
      entriesCount: data.entries.length,
      createdAt: new Date(data.createdAt).toISOString(),
      updatedAt: new Date(data.updatedAt).toISOString()
    }));

    console.log('🔍 [STREAMS-API] Debug - All streams requested:', {
      totalStreams: allStreams.length
    });

    res.status(200).json({
      success: true,
      message: 'All streams retrieved for debug',
      data: {
        streams: allStreams,
        totalStreams: allStreams.length
      }
    });

  } catch (error) {
    console.error('❌ [STREAMS-API] Error in debug endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
