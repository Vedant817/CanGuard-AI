import { 
  initializeBlockchainForUser, 
  storeDataOnChain, 
  getBlockchainStatus,
  cleanupBlockchainData
} from './blockchainService';
import { initializeDID, getDID } from './didService';
import { initializeUserEncryption, verifyEncryption } from './encryptionService';

// Test logging utility
const testLog = (message: string, data?: any) => {
  console.log(`🧪 [BLOCKCHAIN-TEST] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

const testError = (message: string, error: any, data?: any) => {
  console.error(`❌ [BLOCKCHAIN-TEST] ${message}`, {
    error: error.message || error,
    errorType: error.constructor?.name || 'Unknown',
    timestamp: new Date().toISOString(),
    ...data
  });
  if (error.stack) {
    console.error(`❌ [BLOCKCHAIN-TEST] Error stack:`, error.stack);
  }
};

/**
 * Comprehensive test of blockchain integration with detailed logging
 */
export const runBlockchainTests = async (): Promise<boolean> => {
  const startTime = Date.now();
  testLog('🚀 Starting comprehensive blockchain integration tests...', {
    timestamp: new Date().toISOString(),
    testSuite: 'BlockchainIntegrationTests'
  });

  try {
    // Test 1: Initialize blockchain for a test user
    testLog('Test 1/6: Testing blockchain initialization...');
    const userId = `test_user_${Date.now()}`;
    const initResult = await initializeBlockchainForUser(userId);
    
    if (!initResult.success) {
      throw new Error(`Blockchain initialization failed: ${initResult.error}`);
    }
    testLog('✅ Test 1 PASSED: Blockchain initialization successful', {
      userId: userId,
      streamId: initResult.data?.streamId,
      didId: initResult.data?.did
    });

    // Test 2: Check blockchain status
    testLog('Test 2/6: Testing blockchain status check...');
    const statusResult = await getBlockchainStatus();
    
    if (!statusResult.success) {
      throw new Error(`Status check failed: ${statusResult.error}`);
    }
    testLog('✅ Test 2 PASSED: Blockchain status check successful', {
      initialized: statusResult.data?.initialized,
      didAvailable: statusResult.data?.didAvailable,
      encryptionVerified: statusResult.data?.encryptionVerified,
      dataEntriesCount: statusResult.data?.dataEntriesCount
    });

    // Test 3: Test DID functionality
    testLog('Test 3/6: Testing DID functionality...');
    const did = await getDID();
    if (!did) {
      throw new Error('DID retrieval failed');
    }
    testLog('✅ Test 3 PASSED: DID functionality working', {
      didId: did.did,
      created: did.created,
      hasPublicKey: !!did.publicKey,
      hasPrivateKey: !!did.privateKey
    });

    // Test 4: Test encryption functionality
    testLog('Test 4/6: Testing encryption functionality...');
    const encryptionVerified = await verifyEncryption();
    if (!encryptionVerified) {
      throw new Error('Encryption verification failed');
    }
    testLog('✅ Test 4 PASSED: Encryption functionality working');

    // Test 5: Test data storage on blockchain
    testLog('Test 5/6: Testing blockchain data storage...');
    const testBehavioralData = {
      typingStats: {
        wpm: 65,
        accuracy: 0.95,
        rhythm: [120, 110, 130, 125]
      },
      deviceMetrics: {
        screenResolution: '1080x1920',
        deviceModel: 'TestDevice',
        orientation: 'portrait'
      },
      timestamp: Date.now(),
      sessionId: `test_session_${Date.now()}`
    };

    const storeResult = await storeDataOnChain(testBehavioralData);
    if (!storeResult.success) {
      throw new Error(`Data storage failed: ${storeResult.error}`);
    }
    testLog('✅ Test 5 PASSED: Blockchain data storage successful', {
      cid: storeResult.data?.cid,
      streamId: storeResult.data?.streamId,
      pinned: storeResult.data?.pinned
    });

    // Test 6: Test cleanup functionality
    testLog('Test 6/6: Testing blockchain cleanup...');
    const cleanupResult = await cleanupBlockchainData();
    if (!cleanupResult.success) {
      throw new Error(`Cleanup failed: ${cleanupResult.error}`);
    }
    testLog('✅ Test 6 PASSED: Blockchain cleanup successful', {
      cleanedPermissions: cleanupResult.data?.cleanedPermissions
    });

    const endTime = Date.now();
    testLog('🎉 ALL BLOCKCHAIN TESTS COMPLETED SUCCESSFULLY!', {
      totalTests: 6,
      passedTests: 6,
      failedTests: 0,
      totalTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      overallResult: 'SUCCESS'
    });

    return true;

  } catch (error) {
    const endTime = Date.now();
    testError('Blockchain integration tests failed!', error, {
      totalTime: `${endTime - startTime}ms`,
      overallResult: 'FAILED'
    });
    return false;
  }
};

/**
 * Quick test to verify logging is working
 */
export const testLogging = async (): Promise<void> => {
  testLog('🔍 Testing logging functionality...');
  
  try {
    // Test successful operation log
    testLog('✅ This is a successful operation log', {
      testData: 'sample data',
      timestamp: new Date().toISOString()
    });
    
    // Test error log
    throw new Error('This is a test error for logging demonstration');
    
  } catch (error) {
    testError('This is an intentional test error', error, {
      testContext: 'logging demonstration'
    });
  }
  
  testLog('🎯 Logging test completed - check console for detailed logs');
};

export default {
  runBlockchainTests,
  testLogging
};
