import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import 'react-native-get-random-values'; // Required for crypto operations

// Comprehensive logging utility for encryption operations
const encryptionLog = (message: string, data?: any) => {
  console.log(`🔐 [ENCRYPTION-SERVICE] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

const encryptionError = (message: string, error: any, data?: any) => {
  console.error(`❌ [ENCRYPTION-SERVICE] ${message}`, {
    error: error.message || error,
    errorType: error.constructor?.name || 'Unknown',
    timestamp: new Date().toISOString(),
    ...data
  });
  if (error.stack) {
    console.error(`❌ [ENCRYPTION-SERVICE] Error stack:`, error.stack);
  }
};

export interface EncryptionResult {
  encryptedData: string;
  nonce: string;
  success: boolean;
  error?: string;
}

export interface DecryptionResult {
  decryptedData: any;
  success: boolean;
  error?: string;
}

export interface SimpleKeyPair {
  publicKey: string;
  secretKey: string;
}

/**
 * Generate a new key pair for encryption/decryption using Expo Crypto
 */
export const generateKeyPair = async (): Promise<SimpleKeyPair> => {
  const startTime = Date.now();
  encryptionLog('Starting key pair generation process...', {
    timestamp: new Date().toISOString(),
    operation: 'generateKeyPair'
  });
  
  try {
    // Step 1: Generate public key bytes
    encryptionLog('Step 1/4: Generating public key bytes...');
    const publicKeyBytes = await Crypto.getRandomBytesAsync(32);
    encryptionLog('✅ Public key bytes generated', {
      byteLength: publicKeyBytes.length,
      entropy: '256 bits'
    });
    
    // Step 2: Generate secret key bytes
    encryptionLog('Step 2/4: Generating secret key bytes...');
    const secretKeyBytes = await Crypto.getRandomBytesAsync(32);
    encryptionLog('✅ Secret key bytes generated', {
      byteLength: secretKeyBytes.length,
      entropy: '256 bits'
    });
    
    // Step 3: Convert to hex strings
    encryptionLog('Step 3/4: Converting bytes to hex strings...');
    const keyPair: SimpleKeyPair = {
      publicKey: Array.from(publicKeyBytes).map(b => b.toString(16).padStart(2, '0')).join(''),
      secretKey: Array.from(secretKeyBytes).map(b => b.toString(16).padStart(2, '0')).join('')
    };
    encryptionLog('✅ Keys converted to hex format', {
      publicKeyLength: keyPair.publicKey.length,
      secretKeyLength: keyPair.secretKey.length
    });
    
    // Step 4: Validate key pair
    encryptionLog('Step 4/4: Validating generated key pair...');
    if (keyPair.publicKey.length !== 64 || keyPair.secretKey.length !== 64) {
      throw new Error('Invalid key length - expected 64 hex characters');
    }
    encryptionLog('✅ Key pair validation successful');
    
    const endTime = Date.now();
    encryptionLog('🎉 Key pair generation completed successfully!', {
      publicKeyLength: keyPair.publicKey.length,
      secretKeyLength: keyPair.secretKey.length,
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true
    });
    
    return keyPair;
  } catch (error) {
    const endTime = Date.now();
    encryptionError('Key pair generation failed!', error, {
      processingTime: `${endTime - startTime}ms`,
      success: false
    });
    throw error;
  }
};

/**
 * Store encryption keys securely
 */
export const storeEncryptionKeys = async (keyPair: SimpleKeyPair): Promise<boolean> => {
  const startTime = Date.now();
  encryptionLog('Starting encryption key storage process...', {
    timestamp: new Date().toISOString(),
    operation: 'storeEncryptionKeys'
  });
  
  try {
    encryptionLog('Step 1/2: Storing public key in AsyncStorage...');
    await AsyncStorage.setItem('encryption_public_key', keyPair.publicKey);
    encryptionLog('✅ Public key stored in AsyncStorage');
    
    encryptionLog('Step 2/2: Storing secret key in SecureStore...');
    await SecureStore.setItemAsync('encryption_secret_key', keyPair.secretKey);
    encryptionLog('✅ Secret key stored in SecureStore');
    
    const endTime = Date.now();
    encryptionLog('🎉 Encryption keys stored successfully!', {
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true
    });
    return true;
  } catch (error) {
    const endTime = Date.now();
    encryptionError('Encryption key storage failed!', error, {
      processingTime: `${endTime - startTime}ms`,
      success: false
    });
    return false;
  }
};

/**
 * Retrieve encryption keys
 */
export const getEncryptionKeys = async (): Promise<SimpleKeyPair | null> => {
  const startTime = Date.now();
  encryptionLog('Starting encryption key retrieval process...', {
    timestamp: new Date().toISOString(),
    operation: 'getEncryptionKeys'
  });
  
  try {
    encryptionLog('Step 1/3: Retrieving public key from AsyncStorage...');
    const publicKey = await AsyncStorage.getItem('encryption_public_key');
    
    encryptionLog('Step 2/3: Retrieving secret key from SecureStore...');
    const secretKey = await SecureStore.getItemAsync('encryption_secret_key');
    
    if (!publicKey || !secretKey) {
      encryptionLog('⚠️ No encryption keys found in storage', {
        hasPublicKey: !!publicKey,
        hasSecretKey: !!secretKey,
        timestamp: new Date().toISOString()
      });
      return null;
    }
    
    encryptionLog('Step 3/3: Creating key pair object...');
    const keyPair: SimpleKeyPair = {
      publicKey,
      secretKey
    };
    
    const endTime = Date.now();
    encryptionLog('🎉 Encryption keys retrieved successfully!', {
      publicKeyLength: keyPair.publicKey.length,
      secretKeyLength: keyPair.secretKey.length,
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true
    });
    return keyPair;
  } catch (error) {
    const endTime = Date.now();
    encryptionError('Encryption key retrieval failed!', error, {
      processingTime: `${endTime - startTime}ms`,
      success: false
    });
    return null;
  }
};

/**
 * Simple XOR encryption using React Native compatible methods
 */
const simpleEncrypt = (data: string, key: string): { encrypted: string; nonce: string } => {
  const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const keyWithNonce = key + nonce;
  let encrypted = '';
  
  for (let i = 0; i < data.length; i++) {
    const dataChar = data.charCodeAt(i);
    const keyChar = keyWithNonce.charCodeAt(i % keyWithNonce.length);
    encrypted += String.fromCharCode(dataChar ^ keyChar);
  }
  
  return {
    encrypted: btoa(encrypted), // Base64 encode
    nonce
  };
};

/**
 * Simple XOR decryption
 */
const simpleDecrypt = (encryptedData: string, key: string, nonce: string): string => {
  const keyWithNonce = key + nonce;
  const encrypted = atob(encryptedData); // Base64 decode
  let decrypted = '';
  
  for (let i = 0; i < encrypted.length; i++) {
    const encryptedChar = encrypted.charCodeAt(i);
    const keyChar = keyWithNonce.charCodeAt(i % keyWithNonce.length);
    decrypted += String.fromCharCode(encryptedChar ^ keyChar);
  }
  
  return decrypted;
};

/**
 * Encrypt behavioral data using user's private key
 */
export const encryptData = async (data: any): Promise<EncryptionResult> => {
  const startTime = Date.now();
  encryptionLog('Starting data encryption process...', {
    dataType: typeof data,
    timestamp: new Date().toISOString(),
    operation: 'encryptData'
  });
  
  try {
    encryptionLog('Step 1/4: Retrieving encryption keys...');
    const keyPair = await getEncryptionKeys();
    if (!keyPair) {
      throw new Error('No encryption keys found. User needs to generate keys first.');
    }
    encryptionLog('✅ Encryption keys retrieved successfully');
    
    encryptionLog('Step 2/4: Converting data to string format...');
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    encryptionLog('✅ Data converted to string', {
      originalType: typeof data,
      stringLength: dataString.length
    });
    
    encryptionLog('Step 3/4: Performing encryption...');
    const { encrypted, nonce } = simpleEncrypt(dataString, keyPair.secretKey);
    encryptionLog('✅ Data encrypted successfully', {
      encryptedLength: encrypted.length,
      nonceLength: nonce.length
    });
    
    encryptionLog('Step 4/4: Creating encryption result...');
    const result: EncryptionResult = {
      encryptedData: encrypted,
      nonce: nonce,
      success: true
    };
    
    const endTime = Date.now();
    encryptionLog('🎉 Data encryption completed successfully!', {
      originalSize: dataString.length,
      encryptedSize: result.encryptedData.length,
      nonceLength: result.nonce.length,
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true
    });
    
    return result;
  } catch (error) {
    const endTime = Date.now();
    const errorMessage = error instanceof Error ? error.message : 'Unknown encryption error';
    encryptionError('Data encryption failed!', error, {
      processingTime: `${endTime - startTime}ms`,
      success: false
    });
    
    return {
      encryptedData: '',
      nonce: '',
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Decrypt data using user's private key
 */
export const decryptData = async (encryptedData: string, nonce: string): Promise<DecryptionResult> => {
  const startTime = Date.now();
  encryptionLog('Starting data decryption process...', {
    encryptedDataLength: encryptedData.length,
    nonceLength: nonce.length,
    timestamp: new Date().toISOString(),
    operation: 'decryptData'
  });
  
  try {
    encryptionLog('Step 1/4: Retrieving encryption keys...');
    const keyPair = await getEncryptionKeys();
    if (!keyPair) {
      throw new Error('No encryption keys found');
    }
    encryptionLog('✅ Encryption keys retrieved successfully');
    
    encryptionLog('Step 2/4: Performing decryption...');
    const decryptedString = simpleDecrypt(encryptedData, keyPair.secretKey, nonce);
    encryptionLog('✅ Data decrypted to string', {
      decryptedLength: decryptedString.length
    });
    
    encryptionLog('Step 3/4: Parsing decrypted data...');
    let decryptedData;
    try {
      decryptedData = JSON.parse(decryptedString);
      encryptionLog('✅ Data parsed as JSON object');
    } catch {
      decryptedData = decryptedString;
      encryptionLog('✅ Data kept as string (not valid JSON)');
    }
    
    encryptionLog('Step 4/4: Creating decryption result...');
    const result: DecryptionResult = {
      decryptedData,
      success: true
    };
    
    const endTime = Date.now();
    encryptionLog('🎉 Data decryption completed successfully!', {
      decryptedType: typeof decryptedData,
      decryptedSize: decryptedString.length,
      processingTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString(),
      success: true
    });
    
    return result;
  } catch (error) {
    const endTime = Date.now();
    const errorMessage = error instanceof Error ? error.message : 'Unknown decryption error';
    encryptionError('Data decryption failed!', error, {
      processingTime: `${endTime - startTime}ms`,
      success: false
    });
    
    return {
      decryptedData: null,
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Initialize encryption for a new user
 */
export const initializeUserEncryption = async (): Promise<boolean> => {
  const startTime = Date.now();
  encryptionLog('Starting user encryption initialization...', {
    timestamp: new Date().toISOString(),
    operation: 'initializeUserEncryption'
  });
  
  try {
    encryptionLog('Step 1/3: Checking for existing encryption keys...');
    const existingKeys = await getEncryptionKeys();
    if (existingKeys) {
      const endTime = Date.now();
      encryptionLog('✅ Encryption keys already exist, initialization complete', {
        processingTime: `${endTime - startTime}ms`,
        timestamp: new Date().toISOString(),
        action: 'reused_existing',
        success: true
      });
      return true;
    }
    encryptionLog('⚠️ No existing keys found, proceeding with generation...');
    
    encryptionLog('Step 2/3: Generating new encryption key pair...');
    const keyPair = await generateKeyPair();
    encryptionLog('✅ Key pair generated successfully');
    
    encryptionLog('Step 3/3: Storing encryption keys securely...');
    const stored = await storeEncryptionKeys(keyPair);
    
    if (stored) {
      const endTime = Date.now();
      encryptionLog('🎉 User encryption initialized successfully!', {
        processingTime: `${endTime - startTime}ms`,
        timestamp: new Date().toISOString(),
        action: 'created_new',
        success: true
      });
      return true;
    } else {
      throw new Error('Failed to store encryption keys');
    }
  } catch (error) {
    const endTime = Date.now();
    encryptionError('User encryption initialization failed!', error, {
      processingTime: `${endTime - startTime}ms`,
      success: false
    });
    return false;
  }
};

/**
 * Verify encryption functionality
 */
export const verifyEncryption = async (): Promise<boolean> => {
  const startTime = Date.now();
  encryptionLog('Starting encryption functionality verification...', {
    timestamp: new Date().toISOString(),
    operation: 'verifyEncryption'
  });
  
  try {
    encryptionLog('Step 1/4: Creating test data...');
    const testData = { 
      test: 'encryption_verification', 
      timestamp: Date.now(),
      message: 'This is a test message for encryption verification'
    };
    encryptionLog('✅ Test data created', {
      testDataSize: JSON.stringify(testData).length
    });
    
    encryptionLog('Step 2/4: Encrypting test data...');
    const encrypted = await encryptData(testData);
    if (!encrypted.success) {
      throw new Error('Encryption verification failed');
    }
    encryptionLog('✅ Test data encrypted successfully');
    
    encryptionLog('Step 3/4: Decrypting test data...');
    const decrypted = await decryptData(encrypted.encryptedData, encrypted.nonce);
    if (!decrypted.success) {
      throw new Error('Decryption verification failed');
    }
    encryptionLog('✅ Test data decrypted successfully');
    
    encryptionLog('Step 4/4: Verifying data integrity...');
    const originalString = JSON.stringify(testData);
    const decryptedString = JSON.stringify(decrypted.decryptedData);
    const isEqual = originalString === decryptedString;
    
    if (isEqual) {
      const endTime = Date.now();
      encryptionLog('🎉 Encryption verification completed successfully!', {
        dataIntegrityCheck: 'PASSED',
        processingTime: `${endTime - startTime}ms`,
        timestamp: new Date().toISOString(),
        success: true
      });
      return true;
    } else {
      encryptionLog('❌ Data integrity check failed', {
        original: originalString,
        decrypted: decryptedString
      });
      throw new Error('Data integrity check failed');
    }
  } catch (error) {
    const endTime = Date.now();
    encryptionError('Encryption verification failed!', error, {
      processingTime: `${endTime - startTime}ms`,
      success: false
    });
    return false;
  }
};
