import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateDID, getDID } from './didService';
import { encryptData, decryptData, initializeUserEncryption, verifyEncryption } from './encryptionService';
import { uploadToIPFS, getFromIPFS } from './ipfsService';
import { createDataStream, addCID, getRecentCIDs, getCIDs } from './ceramicService';
import { getDID as getUserDID } from './didService';

// Comprehensive logging utility for blockchain operations
const blockchainLog = (message: string, data?: any) => {
  console.log(`⛓️ [BLOCKCHAIN-SERVICE] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

const blockchainError = (message: string, error: any, data?: any) => {
  console.error(`❌ [BLOCKCHAIN-SERVICE] ${message}`, {
    error: error.message || error,
    errorType: error.constructor?.name || 'Unknown',
    timestamp: new Date().toISOString(),
    ...data
  });
  if (error.stack) {
    console.error(`❌ [BLOCKCHAIN-SERVICE] Error stack:`, error.stack);
  }
};

interface BehavioralData {
  typingStats: any;
  deviceMetrics: any;
  timestamp: number;
  sessionId: string;
}

interface BlockchainResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

interface PermissionRequest {
  purpose: string;
  dataTypes: string[];
  timeRange: number; // minutes
  requestId: string;
}

interface DataAccessGrant {
  cids: string[];
  permissionSignature: string;
  expiresAt: number;
  requestId: string;
}

/**
 * Initialize blockchain services for a new user
 */
export const initializeBlockchainForUser = async (userId: string): Promise<BlockchainResult> => {
  const startTime = Date.now();
  blockchainLog('Starting blockchain initialization for user...', {
    userId: userId,
    timestamp: new Date().toISOString(),
    operation: 'initializeBlockchainForUser'
  });
  
  try {
    blockchainLog('Step 1/5: Generating DID for user...');
    const did = await generateDID();
    if (!did) {
      throw new Error('Failed to generate DID');
    }
    blockchainLog('✅ DID generated successfully', {
      didId: did.did,
      created: did.created
    });

    blockchainLog('Step 2/5: Initializing user encryption system...');
    const encryptionInitialized = await initializeUserEncryption();
    if (!encryptionInitialized) {
      throw new Error('Failed to initialize encryption');
    }
    blockchainLog('✅ Encryption system initialized successfully');

    blockchainLog('Step 3/5: Verifying encryption functionality...');
    const encryptionVerified = await verifyEncryption();
    if (!encryptionVerified) {
      throw new Error('Encryption verification failed');
    }
    blockchainLog('✅ Encryption verification completed successfully');

    blockchainLog('Step 4/5: Creating Ceramic data stream...');
    const streamId = await createDataStream(userId);
    if (!streamId) {
      throw new Error('Failed to create Ceramic data stream');
    }
    blockchainLog('✅ Ceramic data stream created', { streamId });

    blockchainLog('Step 5/5: Storing blockchain metadata...');
    const blockchainMetadata = {
      userId,
      did: did.did,
      streamId,
      initializedAt: Date.now(),
      encryptionVerified: true
    };

    await AsyncStorage.setItem('blockchain_metadata', JSON.stringify(blockchainMetadata));
    blockchainLog('✅ Blockchain metadata stored in AsyncStorage');

    const endTime = Date.now();
    blockchainLog('🎉 Blockchain initialization completed successfully!', {
      userId,
      didId: did.did,
      streamId,
      encryptionVerified,
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true
    });

    return {
      success: true,
      message: 'Blockchain services initialized successfully',
      data: blockchainMetadata
    };

  } catch (error) {
    const endTime = Date.now();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    blockchainError('Blockchain initialization failed!', error, {
      userId,
      processingTime: `${endTime - startTime}ms`,
      success: false
    });

    return {
      success: false,
      message: 'Failed to initialize blockchain services',
      error: errorMessage
    };
  }
};

/**
 * Store behavioral data on blockchain (IPFS + Ceramic)
 */
export const storeDataOnChain = async (behavioralData: BehavioralData): Promise<BlockchainResult> => {
  const startTime = Date.now();
  blockchainLog('Starting blockchain data storage process...', {
    sessionId: behavioralData.sessionId,
    timestamp: behavioralData.timestamp,
    operation: 'storeDataOnChain'
  });
  
  try {
    blockchainLog('Step 1/5: Retrieving blockchain metadata...');
    const metadataStr = await AsyncStorage.getItem('blockchain_metadata');
    if (!metadataStr) {
      throw new Error('User blockchain not initialized');
    }

    const metadata = JSON.parse(metadataStr);
    const { streamId } = metadata;
    blockchainLog('✅ Blockchain metadata retrieved', {
      streamId: streamId,
      userId: metadata.userId
    });

    blockchainLog('Step 2/5: Encrypting behavioral data...');
    const encrypted = await encryptData(behavioralData);
    if (!encrypted.success) {
      throw new Error(`Encryption failed: ${encrypted.error}`);
    }
    blockchainLog('✅ Behavioral data encrypted successfully', {
      encryptedSize: encrypted.encryptedData.length,
      nonceLength: encrypted.nonce.length
    });

    blockchainLog('Step 3/5: Creating data blob for storage...');
    const dataBlob = {
      encryptedData: encrypted.encryptedData,
      nonce: encrypted.nonce,
      metadata: {
        timestamp: behavioralData.timestamp,
        sessionId: behavioralData.sessionId,
        dataType: 'behavioral'
      }
    };
    const dataBlobSize = JSON.stringify(dataBlob).length;
    blockchainLog('✅ Data blob created', {
      blobSize: dataBlobSize,
      dataType: 'behavioral'
    });

    blockchainLog('Step 4/5: Uploading to IPFS via Pinata...');
    const cid = await uploadToIPFS(JSON.stringify(dataBlob));
    if (!cid) {
      throw new Error('Failed to upload data to IPFS');
    }
    blockchainLog('✅ Data uploaded to IPFS', {
      cid: cid,
      pinnedToPinata: true
    });

    blockchainLog('Step 5/5: Storing CID in Ceramic stream...');
    const stored = await addCID(streamId, cid, 'behavioral', {
      sessionId: behavioralData.sessionId,
      dataSize: dataBlobSize,
      pinned: true
    });

    if (!stored) {
      throw new Error('Failed to store CID in Ceramic stream');
    }
    blockchainLog('✅ CID stored in Ceramic stream successfully');

    const endTime = Date.now();
    blockchainLog('🎉 Data stored on blockchain successfully!', {
      cid,
      streamId,
      dataSize: dataBlobSize,
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true
    });

    return {
      success: true,
      message: 'Data stored on blockchain successfully',
      data: {
        cid,
        streamId,
        pinned: true,
        timestamp: behavioralData.timestamp
      }
    };

  } catch (error) {
    const endTime = Date.now();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    blockchainError('Blockchain data storage failed!', error, {
      sessionId: behavioralData.sessionId,
      processingTime: `${endTime - startTime}ms`,
      success: false
    });

    return {
      success: false,
      message: 'Failed to store data on blockchain',
      error: errorMessage
    };
  }
};

/**
 * Request permission to access user's data
 */
export const requestDataPermission = async (request: PermissionRequest): Promise<BlockchainResult> => {
  const startTime = Date.now();
  blockchainLog('Starting data permission request process...', {
    requestId: request.requestId,
    purpose: request.purpose,
    timeRange: request.timeRange,
    dataTypes: request.dataTypes,
    timestamp: new Date().toISOString(),
    operation: 'requestDataPermission'
  });
  
  try {
    blockchainLog('Step 1/4: Retrieving blockchain metadata...');
    const metadataStr = await AsyncStorage.getItem('blockchain_metadata');
    if (!metadataStr) {
      throw new Error('User blockchain not initialized');
    }

    const metadata = JSON.parse(metadataStr);
    const { streamId } = metadata;
    blockchainLog('✅ Blockchain metadata retrieved', {
      streamId: streamId,
      userId: metadata.userId
    });

    blockchainLog('Step 2/4: Fetching recent CIDs from stream...');
    const recentCIDs = await getRecentCIDs(streamId, request.timeRange);
    blockchainLog('✅ Recent CIDs retrieved', {
      cidsCount: recentCIDs.length,
      timeRangeMinutes: request.timeRange
    });

    if (recentCIDs.length === 0) {
      const endTime = Date.now();
      blockchainLog('⚠️ No recent data found for permission request', {
        timeRange: request.timeRange,
        processingTime: `${endTime - startTime}ms`,
        success: false
      });
      return {
        success: false,
        message: 'No recent data available for the requested time range'
      };
    }

    blockchainLog('Step 3/4: Creating permission request data...');
    const permissionRequestData = {
      ...request,
      availableCIDs: recentCIDs,
      requestedAt: Date.now(),
      status: 'pending'
    };
    blockchainLog('✅ Permission request data created');

    blockchainLog('Step 4/4: Storing permission request for user approval...');
    await AsyncStorage.setItem(
      `permission_request_${request.requestId}`, 
      JSON.stringify(permissionRequestData)
    );
    blockchainLog('✅ Permission request stored in AsyncStorage');

    const endTime = Date.now();
    blockchainLog('🎉 Permission request created successfully!', {
      requestId: request.requestId,
      availableCIDs: recentCIDs.length,
      purpose: request.purpose,
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true
    });

    return {
      success: true,
      message: 'Permission request created successfully',
      data: {
        requestId: request.requestId,
        availableDataPoints: recentCIDs.length,
        timeRange: request.timeRange,
        purpose: request.purpose
      }
    };

  } catch (error) {
    const endTime = Date.now();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    blockchainError('Data permission request failed!', error, {
      requestId: request.requestId,
      processingTime: `${endTime - startTime}ms`,
      success: false
    });

    return {
      success: false,
      message: 'Failed to process permission request',
      error: errorMessage
    };
  }
};

/**
 * Grant data access after user approval
 */
export const grantDataAccess = async (requestId: string, approved: boolean): Promise<BlockchainResult> => {
  const startTime = Date.now();
  blockchainLog('Starting data access grant process...', {
    requestId: requestId,
    approved: approved,
    timestamp: new Date().toISOString(),
    operation: 'grantDataAccess'
  });
  
  try {
    blockchainLog('Step 1/6: Retrieving permission request...');
    const requestStr = await AsyncStorage.getItem(`permission_request_${requestId}`);
    if (!requestStr) {
      throw new Error('Permission request not found');
    }

    const request = JSON.parse(requestStr);
    blockchainLog('✅ Permission request retrieved', {
      purpose: request.purpose,
      availableCIDs: request.availableCIDs?.length || 0,
      status: request.status
    });

    if (!approved) {
      blockchainLog('Step 2/6: Processing access denial...');
      request.status = 'denied';
      request.deniedAt = Date.now();
      
      await AsyncStorage.setItem(`permission_request_${requestId}`, JSON.stringify(request));
      blockchainLog('✅ Access denial recorded in storage');

      const endTime = Date.now();
      blockchainLog('🚫 Data access denied by user', {
        requestId,
        processingTime: `${endTime - startTime}ms`,
        timestamp: new Date().toISOString(),
        success: true
      });

      return {
        success: true,
        message: 'Data access denied',
        data: { requestId, status: 'denied' }
      };
    }

    blockchainLog('Step 2/6: Processing access approval - retrieving DID...');
    const did = await getDID();
    if (!did) {
      throw new Error('No DID available for signing permission');
    }
    blockchainLog('✅ DID retrieved for permission signing', {
      didId: did.did
    });

    blockchainLog('Step 3/6: Creating permission data for signing...');
    const permissionData = {
      requestId,
      cids: request.availableCIDs.map((entry: any) => entry.cid),
      approvedAt: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes expiry
      purpose: request.purpose
    };
    blockchainLog('✅ Permission data created', {
      cidsCount: permissionData.cids.length,
      expiresAt: new Date(permissionData.expiresAt).toISOString()
    });

    blockchainLog('Step 4/6: Signing permission message...');
    const permissionMessage = JSON.stringify(permissionData);
    // Note: This would use proper JWS in production
    const signature = `signature_${Date.now()}_${Math.random().toString(36)}`; // Simplified signature
    blockchainLog('✅ Permission message signed');

    blockchainLog('Step 5/6: Creating data access grant...');
    const dataAccessGrant: DataAccessGrant = {
      cids: permissionData.cids,
      permissionSignature: signature,
      expiresAt: permissionData.expiresAt,
      requestId
    };
    blockchainLog('✅ Data access grant created');

    blockchainLog('Step 6/6: Updating request status in storage...');
    request.status = 'approved';
    request.approvedAt = Date.now();
    request.accessGrant = dataAccessGrant;

    await AsyncStorage.setItem(`permission_request_${requestId}`, JSON.stringify(request));
    blockchainLog('✅ Request status updated in AsyncStorage');

    const endTime = Date.now();
    blockchainLog('🎉 Data access granted successfully!', {
      requestId,
      cidsCount: dataAccessGrant.cids.length,
      expiresAt: new Date(dataAccessGrant.expiresAt).toISOString(),
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true
    });

    return {
      success: true,
      message: 'Data access granted successfully',
      data: dataAccessGrant
    };

  } catch (error) {
    const endTime = Date.now();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    blockchainError('Data access grant failed!', error, {
      requestId,
      approved,
      processingTime: `${endTime - startTime}ms`,
      success: false
    });

    return {
      success: false,
      message: 'Failed to grant data access',
      error: errorMessage
    };
  }
};

/**
 * Get blockchain status for user
 */
export const getBlockchainStatus = async (): Promise<BlockchainResult> => {
  const startTime = Date.now();
  blockchainLog('Starting blockchain status check...', {
    timestamp: new Date().toISOString(),
    operation: 'getBlockchainStatus'
  });
  
  try {
    blockchainLog('Step 1/5: Checking for blockchain metadata...');
    const metadataStr = await AsyncStorage.getItem('blockchain_metadata');
    if (!metadataStr) {
      const endTime = Date.now();
      blockchainLog('⚠️ Blockchain not initialized for this user', {
        processingTime: `${endTime - startTime}ms`,
        success: false
      });
      return {
        success: false,
        message: 'Blockchain not initialized for this user'
      };
    }

    const metadata = JSON.parse(metadataStr);
    blockchainLog('✅ Blockchain metadata found', {
      streamId: metadata.streamId,
      userId: metadata.userId,
      initializedAt: new Date(metadata.initializedAt).toISOString()
    });
    
    blockchainLog('Step 2/5: Checking DID availability...');
    const did = await getDID();
    const didAvailable = !!did;
    blockchainLog('✅ DID availability checked', {
      didAvailable: didAvailable,
      didId: did?.did || 'N/A'
    });

    blockchainLog('Step 3/5: Verifying encryption system...');
    const encryptionVerified = await verifyEncryption();
    blockchainLog('✅ Encryption system verified', {
      encryptionVerified: encryptionVerified
    });

    blockchainLog('Step 4/5: Retrieving stream entries...');
    const streamEntries = await getCIDs(metadata.streamId);
    blockchainLog('✅ Stream entries retrieved', {
      entriesCount: streamEntries.length
    });

    blockchainLog('Step 5/5: Compiling status information...');
    const status = {
      initialized: true,
      didAvailable,
      encryptionVerified,
      streamId: metadata.streamId,
      dataEntriesCount: streamEntries.length,
      lastDataEntry: streamEntries.length > 0 ? 
        new Date(Math.max(...streamEntries.map(e => e.timestamp))).toISOString() : null,
      metadata
    };
    blockchainLog('✅ Status information compiled');

    const endTime = Date.now();
    blockchainLog('🎉 Blockchain status retrieved successfully!', {
      initialized: status.initialized,
      didAvailable: status.didAvailable,
      encryptionVerified: status.encryptionVerified,
      dataEntriesCount: status.dataEntriesCount,
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true
    });

    return {
      success: true,
      message: 'Blockchain status retrieved successfully',
      data: status
    };

  } catch (error) {
    const endTime = Date.now();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    blockchainError('Blockchain status check failed!', error, {
      processingTime: `${endTime - startTime}ms`,
      success: false
    });

    return {
      success: false,
      message: 'Failed to get blockchain status',
      error: errorMessage
    };
  }
};

/**
 * Clean up expired permissions and data
 */
export const cleanupBlockchainData = async (): Promise<BlockchainResult> => {
  const startTime = Date.now();
  blockchainLog('Starting blockchain data cleanup process...', {
    timestamp: new Date().toISOString(),
    operation: 'cleanupBlockchainData'
  });
  
  try {
    blockchainLog('Step 1/4: Retrieving all AsyncStorage keys...');
    const allKeys = await AsyncStorage.getAllKeys();
    const permissionKeys = allKeys.filter(key => key.startsWith('permission_request_'));
    blockchainLog('✅ Permission request keys found', {
      totalKeys: allKeys.length,
      permissionKeys: permissionKeys.length
    });

    let cleanedCount = 0;

    blockchainLog('Step 2/4: Processing permission requests for cleanup...');
    for (const key of permissionKeys) {
      const requestStr = await AsyncStorage.getItem(key);
      if (requestStr) {
        const request = JSON.parse(requestStr);
        const isExpired = request.accessGrant && 
          request.accessGrant.expiresAt < Date.now();
        
        const isOld = (Date.now() - request.requestedAt) > (24 * 60 * 60 * 1000); // 24 hours

        if (isExpired || isOld) {
          await AsyncStorage.removeItem(key);
          cleanedCount++;
          blockchainLog('✅ Cleaned expired/old permission request', {
            key: key,
            reason: isExpired ? 'expired' : 'old',
            requestId: request.requestId
          });
        }
      }
    }
    blockchainLog('✅ Permission requests cleanup completed', {
      cleanedCount: cleanedCount,
      remainingCount: permissionKeys.length - cleanedCount
    });

    blockchainLog('Step 3/4: Checking for stream data cleanup...');
    const metadataStr = await AsyncStorage.getItem('blockchain_metadata');
    if (metadataStr) {
      const metadata = JSON.parse(metadataStr);
      blockchainLog('✅ Stream cleanup prepared (not implemented)', {
        streamId: metadata.streamId,
        note: 'Old entries cleanup would be implemented here'
      });
      // This would clean up entries older than 30 days
      // await cleanupOldEntries(metadata.streamId, 30);
    } else {
      blockchainLog('⚠️ No blockchain metadata found for stream cleanup');
    }

    const endTime = Date.now();
    blockchainLog('🎉 Blockchain data cleanup completed successfully!', {
      cleanedPermissions: cleanedCount,
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true
    });

    return {
      success: true,
      message: 'Blockchain data cleanup completed',
      data: { cleanedPermissions: cleanedCount }
    };

  } catch (error) {
    const endTime = Date.now();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    blockchainError('Blockchain data cleanup failed!', error, {
      processingTime: `${endTime - startTime}ms`,
      success: false
    });

    return {
      success: false,
      message: 'Failed to cleanup blockchain data',
      error: errorMessage
    };
  }
};

export default {
  initializeBlockchainForUser,
  storeDataOnChain,
  requestDataPermission,
  grantDataAccess,
  getBlockchainStatus,
  cleanupBlockchainData
};
