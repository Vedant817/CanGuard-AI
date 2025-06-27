import React, { useState,useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { saveToken } from '@/utils/token';
import { getSessionStatus } from '../api/user';
import API_BASE_URL from '@/config/api';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mpin, setMpin] = useState('');
  const [username, setUsername] = useState('');
  const [confirmMpin, setConfirmMpin] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ✅ Auto-redirect if token already exists
useEffect(() => {
  (async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    try {
      // Call session-status endpoint as fast as possible
      const res = await fetch(`${API_BASE_URL}/api/user/session-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();

      if (!data.success || !data.session) return;

      const { needsTyping, needsLogin } = data.session;

      if (needsTyping) {
        router.replace('/typing_game');
      } else if (needsLogin) {
        await AsyncStorage.removeItem('token');
        router.replace('/auth');
      } else {
        router.replace('/mpin-validation');
      }
    } catch (err) {
      console.log('⚠️ Session check failed:', err.message);
    }
  })();
}, []);


  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (!isLogin) {
      if (!mpin || mpin.length !== 6) {
        Alert.alert('Error', 'Please enter a 6-digit MPIN');
        return;
      }

      if (mpin !== confirmMpin) {
        Alert.alert('Error', 'MPIN and confirm MPIN do not match');
        return;
      }

      if (['123456', '000000', '111111'].includes(mpin)) {
        Alert.alert('Error', 'Please choose a stronger MPIN');
        return;
      }
    }

    setLoading(true);

    const endpoint = isLogin
      ? `${API_BASE_URL}/api/auth/login`
      : `${API_BASE_URL}/api/auth/register`;

    try {
      const requestBody = isLogin
        ? { email, password }
        : { username, email, password, mpin };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || 'Authentication failed');

      const token = data?.data?.token || data?.token;
      if (!token) throw new Error('No token received from server');

      await saveToken(token);
      console.log('✅ Token:', token);

      if (isLogin) {
        const session = await getSessionStatus(token);
        if (session.needsTyping) {
          router.replace('/typing_game');
        } else if (session.needsLogin) {
          Alert.alert('Session Expired', 'Please sign in again.');
          router.replace('/auth');
        } else {
          router.replace('/mpin-validation');
        }
      } else {
        router.replace('/typing_game');
      }

    } catch (error: any) {
      console.error('❌ Auth Error:', error);
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };


  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#019EEC', '#0080CC', '#FFB600']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoTriangle1} />
              <View style={styles.logoTriangle2} />
            </View>
            <Text style={styles.bankName}>Canara Bank</Text>
            <Text style={styles.tagline}>Secure Mobile Banking</Text>
          </View>

          {/* Auth Form */}
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </Text>
              <Text style={styles.formSubtitle}>
                {isLogin 
                  ? 'Sign in to access your account' 
                  : 'Join Canara Bank digital banking'
                }
              </Text>
            </View>

            <View style={styles.form}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons 
                    name="mail-outline" 
                    size={20} 
                    color="#666" 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Username</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons 
                    name="mail-outline" 
                    size={20} 
                    color="#666" 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your username"
                    placeholderTextColor="#999"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoComplete="username"
                  />
                </View>
              </View>


              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={20} 
                    color="#666" 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Enter your password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-outline" : "eye-off-outline"} 
                      size={20} 
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ✅ MPIN Input for Registration */}
              {!isLogin && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Create 6-Digit MPIN</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons 
                        name="keypad-outline" 
                        size={20} 
                        color="#666" 
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter 6-digit MPIN"
                        placeholderTextColor="#999"
                        value={mpin}
                        onChangeText={(text) => {
                          // Only allow numbers and limit to 6 digits
                          const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
                          setMpin(numericText);
                        }}
                        keyboardType="numeric"
                        secureTextEntry={true}
                        maxLength={6}
                      />
                    </View>
                    <Text style={styles.helperText}>
                      MPIN will be used for transaction authentication
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Confirm MPIN</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons 
                        name="checkmark-circle-outline" 
                        size={20} 
                        color="#666" 
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Re-enter 6-digit MPIN"
                        placeholderTextColor="#999"
                        value={confirmMpin}
                        onChangeText={(text) => {
                          const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
                          setConfirmMpin(numericText);
                        }}
                        keyboardType="numeric"
                        secureTextEntry={true}
                        maxLength={6}
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Forgot Password */}
              {isLogin && (
                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              {/* Auth Button */}
              <TouchableOpacity 
                style={[styles.authButton, loading && styles.authButtonDisabled]} 
                onPress={handleAuth}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#FFB600', '#FF9500']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.authButtonText}>
                        {isLogin ? 'Sign In' : 'Create Account'}
                      </Text>
                      <Ionicons 
                        name="arrow-forward" 
                        size={20} 
                        color="#fff" 
                        style={styles.buttonIcon}
                      />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Switch Auth Mode */}
              <TouchableOpacity 
                style={styles.switchButton}
                onPress={() => {
                  setIsLogin(!isLogin);
                  setMpin('');
                  setConfirmMpin('');
                }}
              >
                <Text style={styles.switchText}>
                  {isLogin 
                    ? "Don't have an account? " 
                    : "Already have an account? "
                  }
                  <Text style={styles.switchTextBold}>
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Secured by advanced behavior-based authentication
            </Text>
            <View style={styles.securityIcons}>
              <Ionicons name="shield-checkmark" size={16} color="#fff" />
              <Ionicons name="finger-print" size={16} color="#fff" />
              <Ionicons name="eye" size={16} color="#fff" />
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  logoContainer: {
    width: 60,
    height: 60,
    position: 'relative',
    marginBottom: 16,
  },
  logoTriangle1: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 30,
    borderRightWidth: 30,
    borderBottomWidth: 52,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFB600',
    transform: [{ rotate: '0deg' }],
  },
  logoTriangle2: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 0,
    height: 0,
    borderLeftWidth: 22,
    borderRightWidth: 22,
    borderBottomWidth: 38,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#fff',
    transform: [{ rotate: '180deg' }],
  },
  bankName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 16,
    color: '#E8F4FD',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    color: '#333',
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -8,
  },
  forgotPasswordText: {
    color: '#019EEC',
    fontSize: 14,
    fontWeight: '500',
  },
  authButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  authButtonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  switchButton: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  switchText: {
    color: '#666',
    fontSize: 16,
  },
  switchTextBold: {
    color: '#019EEC',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 20,
  },
  footerText: {
    color: '#E8F4FD',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  securityIcons: {
    flexDirection: 'row',
    gap: 12,
  },
    helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
