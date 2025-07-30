# CanGuard-AI: Project Workflow & How It Works

## 🎯 Overview

CanGuard-AI is a smart security system for mobile banking that **continuously monitors how you type** to make sure it's really you using the app. It works invisibly in the background, learning your unique typing patterns to detect if someone else tries to use your account.

---

## 🔄 Complete User Journey

### 1. First Time Setup (User Registration)

**What Happens:**
- User downloads the banking app and creates an account
- App asks for basic info: username, email, password, age, MPIN
- **Behind the scenes**: System creates a digital identity (DID) for the user
- App generates encryption keys and stores them securely on the phone

**Where Data Goes:**
- Basic profile info → **MongoDB Database** (bank's server)
- Digital identity & encryption keys → **User's Phone** (secure storage)
- No behavioral data collected yet

---

### 2. Learning Phase (Typing Patterns Collection)

**What Happens:**
- User starts using the banking app normally
- App quietly monitors typing patterns during regular use
- System learns how fast you type, rhythm, timing between keys, accuracy, etc.
- Creates your unique "typing fingerprint"

**Data Collected:**
- ⌨️ **Typing Speed**: How fast you type (words per minute)
- 🎯 **Accuracy**: How many mistakes you make
- ⏱️ **Timing**: Gaps between keystrokes
- 🔄 **Rhythm**: Your consistent typing pattern
- 📱 **Device Info**: Phone model, network, location
- 🔧 **Environment**: Time of day, battery level

**Where Data Goes:**
- Raw typing data → **Encrypted** on your phone first
- Encrypted data → **IPFS Network** (distributed storage)
- Only references (pointers) → **MongoDB Database**
- Your phone keeps the decryption keys

---

### 3. Normal Banking Operations

**What Happens:**
- User logs in with username/password as usual
- Completes MPIN verification
- Uses banking features: send money, check balance, pay bills
- **Invisible security layer** continuously monitors typing

**Background Security Process:**
1. **Every 6 seconds**: App captures your current typing pattern
2. **Tier 1 AI Check**: Quick comparison with your normal pattern
3. **95% of time**: "This is normal" → Continue using app
4. **5% of time**: "Something seems different" → Run deeper checks

**Where Data Goes:**
- New typing samples → **Encrypted and stored on IPFS**
- Analysis results → **MongoDB** (only "PASS/FLAG" decisions, not raw data)
- Your personal typing profile → **Updated on your phone**

---

### 4. Security Alert Scenario (Suspicious Activity)

**What Happens:**
- Someone else tries to use your account (or you're typing unusually)
- System notices typing pattern doesn't match your normal behavior

**Security Response Levels:**

#### 🟡 **Level 1 - Quick Check** (50 milliseconds)
- Compares current typing with your average
- Checks location, time, device
- **If suspicious**: Escalates to Level 2

#### 🟠 **Level 2 - Deep Analysis** (200 milliseconds)
- Advanced AI analyzes typing pattern in detail
- Considers context: are you traveling? tired? stressed?
- **If still suspicious**: Escalates to Level 3

#### 🔴 **Level 3 - Forensic Investigation** (2 seconds)
- **Network Detective**: Checks if multiple accounts using same device
- **Behavior Historian**: Analyzes long-term pattern changes
- **Biometric Expert**: High-precision identity matching

**Possible Outcomes:**
- ✅ **Allow**: Continue using app normally
- ⚠️ **Challenge**: Ask for additional verification (MPIN, OTP)
- 🚫 **Block**: Lock account and alert user

---

### 5. Permission-Based Data Access

**When Bank Needs Your Data:**
- System needs to analyze your typing patterns for security
- **Asks your permission first**: "We need to verify your identity for this transaction"
- **You decide**: Allow or Deny
- **If allowed**: System temporarily accesses encrypted data
- **After analysis**: Immediately deletes the decrypted data

**User Control:**
- You own your behavioral data
- Bank cannot access it without your permission
- You can delete all your data anytime
- You can see what data exists about you

---

## 📊 Data Storage Architecture

### Where Different Types of Data Live:

#### 🏛️ **Bank's Database (MongoDB)**
**Stores:**
- Your account info (name, email, account numbers)
- Transaction history
- Login times and basic security logs
- Overall typing statistics (averages, not raw data)
- Analysis results ("PASS", "FLAG", "REVIEW")

**Does NOT Store:**
- Your actual keystroke data
- Raw typing patterns
- Decryption keys

#### 📱 **Your Phone (Secure Storage)**
**Stores:**
- Your digital identity (DID)
- Encryption/decryption keys
- Recent typing pattern cache
- App preferences

#### 🌐 **IPFS Network (Distributed Storage)**
**Stores:**
- Your encrypted behavioral data
- Typing pattern samples (encrypted)
- Historical behavior data (encrypted)
- Only you have the keys to decrypt this data

#### 🔗 **Pinata (IPFS Gateway)**
**Purpose:**
- Ensures your data stays available on IPFS
- Provides fast access to encrypted data
- Backup and redundancy

---

## 🔒 Security & Privacy Features

### **Privacy Protection:**
- **Your data, your control**: You own all behavioral data
- **Encryption first**: Data encrypted before leaving your phone
- **Permission required**: Bank must ask to access your data
- **Temporary access**: Data deleted from bank servers after analysis
- **Audit trail**: You can see when and why your data was accessed

### **Security Benefits:**
- **Invisible protection**: Works without affecting your experience
- **Continuous monitoring**: Catches threats in real-time
- **Multi-layer defense**: Three levels of AI security
- **Fraud detection**: Identifies account takeover and session hijacking
- **Context aware**: Understands when you might type differently

---

## 🔧 How It All Connects

```
📱 MOBILE APP (React Native)
    ↓ (collects typing patterns)
    
🔐 ENCRYPTION (on your phone)
    ↓ (encrypts data before sending)
    
🌐 IPFS NETWORK (distributed storage)
    ↓ (stores encrypted data)
    
🖥️ BANK SERVER (Node.js API)
    ↓ (processes requests, manages permissions)
    
🧠 AI ENGINE (Python/PyTorch)
    ↓ (analyzes patterns for security)
    
📊 DATABASE (MongoDB)
    ↓ (stores results and account info)
    
📱 BACK TO YOU (security decision)
```

---

## 🚀 Key Benefits

### **For Users:**
- **Seamless security**: No extra steps or passwords to remember
- **Privacy control**: You decide who can access your data
- **Better protection**: Catches threats traditional security misses
- **Transparency**: You know what data exists and how it's used

### **For Banks:**
- **Stronger security**: Detects sophisticated fraud attempts
- **Regulatory compliance**: Meets privacy laws (GDPR)
- **Reduced fraud losses**: Prevents account takeover attacks
- **Customer trust**: Transparent, user-controlled security

### **For Society:**
- **Privacy standard**: Shows how to do security right
- **Open source potential**: Could become industry standard
- **Innovation model**: Combines AI and blockchain effectively

---

## 🎯 Real-World Scenarios

### **Scenario 1: Normal Day**
- You wake up, check your bank balance
- System recognizes your morning typing pattern
- Everything works smoothly, no interruptions

### **Scenario 2: Traveling**
- You're at airport, using public WiFi
- Different location triggers Level 1 check
- System recognizes it's still your typing pattern
- Access granted with note about location change

### **Scenario 3: Phone Stolen**
- Thief tries to access your banking app
- Their typing pattern completely different from yours
- System immediately detects fraud
- Account locked, you get security alert

### **Scenario 4: Shared Device**
- You let friend use your phone briefly
- They accidentally open banking app
- System detects different user immediately
- Requires re-authentication before proceeding

---

## 🔮 Future Enhancements

### **Coming Soon:**
- **Voice patterns**: Add voice recognition to typing analysis
- **Walking patterns**: Monitor how you hold and move your phone
- **Multi-bank support**: Use same identity across different banks
- **Family accounts**: Secure sharing with trusted family members

### **Advanced Features:**
- **Offline security**: Protection even without internet
- **Wearable integration**: Smartwatch and fitness tracker data
- **Stress detection**: Adjust security based on your stress levels
- **Learning improvements**: Better accuracy over time

---

## 💡 Why This Matters

**The Problem We Solve:**
Traditional banking security stops after you log in. If someone steals your phone or hacks your session, they can do anything. CanGuard-AI provides **continuous protection** that adapts to how you naturally use your device.

**The Innovation:**
We're the first to combine **behavioral biometrics** (how you type) with **blockchain technology** (user-controlled data) to create security that's both stronger and more privacy-friendly than anything before.

**The Impact:**
This approach could become the new standard for digital identity, showing how to build systems that are secure, private, and user-friendly all at once.

---

*CanGuard-AI: Your typing patterns are as unique as your fingerprint, and now they're protecting your financial future.*
