import React from "react";
import { Platform, Text } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProfileScreen from "@/screens/ProfileScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentChild } from "@/contexts/ChildContext";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { TabHeader } from "@/components/TabHeader";

export type ProfileStackParamList = {
  Profile: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const { theme, isDark } = useTheme();
  const { logout } = useAuth();
  const { setChildId } = useCurrentChild();

  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark, transparent: true })}>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: true,
          header: () => (
            <TabHeader
              title="My Profile"
              onLogoutPress={async () => {
                await setChildId(null);
                await logout();
                await AsyncStorage.removeItem("selected_child_id");
                await AsyncStorage.removeItem("child_session_active");
              }}
            />
          ),
        }}
      />
    </Stack.Navigator>
  );
}
