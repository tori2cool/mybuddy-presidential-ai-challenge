import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ChoresScreen from "@/screens/ChoresScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "./screenOptions";

export type ChoresStackParamList = {
  Chores: undefined;
};

const Stack = createNativeStackNavigator<ChoresStackParamList>();

export default function ChoresStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={getCommonScreenOptions({ theme, isDark, transparent: true })}
    >
      <Stack.Screen
        name="Chores"
        component={ChoresScreen}
        options={{ title: "My Chores" }}
      />
    </Stack.Navigator>
  );
}
