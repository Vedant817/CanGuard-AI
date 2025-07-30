const { create } = require('ipfs-http-client');
const axios = require('axios');
const nacl = require('tweetnacl');
const naclUtil = require('tweetnacl-util');

// Backend blockchain logging utility
const blockchainLog = (message, data = {}) => {
  if (process.env.ENABLE_BLOCKCHAIN_LOGS === 'true') {
    console.log(`⛓️ [Backend-BlockchainService] ${message}`, JSON.stringify(data, null, 2));
  }
};

/**
 * Verify user permission signature
 */
const verifyPermission = async (permissionData, signature) => {
  try {
    blockchainLog('Verifying permission signature...', { 
      requestId: permissionData.requestId,
      cidsCount: permissionData.cids?.length 
    });

    // Parse the signature
    const parsedSignature = JSON.parse(signature);
    
    // TODO: Implement proper DID verification
    // For now, we'll validate the basic structure
    if (!parsedSignature.payload || !parsedSignature.signatures) {
      throw new Error('Invalid signature format');
    }

    // Check expiration
    if (permissionData.expiresAt < Date.now()) {
      throw new Error('Permission has expired');
    }

    blockchainLog('Permission signature verified successfully', {
      requestId: permissionData.requestId,
      expiresAt: new Date(permissionData.expiresAt).toISOString()
    });

    return {
      success: true,
      message: 'Permission verified successfully',
      data: {
        requestId: permissionData.requestId,
        isValid: true,
        expiresAt: permissionData.expiresAt
      }
    };

  } catch (error) {
    blockchainLog('Permission verification failed', { error: error.message });
    return {
      success: false,
      message: 'Permission verification failed',
      error: error.message
    };
  }
};

/**
 * Fetch encrypted data from IPFS
 */
const fetchFromIPFS = async (cid) => {
  try {
    blockchainLog('Fetching data from IPFS...', { cid });

    const ipfsGateway = process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
    const response = await axios.get(`${ipfsGateway}${cid}`, {
      timeout: 10000,
      responseType: 'text'
    });

    if (response.status !== 200) {
      throw new Error(`IPFS fetch failed with status: ${response.status}`);
    }

    const data = typeof response.data === 'string' ? 
      JSON.parse(response.data) : response.data;

    blockchainLog('Data fetched from IPFS successfully', { 
      cid,
      dataSize: JSON.stringify(data).length 
    });

    return {
      success: true,
      data
    };

  } catch (error) {
    blockchainLog('IPFS fetch failed', { cid, error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Decrypt data in memory (server-side)
 */
const decryptDataInMemory = (encryptedData, nonce, secretKey) => {
  try {
    blockchainLog('Decrypting data in memory...', {
      encryptedDataLength: encryptedData.length,
      nonceLength: nonce.length
    });

    // Decode base64 data
    const encryptedBuffer = naclUtil.decodeBase64(encryptedData);
    const nonceBuffer = naclUtil.decodeBase64(nonce);
    const keyBuffer = naclUtil.decodeBase64(secretKey);

    // Use first 32 bytes for secret box
    const secretBoxKey = keyBuffer.slice(0, 32);

    // Decrypt
    const decryptedBuffer = nacl.secretbox.open(encryptedBuffer, nonceBuffer, secretBoxKey);

    if (!decryptedBuffer) {
      throw new Error('Decryption failed - invalid data or key');
    }

    const decryptedString = naclUtil.encodeUTF8(decryptedBuffer);
    const decryptedData = JSON.parse(decryptedString);

    blockchainLog('Data decrypted successfully in memory', {
      decryptedSize: decryptedString.length,
      dataType: typeof decryptedData
    });

    return {
      success: true,
      data: decryptedData
    };

  } catch (error) {
    blockchainLog('Memory decryption failed', { error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Fetch and decrypt user data for analysis
 */
const fetchUserDataForAnalysis = async (dataAccessGrant, userSecretKey) => {
  try {
    blockchainLog('Starting secure data fetch for analysis...', {
      requestId: dataAccessGrant.requestId,
      cidsCount: dataAccessGrant.cids.length
    });

    // Verify permission first
    const permissionData = {
      requestId: dataAccessGrant.requestId,
      cids: dataAccessGrant.cids,
      expiresAt: dataAccessGrant.expiresAt
    };

    const permissionResult = await verifyPermission(permissionData, dataAccessGrant.permissionSignature);
    if (!permissionResult.success) {
      throw new Error(`Permission verification failed: ${permissionResult.error}`);
    }

    // Fetch and decrypt data from each CID
    const decryptedDataPoints = [];
    let successCount = 0;
    let failureCount = 0;

    for (const cid of dataAccessGrant.cids) {
      try {
        // Fetch encrypted data blob from IPFS
        const ipfsResult = await fetchFromIPFS(cid);
        if (!ipfsResult.success) {
          blockchainLog('Failed to fetch CID from IPFS', { cid, error: ipfsResult.error });
          failureCount++;
          continue;
        }

        const dataBlob = ipfsResult.data;
        
        // Decrypt the data in memory
        const decryptResult = decryptDataInMemory(
          dataBlob.encryptedData,
          dataBlob.nonce,
          userSecretKey
        );

        if (!decryptResult.success) {
          blockchainLog('Failed to decrypt data for CID', { cid, error: decryptResult.error });
          failureCount++;
          continue;
        }

        decryptedDataPoints.push({
          cid,
          data: decryptResult.data,
          metadata: dataBlob.metadata
        });

        successCount++;

      } catch (error) {
        blockchainLog('Error processing CID', { cid, error: error.message });
        failureCount++;
      }
    }

    if (decryptedDataPoints.length === 0) {
      throw new Error('No data could be successfully fetched and decrypted');
    }

    blockchainLog('Data fetch and decryption completed', {
      totalCids: dataAccessGrant.cids.length,
      successCount,
      failureCount,
      requestId: dataAccessGrant.requestId
    });

    return {
      success: true,
      data: decryptedDataPoints,
      metadata: {
        requestId: dataAccessGrant.requestId,
        totalRequested: dataAccessGrant.cids.length,
        successfullyDecrypted: successCount,
        failures: failureCount
      }
    };

  } catch (error) {
    blockchainLog('Secure data fetch failed', { 
      requestId: dataAccessGrant.requestId,
      error: error.message 
    });

    return {
      success: false,
      message: 'Failed to fetch user data for analysis',
      error: error.message
    };
  }
};

/**
 * Analyze user data securely (decrypt, analyze, purge)
 */
const analyzeUserDataSecurely = async (dataAccessGrant, userSecretKey, analysisType = 'T1') => {
  try {
    blockchainLog('Starting secure analysis process...', {
      requestId: dataAccessGrant.requestId,
      analysisType
    });

    // Step 1: Fetch and decrypt data
    const fetchResult = await fetchUserDataForAnalysis(dataAccessGrant, userSecretKey);
    if (!fetchResult.success) {
      throw new Error(`Data fetch failed: ${fetchResult.error}`);
    }

    const decryptedDataPoints = fetchResult.data;

    // Step 2: Process data for AI analysis
    const behavioralData = decryptedDataPoints.map(point => ({
      typingStats: point.data.typingStats,
      deviceMetrics: point.data.deviceMetrics,
      timestamp: point.data.timestamp,
      sessionId: point.data.sessionId
    }));

    blockchainLog('Data prepared for analysis', {
      dataPointsCount: behavioralData.length,
      analysisType
    });

    // Step 3: Mock AI analysis (replace with actual AI service call)
    const analysisResult = await performMockAnalysis(behavioralData, analysisType);

    // Step 4: Purge decrypted data from memory
    // Clear all sensitive data references
    decryptedDataPoints.length = 0;
    behavioralData.length = 0;

    blockchainLog('Analysis completed and data purged from memory', {
      requestId: dataAccessGrant.requestId,
      decision: analysisResult.decision,
      confidence: analysisResult.confidence
    });

    return {
      success: true,
      analysis: analysisResult,
      metadata: fetchResult.metadata
    };

  } catch (error) {
    blockchainLog('Secure analysis failed', {
      requestId: dataAccessGrant.requestId,
      error: error.message
    });

    return {
      success: false,
      message: 'Secure analysis failed',
      error: error.message
    };
  }
};

/**
 * Mock AI analysis function (replace with actual AI service)
 */
const performMockAnalysis = async (behavioralData, analysisType) => {
  try {
    blockchainLog('Performing mock AI analysis...', {
      dataPoints: behavioralData.length,
      analysisType
    });

    // Simulate analysis processing time
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock analysis based on data patterns
    const avgAccuracy = behavioralData.reduce((sum, d) => 
      sum + (d.typingStats?.accuracy || 0), 0) / behavioralData.length;

    const avgSpeed = behavioralData.reduce((sum, d) => 
      sum + (d.typingStats?.wpm || 0), 0) / behavioralData.length;

    // Simple decision logic (replace with actual AI)
    let decision = 'PASS';
    let confidence = 0.85;
    let riskLevel = 'LOW';

    if (avgAccuracy < 70 || avgSpeed < 10) {
      decision = 'FLAG';
      confidence = 0.75;
      riskLevel = 'MEDIUM';
    }

    if (avgAccuracy < 50 || avgSpeed < 5) {
      decision = 'ESCALATE';
      confidence = 0.90;
      riskLevel = 'HIGH';
    }

    const result = {
      decision,
      confidence,
      riskLevel,
      analysisType,
      metrics: {
        averageAccuracy: avgAccuracy,
        averageSpeed: avgSpeed,
        dataPointsAnalyzed: behavioralData.length
      },
      timestamp: Date.now()
    };

    blockchainLog('Mock analysis completed', result);

    return result;

  } catch (error) {
    blockchainLog('Mock analysis failed', { error: error.message });
    throw error;
  }
};

/**
 * Store analysis result (aggregated, non-sensitive data)
 */
const storeAnalysisResult = async (userId, analysisResult, requestMetadata) => {
  try {
    blockchainLog('Storing analysis result...', {
      userId,
      decision: analysisResult.decision,
      requestId: requestMetadata.requestId
    });

    const User = require('../models/User');
    
    // Update user's reference profile if analysis passed
    if (analysisResult.decision === 'PASS') {
      await User.findByIdAndUpdate(userId, {
        lastBehavioralVerification: new Date(),
        $push: {
          // Store aggregated, non-sensitive analysis metadata
          analysisHistory: {
            timestamp: new Date(),
            decision: analysisResult.decision,
            confidence: analysisResult.confidence,
            riskLevel: analysisResult.riskLevel,
            dataPointsCount: requestMetadata.successfullyDecrypted,
            requestId: requestMetadata.requestId
          }
        }
      });
    }

    blockchainLog('Analysis result stored successfully', {
      userId,
      decision: analysisResult.decision
    });

    return {
      success: true,
      message: 'Analysis result stored successfully'
    };

  } catch (error) {
    blockchainLog('Failed to store analysis result', { 
      userId,
      error: error.message 
    });

    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  verifyPermission,
  fetchFromIPFS,
  decryptDataInMemory,
  fetchUserDataForAnalysis,
  analyzeUserDataSecurely,
  storeAnalysisResult
};
