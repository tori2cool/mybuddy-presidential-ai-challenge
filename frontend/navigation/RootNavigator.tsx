import React, { useCallback, useEffect, useMemo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "@/screens/LoginScreen";
import ChildSelectScreen from "@/screens/ChildSelectScreen";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import OnboardingNavigator from "@/navigation/OnboardingNavigator";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentChildId } from "@/contexts/ChildContext";
import { MainAppOverlays } from "@/components/MainAppOverlays";
import { View } from "react-native";
import { NavigatorScreenParams } from "@react-navigation/native";
import { ProfileScrollProvider } from "@/contexts/ProfileScrollContext";

// Define the param list for your bottom tabs (adjust screen names as they appear in MainTabNavigator.tsx)
export type TabParamList = {
  Affirmations: undefined;   // or whatever your tab names actually are
  // Home?: undefined;
  // Chores?: undefined;
  ProfileTab: { scrollToSettings?: boolean };  // ← Profile tab accepts this param
  // Add the other tabs you have, e.g.:
  // Dashboard: undefined;
  // Outdoor: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  ChildSelect: undefined;
  Onboarding: undefined;
  Main: NavigatorScreenParams<TabParamList>;
  ProfileTab: { scrollToSettings?: boolean }
  Outdoor: undefined;
  Chores: undefined;
  FlashcardsTab: undefined;
  __Overlays__: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isAuthenticated } = useAuth();
  const { childId, setChildId, loaded: childLoaded } = useCurrentChildId();

  // No persistent selection: require selection each launch.
  // If we ever get a childId set while unauthenticated, clear it.
  useEffect(() => {
    if (!isAuthenticated && childId) {
      // fire-and-forget; persistence happens inside ChildContext
      setChildId(null).catch(() => {});
    }
  }, [childId, isAuthenticated, setChildId]);

  // While loading persisted child selection, avoid rendering authed routes
  // that could trigger child-scoped API calls.
  if (isAuthenticated && !childLoaded) {
    return null;
  }

  const renderAuthed = useMemo(() => {
    return (
      <>
        <Stack.Screen name="ChildSelect" component={ChildSelectScreen} />
        <Stack.Screen name="Onboarding" options={{ headerShown: false }}>
          {({ navigation }) => {
            const handleComplete = useCallback(
              async (newChildId: string) => {
                await setChildId(newChildId);
                navigation.reset({ index: 0, routes: [{ name: "Main" }] });
              },
              [navigation, setChildId]
            );

            return <OnboardingNavigator onComplete={handleComplete} />;
          }}
        </Stack.Screen>
        <Stack.Screen name="Main" options={{ headerShown: false }}>
          {() => (
            <View style={{ flex: 1 }}>
              <ProfileScrollProvider>
                <MainTabNavigator />
                <MainAppOverlays />
              </ProfileScrollProvider>
            </View>
          )}
        </Stack.Screen>
      </>
    );
  }, [setChildId]);

return (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    {!isAuthenticated ? (
      <Stack.Screen name="Login" component={LoginScreen} />
    ) : (
      <>
        {renderAuthed}
      </>
    )}
  </Stack.Navigator>
)};