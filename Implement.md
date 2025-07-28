# CanGuard AI: A Detailed Project Overview

**CanGuard AI** is an end-to-end security solution designed to address critical vulnerabilities that emerge after a user has successfully logged into a mobile banking application. Its mission is to provide **continuous, real-time identity verification** by analyzing a user's **unique behavioral biometrics**, primarily their **typing patterns**.

This creates an **invisible security layer** that detects and prevents threats like **session hijacking** and **account takeover** in real time.

-----

## 🔧 System Architecture

The project consists of **three main components**:

1.  **React Native Mobile Client**
2.  **Node.js Backend**
3.  **Python-based 3-Tier AI Authentication Engine**

-----

## 1\. 📱 Mobile Client (React Native Frontend)

### Purpose:

Provides a seamless user experience while invisibly collecting behavioral biometric data.

### Key Features:

  * Captures real-time behavioral data:
      * **Flight Time**: Time between key presses
      * **Dwell Time**: Duration a key is held
      * **Typing Speed**
      * **Error Rate**
      * **Typing Rhythm**
  * Data is bundled into a **10-dimensional behavioral vector**.

### Workflow:

  * Uses **event listeners** to track typing behavior.
  * Every **10 seconds**, it sends:
      * Behavioral vector
      * **Contextual metadata** (e.g., GPS location, device info)
      * → to the Node.js backend via **secure REST API**
  * Listens for a JSON response like:
    ```json
    {
      "decision": "PASS"
    }
    ```
      * Based on response: either shows a security alert or continues silently.

-----

## 2\. 🖥️ Backend System

The backend is **divided into two services** for scalability:

### **Node.js Server (The Conductor)**

  * Acts as the **API gateway** for the mobile client.
  * Manages:
      * User sessions
      * Database communication
      * Security workflow orchestration
  * Forwards behavioral data to the Python AI server for decision-making.

### **Python AI Server (The Brain)**

  * Built with **Flask**
  * Loads all **trained PyTorch models** into memory on startup.
  * Processes incoming behavioral data through the **3-tier AI pipeline**
  * Returns a **JSON decision**:
    ```json
    {
      "decision": "FLAG",
      "riskLevel": "HIGH"
    }
    ```

-----

## 3\. 🧠 The Innovation: 3-Tier AI Architecture

A smart, adaptive **security funnel** that balances **speed**, **accuracy**, and **privacy**.

### Tier 1: ⚡ Fast Filter

  * **What**: Lightweight on-device heuristic model
  * **Why**: Instantly clears \>95% of interactions
  * **Analogy**: Like an airport metal detector — clears low-risk activity with minimal effort.

-----

### Tier 2: 🔍 Deep Verification

  * **What**: Personalized, context-aware **Siamese Network** (on-device)
  * **Why**: Verifies moderately suspicious behavior with high accuracy
  * **Analogy**: Boarding pass and photo ID check — deeper verification, still fast and user-friendly.

-----

### Tier 3: 🧬 Forensic Analysis

  * **What**: Server-side, multi-modal AI engine combining **three expert models**
  * **Why**: Detects high-level, sophisticated fraud attempts
  * **Analogy**: Forensic investigation team — invoked only for critical cases

#### Components of Tier 3:

1.  **GNN (Graph Neural Network - The Network Detective)**
      * Analyzes inter-user connections
      * Detects **fraud rings** and suspicious social graphs
2.  **Temporal Drift Tracker (The Historian)**
      * Tracks **behavioral drift** over time
      * Detects **slow, uncharacteristic changes** in user behavior
3.  **Similarity Engine (The Biometric Expert)**
      * High-precision biometric matcher
      * Acts as the **final ground truth** for identity verification

-----

## 🔐 Summary

**CanGuard AI** uses an **adaptive, multi-layered AI approach** to secure mobile banking sessions **after login**, where traditional security often falls short.

  * Invisible to users
  * Low latency
  * Extremely hard to bypass
  * Scales with user base
  * Protects against both common and advanced threats

-----

-----

### **Content from: blockchain\_architecture.md**

# CanGuard-AI: Decentralized Blockchain Architecture

This document outlines a new, decentralized architecture for CanGuard-AI that leverages blockchain principles to enhance user privacy and data security. The goal is to shift from a centralized, bank-owned data model to a user-centric model where the user has full control over their sensitive behavioral data.

## 1\. Core Problem with Centralized Storage

In a traditional client-server model, the user's behavioral data (typing patterns, location, device info) would be stored on the bank's central servers. This creates significant privacy risks and a single point of failure:

  - **Privacy Concerns**: Users must trust the bank to protect their highly personal data from misuse or breaches.
  - **Security Risk**: A central database becomes a high-value target for attackers.
  - **Lack of Control**: The user has no say in how their data is used, shared, or managed.

## 2\. The Decentralized Solution: A Hybrid Approach

To solve this, we will adopt a hybrid architecture that uses a decentralized storage network for the raw data and a blockchain-based identity system for access control and data integrity.

### Core Technologies

  - **Decentralized Identifiers (DIDs)**: A W3C standard for self-sovereign, cryptographic identity. Each user gets a DID that they own and control, acting as a master key for their digital identity and data.
  - **IPFS (InterPlanetary File System)**: A peer-to-peer network for storing and sharing data in a distributed file system. We will use IPFS to store the user's encrypted behavioral data. Files are addressed by a unique content hash (CID), ensuring data integrity.
  - **Ceramic Network**: A decentralized network for managing dynamic, user-controlled data streams. We will use Ceramic to create a verifiable, tamper-proof index of all the user's data CIDs stored on IPFS. It links the data to the user's DID.

-----

## 3\. New Decentralized Workflow

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

-----

## 4\. Implementation & Required Libraries

To implement this architecture, the following packages would be added to the `client` application:

  - `dids`: For creating and managing Decentralized Identifiers.
  - `key-did-provider-ed25519`: A provider for generating user keys.
  - `@ceramicnetwork/http-client`: The client for reading from and writing to the Ceramic Network.
  - An IPFS client library or an SDK for a pinning service like `@pinata/sdk`.

## 5\. Benefits of This Architecture

  - **User Control & Privacy**: The user is the sole owner of their raw data. Nothing is shared without their explicit, cryptographically-signed consent.
  - **Enhanced Security**: Eliminates the central honeypot of sensitive data, drastically reducing the risk and impact of a data breach.
  - **Verifiability & Auditability**: The blockchain provides an immutable audit trail, proving when data was created and accessed, without revealing the data itself.
  - **Trust**: This transparent approach builds trust with the user, which is paramount in a banking application.