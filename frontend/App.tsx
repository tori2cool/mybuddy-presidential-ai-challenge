import React from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProgressProvider } from "@/contexts/ProgressContext";
import { BuddyProvider } from "@/contexts/BuddyContext";
import { SchoolProvider } from "@/contexts/SchoolContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChildProvider } from "@/contexts/ChildContext";
import { DashboardProvider } from "@/contexts/DashboardContext";

import RootNavigator from "@/navigation/RootNavigator";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ChildProvider>
          <ProgressProvider>
            <SchoolProvider>
              <DashboardProvider>
                <BuddyProvider>
                  <SafeAreaProvider>
                    <GestureHandlerRootView style={styles.root}>
                      <KeyboardProvider>
                        <NavigationContainer>
                          <RootNavigator />
                        </NavigationContainer>
                        <StatusBar style="auto" />
                      </KeyboardProvider>
                    </GestureHandlerRootView>
                  </SafeAreaProvider>
                </BuddyProvider>
              </DashboardProvider>
            </SchoolProvider>
          </ProgressProvider>
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