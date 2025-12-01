import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import OutdoorScreen from "@/screens/OutdoorScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "./screenOptions";

export type OutdoorStackParamList = {
  Outdoor: undefined;
};

const Stack = createNativeStackNavigator<OutdoorStackParamList>();

export default function OutdoorStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={getCommonScreenOptions({ theme, isDark, transparent: true })}
    >
      <Stack.Screen
        name="Outdoor"
        component={OutdoorScreen}
        options={{ title: "Outdoor Time" }}
      />
    </Stack.Navigator>
  );
}
