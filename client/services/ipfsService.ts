// React Native compatible IPFS service using Pinata API
import axios from 'axios';

// Get Pinata credentials from environment
const PINATA_JWT = process.env.EXPO_PUBLIC_PINATA_JWT || '';
const PINATA_GATEWAY = process.env.EXPO_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';

// Comprehensive logging utility for IPFS operations
const ipfsLog = (message: string, data?: any) => {
  console.log(`🌐 [IPFS-SERVICE] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

const ipfsError = (message: string, error: any, data?: any) => {
  console.error(`❌ [IPFS-SERVICE] ${message}`, {
    error: error.message || error,
    errorType: error.constructor?.name || 'Unknown',
    timestamp: new Date().toISOString(),
    ...data
  });
  if (error.stack) {
    console.error(`❌ [IPFS-SERVICE] Error stack:`, error.stack);
  }
};

/**
 * Upload data to IPFS via Pinata API
 */
export const uploadToIPFS = async (data: string): Promise<string | null> => {
  const startTime = Date.now();
  ipfsLog('Starting IPFS upload via Pinata...', {
    dataLength: data.length,
    timestamp: new Date().toISOString(),
    operation: 'uploadToIPFS'
  });
  
  try {
    ipfsLog('Step 1/4: Creating FormData for file upload...');
    const formData = new FormData();
    const blob = new Blob([data], { type: 'application/json' });
    formData.append('file', blob, `data-${Date.now()}.json`);
    ipfsLog('✅ FormData created with file blob');
    
    ipfsLog('Step 2/4: Adding metadata to upload...');
    const metadata = {
      name: `CanGuard-Data-${Date.now()}`,
      keyvalues: {
        platform: 'CanGuard-AI',
        timestamp: new Date().toISOString()
      }
    };
    formData.append('pinataMetadata', JSON.stringify(metadata));
    ipfsLog('✅ Metadata added to FormData', { metadata });

    ipfsLog('Step 3/4: Uploading to Pinata API...');
    const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${PINATA_JWT}`
      },
      timeout: 30000
    });
    ipfsLog('✅ Pinata API response received', {
      status: response.status,
      hasIpfsHash: !!response.data.IpfsHash
    });

    ipfsLog('Step 4/4: Validating upload response...');
    if (response.status === 200 && response.data.IpfsHash) {
      const endTime = Date.now();
      ipfsLog('🎉 Data uploaded to IPFS successfully!', {
        cid: response.data.IpfsHash,
        processingTime: `${endTime - startTime}ms`,
        timestamp: new Date().toISOString(),
        success: true
      });
      return response.data.IpfsHash;
    } else {
      throw new Error('Invalid response from Pinata API');
    }
  } catch (error) {
    const endTime = Date.now();
    ipfsError('IPFS upload failed!', error, {
      processingTime: `${endTime - startTime}ms`,
      success: false
    });
    return null;
  }
};

/**
 * Get data from IPFS using CID
 */
export const getFromIPFS = async (cid: string): Promise<string | null> => {
  const startTime = Date.now();
  ipfsLog('Starting IPFS data retrieval...', {
    cid: cid,
    gateway: PINATA_GATEWAY,
    timestamp: new Date().toISOString(),
    operation: 'getFromIPFS'
  });
  
  try {
    ipfsLog('Step 1/2: Making HTTP request to IPFS gateway...');
    const response = await axios.get(`${PINATA_GATEWAY}${cid}`, {
      timeout: 15000,
      responseType: 'text'
    });
    ipfsLog('✅ HTTP response received', {
      status: response.status,
      statusText: response.statusText
    });

    ipfsLog('Step 2/2: Validating response data...');
    if (response.status === 200) {
      const endTime = Date.now();
      ipfsLog('🎉 Data retrieved from IPFS successfully!', {
        dataSize: response.data.length,
        processingTime: `${endTime - startTime}ms`,
        timestamp: new Date().toISOString(),
        success: true
      });
      return response.data;
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    const endTime = Date.now();
    ipfsError('IPFS data retrieval failed!', error, {
      cid: cid,
      processingTime: `${endTime - startTime}ms`,
      success: false
    });
    return null;
  }
};

/**
 * Pin data to Pinata (already done during upload, but kept for compatibility)
 */
export const pinToPinata = async (cid: string): Promise<boolean> => {
  const startTime = Date.now();
  ipfsLog('Starting CID pinning to Pinata...', {
    cid: cid,
    timestamp: new Date().toISOString(),
    operation: 'pinToPinata'
  });
  
  try {
    ipfsLog('Step 1/2: Sending pin request to Pinata API...');
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinByHash',
      {
        hashToPin: cid,
        pinataMetadata: { name: 'BehavioralData' },
      },
      {
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
          'Content-Type': 'application/json',
        },
      }
    );
    ipfsLog('✅ Pinata API response received', {
      status: response.status,
      statusText: response.statusText
    });

    ipfsLog('Step 2/2: Validating pin operation...');
    const success = response.status === 200;
    
    const endTime = Date.now();
    if (success) {
      ipfsLog('🎉 CID pinned to Pinata successfully!', {
        cid: cid,
        processingTime: `${endTime - startTime}ms`,
        timestamp: new Date().toISOString(),
        success: true
      });
    } else {
      ipfsLog('⚠️ CID pinning failed', {
        cid: cid,
        status: response.status,
        processingTime: `${endTime - startTime}ms`,
        success: false
      });
    }
    
    return success;
  } catch (error) {
    const endTime = Date.now();
    ipfsError('CID pinning to Pinata failed!', error, {
      cid: cid,
      processingTime: `${endTime - startTime}ms`,
      success: false
    });
    return false;
  }
};

