import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Debug utility to view all stored data
export const viewAllStoredData = async () => {
  console.log('🔍 === DEBUGGING ALL STORED DATA ===');
  
  try {
    // Get all AsyncStorage keys
    const keys = await AsyncStorage.getAllKeys();
    console.log('📱 AsyncStorage Keys Found:', keys);
    
    // Get all AsyncStorage data
    const asyncData = await AsyncStorage.multiGet(keys);
    
    for (const [key, value] of asyncData) {
      console.log(`\n📋 AsyncStorage [${key}]:`);
      try {
        const parsed = JSON.parse(value);
        console.log(JSON.stringify(parsed, null, 2));
      } catch {
        console.log(value);
      }
    }
    
    // Check SecureStore items
    console.log('\n🔐 === SECURE STORE DATA ===');
    
    const secureKeys = ['encryption_key', 'secure_deviceid'];
    for (const key of secureKeys) {
      try {
        const secureValue = await SecureStore.getItemAsync(key);
        if (secureValue) {
          console.log(`🔐 SecureStore [${key}]:`, secureValue.substring(0, 50) + '...');
        } else {
          console.log(`🔐 SecureStore [${key}]: Not found`);
        }
      } catch (error) {
        console.log(`🔐 SecureStore [${key}]: Error -`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error viewing stored data:', error);
  }
  
  console.log('🔍 === END DEBUG DATA ===\n');
};

// Specific data viewers
export const viewBlockchainMetadata = async () => {
  try {
    const metadata = await AsyncStorage.getItem('blockchain_metadata');
    if (metadata) {
      console.log('⛓️ Blockchain Metadata:', JSON.stringify(JSON.parse(metadata), null, 2));
    } else {
      console.log('⛓️ No blockchain metadata found');
    }
  } catch (error) {
    console.error('❌ Error viewing blockchain metadata:', error);
  }
};

export const viewUserStreams = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const streamKeys = keys.filter(key => key.startsWith('stream_'));
    
    console.log('🗄️ Found', streamKeys.length, 'streams:');
    
    for (const key of streamKeys) {
      const streamData = await AsyncStorage.getItem(key);
      if (streamData) {
        const parsed = JSON.parse(streamData);
        console.log(`\n🗄️ Stream [${key}]:`);
        console.log(`   - User ID: ${parsed.userId}`);
        console.log(`   - DID: ${parsed.did}`);
        console.log(`   - Entries: ${parsed.entries?.length || 0}`);
        console.log(`   - Created: ${new Date(parsed.createdAt).toISOString()}`);
        console.log(`   - Updated: ${new Date(parsed.updatedAt).toISOString()}`);
        
        if (parsed.entries && parsed.entries.length > 0) {
          console.log('   - Recent CIDs:');
          parsed.entries.slice(-3).forEach((entry, i) => {
            console.log(`     ${i + 1}. ${entry.cid} (${entry.dataType}) - ${new Date(entry.timestamp).toISOString()}`);
          });
        }
      }
    }
  } catch (error) {
    console.error('❌ Error viewing streams:', error);
  }
};

export const viewPermissionRequests = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const permissionKeys = keys.filter(key => key.startsWith('permission_request_'));
    
    console.log('🔑 Found', permissionKeys.length, 'permission requests:');
    
    for (const key of permissionKeys) {
      const requestData = await AsyncStorage.getItem(key);
      if (requestData) {
        const parsed = JSON.parse(requestData);
        console.log(`\n🔑 Permission [${key}]:`);
        console.log(`   - Request ID: ${parsed.requestId}`);
        console.log(`   - Purpose: ${parsed.purpose}`);
        console.log(`   - Status: ${parsed.status}`);
        console.log(`   - Available CIDs: ${parsed.availableCIDs?.length || 0}`);
        console.log(`   - Requested: ${new Date(parsed.requestedAt).toISOString()}`);
      }
    }
  } catch (error) {
    console.error('❌ Error viewing permission requests:', error);
  }
};

// Clear all data (for testing)
export const clearAllStoredData = async () => {
  try {
    console.log('🗑️ Clearing all stored data...');
    await AsyncStorage.clear();
    
    const secureKeys = ['encryption_key', 'secure_deviceid'];
    for (const key of secureKeys) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (error) {
        // Key might not exist
      }
    }
    
    console.log('✅ All data cleared');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
  }
};
