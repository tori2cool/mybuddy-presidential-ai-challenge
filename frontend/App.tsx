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
<<<<<<< HEAD

import { ChildProvider } from "@/contexts/ChildContext";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

function AppInner() {
  const { loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style="auto" />
    </>
  );
}
=======
import { ProgressProvider } from "@/contexts/ProgressContext";
import { BuddyProvider } from "@/contexts/BuddyContext";
import { SchoolProvider } from "@/contexts/SchoolContext";
import { FloatingBuddy } from "@/components/FloatingBuddy";
import { BuddyChatSheet } from "@/components/BuddyChatSheet";
import { BuddyCustomizer } from "@/components/BuddyCustomizer";
>>>>>>> 626e46d (added latest replit version & fixed folder structure)

export default function App() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  return (
<<<<<<< HEAD
    <ErrorBoundary>
      <AuthProvider>
        <ChildProvider>
          <DashboardProvider>
              <SafeAreaProvider>
                <GestureHandlerRootView style={styles.root}>
                  <KeyboardProvider>
                    <AppInner />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </SafeAreaProvider>
            </DashboardProvider>
          </ChildProvider>
      </AuthProvider>
    </ErrorBoundary>
=======
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
>>>>>>> 626e46d (added latest replit version & fixed folder structure)
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
