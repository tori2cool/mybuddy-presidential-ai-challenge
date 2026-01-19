import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/theme";

export default function LoginScreen() {
  const { login, loading } = useAuth();

  const handleLoginPress = () => {
    if (!loading) {
      login();
    }
  };

  return (
    <LinearGradient
      colors={["#C4C4C4", "#079D8E"]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to MyBuddy!</Text>
          <Text style={styles.subtitle}>
            Sign in to unlock fun activities, personalized learning, and daily
            encouragement for your child.
          </Text>

          <TouchableOpacity
            style={[
              styles.button,
              loading && styles.buttonDisabled,
              {
                backgroundColor: Colors.light.secondary
              },
            ]}
            activeOpacity={0.8}
            onPress={handleLoginPress}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.light.secondary} />
            ) : (
              <Text style={styles.buttonText}>Sign in with MyBuddy</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  content: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    marginBottom: 32,
  },
  button: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: "#ff9f1c",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
});
