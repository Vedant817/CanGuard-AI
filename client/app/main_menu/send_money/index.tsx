import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SendMoneyScreen() {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [upiId, setUpiId] = useState('');
  const [note, setNote] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('UPI');
  const [captchaSentence, setCaptchaSentence] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaVisible, setCaptchaVisible] = useState(false);
  const [typingAccuracy, setTypingAccuracy] = useState(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const router = useRouter();

  // Generate typing sentences for CAPTCHA
  const generateTypingSentence = () => {
    const sentences = [
      "I confirm this transaction is authorized by me.",
      "This payment is being made with my consent.",
      "I verify that all transaction details are correct.",
      "I authorize this money transfer from my account.",
      "This transaction is legitimate and approved by me.",
      "I confirm the recipient details are accurate.",
      "I take full responsibility for this payment.",
      "This transfer is being made voluntarily by me.",
      "I verify this is a genuine transaction request.",
      "I confirm this payment is not under any duress.",
      "This money transfer has my complete authorization.",
      "I verify all the entered information is correct.",
      "I confirm this transaction is made willingly.",
      "This payment request has my full approval.",
      "I authorize the debit from my selected account."
    ];

    const randomIndex = Math.floor(Math.random() * sentences.length);
    return sentences[randomIndex];
  };

  // Calculate typing accuracy in real-time
  const calculateTypingAccuracy = (typed, target) => {
    if (typed.length === 0) return 0;
    
    let correctChars = 0;
    const minLength = Math.min(typed.length, target.length);
    
    for (let i = 0; i < minLength; i++) {
      if (typed[i] === target[i]) {
        correctChars++;
      }
    }
    
    return Math.round((correctChars / target.length) * 100);
  };

  const handleSendMoney = () => {
    if (!amount || !recipient) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    
    if (selectedMethod === 'UPI' && !upiId) {
      Alert.alert('Error', 'Please enter UPI ID');
      return;
    }
    
    // Generate and show typing CAPTCHA
    const sentence = generateTypingSentence();
    setCaptchaSentence(sentence);
    setCaptchaInput('');
    setTypingAccuracy(0);
    setIsTypingComplete(false);
    setCaptchaVisible(true);
  };

  const handleTypingInput = (text) => {
    setCaptchaInput(text);
    
    // Calculate accuracy in real-time
    const accuracy = calculateTypingAccuracy(text, captchaSentence);
    setTypingAccuracy(accuracy);
    
    // Check if typing is complete and accurate
    const isComplete = text.length >= captchaSentence.length;
    const isAccurate = accuracy >= 95; // Require 95% accuracy
    
    setIsTypingComplete(isComplete && isAccurate);
  };

  const verifyTyping = () => {
    const accuracy = calculateTypingAccuracy(captchaInput, captchaSentence);
    
    if (accuracy < 95) {
      Alert.alert(
        'Typing Verification Failed', 
        `Please type the sentence more accurately. Current accuracy: ${accuracy}%\nRequired: 95%`,
        [
          {
            text: 'Try Again',
            onPress: () => {
              setCaptchaInput('');
              setTypingAccuracy(0);
              setIsTypingComplete(false);
            }
          },
          {
            text: 'New Sentence',
            onPress: refreshCaptcha
          }
        ]
      );
      return;
    }
    
    if (captchaInput.length < captchaSentence.length) {
      Alert.alert('Incomplete', 'Please complete typing the entire sentence.');
      return;
    }
    
    // Typing verified, close modal and show confirmation
    setCaptchaVisible(false);
    
    Alert.alert(
      'Confirm Transaction',
      `Send ₹${amount} to ${recipient}${selectedMethod === 'UPI' ? ` (${upiId})` : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => processTransaction() }
      ]
    );
  };

  const processTransaction = () => {
    Alert.alert('Success', 'Money sent successfully!', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  const refreshCaptcha = () => {
    const sentence = generateTypingSentence();
    setCaptchaSentence(sentence);
    setCaptchaInput('');
    setTypingAccuracy(0);
    setIsTypingComplete(false);
  };

  // Get color based on typing accuracy
  const getAccuracyColor = () => {
    if (typingAccuracy >= 95) return '#4CAF50';
    if (typingAccuracy >= 80) return '#FF9800';
    return '#F44336';
  };

  // Highlight typed characters
  const renderHighlightedText = () => {
    return captchaSentence.split('').map((char, index) => {
      let backgroundColor = 'transparent';
      let color = '#666';
      
      if (index < captchaInput.length) {
        if (captchaInput[index] === char) {
          backgroundColor = '#E8F5E8';
          color = '#2E7D32';
        } else {
          backgroundColor = '#FFEBEE';
          color = '#C62828';
        }
      } else if (index === captchaInput.length) {
        backgroundColor = '#E3F2FD';
        color = '#1976D2';
      }
      
      return (
        <Text
          key={index}
          style={[
            styles.highlightChar,
            { backgroundColor, color }
          ]}
        >
          {char}
        </Text>
      );
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#019EEC', '#0080CC']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Money</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Method Selection */}
        <View style={styles.methodContainer}>
          <Text style={styles.sectionTitle}>Select Method</Text>
          <View style={styles.methodButtons}>
            {['UPI', 'Account', 'Mobile'].map(method => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.methodButton,
                  selectedMethod === method && styles.selectedMethod
                ]}
                onPress={() => setSelectedMethod(method)}
              >
                <Text style={[
                  styles.methodText,
                  selectedMethod === method && styles.selectedMethodText
                ]}>
                  {method}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recipient Details */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Recipient Name *</Text>
          <TextInput
            style={styles.input}
            value={recipient}
            onChangeText={setRecipient}
            placeholder="Enter recipient name"
          />
        </View>

        {selectedMethod === 'UPI' && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>UPI ID *</Text>
            <TextInput
              style={styles.input}
              value={upiId}
              onChangeText={setUpiId}
              placeholder="example@upi"
              keyboardType="email-address"
            />
          </View>
        )}

        {/* Amount */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Amount *</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Quick Amount Buttons */}
        <View style={styles.quickAmounts}>
          {['100', '500', '1000', '2000'].map(amt => (
            <TouchableOpacity
              key={amt}
              style={styles.quickAmountBtn}
              onPress={() => setAmount(amt)}
            >
              <Text style={styles.quickAmountText}>₹{amt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Note */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Note (Optional)</Text>
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            placeholder="Add a note"
            multiline
          />
        </View>

        {/* Send Button */}
        <TouchableOpacity style={styles.sendButton} onPress={handleSendMoney}>
          <LinearGradient
            colors={['#019EEC', '#0080CC']}
            style={styles.sendGradient}
          >
            <Text style={styles.sendButtonText}>Send Money</Text>
            <Ionicons name="send" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Scrollable Typing CAPTCHA Verification Modal */}
      <Modal
        transparent
        animationType="slide"
        visible={captchaVisible}
        onRequestClose={() => setCaptchaVisible(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalBox}>
              <ScrollView 
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                bounces={false}
              >
                <View style={styles.modalHeader}>
                  <Ionicons name="create-outline" size={32} color="#019EEC" />
                  <Text style={styles.modalTitle}>Typing Verification</Text>
                  <Text style={styles.modalSubtitle}>
                    Type the sentence below exactly as shown (95% accuracy required)
                  </Text>
                </View>


{/* Sentence Display with Highlighting */}
<View style={styles.sentenceContainer}>
  <Text style={styles.sentenceLabel}>Type this sentence:</Text>
  <View style={styles.sentenceHolder}>
    {renderHighlightedText()}
  </View>
  
  {/* Accuracy Indicator */}
  <View style={styles.accuracyContainer}>
    <View style={styles.accuracyInfo}>
      <Text style={styles.accuracyLabel}>Accuracy:</Text>
      <Text style={[styles.accuracyValue, { color: getAccuracyColor() }]}>
        {typingAccuracy}%
      </Text>
    </View>
    <View style={styles.progressBar}>
      <View 
        style={[
          styles.progressFill, 
          { 
            width: `${typingAccuracy}%`,
            backgroundColor: getAccuracyColor()
          }
        ]} 
      />
    </View>
  </View>
</View>


                {/* Typing Input */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputSectionLabel}>Your typing:</Text>
                  <TextInput
                    style={styles.typingInput}
                    placeholder="Start typing here..."
                    value={captchaInput}
                    onChangeText={handleTypingInput}
                    multiline
                    autoFocus
                    textAlignVertical="top"
                  />

                  {/* Character Count */}
                  <Text style={styles.characterCount}>
                    {captchaInput.length} / {captchaSentence.length} characters
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[
                      styles.modalBtn,
                      !isTypingComplete && styles.disabledBtn
                    ]} 
                    onPress={verifyTyping}
                    disabled={!isTypingComplete}
                  >
                    <Text style={styles.modalBtnText}>
                      {isTypingComplete ? 'Verify & Continue' : 'Complete Typing'}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.bottomButtons}>
                    <TouchableOpacity 
                      style={styles.refreshBtn}
                      onPress={refreshCaptcha}
                    >
                      <Ionicons name="refresh" size={16} color="#019EEC" />
                      <Text style={styles.refreshBtnText}>New Sentence</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.cancelBtn}
                      onPress={() => setCaptchaVisible(false)}
                    >
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Extra space for keyboard */}
                <View style={styles.keyboardSpace} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  content: { flex: 1, padding: 16 },
  methodContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#333' },
  methodButtons: { flexDirection: 'row', gap: 12 },
  methodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  selectedMethod: { backgroundColor: '#019EEC', borderColor: '#019EEC' },
  methodText: { color: '#666', fontWeight: '500' },
  selectedMethodText: { color: '#fff' },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8, color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    paddingLeft: 12,
    color: '#333',
  },
  amountInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickAmountBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  quickAmountText: { color: '#019EEC', fontWeight: '500' },
  sendButton: { borderRadius: 12, overflow: 'hidden', marginTop: 20 },
  sendGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  sendButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  // Scrollable Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '600', 
    marginTop: 8,
    marginBottom: 8,
    color: '#333'
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  sentenceContainer: {
    width: '100%',
    marginBottom: 20,
  },
  sentenceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sentenceScrollView: {
    marginBottom: 12,
  },
  sentenceHolder: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    padding: 12,
    borderWidth: 2,
    borderColor: '#019EEC',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    minHeight: 60,
    minWidth: '100%',
  },
  highlightChar: {
    fontSize: 16,
    paddingHorizontal: 1,
    paddingVertical: 2,
    borderRadius: 2,
    lineHeight: 24,
  },
  accuracyContainer: {
    marginBottom: 8,
  },
  accuracyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  accuracyLabel: {
    fontSize: 12,
    color: '#666',
  },
  accuracyValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  typingInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 100,
    maxHeight: 150,
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  modalButtons: {
    width: '100%',
    marginBottom: 20,
  },
  modalBtn: {
    width: '100%',
    backgroundColor: '#019EEC',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledBtn: {
    backgroundColor: '#ccc',
  },
  modalBtnText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 16 
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    gap: 4,
  },
  refreshBtnText: {
    fontSize: 12,
    color: '#019EEC',
    fontWeight: '500',
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelText: { 
    color: '#666', 
    fontSize: 14,
    fontWeight: '500'
  },
  keyboardSpace: {
    height: 100, // Extra space for keyboard
  },
});
