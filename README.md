# CanGuard AI: A Detailed Project Overview

**CanGuard AI** is an end-to-end security solution designed to address critical vulnerabilities that emerge after a user has successfully logged into a mobile banking application. Its mission is to provide **continuous, real-time identity verification** by analyzing a user's **unique behavioral biometrics**, primarily their **typing patterns**.

This creates an **invisible security layer** that detects and prevents threats like **session hijacking** and **account takeover** in real time.

---

## 🔧 System Architecture

The project consists of **three main components**:

1. **React Native Mobile Client**
2. **Node.js Backend**
3. **Python-based 3-Tier AI Authentication Engine**

---

## 1. 📱 Mobile Client (React Native Frontend)

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

---

## 2. 🖥️ Backend System

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

---

## 3. 🧠 The Innovation: 3-Tier AI Architecture

A smart, adaptive **security funnel** that balances **speed**, **accuracy**, and **privacy**.

### Tier 1: ⚡ Fast Filter

* **What**: Lightweight on-device heuristic model
* **Why**: Instantly clears >95% of interactions
* **Analogy**: Like an airport metal detector — clears low-risk activity with minimal effort.

---

### Tier 2: 🔍 Deep Verification

* **What**: Personalized, context-aware **Siamese Network** (on-device)
* **Why**: Verifies moderately suspicious behavior with high accuracy
* **Analogy**: Boarding pass and photo ID check — deeper verification, still fast and user-friendly.

---

### Tier 3: 🧬 Forensic Analysis

* **What**: Server-side, multi-modal AI engine combining **three expert models**
* **Why**: Detects high-level, sophisticated fraud attempts
* **Analogy**: Forensic investigation team — invoked only for critical cases

#### Components of Tier 3:

1. **GNN (Graph Neural Network - The Network Detective)**

   * Analyzes inter-user connections
   * Detects **fraud rings** and suspicious social graphs

2. **Temporal Drift Tracker (The Historian)**

   * Tracks **behavioral drift** over time
   * Detects **slow, uncharacteristic changes** in user behavior

3. **Similarity Engine (The Biometric Expert)**

   * High-precision biometric matcher
   * Acts as the **final ground truth** for identity verification

---

## 🔐 Summary

**CanGuard AI** uses an **adaptive, multi-layered AI approach** to secure mobile banking sessions **after login**, where traditional security often falls short.

* Invisible to users
* Low latency
* Extremely hard to bypass
* Scales with user base
* Protects against both common and advanced threats