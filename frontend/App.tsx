import React from "react";
import { StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import RootNavigator from "@/navigation/RootNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BuddyProvider } from "@/contexts/BuddyContext";
import { ChildProvider } from "@/contexts/ChildContext";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { FloatingBuddy } from "./components/FloatingBuddy";
import { BuddyChatSheet } from "./components/BuddyChatSheet";
import { BuddyCustomizer } from "./components/BuddyCustomizer";
import { MainAppOverlays } from "./components/MainAppOverlays";
import { FirstTimeTermsModal } from "@/components/FirstTimeTermsModal";
import Toast from 'react-native-toast-message';
import { ThemeProvider } from "./contexts/ThemeContext";

function AppInner() {
  const { loading, isAuthenticated, showTermsModal, setShowTermsModal, logout } = useAuth();

  if (loading) {
    return null;  // or <LoadingScreen /> if you have one
  }

  return (
    <>
      <BuddyProvider>
        <DashboardProvider>
            <NavigationContainer>
              <RootNavigator />
              <Toast />
            </NavigationContainer>
        </DashboardProvider>
      </BuddyProvider>

      {/* First-time terms modal – appears on top when needed */}
      <FirstTimeTermsModal
        visible={isAuthenticated && showTermsModal}
        onAccept={() => {
          setShowTermsModal(false);
          // No need for force re-read here – modal already saved to storage
          // The sync effect in AuthContext will handle closing / state update
        }}
        onDecline={() => {
          logout();
          setShowTermsModal(false);
        }}
      />

      <StatusBar style="auto" />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ChildProvider>
          <SafeAreaProvider>
            <GestureHandlerRootView style={styles.root}>
              <KeyboardProvider>
                <ThemeProvider>
                  <AppInner />
                </ThemeProvider>
              </KeyboardProvider>
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </ChildProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});