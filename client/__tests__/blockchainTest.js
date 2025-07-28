// Blockchain Integration Test Suite
import blockchainService from '../services/blockchainService';
import { encryptData, decryptData, verifyEncryption } from '../services/encryptionService';
import { getBehavioralStatus } from '../services/behavioralService';

// Test logging utility
const testLog = (testName, result, data = {}) => {
  const status = result ? '✅ PASS' : '❌ FAIL';
  console.log(`🧪 [${testName}] ${status}`, data);
};

// Test Suite
export const runBlockchainTests = async () => {
  console.log('🚀 Starting Blockchain Integration Tests...\n');

  // Test 1: Blockchain Status Check
  try {
    console.log('📋 Test 1: Checking Blockchain Status...');
    const status = await blockchainService.getBlockchainStatus();
    testLog('Blockchain Status Check', status.success, {
      initialized: status.data?.initialized,
      didAvailable: status.data?.didAvailable,
      encryptionVerified: status.data?.encryptionVerified
    });
  } catch (error) {
    testLog('Blockchain Status Check', false, { error: error.message });
  }

  // Test 2: Encryption Verification
  try {
    console.log('\n🔐 Test 2: Testing Encryption...');
    const encryptionWorks = await verifyEncryption();
    testLog('Encryption Verification', encryptionWorks);
  } catch (error) {
    testLog('Encryption Verification', false, { error: error.message });
  }

  // Test 3: Data Storage Test
  try {
    console.log('\n💾 Test 3: Testing Data Storage...');
    const testData = {
      typingStats: {
        wpm: 45,
        accuracy: 95,
        averageKeyHoldTime: 120,
        averageFlightTime: 80
      },
      deviceMetrics: {
        deviceUUID: 'test-device-123',
        ipAddress: '192.168.1.1',
        gpsLocation: {
          latitude: 12.9716,
          longitude: 77.5946
        },
        deviceInfo: {
          brand: 'TestBrand',
          model: 'TestModel'
        }
      },
      timestamp: Date.now(),
      sessionId: `test-session-${Date.now()}`
    };

    const storeResult = await blockchainService.storeDataOnChain(testData);
    testLog('Data Storage Test', storeResult.success, {
      cid: storeResult.data?.cid,
      streamId: storeResult.data?.streamId
    });
  } catch (error) {
    testLog('Data Storage Test', false, { error: error.message });
  }

  // Test 4: Permission Request Test
  try {
    console.log('\n🔒 Test 4: Testing Permission System...');
    const permissionRequest = {
      purpose: 'security_analysis',
      dataTypes: ['behavioral'],
      timeRange: 2,
      requestId: `test-req-${Date.now()}`
    };

    const permissionResult = await blockchainService.requestDataPermission(permissionRequest);
    testLog('Permission Request Test', permissionResult.success, {
      requestId: permissionRequest.requestId,
      availableDataPoints: permissionResult.data?.availableDataPoints
    });
  } catch (error) {
    testLog('Permission Request Test', false, { error: error.message });
  }

  console.log('\n🏁 Blockchain Integration Tests Completed!\n');
};

// Export for use in your app
export default runBlockchainTests;
