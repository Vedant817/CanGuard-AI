import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { getDID, type SimpleIdentity } from './didService';
import API_BASE_URL from '../config/api';

// Comprehensive logging utility for ceramic operations
const ceramicLog = (message: string, data?: any) => {
  console.log(`🗄️ [CERAMIC-SERVICE] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

const ceramicError = (message: string, error: any, data?: any) => {
  console.error(`❌ [CERAMIC-SERVICE] ${message}`, {
    error: error.message || error,
    errorType: error.constructor?.name || 'Unknown',
    timestamp: new Date().toISOString(),
    ...data
  });
  if (error.stack) {
    console.error(`❌ [CERAMIC-SERVICE] Error stack:`, error.stack);
  }
};

export interface DataStreamEntry {
  cid: string;
  timestamp: number;
  dataType: 'behavioral' | 'device' | 'typing';
  metadata?: any;
}

export interface UserDataStream {
  userId: string;
  did: string;
  entries: DataStreamEntry[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Initialize HTTP client for backend communication
 */
const initializeHttpClient = async (): Promise<boolean> => {
  const startTime = Date.now();
  ceramicLog('Initializing HTTP client for backend communication...', {
    apiBaseUrl: API_BASE_URL,
    timestamp: new Date().toISOString(),
    operation: 'initializeHttpClient'
  });
  
  try {
    ceramicLog('Step 1/2: Testing backend connectivity...');
    // Test if backend is reachable
    const response = await axios.get(`${API_BASE_URL}/health`, {
      timeout: 5000
    });
    
    if (response.status === 200) {
      ceramicLog('✅ Backend connectivity confirmed');
    } else {
      ceramicLog('⚠️ Backend responded but with non-200 status', {
        status: response.status
      });
    }

    ceramicLog('Step 2/2: Verifying DID availability...');
    const did = await getDID();
    if (did) {
      ceramicLog('✅ DID available for operations', {
        didId: did.did
      });
    } else {
      ceramicLog('⚠️ No DID available - some operations may fail');
    }

    const endTime = Date.now();
    ceramicLog('🎉 HTTP client initialized successfully!', {
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true
    });

    return true;
  } catch (error) {
    const endTime = Date.now();
    ceramicError('HTTP client initialization failed!', error, {
      apiBaseUrl: API_BASE_URL,
      processingTime: `${endTime - startTime}ms`,
      success: false
    });
    
    // Return true anyway - we'll fall back to local storage
    ceramicLog('⚠️ Falling back to local storage mode');
    return true;
  }
};

/**
 * Create a new data stream for user
 */
export const createDataStream = async (userId: string): Promise<string | null> => {
  const startTime = Date.now();
  ceramicLog('Starting data stream creation process...', {
    userId: userId,
    timestamp: new Date().toISOString(),
    operation: 'createDataStream'
  });
  
  try {
    ceramicLog('Step 1/4: Initializing HTTP client...');
    await initializeHttpClient();
    ceramicLog('✅ HTTP client ready');

    ceramicLog('Step 2/4: Retrieving user DID...');
    const did = await getDID();
    if (!did) {
      throw new Error('No DID available for creating data stream');
    }
    ceramicLog('✅ DID retrieved', {
      didId: did.did
    });

    ceramicLog('Step 3/4: Creating initial stream data...');
    const streamId = `stream_${userId}_${Date.now()}`;
    const initialData: UserDataStream = {
      userId,
      did: did.did,
      entries: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    ceramicLog('✅ Initial stream data created', {
      streamId: streamId,
      didId: did.did
    });

    ceramicLog('Step 4/4: Storing stream data...');
    try {
      // Try to create stream via backend API
      const response = await axios.post(`${API_BASE_URL}/api/streams`, {
        streamId,
        userId,
        did: did.did,
        initialData
      }, {
        timeout: 10000
      });
      
      if (response.status === 201) {
        ceramicLog('✅ Stream created via backend API', {
          streamId: response.data.streamId
        });
        return response.data.streamId;
      }
    } catch (apiError) {
      let errorMessage = 'Unknown error';
      if (apiError instanceof Error) {
        errorMessage = apiError.message;
      } else if (typeof apiError === 'object' && apiError !== null && 'message' in apiError) {
        errorMessage = (apiError as any).message;
      }
      ceramicLog('⚠️ Backend API unavailable, using local storage fallback', {
        error: errorMessage
      });
    }

    // Fallback to local storage
    await AsyncStorage.setItem(`stream_${streamId}`, JSON.stringify(initialData));
    ceramicLog('✅ Stream stored in local storage as fallback');

    const endTime = Date.now();
    ceramicLog('🎉 Data stream created successfully!', {
      streamId: streamId,
      userId: userId,
      method: 'local_storage_fallback',
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true
    });

    return streamId;
  } catch (error) {
    const endTime = Date.now();
    ceramicError('Data stream creation failed!', error, {
      userId,
      processingTime: `${endTime - startTime}ms`,
      success: false
    });
    return null;
  }
};

/**
 * Add CID to user's data stream
 */
export const addCID = async (
  streamId: string, 
  cid: string, 
  dataType: 'behavioral' | 'device' | 'typing',
  metadata?: any
): Promise<boolean> => {
  const startTime = Date.now();
  ceramicLog('Starting CID addition to data stream...', {
    streamId: streamId,
    cid: cid,
    dataType: dataType,
    hasMetadata: !!metadata,
    timestamp: new Date().toISOString(),
    operation: 'addCID'
  });
  
  try {
    ceramicLog('Step 1/4: Creating new data entry...');
    const newEntry: DataStreamEntry = {
      cid,
      timestamp: Date.now(),
      dataType,
      metadata
    };
    ceramicLog('✅ New data entry created', {
      entryTimestamp: new Date(newEntry.timestamp).toISOString()
    });

    ceramicLog('Step 2/4: Attempting backend API update...');
    try {
      const response = await axios.post(`${API_BASE_URL}/api/streams/${streamId}/entries`, {
        entry: newEntry
      }, {
        timeout: 8000
      });
      
      if (response.status === 200) {
        const endTime = Date.now();
        ceramicLog('🎉 CID added via backend API successfully!', {
          cid,
          streamId,
          totalEntries: response.data.totalEntries,
          method: 'backend_api',
          processingTime: `${endTime - startTime}ms`,
          timestamp: new Date().toISOString(),
          success: true
        });
        return true;
      }
    } catch (apiError) {
      let errorMessage = 'Unknown error';
      if (apiError instanceof Error) {
        errorMessage = apiError.message;
      } else if (typeof apiError === 'object' && apiError !== null && 'message' in apiError) {
        errorMessage = String((apiError as any).message);
      }
      ceramicLog('⚠️ Backend API unavailable, using local storage fallback', {
        error: errorMessage
      });
    }

    ceramicLog('Step 3/4: Loading current stream data from local storage...');
    const currentDataStr = await AsyncStorage.getItem(`stream_${streamId}`);
    let currentData: UserDataStream;
    
    if (currentDataStr) {
      currentData = JSON.parse(currentDataStr);
      ceramicLog('✅ Current stream data loaded', {
        currentEntries: currentData.entries.length
      });
    } else {
      // Create default stream if not exists
      currentData = {
        userId: 'unknown',
        did: 'unknown',
        entries: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      ceramicLog('⚠️ No existing stream found, created default structure');
    }

    ceramicLog('Step 4/4: Updating stream with new entry...');
    const updatedData: UserDataStream = {
      ...currentData,
      entries: [...currentData.entries, newEntry],
      updatedAt: Date.now()
    };

    await AsyncStorage.setItem(`stream_${streamId}`, JSON.stringify(updatedData));
    ceramicLog('✅ Stream updated in local storage');

    const endTime = Date.now();
    ceramicLog('🎉 CID added to data stream successfully!', {
      cid,
      streamId,
      totalEntries: updatedData.entries.length,
      method: 'local_storage_fallback',
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true
    });

    return true;
  } catch (error) {
    const endTime = Date.now();
    ceramicError('CID addition to data stream failed!', error, {
      streamId,
      cid,
      dataType,
      processingTime: `${endTime - startTime}ms`,
      success: false
    });
    return false;
  }
};

/**
 * Get all CIDs from user's data stream
 */
export const getCIDs = async (streamId: string): Promise<DataStreamEntry[]> => {
  const startTime = Date.now();
  ceramicLog('Starting CID retrieval from data stream...', {
    streamId: streamId,
    timestamp: new Date().toISOString(),
    operation: 'getCIDs'
  });
  
  try {
    ceramicLog('Step 1/3: Attempting backend API retrieval...');
    try {
      const response = await axios.get(`${API_BASE_URL}/api/streams/${streamId}/entries`, {
        timeout: 5000
      });
      
      if (response.status === 200 && response.data.entries) {
        const entries = response.data.entries;
        const endTime = Date.now();
        ceramicLog('🎉 CIDs retrieved via backend API successfully!', {
          totalEntries: entries.length,
          streamId,
          method: 'backend_api',
          processingTime: `${endTime - startTime}ms`,
          timestamp: new Date().toISOString(),
          success: true
        });
        return entries;
      }
    } catch (apiError: any) {
      let errorMessage = 'Unknown error';
      if (apiError && typeof apiError === 'object') {
        if ('message' in apiError && typeof apiError.message === 'string') {
          errorMessage = apiError.message;
        } else if ('toString' in apiError && typeof apiError.toString === 'function') {
          errorMessage = apiError.toString();
        }
      }
      ceramicLog('⚠️ Backend API unavailable, using local storage fallback', {
        error: errorMessage
      });
    }

    ceramicLog('Step 2/3: Loading from local storage...');
    const streamDataStr = await AsyncStorage.getItem(`stream_${streamId}`);
    
    if (!streamDataStr) {
      ceramicLog('⚠️ No stream data found in local storage', {
        streamId: streamId
      });
      return [];
    }

    ceramicLog('Step 3/3: Parsing stream data...');
    const streamData: UserDataStream = JSON.parse(streamDataStr);
    const entries = streamData.entries || [];
    ceramicLog('✅ Stream data parsed successfully');

    const endTime = Date.now();
    ceramicLog('🎉 CIDs retrieved from local storage successfully!', {
      totalEntries: entries.length,
      streamId,
      method: 'local_storage_fallback',
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true
    });

    return entries;
  } catch (error) {
    const endTime = Date.now();
    ceramicError('CID retrieval from data stream failed!', error, {
      streamId,
      processingTime: `${endTime - startTime}ms`,
      success: false
    });
    return [];
  }
};

/**
 * Get recent CIDs from user's data stream (last N minutes)
 */
export const getRecentCIDs = async (
  streamId: string, 
  minutesBack: number = 2
): Promise<DataStreamEntry[]> => {
  const startTime = Date.now();
  ceramicLog('Starting recent CIDs retrieval...', {
    streamId: streamId,
    minutesBack: minutesBack,
    timestamp: new Date().toISOString(),
    operation: 'getRecentCIDs'
  });
  
  try {
    ceramicLog('Step 1/3: Getting all entries from stream...');
    const allEntries = await getCIDs(streamId);
    ceramicLog('✅ All entries retrieved', {
      totalEntries: allEntries.length
    });

    ceramicLog('Step 2/3: Calculating time cutoff...');
    const cutoffTime = Date.now() - (minutesBack * 60 * 1000);
    const cutoffDate = new Date(cutoffTime).toISOString();
    ceramicLog('✅ Time cutoff calculated', {
      cutoffTime: cutoffDate,
      minutesBack: minutesBack
    });
    
    ceramicLog('Step 3/3: Filtering recent entries...');
    const recentEntries = allEntries.filter(entry => entry.timestamp >= cutoffTime);
    ceramicLog('✅ Recent entries filtered');

    const endTime = Date.now();
    ceramicLog('🎉 Recent CIDs retrieved successfully!', {
      totalEntries: allEntries.length,
      recentEntries: recentEntries.length,
      minutesBack: minutesBack,
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true
    });

    return recentEntries;
  } catch (error) {
    const endTime = Date.now();
    ceramicError('Recent CIDs retrieval failed!', error, {
      streamId,
      minutesBack,
      processingTime: `${endTime - startTime}ms`,
      success: false
    });
    return [];
  }
};

/**
 * Get CIDs by data type
 */
export const getCIDsByType = async (
  streamId: string, 
  dataType: 'behavioral' | 'device' | 'typing'
): Promise<DataStreamEntry[]> => {
  const startTime = Date.now();
  ceramicLog('Starting CIDs retrieval by type...', {
    streamId: streamId,
    dataType: dataType,
    timestamp: new Date().toISOString(),
    operation: 'getCIDsByType'
  });
  
  try {
    ceramicLog('Step 1/2: Getting all entries from stream...');
    const allEntries = await getCIDs(streamId);
    ceramicLog('✅ All entries retrieved', {
      totalEntries: allEntries.length
    });

    ceramicLog('Step 2/2: Filtering entries by type...');
    const filteredEntries = allEntries.filter(entry => entry.dataType === dataType);
    ceramicLog('✅ Entries filtered by type');

    const endTime = Date.now();
    ceramicLog('🎉 CIDs by type retrieved successfully!', {
      dataType: dataType,
      filteredCount: filteredEntries.length,
      totalCount: allEntries.length,
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true
    });

    return filteredEntries;
  } catch (error) {
    const endTime = Date.now();
    ceramicError('CIDs by type retrieval failed!', error, {
      streamId,
      dataType,
      processingTime: `${endTime - startTime}ms`,
      success: false
    });
    return [];
  }
};

/**
 * Get user's stream metadata
 */
export const getStreamMetadata = async (streamId: string): Promise<UserDataStream | null> => {
  const startTime = Date.now();
  ceramicLog('Starting stream metadata retrieval...', {
    streamId: streamId,
    timestamp: new Date().toISOString(),
    operation: 'getStreamMetadata'
  });
  
  try {
    ceramicLog('Step 1/2: Loading stream data from local storage...');
    const streamDataStr = await AsyncStorage.getItem(`stream_${streamId}`);
    
    if (!streamDataStr) {
      ceramicLog('⚠️ No stream metadata found', {
        streamId: streamId
      });
      return null;
    }

    ceramicLog('Step 2/2: Parsing stream metadata...');
    const metadata: UserDataStream = JSON.parse(streamDataStr);
    ceramicLog('✅ Stream metadata parsed successfully');

    const endTime = Date.now();
    ceramicLog('🎉 Stream metadata retrieved successfully!', {
      userId: metadata.userId,
      entriesCount: metadata.entries?.length || 0,
      createdAt: new Date(metadata.createdAt).toISOString(),
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true
    });

    return metadata;
  } catch (error) {
    const endTime = Date.now();
    ceramicError('Stream metadata retrieval failed!', error, {
      streamId,
      processingTime: `${endTime - startTime}ms`,
      success: false
    });
    return null;
  }
};

/**
 * Update stream metadata
 */
export const updateStreamMetadata = async (
  streamId: string, 
  metadata: Partial<UserDataStream>
): Promise<boolean> => {
  const startTime = Date.now();
  ceramicLog('Starting stream metadata update...', {
    streamId: streamId,
    hasMetadata: !!metadata,
    timestamp: new Date().toISOString(),
    operation: 'updateStreamMetadata'
  });
  
  try {
    ceramicLog('Step 1/3: Loading current stream data...');
    const currentDataStr = await AsyncStorage.getItem(`stream_${streamId}`);
    
    if (!currentDataStr) {
      throw new Error('Stream not found for metadata update');
    }

    const currentData: UserDataStream = JSON.parse(currentDataStr);
    ceramicLog('✅ Current stream data loaded');

    ceramicLog('Step 2/3: Merging metadata updates...');
    const updatedData = {
      ...currentData,
      ...metadata,
      updatedAt: Date.now()
    };
    ceramicLog('✅ Metadata merged successfully');

    ceramicLog('Step 3/3: Saving updated stream data...');
    await AsyncStorage.setItem(`stream_${streamId}`, JSON.stringify(updatedData));
    ceramicLog('✅ Updated stream data saved');

    const endTime = Date.now();
    ceramicLog('🎉 Stream metadata updated successfully!', {
      streamId: streamId,
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true
    });

    return true;
  } catch (error) {
    const endTime = Date.now();
    ceramicError('Stream metadata update failed!', error, {
      streamId,
      processingTime: `${endTime - startTime}ms`,
      success: false
    });
    return false;
  }
};

/**
 * Clean up old entries (remove entries older than specified days)
 */
export const cleanupOldEntries = async (
  streamId: string, 
  daysToKeep: number = 30
): Promise<boolean> => {
  const startTime = Date.now();
  ceramicLog('Starting old entries cleanup...', {
    streamId: streamId,
    daysToKeep: daysToKeep,
    timestamp: new Date().toISOString(),
    operation: 'cleanupOldEntries'
  });
  
  try {
    ceramicLog('Step 1/4: Loading current stream data...');
    const currentDataStr = await AsyncStorage.getItem(`stream_${streamId}`);
    
    if (!currentDataStr) {
      ceramicLog('⚠️ No stream data found for cleanup', {
        streamId: streamId
      });
      return true; // Consider it successful if there's nothing to clean
    }

    const currentData: UserDataStream = JSON.parse(currentDataStr);
    ceramicLog('✅ Current stream data loaded', {
      totalEntries: currentData.entries.length
    });

    ceramicLog('Step 2/4: Calculating cutoff time...');
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const cutoffDate = new Date(cutoffTime).toISOString();
    ceramicLog('✅ Cutoff time calculated', {
      cutoffDate: cutoffDate,
      daysToKeep: daysToKeep
    });
    
    ceramicLog('Step 3/4: Filtering old entries...');
    const filteredEntries = currentData.entries.filter(
      entry => entry.timestamp >= cutoffTime
    );
    const removedCount = currentData.entries.length - filteredEntries.length;
    ceramicLog('✅ Old entries filtered', {
      originalCount: currentData.entries.length,
      filteredCount: filteredEntries.length,
      removedCount: removedCount
    });

    if (removedCount > 0) {
      ceramicLog('Step 4/4: Saving cleaned stream data...');
      const updatedData: UserDataStream = {
        ...currentData,
        entries: filteredEntries,
        updatedAt: Date.now()
      };

      await AsyncStorage.setItem(`stream_${streamId}`, JSON.stringify(updatedData));
      ceramicLog('✅ Cleaned stream data saved');
    } else {
      ceramicLog('Step 4/4: No cleanup needed - all entries are recent');
    }

    const endTime = Date.now();
    ceramicLog('🎉 Old entries cleanup completed successfully!', {
      streamId: streamId,
      removedCount: removedCount,
      remainingCount: filteredEntries.length,
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true
    });

    return true;
  } catch (error) {
    const endTime = Date.now();
    ceramicError('Old entries cleanup failed!', error, {
      streamId,
      daysToKeep,
      processingTime: `${endTime - startTime}ms`,
      success: false
    });
    return false;
  }
};
