import React from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import RootNavigator from "@/navigation/RootNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProgressProvider } from "@/contexts/ProgressContext";
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

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProgressProvider>
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
