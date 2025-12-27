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
import { BuddyProvider } from "@/contexts/BuddyContext";
import { SchoolProvider } from "@/contexts/SchoolContext";
import { FloatingBuddy } from "@/components/FloatingBuddy";
import { BuddyChatSheet } from "@/components/BuddyChatSheet";
import { BuddyCustomizer } from "@/components/BuddyCustomizer";

export default function App() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  return (
  <ErrorBoundary>
    <ProgressProvider>
      <SchoolProvider>
        <BuddyProvider>
          <SafeAreaProvider>
              <GestureHandlerRootView style={styles.root}>
                <KeyboardProvider>
                  <NavigationContainer>
                    {hasCompletedOnboarding ? (
                      <>
                        <MainTabNavigator />
                        <FloatingBuddy />
                        <BuddyChatSheet />
                        <BuddyCustomizer />
                      </>
                    ) : (
                      <OnboardingNavigator 
                        onComplete={() => setHasCompletedOnboarding(true)}
                      />
                    )}
                  </NavigationContainer>
                  <StatusBar style="auto" />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </SafeAreaProvider>
        </BuddyProvider>
      </SchoolProvider>
    </ProgressProvider>
  </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
