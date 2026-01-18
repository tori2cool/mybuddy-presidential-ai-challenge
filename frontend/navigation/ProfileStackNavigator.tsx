import React from "react";
import { Platform, Text } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProfileScreen from "@/screens/ProfileScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentChild } from "@/contexts/ChildContext";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
          title: "My Profile",
          headerRight: () => (
            <Text
              onPress={async () => {
                await setChildId(null);
                await logout();
                await AsyncStorage.removeItem("selected_child_id");
                await AsyncStorage.removeItem("child_session_active");
              }}
              style={{
                color: theme.text,
                fontWeight: "600",
                marginRight: Platform.OS === 'web' ? 8 : 0,
                paddingRight: Platform.OS === 'web' ? 24 : 0,
              }}
            >
              Logout
            </Text>
          ),
        }}
      />
    </Stack.Navigator>
  );
}
