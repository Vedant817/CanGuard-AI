import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

/**
 * React Native compatible DID service
 * Uses simple DIDs compatible with our distributed storage service
 */

export interface SimpleIdentity {
  did: string;
  publicKey: string;
  privateKey: string;
  created: string;
}

/**
 * Generate a simple DID compatible with React Native
 */
export async function generateDID(): Promise<SimpleIdentity | null> {
  const startTime = Date.now();
  console.log('🔑 [DID-SERVICE] Starting DID generation process...', {
    timestamp: new Date().toISOString(),
    operation: 'generateDID'
  });
  
  try {
    // Step 1: Generate random seed
    console.log('🔑 [DID-SERVICE] Step 1/6: Generating cryptographic seed...');
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    const seed = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    console.log('✅ [DID-SERVICE] Seed generated successfully', {
      seedLength: seed.length,
      entropy: '256 bits'
    });
    
    // Step 2: Create DID suffix
    console.log('🔑 [DID-SERVICE] Step 2/6: Creating DID identifier...');
    const didSuffix = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      seed,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    const did = `did:canguard:${didSuffix.substring(0, 32)}`;
    console.log('✅ [DID-SERVICE] DID identifier created', {
      did: did,
      method: 'canguard',
      suffix: didSuffix.substring(0, 32)
    });
    
    // Step 3: Generate public key
    console.log('🔑 [DID-SERVICE] Step 3/6: Generating public key...');
    const publicKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      seed + 'public',
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    console.log('✅ [DID-SERVICE] Public key generated', {
      publicKeyLength: publicKey.length,
      encoding: 'BASE64'
    });
    
    // Step 4: Generate private key
    console.log('🔑 [DID-SERVICE] Step 4/6: Generating private key...');
    const privateKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      seed + 'private',
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    console.log('✅ [DID-SERVICE] Private key generated', {
      privateKeyLength: privateKey.length,
      encoding: 'BASE64',
      securelyGenerated: true
    });
    
    // Step 5: Create identity object
    console.log('🔑 [DID-SERVICE] Step 5/6: Creating identity document...');
    const identity: SimpleIdentity = {
      did,
      publicKey,
      privateKey,
      created: new Date().toISOString()
    };
    console.log('✅ [DID-SERVICE] Identity document created', {
      did: identity.did,
      created: identity.created,
      hasPublicKey: !!identity.publicKey,
      hasPrivateKey: !!identity.privateKey
    });
    
    // Step 6: Store securely
    console.log('🔑 [DID-SERVICE] Step 6/6: Storing identity securely...');
    await SecureStore.setItemAsync('user_did', JSON.stringify(identity));
    console.log('✅ [DID-SERVICE] Identity stored in SecureStore');
    
    await AsyncStorage.setItem('did_created', 'true');
    console.log('✅ [DID-SERVICE] DID creation flag set in AsyncStorage');
    
    const endTime = Date.now();
    console.log('🎉 [DID-SERVICE] DID generation completed successfully!', {
      did: did,
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true
    });
    
    return identity;
    
  } catch (error) {
    const endTime = Date.now();
    console.error('❌ [DID-SERVICE] DID generation failed!', {
      error: error.message,
      errorType: error.constructor.name,
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: false
    });
    console.error('❌ [DID-SERVICE] Error stack:', error.stack);
    return null;
  }
}

/**
 * Retrieve existing DID
 */
export async function getDID(): Promise<SimpleIdentity | null> {
  const startTime = Date.now();
  console.log('🔍 [DID-SERVICE] Starting DID retrieval process...', {
    timestamp: new Date().toISOString(),
    operation: 'getDID'
  });
  
  try {
    console.log('🔍 [DID-SERVICE] Checking SecureStore for stored identity...');
    const storedIdentity = await SecureStore.getItemAsync('user_did');
    
    if (!storedIdentity) {
      console.log('⚠️ [DID-SERVICE] No DID found in storage', {
        storageChecked: 'SecureStore',
        found: false,
        timestamp: new Date().toISOString()
      });
      return null;
    }
    
    console.log('✅ [DID-SERVICE] DID data found in storage, parsing...');
    const identity: SimpleIdentity = JSON.parse(storedIdentity);
    
    const endTime = Date.now();
    console.log('🎉 [DID-SERVICE] DID retrieved successfully!', {
      did: identity.did,
      created: identity.created,
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true
    });
    
    return identity;
    
  } catch (error) {
    const endTime = Date.now();
    console.error('❌ [DID-SERVICE] DID retrieval failed!', {
      error: error.message,
      errorType: error.constructor.name,
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: false
    });
    console.error('❌ [DID-SERVICE] Error stack:', error.stack);
    return null;
  }
}

/**
 * Check if DID exists
 */
export async function hasDID(): Promise<boolean> {
  const startTime = Date.now();
  console.log('🔍 [DID-SERVICE] Checking if DID exists...', {
    timestamp: new Date().toISOString(),
    operation: 'hasDID'
  });
  
  try {
    console.log('🔍 [DID-SERVICE] Checking AsyncStorage for DID creation flag...');
    const didCreated = await AsyncStorage.getItem('did_created');
    const exists = didCreated === 'true';
    
    const endTime = Date.now();
    console.log(`✅ [DID-SERVICE] DID existence check completed`, {
      exists: exists,
      flagValue: didCreated,
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString()
    });
    
    return exists;
  } catch (error) {
    const endTime = Date.now();
    console.error('❌ [DID-SERVICE] DID existence check failed!', {
      error: error.message,
      errorType: error.constructor.name,
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString()
    });
    return false;
  }
}

/**
 * Delete DID (for testing/reset)
 */
export async function deleteDID(): Promise<boolean> {
  const startTime = Date.now();
  console.log('🗑️ [DID-SERVICE] Starting DID deletion process...', {
    timestamp: new Date().toISOString(),
    operation: 'deleteDID',
    warning: 'This will permanently remove the DID'
  });
  
  try {
    console.log('🗑️ [DID-SERVICE] Step 1/2: Deleting DID from SecureStore...');
    await SecureStore.deleteItemAsync('user_did');
    console.log('✅ [DID-SERVICE] DID removed from SecureStore');
    
    console.log('🗑️ [DID-SERVICE] Step 2/2: Removing DID flag from AsyncStorage...');
    await AsyncStorage.removeItem('did_created');
    console.log('✅ [DID-SERVICE] DID flag removed from AsyncStorage');
    
    const endTime = Date.now();
    console.log('🎉 [DID-SERVICE] DID deletion completed successfully!', {
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true,
      storagesCleared: ['SecureStore', 'AsyncStorage']
    });
    
    return true;
  } catch (error) {
    const endTime = Date.now();
    console.error('❌ [DID-SERVICE] DID deletion failed!', {
      error: error.message,
      errorType: error.constructor.name,
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: false
    });
    console.error('❌ [DID-SERVICE] Error stack:', error.stack);
    return false;
  }
}

/**
 * Initialize DID for a user (called during registration/login)
 */
export async function initializeDID(): Promise<SimpleIdentity | null> {
  const startTime = Date.now();
  console.log('🔧 [DID-SERVICE] Starting DID initialization process...', {
    timestamp: new Date().toISOString(),
    operation: 'initializeDID'
  });
  
  try {
    // Check if DID already exists
    console.log('🔧 [DID-SERVICE] Step 1/2: Checking for existing DID...');
    const existingDID = await getDID();
    
    if (existingDID) {
      const endTime = Date.now();
      console.log('✅ [DID-SERVICE] DID already exists, returning existing identity', {
        did: existingDID.did,
        created: existingDID.created,
        processingTime: `${endTime - startTime}ms`,
        timestamp: new Date().toISOString(),
        action: 'reused_existing'
      });
      return existingDID;
    }
    
    // Generate new DID
    console.log('🔧 [DID-SERVICE] Step 2/2: No existing DID found, generating new one...');
    const newDID = await generateDID();
    
    const endTime = Date.now();
    if (newDID) {
      console.log('🎉 [DID-SERVICE] DID initialization completed successfully!', {
        did: newDID.did,
        processingTime: `${endTime - startTime}ms`,
        timestamp: new Date().toISOString(),
        action: 'created_new',
        success: true
      });
    } else {
      console.error('❌ [DID-SERVICE] DID initialization failed - new DID generation returned null', {
        processingTime: `${endTime - startTime}ms`,
        timestamp: new Date().toISOString(),
        success: false
      });
    }
    
    return newDID;
    
  } catch (error) {
    const endTime = Date.now();
    console.error('❌ [DID-SERVICE] DID initialization failed!', {
      error: error.message,
      errorType: error.constructor.name,
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: false
    });
    console.error('❌ [DID-SERVICE] Error stack:', error.stack);
    return null;
  }
}
