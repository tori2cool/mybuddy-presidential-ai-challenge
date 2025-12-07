import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import OnboardingNavigator from "@/navigation/OnboardingNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProgressProvider } from "@/contexts/ProgressContext";
import { ChildProvider } from "@/contexts/ChildContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginScreen from "@/screens/LoginScreen";

function AppInner() {
  const { loading, isAuthenticated } = useAuth();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] =
    useState(false);

  if (loading) {
    return null;
  }

  return (
    <>
      <NavigationContainer>
        {isAuthenticated ? (
          hasCompletedOnboarding ? (
            <MainTabNavigator />
          ) : (
            <OnboardingNavigator
              onComplete={() => setHasCompletedOnboarding(true)}
            />
          )
        ) : (
          <LoginScreen />
        )}
      </NavigationContainer>
      <StatusBar style="auto" />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProgressProvider>
          <ChildProvider>
            <SafeAreaProvider>
              <GestureHandlerRootView style={styles.root}>
                <KeyboardProvider>
                  <AppInner />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </SafeAreaProvider>
          </ChildProvider>
        </ProgressProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
