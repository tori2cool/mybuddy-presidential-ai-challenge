import React from "react";
import { Text } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProfileScreen from "@/screens/ProfileScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentChildId } from "@/contexts/ChildContext";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type ProfileStackParamList = {
  Profile: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const { theme, isDark } = useTheme();
  const { logout } = useAuth();
  const { setChildId } = useCurrentChildId();

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
              }}
              style={{ color: theme.text, fontWeight: "600" }}
            >
              Logout
            </Text>
          ),
        }}
      />
    </Stack.Navigator>
  );
}
