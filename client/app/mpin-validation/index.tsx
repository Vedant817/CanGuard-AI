// app/mpin-validation.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { getToken } from "@/utils/token";
import API_BASE_URL from "@/config/api";

export default function MPINValidationScreen() {
  const [mpin, setMpin] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Focus on first input when component mounts
    inputRefs.current[0]?.focus();
  }, []);

  const handleMpinChange = (value: string, index: number) => {
    // Only allow numeric input
    if (!/^\d*$/.test(value)) return;

    const newMpin = [...mpin];
    newMpin[index] = value;
    setMpin(newMpin);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (index === 5 && value && newMpin.every((digit) => digit !== "")) {
      handleMpinSubmit(newMpin.join(""));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !mpin[index] && index > 0) {
      // Move to previous input on backspace
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleMpinSubmit = async (mpinValue?: string) => {
    const mpinToValidate = mpinValue || mpin.join("");

    if (mpinToValidate.length !== 6) {
      Alert.alert("Error", "Please enter complete 6-digit MPIN");
      return;
    }

    setLoading(true);

    try {
      const token = await getToken();
      console.log("Token:", token);
      if (!token) {
        Alert.alert("Error", "Session expired. Please login again.");
        router.replace("/auth");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/auth/mpin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ mpin: mpinToValidate }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "MPIN validation failed");
      }

      console.log("MPIN validated successfully:", data);
      router.replace("/main_menu");
    } catch (error: any) {
      console.error("MPIN validation error:", error);

      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 3) {
        Alert.alert(
          "Account Locked",
          "Too many failed attempts. Please try again later or contact customer support.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/auth"),
            },
          ]
        );
      } else {
        Alert.alert(
          "Invalid MPIN",
          `Incorrect MPIN. ${3 - newAttempts} attempts remaining.`,
          [
            {
              text: "Try Again",
              onPress: () => {
                setMpin(["", "", "", "", "", ""]);
                inputRefs.current[0]?.focus();
              },
            },
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNumberPadPress = (number: string) => {
    const currentIndex = mpin.findIndex((digit) => digit === "");
    if (currentIndex !== -1) {
      handleMpinChange(number, currentIndex);
    }
  };

  const handleBackspace = () => {
    const lastFilledIndex = mpin
      .map((digit, index) => (digit ? index : -1))
      .filter((index) => index !== -1)
      .pop();

    if (lastFilledIndex !== undefined) {
      const newMpin = [...mpin];
      newMpin[lastFilledIndex] = "";
      setMpin(newMpin);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient colors={["#019EEC", "#0080CC"]} style={styles.gradient}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoTriangle1} />
              <View style={styles.logoTriangle2} />
            </View>
            <Text style={styles.bankName}>Canara Bank</Text>
            <Text style={styles.title}>Enter Your MPIN</Text>
            <Text style={styles.subtitle}>
              Please enter your 6-digit MPIN to continue
            </Text>
          </View>

          {/* MPIN Input */}
          <View style={styles.mpinContainer}>
            <View style={styles.mpinInputs}>
              {mpin.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[
                    styles.mpinInput,
                    digit ? styles.mpinInputFilled : null,
                  ]}
                  value={digit}
                  onChangeText={(value) => handleMpinChange(value, index)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(nativeEvent.key, index)
                  }
                  keyboardType="numeric"
                  maxLength={1}
                  secureTextEntry={true}
                  selectTextOnFocus={true}
                />
              ))}
            </View>

            {attempts > 0 && (
              <Text style={styles.attemptsText}>
                {3 - attempts} attempts remaining
              </Text>
            )}
          </View>

          {/* Number Pad */}
          <View style={styles.numberPad}>
            <View style={styles.numberRow}>
              {[1, 2, 3].map((number) => (
                <TouchableOpacity
                  key={number}
                  style={styles.numberButton}
                  onPress={() => handleNumberPadPress(number.toString())}
                >
                  <Text style={styles.numberText}>{number}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.numberRow}>
              {[4, 5, 6].map((number) => (
                <TouchableOpacity
                  key={number}
                  style={styles.numberButton}
                  onPress={() => handleNumberPadPress(number.toString())}
                >
                  <Text style={styles.numberText}>{number}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.numberRow}>
              {[7, 8, 9].map((number) => (
                <TouchableOpacity
                  key={number}
                  style={styles.numberButton}
                  onPress={() => handleNumberPadPress(number.toString())}
                >
                  <Text style={styles.numberText}>{number}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.numberRow}>
              <TouchableOpacity style={styles.numberButton} disabled>
                <Text style={styles.numberText}></Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.numberButton}
                onPress={() => handleNumberPadPress("0")}
              >
                <Text style={styles.numberText}>0</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.numberButton}
                onPress={handleBackspace}
              >
                <Ionicons name="backspace-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={() => handleMpinSubmit()}
            disabled={loading || mpin.some((digit) => digit === "")}
          >
            <LinearGradient
              colors={["#FFB600", "#FF9500"]}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.submitText}>Verify MPIN</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Footer Options */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={() =>
                Alert.alert(
                  "Help",
                  "Contact customer support for MPIN assistance"
                )
              }
            >
              <Text style={styles.footerButtonText}>Forgot MPIN?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.footerButton}
              onPress={() => router.replace("/auth")}
            >
              <Text style={styles.footerButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginTop: 40,
  },
  logoContainer: {
    width: 60,
    height: 60,
    position: "relative",
    marginBottom: 16,
  },
  logoTriangle1: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftWidth: 30,
    borderRightWidth: 30,
    borderBottomWidth: 52,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#FFB600",
  },
  logoTriangle2: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 0,
    height: 0,
    borderLeftWidth: 22,
    borderRightWidth: 22,
    borderBottomWidth: 38,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#fff",
    transform: [{ rotate: "180deg" }],
  },
  bankName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#E8F4FD",
    textAlign: "center",
  },
  mpinContainer: {
    alignItems: "center",
    marginVertical: 40,
  },
  mpinInputs: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  mpinInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    textAlign: "center",
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  mpinInputFilled: {
    borderColor: "#FFB600",
    backgroundColor: "rgba(255, 182, 0, 0.2)",
  },
  attemptsText: {
    color: "#FF6B6B",
    fontSize: 14,
    fontWeight: "500",
  },
  numberPad: {
    alignItems: "center",
    marginBottom: 20,
  },
  numberRow: {
    flexDirection: "row",
    marginBottom: 15,
  },
  numberButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 15,
  },
  numberText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  submitButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  submitText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginRight: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 20,
  },
  footerButton: {
    padding: 12,
  },
  footerButtonText: {
    color: "#E8F4FD",
    fontSize: 16,
    fontWeight: "500",
  },
});
