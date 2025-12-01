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
import { useDevAutoChild } from "@/hooks/useDevAutoChild";

function AppInner() {
  useDevAutoChild();

  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  return (
    <>
      <NavigationContainer>
        {hasCompletedOnboarding ? (
          <MainTabNavigator />
        ) : (
          <OnboardingNavigator
            onComplete={() => setHasCompletedOnboarding(true)}
          />
        )}
      </NavigationContainer>
      <StatusBar style="auto" />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});