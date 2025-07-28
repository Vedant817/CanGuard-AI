const { create } = require('ipfs-http-client');
const axios = require('axios');
const crypto = require('crypto');

// Logging utility
const storageLog = (message, data = {}) => {
  if (process.env.ENABLE_BLOCKCHAIN_LOGS === 'true') {
    console.log(`🗄️ [DistributedStorage] ${message}`, JSON.stringify(data, null, 2));
  }
};

/**
 * Distributed Identity and Storage Service
 * Alternative to Ceramic using MongoDB + IPFS + DIDs
 */
class DistributedStorageService {
  constructor() {
    this.ipfsGateway = process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
    this.pinataApiKey = process.env.PINATA_API_KEY;
    this.pinataSecretKey = process.env.PINATA_API_SECRET;
    this.pinataJWT = process.env.PINATA_JWT;
  }

  /**
   * Generate a simple DID for users
   */
  generateDID(userId) {
    const hash = crypto.createHash('sha256').update(`${userId}-${Date.now()}`).digest('hex');
    return `did:canguard:${hash.substring(0, 32)}`;
  }

  /**
   * Create a distributed identity document
   */
  async createIdentityDocument(userId, publicKey, metadata = {}) {
    try {
      storageLog('Creating identity document...', { userId });

      const did = this.generateDID(userId);
      const identityDoc = {
        id: did,
        '@context': ['https://www.w3.org/ns/did/v1'],
        verificationMethod: [{
          id: `${did}#key-1`,
          type: 'Ed25519VerificationKey2020',
          controller: did,
          publicKeyBase58: publicKey
        }],
        authentication: [`${did}#key-1`],
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        metadata: {
          userId,
          platform: 'CanGuard-AI',
          version: '1.0.0',
          ...metadata
        }
      };

      // Store identity document on IPFS
      const ipfsResult = await this.storeOnIPFS(identityDoc, `identity-${userId}`);
      
      if (!ipfsResult.success) {
        throw new Error(`Failed to store identity on IPFS: ${ipfsResult.error}`);
      }

      // Store reference in MongoDB
      const User = require('../models/User');
      await User.findByIdAndUpdate(userId, {
        did: did,
        identityDocumentCID: ipfsResult.cid,
        blockchainInitialized: true
      });

      storageLog('Identity document created successfully', {
        userId,
        did,
        cid: ipfsResult.cid
      });

      return {
        success: true,
        did,
        identityDocumentCID: ipfsResult.cid,
        identityDocument: identityDoc
      };

    } catch (error) {
      storageLog('Failed to create identity document', { userId, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Store data on IPFS using Pinata
   */
  async storeOnIPFS(data, filename = null) {
    try {
      storageLog('Storing data on IPFS...', { 
        dataSize: JSON.stringify(data).length,
        filename 
      });

      const formData = new FormData();
      const jsonBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      
      formData.append('file', jsonBlob, filename || `data-${Date.now()}.json`);
      
      const metadata = {
        name: filename || `CanGuard-Data-${Date.now()}`,
        keyvalues: {
          platform: 'CanGuard-AI',
          timestamp: new Date().toISOString()
        }
      };
      
      formData.append('pinataMetadata', JSON.stringify(metadata));

      const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${this.pinataJWT}`
        },
        timeout: 30000
      });

      if (response.status === 200 && response.data.IpfsHash) {
        storageLog('Data stored on IPFS successfully', {
          cid: response.data.IpfsHash,
          filename: filename
        });

        return {
          success: true,
          cid: response.data.IpfsHash,
          gatewayUrl: `${this.ipfsGateway}${response.data.IpfsHash}`
        };
      } else {
        throw new Error('Invalid response from Pinata API');
      }

    } catch (error) {
      storageLog('Failed to store data on IPFS', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Retrieve data from IPFS
   */
  async retrieveFromIPFS(cid) {
    try {
      storageLog('Retrieving data from IPFS...', { cid });

      const response = await axios.get(`${this.ipfsGateway}${cid}`, {
        timeout: 15000,
        responseType: 'json'
      });

      if (response.status === 200) {
        storageLog('Data retrieved from IPFS successfully', { 
          cid,
          dataSize: JSON.stringify(response.data).length 
        });

        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      storageLog('Failed to retrieve data from IPFS', { cid, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a verifiable data record
   */
  async createDataRecord(userId, data, dataType = 'behavioral') {
    try {
      storageLog('Creating verifiable data record...', { userId, dataType });

      const User = require('../models/User');
      const user = await User.findById(userId);
      
      if (!user || !user.did) {
        throw new Error('User DID not found. Initialize blockchain identity first.');
      }

      // Create verifiable data record
      const dataRecord = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'BehavioralData'],
        issuer: user.did,
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: user.did,
          dataType: dataType,
          data: data,
          timestamp: Date.now()
        },
        proof: {
          type: 'DataIntegrityProof',
          created: new Date().toISOString(),
          proofPurpose: 'assertionMethod',
          verificationMethod: `${user.did}#key-1`
        }
      };

      // Store on IPFS
      const ipfsResult = await this.storeOnIPFS(dataRecord, `${dataType}-${userId}-${Date.now()}`);
      
      if (!ipfsResult.success) {
        throw new Error(`Failed to store data record: ${ipfsResult.error}`);
      }

      // Update user's data stream references
      await User.findByIdAndUpdate(userId, {
        $push: {
          dataStreamCIDs: {
            cid: ipfsResult.cid,
            dataType: dataType,
            timestamp: new Date(),
            size: JSON.stringify(dataRecord).length
          }
        }
      });

      storageLog('Data record created successfully', {
        userId,
        dataType,
        cid: ipfsResult.cid
      });

      return {
        success: true,
        cid: ipfsResult.cid,
        dataRecord: dataRecord
      };

    } catch (error) {
      storageLog('Failed to create data record', { userId, dataType, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Grant data access permission
   */
  async grantDataAccess(userId, requestorDID, cids, expirationHours = 1) {
    try {
      storageLog('Granting data access permission...', { 
        userId, 
        requestorDID,
        cidsCount: cids.length,
        expirationHours 
      });

      const User = require('../models/User');
      const user = await User.findById(userId);
      
      if (!user || !user.did) {
        throw new Error('User DID not found');
      }

      const requestId = crypto.randomUUID();
      const expiresAt = Date.now() + (expirationHours * 60 * 60 * 1000);

      const permissionGrant = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'DataAccessGrant'],
        id: requestId,
        issuer: user.did,
        holder: requestorDID,
        issuanceDate: new Date().toISOString(),
        expirationDate: new Date(expiresAt).toISOString(),
        credentialSubject: {
          id: requestorDID,
          grantedAccess: {
            resources: cids,
            permissions: ['read'],
            constraints: {
              purpose: 'behavioral-analysis',
              maxUses: 1,
              expiresAt: expiresAt
            }
          }
        },
        proof: {
          type: 'DataIntegrityProof',
          created: new Date().toISOString(),
          proofPurpose: 'authentication',
          verificationMethod: `${user.did}#key-1`
        }
      };

      // Store permission grant
      const ipfsResult = await this.storeOnIPFS(permissionGrant, `permission-${requestId}`);
      
      if (!ipfsResult.success) {
        throw new Error(`Failed to store permission grant: ${ipfsResult.error}`);
      }

      storageLog('Data access permission granted', {
        userId,
        requestId,
        permissionCID: ipfsResult.cid
      });

      return {
        success: true,
        requestId: requestId,
        permissionCID: ipfsResult.cid,
        expiresAt: expiresAt,
        grantDocument: permissionGrant
      };

    } catch (error) {
      storageLog('Failed to grant data access', { userId, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Health check for distributed storage
   */
  async healthCheck() {
    try {
      // Test IPFS connectivity
      const testData = { test: true, timestamp: Date.now() };
      const storeResult = await this.storeOnIPFS(testData, 'health-check');
      
      if (!storeResult.success) {
        throw new Error(`IPFS store failed: ${storeResult.error}`);
      }

      const retrieveResult = await this.retrieveFromIPFS(storeResult.cid);
      
      if (!retrieveResult.success) {
        throw new Error(`IPFS retrieve failed: ${retrieveResult.error}`);
      }

      return {
        success: true,
        message: 'Distributed storage is healthy',
        services: {
          ipfs: 'operational',
          pinata: 'operational'
        },
        testCID: storeResult.cid
      };

    } catch (error) {
      return {
        success: false,
        message: 'Distributed storage health check failed',
        error: error.message
      };
    }
  }
}

module.exports = new DistributedStorageService();
