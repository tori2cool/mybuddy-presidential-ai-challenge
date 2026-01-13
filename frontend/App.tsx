import React from "react";
import { StyleSheet, View } from "react-native";
import { NavigationContainer, ParamListBase } from "@react-navigation/native";
import { useNavigationState } from "@react-navigation/native";
import { NavigationRoute } from "@react-navigation/native";
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
import { ThemedText } from "./components/ThemedText";
import { FloatingBuddy } from "./components/FloatingBuddy";
import { BuddyChatSheet } from "./components/BuddyChatSheet";
import { useBuddy } from "@/contexts/BuddyContext"; 
import { BuddyCustomizer } from "./components/BuddyCustomizer";
import { useCurrentChild } from "@/contexts/ChildContext";
import { MainAppOverlays } from "./components/MainAppOverlays";

function AppInner() {
  const { loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <>
      <BuddyProvider>
        <DashboardProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>         
        </DashboardProvider>
      </BuddyProvider>

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
                <AppInner />
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