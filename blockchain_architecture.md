# CanGuard-AI: Blockchain Architecture Documentation

## Executive Summary

CanGuard-AI implements a **hybrid decentralized blockchain architecture** that fundamentally transforms behavioral biometric data storage and access control. Unlike traditional centralized systems, this architecture ensures **user sovereignty over personal biometric data** while maintaining the security and performance requirements of banking applications.

The system leverages **Decentralized Identifiers (DIDs)**, **IPFS distributed storage**, **cryptographic encryption**, and **smart contract-like permission systems** to create a privacy-preserving, tamper-resistant infrastructure for behavioral authentication.

---

## 1. Core Blockchain Components

### 1.1 Decentralized Identity Layer (DID)

**Implementation**: Custom DID Method (`did:canguard`)
- **Purpose**: User-controlled cryptographic identity
- **Generation**: 256-bit entropy using Expo Crypto
- **Format**: `did:canguard:{32-char-hash}`
- **Storage**: SecureStore (private keys) + AsyncStorage (metadata)

```typescript
// DID Generation Process
const seed = await Crypto.getRandomBytesAsync(32);
const didSuffix = await Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256, seed, 
  { encoding: Crypto.CryptoEncoding.HEX }
);
const did = `did:canguard:${didSuffix.substring(0, 32)}`;
```

**Key Features**:
- Self-sovereign identity ownership
- No dependency on external DID networks
- Cryptographically verifiable
- Cross-platform compatibility (React Native)

### 1.2 Distributed Storage Layer (IPFS)

**Infrastructure**: Pinata Cloud + IPFS Network
- **Content Addressing**: CID-based immutable references
- **Redundancy**: Pinned to Pinata for persistence
- **Access**: HTTP gateway + native IPFS protocols
- **Encryption**: Client-side AES-256 before upload

```javascript
// IPFS Storage Workflow
const dataBlob = {
  encryptedData: encrypted.encryptedData,
  nonce: encrypted.nonce,
  metadata: {
    timestamp: behavioralData.timestamp,
    sessionId: behavioralData.sessionId,
    dataType: 'behavioral'
  }
};
const cid = await uploadToIPFS(JSON.stringify(dataBlob));
```

**Advantages**:
- **Immutability**: Content cannot be altered without changing CID
- **Verifiability**: Hash-based integrity validation
- **Availability**: Distributed across IPFS network
- **Cost-Effective**: No blockchain gas fees for data storage

### 1.3 Encryption & Key Management

**Algorithm**: Advanced Encryption Standard (AES-256)
- **Key Generation**: Cryptographically secure random bytes
- **Key Storage**: React Native SecureStore (hardware-backed)
- **Nonce Management**: Unique per encryption operation
- **Data Flow**: Encrypt → Upload → Store CID → Decrypt on demand

```typescript
// Encryption Process
const encryptData = async (data: any): Promise<EncryptionResult> => {
  const keyPair = await getEncryptionKeys();
  const dataString = JSON.stringify(data);
  const { encrypted, nonce } = simpleEncrypt(dataString, keyPair.secretKey);
  return { encryptedData: encrypted, nonce, success: true };
};
```

**Security Properties**:
- **Forward Secrecy**: New nonces prevent replay attacks
- **Client-Side Encryption**: Data encrypted before leaving device
- **Zero-Knowledge**: Backend cannot decrypt without user consent
- **Hardware Security**: Private keys protected by device TEE

## 3. New Decentralized Workflow

This new workflow ensures that raw behavioral data never touches the central server in an unencrypted state, and only with the user's explicit permission.

### Visual Workflow Diagram

```
[User's Device (Client App)]                               [Backend Server]                                  [Decentralized Network]
-----------------------------                               ----------------                                  -----------------------
                                                                                                                [IPFS]      [Ceramic]
1. Collects behavioral data
   (typing, sensors)
       |
       v
2. Encrypts data with
   user's private key
       |
       v
3. Uploads encrypted blob to IPFS ------------------------------------------------------------------------------> (Stores blob, returns CID)
       |
       |----------------------------------------------------------------------------------------------------------> (Stores CID in user's
       |                                                                                                             Data Stream)
       v
4. User initiates payment
   (triggers analysis)
       |
       |
       |<-------------------------------- 5. "Need data for analysis"
       |
       v
6. User grants permission
   (signs a message)
       |
       v
7. Sends [CIDs + Permission] ----------> 8. Verifies permission
                                                 |
                                                 v
                                            9. Fetches encrypted data from IPFS <--------------------------------- (Serves blob)
                                                 |
                                                 v
                                           10. Decrypts data in-memory
                                                 |
                                                 v
                                           11. [T1 Model Analysis]
                                                 |
                                                 v
                                           12. Discards decrypted data
                                                 |
                                                 v
                                           13. Approves/Declines Txn
```

### Part 1: User Onboarding & Secure Data Storage

This part of the flow is handled entirely on the client-side, empowering the user.

1.  **DID Generation**: During registration, the client app generates a unique DID for the user. The cryptographic keys are stored securely on the user's device.
2.  **Data Collection**: The app continues to collect `typingStats` and `deviceMetrics` in the background.
3.  **Encryption**: The collected JSON data object is **encrypted** using the user's private key.
4.  **IPFS Upload**: The encrypted data blob is uploaded to IPFS via a pinning service (e.g., Pinata) to ensure its persistence. IPFS returns a unique content identifier (CID).
5.  **Verifiable Indexing**: The client app writes this CID to the user's personal data stream on the **Ceramic Network**. This stream is controlled by the user's DID and serves as a timestamped, immutable log of their data history.

**Outcome**: The `Behavioral` collection in MongoDB is eliminated. The raw data now resides, encrypted, on a decentralized network, fully under the user's control.

### Part 2: Model Access & Real-Time Analysis

This flow describes the secure interaction between the backend, the client, and the decentralized network when a security check is required.

1.  **Analysis Trigger**: A user initiates a sensitive action (e.g., a payment). The backend needs to run the T1 behavioral analysis.
2.  **Data Access Request**: The backend sends a request to the user's client app: "A security check is required. Please provide the behavioral data from the last 2 minutes."
3.  **User Permission Grant**: The client app prompts the user: *"CanGuard-AI needs to verify your behavior to secure this transaction. [Allow]"*.
4.  **Secure Data Retrieval**:
    - Upon user approval, the client app fetches the relevant encrypted data CIDs from the user's Ceramic stream.
    - It sends these CIDs and a signed, temporary "permission slip" to the backend.
5.  **Decryption & Model Invocation**:
    - The backend first verifies the cryptographic signature on the permission slip.
    - It uses the CIDs to fetch the encrypted data blobs from IPFS.
    - The data is **decrypted locally in the backend's memory**.
    - This raw, decrypted data is immediately passed to the T1 model for analysis. **It is never written to disk or stored in the database.**
6.  **Post-Analysis**:
    - Once the model returns a decision (`PASS` or `ESCALATE`), the decrypted data is purged from memory.
    - If the decision was `PASS`, the backend can update the user's *learned reference profile* (`D_ref`), which is an aggregated mathematical model and can be safely stored in the central `User` database.

---

## 4. Implementation & Required Libraries

To implement this architecture, the following packages would be added to the `client` application:

-   `dids`: For creating and managing Decentralized Identifiers.
-   `key-did-provider-ed25519`: A provider for generating user keys.
-   `@ceramicnetwork/http-client`: The client for reading from and writing to the Ceramic Network.
-   An IPFS client library or an SDK for a pinning service like `@pinata/sdk`.

## 5. Benefits of This Architecture

-   **User Control & Privacy**: The user is the sole owner of their raw data. Nothing is shared without their explicit, cryptographically-signed consent.
-   **Enhanced Security**: Eliminates the central honeypot of sensitive data, drastically reducing the risk and impact of a data breach.
-   **Verifiability & Auditability**: The blockchain provides an immutable audit trail, proving when data was created and accessed, without revealing the data itself.
-   **Trust**: This transparent approach builds trust with the user, which is paramount in a banking application.